## Every token written down, so prod gets the same ones

**Prompt**

````text
write details on token in repo so that we can have exact same for prod
````

Before this, while setting up the hosted dev database (#60), the maintainer asked:

````text
checked or not
````

(about Supabase's Data API options),

````text
gh token is from my personal user or from org?
````

and shared screenshots of Supabase's token permissions form, asking which permissions to choose.

**What Claude did**

- Added `docs/tokens.md`. It lists every secret and variable the automation uses (`VERCEL_TOKEN`,
  `PROJECT_TOKEN`, the Supabase access token, the database passwords and the project ref) with
  who issued it, who owns it, its scope, permissions, expiry and where it's stored. No values.
- Recorded the Supabase dev token exactly as created: `newton-dev` only, 90 days, write access
  to Migrations, read access to Project Settings, Connection Pooling, Data API Config and Storage
  Config, everything else None. Also recorded how to create the prod token as an exact copy,
  limited to `newton-prod` and stored only in the GitHub `production` environment.
- Recorded the Supabase project settings chosen at creation (Data API on, new tables not exposed
  automatically, automatic RLS on) to reuse for prod.
- Linked it from `docs/maintainers.md`. That section also said `PROJECT_TOKEN` was on a project
  account, which isn't true: GitHub tokens always belong to a person, so Claude corrected it.

**What changed along the way**

- Only the Supabase dev token's settings could be confirmed, from the creation screen. The names
  and expiry dates of `VERCEL_TOKEN` and `PROJECT_TOKEN` are what the setup steps suggested, and the
  doc says so, so the maintainer can check them on the token pages.
- Merged `main` in, which had added #64's entry. Moved #64 from **In progress** to "Repo and
  infrastructure" in `docs/history.md`, now that it merged, and added this PR under **In progress**.

**Pull request:** [#65](https://github.com/heynewton/newton/pull/65)

## A hosted dev database, migrated and seeded from main

**Prompt**

````text
SUPABASE_ACCESS_TOKEN, SUPABASE_DEV_DB_PASSWORD and SUPABASE_DEV_PROJECT_REF are saved. Start #60 and #61 in parallel sessions.
````

**What Claude did**

- Added `.github/workflows/dev-database.yml`, in the `dev` environment. On every push to `main` it
  links `newton-dev`, runs `supabase db push` and then loads `supabase/seed.sql` with `psql`
  through the project's connection pooler (GitHub runners have no IPv6, which the direct database
  host needs). A failed migration or seed fails the run.
- On PRs that touch `supabase/` or `fixtures/sample-boat/`, the same workflow runs a **Dry run
  against dev**: link, `supabase db push --dry-run`, and, when dev already has every migration, the
  seed inside a transaction that is rolled back. Nothing in dev changes. Forks skip it.
- Made the seed safe to re-run: `build-seed.mjs` now writes `on conflict` clauses, so existing
  sign-in rows are left alone and the boat, memberships and records are reset to `boat.json`.
  CI's database job loads the seed a second time to prove it.
- `docs/architecture.md` and `docs/process.md` say where dev lives, how it's updated, that it only
  holds fixture data, and that the hosted projects don't expose new tables the way the local stack
  does, so every migration grants explicitly.

**What changed along the way**

- The plan was `supabase db push --include-seed`. Tried locally, it loads the seed only the first
  time; after the seed changes it only records the new file hash and never runs it again. So the
  workflow runs the seed itself.
- The session hit a usage limit halfway through and was resumed later.

**Pull request:** [#68](https://github.com/heynewton/newton/pull/68)
