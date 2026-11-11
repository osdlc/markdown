# @osdlc/corpus-schema

Facts kept as notes drift. A field gets misspelled, a link points at a file that was renamed, and
nothing notices. This package checks a folder of such notes the way a database checks its rows:
each record against its type's JSON Schema, and each link and reference against the files that
exist.

It is for people and tools that keep typed records as Markdown, YAML and JSON files in a folder,
edit them as plain notes (in Obsidian, on GitHub, in an editor) and want CI to catch mistakes. The
format is the [corpus-schema spec](https://github.com/osdlc/markdown/blob/main/packages/conformance/corpus-schema/SPEC.md),
version 0. A corpus, a folder of notes and the files they link to, declares what it holds in a
root file, `corpus-schema.md`, and each type folder holds the type's JSON Schema. Every rule this
package checks comes from that spec or from the corpus's own files.

The spec has levels. Level 0 is any folder of linked notes, and this package does not check it.
Level 1 adds the root file, type folders and records, with schemas optional. Level 2 gives every
type a schema. The root file can say `level: 2`, and then a type with no schema is an error.

Do not use it to query notes or build an index of them, to check the structure of one Markdown
document, or as a database for an app with many concurrent writers. The comparison below names
tools for those jobs.

## Install

```sh
npm install @osdlc/corpus-schema
```

`pnpm add @osdlc/corpus-schema` and `yarn add @osdlc/corpus-schema` work too. For the command line
alone, `npx @osdlc/corpus-schema validate <folder>`.

ESM only. Node.js 22 or later.

## A corpus

```text
evidence/
├── corpus-schema.md                the root file: `corpus-schema: 0`
├── harnesses/
│   ├── harnesses.schema.md         the type "harnesses" and its JSON Schema
│   ├── Claude Code.md              a record, id "Claude Code"
│   └── google/
│       └── Gemini CLI.md           records may sit at any depth
└── methods/
    ├── methods.schema.yaml
    └── Survey/                     a record folder
        ├── Survey.md               the record, id "Survey"
        ├── count.py                these belong to the record
        ├── query.sql
        └── results/counts.csv
```

A record folder is a folder in a type folder that holds a record named after it, such as
`methods/Survey/Survey.md`. It lets a record keep its own files beside it: here, the script, the
query and the CSV results of the method the record describes. Its other files are not records and
are not checked. The record links to them with relative links, such as
`[the counts](results/counts.csv)`, and those links are checked. A record folder inside another
one is an error. A folder with no record named after it, such as `harnesses/google/`, is a plain
folder of records.

## References

`x-ref` in a schema makes a field a typed reference to records. It names a type, or lists several,
and a record of any of them, or of a type that extends one, matches:

```yaml
properties:
  successor: { type: string, x-ref: harnesses }
  depends_on: { type: array, items: { type: string, x-ref: [tasks, decisions] } }
  about: { type: string, x-ref: notes, x-ref-form: wikilink }
```

`x-ref-form` says how the value names its record:

| `x-ref-form`     | Value                             | Resolved                                    |
| ---------------- | --------------------------------- | ------------------------------------------- |
| `link` (default) | `"[Antigravity](Antigravity.md)"` | as a relative link, to a record of the type |
| `id`             | `T-0012`                          | by id, among the records of the type        |
| `wikilink`       | `"[[N-0001]]"`                    | by id, as `id` does; quote it in YAML       |

An id matches as ids compare: after NFC normalization and case folding. It may name a parent's
record, as a link may. A field that refers by id is not checked as a link, gets no wikilink
warning, and `validate --fix` leaves it as it is.

## Extending a corpus

A corpus can build on other corpora: a shared profile of types, or an organisation's records. Each
parent is a folder that holds a corpus. It comes from an npm package, or from a relative path in a
monorepo. The root file names each parent under a prefix, and the corpus must be at level 2:

```yaml
corpus-schema: 0
level: 2
extends:
  claims: '@osdlc/corpus-profile-claims' # a package name, found as Node finds it from this folder
  org: ../org-principles # or a path from this folder
```

A package's corpus is the package folder, or the folder its `package.json` names in a `"corpus"`
field. Install packages as usual. `package.json` holds the range and the lockfile pins it:

```json
{
  "devDependencies": {
    "@osdlc/corpus-profile-claims": "^0.1.0",
    "acme-principles": "github:acme/principles#v3"
  }
}
```

The second form is a git dependency. It suits a private corpus with no registry.

A local type builds on a parent's type with `x-extends` at the root of its schema. The fields add up
first: a type's `additionalProperties: false` or `unevaluatedProperties: false` admits its own
fields and those of every type it extends, as their root-level `properties` and
`patternProperties` declare them. A record then passes every schema up the chain, so a child can
add fields and tighten rules but not loosen them. A field the child declares again must still pass
the parent's rules for it, and a parent with `additionalProperties: false` admits no new ones. A
schema that holds only `x-extends` uses the parent's type as it is:

```yaml
# rules/rules.schema.yaml
x-extends: org/principles
additionalProperties: false # admits the parent's fields and team
properties:
  team: { type: string }
```

`x-ref: org/principles` links a field to the parent's records, and also to local records whose type
extends `org/principles`. A local record of such a type must not take an inherited record's id.

To link to a parent's records, keep a copy of each parent in the corpus:

```sh
corpus-schema sync
```

`sync` writes `_inherited/<prefix>/`, a byte-for-byte copy of each parent, and removes stale files.
Commit the copy. Links such as `[Be Kind](../_inherited/org/principles/Be%20Kind.md)` then work in
Obsidian and on GitHub, and `validate` resolves them in the installed parent. `validate` never
writes the copy. When the copy is missing or differs from the installed parent, it says to run
`corpus-schema sync`. A corpus needs a copy of a parent only when one of its files links into
`_inherited/<prefix>/`, or a `wikilink` reference names one of the parent's records. A corpus that
uses a parent's types and never links to its records needs no copy.

## Command line

```sh
corpus-schema validate [--fix] [--strict] <folder>...
corpus-schema sync [<folder>...]
```

`validate` checks every corpus at or below each folder. It prints one line per problem, as
`<file>: <field>: <message>` with the file relative to the corpus root, and `ok: <name>: <counts>`
for each corpus that passes. A problem that is not in one field puts a word in parentheses in the
field's place, such as `(data)` for frontmatter that does not parse. Warnings start with
`warning: `. `--fix` first rewrites every wikilink it can resolve as a relative Markdown link,
except in a field that refers by id. `--strict` fails a corpus that has warnings, as if they were
errors, so CI can hold a corpus to no warnings.

`sync` writes the `_inherited/` copies of every corpus at or below each folder, by default `.`. A
corpus syncs after the corpora it extends, so a chain of corpora in one repository syncs in one
run. It prints `wrote:` and `removed:` for each file it changes, and `synced: <name>: <counts>`.
Run it again and it changes nothing.

`sync` owns `_inherited/` outright. It removes every file there that no parent holds, so in a
corpus with no `extends` it empties the folder. It does not write through a symbolic link there;
it reports one instead. With any error in the root file or its `extends`, or a parent with errors of its own, a
cycle in `extends` included, it writes nothing in that corpus.

| Exit code | Meaning                                                                                                          |
| --------- | ---------------------------------------------------------------------------------------------------------------- |
| `0`       | Every corpus is valid, or synced. Without `--strict`, warnings may have been printed.                            |
| `1`       | A corpus has an error, or a warning under `--strict`. Or a folder holds no corpus, or cannot be read or written. |
| `2`       | Bad usage: an unknown verb or option, or `validate` with no folder.                                              |

## Library

```ts
import { findCorpora, validateCorpus } from '@osdlc/corpus-schema'

/** Every problem in every corpus at or below `folder`, each line led by its corpus's name. */
export function check(folder: string): string[] {
  const problems: string[] = []
  for (const root of findCorpora(folder)) {
    const report = validateCorpus(root)
    problems.push(...report.errors.map((e) => `${report.name}: ${e}`))
  }
  return problems
}
```

`findCorpora(dir)` finds every corpus at or below a folder by its root file. It throws when a
folder outside every corpus cannot be read. `validateCorpus(root, { fix })` checks one corpus and
returns a `CorpusReport`. Every problem it finds is a line in the report, never a throw. A report
holds `root`, `name`, `id` and `level` (the level the root file states), `records` (valid records by type, then id, each record's `Data`),
`files` (the corpus-relative path of each of those records), `errors`, `warnings` and `fixed`.

`syncCorpus(root)` writes one corpus's `_inherited/` copies and returns a `SyncReport`: `root`,
`name`, `written` and `removed` (corpus-relative paths) and `errors`. It writes nothing when the
root file or its `extends` has an error, or a parent has errors of its own.

Writers of records can use the same rules the validator reads with:

| Export                     | Use                                                        |
| -------------------------- | ---------------------------------------------------------- |
| `idProblem(id)`            | Why an id breaks the id rules, or `undefined`.             |
| `fold(s)`                  | The key two ids are compared by: NFC and case folding.     |
| `markdownLink(text, path)` | A relative Markdown link, with the path and label escaped. |
| `encodePath(path)`         | A path as a link destination.                              |

The TSDoc in `dist/index.d.ts` describes each export. `examples/usage.test.ts` uses each one.

## Trust

A corpus's schemas run on its data. JSON Schema `pattern` and the spec's `x-id-pattern` are regular
expressions the corpus supplies, and a badly written one can take a very long time on some input
(ReDoS). Validate a corpus from a source you do not trust only with a time limit, for example in a
CI job with a timeout.

A parent's schemas run on the corpus's records too. Treat a parent package as you treat the corpus.

`--fix` and `validateCorpus(root, { fix: true })` rewrite files in place. They change only
wikilinks, and they leave a file alone if the rewrite would change its data, but they do not keep a
backup. Run them on files under version control.

## How it compares

- The [mdbase spec](https://github.com/mdbase-dev/mdbase-spec), with its TypeScript implementations
  [`@callumalpass/mdbase`](https://www.npmjs.com/package/@callumalpass/mdbase) and
  [`mdbase-cli`](https://www.npmjs.com/package/mdbase-cli), is the closest. It also types Markdown
  records and validates them, and the corpus-schema spec borrows several of its rules. It declares types in
  type notes under `_types/` and resolves links from each collection's root. corpus-schema puts each
  type's JSON Schema in the type's own folder, so a type carries its rules when it moves, and uses
  relative links, which GitHub and site generators follow.
- MarkdownDB ([`mddb`](https://www.npmjs.com/package/mddb)) parses a folder of Markdown into a
  SQL database for queries. It does not check records against schema files in the folder.
- [`@synstack/markdown-db`](https://www.npmjs.com/package/@synstack/markdown-db) uses Markdown files
  with frontmatter as a database from TypeScript code. It has no written spec for the folder.
- [`markdown-corpus`](https://github.com/osdlc/osdlc/tree/main/packages/rust/markdown-corpus#readme),
  a Rust crate in osdlc/osdlc, models any corpus: its files, links and frontmatter. It does not
  apply the corpus-schema rules.
- [`@osdlc/markdown-contract`](https://github.com/osdlc/osdlc/tree/main/packages/ts/markdown-contract#readme)
  checks the sections and blocks of one Markdown document. This package checks a whole corpus:
  data against JSON Schema, and links, ids and references across files.

This package exists because the rules should live in the folder and in a written spec, not only in
code, so that a validator in any language checks a corpus the same way. Its conformance cases sit
beside the spec for that reason.

## Tests

`pnpm run build`, then `pnpm run test`. The CLI tests run the built program.
`tests/conformance.test.ts` runs the spec's conformance cases from
[`packages/conformance/corpus-schema/`](https://github.com/osdlc/markdown/tree/main/packages/conformance/corpus-schema#readme). A case compares
only the `<file>: <field>` prefix of each problem, as a set. Message text and order are not part of
it.

## Known gap

`@osdlc/markdown-link` finds only some Markdown links: only `.md` and media targets, with no titles
and no parentheses in the path. The spec checks every relative link, so `src/links.ts` finds
Markdown links with its own pattern. [osdlc/osdlc#635](https://github.com/osdlc/osdlc/issues/635)
tracks the fix; the local pattern goes once it lands.

## Stability

This is a 0.x package that follows version 0 of its spec. A minor release may change any export,
and the CHANGELOG marks the change as breaking. A patch release does not. The spec fixes the
`<file>: <field>` prefix of each problem line, not its message text, so a message may change in any
release.

The experimental exports, which may change in any release:

- none

## Runtimes and platforms

Node.js 22 or later, ESM only. The tests run on Linux and macOS. Windows is not tested.

## Licence

`MIT OR Apache-2.0`, at your option. See [LICENSE-MIT](./LICENSE-MIT) and
[LICENSE-APACHE](./LICENSE-APACHE).
