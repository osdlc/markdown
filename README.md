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
- [Pointing here from another repo](docs/pointing-here.md): a short note to paste into another
  repo's `CLAUDE.md` or `AGENTS.md`.
- The diagrams in the plan are made by `tools/diagrams/build.py`. Run
  `python3 tools/diagrams/build.py` after you change it. The task graph's statuses and
  dependencies live in `TASKS` and `task_graph()` in that script. Update them together with the plan.
