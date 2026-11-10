import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'vitest'

import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

// The built program, as npm installs it. Build first (`pnpm run build`).
const CLI = join(import.meta.dirname, '../bin/corpus-schema.js')

let dir = ''
const put = (rel: string, text: string): void => {
  mkdirSync(dirname(join(dir, rel)), { recursive: true })
  writeFileSync(join(dir, rel), text)
}
const read = (rel: string): string => readFileSync(join(dir, rel), 'utf8')
const cli = (...args: string[]): { status: number | null; stdout: string; stderr: string } => {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: 'utf8' })
  return { status: r.status, stdout: r.stdout, stderr: r.stderr }
}
const USAGE =
  'usage: corpus-schema validate [--fix] <folder>...\n       corpus-schema sync [<folder>...]\n'
const corpus = (rel: string, id: string): void => {
  put(`${rel}/corpus-schema.yaml`, `corpus-schema: 0\nid: ${id}\nformats: [md, yaml, json]\n`)
  put(`${rel}/notes/notes.schema.json`, '{}')
  put(`${rel}/notes/A.md`, '---\n---\nA.\n')
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'corpus-schema-cli-'))
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('corpus-schema validate', () => {
  test('passes every valid corpus and warns when two share an id', () => {
    corpus('one', 'shared')
    corpus('two', 'shared')
    const r = cli('validate', '.')
    assert.equal(r.status, 0)
    assert.equal(r.stdout, 'ok: one: 1 notes\nok: two: 1 notes\n')
    assert.match(r.stderr, /^warning: two: id: "shared" is also one's id$/m)
  })

  test('exits 1 when one of several corpora fails', () => {
    corpus('one', 'a')
    corpus('two', 'b')
    put('two/notes/B.md', 'See [x](Gone.md).\n')
    const r = cli('validate', '.')
    assert.equal(r.status, 1)
    assert.match(r.stdout, /^ok: one: 1 notes$/m)
    assert.match(r.stderr, /^notes\/B\.md: body: Gone\.md: no such file$/m)
    assert.match(r.stderr, /^two: 1 error\(s\)$/m)
  })

  test('exits 1 when no root file is at or below the folder', () => {
    put('notes/A.md', 'A.\n')
    const r = cli('validate', '.')
    assert.equal(r.status, 1)
    assert.equal(r.stderr, '.: no corpus-schema root file at or below it\n')
    assert.equal(cli('validate', 'missing').status, 1)
  })

  test('validates each folder given, once per corpus, and fails a folder with none', () => {
    corpus('one', 'a')
    corpus('two', 'b')
    put('empty/A.md', 'A.\n')
    const r = cli('validate', 'one', 'two', 'one')
    assert.equal(r.status, 0, r.stderr)
    assert.equal(r.stdout, 'ok: one: 1 notes\nok: two: 1 notes\n')
    const bad = cli('validate', 'one', 'empty')
    assert.equal(bad.status, 1)
    assert.equal(bad.stdout, 'ok: one: 1 notes\n')
    assert.equal(bad.stderr, 'empty: no corpus-schema root file at or below it\n')
  })

  test('validates a parent and a child folder once per corpus', () => {
    corpus('one', 'a')
    const r = cli('validate', '.', 'one')
    assert.equal(r.status, 0, r.stderr)
    assert.equal(r.stdout, 'ok: one: 1 notes\n')
    assert.equal(r.stderr, '')
  })

  test(
    'reports a folder it cannot read as an error, not a stack trace',
    // chmod does not stop root or Windows from reading.
    { skip: process.platform === 'win32' || process.getuid?.() === 0 },
    () => {
      corpus('one', 'a')
      mkdirSync(join(dir, 'locked'))
      mkdirSync(join(dir, 'one/notes/locked'))
      chmodSync(join(dir, 'locked'), 0o000)
      chmodSync(join(dir, 'one/notes/locked'), 0o000)
      try {
        const outside = cli('validate', '.')
        assert.equal(outside.status, 1)
        assert.equal(outside.stderr, 'locked: cannot read folder (EACCES)\n')
        const inside = cli('validate', 'one')
        assert.equal(inside.status, 1)
        assert.equal(
          inside.stderr,
          'notes/locked: (folder): cannot read (EACCES)\none: 1 error(s)\n',
        )
      } finally {
        chmodSync(join(dir, 'locked'), 0o755)
        chmodSync(join(dir, 'one/notes/locked'), 0o755)
      }
    },
  )

  test('exits 2 on bad usage', () => {
    for (const args of [
      [],
      ['check', '.'],
      ['validate'],
      ['validate', '--fix'],
      ['validate', '.', '--bogus'],
      ['sync', '--fix'],
    ]) {
      const r = cli(...args)
      assert.equal(r.status, 2, args.join(' '))
      assert.equal(r.stderr, USAGE)
    }
  })

  test('--fix rewrites wikilinks in .json and .yaml records', () => {
    corpus('c', 'c')
    put('c/notes/B.json', '{"see": "[[A]]"}\n')
    put('c/notes/C.yaml', 'see: "[[notes/A|the A note]]"\n')
    const r = cli('validate', '--fix', 'c')
    assert.equal(r.status, 0, r.stderr)
    assert.equal(r.stdout, 'fixed: notes/B.json\nfixed: notes/C.yaml\nok: c: 3 notes\n')
    assert.equal(r.stderr, '')
    assert.equal(read('c/notes/B.json'), '{"see": "[A](A.md)"}\n')
    assert.equal(read('c/notes/C.yaml'), 'see: "[the A note](A.md)"\n')
  })
})

describe('corpus-schema sync', () => {
  const parent = (rel: string, parents = ''): void => {
    put(`${rel}/corpus-schema.yaml`, `corpus-schema: 0\nlevel: 2\n${parents}`)
    put(`${rel}/notes/notes.schema.yaml`, 'type: object\n')
    put(`${rel}/notes/A.md`, `${rel}\n`)
  }

  test('syncs every corpus below the folder, parents first, and a second run changes nothing', () => {
    parent('z')
    parent('y', 'extends:\n  z: ../z\n')
    parent('x', 'extends:\n  y: ../y\n')
    put('x/notes/B.md', 'See [A](../_inherited/y/_inherited/z/notes/A.md).\n')
    const before = cli('validate', 'x')
    assert.equal(before.status, 1)
    assert.match(before.stderr, /^_inherited\/y: \(copy\): missing/m)
    assert.equal(existsSync(join(dir, 'x/_inherited')), false)

    // x is found first, but syncs after y, which syncs after z.
    const r = cli('sync')
    assert.equal(r.status, 0, r.stderr)
    const synced = [...r.stdout.matchAll(/^synced: (.*)$/gm)].map((m) => m[1])
    assert.deepEqual(synced, [
      'z: 0 written, 0 removed',
      'y: 3 written, 0 removed',
      'x: 6 written, 0 removed',
    ])
    assert.match(r.stdout, /^wrote: _inherited\/y\/_inherited\/z\/notes\/A\.md$/m)
    assert.equal(cli('validate', '.').status, 0)

    const again = cli('sync', '.')
    assert.equal(again.status, 0, again.stderr)
    assert.doesNotMatch(again.stdout, /^(wrote|removed):/m)
  })

  test('prints what it removes, and exits 1 when a parent does not resolve', () => {
    parent('a')
    put('a/_inherited/old/x.md', 'stale\n')
    const r = cli('sync', 'a')
    assert.equal(r.status, 0, r.stderr)
    assert.equal(r.stdout, 'removed: _inherited/old/x.md\nsynced: a: 0 written, 1 removed\n')

    parent('b', 'extends:\n  gone: "@acme/gone"\n')
    const bad = cli('sync', 'b')
    assert.equal(bad.status, 1)
    assert.equal(
      bad.stderr,
      'corpus-schema.yaml: extends.gone: package @acme/gone is not installed\nb: 1 error(s)\n',
    )
  })
})
