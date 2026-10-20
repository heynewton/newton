## Overnight work runs in the cloud

**Prompt**

````text
overnight work should always run on cloud update claude and /docs
````

**What Claude did**

- Added the rule to `CLAUDE.md` (Workflow) and a new "Overnight work" section to `docs/process.md`.
  Unattended work starts as cloud sessions, never on a maintainer's machine. Each one picks an issue
  that needs no account step or product decision, opens a PR with `Closes #N` so the Board workflow
  moves its cards, relies on CI's `database` job for database tests, never merges, and leaves
  maintainer decisions as questions in its PR.
- Saved the rule to Claude's memory, so it applies to future overnight batches.

**What changed along the way**

- The night before, five overnight sessions (#11, #16, #115, #117, #118) had been started locally,
  on the maintainer's Mac. While this change was being written, the Mac lost DNS: GitHub was
  unreachable even though the network was up. That stalls local sessions, and is the case this rule
  avoids. This PR was prepared offline from the last fetched `main` and pushed once DNS came back.

**Pull request:** see this PR's history file in `docs/history/`.
