---
number: 87
title: Move Rust crates
detail: from osdlc/osdlc
status: todo
type: supporting
milestone: "[m-home](../milestones/m-home.md)"
after:
  - "[85 Move TS libraries](85%20Move%20TS%20libraries.md)"
  - "[86 Rust release here](86%20Rust%20release%20here.md)"
---

Move the Rust Markdown crates from osdlc/osdlc into this repo
([D19](../decisions/D19%20Markdown%20libraries%20live%20in%20osdlc%20markdown.md)): markdown-link,
markdown-tags, markdown-contract, markdown-corpus, markdown-relink, markdown-vault-fs, vfs-walk,
vfs-seam and slug-collate. They move in one step, because they depend on each other through the
workspace. Each keeps its crate name and its history.

- frontmatter-lossless, yaml-splice, etag-write and path-guard stay in osdlc/osdlc. The moved crates
  take them from crates.io.
- After this, each twin pair is in one repo again, beside its conformance family.
- Land [osdlc/osdlc#650](https://github.com/osdlc/osdlc/pull/650) first.
- The rename of markdown-relink to markdown-reshape (task 39) can happen before or after the move.
  If it comes after, the new name is first published from here.
- Owner work: point each crate's crates.io trusted publisher at this repo.

After 85 and 86.
