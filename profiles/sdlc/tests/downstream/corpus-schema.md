---
corpus-schema: 0
level: 2
extends:
  sdlc: "@osdlc/corpus-profile-sdlc"
  osdlc: "@osdlc/corpus-sdlc-starter"
---

# Downstream fixture

A work repo's corpus that takes its types from the sdlc profile and its shared principles from
the sdlc starter. `tests/package.sh` installs both packages beside it and validates it.
