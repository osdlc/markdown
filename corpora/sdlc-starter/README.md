# @osdlc/corpus-sdlc-starter

The sdlc starter is a small knowledge base that a work repo inherits. It holds shared records, for
now two draft principles, as a corpus-schema corpus. Its types come from the
[sdlc profile](../../profiles/sdlc/), `@osdlc/corpus-profile-sdlc`.

| Record                                                        | Title                                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| [P-0001](corpus/principles/P-0001.md) | Normalize equivalent inputs at the boundary, and reject invalid ones |
| [P-0002](corpus/principles/P-0002.md) | Favor deterministic over probabilistic judgement                    |

Both are `open/draft` and marked `need_human_review: true`.

## Extend it from a repo

Install the starter and the profile in the folder that holds your corpus, or in any folder above
it:

```sh
pnpm add -D @osdlc/corpus-sdlc-starter @osdlc/corpus-profile-sdlc
```

Name both in your corpus's root file. `extends` needs level 2. A corpus sees only its own parents'
types, so it names the profile as well as the starter:

```yaml
---
corpus-schema: 0
level: 2
extends:
  sdlc: "@osdlc/corpus-profile-sdlc"
  osdlc: "@osdlc/corpus-sdlc-starter"
---
```

Give your `principles/` folder a schema file that builds on the starter's type, so your principles
can cite the starter's. `principles/principles.schema.md`:

```yaml
---
x-extends: osdlc/principles
---
```

Cite a starter principle by id, as a quoted wikilink: `related: ["[[P-0002]]"]`. The validator
finds it among the starter's records. A wikilink to a parent's record is a link into the parent's
copy, so write the copy and commit it:

```sh
npx @osdlc/corpus-schema sync docs/planning
npx @osdlc/corpus-schema validate --strict docs/planning
```

`sync` writes `_inherited/osdlc/` and `_inherited/sdlc/` beside your root file. Run it again after
you update either package. Your own records must not reuse an id the starter holds.

[profiles/sdlc/tests/downstream/](../../profiles/sdlc/tests/downstream/) is a corpus set up this
way.

## Add a principle

1. Take the next free id: `P-0003`.
2. Write `corpus/principles/P-0003.md`. Copy the frontmatter of
   [P-0002](corpus/principles/P-0002.md), and set `id`, `title` and `created`. Keep
   `state: open/draft` and `need_human_review: true` until it is reviewed.
3. Give it exactly one category tag: `principle/product`, `principle/technical`,
   `principle/project` or `principle/llm-ai`.
4. Write the body: `## Statement`, `## Why` and `## How it applies`. The profile does not check
   body sections yet.
5. Check it: `sh profiles/sdlc/tests/package.sh` from the repository root.
6. Add a changeset for `@osdlc/corpus-sdlc-starter`.

A record is named by its id alone, `P-0003.md`, not `P-0003-slug.md`. corpus-schema takes a
record's id from its file name, so `[[P-0003]]` finds only `P-0003.md`.
