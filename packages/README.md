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

Two more checks run in CI, from the root devDependencies:

```sh
pnpm exec package-checks ts    # pack each package and check the tarball
pnpm exec conformance check    # check the conformance suites
```

`package-checks` checks each package against osdlc's package shape. The root
`package-checks.json` holds this repository's settings; the rest are osdlc's defaults. Every
package lints with the root `.oxlintrc.json` and keeps no lint config of its own.

## CI

`.github/workflows/packages-ci.yml` runs on every pull request. It calls the shared
`ts-packages-ci.yml` workflow from osdlc/osdlc. A pull request checks the packages it changed and
the packages that depend on them, on Ubuntu and macOS under Node 22 and 24. The checks report as
`packages / verify (<os>, node <n>)`.

## Releases

Releases use [Changesets](https://changesets.dev), the same way as osdlc/osdlc.

- A change users can see adds a changeset: run `pnpm changeset` at the repository root. Start a
  breaking change's summary with `**Breaking:**`.
- On a push to main, `.github/workflows/packages-publish.yml` runs the full CI, then calls the
  shared `ts-packages-release.yml` workflow from osdlc/osdlc. With changesets pending, it opens a
  Version Packages pull request as the osdlc-release GitHub App. The workflow fills it by running
  `pnpm run version-packages`, which bumps the versions and rewrites the conformance suites, since
  each suite records its reference's version. When that pull request merges, the push publishes
  the versions that are not on npm yet.
- npm auth is trusted publishing (OIDC) only, with provenance. Each package's trusted publisher on
  npmjs.com names repository `osdlc/markdown` and workflow `packages-publish.yml`, with no
  environment. Keep the workflow's file name.
- Each published version gets a git tag and a GitHub release named `<package>@<version>`, for
  example `@osdlc/corpus-schema@0.3.0`.
- A package must be on npm before CI can publish it. The owner stages a new package once with
  `package-checks stage`, which publishes a placeholder and adds its trusted publisher.

## Moving more packages here

Move leaves first. A package moves only after every package it depends on is published to npm, so
it can depend on them by version. Nothing here depends on a package through the workspace that
still lives in another repository. The npm name stays the same. Keep the package's git history
when the move allows it.
