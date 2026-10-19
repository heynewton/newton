## Process: roles, board, weekly rhythm and the Phase 1 backlog

**Prompt**

````text
plan the work to build hey newton.
as a scrum master, propose a way to organize.
I'll be prioritizing, and claude will do all the coding.
2 friends could be interested in reviewing, contributing
````

Then, after the proposal:

````text
Yes, set it up. I've run gh auth refresh -s project. Phase 1 screen: web. Friends get write access.
````

**What Claude did**

- Proposed light Kanban with a weekly beat instead of full Scrum: since Claude writes the code, the
  maintainer's review time is the bottleneck, so the process optimizes for small PRs and clear
  "Done when" lists. Roles: maintainer as product owner (merging is acceptance), Claude as the dev
  team, friends as reviewers and contributors.
- Wrote `docs/process.md` (roles, board columns, Definition of Ready and Done, weekly planning and
  review, monthly retro) and added "Picking up work" and "Reviewing" sections to `CONTRIBUTING.md`.
- Created a `web` area label and the 14 Phase 1 issues ([#3](https://github.com/heynewton/newton/issues/3)
  to [#16](https://github.com/heynewton/newton/issues/16)), in dependency order, each with a
  "Done when" list and "Blocked by" lines. The two self-contained `calc` functions are marked
  `help wanted` and the fake sample boat `good first issue`, as entry points for contributors.
- Updated `CLAUDE.md` with the `web` label, a web row in the stack table, and a pointer to the process.

**What changed along the way**

- *Choice:* Phase 1 screen: web. *Choice:* friends get write access.
- The repo ruleset requires no approving reviews but does require resolved review threads, so
  `CONTRIBUTING.md` says reviews are welcome but optional, and that an open thread blocks the merge.
- The `gh` token didn't have the `project` scope yet on the first try, so Claude wrote the docs and
  opened the PR first, then created the [Newton board](https://github.com/orgs/heynewton/projects/1)
  once the scope came through: Status columns Inbox, Ready, In progress, In review, Done, with
  #3 to #16 in Ready in priority order and this PR in review.

**Pull request:** [#17](https://github.com/heynewton/newton/pull/17)
