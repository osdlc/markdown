#!/bin/sh
# Config path probe, as run for this study result. Prints CSV to stdout.
set -eu

places="$HOME/.config/fernlog/config.toml $HOME/.fernlog.toml"

echo "place,run,marker"
for place in $places; do
  label=$(echo "$place" | sed "s|^$HOME|~|")
  mkdir -p "$(dirname "$place")"
  printf 'marker = "%s"\n' "$label" > "$place"
  for run in 1 2 3; do
    marker=$(fernlog config show --key marker 2>/dev/null || echo none)
    echo "$label,$run,$marker"
  done
  rm "$place"
done
