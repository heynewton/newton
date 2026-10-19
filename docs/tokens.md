# Tokens and secrets

Every token Newton's automation uses, how it was created, and where it is stored, so it can be
renewed or copied for another environment exactly. **No values here**: values live only in the
service that issued them and in GitHub's encrypted secrets.

Rules for all of them:

- Created on the **project accounts** on the `heynewton.app` domain, not on personal accounts,
  unless the table says otherwise.
- Saved with `gh secret set <NAME> --repo heynewton/newton` (or in the repo settings), pasted at
  the prompt, never in a chat, issue or file.
- The smallest scope the service offers, and an expiry date. Put the renewal date in the project
  calendar when you create one.
- If a token leaks, revoke it at the service first, then create a new one and replace the secret.

## Overview

| Secret or variable | Kind | Issued by | Owned by | Used by | Stored in |
| --- | --- | --- | --- | --- | --- |
| `VERCEL_TOKEN` | secret | Vercel | Project Vercel account (Hobby) | `.github/workflows/deploy.yml` | Repo secrets |
| `PROJECT_TOKEN` | secret | GitHub | The maintainer's GitHub user (see below) | `.github/workflows/board.yml` | Repo secrets |
| `HISTORY_APP_ID`, `HISTORY_APP_PRIVATE_KEY` | variable, secret | GitHub | The `heynewton` org (a GitHub App) | `.github/workflows/history.yml` | Repo variables; repo secrets |
| `SUPABASE_DEV_ACCESS_TOKEN` | secret | Supabase | Project Supabase account | Dev database workflow (#60) | Repo secrets |
| `SUPABASE_DEV_DB_PASSWORD` | secret | Supabase | `newton-dev` project | Dev database workflow (#60) | Repo secrets, and the project password manager |
| `SUPABASE_DEV_PROJECT_REF` | variable | Supabase | `newton-dev` project | Dev database workflow (#60) | Repo variables (not secret) |
| `SUPABASE_DEV_URL`, `SUPABASE_DEV_PUBLISHABLE_KEY` | variables | Supabase | `newton-dev` project | `.github/workflows/deploy.yml`: the dev site and previews (#62) | Repo variables (not secret) |
| `FIXTURE_SIGN_IN` | flag (not secret) | us | — | "Sign in as…" the sample boat's people on the dev site and previews (#97) | `.github/workflows/deploy.yml` (always `1` there); nowhere else |
| `SUPABASE_SECRET_KEY` of `newton-dev` | secret | Supabase | `newton-dev` project | Fixture sign-in on the dev site and previews (#97), besides email-in and reminders | Vercel env vars of `heynewton-web`, Production (the dev site) and Preview targets |
| `SUPABASE_PROD_ACCESS_TOKEN`, `SUPABASE_PROD_DB_PASSWORD` | secrets | Supabase | Project Supabase account; `newton-prod` project | `.github/workflows/production.yml` (#63) | The `production` environment only |
| `SUPABASE_PROD_PROJECT_REF`, `SUPABASE_PROD_URL`, `SUPABASE_PROD_PUBLISHABLE_KEY`, `PROD_SITE_URL` | variables | Supabase, Vercel | `newton-prod`; `heynewton-prod` | `.github/workflows/production.yml` (#63) | The `production` environment only (environment variables, not repo variables) |
| Prod server keys (`SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `CRON_SECRET`) | secrets | Supabase, Resend, us | `newton-prod`; project Resend account | Email-in and reminders on prod (#63) | Vercel env vars of `heynewton-prod`, Production target ([Production](#production)) |
| Resend SMTP keys | secret | Resend | Project Resend account (Free) | Supabase Auth SMTP of `newton-dev` and `newton-prod` (#61, #63) | That project's SMTP settings only, not GitHub |
| `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `SUPABASE_SECRET_KEY`, `CRON_SECRET` | secrets | Resend, Supabase, us | Project Resend account; that Supabase project | Email-in webhook (#10) and reminders job (#12) | Vercel env vars of that deployment |
| `ANTHROPIC_API_KEY` | secret | Anthropic | `heynewton` org in the Claude Console, one workspace per environment | Manual Q&A (`packages/agent`, #14): the live eval, and the app once it calls it | Local `.env` for the eval; the app's environment later. Not in CI |
| `VOYAGE_API_KEY` | secret | Voyage AI | Project Voyage AI account | Indexing and search of manuals (`packages/indexing`, #13, #14) | Local `.env`; the indexing job's environment when it exists (#11). Not in CI |

## `VERCEL_TOKEN`

Name and expiry below are what the setup steps suggested; check them on the token page and
correct this section if they differ.

- **Where:** Vercel → Account Settings → Tokens.
- **Name:** `github-actions-newton`
- **Scope:** the project's Hobby account (the only choice).
- **Expiry:** 1 year.
- **Used for:** PR previews and the dev site. The workflow also turns off Vercel Authentication on
  previews and sets the project's root directory to `apps/web`.

## `PROJECT_TOKEN`

Name and expiry below are what the setup steps suggested; check them on the token page and
correct this section if they differ.

- **Where:** GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens.
- **Name:** `newton-board`
- **Resource owner:** `heynewton` (the org must allow fine-grained tokens; approve the request
  under the org's personal access token settings if approval is required).
- **Repository access:** only `heynewton/newton`.
- **Permissions:** Repository → Issues: read, Pull requests: read, Metadata: read. Organization →
  Projects: read and write. Everything else: no access.
- **Expiry:** 1 year, or the org's maximum.
- **Owner caveat:** GitHub fine-grained tokens always belong to a person, so this one belongs to
  the maintainer who created it, even though it can only reach the org's project. A GitHub App
  owned by `heynewton` would remove that tie.
- **Not for cloud sessions:** Claude cloud sessions can't use it. Their GitHub proxy blocks
  GraphQL, which Projects needs, whatever the token (see `docs/process.md`).

## History App (`HISTORY_APP_ID`, `HISTORY_APP_PRIVATE_KEY`)

The History workflow rebuilds `docs/history.md` after every merge and pushes it straight to
`main`. The "Protect main" ruleset only takes PRs, so the push comes from a GitHub App that is
the ruleset's one bypass. An App belongs to the org, not to a person, and the workflow turns its
key into a token that lasts an hour.

- **Where:** GitHub → `heynewton` org settings → Developer settings → GitHub Apps → New GitHub App.
- **Name:** `heynewton-history` (App names are unique across GitHub). Homepage:
  `https://github.com/heynewton/newton`. Webhook: off.
- **Permissions:** Repository → Contents: read and write (Metadata: read comes with it).
  Everything else: no access. Where can it be installed: only this account.
- **Install:** on `heynewton`, only the `newton` repository.
- **Bypass:** Repo settings → Rules → Rulesets → "Protect main" → Bypass list → add
  `heynewton-history`, mode "Always allow". Nothing else is on the list.
- **Saved as:** the App ID (on the App's page) with
  `gh variable set HISTORY_APP_ID --repo heynewton/newton`; a private key (App page → Generate a
  private key, a `.pem` download) with
  `gh secret set HISTORY_APP_PRIVATE_KEY --repo heynewton/newton < key.pem`, then delete the file.
- **Expiry:** App keys don't expire. Generate a new one and delete the old one on the App page if
  it may have leaked.
- **Before it's set up** the workflow skips itself (no `HISTORY_APP_ID`), and `docs/history.md`
  only changes when someone runs `npm run history` in a PR.
- **What it can do:** push to any branch of this repo, `main` included, without a PR. Only the
  History workflow has the key, and it only commits `docs/history.md`.

## Supabase access tokens (`SUPABASE_DEV_ACCESS_TOKEN`, `SUPABASE_PROD_ACCESS_TOKEN`)

Created in Supabase → Account preferences → Access Tokens → Generate new token, signed in as the
project account. Supabase tokens are scoped to projects with per-capability permissions; everything
starts at **None**.

**Dev token** (created October 2026, recreated for #60 to add API keys read; settings confirmed from the creation screen)

- **Name:** `github-actions-newton-dev`
- **Expiry:** 90 days. Renew before it lapses, or migrations stop reaching dev.
- **Resource access:** `newton-dev` only.
- **Stored in:** the repo secret `SUPABASE_DEV_ACCESS_TOKEN`. The workflow passes it to the CLI as
  `SUPABASE_ACCESS_TOKEN`, the name the CLI reads.
- **Capabilities** (everything not listed stays **None**):

| Section | Capability | Access | Why |
| --- | --- | --- | --- |
| Project | Project Settings | Read | `supabase link` reads the project's details |
| Database | Migrations | Read-write | `supabase db push` records and applies migrations |
| Database | Connection Pooling | Read | GitHub's runners reach the database through the pooler |
| Application services | Data API Config | Read | `supabase link` compares hosted settings with `supabase/config.toml` |
| Application services | Storage Config | Read | Same comparison, for storage |
| Application services | API Keys | Read | `supabase link` reads the project's API keys; without it, link fails with "Missing required permission(s): api_gateway_keys_read" (#60). `supabase seed buckets --linked` reads the secret key the same way to upload the sample boat's PDFs to Storage |
| Application services | API Key Secrets | Read | Needed with API Keys for the same call; without it, link fails with "Your account does not have the necessary privileges to access this endpoint" on `GET /v1/projects/<ref>/api-keys` (#60) |

Supabase rates this "High risk" because a migration can run any SQL. That is what the workflow
needs. Supabase's [token docs](https://supabase.com/docs/guides/platform/personal-access-tokens) list Project Settings, API
Keys and API Key Secrets (all Read) as what `supabase link` needs. So the token can read the
project's API keys, including the secret ones that bypass RLS, but can't change them. For dev that
exposes only fixture data; for prod it's a reason to keep the token in the approval-gated
`production` environment. It can't read auth settings or signing keys, can't manage backups or
network settings, and can't see any other project.

If a workflow run fails on a missing permission, the error names it: add only that capability,
as Read where possible, and update this table in the same PR.

**Prod token** (#63): create a **second** token with exactly the same capabilities, with:

- **Name:** `github-actions-newton-prod`
- **Resource access:** `newton-prod` only, never both projects in one token.
- **Stored in:** the GitHub environment `production` (Settings → Environments → production →
  Environment secrets) as `SUPABASE_PROD_ACCESS_TOKEN`. The environment needs the maintainer's approval,
  so a dev workflow or a PR can never use it.
- **Expiry:** the same, with its own calendar reminder.

## `VOYAGE_API_KEY`

Embeddings for manual search ([decision 0004](decisions/0004-embeddings.md)). Only the live
manual Q&A eval uses it until the indexing job (#11) runs against a real database. Tests and CI
use a fake embedder and need no key.

- **Where:** Voyage AI dashboard (dashboard.voyageai.com) → API keys, signed in as the project
  account (`dev@heynewton.app`).
- **Name:** `newton-dev` exists; a separate `newton-prod` key comes with the indexing job in
  prod, so one can be revoked without the other.
- **Payment method:** add one under Billing before using the key. Without it the account is held
  to 3 requests a minute, too few for the eval, and can't opt out of training. The free tokens
  still apply, so the eval costs nothing.
- **Before first real use:** opt out of training on our content. The opt-out is permanent and
  only covers content sent after it. Done for the project account.
- **Expiry:** Voyage keys don't expire; revoke and replace them yearly, with a calendar reminder.
- **Stored in:** `.env` locally (`VOYAGE_API_KEY=…`, git-ignored), and the environment of
  whatever runs the indexing job. Prod's key only in the `production` environment.

## Dev site and previews (`SUPABASE_DEV_URL`, `SUPABASE_DEV_PUBLISHABLE_KEY`)

What the deployed web app needs to sign people in against `newton-dev` (#62). Both are public by
design: the publishable key only reaches what row-level security allows. So they are repo
variables, readable in workflow logs, and never a secret or service-role key; the Deploy
workflow fails if the key doesn't start with `sb_publishable_`.

- **Where:** Supabase → `newton-dev` → Project Settings → API Keys. `SUPABASE_DEV_URL` is the
  project URL, `https://<project ref>.supabase.co` (the ref is `SUPABASE_DEV_PROJECT_REF`); the
  key is the **Publishable key** (`sb_publishable_…`), not the Secret key.
- **Saved as:** `gh variable set SUPABASE_DEV_URL --repo heynewton/newton` and
  `gh variable set SUPABASE_DEV_PUBLISHABLE_KEY --repo heynewton/newton`, pasted at the prompt.
- **Used as:** `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, at build time from the job's
  environment and at run time through `vercel deploy --env`. Nothing is set in Vercel.
- **Expiry:** none. If the key is rotated in Supabase, update the variable and re-run Deploy.
- **Prod:** never these. Production has its own keys in the `production` environment ([Production](#production)).

## Fixture sign-in (`FIXTURE_SIGN_IN`, `SUPABASE_SECRET_KEY`)

The sample boat's people (`fixtures/sample-boat`) sign in with addresses on reserved domains, so
their magic links can't be delivered. On the dev site and previews, `/sign-in` also lists them
under "Sign in as a sample-boat person" (#97): the server makes a magic link with `newton-dev`'s
secret key (`auth.admin.generateLink`) and verifies it at once, which sets the session cookie. No
email is sent.

| Name | What | Where |
| --- | --- | --- |
| `FIXTURE_SIGN_IN` | `1` turns it on. Anything else, or unset, hides the option and `/auth/fixture-sign-in` returns 404 | Set to `1` by `.github/workflows/deploy.yml`, at build and run time. That workflow only deploys the dev site and previews; never set it on production or in a local `.env` you don't mean to use it in |
| `SUPABASE_SECRET_KEY` | `newton-dev`'s **Secret key** (`sb_secret_…`), Supabase → `newton-dev` → Project Settings → API Keys. Server only: bypasses row-level security, and here only makes the sign-in link | Vercel → `heynewton-web` → Settings → Environment Variables, **Production** (the dev site, shared with email-in and reminders) and **Preview** targets, marked Sensitive. Never a `NEXT_PUBLIC_` variable, never in GitHub |

- **Limits:** the route only signs in the four addresses listed in
  `apps/web/src/lib/db/fixture-sign-in.ts`, and each must be on `example.com/.net/.org` or `.test`.
  Anything else is refused (403) even with the flag on.
- **Without the secret key** the option shows but the route answers 503 "not set up here".
- **Who can use it:** anyone with a preview or dev-site link, since previews are public. They only
  reach fixture data on `newton-dev`. Previews only run for branches of this repo (not forks), so
  only people who can push here can run code next to the key.
- **Prod:** never. The Production workflow fails if `FIXTURE_SIGN_IN` is set and checks the route answers 404 there.

`newton-dev`'s Authentication → URL Configuration (set by hand; the access token can't write auth
settings):

| Setting | Value |
| --- | --- |
| Site URL | `https://heynewton-web.vercel.app` |
| Redirect URLs | `https://heynewton-web.vercel.app/**`, `https://heynewton-*-hey-newton.vercel.app/**` (PR previews), `https://heynewton.app/**` (serves the dev site until #37; remove it then) |

The preview pattern also matches any `*-hey-newton` Vercel team. A magic link sent somewhere else
is useless without the PKCE cookie in the browser that asked for it, and dev holds only fixture
data, so that is acceptable here; prod allows only its own domain.

## Supabase database passwords

- **Dev:** generated when `newton-dev` was created (Supabase → New project → Generate password),
  saved in the project password manager as "Supabase newton-dev database" and as the repo secret
  `SUPABASE_DEV_DB_PASSWORD`.
- **Prod:** generated the same way for `newton-prod`, saved in the password manager, and stored
  only in the `production` environment as `SUPABASE_PROD_DB_PASSWORD`.
- Both are reset in Supabase → Project Settings → Database. Update the secret right after.

## Resend SMTP keys

Supabase sends sign-in emails through Resend ([decision](decisions/0003-email-provider.md)). One
key per Supabase project, so revoking one doesn't break the other.

- **Where:** Resend → API Keys → Create API key, signed in as the project account.
- **Names:** `supabase-newton-dev`, and `supabase-newton-prod` for #63.
- **Permission:** Sending access (not Full access), domain `heynewton.app` only.
- **Expiry:** Resend keys don't expire. Rotate yearly; put the date in the project calendar.
- **Stored in:** pasted straight into Supabase → that project → Authentication → Emails → SMTP
  Settings (password field), with host `smtp.resend.com`, port `465`, user `resend`. Not saved
  anywhere else: a lost key is replaced, not recovered.

## Email-in (`RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `SUPABASE_SECRET_KEY`)

The `/api/email-in` webhook (#10) reads received mail from Resend and writes to the database
without a signed-in person. Setup steps are in [decision 0003](decisions/0003-email-provider.md#3b-email-in-webhook-10).

| Variable | Issued by | Permission | Stored in |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | Resend, key `email-in-newton-dev` (`email-in-newton-prod` for #63) | Full access: reading received emails needs more than "Sending access", and Full access is the narrowest that can | Vercel env vars of the deployment it belongs to, marked Sensitive |
| `RESEND_WEBHOOK_SECRET` | Resend, per webhook endpoint (`whsec_…`) | Checks that a request comes from Resend | Same |
| `SUPABASE_SECRET_KEY` | Supabase, that project's secret API key | Bypasses row-level security; only `lib/db/email-in.ts`, `lib/db/reminders.ts` and (dev and previews) `lib/db/fixture-sign-in.ts` use it | Same. Never in the browser, never a `NEXT_PUBLIC_` variable |
| `INBOUND_EMAIL_DOMAIN` | — (not secret) | `boats.heynewton.app` | Same |

- **Expiry:** none of them expire on their own. Rotate yearly with the other Resend keys; a new
  webhook secret is made with Resend's rotate button.
- **Locally:** `apps/web/.env.local`, with the local stack's secret key from `npm run db:start`.

## Reminders (`CRON_SECRET`, `RESEND_API_KEY`, `SUPABASE_SECRET_KEY`)

The daily reminders job (#12, [decision 0005](decisions/0005-scheduled-jobs.md)) is a route that
Vercel Cron calls, reads every boat without a signed-in person, and sends email through Resend's
API.

| Variable | Issued by | Permission | Stored in |
| --- | --- | --- | --- |
| `CRON_SECRET` | Us: a random string of 32+ characters (`openssl rand -hex 32`) | Vercel sends it as `Authorization: Bearer …`; the route refuses calls without it | Vercel env vars of `heynewton-web` (Production target), marked Sensitive |
| `RESEND_API_KEY` | Resend: the same key as email-in (`email-in-newton-dev`, see above), which can also send | Sending from `heynewton.app` | Same |
| `SUPABASE_SECRET_KEY` | Supabase, that project's secret API key | Bypasses row-level security; only `lib/db/reminders.ts`, `lib/db/email-in.ts` and (dev and previews) `lib/db/fixture-sign-in.ts` use it | Same. Never in the browser, never a `NEXT_PUBLIC_` variable |
| `SITE_URL` | — (not secret) | Links in the email: `https://heynewton-web.vercel.app` on dev | Same |

- **Expiry:** none of them expire on their own. Rotate yearly with the other keys.
- **Locally:** `apps/web/.env.local`; call the route with
  `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/reminders`.

## Supabase project settings chosen at creation

Use the same choices for `newton-prod`:

| Setting | Choice | Why |
| --- | --- | --- |
| Region | Same for dev and prod | Prod behaves like dev |
| Enable Data API | On | The web app uses `supabase-js` |
| Automatically expose new tables | Off | Every migration revokes default access and grants exactly what each table needs |
| Enable automatic RLS | On | Safety net: a table a migration forgets to protect is locked, not open |

Your local stack still exposes new tables by default, so a migration that forgets its `grant`
lines works on a laptop but not on the hosted projects. Previews on dev (#62) catch that.

## `ANTHROPIC_API_KEY`

Claude for manual Q&A (#14). Only the live eval (`npm run eval:manual-qa -w @newton/agent`) uses
it until the app asks questions. Tests and CI use a scripted stand-in.

- **Where:** Claude Console (platform.claude.com), in the `heynewton` organization owned by the
  project account (`dev@heynewton.app`).
- **Workspaces:** `newton-dev` and `newton-prod`, each with its own monthly spend limit, so dev
  runs can't use up prod's budget and one key can be revoked without the other.
- **Name:** the key is named after its workspace. `newton-dev` exists; `newton-prod`'s key is
  created when the app calls Claude.
- **Spend:** one eval run is ten questions on `claude-opus-5-5` at low effort: a few cents.
- **Expiry:** keys don't expire; rotate yearly with a calendar reminder.
- **Stored in:** `.env` at the repo root (git-ignored), never in the repo or CI. Vitest doesn't
  read `.env`, so load it into the shell first:
  `set -a && source .env && set +a && npm run eval:manual-qa -w @newton/agent`. Without a key the
  eval is skipped, not failed.
- **Later:** for prod on Vercel, consider workload identity federation instead of a stored key.

## Production

Everything prod needs, set up once by the maintainer for #63. Same names and settings as dev
unless a step says otherwise; **never reuse a dev key or value**. Done on 19 October 2026 (results on #63).

**1. Supabase `newton-prod`**

- [x] Supabase → New project `newton-prod`, same organisation and the
      [settings chosen at creation](#supabase-project-settings-chosen-at-creation). Generate the
      database password and save it in the password manager as "Supabase newton-prod database".
- [x] Access token `github-actions-newton-prod`, as described under
      [Supabase access tokens](#supabase-access-tokens-supabase_dev_access_token-supabase_prod_access_token).
- [x] Authentication → URL Configuration: **Site URL** `https://heynewton-prod.vercel.app`,
      **Redirect URLs** `https://heynewton-prod.vercel.app/**` only (no previews, no dev site).
      #37 changes both to `https://heynewton.app`.
- [x] Authentication → Emails → SMTP: decision 0003, [step 6](decisions/0003-email-provider.md#6-supabase-newton-prod-63)
      (key `supabase-newton-prod`).

**2. GitHub environment `production`**

- [x] Repo settings → Environments → New environment `production`. Deployment protection rules:
      **Required reviewers** the maintainer, **Deployment branches** `main` only.
- [x] Environment secrets: `SUPABASE_PROD_ACCESS_TOKEN`, `SUPABASE_PROD_DB_PASSWORD`.
- [x] Environment variables: `SUPABASE_PROD_PROJECT_REF`, `SUPABASE_PROD_URL`
      (`https://<ref>.supabase.co`), `SUPABASE_PROD_PUBLISHABLE_KEY` (`sb_publishable_…`),
      `PROD_SITE_URL` (`https://heynewton-prod.vercel.app`).
- [x] Nothing prod in repo-level secrets or variables, where any workflow could read it.

**3. Vercel `heynewton-prod`**

- [x] Project `heynewton-prod` in Team Hey Newton (Hobby), with no Git connection (GitHub Actions
      deploys it with `VERCEL_TOKEN`, as for dev): `vercel project add heynewton-prod`. Created that
      way it defaults to framework "Other", so the workflow sets Next.js and the root directory.
- [x] Settings → Environment Variables, **Production** target only, secrets marked Sensitive:

| Variable | Value |
| --- | --- |
| `SUPABASE_SECRET_KEY` | `newton-prod`'s Secret key |
| `RESEND_API_KEY` | New Resend key `email-in-newton-prod`, Full access (as dev's) |
| `RESEND_WEBHOOK_SECRET` | The signing secret of the prod webhook (step 4) |
| `INBOUND_EMAIL_DOMAIN` | `boats.heynewton.app` |
| `CRON_SECRET` | A new `openssl rand -hex 32`, not dev's |
| `SITE_URL` | `https://heynewton-prod.vercel.app` (heynewton.app after #37) |

- [x] Never `FIXTURE_SIGN_IN`: the Production workflow fails if it's there.

**4. Resend webhook for prod**

- [x] Decision 0003 [step 3b](decisions/0003-email-provider.md#3b-email-in-webhook-10), last
      item: a second endpoint `https://heynewton-prod.vercel.app/api/email-in`, event
      `email.received`. Each webhook ignores addresses that aren't its own project's boats.

**5. First release and checks**

- [x] Merge the #63 PR, approve the Production run, and check it applied every migration and
      passed "Fixture sign-in answers 404".
- [x] Sign in on the prod URL with a team member's address (the email comes from
      `noreply@heynewton.app`), add a test boat, email it a PDF from that address: it appears on
      prod, and the dev webhook's delivery in Resend says `unknown_address`.
- [x] `curl -H "Authorization: Bearer <prod CRON_SECRET>" https://heynewton-prod.vercel.app/api/reminders`
      answers 200, and Vercel → `heynewton-prod` → Cron Jobs lists the daily job.
- [x] List env vars on both Vercel projects: no `newton-prod` key on `heynewton-web`, no
      `newton-dev` key on `heynewton-prod`.
- [ ] Delete the test boat from `newton-prod`: its rows with SQL (deleting the boat cascades to
      its documents, emails and memberships), its files in Supabase → Storage → `documents` →
      `<boat id>/`, since SQL can't delete storage objects. A team member's own account stays: it
      is their real prod login.
