# corpus-schema, version 0

**Status: in force, version 0.** Accepted 2026-11-05. It is rewritten in place while it is at
version 0. It was first called markdown-db, and its [design review](https://github.com/osdlc/osdlc/blob/main/docs/parley/markdown-db-v0.json)
keeps that name. It lives here, in osdlc/markdown, beside its [conformance cases](README.md) and
the TypeScript package.

## Purpose

A [corpus](https://github.com/osdlc/osdlc/blob/main/docs/terms/corpus.md) is a folder of Markdown notes and the files they link
to. corpus-schema is what a corpus can declare about itself on top of that: that it is a corpus,
which types of records it holds, and the JSON Schema each type follows. People still browse and
edit the files as plain notes, and tools validate them.

The folder is pure data. Every rule a tool enforces is written in this spec or in the corpus's own
files, never only in code. Code is one implementation of it; the reference validator is the
[`@osdlc/corpus-schema`](../../ts/corpus-schema/README.md) package.

The key words MUST, MUST NOT, SHOULD and MAY are used as in RFC 2119.

## Rule

### Levels

The spec has three levels. A corpus at a level follows the rules of that level and of the levels
below it.

| Level | The corpus declares                                     | Rules it adds                                                                   |
| ----- | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 0     | Nothing. Any folder of linked notes, with no root file. | Its relative Markdown links resolve (see Links).                                |
| 1     | A root file marks it as a corpus.                       | Type folders, record folders, ids, YAML and JSON records. Schemas are optional. |
| 2     | A JSON Schema for each type.                            | Every record is checked against its type's schema. `x-ref` links.               |

- At level 1 a type MAY be untyped: its schema file is empty (see Types). A type that has a schema
  is checked against it at any level.
- At level 2 every type MUST have a schema that is not empty.
- A validator checks levels 1 and 2. Level 0 has no root file, so a validator does not find it.
- The root file MAY state its level with `level: 1` or `level: 2`. When it states 2, an untyped
  type is an error. When it states no level, a validator does not ask for level 2.

The rest of this spec is about corpora at level 1 or 2: from here on, a corpus is a folder that
holds a root file.

### Terms

- **Corpus**: a folder holding a root file, and everything under it.
- **Root file**: `corpus-schema.md`, `corpus-schema.yaml` or `corpus-schema.json`. The name matches
  exactly, case included, so a corpus is the same on every file system.
- **Type**: a folder holding a schema file named after the folder.
- **Record**: one file of a type. Its id is its file name.
- **Narrative**: every other file in a corpus.

The [corpus-schema term](../../../docs/terms/corpus-schema.md) says how this use of corpus relates
to the rest of osdlc.

### Corpus

- A corpus is a folder holding a root file. A folder MUST NOT hold more than one root file.
- The corpus's name is its folder name. Renaming the folder renames the corpus, as renaming a
  package does. A name taken from the folder needs no lookup: a path to the corpus already names
  it, and Obsidian resolves such paths by suffix.
- A corpus holds every file under its folder, except:
  - any path with a component that starts with `.` (`.git/`, `.obsidian/`, `.DS_Store`);
  - any path with a component named `node_modules`;
  - a symbolic link, to a file or to a folder. A tool does not follow it, so a link to it does not
    resolve. A validator SHOULD warn on a symbolic link in a type folder, since a record there is
    not checked;
  - a folder holding its own root file. That folder is a separate corpus, and the outer corpus
    stops at it;
  - the folder `_inherited` at the corpus root, which holds copies of the corpus's parents (see
    Extends).
- A corpus MUST NOT sit inside a type folder.

The root file has a fixed name so that a tool finds every corpus in a vault by name alone, without
reading files. It works like `.git` for a repository or `package.json` for a package.

### Root file

In `corpus-schema.md` the data is the YAML frontmatter, and the body is the corpus's front page.
The body MAY be empty. In `corpus-schema.yaml` and `corpus-schema.json` the whole file is the data.
The data MUST be a mapping.

| Key             | Required | Holds                                                             |
| --------------- | -------- | ----------------------------------------------------------------- |
| `corpus-schema` | yes      | The spec version: `0` for this document.                          |
| `id`            | no       | A stable handle for the corpus, such as `reading-list` or a UUID. |
| `formats`       | no       | The record formats the corpus allows. Default `[md]`.             |
| `level`         | no       | The corpus's level: `1` or `2`. See Levels.                       |
| `extends`       | no       | The corpus's parents, by prefix. See Extends.                     |
| `dialect`       | no       | Reserved. Not checked yet.                                        |
| `profiles`      | no       | Reserved. Not checked yet.                                        |

- A tool MUST refuse a corpus whose `corpus-schema` version it does not support.
- `id` lets an app find its corpus after a user moves or renames the folder: the app scans for root
  files and picks the one with its id. Links never use `id`. A tool that sees two corpora with one
  `id` SHOULD warn.
- A `level` other than `1` or `2` is an error.
- `dialect` and `profiles` are kept for later versions. A `dialect` will name the Markdown a
  corpus's notes are written in. There will be a baseline that every tool supports, and named
  dialects on top of it, such as `obsidian`. `profiles` stays reserved and unused: `extends`
  replaces it, and a profile is a parent corpus that holds types. v0 checks neither. A validator
  SHOULD say that it does not check them, and MUST NOT treat them as unknown keys.
- A validator SHOULD warn on any other key. Later versions add keys.

### Formats

`formats` lists the record formats a corpus allows, from this table. `[md]` keeps every record a
note, browsable in Obsidian. `[md, yaml, json]` is a hybrid corpus: data-only records may sit beside
notes, even in one type.

| Format | Extension | The record's data                                                     |
| ------ | --------- | --------------------------------------------------------------------- |
| `md`   | `.md`     | The YAML frontmatter, fenced by `---` lines. A Markdown body follows. |
| `yaml` | `.yaml`   | The whole file, one YAML mapping.                                     |
| `json` | `.json`   | The whole file, one JSON object.                                      |

- A record in a format the corpus does not list is an error.
- A `.yml` file in a type folder is an error. The extension is `.yaml`.
- Extensions are lower case. A file in a type folder whose extension is `.md`, `.yaml`, `.json` or
  `.yml` in any other case, such as `X.MD`, is an error.

### Types

- A type is a folder holding a schema file named after the folder: `harnesses/harnesses.schema.md`,
  `.yaml` or `.json`, matched exactly, case included. A type folder MUST NOT hold more than one.
- The type's name is its folder name. Type names MUST be unique within a corpus. A type folder MAY
  sit at any depth in the corpus, but MUST NOT sit inside another type folder.
- A type folder that breaks either rule is an error, and its folder is not a type. Its schema file
  is still checked for links. Its records are not checked as its own: under another type folder
  they are that type's records, and elsewhere they are narrative.
- The schema is a JSON Schema, draft 2020-12, for a record's data. In `.md` the schema is the
  frontmatter and the body documents the type. In `.yaml` and `.json` it is the whole file.
- Each type's schema stands alone. Two types MAY give their schemas the same `$id`, and a `$ref`
  in one type's schema does not resolve to another type's schema.
- An empty schema (an empty file, empty frontmatter, a `.md` file with no frontmatter, or `{}`)
  makes an untyped type. Its records are not checked against a schema. Their ids, formats and links
  are. A level 2 corpus has no untyped types.
- Renaming a type folder means renaming its schema file too.

The schema sits inside its folder so that the folder carries its own rules when it moves. It is
named after the folder so that search and Obsidian's quick switcher find it by the type's name.

### Records

- Every `.md`, `.yaml` and `.json` file under a type folder, at any depth, is a record of that type,
  except the type's schema file and the files a record folder owns (see Record folders). Other
  files there are narrative, such as attachments.
- A record's type comes from its folder. A record carries no type field.
- A record's data MUST be a mapping. A `.md` record with no frontmatter has empty data. Its body MAY
  be empty.
- A record's data MUST validate against its type's schema.

### Record folders

A record can keep files of its own beside it, such as the script, the query and the CSV results of
a method that the record describes.

- A folder inside a type folder that holds a record file named after the folder, `<folder>.md`,
  `<folder>.yaml` or `<folder>.json`, is a record folder. The name matches exactly, case included.
  The record file is one record, and its id is the folder name: `methods/Survey/Survey.md` has the
  id `Survey`.
- This holds whatever the corpus's `formats` lists. A record file in a format the corpus does not
  allow still makes a record folder, and the file is an error (see Formats).
- Every other file under a record folder, at any depth, belongs to the record. It is not a record
  itself, so it is not checked against the schema and its id is not checked. Validation ignores it,
  as it ignores narrative.
- Links from the record file to its own files resolve, as any relative link does:
  `[the counts](results/counts.csv)`. Links into another record's folder resolve too:
  `[the list](../Pilot/harnesses.csv)`. An `x-ref` links to the record file, not to the folder.
- A record folder MUST NOT hold another record folder, at any depth. That is an error, and the
  inner folder's files belong to the outer record. A record folder MUST NOT hold a type folder,
  since no type folder sits inside another (see Types).
- The id rules apply across both shapes: `methods/Survey/Survey.md` and `methods/survey.md`
  collide.
- A folder inside a type folder with no record file named after it is not a record folder. It is a
  plain folder, as before: each `.md`, `.yaml` and `.json` file in it is a record of the type.

This is the shape osdlc calls a [bundle](https://github.com/osdlc/osdlc/blob/main/docs/terms/corpus.md#not-to-be-confused-with): a note's folder holding `<name>/<name>.md` and the files
beside it. Moving the folder moves the record and its files together, and their relative links
keep working.

### Ids

A record's id is its file name without the extension: `harnesses/Claude Code.md` has the id
`Claude Code`. An id is a human display name.

- An id MUST NOT contain `/ \ : * ? " < > |`, which some file systems refuse, or `[ ] # ^`, which
  break links. It MUST NOT contain control characters.
- An id MUST NOT start or end with a space or a dot.
- Ids MUST be unique within a type after NFC normalization and Unicode case folding, across every
  folder and every extension. `Kiro.md`, `kiro.json` and `aws/Kiro.md` collide.
- A type MAY narrow its ids with `x-id-pattern`, a regular expression at the root of its schema
  (ECMA-262 syntax, Unicode mode). Every id in the type MUST match it. `^[a-z0-9-]+$` allows only
  slugs.
- Type names follow the same rules.

### Narrative

Every file in a corpus that is not the root file, a schema file or a record is narrative: READMEs,
guides, essays, daily notes, attachments. Narrative is allowed anywhere in a corpus, and validation
ignores it.

### Links

The canonical link is a relative Markdown link: `[Claude Code](../harnesses/Claude%20Code.md)`.
Relative links keep a corpus byte-identical when it moves, and GitHub, docs generators and Obsidian
follow them. Obsidian rewrites wikilinks to vault paths when a corpus moves, so a corpus that uses
them stops working anywhere else.

- The path is relative to the file that holds the link. A space is written `%20`, or the body form
  wraps the path in `<…>`.
- In frontmatter a link is a string holding the whole link:
  `successor: "[Antigravity](Antigravity.md)"`. A bare path such as `"Antigravity.md"` is not a
  link.
- A validator checks the links in records, root files and schema files: their bodies and every
  string in their data. It skips links with a URL scheme (`https:`, `mailto:`) and links to a
  fragment only (`#usage`).
- A relative path MUST resolve, after percent-decoding, to a file or folder that exists, with the
  same case. A validator MUST NOT fall back to matching by name, as Obsidian does: a broken path is
  always an error. A fragment (`#heading`) is not checked.
- A path that starts with `/` is an error. Links in a corpus are relative.
- A link into `_inherited/<prefix>/` is a link to a parent's file (see Extends). It stays in the
  corpus.
- A link that leaves the corpus, above its root, into a nested corpus or into a path the corpus
  excludes (a `.` component or `node_modules`), is a link between corpora. v0 does not define
  those. A validator SHOULD warn and MUST NOT report an error, except for `x-ref` (see References).
- A wikilink does not reach `_inherited/`. Use a relative Markdown link.

Wikilinks are accepted but not canonical: `[[target]]`, `[[target|text]]`, `[[target#heading]]`
and `![[target]]`.

- A wikilink resolves by path suffix within the corpus, compared after NFC normalization and case
  folding. `[[Claude Code]]`, `[[harnesses/Claude Code]]` and `[[harnesses/Claude Code.md]]` all
  match `harnesses/Claude Code.md`. The extension of a record MAY be left out.
- No match is an error. More than one match is an error.
- A wikilink that matches no file in the corpus but matches one in a nested corpus leaves the
  corpus, and warns as a Markdown link does.
- A target that starts with `/` is an error, as in a Markdown link.
- A validator SHOULD warn on every wikilink, and SHOULD offer a fix that rewrites it as a relative
  Markdown link.

### References

`x-ref` is a schema keyword that makes a field a typed link, like a foreign key. Its value names a
type: a type in the same corpus, or `<prefix>/<type>` for a parent's type (see Extends):

```yaml
successor: { type: string, x-ref: harnesses }
cites: { type: string, x-ref: org/principles }
```

- On a top-level property, the property's value MUST be a link, and it MUST resolve to a record of
  the named type, or of a type that extends it through `x-extends`, at any depth. A record of a
  local type that extends `org/principles` is an `org/principles` record. So is a record of a
  local type that extends a local type named in `x-ref`.
- On the `items` of a top-level array property, each item MUST be such a link.
- The named type MUST exist, in the corpus or in the parent its prefix names.
- An `x-ref` link that leaves the corpus is an error. A link to a parent's record goes through
  `_inherited/<prefix>/`.
- v0 defines `x-ref` only in those two places. A validator MUST report it anywhere else.

`x-ref`, `x-id-pattern` and `x-extends` are corpus-schema's vocabulary. JSON Schema validators
reject unknown keywords in strict mode, so a validator MUST register all three.

### Extends

A corpus can build on other corpora, its parents. A parent may be a profile, a corpus of types
that many corpora share, or a corpus with records, such as an organisation's principles.

`extends` in the root file maps a prefix to a source:

```yaml
corpus-schema: 0
level: 2
extends:
  claims: "@osdlc/corpus-profile-claims" # a package name
  org: "../org-principles" # a path from the corpus root
```

#### Resolving parents

- `extends` needs `level: 2`. In a corpus that does not state level 2 it is an error, and the
  corpus has no parents.
- `extends` MUST be a mapping. Each key is a prefix: lowercase letters, digits and `-`. Each value
  is a source, a string.
- A source that starts with `./` or `../` is a path from the corpus root. Any other source is a
  package name.
- A package is found the way Node.js finds one from the corpus folder: in `node_modules/<name>/`
  in the corpus folder, then in each folder above it. The package's corpus root is the package
  folder, or the folder that the `"corpus"` field of its `package.json` names, relative to the
  package folder. A package folder with no `package.json` has no `"corpus"` field.
- The spec does not depend on npm. It needs only that each source resolves to a folder. A tool
  MUST resolve both forms above, and MAY offer others.
- The folder a source names MUST hold a root file. A source that does not resolve, or names a
  folder with no root file, is an error.
- Parents load transitively: each parent's own `extends` resolves from the parent's folder. A
  cycle, where a corpus reaches itself through `extends`, is an error.
- A folder reached twice, through two prefixes or two paths, is one parent, with one set of types.
- A parent is validated as a corpus of its own. A parent with errors is an error of the corpus that
  extends it, at its `extends.<prefix>` field.

#### Inherited types

- A parent's types are visible as `<prefix>/<type>`. A corpus sees only its own parents' types. To
  name a grandparent's type, extend the grandparent too.
- An inherited type is read-only. A corpus uses one through a local type folder.
- `x-extends` at the root of a schema names the one type it builds on: a local type name, or
  `<prefix>/<type>`. A record of the type MUST validate against its own schema and the schema of
  every type up the chain, as if they were joined by `allOf`. This includes each type's
  `x-id-pattern` and `x-ref` fields.
- So a child can add rules or tighten them, never loosen them. A parent with
  `additionalProperties: false` admits no new fields.
- A schema that holds only `x-extends`, such as `x-extends: claims/statements`, uses the parent's
  type as it is.
- `x-extends` anywhere but the schema's root is an error. So are a name that matches no type, a
  prefix that `extends` does not declare, and local types whose `x-extends` chain loops.
- A prefix in a parent's schema names that parent's own parent. Each corpus's prefixes are its own.

#### Inherited records

- A parent's records are inherited records. They are read-only.
- A local record whose type extends an inherited type MUST NOT share an id with a record of that
  type, or of any type further up the chain that sits in another corpus. Ids compare as in Ids.

#### The copy

- `_inherited/<prefix>/` at the corpus root holds a read-only copy of the parent. The `sync` verb
  writes it, and the corpus commits it, so relative links from local records to a parent's records
  work in Obsidian and on GitHub.
- The copy holds every file of the parent corpus, byte for byte, and the parent's own
  `_inherited/`, so a chain carries through.
- `_inherited/` is not part of the corpus's own files. A validator finds no type, record or nested
  corpus in it, and does not check its links.
- A link from a checked file to `_inherited/<prefix>/<path>` is a link to `<path>` in that parent.
  It resolves in the installed parent, not in the copy. `_inherited/<prefix>/_inherited/<q>/<path>`
  is a link into the parent's own parent `q`.
- When `_inherited/<prefix>/` exists, or a checked file links into it, it MUST match the installed
  parent: the same file paths, with the same bytes. A validator reports each file that differs, is
  missing or is extra, with the field `(copy)`, and says to run `sync`. It MAY cap how many files
  it lists.
- A folder or file directly in `_inherited/` that names no parent is an error.
- A corpus that uses a parent's types and never links to its records needs no copy.

### Verbs

v0 defines two verbs.

- `validate <folder>` checks every corpus at or below the folder against this spec, and exits
  non-zero when it finds any error. It reports each problem on one line:
  `<file>: <field>: <message>`, with the file relative to the corpus root. A problem that is not
  in one field puts a word in parentheses in the field's place, such as `(data)` for data that
  does not parse or `(folder)` for a folder that cannot be read. A file or folder that cannot be
  read is an error of the corpus that holds it.
- `validate --fix <folder>` first rewrites every wikilink it can resolve as a relative Markdown
  link, in the files a validator checks. It changes nothing else in those files.
- `validate` never writes `_inherited/`.
- `sync <folder>` writes `_inherited/` for every corpus at or below the folder. For each parent it
  writes `_inherited/<prefix>/`, and it removes every other file there. It changes nothing outside
  `_inherited/`, and a second run changes nothing. A corpus syncs after the corpora it extends that
  sit below the same folder. When a corpus's root file or `extends` has an error, or a parent has
  errors of its own, `sync` writes nothing in that corpus and exits non-zero. A cycle in `extends`
  is such an error, so `sync` never copies a corpus into itself.
- When the parent has turned a folder into a file, or a file into a folder, `sync` replaces the
  stale path in the copy.
- `sync` owns `_inherited/`: in a corpus with no `extends` it empties it. It does not follow a
  symbolic link in `_inherited/`, and reports one as an error.

### Writing records

A tool that writes records changes only the keys it owns. It keeps key order, unknown keys,
comments and the body. In v0 a write replaces the whole file, and the last writer wins.

## Enforcement

[`@osdlc/corpus-schema`](../../ts/corpus-schema/README.md) is the reference validator. Its
`validate` command checks a folder against every rule above that a validator checks, and its
`sync` command writes the copies of a corpus's parents:

```sh
corpus-schema validate <folder>
corpus-schema sync <folder>
```

The package's tests hold it to this spec. [`suite.json`](suite.json) and the corpora under
[`corpora/`](corpora/), beside this file, are cases that name no code, so a validator in another
language can run the same ones. [S-conformance-suites](https://github.com/osdlc/osdlc/blob/main/docs/planning/standards/S-conformance-suites.md)
says how they are kept.

## Exemptions

None.

## Example

```text
harness-reference/
├── corpus-schema.md                the root file and front page
├── README.md                       narrative
└── harnesses/
    ├── harnesses.schema.md         type "harnesses"
    ├── Antigravity.md
    ├── Claude Code.md
    └── google/
        └── Gemini CLI.md           records may sit at any depth
```

A record folder keeps a record's own files beside it:

```text
methods/
├── methods.schema.yaml
└── Survey/
    ├── Survey.md                   the record, id "Survey"
    ├── count.py                    belongs to the record
    ├── query.sql
    └── results/
        └── counts.csv
```

A corpus that extends another keeps a copy of it, written by `sync`:

```text
team-rules/
├── corpus-schema.md                level: 2, extends: { org: ../org-principles }
├── _inherited/
│   └── org/                        a copy of ../org-principles
│       ├── corpus-schema.md
│       └── principles/
│           ├── principles.schema.yaml
│           └── Be Kind.md
└── rules/
    ├── rules.schema.yaml           x-extends: org/principles
    └── Review Kindly.md            links to ../_inherited/org/principles/Be%20Kind.md
```

`corpus-schema.md`:

```markdown
---
corpus-schema: 0
level: 2
---

Facts about coding-agent harnesses. Start with [the harnesses](harnesses/harnesses.schema.md).
```

`harnesses/harnesses.schema.md`:

```markdown
---
$schema: https://json-schema.org/draft/2020-12/schema
title: Harness
type: object
additionalProperties: false
required: [vendor, status]
properties:
  vendor: { type: string }
  status: { enum: [current, sunsetting, retired] }
  successor: { type: string, x-ref: harnesses }
---

One harness per record. `successor` links to the harness that replaces it.
```

`harnesses/google/Gemini CLI.md`:

```markdown
---
vendor: Google
status: current
successor: "[Antigravity](../Antigravity.md)"
---

Google's open-source terminal agent. See also [Claude Code](../Claude%20Code.md).
```

## Placement

This section is guidance, not a rule. A corpus may sit anywhere; these are the recommended places.

- **In a vault**: one top-level `Data/` folder, with one corpus per app or dataset under it, named
  after it. This serves mini-apps: an app, such as an Obsidian plugin, a CLI or a small web app,
  keeps its database inside the user's vault, and the user still reads and edits it as notes.
- **In a code repository**: `corpora/<name>/`.
- **Keep corpora that link to each other side by side**, in one folder.
- **Don't nest** a corpus inside another corpus's type folder. The spec forbids it.

## Prior art

corpus-schema is its own spec. It borrows these rules from
[mdbase](https://github.com/mdbase-dev/mdbase-spec) v0.3.0-rc (MIT), with credit:

- a nested root file starts a separate collection, and the parent stops there;
- paths with a component starting with `.`, or named `node_modules`, are not part of a collection;
- records are found at any depth, and `.md` is the default record format;
- a link resolves relative to the file that holds it;
- a link field may require its target to be of a given type;
- a writer keeps what it does not own.

It differs from mdbase in that a type is a folder holding its own schema, not a type note under
`_types/`; wikilinks resolve by unique path suffix, with no tiebreakers; whole-file YAML and JSON
records are allowed; and a bare path is not a link.

## Deferred

v0 does not define these:

- **Links between corpora** other than to a parent through `_inherited/`.
- A local record that refines or waives an inherited record on purpose, such as a `refines` key.
- A type that extends more than one type, and renaming an inherited type or prefix.
- Schema versions and migrations.
- Concurrent edits beyond last-writer-wins.
- Obsidian's vault-wide property types, which clash when two corpora give one key different types.
- `x-ref` inside nested objects.
- Wikilinks into `_inherited/`.
- Reserved names, such as Windows device names.
- Stable error codes.
- `move` and `rename` verbs that rewrite every link to a record.
- Build targets, such as JSON, Astro, Nuxt and Obsidian Bases views.
- Dialects. The root key `dialect` is reserved for them. `profiles` stays reserved, unused.
