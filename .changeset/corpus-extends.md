---
"@osdlc/corpus-schema": minor
---

A corpus can extend other corpora. The root file's new `extends` key maps a prefix to a parent: an
npm package name, found as Node finds it from the corpus folder (with an optional `"corpus"` field
in its package.json), or a `./` or `../` path. Parents load transitively, and a cycle is an error.
`extends` needs level 2.

A schema's new `x-extends` key builds a type on a parent's type (`org/principles`) or a local type.
A record must pass every schema up the chain. `x-ref` can name a parent's type, and accepts records
of types that extend the named type. A local record must not take the id of an inherited record.

The new `corpus-schema sync [<folder>...]` command, and `syncCorpus`, write a copy of each parent
into `_inherited/<prefix>/` and remove stale files. Links into `_inherited/` resolve in the
installed parent. `validate` checks that the copy matches the installed parent and says to run
`sync` when it does not. `validate` never writes the copy. `_inherited/` holds no local types or
records, and `findCorpora` does not search it.

A report's `name` is now the base name of the resolved folder, so `validateCorpus('.')` reports the
folder's name instead of `.`.
