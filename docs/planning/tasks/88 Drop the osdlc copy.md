---
number: 88
title: Drop the osdlc copy
detail: corpus-schema in osdlc/osdlc
status: todo
type: supporting
milestone: "[m-npm](../milestones/m-npm.md)"
---

Remove corpus-schema from osdlc/osdlc, so this repo holds the only copy. Task 21 moved the package
and its spec family here, but osdlc/osdlc still has `packages/ts/corpus-schema` and
`packages/conformance/corpus-schema`, and it still releases from them.

The copies have drifted. osdlc/osdlc published 0.2.1
([osdlc/osdlc#773](https://github.com/osdlc/osdlc/pull/773)), a patch that takes
`@osdlc/markdown-link` 0.9.0. This repo is at 0.2.0. While the copy stays, each markdown-link
release in osdlc/osdlc bumps and publishes it again.

- Bring 0.2.1 here first: the changelog entry, the version and the markdown-link range.
- Delete both folders from osdlc/osdlc, and the family's entry in its
  `packages/conformance/families.json`.
- Between this and the publisher move (task 59), no corpus-schema release can go out. That is
  fine: the next one is 0.3.0 (task 36), from here.

It waits on nothing. Release 0.3.0 (task 36) comes after it.
