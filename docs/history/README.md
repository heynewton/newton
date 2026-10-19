# History entries

One file per merged PR. [`docs/history.md`](../history.md) is built from them by
`npm run history` (`scripts/history.mjs`), grouped by phase and topic and sorted by merge time.
Because each PR adds its own file, PRs that are open at the same time never conflict over the
history.

## Adding a PR

Each PR adds `docs/history/pr-NNNN.md`, with its number padded to four digits (for example
`pr-0089.md`), once the PR is open and has a number:

```text
pr: 89
phase: Phase 1: Home side
topic: How we work
closes: 89
summary: Build log and history entries that don't conflict between open PRs
```

- `phase` and `topic` must match an entry in [`topics.json`](topics.json); the script stops with
  the list of valid ones if they don't. A new topic is added to `topics.json` in the same PR,
  with a one-line description.
- `closes` lists the issues the PR closes, separated by commas. Leave the line out if it closes none.
- `summary` says what the PR gave us, in a few words, usually close to its title.
- `merged` is optional: without it, the script uses the time the file landed on `main`, which is
  the PR's merge time with squash merges. The entries from before #89 have it filled in.

PRs don't edit `docs/history.md`. After every merge that adds or changes a file here, the History
workflow (`.github/workflows/history.yml`) runs the script and commits the page straight to `main`
as the `heynewton-history` GitHub App, the only bypass on the "Protect main" ruleset (setup in
[`docs/tokens.md`](../tokens.md)). To rebuild it by hand, run the workflow from the Actions tab.
`npm run history` writes it locally to preview your entry; don't commit that.

## What's next

[`whats-next.md`](whats-next.md) is the hand-written "What's next" section at the end of the
page: the open issues grouped by what they deliver. Update it at weekly planning, not in feature PRs.
