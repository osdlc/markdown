---
"@osdlc/corpus-schema": minor
---

A corpus can extend other corpora. The root file's new `extends` key maps a prefix to a parent: an
npm package name, found as Node finds it from the corpus folder (with an optional `"corpus"` field
in its package.json), or a `./` or `../` path. Parents load transitively, and a cycle is an error.
`extends` needs level 2.

A schema's new `x-extends` key builds a type on a parent's type (`org/principles`) or a local type.
The chain's fields are merged before a closing keyword applies: a type's
`additionalProperties: false` or `unevaluatedProperties: false` admits the top-level fields of
every type up its chain, so a closed child no longer has to list its parent's fields. A record
still passes every schema up the chain, so a field the child declares again keeps the parent's
rules. A parent that closes its fields admits no new ones, and a child that declares one gets an
error at that field. `x-ref` can name a parent's type, and accepts records of types that extend
the named type. A local record must not take the id of an inherited record.

`x-ref` can list several types, as in `x-ref: [tasks, decisions, milestones]`. A record of any of
them, or of a type that extends one, matches. The single name still works.

The new `x-ref-form` keyword, beside `x-ref`, says how a value names its record: `link` (the
default, a relative link), `id` (a bare id such as `T-0012`) or `wikilink` (`"[[N-0001]]"`). An id
resolves among the matching records of the corpus and of every corpus it extends, compared after
NFC normalization and case folding. No match, or more than one, is an error. An `id` or
`wikilink` field is not checked as a link, gets no wikilink warning, and `validate --fix` leaves
it as it is. A `wikilink` to a parent's record needs the parent's `_inherited/` copy.

The new `validate --strict` flag fails a corpus that has warnings, as if they were errors.

The new `corpus-schema sync [<folder>...]` command, and `syncCorpus`, write a copy of each parent
into `_inherited/<prefix>/` and remove stale files. Links into `_inherited/` resolve in the
installed parent. `validate` checks that the copy matches the installed parent and says to run
`sync` when it does not. `validate` never writes the copy. A corpus needs a copy only when one of
its files links into it, or a `wikilink` reference names the parent's record. `sync` writes
nothing when a parent has errors, a cycle in `extends` included, and it replaces a path the parent
turned from a folder into a file or back. `_inherited/` holds no local types or records, and
`findCorpora` does not search it.

`x-ref` messages name the type as "a record of type org/principles", in place of "a org/principles
record". A field whose `x-ref` names no type is an error in the schema only: its values are not
checked as well.

A report's `name` is now the base name of the resolved folder, so `validateCorpus('.')` reports the
folder's name instead of `.`.
