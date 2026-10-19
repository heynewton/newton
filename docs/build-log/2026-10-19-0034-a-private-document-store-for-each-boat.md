## A private document store for each boat

**Prompt**

````text
start 24, 8 and 9 in 3 parallel sessions
````

**What Claude did**

- Started one session per issue. This entry is the one for
  [#8](https://github.com/heynewton/newton/issues/8) (the per-boat document store).
- Added `supabase/migrations/20261019100000_documents.sql`:
  - A private Storage bucket, `documents`, with one folder per boat (`<boat_id>/...`).
  - A `documents` table: boat, storage path, type, source (email or upload), received date,
    filename, content type, size and who added it.
  - Row-level security on both, reusing the roles from #41: members read; owners, co-owners and
    crew add; owners and co-owners delete; read-only members only read.
- Added 32 database tests in `supabase/tests/database/documents.test.sql`, covering every role and
  signed-out visitors, for both the table and the bucket.
- Updated `docs/architecture.md` with the document store.

**What changed along the way**

- The issue asked the tests to reuse the existing tenancy setup, which lived inside
  `rls.test.sql`. Claude moved it into `supabase/tests/database/setup/tenancy.psql` and both test
  files include it. Claude first checked that `supabase test db` follows `\ir` includes and doesn't
  run the `.psql` file as a test.
- Files have no update policy, so a stored document can't be overwritten: a correction is a new
  file. Only a document's type and filename can be changed after it's added.
- The first test run failed because the test chose a document's `id`, which the column grants
  didn't allow. Claude allowed it, so an upload path can include the document's id before the row
  exists.
- CI starts only Postgres, not the Storage API, so the storage policies are tested by writing
  `storage.objects` rows as the signed-in person. No real upload went through the API yet. The PR
  says so.
- Deleting a boat removes its document rows but not its files, since files can only be removed
  through the Storage API. Noted for export and transfer (#16).
- The two parallel sessions agreed up front: #8 keeps the `documents` name and an `id uuid` key
  for #9 to reference, uses the earlier migration timestamp, and leaves `supabase/seed.sql` to #9.
  Seeding sample documents is a follow-up.

**Pull request:** [#52](https://github.com/heynewton/newton/pull/52)
