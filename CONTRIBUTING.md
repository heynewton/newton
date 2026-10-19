# Contributing to Newton

Thanks for helping out. Newton is early (Phase 1), so the rules are short.

## Workflow

- `main` is protected. Every change goes through a pull request; never push to `main` directly.
- Create a branch from `main` (for example `feat/email-in`, `fix/cost-split-rounding`,
  `docs/readme`), keep the PR focused, and describe what changed and why.
- Follow the [principles in the README](README.md#principles). In particular, any number
  Newton reports (tides, bearings, angles, dates, cost splits) must come from a
  deterministic, tested function, not from the model.

## Picking up work

- How we plan and who decides what is in [docs/process.md](docs/process.md).
- Open issues are the todo list. Issues labelled `help wanted` or `good first issue` are a good
  place to start. Each one has a "Done when" checklist; check its "Blocked by" line first.
- Assign yourself before you start, so two people don't build the same thing. At most four
  issues are in progress across the team.
- The PR says `Closes #N`, and lists what you tested and what you didn't.

## Reviewing

- Reviews are welcome on any PR. They are not required to merge; a maintainer merges
  (see the [maintainer brief](docs/maintainers.md)).
- Open review threads must be resolved before merging, so a comment is a real stop sign. Use a
  "nit:" prefix for comments that shouldn't block.
- PRs are squash-merged into `main`.

## Data and secrets

The repo is public and AGPL-3.0: assume anything you commit is visible to everyone, forever.

- **No real boat data.** No contracts, insurance documents, receipts, polars or personal
  information. Use fake sample data in `fixtures/`.
- **No secrets.** API keys and credentials go in `.env`, which is git-ignored. Secret
  scanning and push protection are enabled; if you commit a secret by mistake, rotate it
  immediately, because removing it from history is not enough.

## License

By contributing, you agree that your contributions are licensed under the
[AGPL-3.0](LICENSE).
