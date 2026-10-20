## Release to production without a click, unless migrations are pending

**Prompt**

Started by another Claude Code session, which wrote (its background paragraph on the project is
left out):

````text
Build issue #120, "Release to production automatically on merge, with approval only when migrations are pending". Read the issue, production.yml, docs/process.md (Production) and docs/tokens.md, from up-to-date origin/main.

- Split the workflow so a first job (in the `production` environment, which keeps the prod secrets but loses its required reviewer) runs the existing prod-settings checks and lists the migrations newton-prod hasn't applied, writing them to the run summary and an output.
- A gate job in a new environment (for example `production-migrations`, maintainer as required reviewer, no secrets, branch policy main only) runs only when migrations are pending. The release job (environment `production`) runs after the check, and after the gate when it ran (`always()` with success-or-skipped), then applies migrations, deploys and checks fixture sign-in, as today.
- Keep every existing guard, keep prod secrets usable only from main, and never release from PRs or other branches.
- Docs: docs/process.md (Production) and docs/tokens.md: how releases work now, what to look at when approving, and how to switch back to approving every release (re-add the reviewer on `production`), with that switch-back added as a step before sign-up opens to outsiders or an app-store release. Add your build-log and history files.
- The maintainer's settings checklist in the PR description: create `production-migrations` with themself as required reviewer and branch policy main only; then, only after this PR merges, remove the required reviewer from `production` (keeping its branch policy). In that order, so there's never a moment when migrations release without a gate.
- Test what you can before merge (actionlint; the job graph with a dry-run or a reasoning walk-through of both paths). After merge, the first real release proves the no-migration path; say how the migration path will be proven (the next PR with a migration, or a harmless test migration if the maintainer wants one).

Open the PR with `Closes #120` and stop; report the link, the maintainer's checklist and what was and wasn't tested.
````

**What Claude did**

- Split `production.yml` into three jobs: `check` (environment `production`: the prod settings
  checks, then the migrations `newton-prod` hasn't applied, as a job output and in the run
  summary with links to each file), `gate` (environment `production-migrations`, no secrets,
  only when that list isn't empty) and `release` (environment `production`: migrations, deploy,
  the FIXTURE_SIGN_IN and NOINDEX checks and the fixture sign-in 404 check, as before).
- Wrote `.github/scripts/pending-migrations.sh`, which reads `supabase migration list
  --output-format json` and fails closed: a checked-in migration counts as pending unless the
  database lists it as applied, and an unreadable listing or a version applied on the database
  but missing from the repo stops the run.
- The release job runs if the check succeeded and the gate either succeeded or was skipped with
  zero pending migrations. It uses `!cancelled()` rather than `always()`, because `always()`
  would let a cancelled run release. Before `db push` it lists the pending migrations again
  and stops if they differ from what the check listed (and the gate approved).
- Updated `docs/process.md` (Production), `docs/tokens.md` (steps 7 and 8 of the prod setup:
  the order for the settings change, and approving every release again before outsiders sign
  up or an app-store release) and `docs/architecture.md`.
- Ran actionlint (with shellcheck) on the workflow and shellcheck on the script, and ran the
  script against a local database with some migrations applied, all applied, an unreachable
  database and a missing migration file.

**What changed along the way**

- The prompt suggested `always()` for the release job; it uses `!cancelled()` instead, for the
  reason above.
- Re-adding the reviewer on `production` makes both the check and the release jobs wait, so
  approving every release takes two clicks (three with migrations). The docs say so.

**Pull request:** [#121](https://github.com/heynewton/newton/pull/121)
