# markdown

This repository is a holding pen. It is where the markdown ecosystem will live once it has
matured.

By the markdown ecosystem we mean every package that reads, checks, stores or shows Markdown
notes.

For now the work happens in [osdlc/osdlc](https://github.com/osdlc/osdlc). The libraries, their
specs and the plan are developed there, beside the sdlc product that uses them, so that a change
that crosses both is one pull request. A library moves here when it nears 1.0 and releases on its
own. [osdlc/osdlc#789](https://github.com/osdlc/osdlc/pull/789) records the decision and the plan
for bringing the current content over.

Please open issues and pull requests in osdlc/osdlc, not here.

## What is still here

The content below is being brought to osdlc/osdlc. It stays here until that is done.

- [The plan](docs/ecosystem-plan.md): where things are today, what is wrong, where we want to end
  up, and how we get there.
- [The architecture](docs/architecture.md): the layers we are building toward, and the rules
  between them.
- [The corpus-schema guide](docs/corpus-schema.md): the spec for typed records kept as notes, its
  levels, and why it is shaped this way.
- [Pointing here from another repo](docs/pointing-here.md): a short note to paste into another
  repo's `CLAUDE.md` or `AGENTS.md`.
- [Packages](packages/README.md): the libraries published from here, starting with
  `@osdlc/corpus-schema` and its spec in `packages/`.
- The diagrams are made by `tools/diagrams/build.py` (the plan) and
  `tools/diagrams/architecture.py` (the architecture), which uses build.py's style. Run
  architecture.py after you change it. After you change build.py, run both.
  The task graph's statuses and dependencies live in `TASKS` and `task_graph()` in `build.py`.
  Update them together with the plan.
- [The claims profile](profiles/claims/): the first draft of the claims profile, record types for
  claims and their evidence, with an example corpus to copy.
