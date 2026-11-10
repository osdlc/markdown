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
- [Pointing here from another repo](docs/pointing-here.md): a short note to paste into another
  repo's `CLAUDE.md` or `AGENTS.md`.
- [Packages](packages/README.md): the libraries published from here, starting with
  `@osdlc/corpus-schema` and its spec in `packages/`.
- [The plan as records](docs/planning/README.md): every task, milestone and decision, and the
  components the plan changes, as Markdown files that CI checks with corpus-schema. Update a task's
  record when its status changes.
- The diagrams are made by `tools/diagrams/build.py` (the plan) and
  `tools/diagrams/architecture.py` (the architecture), which uses build.py's style. Run
  architecture.py after you change it. After you change build.py, run both.
