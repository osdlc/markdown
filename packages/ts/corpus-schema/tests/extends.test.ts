import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'vitest'

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { syncCorpus } from '../src/sync.ts'
import { findCorpora, validateCorpus } from '../src/validate.ts'

let dir = ''
const put = (rel: string, text: string): void => {
  mkdirSync(dirname(join(dir, rel)), { recursive: true })
  writeFileSync(join(dir, rel), text)
}
const read = (rel: string): string => readFileSync(join(dir, rel), 'utf8')
/** A level 2 root file at `rel`, extending `parents`. */
const root = (rel: string, parents: Record<string, string> = {}, extra = ''): void => {
  const entries = Object.entries(parents)
  const ext =
    entries.length === 0 ? '' : `extends:\n${entries.map(([k, v]) => `  ${k}: "${v}"\n`).join('')}`
  put(`${rel}/corpus-schema.yaml`, `corpus-schema: 0\nlevel: 2\n${extra}${ext}`)
}
/** A parent corpus at `rel` with a `principles` type and one record, `Be Kind`. */
const org = (rel = 'org'): void => {
  root(rel)
  put(
    `${rel}/principles/principles.schema.yaml`,
    'type: object\nrequired: [statement]\nproperties:\n  statement: { type: string }\n',
  )
  put(`${rel}/principles/Be Kind.md`, '---\nstatement: Care.\n---\n')
}
const errors = (rel = 'c'): string[] => validateCorpus(join(dir, rel)).errors
const has = (lines: string[], part: string): boolean => lines.some((l) => l.includes(part))

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'corpus-schema-extends-'))
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('extends', () => {
  test('a relative path resolves from the corpus root, and the parent passes', () => {
    org()
    root('c', { org: '../org' })
    put('c/rules/rules.schema.yaml', 'x-extends: org/principles\n')
    put('c/rules/Review.md', '---\nstatement: Review with care.\n---\n')
    const report = validateCorpus(join(dir, 'c'))
    assert.deepEqual(report.errors, [])
    assert.deepEqual([...(report.records.get('rules')?.keys() ?? [])], ['Review'])
  })

  test('a package name resolves through node_modules, here or in a folder above', () => {
    put('node_modules/acme-org/package.json', '{"name":"acme-org","corpus":"data"}')
    org('node_modules/acme-org/data')
    root('work/c', { org: 'acme-org' })
    put('work/c/rules/rules.schema.yaml', 'x-extends: org/principles\n')
    put('work/c/rules/Review.md', '---\nstatement: Review.\n---\n')
    assert.deepEqual(errors('work/c'), [])
  })

  test('a package with no corpus field is its own corpus root', () => {
    put('c/node_modules/@acme/org/package.json', '{"name":"@acme/org"}')
    org('c/node_modules/@acme/org')
    root('c', { org: '@acme/org' })
    put('c/rules/rules.schema.yaml', 'x-extends: org/principles\n')
    assert.deepEqual(errors(), [])
  })

  test('each problem with a source is an error at its extends entry', () => {
    put('c/node_modules/bad-field/package.json', '{"corpus": 3}')
    put('c/node_modules/gone-folder/package.json', '{"corpus": "nope"}')
    put('c/node_modules/plain/package.json', '{}')
    put('c/plain/README.md', 'Notes.\n')
    root('c', {
      a: '@acme/missing',
      b: 'bad-field',
      d: 'gone-folder',
      e: 'plain',
      f: './plain',
      g: './nowhere',
      h: 'Not A Name',
      Bad_Prefix: './plain',
    })
    const e = errors()
    for (const part of [
      'extends.a: package @acme/missing is not installed',
      'extends.b: package bad-field: its "corpus" field must be a folder path',
      'extends.d: package gone-folder: its "corpus" folder does not exist',
      'extends.e: plain: holds no corpus-schema root file',
      'extends.f: ./plain: holds no corpus-schema root file',
      'extends.g: ./nowhere: no such folder',
      'extends.h: Not A Name: not a package name',
      'extends.Bad_Prefix: a prefix holds only lowercase letters, digits and -',
    ])
      assert.ok(has(e, part), `${part}\n${e.join('\n')}`)
    assert.equal(e.length, 8)
  })

  test('extends must be a mapping of strings, and needs level 2', () => {
    put('c/corpus-schema.yaml', 'corpus-schema: 0\nlevel: 2\nextends: [a]\n')
    assert.ok(has(errors(), 'corpus-schema.yaml: extends: must map each prefix'))
    put('c/corpus-schema.yaml', 'corpus-schema: 0\nlevel: 2\nextends:\n  a: 3\n')
    assert.ok(has(errors(), 'extends.a: must be a package name or a ./ or ../ path'))
    org()
    put('c/corpus-schema.yaml', 'corpus-schema: 0\nextends:\n  org: ../org\n')
    assert.deepEqual(errors(), ['corpus-schema.yaml: extends: needs level: 2 in the root file'])
  })

  test('a cycle is an error, including a corpus that extends itself', () => {
    root('a', { b: '../b' })
    root('b', { a: '../a' })
    const e = errors('a')
    assert.equal(e.length, 1)
    assert.match(e[0] as string, /^corpus-schema\.yaml: extends\.b: \.\.\/b has 1 error\(s\)/)
    assert.match(e[0] as string, /closes a cycle: a → b → a$/)
    root('c', { me: './' })
    assert.deepEqual(errors(), ['corpus-schema.yaml: extends.me: ./ closes a cycle: c → c'])
  })

  test('a parent with errors of its own is an error, naming the first', () => {
    org()
    put('org/principles/Bad.md', '---\nstatement: 3\n---\n')
    root('c', { org: '../org' })
    assert.deepEqual(errors(), [
      'corpus-schema.yaml: extends.org: ../org has 1 error(s); the first: principles/Bad.md: statement: must be string',
    ])
  })

  test('a parent reached twice is loaded once, so its types are one type', () => {
    root('a')
    put('a/statements/statements.schema.yaml', 'type: object\n')
    root('b', { a: '../a' })
    put('b/principles/principles.schema.yaml', 'x-extends: a/statements\n')
    put('b/principles/P.md', '---\n---\n')
    root('c', { a: '../a', b: '../b' })
    put(
      'c/notes/notes.schema.yaml',
      'type: object\nproperties:\n  cites: { type: string, x-ref: a/statements }\n',
    )
    put('c/notes/N.md', '---\ncites: "[P](../_inherited/b/principles/P.md)"\n---\n')
    assert.deepEqual(syncCorpus(join(dir, 'c')).errors, [])
    assert.deepEqual(errors(), [])
  })
})

