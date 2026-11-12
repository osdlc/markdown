---
number: 86
title: Rust release here
detail: release-plz and Rust CI
status: todo
type: supporting
milestone: "[m-home](../milestones/m-home.md)"
---

Give this repo a Rust workspace at `packages/rust/` with its own CI and release setup, so crates can
publish from here ([D19](../decisions/D19%20Markdown%20libraries%20live%20in%20osdlc%20markdown.md)).
osdlc/osdlc releases crates with release-plz (`release-plz.yml`) and checks them in `rust-ci.yml`.
Neither is a reusable workflow today, unlike the TypeScript ones this repo calls. So either make
them reusable in osdlc/osdlc and call them from here, as task 21 did for TypeScript, or copy them.
Prefer the first. It also needs the crate checks (`check:crates`) and the conformance check for
Rust implementations. It waits on nothing.
