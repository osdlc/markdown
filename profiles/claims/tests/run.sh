#!/bin/sh
# Checks that the claims schemas reject what they should.
#
# Each folder in cases/ holds one record that breaks one rule, laid out as in a
# corpus, and expected-error.txt. For each case the script copies the example
# corpus, adds the record, and runs the validator. The case passes when the
# validator exits 1, reports exactly one error, and prints the expected text.
set -eu

here=$(cd "$(dirname "$0")" && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

failed=0
for case_dir in "$here"/cases/*/; do
  name=$(basename "$case_dir")
  corpus="$work/$name"
  cp -R "$here/../example" "$corpus"
  cp -R "$case_dir." "$corpus/"
  rm "$corpus/expected-error.txt"

  status=0
  out=$(npx --yes @osdlc/corpus-schema@^0.2.0 validate "$corpus" 2>&1) || status=$?
  expected=$(cat "$case_dir/expected-error.txt")

  if [ "$status" -eq 1 ] &&
    printf '%s\n' "$out" | grep -qxF "$name: 1 error(s)" &&
    printf '%s\n' "$out" | grep -qF "$expected"; then
    echo "ok: $name"
  else
    echo "FAIL: $name (exit $status), expected: $expected"
    printf '%s\n' "$out" | sed 's/^/  /'
    failed=1
  fi
done

exit "$failed"
