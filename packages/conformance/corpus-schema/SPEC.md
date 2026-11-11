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
- `references` works at level 1 and level 2. `extends` and `uses` need a stated `level: 2`. A level
  0 folder names no other corpora, and no corpus can name it, since it has no root file (see Other
  corpora).

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
  - the folder `_references` at the corpus root, which holds copies of the corpora it references
    (see The copy).
- A corpus MUST NOT sit inside a type folder.

The root file has a fixed name so that a tool finds every corpus in a vault by name alone, without
reading files. It works like `.git` for a repository or `package.json` for a package.

### Root file

In `corpus-schema.md` the data is the YAML frontmatter, and the body is the corpus's front page.
The body MAY be empty. In `corpus-schema.yaml` and `corpus-schema.json` the whole file is the data.
The data MUST be a mapping.

| Key             | Required | Holds                                                                |
| --------------- | -------- | -------------------------------------------------------------------- |
| `corpus-schema` | yes      | The spec version: `0` for this document.                             |
| `id`            | no       | A stable handle for the corpus, such as `reading-list` or a UUID.    |
| `formats`       | no       | The record formats the corpus allows. Default `[md]`.                |
| `level`         | no       | The corpus's level: `1` or `2`. See Levels.                          |
| `extends`       | no       | The parents whose types it builds on, by prefix. See Other corpora.  |
| `references`    | no       | The corpora whose records it links to, by prefix. See Other corpora. |
| `uses`          | no       | Parent types its folders hold as they are. See Other corpora.        |
| `dialect`       | no       | Reserved. Not checked yet.                                           |
| `profiles`      | no       | Reserved. Not checked yet.                                           |

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
  except the type's schema file, the files a record folder owns (see Record folders) and the files
  in a narrative folder. Other files there are narrative, such as attachments.
- A folder in a type folder, at any depth, whose name starts with `_`, such as `_attachments/`, is a
  narrative folder. Every file under it is narrative. This tells it apart from the two other kinds
  of folder in a type folder: a record folder holds its record file, and a plain folder holds
  records.
- A record's type comes from its folder. A record carries no type field.
- A record's data MUST be a mapping. A `.md` record with no frontmatter has empty data. Its body MAY
  be empty.
- A record's data MUST validate against its type's schema.

### Record folders

A record can keep files of its own beside it, such as the script, the query and the CSV results of
a method that the record describes.

- A folder inside a type folder that holds a record file is a record folder. The record file is
  named after the folder, `<folder>.md`, `<folder>.yaml` or `<folder>.json`, or it has the name the
  type's `x-record-file` gives. The name matches exactly, case included. The record file is one
  record, and its id comes from the folder name (see Ids): `methods/Survey/Survey.md` has the id
  `Survey`.
- `x-record-file` at the root of a schema names a record file for the type's record folders: a file
  name with no path and a `.md`, `.yaml` or `.json` extension, such as `README.md`. With
  `x-record-file: README.md`, `decisions/D-0001-split/README.md` is a record with its folder's id.
  A type with no `x-record-file` of its own takes the one of the nearest type up its chain, so a
  type that `uses` a parent type or builds on it gets the parent's. Any other value is an error.
- The type folder's own file of that name, such as `decisions/README.md`, documents the type. It
  is narrative, not a record.
- With `x-record-file`, every folder in the type folder that holds that file is a record folder,
  and every other file under it belongs to the record. A folder such as `decisions/archive/` with a
  `README.md` beside `D-0001.md` is one record, `archive`, and `D-0001.md` is not a record. Keep
  other records out of a folder that holds the record file.
- A record folder holds one record file. A folder that holds two, such as `<folder>.md` and the
  `x-record-file`, is an error at the second.
- This holds whatever the corpus's `formats` lists. A record file in a format the corpus does not
  allow still makes a record folder, and the file is an error (see Formats).
- Every other file under a record folder, at any depth, belongs to the record. It is not a record
  itself, so it is not checked against the schema and its id is not checked. Validation ignores it,
  as it ignores narrative.
