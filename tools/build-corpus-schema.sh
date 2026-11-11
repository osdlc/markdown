#!/bin/sh
# Installs and builds packages/ts/corpus-schema, this repo's own validator. The claims profile's
# example and tests use `extends`, which @osdlc/corpus-schema 0.2.x on npm does not read. CI runs
# this, and so can you, from any folder.
set -eu
cd "$(dirname "$0")/.."
pnpm install --frozen-lockfile --filter @osdlc/corpus-schema
pnpm --filter @osdlc/corpus-schema run build
