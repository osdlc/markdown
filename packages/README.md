# Packages in osdlc/markdown

Each folder under `packages/ts/` is one TypeScript library, published to npm. Each folder under
`profiles/` is a corpus-schema profile, published to npm as a package of schemas with no code. Each
package's own README says how to use it. This file covers what holds for all of them.

- [`@osdlc/corpus-schema`](ts/corpus-schema/README.md), in `packages/ts/corpus-schema`: the
  validator for the [corpus-schema spec](conformance/corpus-schema/SPEC.md).
- [`@osdlc/corpus-profile-claims`](../profiles/claims/README.md), in `profiles/claims`: the claims
  profile, record types for claims and their evidence.

A spec family keeps its spec and its conformance cases in `packages/conformance/<family>/`, as in
osdlc/osdlc. `packages/conformance/families.json` lists each family, its reference implementation
and the command that writes the cases' expected values. The
[corpus-schema family](conformance/corpus-schema/README.md) is the first.

## Working on a library

The repository root is a pnpm workspace that holds `packages/ts/*` and `profiles/*`. Shared
dependency versions are in the catalog in `pnpm-workspace.yaml`.

```sh
pnpm install
pnpm run build
pnpm run test
pnpm run typecheck
```

Build first: the tests and the typecheck read the built `dist/`.

CI also runs each package's `smoke`, `lint`, `format:check` and `check:extra` scripts, where
defined, and these checks from the root devDependencies:

```sh
pnpm exec package-checks ts        # pack each package and check the tarball
pnpm exec conformance-suites check # check the conformance suites, and regenerate them
```

`package-checks` checks each package in `packages/ts/` against osdlc's package shape. The root
`package-checks.json` holds this repository's settings; the rest are osdlc's defaults. Every
package lints with the root `.oxlintrc.json` and keeps no lint config of its own.

`package-checks` does not check the profiles: its shape is for packages that ship code. Each
profile checks its own tarball instead. `profiles/claims/tests/package.sh` packs the profile with
pnpm, as the release does, installs it into a temporary `node_modules/`, and validates a corpus
that names it by package name. `.github/workflows/examples.yml` runs it.

## CI

`.github/workflows/packages-ci.yml` runs on every pull request and calls the shared
`ts-packages-ci.yml` workflow from osdlc/osdlc. The checks are `packages / changes`
and `packages / verify (<os>, node <n>)`, for Ubuntu and macOS under Node 22 and 24.

## Releases

Releases use [Changesets](https://changesets.dev), the same way as osdlc/osdlc.

- A change users can see adds a changeset: run `pnpm changeset` at the repository root. Start a
  breaking change's summary with `**Breaking:**`.
- On a push to main, `.github/workflows/packages-publish.yml` runs the full CI, then calls the
  shared `ts-packages-release.yml` workflow from osdlc/osdlc. With changesets pending, it opens a
  Version Packages pull request as the osdlc-release GitHub App. The workflow fills it by running
  `pnpm run version-packages`. It bumps the versions, then refreshes `pnpm-lock.yaml`, since
  `changeset version` rewrites the ranges packages use for each other and CI installs with
  `--frozen-lockfile`. Last, it rewrites the conformance suites, since each suite records its
  reference's version. When that pull request merges, the push publishes the versions that are
  not on npm yet.
- The release job passes the App key, `RELEASE_PLZ_APP_PRIVATE_KEY`, by name. The shared workflow
  requires it, and a reusable workflow reads an environment secret the caller does not pass as an
  empty string.
- The shared workflows are pinned to a commit on osdlc/osdlc's main branch. Never pin a pull
  request branch's commit: GitHub cannot start a workflow whose pinned commit is only on a branch
  that was deleted.
- npm auth is trusted publishing (OIDC) only, with provenance. Each package's trusted publisher on
  npmjs.com names repository `osdlc/markdown` and workflow `packages-publish.yml`, with no
  environment. Keep the workflow's file name.
- Each published version gets a git tag and a GitHub release named `<package>@<version>`, for
  example `@osdlc/corpus-schema@0.3.0`.
- A package must be on npm before CI can publish it. The owner stages a new package once with
  `package-checks stage`, which publishes a placeholder and adds its trusted publisher. For
  example, `pnpm exec package-checks stage profiles/claims`. The release refuses an unstaged
  package before it publishes anything, but it looks only in `packages/ts/`. A profile that is not
  staged fails at the publish step instead, so stage a new profile before its changeset merges.

## Moving more packages here

Move leaves first. A package moves only after every package it depends on is published to npm, so
it can depend on them by version. Nothing here depends on a package through the workspace that
still lives in another repository. The npm name stays the same. Keep the package's git history
when the move allows it.
