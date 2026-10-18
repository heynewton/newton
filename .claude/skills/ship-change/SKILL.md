---
name: ship-change
description: The checklist for landing any change in this repo, from branch to PR to build-log entry. Use when finishing a change, before opening or updating a pull request.
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(gh pr view *) Bash(gh pr list *) Bash(gh issue list *) Bash(npm run *) Bash(npm test *)
---

# Ship a change

## 1. Branch
- If the change belongs to an open PR on the same topic (`gh pr list`), add it there; otherwise
  start a new branch from an up-to-date `main` (`git fetch && git checkout -b <topic> origin/main`).
- Branch names: `<type>/<topic>`, for example `feat/email-in`, `fix/cost-split-rounding`, `docs/readme`.
- Never commit to `main` directly. It is protected; every change lands through a PR.

## 2. Build and check
- From the repo root: `npm run check` (lint, type check, tests in every workspace), then
  `npm run build`. CI runs the same steps on every PR.
- New workspace packages go under `apps/` or `packages/` and define the `lint`, `typecheck`
  and `test` scripts they need, so the root commands pick them up.
- Any number Newton reports (tides, bearings, angles, dates, cost splits) needs a unit test.
- Check the change in the running app, not just in the tests. For docs-only changes, check the
  Markdown renders on GitHub.
- Check the diff for real boat data, personal info and secrets: the repo is public.

## 3. Commit
- Stage files by name. Don't use `git add -A`, because it can pick up untracked local files.
- Commit message: what changed and why.

## 4. Pull request
- Open it against `main`. If it fixes an issue, the body says `Closes #N`.
- The title says what the user gets. The body covers what changed, why, what was tested, and
  what wasn't (be explicit about anything that couldn't be tested).
- When adding to an existing PR, update its title and description to match.

## 5. Build log
Add an entry to `docs/build-log.md` for the request, following the existing format: the prompt
word for word (lightly cleaned where privacy needs it, with replaced text in [brackets]), what
Claude did, what changed along the way, and the PR link. Commit it to the same PR.
