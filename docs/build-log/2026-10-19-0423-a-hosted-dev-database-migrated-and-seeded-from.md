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
