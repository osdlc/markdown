# Packages in osdlc/markdown

Each folder under `packages/ts/` is one TypeScript library, published to npm.
Each library's own README says how to use it. This file covers what holds for all of them.

- [`@osdlc/corpus-schema`](ts/corpus-schema/README.md), in `packages/ts/corpus-schema`: the
  validator for the [corpus-schema spec](conformance/corpus-schema/SPEC.md).

A spec family keeps its spec and its conformance cases in `packages/conformance/<family>/`, as in
osdlc/osdlc. `packages/conformance/families.json` lists each family, its reference implementation
and the command that writes the cases' expected values. The
[corpus-schema family](conformance/corpus-schema/README.md) is the first.

## Working on a library

The repository root is a pnpm workspace that holds `packages/ts/*`. Shared dependency versions
are in the catalog in `pnpm-workspace.yaml`.

```sh
pnpm install
pnpm run build
pnpm run test
pnpm run typecheck
```

Build first: the tests and the typecheck read the built `dist/`.

## Releases

Releases from this repository are not set up yet. The CI workflow, the package and conformance
checks, and the publish workflow are being extracted in osdlc/osdlc into shared, versioned pieces,
and this repository will use them. Until then `.github/workflows/packages-ci.yml` only builds,
tests, smokes and typechecks, and nothing is published from here. The versions on npm were published
from osdlc/osdlc.

When the release setup lands, it follows osdlc/osdlc's rules:

- A change users can see adds a changeset. On a push to main, `packages-publish.yml` opens a
  Version Packages pull request, or publishes the versions that are not on npm yet.
- npm auth is trusted publishing (OIDC) only, with provenance. Each package's trusted publisher on
  npmjs.com names repository `osdlc/markdown` and workflow `packages-publish.yml`.
- Each published version gets a git tag and a GitHub release named `<package>@<version>`, for
  example `@osdlc/corpus-schema@0.3.0`.

## Moving more packages here

Move leaves first. A package moves only after every package it depends on is published to npm, so
it can depend on them by version. Nothing here depends on a package through the workspace that
still lives in another repository. The npm name stays the same. Keep the package's git history
when the move allows it.
