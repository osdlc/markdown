# markdown

This repo is the home of the long-term strategy and plan for our markdown ecosystem. Other repos
point here when they need to know where the markdown packages are going.

By the markdown ecosystem we mean every package that reads, checks, stores or shows Markdown
notes. Today those packages live in several repos: osdlc/osdlc, sksizer/dev, sksizer/rust-ontogen
and osdlc/skillwright.

For now this repo holds the plan. As we sort things out, packages and their docs will move in here
one at a time.

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
- [The sdlc profile](profiles/sdlc/): sdlc's planning record types, generated from its packs, and
  the [sdlc starter](corpora/sdlc-starter/), a corpus of shared principles that a work repo
  references and cites.
