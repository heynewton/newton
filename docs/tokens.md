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
| Prod equivalents | secrets | Supabase | `newton-prod` project | Production release (#63) | The `production` environment only |
| Resend SMTP keys | secret | Resend | Project Resend account (Free) | Supabase Auth SMTP of `newton-dev` and `newton-prod` (#61, #63) | That project's SMTP settings only, not GitHub |
| `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `SUPABASE_SECRET_KEY`, `CRON_SECRET` | secrets | Resend, Supabase, us | Project Resend account; that Supabase project | Email-in webhook (#10) and reminders job (#12) | Vercel env vars of that deployment |
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

Embeddings for manual search ([decision 0004](decisions/0004-embeddings.md)). Not created yet:
nothing calls Voyage until the indexing job (#11) or Q&A (#14) runs against a real database.
Tests and CI use a fake embedder and need no key.

- **Where:** Voyage AI dashboard (dashboard.voyageai.com) → API keys, signed in as the project
  account (`dev@heynewton.app`).
- **Name:** `newton-dev`, and a separate `newton-prod` key for prod, so one can be revoked
  without the other.
- **Before first use:** opt out of training on our content in the dashboard. It only covers
  content sent after opting out.
- **Expiry:** Voyage keys don't expire; revoke and replace them yearly, with a calendar reminder.
- **Stored in:** `.env` locally (`VOYAGE_API_KEY=…`, git-ignored), and the environment of
  whatever runs the indexing job. Prod's key only in the `production` environment.

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
| `RESEND_API_KEY` | Resend, key `email-in-newton-dev` (`email-in-newton-prod` for #63) | Must read received emails, which "Sending access" can't; the narrowest that can (not confirmed yet) | Vercel env vars of the deployment it belongs to, marked Sensitive |
| `RESEND_WEBHOOK_SECRET` | Resend, per webhook endpoint (`whsec_…`) | Checks that a request comes from Resend | Same |
| `SUPABASE_SECRET_KEY` | Supabase, that project's secret API key | Bypasses row-level security; only `lib/db/email-in.ts` and `lib/db/reminders.ts` use it | Same. Never in the browser, never a `NEXT_PUBLIC_` variable |
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
| `SUPABASE_SECRET_KEY` | Supabase, that project's secret API key | Bypasses row-level security; only `lib/db/reminders.ts` and `lib/db/email-in.ts` use it | Same. Never in the browser, never a `NEXT_PUBLIC_` variable |
| `SITE_URL` | — (not secret) | Links in the email: `https://heynewton-web.vercel.app` on dev | Same |

- **Expiry:** none of them expire on their own. Rotate yearly with the other keys.
- **Locally:** `apps/web/.env.local`; call the route with
  `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/reminders`.


Use the same choices for `newton-prod`:

| Setting | Choice | Why |
| --- | --- | --- |
| Region | Same for dev and prod | Prod behaves like dev |
| Enable Data API | On | The web app uses `supabase-js` |
| Automatically expose new tables | Off | Every migration revokes default access and grants exactly what each table needs |
| Enable automatic RLS | On | Safety net: a table a migration forgets to protect is locked, not open |

Your local stack still exposes new tables by default, so a migration that forgets its `grant`
lines works on a laptop but not on the hosted projects. Previews on dev (#62) catch that.
## Supabase project settings chosen at creation
