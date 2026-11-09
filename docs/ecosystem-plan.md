# The markdown ecosystem plan

This is a working plan. It says where our markdown packages are today, what is wrong with them,
where we want to end up, and the steps to get there. We update it as we go.

## Words we use

- A **note** is a Markdown file, often with YAML frontmatter at the top.
- A **corpus** is a folder of notes and the files they link to. An Obsidian vault is a corpus. So
  is a docs folder. Some of our packages say "vault" for the same thing.
- **The spec** is the format we are writing for typed records kept as notes. It is called
  **corpus-schema** (decided 2026-11-08).
- A **level** says how much a corpus declares about itself. Level 0 declares nothing, but its
  relative links must resolve. Level 1 adds a root file, type folders and ids. Level 2 gives each
  type a JSON Schema.
- A **record folder** is a folder inside a type folder that holds a record file with the folder's
  own name (`<folder>.md`, or `.yaml`, `.json`). The record owns the other files in the folder. A
  record folder can't hold another record folder or a type folder.
- A **profile** is a shared set of types that many corpora can use, such as a set of types for
  evidence. A corpus can use more than one profile, next to its own types.
- A **dialect** is a named flavor of note syntax on top of a common baseline, such as Obsidian's
  wikilinks and embeds.
- **Conformance cases** are shared test inputs and expected results. Every implementation of the
  spec, in any language, runs the same cases.

## The work