describe('x-extends', () => {
  beforeEach(() => {
    org()
    root('c', { org: '../org' })
  })

  test('a record must pass every schema up the chain', () => {
    put(
      'c/rules/rules.schema.yaml',
      'x-extends: org/principles\nrequired: [team]\nproperties:\n  team: { type: string }\n',
    )
    put('c/team/team.schema.yaml', 'x-extends: rules\n')
    put('c/team/T.md', '---\nteam: a\n---\n')
    put('c/rules/R.md', '---\nstatement: s\n---\n')
    assert.deepEqual(errors().sort(), [
      'rules/R.md: team: required',
      'team/T.md: statement: required',
    ])
  })

  test('a parent type adds its x-id-pattern and its x-ref fields', () => {
    put(
      'org/principles/principles.schema.yaml',
      'type: object\nx-id-pattern: "^[A-Z]"\nproperties:\n  see: { type: string, x-ref: principles }\n',
    )
    put('c/rules/rules.schema.yaml', 'x-extends: org/principles\n')
    put('c/rules/lower.md', '---\n---\n')
    put(
      'c/rules/Good.md',
      '---\nsee: "[Be Kind](../_inherited/org/principles/Be%20Kind.md)"\n---\n',
    )
    put('c/rules/Wrong.md', '---\nsee: "[Good](Good.md)"\n---\n')
    put('c/notes/notes.schema.yaml', 'type: object\n')
    put('c/notes/Other.md', '---\n---\n')
    put('c/rules/Bad.md', '---\nsee: "[Other](../notes/Other.md)"\n---\n')
    assert.deepEqual(syncCorpus(join(dir, 'c')).errors, [])
    assert.deepEqual(errors().sort(), [
      'rules/Bad.md: see: notes/Other.md is not a principles record',
      'rules/lower.md: id: "lower" does not match x-id-pattern ^[A-Z]',
    ])
  })

  test('each bad x-extends is an error at the schema file', () => {
    put('c/a/a.schema.yaml', 'x-extends: b\n')
    put('c/b/b.schema.yaml', 'x-extends: a\n')
    put('c/d/d.schema.yaml', 'x-extends: missing\n')
    put('c/e/e.schema.yaml', 'x-extends: org/missing\n')
    put('c/f/f.schema.yaml', 'x-extends: nope/principles\n')
    put('c/g/g.schema.yaml', 'type: object\nproperties:\n  x: { x-extends: a }\n')
    put('c/h/h.schema.yaml', 'x-extends: [a]\n')
    const e = errors()
    for (const part of [
      'a/a.schema.yaml: x-extends: cycle: a → b → a',
      'b/b.schema.yaml: x-extends: cycle: b → a → b',
      'd/d.schema.yaml: x-extends: names unknown type "missing"',
      'e/e.schema.yaml: x-extends: names "org/missing", but org has no such type',
      'f/f.schema.yaml: x-extends: names unknown prefix "nope"',
      'g/g.schema.yaml: properties.x: x-extends sits only at the schema root',
      'h/h.schema.yaml: (schema)',
    ])
      assert.ok(has(e, part), `${part}\n${e.join('\n')}`)
  })

  test('a local type may extend a local type, without extends', () => {
    put('d/corpus-schema.yaml', 'corpus-schema: 0\n')
    put('d/base/base.schema.yaml', 'type: object\nrequired: [n]\n')
    put('d/sub/sub.schema.yaml', 'x-extends: base\n')
    put('d/sub/S.md', '---\n---\n')
    assert.deepEqual(errors('d'), ['sub/S.md: n: required'])
  })
})

