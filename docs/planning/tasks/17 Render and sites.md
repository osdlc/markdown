---
number: 17
title: Render/sites
detail: PRs 719 720
status: doing
type: functional
milestone: "[m-render](../milestones/m-render.md)"
---

Finish moving the render, edit and site packages out of sksizer/dev.
[osdlc/osdlc#719](https://github.com/osdlc/osdlc/pull/719) and
[#720](https://github.com/osdlc/osdlc/pull/720) have merged: markdown-render, markdown-render-vue
and markdown-vault-astro (the new name of markdown-astro) are on npm at 0.8.0, published from
osdlc/osdlc. Task 85 moves those three on to osdlc/markdown. What is left here: markdown-editor and
markdown-ui move from sksizer/dev straight to osdlc/markdown (decision
[D19](../decisions/D19%20Markdown%20libraries%20live%20in%20osdlc%20markdown.md)). Rename the vault words to corpus. In progress.
