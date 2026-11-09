#!/bin/sh
# Config path probe, as run for this study result. Prints CSV to stdout.
# It runs in a throwaway home, so it never touches a real config file.
set -eu

HOME=$(mktemp -d)
export HOME
unset XDG_CONFIG_HOME
trap 'rm -rf "$HOME"' EXIT

echo "place,run,marker"
for label in "~/.config/fernlog/config.toml" "~/.fernlog.toml"; do
  place="$HOME/${label#\~/}"
  mkdir -p "$(dirname "$place")"
  printf 'marker = "%s"\n' "$label" > "$place"
  for run in 1 2 3; do
    marker=$(fernlog config show --key marker 2>/dev/null || echo none)
    echo "$label,$run,$marker"
  done
  rm "$place"
done