- Links from the record file to its own files resolve, as any relative link does:
  `[the counts](results/counts.csv)`. Links into another record's folder resolve too:
  `[the list](../Pilot/harnesses.csv)`. An `x-ref` links to the record file, not to the folder.
- A record folder MUST NOT hold another record folder, at any depth. That is an error, and the
  inner folder's files belong to the outer record. A folder in a record folder whose only record file is
  the `x-record-file`, such as a `README.md`, is not a record folder: its files belong to the outer
  record, with no error. A record folder MUST NOT hold a type folder,
  since no type folder sits inside another (see Types).
- The id rules apply across both shapes: `methods/Survey/Survey.md` and `methods/survey.md`
  collide.
- A folder inside a type folder with no record file is not a record folder. Unless its name starts
  with `_`, it is a plain folder: each `.md`, `.yaml` and `.json` file in it is a record of the
  type.

This is the shape osdlc calls a [bundle](https://github.com/osdlc/osdlc/blob/main/docs/terms/corpus.md#not-to-be-confused-with): a note's folder holding `<name>/<name>.md` and the files
beside it. Moving the folder moves the record and its files together, and their relative links
keep working.

### Ids

A record's id comes from its name: its file name without the extension, or for a record folder's
record, the folder name. `harnesses/Claude Code.md` has the id `Claude Code`. An id is a human
display name.

- A type MAY narrow its ids with `x-id-pattern`, a regular expression at the root of its schema
  (ECMA-262 syntax, Unicode mode). `^[a-z0-9-]+$` allows only slugs. With a pattern, the id is the
  longest of these that every `x-id-pattern` up the type's chain matches: the whole name, or a
  part of it that ends just before a `-`. With `x-id-pattern: "^P-[0-9]{4}$"`,
  `P-0002-favor-deterministic.md` has the id `P-0002`, and the rest of the name is a slug for
  people. A name the patterns match whole keeps the whole name as its id. A name with no matching
  part is an error.
- A record's data MAY hold `id`. When it does, it MUST be a string naming the record's id, as ids
  compare. Anything else is an error at `id`.

- An id MUST NOT contain `/ \ : * ? " < > |`, which some file systems refuse, or `[ ] # ^`, which
  break links. It MUST NOT contain control characters.
- An id MUST NOT start or end with a space or a dot.
- Ids MUST be unique within a type after NFC normalization and Unicode case folding, across every
  folder and every extension. `Kiro.md`, `kiro.json` and `aws/Kiro.md` collide.
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
- A validator checks the links in records, root files and schema files: their bodies, every string
  in the data of records and root files, and in a schema the strings of its prose keywords,
  `title`, `description` and `$comment`, at any depth. Other strings in a schema, such as a
  `pattern`, a `const` or an `enum` value, are not text and hold no links. It skips links with a URL scheme (`https:`, `mailto:`) and links to a
  fragment only (`#usage`).
- A relative path MUST resolve, after percent-decoding, to a file or folder that exists, with the
  same case. A validator MUST NOT fall back to matching by name, as Obsidian does: a broken path is
  always an error. A fragment (`#heading`) is not checked.
- A path that starts with `/` is an error. Links in a corpus are relative.
- A link into `_references/<prefix>/` is a link to a file of a corpus the corpus references (see
  The copy). It stays in the corpus.
- A link that leaves the corpus, above its root, into a nested corpus or into a path the corpus
  excludes (a `.` component or `node_modules`), is a link between corpora. v0 does not define
  those. A validator SHOULD warn and MUST NOT report an error, except for `x-ref` (see Typed references).
- A reference in the `wikilink` form is not a link of this kind: it names a record by id (see
  Typed references).

Wikilinks are accepted but not canonical: `[[target]]`, `[[target|text]]`, `[[target#heading]]`
and `![[target]]`.

- A wikilink resolves by path suffix within the corpus and the copies of the corpora it references
  directly, as `_references/<prefix>/<path>`, compared after NFC normalization and case folding. A
  match in a copy is a link into it (see The copy). A copy's own `_references/` is not searched. `[[Claude Code]]`, `[[harnesses/Claude Code]]` and `[[harnesses/Claude Code.md]]` all
  match `harnesses/Claude Code.md`. The extension of a record MAY be left out.
- A wikilink whose target matches no file, and holds no `/`, names a record by id: the record of
  any type, in the corpus or a corpus it references, whose id or whole file name folds to the
  target, as the `id` form of Typed references resolves. `[[P-0002]]` names
  `principles/P-0002-favor-deterministic.md`. A record of a referenced corpus is a link into its
  copy. Obsidian does not resolve such a wikilink by itself; `validate --fix` rewrites it as a
  relative link.
- No match is an error. More than one match is an error.
- A wikilink that matches no file in the corpus but matches one in a nested corpus leaves the
  corpus, and warns as a Markdown link does.
- A target that starts with `/` is an error, as in a Markdown link.
- A validator SHOULD warn on every wikilink, and SHOULD offer a fix that rewrites it as a relative
  Markdown link.

### Typed references

`x-ref` is a schema keyword that makes a field a typed reference to records, like a foreign key.
Its value names a type, or lists one or more types. Each name is a type in the same corpus, or a
type of another corpus by the Namespace rule, such as `org/principles` (see Other corpora):

```yaml
successor: { type: string, x-ref: harnesses }
cites: { type: string, x-ref: org/principles }
after:
  {
    type: array,
    items: { type: string, x-ref: [tasks, decisions, milestones] },
  }
depends_on:
  { type: array, items: { type: string, x-ref: tasks, x-ref-form: id } }
about: { type: string, x-ref: notes, x-ref-form: wikilink }
```

- `x-ref` sits on a top-level property, or on the `items` of a top-level array property. On
  `items`, each item is a reference. v0 defines `x-ref` only in those two places. A validator MUST
  report it anywhere else.
- A list MUST hold one or more names, each a string. Every name MUST name a type that exists, in
  the corpus or in the corpus its prefixes name. A validator does not check the values of a field
  whose `x-ref` names no type: that is already an error in the schema.
- A reference matches a record of a named type, or of a type that extends one through
  `x-extends`, at any depth. A record of a local type that extends `org/principles` is an
  `org/principles` record. So is a record of a local type that extends a local type named in
  `x-ref`.

`x-ref-form`, beside `x-ref`, says how a value names its record. It is one of three forms. With no
`x-ref-form`, the form is `link`.

| Form       | The value                                                                  | Example                           |
| ---------- | -------------------------------------------------------------------------- | --------------------------------- |
| `link`     | One link, as in Links. It MUST resolve to a matching record.               | `"[Antigravity](Antigravity.md)"` |
| `id`       | A string: the id of a matching record.                                     | `T-0012`                          |
| `wikilink` | A string `[[<id>]]` or `[[<id>\|<text>]]`, naming a matching record by id. | `"[[N-0001]]"`                    |

- For `link`, an `x-ref` link that leaves the corpus is an error. A link to a referenced corpus's
  record goes through `_references/<prefix>/`.
- For `id` and `wikilink`, the id resolves among the matching records of the corpus and of every
  corpus it references, at any depth. A parent gives no records. Ids compare as in Ids, after NFC normalization and case
  folding, so `t-0012` names `T-0012.md`. A record's folder and extension do not matter. A value
  may also name the record by its whole file name without the extension, or its record folder's
  name, where that is longer than its id. An id
  that names no matching record is an error. An id that names more than one, such as two records
  of two listed types, is an error. Records with one identity are one record, however many chains
  reach them (see Identity).
- A `wikilink` value holds an id, not a path: `[[tasks/T-0012]]`, a heading (`#`) or a block (`^`)
  is an error. In YAML it MUST be quoted, since `[[N-0001]]` unquoted is a list in a list.
- A `null` value, as a field or as an item, refers to nothing and is not checked as a reference.
  The schema says whether `null` is allowed.
- A field in the `id` or `wikilink` form holds no link. The Links rules do not apply to its values,
  a validator does not warn on its wikilinks, and `validate --fix` does not rewrite them.
- A `wikilink` value that names a referenced corpus's record is a link into its copy, since a tool
  such as Obsidian resolves it there. It needs `_references/<prefix>/` (see The copy), where
  `<prefix>` is the first prefix of the shortest chain the record is reached through. An `id` value
  needs no copy.
- `x-ref-form` anywhere but beside an `x-ref`, or with another value, is an error.

`x-ref`, `x-ref-form`, `x-id-pattern`, `x-extends`, `x-identity` and `x-record-file` are
corpus-schema's vocabulary. JSON Schema validators reject unknown keywords in strict mode, so a
validator MUST register all six.

### Other corpora

A corpus can name other corpora in its root file. Three keys do it, each for one purpose:

- `extends` names parents, whose **types** the corpus builds on. A parent's records are not
  brought in.
- `references` names corpora whose **records** the corpus links to. Their types can be read, as
  `x-ref` targets, but not built on.
- `uses` names parent types that local folders hold **as they are**, with no schema file.

```yaml
corpus-schema: 0
level: 2
extends:
  sdlc: "@osdlc/corpus-profile-sdlc" # a package name
references:
  org: "../org-principles" # a path from the corpus root
uses: [sdlc/tasks, sdlc/decisions]
```

`extends` and `uses` need `level: 2`, since they are about schemas. `references` works at level 1
and level 2: a corpus with no schemas can still link to another corpus's records. A level 0 folder
has no root file, so it names no corpora, and no corpus can name it.

#### Sources

- `extends` and `references` MUST each be a mapping. Each key is a prefix: lowercase letters,
  digits and `-`. Each value is a source, a string.
- A prefix MUST NOT appear in both keys. One corpus MAY sit under two prefixes, one in each key,
  to give both its types and its records. It is still one corpus.
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
- Named corpora load transitively: each one's own `extends` and `references` resolve from its own
  folder. A cycle, where a corpus reaches itself through `extends` or `references` in any mix, is
  an error. So two corpora cannot reference each other.
- A folder reached twice, through two prefixes or two paths, is one corpus, with one set of types
  and records.
- Each named corpus is validated by its own rules, as a corpus of its own. A named corpus with
  errors is an error of the corpus that names it, at its `extends.<prefix>` or
  `references.<prefix>` field.
- `extends` or `uses` in a corpus that does not state level 2 is an error, and the corpus has no parents and uses no types.

#### Namespace

One rule says which types a corpus can name:

> A corpus names its own types as `<type>`, a parent's types as `<prefix>/<type>`, and the types of
> a corpus it references as `<prefix>/<type>`, extended by each further reference:
> `b/c/principles` is type `principles` of the corpus that `c` names in the `references` of the
> corpus that `b` names. Every such name can be read, by `x-ref`. Only a local type and a parent's
> `<prefix>/<type>` can be built on, by `x-extends` and `uses`.

A prefix in a named corpus's own schemas is that corpus's own prefix. Each corpus's prefixes are
its own. A corpus sees a grandparent's types only by extending the grandparent too.

#### Extends

- An inherited type is read-only. A corpus uses one through a local type folder: one with a schema
  that names it in `x-extends`, or one that `uses` names.
- `x-extends` at the root of a schema names the one type it builds on: a local type name, or
  `<prefix>/<type>` of a parent. The types it reaches that way, one after another, are the type's
  chain.
- Each type has a flattened schema. It is the type's own schema, with its top-level `properties`
  extended: every top-level property that a type up its chain declares, and the type does not
  declare itself, is added with the schema `true`. Its top-level `patternProperties` is extended
  the same way. So the fields add up first, the parents' fields and then the type's own, and a
  closing keyword at the root, `additionalProperties` or `unevaluatedProperties`, applies to the
  merged set.
- A record of the type MUST validate against the flattened schema of the type and of every type up
  the chain, as if they were joined by `allOf`. This includes each type's `required`,
  `x-id-pattern` and `x-ref` fields.
- So a child can add fields and tighten rules, never loosen them:
  - A field the child declares again keeps the parent's rules for it. A value MUST pass the
    parent's schema for the field and the child's.
  - A parent with `additionalProperties: false` at its root admits no field outside its own merged
    set. A type up whose chain such a parent sits MUST NOT declare a top-level property outside
    that set, since no record could hold it. That is an error at the property.
  - A parent with `unevaluatedProperties: false` at its root is closed too, but it also admits the
    fields its schema evaluates elsewhere, such as in `allOf` or through `$ref`. A validator does
    not report a child's field against it. A record with a field the parent does not admit still
    fails the parent's schema.
- Only root-level `properties` and `patternProperties` join the merged set. A field a type
  declares elsewhere, such as in `allOf`, `$ref` or `if`/`then`, does not. A closed child lists
  such a field itself.

  ```yaml
  # sdlc/principles/principles.schema.yaml: open
  properties:
    statement: { type: string }
    status: { enum: [draft, kept] }
  # rules/rules.schema.yaml: closed, and it sees statement and status
  x-extends: sdlc/principles
  additionalProperties: false
  properties:
    team: { type: string }
    status: { enum: [kept] } # tighter: a value must pass both enums
  ```

  A `rules` record may hold `statement`, `status` and `team`, and nothing else. Its `status` must
  be `kept`.

- A schema that holds only `x-extends`, such as `x-extends: claims/statements`, uses the parent's
  type as it is, under a new name.
- `x-extends` anywhere but the schema's root is an error. So are a name that matches no type, a
  prefix that `extends` does not declare, a type of a referenced corpus, and local types whose
  `x-extends` chain loops.
- A parent's records are not the corpus's. A local record MAY share an id with a parent's record.
  A link into a parent is an error: `_references/` holds only referenced corpora.

#### Uses

`uses` gives local folders a parent's type with no schema file of their own. Its value is one
entry or a list of entries. Each entry is `<prefix>/<type>`, naming one type of a parent, or
`<prefix>/*`, naming every type of the parent.

- A folder named after a used type, by its type name, with no schema file, is a type folder of a
  local type of that name that uses the parent's type as it is. Its files are records of it, as in
  Records. The local type's chain is the parent's type and the parent type's chain.
- A folder named after a used type that also holds a schema file is an error. To add fields, take
  the type out of `uses` and write `x-extends` in the schema.
- Two used types with the same name, such as `sdlc/tasks` and `other/tasks`, are an error, and
  neither is used. Build the folder's type with `x-extends` instead.
- A used type with no folder of its name is fine: the corpus has no records of it yet.
- An entry that names no parent, a prefix in `references` rather than `extends`, or a type the
  parent does not have, is an error at `uses`.
- A folder with no schema file that `uses` does not name stays a plain folder. Inside a type
  folder it holds that type's records; elsewhere its files are narrative. When such a folder holds
  record files (`.md`, `.yaml`, `.json`) and its name is one a parent's type has, or close to it
  (an edit distance of one for a name of four letters or more, or of two for eight or more, after
  case folding), a validator SHOULD warn, since a typo or a missing `uses` entry leaves records
  unchecked. `validate --strict` fails on that warning, as on any.

#### References

- A referenced corpus's records stay its own. A link, an `x-ref` link, or a reference by id or
  wikilink may point at them.
- A referenced corpus's types are visible by the Namespace rule, for reading.
- References carry through: a referenced corpus's own references are reachable by path, and their
  copies sit inside its copy (see The copy).

#### Identity

Every corpus, type and record has an identity, so that copies reached through two chains, and the
results of queries, builds and exports, can be told apart or merged. Identity uses package URLs,
[purl](https://github.com/package-url/purl-spec).

- **Corpus identity.** A corpus that is a package has the identity
  `pkg:<type>/<namespace>/<name>`, derived from the package: for npm, `pkg:npm/` and the package
  name, with a scope's `@` written `%40`. The versioned form adds `@<version>`, the version of the
  installed package. For example `pkg:npm/%40osdlc/corpus-profile-sdlc` and
  `pkg:npm/%40osdlc/corpus-profile-sdlc@0.3.0`. A tool that knows a corpus by another source MAY
  use that purl type, such as `pkg:github/acme/principles@v3`.
- **Type identity** adds the type folder name as the purl subpath:
  `pkg:npm/%40osdlc/corpus-profile-sdlc#tasks`, or `...@0.3.0#tasks`.
- **Record identity** adds the record id: `pkg:npm/%40osdlc/corpus-sdlc-starter@0.1.0#principles/P-0002`.
  Each subpath segment is percent-encoded alone, as purl says.
- **Which corpora are packages.** A corpus is a package when the nearest `package.json` at or
  above its folder has a `name`, and its `"corpus"` field, or its own folder when it has none, is
  the corpus folder. The identity uses that `name`, so it does not depend on how the corpus is
  reached: by a package source, an npm alias or a `./` path, it is the same package. Any other
  corpus has a local identity only: it is itself, by its folder, and it has no purl.
- **Collapse by identity.** Two records with the same identity are one record. A reference by id
  that finds one record through two chains of references is not ambiguous. It resolves to the copy
  reached through the shortest chain, so a direct reference wins. Two records with different
  identities are two matches, even with the same id.
- **One version per corpus.** Across the whole graph of a corpus, every corpus it extends or
  references at any depth, each corpus identity appears at exactly one version. A second version
  is an error, which names both versions and the chain of prefixes that brings in each. Storage
  stays nested, with one copy per chain (see The copy), so every copy of a corpus holds the same
  files.
- **Outputs carry identity.** A tool that reports, queries, builds or exports records MUST give
  each corpus's identity and version with its results, where the corpus has one, and SHOULD
  merge results with the same identity.
- **`x-identity`.** A schema MAY state its type's identity in `x-identity` at its root. It MUST be
  the unversioned type identity, such as `pkg:npm/%40osdlc/corpus-profile-sdlc#tasks`, since the
  schema file is the same at every version. Anything else is an error. In a corpus with no purl
  there is nothing to match, and a validator SHOULD warn that it does not check it. `$id` cannot
  hold the identity: JSON Schema forbids a fragment in `$id`, and the type identity has one.
- A model layer above corpus-schema, such as a kind in a pack that a corpus type is generated from,
  MAY point at the type by its identity, so each side can name the other.
- A corpus package SHOULD list the corpora it extends or references as `peerDependencies`, with a
  range, not as `dependencies`. The project that installs it then holds one version of each, which
  the one-version rule needs. pnpm and npm 7 or later install peer dependencies.

#### The copy

- `_references/<prefix>/` at the corpus root holds a read-only copy of each corpus `references`
  names. The `sync` verb writes it, and the corpus commits it, so relative links from local files
  to a referenced corpus's records work in Obsidian and on GitHub. `extends` gets no copy.
- The copy holds every file of the referenced corpus, byte for byte, and its own `_references/`,
  so transitive references sit nested: `_references/b/_references/c/`.
- `_references/` is not part of the corpus's own files. A validator finds no type, record or nested
  corpus in it, and does not check its links.
- A link from a checked file to `_references/<prefix>/<path>` is a link to `<path>` in that corpus.
  It resolves in the installed corpus, not in the copy. `_references/<prefix>/_references/<q>/<path>`
  is a link into that corpus's own reference `q`, and needs the middle corpus to hold its copy.
- A link into `_references/<prefix>/` where `<prefix>` is in `extends` is an error: a parent gives
  types only.
- When `_references/<prefix>/` exists, or a checked file links into it, it MUST match the installed
  corpus: the same file paths, with the same bytes. A validator reports each file that differs, is
  missing or is extra, with the field `(copy)`, and says to run `sync`. It MAY cap how many files
  it lists.
- A folder or file directly in `_references/` that names no reference is an error.
- A copy is needed only by a link into it: a link or wikilink from a checked file into
  `_references/<prefix>/`, or a `wikilink` reference to the corpus's record (see Typed
  references). A corpus that references another and has no such link needs no copy, and a
  validator MUST NOT report the copy missing.

### Verbs

v0 defines two verbs.

- `validate <folder>` checks every corpus at or below the folder against this spec, and exits
  non-zero when it finds any error. It reports each problem on one line:
  `<file>: <field>: <message>`, with the file relative to the corpus root. A problem that is not
  in one field puts a word in parentheses in the field's place, such as `(data)` for data that
  does not parse or `(folder)` for a folder that cannot be read. A file or folder that cannot be
  read is an error of the corpus that holds it.
- `validate --strict <folder>` also exits non-zero when it reports any warning. It still reports
  each warning as a warning. A corpus passes `--strict` when it has no errors and no warnings.
- `validate --fix <folder>` first rewrites every wikilink it can resolve as a relative Markdown
  link, in the files a validator checks, except in a field in the `id` or `wikilink` form (see
  Typed references). It changes nothing else in those files.
- `validate` never writes `_references/`.
- `sync <folder>` writes `_references/` for every corpus at or below the folder. For each corpus in
  `references` it writes `_references/<prefix>/`, and it removes every other file there. It copies
  nothing for `extends`. It changes nothing outside `_references/`, and a second run changes
  nothing. A corpus syncs after the corpora it references that sit below the same folder. When a
  corpus's root file has an error, or a corpus it names does not resolve or has errors of its own,
  `sync` writes nothing in that corpus and exits non-zero. A cycle is such an error, so `sync`
  never copies a corpus into itself.
- When a referenced corpus has turned a folder into a file, or a file into a folder, `sync`
  replaces the stale path in the copy.
- `sync` owns `_references/`: in a corpus with no `references` it empties it. It does not follow a
  symbolic link in `_references/`, and reports one as an error.

### Writing records

A tool that writes records changes only the keys it owns. It keeps key order, unknown keys,
comments and the body. In v0 a write replaces the whole file, and the last writer wins.

## Enforcement

[`@osdlc/corpus-schema`](../../ts/corpus-schema/README.md) is the reference validator. Its
`validate` command checks a folder against every rule above that a validator checks, and its
`sync` command writes the copies of the corpora a corpus references:

```sh
corpus-schema validate [--fix] [--strict] <folder>
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

A corpus that builds on a profile's types and links to another corpus's records keeps a copy of
the referenced corpus, written by `sync`:

```text
team-rules/
├── corpus-schema.md                level: 2
│                                   extends: { sdlc: "@osdlc/corpus-profile-sdlc" }
│                                   references: { org: ../org-principles }
│                                   uses: [sdlc/tasks]
├── _references/
│   └── org/                        a copy of ../org-principles
│       ├── corpus-schema.md
│       └── principles/
│           └── Be Kind.md
├── tasks/                          no schema file: sdlc/tasks as it is
│   └── T-0001.md
└── rules/
    ├── rules.schema.yaml           x-extends: sdlc/principles
    └── Review Kindly.md            links to ../_references/org/principles/Be%20Kind.md
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

## Prior art and terms: other corpora

Other documentation systems split the same jobs. Their terms place this spec's three keys.

- **DITA.** [`scope="peer"`](https://docs.oasis-open.org/dita/dita/v1.3/os/part3-all-inclusive/langRef/attributes/thescopeattribute.html)
  marks a resource that is part of the same set of content but may not be there at build time, and
  a peer map, a root map of its own that key references reach into. That is `references`: the
  target stays its own, and only links reach it.
  [`mapref`](https://docs.oasis-open.org/dita/dita/v1.3/os/part3-all-inclusive/langRef/base/mapref.html),
  [`conref`](https://docs.oasis-open.org/dita/dita/v1.3/os/part3-all-inclusive/archSpec/base/conref.html)
  and `conkeyref` pull content in, by inclusion or transclusion. corpus-schema does neither.
  [Keys](https://docs.oasis-open.org/dita/dita/v1.3/os/part3-all-inclusive/archSpec/base/using-keys-for-addressing.html)
  ([`keydef`](https://docs.oasis-open.org/dita/dita/v1.3/os/part3-all-inclusive/langRef/base/keydef.html),
  `keyref`, `keyscope`) address a target by name rather than path. That is a reference by id.
- **Sphinx** [intersphinx](https://www.sphinx-doc.org/en/master/usage/extensions/intersphinx.html)
  maps a name to another project's documentation and resolves cross-references into it. It is
  `references`, with a prefix per project.
- **Antora** builds a site from [component versions](https://docs.antora.org/antora/latest/component-version/),
  and an [`xref`](https://docs.antora.org/antora/latest/page/xref/) names a page in another
  component, as `version@component:module:page`. Each component stays its own.
- **Hugo** [module mounts](https://gohugo.io/hugo-modules/configuration/#module-configuration-mounts)
  map another module's folders into this site's tree, so its files are read as if they were local.
  `_references/` is a mount kept as a committed copy, so that tools with no mount, such as
  Obsidian and GitHub, follow the links.
- **OWL** [`owl:imports`](https://www.w3.org/TR/owl2-syntax/#Imports) merges another ontology's
  axioms into this one: its classes and its individuals together. corpus-schema splits that merge
  in two: `extends` brings the classes, the types, and `references` reaches the individuals, the
  records, without making them local.
- **AsciiDoc** [`include`](https://docs.asciidoctor.org/asciidoc/latest/directives/include/) and
  [XInclude](https://www.w3.org/TR/xinclude-11/) insert another file's content into a document.
  That is transclusion, and it is out of scope.
- **purl**, the [package URL](https://github.com/package-url/purl-spec), names a package by its
  ecosystem, namespace, name and version, with a subpath for a path inside it. corpus-schema uses it
  for identity (see Identity). A plain URL names where a corpus is fetched from, which changes with
  mirrors and checkouts, not what it is. A new URN scheme would need its own registry and tools.
  purl already names npm and git packages, has a written spec and libraries in many languages, and
  its subpath fits a type and a record.

**Why these words.** `extends` is the word JSON Schema users and object-oriented languages already
read as "build on its types". `references` says what a corpus does with another's records: it
points at them, as a reference in a paper does, and owns nothing of them. We considered `peers`,
from DITA's `scope="peer"`, but it names a relation, not an action, and reads as symmetric when a
reference goes one way. We considered `mounts`, from Hugo, but a mount suggests the files become
local, and they do not. `uses` is the plain verb for taking a type as it is, with no new schema.

## Deferred

v0 does not define these:

- **Links between corpora** other than into a referenced corpus's copy in `_references/`.
- Inclusion and transclusion of another corpus's content.
- Two corpora that reference each other. A cycle is an error in v0.
- A local record that refines or waives a referenced record on purpose, such as a `refines` key.
- A type that extends more than one type, and renaming an inherited type or prefix.
- Schema versions and migrations.
- Concurrent edits beyond last-writer-wins.
- Obsidian's vault-wide property types, which clash when two corpora give one key different types.
- `x-ref` inside nested objects.
- Wikilinks into a copy's own `_references/`.
- Reserved names, such as Windows device names.
- Stable error codes.
- `move` and `rename` verbs that rewrite every link to a record.
- Build targets, such as JSON, Astro, Nuxt and Obsidian Bases views.
- Dialects. The root key `dialect` is reserved for them. `profiles` stays reserved, unused.
