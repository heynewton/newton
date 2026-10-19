## Document links open on the dev site

**Prompt**

````text
After PR #82 (heynewton/newton) merges, the hosted dev Supabase project (newton-dev) gets the
sample boat's 4 `documents` rows via `psql -f supabase/seed.sql` in
`.github/workflows/dev-database.yml`, but no files in its private `documents` bucket, so the
record "From …pdf" links fail on dev. Add a step to dev-database.yml (push to main only) that
uploads `supabase/storage/documents/<boat_id>/*.pdf` (symlinks to fixtures/sample-boat/documents)
into the dev bucket at `<boat_id>/<name>.pdf`, e.g. `npx supabase seed buckets --linked` or a small
upload with the dev secret key if the access token lacks permissions (#68 found it missing
api_gateway_keys_read). Must be safe to re-run (upsert). Update docs/tokens.md if a new secret is
needed, docs/architecture.md Dev database row, fixtures/sample-boat/README.md (it says dev gets
rows but not files). Open an issue + PR per the ship-change skill. Done when: after a push to main,
signing in to the dev site as a fixture user and opening a record's document link opens the PDF
(or, if untestable, the PR says exactly what wasn't tested).
````

**What Claude did**

- Opened #91 and added one step to the Dev database workflow, on pushes to `main` only:
  `npx supabase seed buckets --linked --yes`, after the seed. It uploads the folder from #82's
  `objects_path` to `<boat_id>/<name>.pdf` in the dev bucket.
- Checked in the CLI that seeded objects are uploaded with `x-upsert`, so re-runs overwrite.
- Checked with `--debug` that `--linked` gets the secret key from the same API keys endpoint
  `supabase link` already calls in this job. The token got that permission in #60, so no new
  secret or permission is needed. `docs/tokens.md` gives this as a second reason for it.
- Updated the architecture page's Dev database row and the sample boat README.

**What changed along the way**

- #82 hadn't merged yet, so the PR is stacked on its branch and gets retargeted to `main` after.
- The real upload to `newton-dev` couldn't be run from the session (no dev secrets, and the proxy
  blocks `api.supabase.com`). The PR says what still needs checking after the first push to `main`.

**Pull request:** [#92](https://github.com/heynewton/newton/pull/92)