describe('x-ref across corpora', () => {
  beforeEach(() => {
    org()
    root('c', { org: '../org' })
    put('c/rules/rules.schema.yaml', 'x-extends: org/principles\n')
    put('c/rules/Local.md', '---\nstatement: s\n---\n')
    put(
      'c/guides/guides.schema.yaml',
      'type: object\nproperties:\n  follows: { type: string, x-ref: org/principles }\n  rule: { type: string, x-ref: principles-local }\n',
    )
    put('c/principles-local/principles-local.schema.yaml', 'type: object\n')
    put('c/sub/sub.schema.yaml', 'x-extends: principles-local\n')
    put('c/sub/S.md', '---\n---\n')
  })

  test('accepts an inherited record and a local record whose type extends the type', () => {
    put(
      'c/guides/G.md',
      '---\nfollows: "[Be Kind](../_inherited/org/principles/Be%20Kind.md)"\nrule: "[S](../sub/S.md)"\n---\n',
    )
    put('c/guides/H.md', '---\nfollows: "[Local](../rules/Local.md)"\n---\n')
    assert.deepEqual(syncCorpus(join(dir, 'c')).errors, [])
    assert.deepEqual(errors(), [])
  })

  test('a link into _inherited/ resolves in the installed parent', () => {
    put('c/guides/G.md', '---\nfollows: "[Gone](../_inherited/org/principles/Gone.md)"\n---\n')
    put('c/guides/H.md', '---\nfollows: "[X](../_inherited/nope/X.md)"\n---\n')
    put('c/guides/I.md', '---\nfollows: "[Org](../../org/principles/Be%20Kind.md)"\n---\n')
    assert.deepEqual(syncCorpus(join(dir, 'c')).errors, [])
    const e = errors()
    assert.equal(e.length, 3, e.join('\n'))
    assert.ok(
      has(
        e,
        'guides/G.md: follows: ../_inherited/org/principles/Gone.md: no such file in parent org',
      ),
    )
    assert.ok(
      has(e, 'guides/H.md: follows: ../_inherited/nope/X.md: _inherited/nope is not a parent'),
    )
    assert.ok(
      has(
        e,
        'guides/I.md: follows: must link to a org/principles record in this corpus or a parent',
      ),
    )
  })
})

describe('inherited records', () => {
  test('a local record must not take an inherited record id, after folding', () => {
    org()
    root('c', { org: '../org' })
    put('c/rules/rules.schema.yaml', 'x-extends: org/principles\n')
    put('c/rules/sub/BE KIND.md', '---\nstatement: s\n---\n')
    const report = validateCorpus(join(dir, 'c'))
    assert.deepEqual(report.errors, [
      'rules/sub/BE KIND.md: id: "BE KIND" is also the inherited record org/principles/Be Kind.md',
    ])
    assert.equal(report.records.get('rules')?.size, 0)
  })

  test('_inherited/ holds no local types, records or corpora', () => {
    org()
    root('c', { org: '../org' })
    assert.deepEqual(syncCorpus(join(dir, 'c')).errors, [])
    put('c/_inherited/notes.md', 'x')
    const report = validateCorpus(join(dir, 'c'))
    assert.deepEqual([...report.records.keys()], [])
    assert.deepEqual(findCorpora(join(dir, 'c')), [join(dir, 'c')])
  })
})

