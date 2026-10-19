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
| `SUPABASE_DEV_ACCESS_TOKEN` | secret | Supabase | Project Supabase account | Dev database workflow (#60) | Repo secrets |
| `SUPABASE_DEV_DB_PASSWORD` | secret | Supabase | `newton-dev` project | Dev database workflow (#60) | Repo secrets, and the project password manager |
| `SUPABASE_DEV_PROJECT_REF` | variable | Supabase | `newton-dev` project | Dev database workflow (#60) | Repo variables (not secret) |
| Prod equivalents | secrets | Supabase | `newton-prod` project | Production release (#63) | The `production` environment only |
| Resend SMTP keys | secret | Resend | Project Resend account (Free) | Supabase Auth SMTP of `newton-dev` and `newton-prod` (#61, #63) | That project's SMTP settings only, not GitHub |

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
| Application services | API Keys | Read | `supabase link` reads the project's API keys; without it, link fails with "Missing required permission(s): api_gateway_keys_read" (#60) |
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
- **Later (#10):** the inbound webhook adds a key that can read received mail, and the webhook
  signing secret, both in Vercel's environment variables. Add them here then.


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
