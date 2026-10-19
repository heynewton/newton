## PRs without an issue show on the Kanban board

**Prompt**

````text
why is pr 100 not captured by project kaban? it's a pr that is green. should be in review no? looks like gh project automation can be improved
````

Then, after Claude proposed a field to fix it:

````text
Do the field approach: add the field, update the Board workflow to set it, and create the new Kanban view; I'll delete the old one.
````

**What Claude did**

- Found that #100 was on the board, in In review, as the automation intended. The Kanban view
  showed issues only (`is:issue`) so each piece of work appeared once, and #100 closes no issue,
  so nothing on Kanban stood for it.
- Added a `Kanban` single-select field to the project with one option, `Hidden`, and set it on
  the 33 PR cards that close an issue. The 16 PRs that close none stay visible.
- Created a new Kanban view (view 5) filtered on `-kanban:Hidden`: issues plus PRs without an
  issue. The maintainer deletes the old view 4.
- `.github/scripts/board.sh` sets the field whenever a PR opens, changes or closes: `Hidden` if it
  closes an issue, cleared if not.
- `docs/process.md` links the new view and explains the field.
- Filed [#101](https://github.com/heynewton/newton/issues/101) for this.

**What changed along the way**

- Testing the script locally with a simulated "edited" event on #98, which was already merged,
  moved its card from Done back to In review. Editing a merged PR's description would have done
  the same. Claude put #98 back in Done, and the script now leaves the cards of merged or closed
  PRs where they are.
- #100 merged while this was being built, and the automation moved it to Done, where the new view
  shows it.

**Pull request:** see this PR's history file in `docs/history/`.