describe('the copy check', () => {
  beforeEach(() => {
    org()
    root('c', { org: '../org' })
    put('c/notes/notes.schema.yaml', 'type: object\n')
  })

  test('a corpus that never links into a parent needs no copy', () => {
    assert.deepEqual(errors(), [])
  })

  test('a link into a missing copy asks for sync, and validate writes nothing', () => {
    put('c/notes/N.md', 'See [it](../_inherited/org/principles/Be%20Kind.md).\n')
    assert.deepEqual(errors(), [
      '_inherited/org: (copy): missing, and a file links into it; run corpus-schema sync',
    ])
    assert.equal(existsSync(join(dir, 'c/_inherited')), false)
  })

  test('a copy that exists must match, even with no link into it', () => {
    assert.deepEqual(syncCorpus(join(dir, 'c')).errors, [])
    assert.deepEqual(errors(), [])
    put('org/principles/Be Kind.md', '---\nstatement: Changed.\n---\n')
    put('org/principles/New.md', '---\nstatement: New.\n---\n')
    put('c/_inherited/org/extra.md', 'x')
    assert.deepEqual(errors(), [
      '_inherited/org/principles/Be Kind.md: (copy): differs from the installed parent; run corpus-schema sync',
      '_inherited/org/principles/New.md: (copy): missing; run corpus-schema sync',
      '_inherited/org/extra.md: (copy): not in the installed parent; run corpus-schema sync',
    ])
  })

  test('reports at most ten files per parent, then a count', () => {
    for (let i = 0; i < 12; i++) put(`org/notes-${i}.md`, `${i}\n`)
    put('c/_inherited/org/corpus-schema.yaml', read('org/corpus-schema.yaml'))
    const e = errors()
    assert.equal(e.length, 11)
    assert.equal(e[10], '_inherited/org: (copy): 4 more files differ; run corpus-schema sync')
  })
})

describe('syncCorpus', () => {
  test('writes each parent, with its own _inherited/, and a second run changes nothing', () => {
    root('a')
    put('a/statements/statements.schema.yaml', 'type: object\n')
    root('b', { a: '../a' })
    put('b/principles/principles.schema.yaml', 'x-extends: a/statements\n')
    put('b/README.md', 'Narrative is copied too.\n')
    put('b/.hidden', 'left out')
    assert.deepEqual(syncCorpus(join(dir, 'b')).written, [
      '_inherited/a/corpus-schema.yaml',
      '_inherited/a/statements/statements.schema.yaml',
    ])
    root('c', { b: '../b' })
    const first = syncCorpus(join(dir, 'c'))
    assert.deepEqual(first.errors, [])
    assert.deepEqual(first.written, [
      '_inherited/b/README.md',
      '_inherited/b/_inherited/a/corpus-schema.yaml',
      '_inherited/b/_inherited/a/statements/statements.schema.yaml',
      '_inherited/b/corpus-schema.yaml',
      '_inherited/b/principles/principles.schema.yaml',
    ])
    assert.equal(read('c/_inherited/b/README.md'), 'Narrative is copied too.\n')
    const second = syncCorpus(join(dir, 'c'))
    assert.deepEqual([second.written, second.removed], [[], []])
    assert.deepEqual(errors(), [])
  })

  test('removes stale files and empty folders, and _inherited/ once no parent is left', () => {
    org()
    root('c', { org: '../org' })
    syncCorpus(join(dir, 'c'))
    put('c/_inherited/old/x/y.md', 'stale')
    rmSync(join(dir, 'org/principles/Be Kind.md'))
    const r = syncCorpus(join(dir, 'c'))
    assert.deepEqual(r.removed, ['_inherited/old/x/y.md', '_inherited/org/principles/Be Kind.md'])
    assert.equal(existsSync(join(dir, 'c/_inherited/old')), false)
    root('c')
    assert.equal(syncCorpus(join(dir, 'c')).removed.length, 2)
    assert.equal(existsSync(join(dir, 'c/_inherited')), false)
  })

  test('writes nothing when a parent does not resolve', () => {
    org()
    root('c', { org: '../org', gone: '../gone' })
    const r = syncCorpus(join(dir, 'c'))
    assert.deepEqual(r.errors, ['corpus-schema.yaml: extends.gone: ../gone: no such folder'])
    assert.equal(existsSync(join(dir, 'c/_inherited')), false)
  })
})

