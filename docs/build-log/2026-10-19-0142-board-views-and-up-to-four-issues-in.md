## Board views, and up to four issues in progress

**Prompt**

````text
could you change the board design to something easier to visualize? propose a way to group, maybe with columns or whatever is standard for board design. But I find the current table view not easy to follow
````

Then:

````text
I've decided to allow max 4 in progress at a time.
updated on gh, reflect in /docs/
````

**What Claude did**

- Added two views to the project board through GitHub's REST API:
  - **Kanban**: issue cards in Status columns, showing the area label, phase, linked PR and
    assignee. PRs are left out because they already show on the issue they close.
  - **By phase**: open issues grouped by milestone and sorted by status, for planning.
- Changed the work-in-progress limit from two to four in `docs/process.md`, `CLAUDE.md` and
  `CONTRIBUTING.md`, so all three agree with the column limit the maintainer set on the board.
  `docs/process.md` now links straight to the Kanban view.

**What changed along the way**

- The API can create views but can't edit or delete them. A first board view came out without
  labels or phase on its cards, so Claude created a corrected "Kanban" view. The maintainer
  deleted the first one, renamed the original table to "All items", moved Kanban to the first tab
  and set the column limit in the GitHub UI.
- The limit also appeared in `CLAUDE.md` and `CONTRIBUTING.md`, outside `docs/`, so Claude updated
  them in the same PR so the rules don't contradict each other.
- The main folder had another session's branch checked out, so Claude made this change in a
  separate git worktree.

**Pull request:** [#44](https://github.com/heynewton/newton/pull/44)
