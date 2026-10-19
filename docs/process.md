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

The [Newton project board](https://github.com/orgs/heynewton/projects/1/views/4) (Kanban view) has five columns:

**Inbox → Ready → In progress → In review → Done**

- **Inbox**: new issues nobody has looked at yet.
- **Ready**: issues ready to start, **in priority order**. The top one is next. There are no
  priority labels; the order is the priority.
- **In progress**: issues someone (or a Claude session) is working on now.
- **In review**: a PR is open and waiting for review.
- **Done**: merged.

### Cards move by themselves

A GitHub Actions workflow (`.github/workflows/board.yml`) moves cards when issues and PRs change:

| When | The card moves to |
| --- | --- |
| An issue is opened | the board, in **Inbox** |
| An issue in Inbox or Ready is assigned | **In progress** |
| A draft PR is opened, or a PR goes back to draft | its issues: **In progress** |
| A PR is opened or marked ready for review | the PR and the issues it closes (`Closes #N`): **In review** |
| A PR is merged, or an issue is closed | **Done** |
| A PR is closed without merging | its open issues: back to **Ready** |
| An issue is reopened | **Ready** |

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
- An entry in [build-log.md](build-log.md).
- Merged into `main` (squash merge).

## Previews

Every PR from a branch in this repo gets a running copy of the web app. Look for
"This branch was successfully deployed" on the PR and click **View deployment**. Merges to `main`
update the dev site (the `dev` environment, under **Deployments** on the repo page).

- The deploy runs in GitHub Actions (`.github/workflows/deploy.yml`). Its only link to Vercel is
  the `VERCEL_TOKEN` repo secret, created on the project's Vercel account (not a personal one).
- Previews only ever use fake data from `fixtures/`, so they are public to anyone with the link.
- PRs from forks get no preview, because forks can't read repo secrets.
- Only changes that can alter the site deploy: `apps/web/`, `packages/`, the root `package.json`,
  `package-lock.json`, `.nvmrc` and the workflow itself. A PR that only touches docs, `supabase/`
  or other workflows gets no preview and no Deploy check, and merging it leaves the dev site as is.
- Vercel's free plan allows 5,000 uploaded files a day. Deploys upload the build as one archive
  (`--archive=tgz`) to stay well under it. If a deploy fails with "Too many requests ...
  api-upload-free", the limit was hit anyway: previews and the dev site pause until it resets
  (24 hours). Deploy isn't a required check, so that failure doesn't block merging.
- [heynewton.app](https://heynewton.app) currently serves the dev site: `www` redirects to it, and the
  DNS records on Cloudflare point at Vercel with the proxy off. That is fine while the site is static
  pages with no data. Still in Phase 1, before the first real boat data arrives or anyone outside
  the team signs in, the domain moves to a production project with its own Supabase, so previews
  and dev never share a URL or a database with real boat data (#37).

## Dev database

- The hosted Supabase project `newton-dev`, in the project's Supabase organisation, is the dev
  database. It only ever holds fixture data: the made-up boat Kittiwake from `fixtures/sample-boat`,
  and whatever is made while testing. Never put real boat data in it.
- Every push to `main` updates it (`.github/workflows/dev-database.yml`): `supabase db push` applies
  new migrations, then `psql` loads `supabase/seed.sql`. The seed runs every time, so Kittiwake's
  rows go back to what `boat.json` says; other rows stay. A failed migration or seed fails the run
  and shows on the commit. Re-run it from the Actions tab (**Run workflow**).
- PRs that touch `supabase/` or `fixtures/sample-boat/` get a **Dry run against dev** check: it
  lists the migrations that would apply and, when there are none, loads the seed and rolls it back.
  It changes nothing in dev. PRs from forks skip it, since they get no secrets.
- The local stack (`npm run db:start`) exposes new tables to `anon`, `authenticated` and
  `service_role` automatically; the hosted projects don't. A migration that forgets its `grant`
  passes the local tests and then fails on dev, so every migration revokes and grants explicitly.
- Its tokens and settings are in [tokens.md](tokens.md).

## Rhythm

| When | What | Who |
| --- | --- | --- |
| Weekly, ~15 min | **Planning**: order the top of Ready; refine those issues; turn ideas for the next phase into issues. | Maintainers, Claude |
| Continuously | **Flow**: take the top unblocked Ready issue, ship it with the `ship-change` skill. | Claude, contributors |
| Weekly | **Review**: demo what merged, on real boat data kept locally. A short update to contributors, based on the build log. | Maintainers, contributors |
| Monthly | **Retro**: what slowed us down, what broke, what to change. Changes go into CLAUDE.md or the skill. | Everyone |

## Order of work

From [CLAUDE.md](../CLAUDE.md#issues-are-the-todo-list): first what is blocked by nothing, then
what unblocks other work, then small steps toward users.