describe('review fixes', () => {
  test('a relative corpus root resolves a package parent, for validate and sync', () => {
    put('c/node_modules/acme-org/package.json', '{"name":"acme-org"}')
    org('c/node_modules/acme-org')
    root('c', { org: 'acme-org' })
    put('c/notes/notes.schema.yaml', 'type: object\n')
    put('c/notes/N.md', 'See [it](../_inherited/org/principles/Be%20Kind.md).\n')
    const cwd = process.cwd()
    process.chdir(dir)
    try {
      assert.deepEqual(syncCorpus('c').errors, [])
      assert.deepEqual(validateCorpus('c').errors, [])
      process.chdir(join(dir, 'c'))
      assert.deepEqual(validateCorpus('.').errors, [])
    } finally {
      process.chdir(cwd)
    }
  })

  test('a package with no package.json is its own corpus root; an unreadable one is an error', () => {
    org('c/node_modules/bare')
    mkdirSync(join(dir, 'c/node_modules/odd/package.json'), { recursive: true })
    root('c', { bare: 'bare', odd: 'odd' })
    assert.deepEqual(errors(), [
      'corpus-schema.yaml: extends.odd: package odd: cannot read its package.json (EISDIR)',
    ])
  })

  test('a link two levels into _inherited/ needs the middle parent to hold its copy', () => {
    root('g')
    put('g/things/things.schema.yaml', 'type: object\n')
    put('g/things/X.md', '---\n---\n')
    root('p', { g: '../g' })
    root('c', { p: '../p' })
    put('c/notes/notes.schema.yaml', 'type: object\n')
    put('c/notes/N.md', 'See [X](../_inherited/p/_inherited/g/things/X.md).\n')
    assert.deepEqual(syncCorpus(join(dir, 'c')).errors, [])
    assert.deepEqual(errors(), [
      'notes/N.md: body: ../_inherited/p/_inherited/g/things/X.md: p holds no copy of it; run corpus-schema sync in p',
    ])
    assert.deepEqual(syncCorpus(join(dir, 'p')).errors, [])
    assert.deepEqual(syncCorpus(join(dir, 'c')).errors, [])
    assert.deepEqual(errors(), [])
  })

  test('any root-file error stops sync', () => {
    org()
    root('c', { org: '../org' }, 'formats: [txt]\nid: 5\n')
    const r = syncCorpus(join(dir, 'c'))
    assert.deepEqual(r.errors.sort(), [
      'corpus-schema.yaml: formats: must list one or more of md, yaml, json, once each',
      'corpus-schema.yaml: id: must be a non-empty string',
    ])
    assert.equal(existsSync(join(dir, 'c/_inherited')), false)
  })

  test('sync does not write or remove through a symbolic link', () => {
    org()
    root('c', { org: '../org' })
    put('outside/empty/deeper/.keep', '')
    rmSync(join(dir, 'outside/empty/deeper/.keep'))
    mkdirSync(join(dir, 'c/_inherited'), { recursive: true })
    symlinkSync(join(dir, 'outside'), join(dir, 'c/_inherited/org'))
    symlinkSync(join(dir, 'outside'), join(dir, 'c/_inherited/old'))
    const r = syncCorpus(join(dir, 'c'))
    assert.deepEqual(r.errors, [
      '_inherited/org: (symlink): sync does not write through a symbolic link; remove it',
    ])
    assert.deepEqual(r.written, [])
    assert.equal(existsSync(join(dir, 'outside/corpus-schema.yaml')), false)
    assert.equal(existsSync(join(dir, 'outside/empty/deeper')), true)

    rmSync(join(dir, 'c/_inherited'), { recursive: true })
    symlinkSync(join(dir, 'outside'), join(dir, 'c/_inherited'))
    assert.deepEqual(syncCorpus(join(dir, 'c')).errors, [
      '_inherited: (symlink): sync does not write through a symbolic link; remove it',
    ])
    assert.equal(existsSync(join(dir, 'outside/empty/deeper')), true)
  })

  test('an x-ref into a parent that did not load adds no second error', () => {
    root('c', { gone: '../gone' })
    put(
      'c/notes/notes.schema.yaml',
      'type: object\nproperties:\n  see: { type: string, x-ref: gone/things }\n',
    )
    put('c/notes/N.md', '---\nsee: "[X](../_inherited/gone/things/X.md)"\n---\n')
    assert.deepEqual(errors(), ['corpus-schema.yaml: extends.gone: ../gone: no such folder'])
  })
})
