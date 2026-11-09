---
specifiedBy: "[Config path probe](../methods/Config%20path%20probe.md)"
contributions:
  - contributor: { name: Sam Example, agentType: person }
    activityType: created
    date: 2026-11-02T15:10:00Z
ancillaryResults:
  configRead: ~/Library/Application Support/fernlog/config.toml
qualityMeasures:
  os: macOS 15.4
  fernlogVersion: 2.3.1
  runs: 9
---

fernlog read `~/Library/Application Support/fernlog/config.toml` on all three runs. With only
`~/.config/fernlog/config.toml` in place, it printed no marker on any run: it did not read that
file. It ignored `~/.fernlog.toml` too.

This run kept no files, so it is a plain record rather than a record folder.
