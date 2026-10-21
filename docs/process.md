# How we work

Newton is built by a very small team. The process is light Kanban with a weekly beat: the
rules in [CLAUDE.md](../CLAUDE.md#workflow) say how a change lands, and this page says who
decides what and when.

## Roles

| Who | Role | Does |
| --- | --- | --- |
| Maintainers | Product owners | Order the backlog, make product calls, review and merge. Merging is acceptance. See the [maintainer brief](maintainers.md). |
| Claude (Claude Code) | Dev team | Turns ideas into issues, writes the code, opens PRs, keeps the board and build log current, flags blockers. |
| Contributors | Reviewers and builders | Review PRs in the areas they care about, try Newton on their own boats, pick up `help wanted` issues. |

Claude writes code faster than anyone can review it, so review time is the bottleneck. The
process is built to keep that time well spent: small PRs, clear "Done when" checklists, and
explicit "what was not tested" notes.

## The board

The [Newton project board](https://github.com/orgs/heynewton/projects/1/views/5) (Kanban view) has five columns:

**Inbox → Ready → In progress → In review → Done**

- **Inbox**: new issues nobody has looked at yet.
- **Ready**: issues ready to start, **in priority order**. The top one is next. There are no
  priority labels; the order is the priority.
- **In progress**: issues someone (or a Claude session) is working on now.
- **In review**: a PR is open and waiting for review.
- **Done**: merged.

The Kanban view shows each piece of work once: every issue, plus every PR that closes no issue
(a docs fix, a follow-up). A PR that closes an issue is hidden there, because its issue's card
already shows the work and links the PR. That's the project's `Kanban` field: `Hidden` for those
PRs, empty for everything else, and the view filters on `-kanban:Hidden`. The **All items** view
shows everything.

### Cards move by themselves

A GitHub Actions workflow (`.github/workflows/board.yml`) moves cards when issues and PRs change:

| When | The card moves to |
| --- | --- |
| An issue is opened | the board, in **Inbox** |
| An issue in Inbox or Ready is assigned | **In progress** |
| A draft PR is opened, or a PR goes back to draft | its issues: **In progress** |
| A PR is opened or marked ready for review | the PR and the issues it closes (`Closes #N`): **In review**. The PR is hidden on Kanban if it closes an issue |
| A PR is merged, or an issue is closed | **Done** |
| A PR is closed without merging | its open issues: back to **Ready** |
| An issue is reopened | **Ready** |

Editing a PR that is already merged or closed doesn't move its card.

Two moves stay manual, because they are product decisions: Inbox → Ready (triage), and the order
of the Ready column. PRs from forks don't move cards, because forks can't read the
`PROJECT_TOKEN` repo secret the workflow uses. That secret is a fine-grained token with
Projects read and write on `heynewton` and read access to this repo's issues and PRs. It expires:
regenerate it before the date on the token and update the secret, or cards stop moving.

**Who can move cards by hand.** People can, on the board. Local Claude sessions (on a
maintainer's machine) can too, with `gh project item-edit`. Cloud sessions can't: their GitHub
proxy rejects GraphQL whatever the token, and Projects only has a GraphQL API (see
[GitHub proxy](https://code.claude.com/docs/en/cloud-environments) in the Claude Code docs). A
cloud session lets the workflow move cards: it assigns the issue to start it and opens the PR
with `Closes #N`.

### Ideas before issues

Feature ideas start in the **Feature ideas** section of the spec ([Newton — Product & Architecture
Spec](https://docs.google.com/document/d/19byJe41PNjezQD93sBnIgbE90bdVzTzWd5ptSrVg5yU/edit) in the team Google Drive), grouped by phase, with their open questions next to them. They
are not filed as issues yet, so the board only holds work we expect to start soon.

At weekly planning, when a phase is getting close, its ideas are split into PR-sized issues
(after checking for duplicates). Each new issue links back to the idea, and the idea names its
issue.

### Definition of Ready

An issue moves to Ready when it has:

- an area label and a milestone,
- a short "Done when" checklist,
- its blockers listed ("Blocked by: #N"),
- the fake data it needs named (see `fixtures/`).

### Definition of Done

- Tests, lint and type checks pass in CI.
- Any number Newton reports is covered by a unit test. `packages/calc` keeps at least 95% line
  and branch coverage, or CI fails; each PR gets a coverage comment per workspace.
- The PR says what was tested and what was not.
- No real boat data, personal information or secrets in the diff.
- A build-log entry in [build-log/](build-log/) and a history file in [history/](history/), both new files.
- Merged into `main` (squash merge).

## Previews

Every PR from a branch in this repo gets a running copy of the web app. Look for
"This branch was successfully deployed" on the PR and click **View deployment**. Merges to `main`
update the dev site (the `dev` environment, under **Deployments** on the repo page).

- The deploy runs in GitHub Actions (`.github/workflows/deploy.yml`). Its only link to Vercel is
  the `VERCEL_TOKEN` repo secret, created on the project's Vercel account (not a personal one).
- Previews only ever use fake data from `fixtures/`, so they are public to anyone with the link.
- Previews and the dev site sign in against the dev database, `newton-dev` (#62). The workflow
  passes its URL and publishable key from the repo variables `SUPABASE_DEV_URL` and
  `SUPABASE_DEV_PUBLISHABLE_KEY` to the build and, with `vercel deploy --env`, to the running site;
  nothing is set in the Vercel dashboard. It refuses any key that isn't `sb_publishable_…`. A team
  member can sign in on a preview with an email link and make a test boat; it lands in `newton-dev`.
- The email link comes back to the site it was asked from: the sign-in action sends that site's
  origin, and `newton-dev`'s Auth URL configuration allows the dev site and every preview URL
  (`https://heynewton-*-hey-newton.vercel.app/**`). A URL that isn't allowed falls back to the dev
  site, where the link shows as expired. If a new kind of preview URL appears, add it there.
- PRs from forks get no preview, because forks can't read repo secrets.
- Only changes that can alter the site deploy: `apps/web/`, `packages/`, the root `package.json`,
  `package-lock.json`, `.nvmrc` and the workflow itself. A PR that only touches docs, `supabase/`
  or other workflows gets no preview and no Deploy check, and merging it leaves the dev site as is.
- Vercel's free plan allows 5,000 uploaded files a day. Deploys upload the build as one archive
  (`--archive=tgz`) to stay well under it. If a deploy fails with "Too many requests ...
  api-upload-free", the limit was hit anyway: previews and the dev site pause until it resets
  (24 hours). Deploy isn't a required check, so that failure doesn't block merging.
- The dev site is at https://dev.heynewton.app (#106; https://heynewton-web.vercel.app still
  works). [heynewton.app](https://heynewton.app) serves production (see Production below) since
  #37, so previews and dev never share a URL or a database with real boat data. Fixture sign-in
  and sample data are on the dev site, never on heynewton.app. The dev site and previews send
  `X-Robots-Tag: noindex` (`NOINDEX=1` in the deploy workflow), so search engines only list
  heynewton.app.

## Dev database

- The hosted Supabase project `newton-dev`, in the project's Supabase organisation, is the dev
  database. It only ever holds fixture data: the made-up boat Test boat from `fixtures/sample-boat`,
  and whatever is made while testing. Never put real boat data in it.
- Every push to `main` updates it (`.github/workflows/dev-database.yml`): `supabase db push` applies
  new migrations, then `psql` loads `supabase/seed.sql`. The seed runs every time, so Test boat's
  rows go back to what `boat.json` says; other rows stay. A failed migration or seed fails the run
  and shows on the commit. Re-run it from the Actions tab (**Run workflow**).
- PRs that touch `supabase/` or `fixtures/sample-boat/` get a **Dry run against dev** check: it
  lists the migrations that would apply and, when there are none, loads the seed and rolls it back.
  It changes nothing in dev. PRs from forks skip it, since they get no secrets.
- The local stack (`npm run db:start`) exposes new tables to `anon`, `authenticated` and
  `service_role` automatically; the hosted projects don't. A migration that forgets its `grant`
  passes the local tests and then fails on dev, so every migration revokes and grants explicitly.
- Its tokens and settings are in [tokens.md](tokens.md).

## Production

Production is the Supabase project `newton-prod` and the Vercel project `heynewton-prod`, at
[heynewton.app](https://heynewton.app) since #37 (`www` redirects to it; DNS on Cloudflare points at
Vercel with the proxy off). It is where real boat data lives, so it is never seeded and nothing on
dev or previews holds its keys. Its Auth URL configuration allows only `https://heynewton.app`, so a
sign-in link always comes back there.

**Merge = dev, release = prod** (#163). A merge to `main` updates the dev site and `newton-dev`,
never production. Production moves only when a maintainer publishes a GitHub Release.

- **Release path.** PR → its own preview. Merge → the Dev database workflow migrates and seeds
  `newton-dev`, and Deploy updates the dev site. Release → a maintainer publishes a GitHub Release
  on a commit of `main`, and its `release: published` event starts the **Production** workflow
  (`.github/workflows/production.yml`) on the release's tag. Its first job (no secrets) refuses
  the tag unless it is a calendar tag with a published release that isn't a prerelease, on a
  commit that is on `main` and **passed on dev**: the Dev database workflow succeeded on that
  commit, and Deploy succeeded on the last commit up to it that changed the app
  (`scripts/release-check.mjs`, through the REST API). Then the release job (environment
  `production`) checks the prod settings, lists the migrations `newton-prod` hasn't applied in the
  run summary, applies them (migrations only, no seed) and deploys the web app to
  `heynewton-prod`. Publishing is the approval: there is no other click.
- **Versions** are calendar tags: `2026.10.21`, then `2026.10.21.2` for a second release the same
  day. Each release's notes say what changed since the last one, with **What's new**, **Under the
  hood** and **Database changes** (the migrations it applies, which can't be undone).
- **How to release.** Say "release" to Claude (or run it yourself):
  1. `npm run release-notes -- --create` (optionally `--to <sha>`; default `origin/main`) checks
     that the commit passed on dev, drafts the notes from `docs/history/` and saves them as a
     **draft** release with the next tag. It never publishes. An existing draft is updated rather
     than duplicated.
  2. Claude tidies the wording (the script's lines are the PRs' history summaries) and hands over
     the draft's link.
  3. The maintainer reads it, above all **Database changes**: is each migration safe on data
     that already exists? Dev's seed resets its rows, prod's don't, and a dropped or rewritten
     column can't be undone. Then **Publish release**. The Production run appears under Actions;
     the release lists its migrations again in the run summary.
- **What a draft covers.** Everything merged on `main` after the newest release tag, up to the
  target commit. Before the first tag, everything after the commit production last deployed
  (its latest successful deployment to the `production` environment). `--from <ref>` overrides
  either. Without `--create` the script only prints the notes, which is also how to see what is
  waiting to be released.
- **Roll back.** Actions → **Production** → **Run workflow** on `main`, with the earlier tag. It
  checks that tag as above and redeploys its code. **Migrations don't roll back:** the run summary
  lists the ones `newton-prod` has that the older tag doesn't, they stay applied, and the old code
  runs against the newer schema. So a release with a migration needs a fix forward rather than a
  rollback, unless its migration only added things the old code ignores. The workflow refuses a
  tag that is both older than prod and has migrations prod hasn't applied.
- **Hotfix.** There are no release branches: fix on a branch, merge to `main` as usual, let dev
  pass, then release `main` (or the fix's own commit with `--to <sha>`, to leave out anything merged
  since). The next day's tag, or `.2` the same day.
- **A failed release** leaves prod as it was, or with the migrations applied and the old app if
  it failed after them. To retry the same tag: Actions → the run → **Re-run all jobs**, or **Run
  workflow** with that tag. If the release itself was wrong, fix on `main` and release again.
- **Releases queue:** one at a time; a newer one waiting replaces an older one in the queue.
- **Fixture sign-in is never on:** the workflow fails if `FIXTURE_SIGN_IN` is set anywhere for
  production, and after deploying checks that `/auth/fixture-sign-in` answers 404.
- **Email-in and reminders** run on prod from the `heynewton-prod` project's own env vars: its
  own Resend webhook and keys, `newton-prod`'s secret key and its own `CRON_SECRET`
  ([tokens.md](tokens.md#production)). Vercel Cron calls `/api/reminders` on prod daily, as on dev.
- **The `production` environment** holds every prod value: the Supabase access token and database
  password (secrets), the project ref, URL, publishable key and site URL (variables). Its
  deployment policy allows `main` (for **Run workflow**) and release tags (`20*`), and it has no
  required reviewer: publishing the release is the approval. A tag ruleset lets only maintainers
  create release tags, so only they can publish a release (step 7 of the
  [prod setup checklist](tokens.md#production)). Any workflow on `main` could use the
  prod keys without a click, so a PR that adds one to the `production` environment needs the same
  care as one that changes `production.yml`.
- **Who can release.** Since #163 a maintainer decides every release, and the release notes show
  what goes out, so the step 8 switch of #120 (a required reviewer on `production` before
  outsiders sign up) is no longer needed. A required reviewer can still be added for a second pair
  of eyes; the release job then waits for it after the tag checks.
- **Setup** (once, by the maintainer): the checklist in [tokens.md](tokens.md#production).

## Rhythm

| When | What | Who |
| --- | --- | --- |
| Weekly, ~15 min | **Planning**: order the top of Ready; refine those issues; turn ideas for the next phase into issues; look at what is merged but not released (`npm run release-notes`) and decide whether to release. | Maintainers, Claude |
| Continuously | **Flow**: take the top unblocked Ready issue, ship it with the `ship-change` skill. | Claude, contributors |
| Weekly | **Review**: demo what merged, on real boat data kept locally. A short update to contributors, based on the build log. | Maintainers, contributors |
| Monthly | **Retro**: what slowed us down, what broke, what to change. Changes go into CLAUDE.md or the skill. | Everyone |

### Overnight work

Work that runs while nobody is watching (overnight, or "while I'm away") starts as **cloud sessions**
(Claude Code on the web), never as sessions on a maintainer's machine. A local session stops when the
machine sleeps, its lid closes or it loses its network, and it competes with the maintainer's own use of it.

Each overnight session:

- picks an issue that needs no account, key or dashboard step and no product decision;
- is assigned to its issue and opens a PR with `Closes #N`, so the Board workflow moves its cards
  (cloud sessions can't reach the board themselves);
- relies on CI for the database tests (the `database` job), since the local Supabase stack may not
  run in the cloud;
- opens a PR and stops: no merges and no releases (a merge updates dev; a release is the
  maintainer's);
- writes any decision only a maintainer can make as a question in its PR, picks the safest default
  and carries on.

The maintainer reviews the PRs in the morning.

## Order of work

From [CLAUDE.md](../CLAUDE.md#issues-are-the-todo-list): first what is blocked by nothing, then
what unblocks other work, then small steps toward users.