This graph shows all the work we know about. The numbers match the list in
[All the work](#all-the-work) below. An arrow means "must come first". A dashed box means every task
in it waits on the task whose arrow points at the box.

![The task graph, with the status of each task](diagrams/tasks.svg)

## First: unlock the evidence project

Another project is waiting on one thing. It needs a format for keeping evidence and research as
structured records. It will collect evidence, observations and test material, such as scripts,
queries and CSV results, as records with their files. Most of this exists already, so this comes
before the rest of the plan. It is tasks 1 to 5, in the first two columns of the graph.

1. **Rename to corpus-schema.** Done. The package and spec are now `@osdlc/corpus-schema` on osdlc
   main, with the command `corpus-schema` and the root file `corpus-schema.md` (or `.yaml`,
   `.json`). The spec text has the levels.
   [osdlc/osdlc#725](https://github.com/osdlc/osdlc/pull/725) merged on 2026-11-09. It is not
   published yet.
2. **Record folders.** A record folder keeps a record together with its files. This is how a test
   run keeps its script, its query and its CSV results together. It goes into the first release:
   [osdlc/osdlc#729](https://github.com/osdlc/osdlc/pull/729). It is reviewed and waits on the owner
   to merge.
3. **Publish 0.1.0.** The owner merges #729, and then the release script publishes 0.1.0.
4. **Evidence types.** The project copies in plain JSON Schema files for its types. Two exist in the
   harness-reference corpus in [osdlc/skillwright#74](https://github.com/osdlc/skillwright/pull/74):
   `references` (a source) and `evidence` (one observation of a source, with its date, quote and
   location). Claims, statements that cite evidence as support or as dispute, are not built yet.
   #74 needs the owner's answers on its naming questions. Copying the files means we don't need
   profiles to work yet. Later the same files become the evidence profile.
5. **The project writes records.** It starts keeping its evidence as records, checked by the
   validator.

A database built from the records (JSON or SQLite) is not in the fast path. It is task 16, after
the query layer (task 15).

## Where we are today

![Every markdown package today, by layer, with the problems marked](diagrams/present.svg)

| Layer | TypeScript | Rust |
|---|---|---|
| Render, edit, sites | markdown-render, markdown-editor, markdown-ui, markdown-astro (all in dev) | none |
| Query and store | markdown-vault-query (dev) | markdown-store, ontogen (rust-ontogen) |
| Types | model-schema and its packs (dev, open PRs); corpus-schema (osdlc) | none |
| Corpus model | markdown-vault, vault-graph-core (dev) | markdown-corpus, markdown-relink (osdlc) |
| Note parts | markdown-link, frontmatter-lossless, markdown-contract, markdown-tags, gfm-table, yaml-splice (osdlc) | a twin of each (osdlc) |
| Files | etag-write, path-guard (osdlc) | markdown-vault-fs, vfs-walk, vfs-seam, etag-write, path-guard (osdlc) |

markdown-tags moved into osdlc in [osdlc/osdlc#714](https://github.com/osdlc/osdlc/pull/714). Both
twins are on osdlc main with a conformance family. markdown-astro is moving in
[#719](https://github.com/osdlc/osdlc/pull/719) and markdown-render in
[#720](https://github.com/osdlc/osdlc/pull/720). The pack harness is in
[sksizer/dev#4069](https://github.com/sksizer/dev/pull/4069) and the first packs in
[sksizer/dev#4070](https://github.com/sksizer/dev/pull/4070). Neither is on dev main yet.

dev also keeps a private copy of markdown-link (`packages/ts/markdown-link`, version 0.1.0).
markdown-vault, vault-graph-core and markdown-astro use that copy through `workspace:*`, not the
published 0.8.1. dev task T-1NC5 tracks moving them off it.

What is published:

- Most osdlc note-part packages are on npm and crates.io. Two are not: the Rust gfm-pipe-table is
  `publish = false`, and markdown-tags is on neither registry yet.
- The Rust corpus packages (markdown-corpus, markdown-relink, markdown-vault-fs) are on crates.io.
- From rust-ontogen, ontogen 0.11.0, ontogen-core 0.8.0, ontogen-macros 0.2.0, ontogen-jsonapi
  0.3.0 and ontogen-ts 0.2.0 are on crates.io. markdown-store is `publish = false`.
- Nothing from dev is published, and corpus-schema is not published yet.
- skillwright still has its own copy of the old markdown-db package. harness-reference uses it
  through `workspace:*`.

## What is wrong

The biggest problem is that five pieces of code each decide what a link points to, and they don't
use the same rules.

![Five places resolve links, each its own way](diagrams/resolvers.svg)

| Id | Problem | Where |
|---|---|---|
| F1 | Three pieces of TypeScript decide links differently | markdown-vault has its own rule; vault-graph-core copies the Rust one; markdown-astro takes the first match and matches embeds by file name |
| F2 | TypeScript markdown-link can't resolve links | only the Rust crate can, so each TS package wrote its own |
| F3 | markdown-link misses some links | titles and parentheses in paths: [osdlc/osdlc#635](https://github.com/osdlc/osdlc/issues/635), fix in [#651](https://github.com/osdlc/osdlc/pull/651) |
| F4 | One thing, two words | both "vault" and "corpus" appear in both languages, and the spec uses corpus for something narrower |
| F5 | Two ways to define types | packs in model-schema, and schema files in corpus-schema |
| F6 | Two ways to lay out typed records | markdown-store and corpus-schema use different folders and links |
| F7 | markdown-store parses notes itself | its own frontmatter and wikilink code |
| F8 | The validator walks the folder itself | corpus-schema doesn't use the corpus model |
| F9 | Two query layers | markdown-vault-query exists; corpus-schema plans a loader |
| F10 | The old name sounded like a database | fixed: the spec is now corpus-schema |
| F11 | Packages in the wrong place | `@osdlc` packages that live in dev, including a private copy of markdown-link; vault-graph-core is `@sdlc` |

The Rust code says vault in markdown-vault-fs, in markdown-relink's `VaultFacts` and in
markdown-store's `VaultHandle`. The TypeScript code says vault in markdown-vault and
vault-graph-core.

## Where we want to end up

We follow four rules:

1. One package per job per language.
2. When a job has a TypeScript and a Rust package, they are twins. They share one set of
   conformance cases, so they behave the same.
3. One word for each idea.
4. Anything general lives in the osdlc org. The spec and its profiles live in this repo. The
   other packages stay in osdlc/osdlc until they move here. Apps use them from there.

![The target, by layer](diagrams/target.svg)

In practice:

- TypeScript markdown-link learns to resolve links the same way the Rust one does. Then nothing
  else needs its own resolver.
- markdown-vault and vault-graph-core become one TypeScript corpus model, the twin of the Rust
  markdown-corpus crate.
- The spec has levels 0 to 2. Its validator reads the corpus model instead of walking the folder
  itself.
- Types can come from profiles. There is one format for defining types, not two.
- markdown-store writes the spec's layout and uses the shared note parts.
- There is one query layer, built on the corpus model.

Levels and profiles are separate ideas. A level says how much a corpus declares. A profile says
whose types it uses. So a profile is not "level 3": a corpus at level 2 can use the evidence profile,
the sdlc profile and its own types all at once.

![Levels 0 to 2 on one side, profiles on the other](diagrams/levels-profiles.svg)

### Proposal: a baseline and dialects

This is a proposal, not a decision.

The spec would have a baseline that every tool supports. On top of it, a corpus could name a
dialect for things that vary from tool to tool, with no promise that every tool handles them. A
tool that knows the dialect checks it. A tool that doesn't checks only the baseline, and says that
it did.

The spec already accepts wikilinks. Today a wikilink resolves by a unique path suffix inside the
corpus, the validator warns about it, and `--fix` rewrites it as a relative link. A corpus that says
`dialect: obsidian` would make wikilinks first-class, with no warning. They could also reach beyond
the corpus to the rest of the vault, and the corpus could use embeds.

We already use the word this way. markdown-tags has three dialects, and markdown-render renders the
Obsidian dialect. It works like CommonMark as the baseline with GFM as an extension.

So the spec would have three separate settings:

- the **level**: how much a corpus declares, from 0 to 2;
- the **dialect**: which link and syntax flavor it uses beyond the baseline;
- the **profiles**: which shared sets of types it uses.

We'd like to call these shared sets of types **profiles**, not packs. Profile is the usual word in
data standards: FHIR profiles, Dublin Core application profiles, the W3C Profiles Vocabulary and the
`profile` link relation in [RFC 6906](https://www.rfc-editor.org/rfc/rfc6906), and GA4GH VA-Spec
profiles. In dev, "pack" already means plugin bundles (glossary term TM-0050). Its notes also say
that the proposed decision D-ME8T would stretch "pack" to cover packs of entity kinds, so dev may
end up using the word for this too. Whether model-schema switches its word is an open question for
[sksizer/dev#4069](https://github.com/sksizer/dev/pull/4069).

## Decisions

### Decided

- **D2. The spec's name is corpus-schema** (decided 2026-11-08). The package is
  `@osdlc/corpus-schema`, the command is `corpus-schema`, and the root file is `corpus-schema.md`
  (or `.yaml`, `.json`). It says what the spec adds: a schema on top of a corpus. A level-0 corpus
  simply has no schema file.
- **D1. The word for a folder of notes is corpus.** It follows from D2, which keeps "corpus" as the
  level-0 word. The vault names in our packages move to corpus over time.
- **D3. The TypeScript corpus model is called markdown-corpus**, the same as its Rust twin. The
  markdown-corpus crate keeps its name.
- **D6. The spec has a level 0.** The merged SPEC.md defines it: a corpus that declares nothing,
  whose relative links must resolve.
- **Record folders are in the first release, 0.1.0. The JSON/SQLite build is later work.**

### Still open

- **D4. How types are defined.** Profiles written as packs, or plain JSON Schema files that packs
  compile to.
- **D5. What "db" means.** The query layer, or nothing until we build one.
- **D7. When to publish.** The current course is to merge #729, then publish 0.1.0.

### Names we considered

corpus-spec and corpora-spec named the document more than the tool, and the plural was easy to
mistype. markdown-corpus was already the Rust crate's name. markdown-records fit only the record
levels. markdown-db, the old name, sounds like a database, and other projects with that name are
databases.

## All the work

The numbers match the task graph at the top. "After" says what must come first.

**The spec and the evidence project**

1. **Rename to corpus-schema**, with the levels in the spec text:
   [osdlc/osdlc#725](https://github.com/osdlc/osdlc/pull/725). Done.
2. **Record folders** in corpus-schema:
   [osdlc/osdlc#729](https://github.com/osdlc/osdlc/pull/729). After 1. Reviewed; waiting on the
   owner.
3. **Publish 0.1.0.** The owner merges #729, then the release script publishes. After 2.
4. **Evidence types** for the evidence project: references and evidence exist, claims are not built
   yet. Needs the owner's answers on
   [osdlc/skillwright#74](https://github.com/osdlc/skillwright/pull/74).
5. **The evidence project writes records.** After 3 and 4.
6. **x-warn**: a schema can mark a rule as a warning instead of an error. After 3.
7. **The Obsidian dialect**: wikilinks without a warning, able to reach beyond the corpus, and
   embeds. After 3.
8. **skillwright uses the npm package.** harness-reference switches from its `workspace:*` copy of
   markdown-db to `@osdlc/corpus-schema` and renames its root file to `corpus-schema.md`. After 3.
9. **Profiles.** Decide D4, then let a corpus take its level-2 types from profiles. model-schema
   moves to osdlc. After 3 and [sksizer/dev#4069](https://github.com/sksizer/dev/pull/4069).
10. **markdown-store on the shared parts**, writing the spec's layout. After 3.

**The corpus model**

11. **Teach markdown-link to resolve links.** Land
    [osdlc/osdlc#649](https://github.com/osdlc/osdlc/pull/649) and then
    [#651](https://github.com/osdlc/osdlc/pull/651), which is stacked on it. Then add a TypeScript
    resolver taken from vault-graph-core's copy of the Rust one, with shared cases. Can start now.
12. **One TypeScript corpus model**, markdown-corpus: markdown-vault and vault-graph-core merged into
    osdlc on top of markdown-link's resolver. After 11.
13. **Switch the users** to the new model and resolver: markdown-vault-query, markdown-astro, and
    determined (its vault-graph app and its graph and notes experiences). They also move off dev's
    private copy of markdown-link. After 12.
14. **The validator reads the corpus model** instead of walking the folder itself. After 3 and 12.
15. **One query layer.** Move markdown-vault-query to osdlc on top of the corpus model. After 12 and
    D5.
16. **The JSON/SQLite build**: write every valid record to JSON files and a SQLite file. After 15.

**Separate work**

17. **Finish moving the render, edit and site packages**:
    [osdlc/osdlc#719](https://github.com/osdlc/osdlc/pull/719) and
    [#720](https://github.com/osdlc/osdlc/pull/720), then markdown-editor and markdown-ui. Rename
    the vault words to corpus. In progress.
18. **This plan**: [osdlc/markdown#4](https://github.com/osdlc/markdown/pull/4). Waiting on the
    owner.
19. **Point other repos here**: osdlc/osdlc, sksizer/dev, osdlc/skillwright and sksizer/rust-ontogen
    get the note in [pointing-here.md](pointing-here.md). After 18.
20. **The architecture doc**: [osdlc/markdown#5](https://github.com/osdlc/markdown/pull/5). In
    progress.

**Moving packages here**

21. **Release setup here, then move corpus-schema.** Give this repo its own release setup:
    Changesets, a publish workflow with npm trusted publishing, package checks, the conformance
    check, a CI matrix and shared configs. Then move `@osdlc/corpus-schema` and its spec family from
    osdlc/osdlc into this repo as its first package. The npm name stays the same. After 3. Other
    markdown packages follow the same path later. SPEC.md says the spec will move to "a repository
    of its own once stable". This repo is meant to be that home, so that line in osdlc needs
    updating when the move happens.

We will track each task as an issue in this repo.
