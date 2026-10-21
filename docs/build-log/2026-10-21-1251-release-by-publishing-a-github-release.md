## Release to production only by publishing a GitHub Release, with drafted notes

**Prompt**

Started by another Claude Code session, which wrote (its background paragraph on the project is
left out):

````text
Build issues #163 ("Release to production only by publishing a GitHub Release") and #164 ("Draft release notes from the history files") together, as one PR that says `Closes #163` and `Closes #164` (they must land together: without #164 there's no easy way to release, and without #163 the notes have nothing to trigger). Read both issues, production.yml, the pending-migrations script, the history files and docs/process.md, docs/tokens.md, docs/maintainers.md and CLAUDE.md.

#163: production.yml runs on `release: published` (plus `workflow_dispatch` with a tag input for re-runs), never on merges. It checks out the release tag, refuses a tag whose commit isn't on main or didn't pass on dev (the Dev database workflow and the Deploy run on main succeeded for that commit; check with the REST API), keeps every existing guard and the pending-migrations listing (now in the run summary and as information, not a gate), and removes the `production-migrations` gate job. Docs: merge = dev, release = prod; how to release, roll back (re-publish an older tag: code only, migrations don't roll back) and hotfix; weekly planning looks at unreleased changes; update CLAUDE.md's workflow section.

#164: a script (for example `npm run release-notes -- [--to <sha>]`) that finds the last release tag, lists PRs merged on main since then up to the target commit (from the history files and git), and writes notes with What's new (user-visible topics), Under the hood (process, repo and infrastructure topics), Database changes (new files in supabase/migrations/ in the range, with a line that they can't be undone) and links to PRs and closed issues; it computes the next calendar tag and, with a flag, creates a draft GitHub Release via the REST API (never published). Unit-test the range, grouping and tag logic. Add the CLAUDE.md rule: when a maintainer says "release", Claude drafts it, checks the commit passed on dev, tidies the wording and hands over the link; publishing is the maintainer's.

There are no release tags yet: make the first draft cover everything since production's last deployment (or since a given commit) and say how you chose that. Run actionlint and npm run check. Add build-log and history files. Open the PR and stop; in the description, list the maintainer's steps after merge (for example delete the `production-migrations` environment, confirm `production`'s branch policy allows tags created from main, close #122) and what wasn't tested. Report the PR link.
````

**What Claude did**

- Rewrote `production.yml` around `release: published` and `workflow_dispatch` with a `tag`
  input. A `verify` job without secrets runs the new `scripts/release-check.mjs`, which refuses
  the tag unless it:
  - is a calendar tag;
  - has a published GitHub Release that isn't a prerelease;
  - points at a commit that is on `main` (REST `compare`);
  - points at a commit that passed on dev. That means Dev database succeeded on the commit, and
    Deploy succeeded on the last commit up to it that touched the app's paths, which are read
    from `deploy.yml`. Docs-only merges have no Deploy run.

  The `release` job keeps every prod guard. It lists pending migrations in the run summary as
  information, then migrates and deploys the commit `verify` checked. The `production-migrations`
  gate is gone.
- Wrote `scripts/release-lib.mjs` and `npm run release-notes`. The notes cover the PRs merged on
  main's first-parent history after the newest calendar tag, each read from its history file at
  the target. They're grouped into What's new and Under the hood by a new `release` field on each
  topic in `topics.json`. Database changes lists the migrations added in the range. The next tag
  is computed from the date, and `--create` checks dev, then creates or updates a single **draft**
  release through the REST API.
- First draft: with no tag yet, the range starts at the commit of the `production` environment's
  newest successful deployment, from the Deployments API. Today that is `5b801c2`, the last
  release under #120. `--from` overrides it.
- Added `node:test` tests for the tags, the PR detection and grouping, the notes and the
  `deploy.yml` parsing, plus the range and migrations in a temporary git repo with tags. They're
  wired into `npm test` and `test:coverage`, so CI runs them.
- Updated `docs/process.md`, `docs/tokens.md` (new step 7 with the maintainer's steps, step 8
  reworded), `docs/maintainers.md`, `docs/architecture.md`, `CLAUDE.md` and
  `docs/history/README.md`.
- Ran actionlint with shellcheck and `npm run check`. Ran the dev check against real runs and the
  notes on the real history: all 81 PRs with history files, and 11 migrations.

**What changed along the way**

- Rollback: the prompt said to re-publish an older tag. A release event runs the workflow file
  *at that tag*, and a published release can't simply be published again, so rollback is **Run
  workflow** on `main` with the older tag. `pending-migrations.sh` also failed whenever the
  database had migrations the commit lacks, which a rollback always has. With `NEWER_FILE` set,
  it now lists those instead of failing. The workflow then skips `db push` and deploys only the
  code.
- The environment's branch policy can't express "tags created from main": GitHub matches ref
  names. So the PR asks for a `20*` tag rule on `production` plus a tag ruleset that lets only
  admins create release tags. The workflow's own on-main check covers where the tag points.
- #120's step 8 (a required reviewer before outsiders sign up) is reworded as optional, now that
  every release is a maintainer's publish. It's left as a question in the PR.

**Pull request:** [#167](https://github.com/heynewton/newton/pull/167)
