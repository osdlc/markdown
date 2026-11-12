---
number: 85
title: Move TS libraries
detail: from osdlc/osdlc
status: todo
type: supporting
milestone: "[m-home](../milestones/m-home.md)"
after:
  - "[21 Release here](21%20Release%20here.md)"
---

Move the TypeScript Markdown libraries from osdlc/osdlc into this repo
([D19](../decisions/D19%20Markdown%20libraries%20live%20in%20osdlc%20markdown.md)): markdown-link,
markdown-tags, markdown-contract, markdown-render, markdown-render-vue and markdown-vault-astro.
They take the path corpus-schema took in task 21: the package moves with its history and keeps its
npm name, and osdlc/osdlc drops its copy in the same step.

- The markdown-link and markdown-tags conformance families move to `packages/conformance/` here.
  Their Rust twins stay in osdlc/osdlc until task 87, so until then the crates read the cases from
  this repo or keep a copy that CI compares.
- frontmatter-lossless, gfm-table, yaml-splice and cli-tool stay in osdlc/osdlc. The moved packages
  take them from npm, not `workspace:*`.
- Land [osdlc/osdlc#649](https://github.com/osdlc/osdlc/pull/649) and
  [#651](https://github.com/osdlc/osdlc/pull/651) first, so no open pull request is left behind on
  markdown-link.
- Owner work: point each package's npm trusted publisher at this repo's publish workflow, as task
  59 does for corpus-schema.

After 21.
