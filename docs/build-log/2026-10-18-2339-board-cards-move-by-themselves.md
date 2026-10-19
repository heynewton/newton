## Board cards move by themselves

**Prompt**

````text
can you improve the gh project workflow so that the cards move when the PR is created and merged?
````

**What Claude did**

- Filed [#49](https://github.com/heynewton/newton/issues/49) and checked the board's built-in
  workflows. All of them except "Auto-add sub-issues" were off, including "Item closed" and
  "Pull request merged", which is why cards kept getting stuck.
- Added `.github/workflows/board.yml` and `.github/scripts/board.sh`:
  - Opening a PR moves it and the issues it closes to In review; a draft moves them to In progress.
  - Merging moves them to Done. A PR closed without merging sends its issues back to Ready.
  - New issues land in Inbox, and assigning one moves it to In progress.
- Added a "Cards move by themselves" section to `docs/process.md`.

**What changed along the way**

- The built-in workflows can only be switched on in the GitHub UI and can't move an issue when its
  PR opens, so the workflow handles every move itself. It doesn't depend on the built-ins.
- `GITHUB_TOKEN` can't write to an organisation's project, so the workflow needs a `PROJECT_TOKEN`
  secret.
- Claude first said the same token could go in the cloud environment for #24. The Claude Code docs
  say the cloud sessions' GitHub proxy blocks GraphQL (which Projects v2 needs) whatever the token,
  so that can't work. This workflow is how cards move when a cloud session opens or merges a PR.
  Claude noted this on #24.
- The workflow uses `pull_request`, not `pull_request_target`, so it runs from the PR's own branch
  and could be tested on this PR before merging. Forks don't get secrets, so their cards stay manual.
- Claude tested the script locally against the real board on cases that shouldn't move anything
  (#49 assigned while already In progress, #4 closed while already Done).

**Pull request:** [#50](https://github.com/heynewton/newton/pull/50)
