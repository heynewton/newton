## Renewals, maintenance and expenses stored per boat

**Prompt**

````text
start 24, 8 and 9 in 3 parallel sessions
````

The session that got the prompt started this one with issue #9 and the coordination rules for
working next to #8: #8 owns the `documents` table and the earlier migration timestamp, this PR owns
`supabase/seed.sql`, and `document_id` becomes a foreign key once #8 has merged.

**What Claude did**

- Read the inputs of `calc`'s due dates (#40) and cost split (#39) first, then shaped the tables to
  match: `renewals` with an expiry date, `maintenance_items` with an interval in months and/or engine
  hours plus the last-done date and reading, `expenses` in integer cents with a currency and a payer.
  A reader only renames columns.
- Added `ownership_share` to `memberships`, which the cost split needs and #43 had left for this PR.
- Row-level security reuses `can_read_boat()` and `can_write_boat()` from #41: the same four
  policies on each table. 43 new pgTAP tests in `supabase/tests/database/records.test.sql`.
- Added Kittiwake's renewals, maintenance and expenses to `boat.json`, mostly from the fixture
  documents (the yard invoice, the insurance certificate, the registration and the manual's
  intervals), and extended `build-seed.mjs` to write them and the ownership shares into the seed.
- Checked that the seeded rows go straight into `findDue` and `splitCosts` with a throwaway script.

**What changed along the way**

- Another session already had a local Supabase stack running under the default project name, so
  Claude ran its database from a scratch copy of `supabase/` with its own project name and ports.
- The payer is checked by a trigger rather than a foreign key to `memberships`, so an expense stays
  when its payer later leaves the boat and past splits don't change.
- #8's PR (#52) hadn't merged when this PR opened, so `document_id` started as a plain column.
  After #52 merged, Claude rebased, made `document_id` a foreign key and switched the tests to #52's
  shared `setup/tenancy.psql`. The foreign key covers `(document_id, boat_id)`, so a record can't
  point at another boat's document, and deleting a document clears only `document_id`
  (`on delete set null (document_id)`, Postgres 15 and later) and keeps the record.
- The seed leaves `document_id` null: the sample documents aren't seeded yet.

**Pull request:** [#54](https://github.com/heynewton/newton/pull/54)
