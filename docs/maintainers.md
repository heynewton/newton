# Maintainer brief

For people who maintain Newton, not just contribute to it. Read [CONTRIBUTING.md](../CONTRIBUTING.md),
[CLAUDE.md](../CLAUDE.md) and [process.md](process.md) first; this page covers only what a
maintainer does on top of that.

## What's different from contributing

| | Contributor | Maintainer |
| --- | --- | --- |
| Pull requests | Opens them, reviews them | Also merges them. Merging is acceptance. |
| Backlog | Picks up `help wanted` issues | Triages the Inbox, orders Ready, sets milestones |
| Product | Suggests | Makes the call, and writes it down (spec or a decision in `docs/decisions/`) |
| Spec | No access | Reads and edits the spec in the team Google Drive (heynewton folder) |
| Repo settings | No access | Rules on `main`, secrets, environments, members (GitHub org admin) |

## Merging

The ruleset "Protect main" applies to admins too: there is no bypass, so maintainers also land
every change through a PR.

- Merges are squash only, and every review thread must be resolved first.
- No approval is required, and CI is not a required check. So before merging, check that CI is
  green and the PR meets the [Definition of Done](process.md#definition-of-done) yourself.
- Check the preview for anything that changes a screen (**View deployment** on the PR).
- Look hardest at what the tests can't catch: real boat data, personal info or secrets in the diff;
  a number that comes from the model rather than a tested function; row-level security on any new
  table; and the "what wasn't tested" list in the PR body.
- Most PRs are written by Claude, so review time is the bottleneck. Ask for a smaller PR rather
  than skimming a big one.

## Releasing

**Merge = dev, release = prod.** Merging a PR updates the dev site and `newton-dev` only.
Production (heynewton.app and `newton-prod`) moves when you publish a GitHub Release (#163).

- Say "release" to Claude. It checks that the commit passed on dev, drafts the notes from the
  history files (`npm run release-notes -- --create`), tidies them and gives you the draft's link.
  It never publishes.
- Read the draft, above all **Database changes**: migrations can't be undone, so check each is safe
  on prod's existing data. Then **Publish release**: that is the approval, and the Production
  workflow does the rest.
- Roll back with Actions → **Production** → **Run workflow** with the earlier tag: the code goes
  back, the migrations stay. Hotfixes go through `main` like any change, then a new release.
- At weekly planning, `npm run release-notes` shows what is merged but not released yet.

Details, including what the workflow refuses: [process.md](process.md#production).

## The backlog

- **Triage** moves issues from Inbox to Ready, once they meet the
  [Definition of Ready](process.md#definition-of-ready). This move and the order of Ready are the
  only manual ones on the board; the workflow does the rest.
- **The order of Ready is the priority.** The top unblocked issue is next, for Claude and for
  contributors. There are no priority labels.
- **Milestones** are the build phases. Every open issue has one; we are in Phase 1.
- **Ideas** for later phases go in the spec's "Feature ideas" section, not in issues, and become
  issues at weekly planning when their phase gets close.
- **Weekly planning** (about 15 minutes): order the top of Ready and refine those issues, and look
  at what is waiting to be released.

## Keeping the lights on

- **Secrets** (Settings → Secrets and variables → Actions). [docs/tokens.md](tokens.md) lists
  every token: who issued it, its exact scope and permissions, where it's stored and when it
  expires, so it can be renewed or copied for prod. `VERCEL_TOKEN` (deploys) and the Supabase
  token are on project accounts. `PROJECT_TOKEN` (board cards) belongs to the maintainer who created
  it, because GitHub tokens always belong to a person.
- **Leaked secrets.** Secret scanning and push protection are on. If a secret lands in the repo
  anyway, rotate it first; removing it from history is not enough.
- **Service accounts.** Vercel, Cloudflare (DNS for heynewton.app) and, soon, Supabase are on
  project accounts. Ask for access when you need it; don't sign a project service up with a
  personal email.
- **Members.** A contributor can get write access to the repo or work from a fork. PRs from forks
  get no preview and don't move board cards, because forks can't read repo secrets.

## Working with Claude

Claude Code is the dev team (see [Roles](process.md#roles)). It follows `CLAUDE.md` and the
`ship-change` skill, and adds an entry to the [build log](build-log/) for each PR. That log is
the quickest way to see what was asked, what was built and what changed along the way.

- A local session can move board cards by hand; a cloud session can't, and relies on the board
  workflow ([Cards move by themselves](process.md#cards-move-by-themselves)).
- **Claude runs the service CLIs, not you.** For GitHub, Supabase, Vercel, Cloudflare and Resend,
  Claude makes the change itself with the signed-in CLI or API (`gh`, `supabase`, `vercel`,
  `wrangler`, Resend's API or connector) instead of asking you to click through a dashboard:
  repo settings and secrets, migrations, env vars, DNS records, webhooks, deploys. It asks you to
  use a dashboard only for what no CLI or API can do, such as creating an account or the first
  access token a CLI needs, and says why. Secret values go straight from the service or a
  generator into their destination (for example `openssl rand -hex 32 | vercel env add …`), so
  they never appear in the conversation. Anything hard to undo on prod still waits for your yes.
- When Claude gets something wrong in a way that will happen again, fix the instructions
  (`CLAUDE.md`, the skill or `process.md`) in a PR, not just the code.

## Between maintainers

- Agree product calls that change direction (a new phase item, reordering the top of Ready, a new
  service or a cost) with the other maintainer before acting on them. Small fixes don't need that.
- Don't merge your own PR when it changes product, architecture or repo settings; ask the other
  maintainer to look first.
