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
