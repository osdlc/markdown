---
title: Markdown libraries live in osdlc/markdown
status: decided
decided: "2026-11-12"
---

The Markdown libraries move to osdlc/markdown, so the plan and the code it plans sit in one repo.
[D17](D17%20Profiles%20and%20corpora%20live%20in%20osdlc%20models.md) already gives this repo that
job. This decision says which libraries move, which stay, and the rule that draws the line.

The rule: osdlc/markdown depends on osdlc/osdlc, never the other way. No library in osdlc/osdlc
depends on a package in osdlc/markdown. Without the rule the two repos would release in a loop:
markdown-contract and markdown-vault-astro use cli-tool, cli-tool uses config-layers, and
config-layers uses gfm-table, yaml-splice and etag-write.

So a library stays in osdlc/osdlc when a library there that is not part of the markdown ecosystem
depends on it. Its twin stays with it, because twins share one conformance family.

- Stay in osdlc/osdlc: frontmatter-lossless (detect-harness uses it), gfm-table and gfm-pipe-table,
  yaml-splice and its WebAssembly binding, etag-write (config-layers uses these), and path-guard.
  osdlc/markdown takes them from npm and crates.io.
- Move from osdlc/osdlc: markdown-link, markdown-tags and markdown-contract in both languages,
  markdown-render, markdown-render-vue and markdown-vault-astro, and the crates markdown-corpus,
  markdown-relink (markdown-reshape), markdown-vault-fs, vfs-walk, vfs-seam and slug-collate. Only
  markdown crates use the last three. Each conformance family moves with its libraries. Tasks 85 to
  87.
- Come from sksizer/dev straight here, with no stop in osdlc/osdlc: markdown-vault and
  vault-graph-core as markdown-corpus (task 12), markdown-vault-query (task 15), markdown-editor
  and markdown-ui (task 17).
- markdown-store stays in sksizer/rust-ontogen for now.
- Nothing moves from osdlc/skillwright. harness-reference is an app that uses these libraries.

Apps are not libraries, so the rule leaves them alone. The sdlc plugin packs in osdlc/osdlc can
use a package from this repo.

What the move costs:

- A change to cli-tool or frontmatter-lossless no longer runs against the markdown packages in the
  same pull request. A break shows up when this repo takes the new version.
- Each moved package needs its npm or crates.io trusted publisher pointed at this repo. That is
  owner work, as in task 59.
- This repo has no Rust release setup yet (task 86).
