# @osdlc/corpus-profile-sdlc

The sdlc profile is the set of record types an sdlc planning corpus uses: principles, standards,
decisions, tasks, milestones, notes and the rest. A repo that keeps its plans as Markdown files can
check them with these types instead of writing its own.

The profile is a corpus that holds types and no records. It ships as the npm package
`@osdlc/corpus-profile-sdlc`. A corpus names it under `extends` in its root file, with the prefix
`sdlc`, and builds its own types on the profile's types. The
[corpus-schema spec](../../packages/conformance/corpus-schema/SPEC.md) defines both.

## Where the types come from

The types are generated, not written by hand. Their source is two packs for `@osdlc/model-schema`,
a library that describes record types once and emits TypeScript, JSON Schema and validators from
them:

- `@osdlc/pack-intent`: principles, standards, decisions, drivers, products, capabilities, terms
  and references.
- `@osdlc/pack-sdlc`: tasks, milestones, backlog, roadmaps, frictions and notes. It requires the
  intent pack.

model-schema's corpus emitter, `model-schema corpus`, writes one type folder per kind into
[corpus/](corpus/). `--inline` puts the intent kinds in the same corpus, so the profile extends
nothing and every reference between two kinds names a local type. [corpus/README.md](corpus/README.md)
lists the types and says what each schema checks.

model-schema and the packs are in a private repo for now, so regenerating the profile is a manual
step. No check here notices when the packs change. That stays so until model-schema and the packs
move to a public repo.

## The types

| Folder          | `type:`      | File name     |
| --------------- | ------------ | ------------- |
| `principles/`   | `principle`  | `P-NNNN`      |
| `standards/`    | `standard`   | `S-NNNN`      |
| `decisions/`    | `decision`   | `D-NNNN`      |
| `drivers/`      | `driver`     | `DR-NNNN`     |
| `products/`     | `product`    | `PR-NNNN`     |
| `capabilities/` | `capability` | `C-NNNN`      |
| `terms/`        | `term`       | `TM-NNNN`     |
| `references/`   | `reference`  | `RF-NNNN`     |
| `tasks/`        | `task`       | `T-NNNN`      |
| `milestones/`   | `milestone`  | `M-NNNN(.N)`  |
| `backlog/`      | `backlog`    | `B-NNNN`      |
| `roadmaps/`     | `roadmap`    | `RM-NNNN`     |
| `frictions/`    | `friction`   | `FR-NNNN`     |
| `notes/`        | `note`       | `N-NNNN`      |

`N` is a digit or an upper-case letter. A file is named by its id, such as `P-0002.md`, or by its
id and a slug, such as `P-0002-favor-deterministic.md`.

Each schema checks the frontmatter: the fields, their types and enums, the lifecycle states, and
the pack rules that JSON Schema can hold. A reference to another record, such as a principle's
`related` or a task's `depends_on`, has `x-ref` with `x-ref-form: wikilink`. Its value is
`"[[P-0002]]"`, and it must name a record of the right type by id.

The profile does not check body sections, defaults, or the relations the packs derive, such as a
decision's inverse links. The packs hold those.

## Install

```sh
pnpm add -D @osdlc/corpus-profile-sdlc
# or
npm install --save-dev @osdlc/corpus-profile-sdlc
```

Install it in the folder that holds your corpus, or in any folder above it. The validator finds the
package the way Node.js does. The package's `"corpus"` field names its corpus folder, `corpus/`.

You need a corpus-schema validator that reads `extends`, `x-ref-form` and lists in `x-ref`:
`@osdlc/corpus-schema` 0.3.0 or later.

## Use it

Name the profile in your corpus's root file. `extends` needs level 2:

```yaml
---
corpus-schema: 0
level: 2
extends:
  sdlc: "@osdlc/corpus-profile-sdlc"
---
```

Give each type folder a schema file that uses the profile's type. `tasks/tasks.schema.md`:

```yaml
---
x-extends: sdlc/tasks
---
```

Then validate:

```sh
npx @osdlc/corpus-schema validate --strict docs/planning
```

For shared records as well as types, extend the [sdlc starter](../../corpora/sdlc-starter/)
corpus.

## For corpus-schema 0.2

`@osdlc/corpus-schema` 0.2.x reads no `extends`, no `x-ref-form` and no list in `x-ref`. A corpus
that must validate with 0.2 copies a variant of the profile instead. Make it from a checkout of the
packs, as in Regenerate:

```sh
cd packages/ts/pack-sdlc
bunx model-schema corpus . --inline --links id --refs pattern --out <your corpus>
```

The variant writes each reference by id, such as `depends_on: [T-0002]`, and has no `x-ref`. Its
pattern still checks the id's shape and the target's prefix, but not that the record exists. That
is what 0.2 needs loosened: it reads an `x-ref` value only as one link to a file of one type, so a
bare id fails, and `[[T-0001]]` finds no file named `T-0001-slug.md`. File names, closed types and
the pack rules work under 0.2 as they are.

Copy the variant's root file and type folders into your corpus, and copy them again to take a new
version. Validate with `npx @osdlc/corpus-schema@0.2 validate <your corpus>`.

## Regenerate

From a checkout of the repo that holds model-schema and the packs (sksizer/dev, private for now):

```sh
cd packages/ts/pack-sdlc
bunx model-schema corpus . --inline --out <osdlc/markdown>/profiles/sdlc/corpus
```

The command owns `corpus/`: it rewrites every file and removes files it did not write. Commit the
result with a changeset.

## Test

```sh
sh tools/build-corpus-schema.sh
pnpm install --frozen-lockfile --filter @osdlc/corpus-sdlc-starter
sh profiles/sdlc/tests/package.sh
```

`tests/package.sh` packs this package and the starter, installs them in a temporary
`node_modules/`, and validates the profile, the starter, broken copies of a starter record, and
[tests/downstream/](tests/downstream/), a corpus that cites a starter principle by id.
