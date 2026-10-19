## Sample documents seeded with the boat

**Prompt**

````text
Make `npm run db:reset` seed Kittiwake's four sample documents. That means both the `documents`
rows and the files in the private `documents` storage bucket, with the renewals, maintenance items
and expenses linked to them through `document_id`, following each record's `sourceDocument` in
fixtures/sample-boat/boat.json. Today every record on the boat page (PR #70, #15) says "No source
document linked" after a reset.

Area: fixtures/sample-boat/build-seed.mjs (generates supabase/seed.sql), supabase/config.toml
(look at `[storage.buckets.documents] objects_path`, but the bucket is created by migration
20261019100000_documents.sql, so check whether the two conflict), and
fixtures/sample-boat/README.md. Storage paths must be `<boat_id>/<file>.pdf`. Keep the generated
output deterministic, and keep CI's seed-is-up-to-date check passing.

Done when: after a fresh `db:reset`, signing in as alex@example.com and opening a record's
"From …pdf" link on /boats/<id> opens the PDF. Open a PR with an issue, following the ship-change
skill.

Coordinate first: check whether #13 (manual indexing) or #60 (dev database seed via psql) already
changed build-seed.mjs or the seed.
````

**What Claude did**

- `boat.json` gets a `documents` list: the four fixture PDFs with fixed IDs, their type
  (insurance, registration, invoice, manual), source `email` and the arrival time of the sample
  email that carried them.
- `build-seed.mjs` writes the `documents` rows (path `<boat_id>/<name>.pdf`, filename, content
  type and the PDF's size) and sets `document_id` on every renewal, maintenance item and expense
  that names a `sourceDocument`. An unknown name fails the build. Like the rest of the seed since
  #60, the rows are upserts, so the hosted dev project can load it again.
- The files: `[storage.buckets.documents]` in `supabase/config.toml` makes the Supabase CLI
  upload `supabase/storage/documents` on start and reset. `build-seed.mjs` fills that folder with
  relative symlinks to the fixture PDFs, so the PDFs stay the only copy. CI's seed check now
  covers the folder too.
- The bucket and its policies still come from the migration. The CLI updates an existing bucket
  rather than creating it, and the config says `public = false` to match.

**What changed along the way**

- #60 (the seed as upserts) and #13 (a two-page manual excerpt, so a new file size) merged while
  this was in progress, so the change was rebased on them.
- On a busy machine, `db reset` sometimes timed out waiting for Storage to restart, before the
  upload step. `npx supabase seed buckets` uploads the files on their own, and the README says so.
- The hosted dev project gets the document rows but not the files. Uploading them there is left
  for a follow-up, because the dev token couldn't be tested from here.

**Pull request:** [#82](https://github.com/heynewton/newton/pull/82)
