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
| Resend SMTP keys | secret | Resend | The prod or dev Resend team (Free), one key each (#109) | Supabase Auth SMTP of `newton-dev` and `newton-prod` (#61, #63) | That project's SMTP settings only, not GitHub |
| `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `SUPABASE_SECRET_KEY`, `CRON_SECRET` | secrets | Resend, Supabase, us | That environment's Resend team (#109); that Supabase project | Email-in webhook (#10) and reminders job (#12) | Vercel env vars of that deployment: the dev site's on `heynewton-web` Production only, never Preview |
| `ANTHROPIC_API_KEY` | secret | Anthropic | `heynewton` org in the Claude Console, one workspace per environment | Filing (#11) in the web app (after email-in and the daily `/api/filing` run); the live evals of filing and manual Q&A (`packages/agent`, #11, #14) | Local `.env` for the evals; Vercel env vars of each deployment for filing (without it, filing is off there and documents stay unsorted). Not in CI |
| Google OAuth clients (`newton-dev`, `newton-prod`) | client ID, secret | Google Cloud | Project Google Cloud project `heynewton`, on dev@heynewton.app | Google sign-in on `/sign-in` (#131) | That Supabase project's Auth settings (set through the Management API); the dev client's also in a local `supabase/.env` for the local stack. Not in GitHub |
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
exposes only fixture data; for prod it's a reason to keep the token in the `production`
environment, which only `main` can use. It can't read auth settings or signing keys, can't manage backups or
network settings, and can't see any other project.

If a workflow run fails on a missing permission, the error names it: add only that capability,
as Read where possible, and update this table in the same PR.

**Prod token** (#63): create a **second** token with exactly the same capabilities, with:

- **Name:** `github-actions-newton-prod`
- **Resource access:** `newton-prod` only, never both projects in one token.
- **Stored in:** the GitHub environment `production` (Settings → Environments → production →
  Environment secrets) as `SUPABASE_PROD_ACCESS_TOKEN`. The environment only allows `main`, so
  a dev workflow on another branch or a PR can never use it. Since #120 it needs no approval:
  migrations wait for it on `production-migrations` instead ([Production](#production), step 7).
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

## Dev site address (`dev.heynewton.app`)

The dev site is served at https://dev.heynewton.app (#106), still the Vercel project
`heynewton-web` deployed from `main`, still backed by `newton-dev`. `heynewton-web.vercel.app`
keeps working as a fallback. The dev site and previews send `X-Robots-Tag: noindex` (`NOINDEX=1`,
set only by `.github/workflows/deploy.yml`); the Production workflow fails if `NOINDEX` is set
there. Setup, by the maintainer, in this order so every sign-in link has somewhere valid to land:

- [x] 1. Vercel → `heynewton-web` → Settings → Domains → Add: `dev.heynewton.app`, Production
      (connected to the production target, no redirect). Vercel shows the record it wants,
      usually a **CNAME** `dev` → a `…vercel-dns-….com` target. Set exactly that in Cloudflare →
      `heynewton.app` → DNS, proxy **off** (grey cloud), like the apex. Leave the mail records
      (MX, SPF, DKIM, `_dmarc`, `boats`) alone. Wait for **Valid Configuration**. (Done: CNAME
      `dev` → `a49833141f4b58b5.vercel-dns-017.com`, the same target as the apex and `www`.)
- [x] 2. Supabase → `newton-dev` → Authentication → URL Configuration: **Site URL**
      `https://dev.heynewton.app`; Redirect URLs: **add** `https://dev.heynewton.app/**`, keeping
      `https://heynewton-web.vercel.app/**` and `https://heynewton-*-hey-newton.vercel.app/**`.
- [x] 3. Vercel → `heynewton-web` → Settings → Environment Variables: `SITE_URL` =
      `https://dev.heynewton.app` (Production). It applies from the next deploy (5).
- [x] 4. Resend → Webhooks → the dev endpoint (`https://heynewton-web.vercel.app/api/email-in`) →
      Edit: endpoint URL `https://dev.heynewton.app/api/email-in`, event `email.received` as
      before. The signing secret stays the same; if Resend makes a new endpoint instead, put its
      secret in `RESEND_WEBHOOK_SECRET` on `heynewton-web` (Production and Preview) and delete the
      old endpoint. The prod endpoint doesn't change.
- [x] 5. Actions → the latest **Deploy** run on `main` → Re-run all jobs. It redeploys the dev
      site with the new `SITE_URL`.
- [ ] 6. Check from outside: `https://dev.heynewton.app` serves dev, with "Sign in as" on
      `/sign-in` and `X-Robots-Tag: noindex`; `https://heynewton.app` has no `X-Robots-Tag` and
      `/auth/fixture-sign-in` answers 404 there.
- [x] 7. Sign in by email link on `https://dev.heynewton.app` with a team member's address: the
      link comes back to `https://dev.heynewton.app/auth/callback`. Email a PDF to a test boat's
      address: Resend shows the dev webhook delivery at the new URL with 200.

To undo: remove the domain from `heynewton-web`, and put the Site URL, `SITE_URL` and the webhook
back on `https://heynewton-web.vercel.app`. The DNS record can stay; it points at nothing else.

## Dev Resend team (#109)

Dev and prod have separate Resend teams, so nothing in dev can read real boat mail
([decision 0003, update](decisions/0003-email-provider.md#update-20-october-2026-dev-gets-its-own-resend-team-109)).

| | Prod team (the original one) | Dev team `newton-dev` |
| --- | --- | --- |
| Login | `dev@heynewton.app` | `resend-dev@heynewton.app`, a separate free account (a second team on one login is a paid feature) |
| Sending domain | `heynewton.app` (`noreply@heynewton.app`) | `dev.heynewton.app` (`noreply@dev.heynewton.app`) |
| Inbound domain | `boats.heynewton.app` | `boats.dev.heynewton.app` |
| SMTP key (Sending access, sending domain only) | `supabase-newton-prod` → `newton-prod` | `supabase-newton-dev` → `newton-dev` |
| Email-in and reminders key (Full access) | `email-in-newton-prod` → `heynewton-prod` | `email-in-newton-dev` → `heynewton-web`, Production target only |
| Webhook (`email.received`) | `https://heynewton-prod.vercel.app/api/email-in` | `https://dev.heynewton.app/api/email-in` |

**What each place can reach.** A PR preview (code from any branch) has `newton-dev`'s keys and
no Resend key: email-in answers 503 "Email-in is not set up here", reminders aren't scheduled
there, sign-in mail is sent by `newton-dev`'s Supabase, from the dev team. The dev site (only
`main`) has the dev team's key, which reads only mail sent to `boats.dev.heynewton.app`. Only
`heynewton-prod` has a prod-team key.

Setup, by the maintainer, in this order (dev email-in is down from step 7 to step 9; nothing on
prod changes until step 11, which only deletes what prod doesn't use). Every value is copied
from the provider's screen into the next one, never into a chat or file.

- [x] 0. **Quick fix, first:** Vercel → `heynewton-web` → Settings → Environment Variables:
      remove `RESEND_API_KEY` and `RESEND_WEBHOOK_SECRET` from the **Preview** target (keep them on
      Production for now). New previews then answer 503 on `/api/email-in`; existing previews keep
      the old values until they're redeployed, so redeploy any open PR's preview (or close it).
      (Done 20 October with `vercel env rm <name> -e preview`; a fresh preview answered 503.)
- [x] 1. **Dev team.** Resend, signed in as `dev@heynewton.app` → team switcher (top left) →
      **Create team** `newton-dev`. If it offers Free, take it. If it requires a paid plan, cancel
      and instead: Cloudflare → `heynewton.app` → Email → Email Routing → add the address
      `resend-dev@heynewton.app`, forwarding to the project Gmail; then sign up at resend.com with
      that address (Free), name the team `newton-dev`, turn on two-factor authentication, and save
      the login in the password manager as "Resend dev". (Done 20 October: a second team is a
      paid feature, so dev is a separate free account; Cloudflare forwards `resend-dev@` like `dev@`.)
- [x] 2. **Sending domain.** In the dev team: Domains → Add domain → `dev.heynewton.app`, region US
      East (`us-east-1`). In Cloudflare → `heynewton.app` → DNS, add exactly the records Resend
      shows. They should all be *below* `dev` (`resend._domainkey.dev`, MX and TXT `send.dev`, and
      any CNAME), proxy **off**. If Resend asks for a record on `dev` itself, stop: that would
      clash with the Vercel CNAME; use `mail.dev.heynewton.app` instead and tell the PR. Don't
      touch the `dev` CNAME, the root's MX/SPF, `send`, `resend._domainkey`, `_dmarc` or `boats`.
      Verify, then turn **off** click and open tracking. (Done 20 October with Resend's **Auto
      configure** for Cloudflare: TXT `resend._domainkey.dev`, CNAMEs `send.dev` and `rsend.dev` →
      `*.forge.rmta.net`, proxy off. Nothing on `dev` itself.)
- [x] 3. **Inbound domain.** Add domain → `boats.dev.heynewton.app`, same region; add its records
      the same way, then turn **receiving on** and add the **MX** on `boats.dev` it shows (the only
      MX there). Wait for **Verified**. (Records added 20 October by Auto configure, run again
      after turning receiving on: the same three as step 2 under `boats.dev`, plus **MX**
      `boats.dev` → `inbound-smtp.us-east-1.amazonaws.com`, priority 10. Resend took a while to
      verify the MX after it resolved publicly; Restart in Resend re-runs the check. A test email
      showed up in the dev account only.) Send a test email to `test@boats.dev.heynewton.app` and
      check it appears under Emails → Receiving in the **dev** team and not in the prod team.
- [x] 4. **Keys.** Dev team → API Keys → Create:
  - `supabase-newton-dev`: **Sending access**, domain `dev.heynewton.app` only.
  - `email-in-newton-dev`: **Full access** (reading received mail needs it). (Done 20 October
    with the Resend CLI, its token piped straight into Vercel's `RESEND_API_KEY`: see step 7.)
- [x] 5. **`newton-dev` SMTP.** Supabase → `newton-dev` → Authentication → Emails → SMTP
      Settings: **Sender email** `noreply@dev.heynewton.app`, sender name `Hey Newton`, host
      `smtp.resend.com`, port `465`, user `resend`, password the new `supabase-newton-dev` key.
      Save. (`newton-prod`'s SMTP doesn't change.) (Done 20 October with the Resend CLI and the
      Supabase Management API, `PATCH /v1/projects/<ref>/config/auth`, the key piped from one to
      the other; only the SMTP fields changed.)
- [x] 6. **Dev webhook.** Dev team → Webhooks → Add endpoint `https://dev.heynewton.app/api/email-in`,
      event `email.received` only. Copy its signing secret for the next step. (Done 20 October
      with `resend webhooks create`, the secret piped straight into `RESEND_WEBHOOK_SECRET`.)
- [x] 7. **Vercel `heynewton-web`** → Settings → Environment Variables, secrets marked Sensitive:
  - `RESEND_API_KEY` = the new `email-in-newton-dev` key, **Production** only.
  - `RESEND_WEBHOOK_SECRET` = the dev webhook's secret, **Production** only.
  - `INBOUND_EMAIL_DOMAIN` = `boats.dev.heynewton.app`, Production **and** Preview (previews show
    the address; mail to it is filed by the dev site into `newton-dev`, which previews share).
  - `REMINDERS_FROM` = `Hey Newton <noreply@dev.heynewton.app>`, Production (dev's reminders
    would otherwise send from `heynewton.app`, which the dev team can't).
  - Check `RESEND_API_KEY` and `RESEND_WEBHOOK_SECRET` are **not** on Preview (step 0).
  - (Done 20 October with the Vercel CLI: `vercel env update <name> -e production` reading the
    value from stdin, so no secret was printed. A Resend CLI login with a temporary Full-access
    key `cli-newton-dev` made the dev key and webhook; delete that key when the setup is done.)
- [x] 8. Actions → the latest **Deploy** run on `main` → Re-run all jobs, so the dev site picks
      up the new values.
- [x] 9. **Test dev.** Sign in on `https://dev.heynewton.app` by email link with a team member's
      address: the email comes from `noreply@dev.heynewton.app` and passes SPF, DKIM and DMARC
      ("Show original" in Gmail). On a test boat, the page shows `…@boats.dev.heynewton.app`;
      email it a PDF from that address: it appears under Documents, and the dev team's webhook
      shows the delivery with 200. (20 October: the sign-in email came from
      `noreply@dev.heynewton.app` with DKIM, SPF and DMARC pass; a test email to the sample boat
      got 200 `held` from the dev webhook.)
- [x] 10. Tell the PR, so Claude can check from outside (step 12).
- [x] 11. **Clean the prod team.** Switch to the prod team in Resend: delete the API keys
      `supabase-newton-dev` and `email-in-newton-dev`, and the webhook
      `https://dev.heynewton.app/api/email-in`. The prod team then holds only `heynewton.app`,
      `boats.heynewton.app`, `supabase-newton-prod`, `email-in-newton-prod` and prod's webhook.
      (20 October: `email-in-newton-dev` and the dev webhook deleted from the prod team.
      The prod team's `supabase-newton-dev` followed once step 5 was tested.)
- [ ] 12. **Checks** (recorded on the PR):
  - Email a prod boat's `…@boats.heynewton.app` address: the prod team shows one webhook
    delivery (prod's, 200), and the dev team shows nothing received.
  - The dev key can't see prod's mail. With the `email-in-newton-dev` key pasted at the prompt,
    not on the command line:
    `read -s KEY && curl -s -H "Authorization: Bearer $KEY" "https://api.resend.com/emails/receiving?limit=100" | grep -c boats.heynewton.app`
    prints `0` (only `boats.dev.heynewton.app` mail is listed).
  - A fresh preview answers 503 to `POST /api/email-in`.

To undo before step 11: put the old prod-team key and secret back on `heynewton-web`,
`INBOUND_EMAIL_DOMAIN` back to `boats.heynewton.app`, remove `REMINDERS_FROM`, and `newton-dev`'s
SMTP back to `noreply@heynewton.app`. After step 11 there's nothing to go back to; fix forward.

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
| Site URL | `https://dev.heynewton.app` (#106) |
| Redirect URLs | `https://dev.heynewton.app/**`, `https://heynewton-web.vercel.app/**` (the dev site's fallback address), `https://heynewton-*-hey-newton.vercel.app/**` (PR previews). Not `https://heynewton.app/**`: since #37 that is prod |

The preview pattern also matches any `*-hey-newton` Vercel team. A magic link sent somewhere else
is useless without the PKCE cookie in the browser that asked for it, and dev holds only fixture
data, so that is acceptable here; prod allows only its own domain.

## Google sign-in (#131)

"Continue with Google" on `/sign-in` uses Supabase Auth's Google provider. `/sign-in` shows the
button only where the project's auth server reports Google as on (`/auth/v1/settings`), so a stack
without these keys offers the email link only.

**Google Cloud** (console.cloud.google.com, signed in as dev@heynewton.app; no CLI creates an OAuth
consent screen or an OAuth client for a public app, so these are dashboard steps):

- Project `heynewton`. Google Auth Platform → Branding: app name **Hey Newton**, support email
  dev@heynewton.app, home page `https://heynewton.app`, privacy `https://heynewton.app/privacy`,
  terms `https://heynewton.app/terms`, authorised domain `heynewton.app`. Audience: **External**,
  published (In production). Data access: only `openid`, `…/auth/userinfo.email` and
  `…/auth/userinfo.profile`, which are non-sensitive, so Google's app verification isn't needed.
- Clients → Create client → **Web application**, one per Supabase project. No JavaScript origins
  (the flow is a redirect through Supabase). Authorised redirect URIs:

| Client | Authorised redirect URIs |
| --- | --- |
| `newton-dev` | `https://czmndtkrnphueurgoqfk.supabase.co/auth/v1/callback` (the dev site and previews), `http://127.0.0.1:54321/auth/v1/callback` (the local stack) |
| `newton-prod` | `https://yipgqtxszsdkvpegyolv.supabase.co/auth/v1/callback` |

- Download each client's JSON straight after creating it (the secret is shown once) and keep it
  out of the repo; the next step reads it and then it can be deleted.

**Supabase** (by Claude or a maintainer, with the CLI's access token; the secret goes from the
downloaded JSON straight into the request, never printed):

```bash
jq '{external_google_enabled: true, external_google_client_id: .web.client_id, external_google_secret: .web.client_secret}' client_secret_dev.json | curl -sf -X PATCH -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" --data @- "https://api.supabase.com/v1/projects/<ref>/config/auth" -o /dev/null
```

Check with `curl -s -H "apikey: <publishable key>" https://<ref>.supabase.co/auth/v1/settings`,
which shows `"google": true`.

**Local stack:** copy `supabase/.env.example` to `supabase/.env` and fill in the `newton-dev`
client's ID and secret, then restart the stack. `supabase/config.toml` keeps Google off without it.

- **Same person:** Supabase Auth links a Google identity to the existing user with the same
  verified email, so Google and a magic link for one address land on the same `people` row.
- **Consent screen:** Google shows "continue to `<ref>.supabase.co`", since the callback is on
  Supabase's domain. A Supabase custom domain (paid add-on) would make it `heynewton.app`.
- **Renewal:** the client secrets don't expire. If one leaks, add a new secret on the client in
  Google Cloud, set it as above, then delete the old one.

## Supabase database passwords

- **Dev:** generated when `newton-dev` was created (Supabase → New project → Generate password),
  saved in the project password manager as "Supabase newton-dev database" and as the repo secret
  `SUPABASE_DEV_DB_PASSWORD`.
- **Prod:** generated the same way for `newton-prod`, saved in the password manager, and stored
  only in the `production` environment as `SUPABASE_PROD_DB_PASSWORD`.
- Both are reset in Supabase → Project Settings → Database. Update the secret right after.

## Resend SMTP keys

Supabase sends sign-in emails through Resend ([decision](decisions/0003-email-provider.md)). One
key per Supabase project, so revoking one doesn't break the other, each in its own Resend team
since #109 ([Dev Resend team](#dev-resend-team-109)).

- **Where:** Resend → API Keys → Create API key, in that environment's team.
- **Names:** `supabase-newton-prod` (prod team), `supabase-newton-dev` (dev team).
- **Permission:** Sending access (not Full access), domain `heynewton.app` (prod) or
  `dev.heynewton.app` (dev) only. The sender is `noreply@` that domain.
- **Expiry:** Resend keys don't expire. Rotate yearly; put the date in the project calendar.
- **Stored in:** pasted straight into Supabase → that project → Authentication → Emails → SMTP
  Settings (password field), with host `smtp.resend.com`, port `465`, user `resend`. Not saved
  anywhere else: a lost key is replaced, not recovered.

## Email-in (`RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `SUPABASE_SECRET_KEY`)

The `/api/email-in` webhook (#10) reads received mail from Resend and writes to the database
without a signed-in person. Setup steps are in [decision 0003](decisions/0003-email-provider.md#3b-email-in-webhook-10).

| Variable | Issued by | Permission | Stored in |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | Resend, key `email-in-newton-prod` in the prod team, `email-in-newton-dev` in the dev team (#109) | Full access: reading received emails needs more than "Sending access", and Full access is the narrowest that can. It reads only its own team's received mail | Vercel env vars of the deployment it belongs to, marked Sensitive. On `heynewton-web`, the Production target (the dev site) only: previews have no Resend key and answer 503 |
| `RESEND_WEBHOOK_SECRET` | Resend, per webhook endpoint (`whsec_…`) | Checks that a request comes from Resend | Same |
| `SUPABASE_SECRET_KEY` | Supabase, that project's secret API key | Bypasses row-level security; only `lib/db/email-in.ts`, `lib/db/reminders.ts` and (dev and previews) `lib/db/fixture-sign-in.ts` use it | Same. Never in the browser, never a `NEXT_PUBLIC_` variable |
| `INBOUND_EMAIL_DOMAIN` | — (not secret) | `boats.heynewton.app` on prod, `boats.dev.heynewton.app` on the dev site and previews (#109) | Same; on `heynewton-web`, Production and Preview |

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
| `RESEND_API_KEY` | Resend: the same key as email-in (see above), which can also send | Sending from that team's domain | Same |
| `REMINDERS_FROM` | — (not secret) | The sender. Unset: `Hey Newton <noreply@heynewton.app>` (prod). The dev site: `Hey Newton <noreply@dev.heynewton.app>`, the dev team's domain (#109) | Same |
| `SUPABASE_SECRET_KEY` | Supabase, that project's secret API key | Bypasses row-level security; only `lib/db/reminders.ts`, `lib/db/email-in.ts` and (dev and previews) `lib/db/fixture-sign-in.ts` use it | Same. Never in the browser, never a `NEXT_PUBLIC_` variable |
| `SITE_URL` | — (not secret) | Links in the email: `https://dev.heynewton.app` on dev (#106), `https://heynewton.app` on prod | Same |

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
unless a step says otherwise; **never reuse a dev key or value**. Steps 1–5 were done on 19 October 2026
(results on #63). Step 6 moved heynewton.app to prod on 20 October 2026 (#37); steps 1–3 show the values as first set
up, at the prod `vercel.app` URL, and step 6 says what changes.

**1. Supabase `newton-prod`**

- [x] Supabase → New project `newton-prod`, same organisation and the
      [settings chosen at creation](#supabase-project-settings-chosen-at-creation). Generate the
      database password and save it in the password manager as "Supabase newton-prod database".
- [x] Access token `github-actions-newton-prod`, as described under
      [Supabase access tokens](#supabase-access-tokens-supabase_dev_access_token-supabase_prod_access_token).
- [x] Authentication → URL Configuration: **Site URL** `https://heynewton-prod.vercel.app`,
      **Redirect URLs** `https://heynewton-prod.vercel.app/**` only (no previews, no dev site).
      Step 6 changes both to `https://heynewton.app`.
- [x] Authentication → Emails → SMTP: decision 0003, [step 6](decisions/0003-email-provider.md#6-supabase-newton-prod-63)
      (key `supabase-newton-prod`).

**2. GitHub environment `production`**

- [x] Repo settings → Environments → New environment `production`. Deployment protection rules:
      **Required reviewers** the maintainer, **Deployment branches** `main` only. Step 7 moved the
      reviewer to `production-migrations` (#120).
- [x] Environment secrets: `SUPABASE_PROD_ACCESS_TOKEN`, `SUPABASE_PROD_DB_PASSWORD`.
- [x] Environment variables: `SUPABASE_PROD_PROJECT_REF`, `SUPABASE_PROD_URL`
      (`https://<ref>.supabase.co`), `SUPABASE_PROD_PUBLISHABLE_KEY` (`sb_publishable_…`),
      `PROD_SITE_URL` (`https://heynewton-prod.vercel.app`; `https://heynewton.app` after step 6).
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
| `SITE_URL` | `https://heynewton-prod.vercel.app` (`https://heynewton.app` after step 6) |

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
- [x] Delete the test boat from `newton-prod`. Since #115, as its owner on the site: the boat's
      page → **Delete this boat** (`/boats/<boat id>/delete`), type its name. That removes its files
      from Storage and then its rows, and lists what it removed. (Before #115 this was by hand:
      the rows with SQL, the files in Supabase → Storage → `documents` → `<boat id>/`, since SQL
      can't delete storage objects; don't do that any more, a plain SQL delete leaves the files.)
      A team member's own account stays: it is their real prod login.

**6. Switch heynewton.app to prod (#37)**

In this order, so the domain is only off for the seconds between b and c, and every sign-in link
has somewhere valid to land. DNS shouldn't need to change: both projects are in the same Vercel
team, and the records on Cloudflare (apex **A** `216.198.79.65` and `64.29.17.65`, `www`
**CNAME** `a49833141f4b58b5.vercel-dns-017.com`, proxy off) belong to the domain, not a project.

- [x] a. Prepare prod. Nothing anyone sees changes yet:
  - Supabase → `newton-prod` → Authentication → URL Configuration → Redirect URLs: **add**
    `https://heynewton.app/**`, keeping `https://heynewton-prod.vercel.app/**` for now.
  - Vercel → `heynewton-prod` → Settings → Environment Variables: `SITE_URL` =
    `https://heynewton.app` (Production). It applies from the next deploy (e).
  - GitHub → Settings → Environments → `production` → variable `PROD_SITE_URL` =
    `https://heynewton.app`.
- [x] b. Vercel → `heynewton-web` → Settings → Domains: remove `www.heynewton.app` and
      `heynewton.app`. Or, with no gap at all, move it: done on 20 October with the Vercel API
      (`POST /v1/projects/heynewton-web/domains/heynewton.app/move`, body `{"projectId": <heynewton-prod's id>}`),
      which took `www` and its redirect along.
- [x] c. Straight away, Vercel → `heynewton-prod` → Settings → Domains → Add: `heynewton.app`
      (Production), then `www.heynewton.app` set to **redirect** to `heynewton.app` (308), as
      today. Both should show **Valid Configuration**. If Vercel asks for different records, set
      exactly those in Cloudflare → `heynewton.app` → DNS, proxy **off** (grey cloud), and leave
      the mail records (MX, SPF, DKIM, `_dmarc`, `boats`) alone.
- [x] d. Supabase → `newton-prod` → URL Configuration: **Site URL** `https://heynewton.app`;
      Redirect URLs `https://heynewton.app/**` only (remove the `vercel.app` one, so every link
      comes back to the public address). Supabase → `newton-dev` → Redirect URLs: remove
      `https://heynewton.app/**`.
- [x] e. Actions → the latest **Production** run → Re-run all jobs → approve. It redeploys with the
      new `SITE_URL` and checks that `/auth/fixture-sign-in` answers 404 on `https://heynewton.app`.
- [x] f. Check from outside: `https://heynewton.app` and `www` serve prod (fixture sign-in 404, no
      "Sign in as" on `/sign-in`); `https://heynewton-web.vercel.app` still serves dev with "Sign
      in as".
- [x] g. Sign in on `https://heynewton.app` with a team member's address: the email link opens
      `https://heynewton.app/auth/callback` and lands on your boats. A test boat made there shows
      up in `newton-prod` and not in `newton-dev`. Delete it as in step 5.

Unchanged by the switch: Resend's sending domain and the SMTP settings (the sender is
`noreply@heynewton.app` either way, and the sign-in email's link is `{{ .ConfirmationURL }}`, built
from the redirect URL the site sends); the prod email-in webhook at
`https://heynewton-prod.vercel.app/api/email-in`, a URL that stays prod's; the reminders cron,
which runs on whichever deployment is production; and everything on dev. To undo, put both domains
back on `heynewton-web` and `https://heynewton.app/**` back on `newton-dev`'s redirect list.

**7. Approval only when migrations are pending (#120)**

The Production workflow's first job (environment `production`) checks the settings and lists the
migrations `newton-prod` hasn't applied; a gate job in `production-migrations` waits for approval
only when there are some; the release job (environment `production`) applies them and deploys
([process.md](process.md#production)). In this order, so migrations never release without a gate:

- [ ] a. Before merging the #120 PR: Repo settings → Environments → New environment
      `production-migrations`. **Required reviewers** the maintainer; **Deployment branches**
      `main` only; no secrets, no variables. It must exist first: a workflow that names a missing
      environment creates it with no protection.
- [ ] b. Merge the #120 PR. Its own release still asks on `production` (on the check and on the
      release job) and, if a migration is pending, on `production-migrations` too.
- [ ] c. Only then: Environments → `production` → remove the required reviewer. Keep
      **Deployment branches** `main` only and every secret and variable.
- [ ] d. The next merge with no migration reaches heynewton.app without a click (run summary:
      "No migrations pending"). The next one with a migration waits on `production-migrations`
      and its summary lists the files.

**8. Before anyone outside the team signs up, or an app-store release**

- [ ] Approve every release again: Environments → `production` → **Required reviewers**: add the
      maintainer. The gate on `production-migrations` stays as it is. Do this before sign-up opens
      to outsiders (#33) or the app ships to an app store, and note the date here.
