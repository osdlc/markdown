import assert from 'node:assert/strict'
import { describe, test } from 'vitest'

import { npmPackageUrl, packageUrl } from '../src/identity.ts'
import { scratch } from './corpora.ts'

const { put, root, report, errors, warnings } = scratch('identity')

describe('package URLs', () => {
  test('a scoped npm name puts the scope, @ encoded, in the namespace', () => {
    assert.equal(
      npmPackageUrl('@osdlc/corpus-profile-sdlc'),
      'pkg:npm/%40osdlc/corpus-profile-sdlc',
    )
    assert.equal(
      npmPackageUrl('@osdlc/corpus-profile-sdlc', '0.3.0', ['tasks']),
      'pkg:npm/%40osdlc/corpus-profile-sdlc@0.3.0#tasks',
    )
    assert.equal(
      npmPackageUrl('@osdlc/corpus-sdlc-starter', '0.1.0', ['principles', 'P-0002']),
      'pkg:npm/%40osdlc/corpus-sdlc-starter@0.1.0#principles/P-0002',
    )
  })

  test('an unscoped name has no namespace', () => {
    assert.equal(npmPackageUrl('fernlog', '1.0.0-rc.1+b2'), 'pkg:npm/fernlog@1.0.0-rc.1%2Bb2')
  })

  test('each subpath segment is encoded alone, and empty, . and .. segments are dropped', () => {
    assert.equal(
      npmPackageUrl('a', undefined, ['principles', '', '.', 'Be Kind/2', '..', 'é']),
      'pkg:npm/a#principles/Be%20Kind%2F2/%C3%A9',
    )
  })

  test('only A-Z a-z 0-9 . - _ ~ and : stay unencoded', () => {
    assert.equal(
      packageUrl({ type: 'npm', name: "a:b!'()*@#?&=%" }),
      'pkg:npm/a:b%21%27%28%29%2A%40%23%3F%26%3D%25',
    )
  })

  test('a github namespace and name are lowercased', () => {
    assert.equal(
      packageUrl({
        type: 'github',
        namespace: ['Acme'],
        name: 'Principles',
        version: 'v3',
        subpath: ['principles'],
      }),
      'pkg:github/acme/principles@v3#principles',
    )
  })
})

describe('a corpus identity', () => {
  test("is the package's whose package.json names the corpus folder", () => {
    put('p/package.json', '{"name":"@acme/org","version":"1.2.0","corpus":"corpus"}')
    root('p/corpus', { level: 1 })
    let r = report('p/corpus')
    assert.equal(r.identity, 'pkg:npm/%40acme/org')
    assert.equal(r.version, '1.2.0')
    put('q/package.json', '{"name":"q"}')
    root('q', { level: 1 })
    r = report('q')
    assert.deepEqual([r.identity, r.version], ['pkg:npm/q', undefined])
  })

  test('is none in no package, or when the nearest package.json names another folder', () => {
    root('c', { level: 1 })
    assert.equal(report().identity, undefined)
    put('p/package.json', '{"name":"p","corpus":"other"}')
    root('p/corpus', { level: 1 })
    assert.equal(report('p/corpus').identity, undefined)
  })
})

describe('x-identity', () => {
  const schema = (id: string): string => `type: object\nx-identity: "${id}"\n`

  test("must be the type's unversioned identity", () => {
    put('p/package.json', '{"name":"@acme/org","version":"1.2.0"}')
    root('p')
    put('p/principles/principles.schema.yaml', schema('pkg:npm/%40acme/org#principles'))
    put('p/rules/rules.schema.yaml', schema('pkg:npm/%40acme/org@1.2.0#rules'))
    put('p/notes/notes.schema.yaml', 'type: object\nproperties:\n  a: { x-identity: x }\n')
    assert.deepEqual(errors('p'), [
      'notes/notes.schema.yaml: properties.a: x-identity sits only at the schema root',
      "rules/rules.schema.yaml: x-identity: must be pkg:npm/%40acme/org#rules, the type's identity",
    ])
  })

  test('is not checked in a corpus with no package', () => {
    root('c')
    put('c/principles/principles.schema.yaml', schema('pkg:npm/x#principles'))
    assert.deepEqual(errors(), [])
    assert.deepEqual(warnings(), [
      'principles/principles.schema.yaml: x-identity: not checked, since the corpus is in no package',
    ])
  })
})
