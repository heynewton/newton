# Sample boat: Test boat

**Everything in this folder is made up.** The boat, people, companies, addresses, phone numbers,
policy, registration and hull numbers are invented for tests and demos. Email addresses use the
reserved `example.com`, `example.net`, `example.org` and `.test` domains, and phone numbers use the
fictional 555-01xx range. Never add real boat data here (see the repo rules in `CLAUDE.md`).

## The boat and its people

`boat.json` holds the boat, who is on it, its documents and the boat's records, shaped like the
`boats`, `people`, `memberships`, `documents`, `renewals`, `maintenance_items` and `expenses` tables
(see `docs/architecture.md`). Records filed from a fixture document name it in `sourceDocument`.

| Person | Role | Ownership | Verified sender addresses |
| --- | --- | --- | --- |
| Alex Sample | owner | 40% | alex@example.com, alex.sample@example.org |
| Sam Placeholder | co-owner | 35% | sam@example.net |
| Jordan Fictional | co-owner | 25% | jordan@example.com |
| Riley Testcase | crew | 0% | riley@example.org |

Test boat is a 2009 Example Yachts EY 34 sloop with a Sample Marine SM-30 diesel (1,412 engine
hours on 2026-10-02). Its inbound address is `test-boat@in.heynewton.test`: the seed gives the boat the
alias `test-boat`, and `INBOUND_EMAIL_DOMAIN=in.heynewton.test` locally (real boats get a random
suffix). Each person's first verified sender address is the one they sign in with; the others are
seeded as verified `sender_addresses`, so Alex's second address files mail too.

`supabase/seed.sql` is generated from `boat.json`, so `npm run db:reset` loads the boat, its people,
their memberships with ownership shares, its documents and its records into the local database.
Each person signs in with their first verified sender address.

The document files go into the private `documents` bucket at `<boat_id>/<name>.pdf`, the path each
document row gives, so the records' "From …pdf" links open. `build-seed.mjs` writes
`supabase/storage/documents/<boat_id>/` as symlinks to the PDFs here, and
`[storage.buckets.documents]` in `supabase/config.toml` makes the Supabase CLI upload that folder on
`npm run db:start` and `npm run db:reset`. If a reset stops at "Restarting containers" because
Storage was slow to come back, `npx supabase seed buckets` uploads the files on their own. The hosted
dev database gets both: the Dev database workflow loads `seed.sql`, then uploads the same folder
with `npx supabase seed buckets --linked` on every push to `main`.

### Signing in as one of them on the dev site or a preview

Their addresses can't receive mail, so the sign-in link never arrives. On the dev site and PR
previews, `/sign-in` has a "Sign in as a sample-boat person" section: pick Alex, Sam, Jordan or
Riley and you are signed in straight away and land on Test boat's page, with no email sent. It is
there because the Deploy workflow sets `FIXTURE_SIGN_IN=1`; it needs `newton-dev`'s secret key in
Vercel (see "Fixture sign-in" in `docs/tokens.md`) and is never on production. Locally, set
`FIXTURE_SIGN_IN=1` and `SUPABASE_SECRET_KEY` (from `npx supabase status`) in `apps/web/.env.local`
to get the same option against the local database.

## Records

| Kind | What's there |
| --- | --- |
| Renewals | Insurance (expires 2027-04-30) and registration (2026-12-31) from the documents, plus a made-up VHF licence (2028-03-15). |
| Maintenance | Oil and filter, fuel filter and impeller done at the yard on 2026-10-02 at 1,412 hours, with the manual's intervals; made-up history for the heat-exchanger anodes (due 2026-10-18 or 1,471 hours), coolant and valve clearance (hours only). |
| Expenses | The yard invoice ($1,676.90, Sam), the insurance premium ($1,284.00, Alex), the registration fee ($98.00, Jordan) and a made-up mooring fee ($420.00, Alex), all USD. |

## Documents

Each document has a text source (`documents/*.txt`) and a generated PDF next to it. A form feed
on its own line starts a new PDF page: the manual excerpt has two (6.1-6.2, then 6.3-6.5), so
search tests can check page numbers.

| Document | What tests can use it for |
| --- | --- |
| `insurance-certificate` | Renewal: policy expires 2027-04-30. Premium $1,284.00. |
| `registration` | Renewal: expires 2026-12-31, soon after the fixture's "today" in October 2026. |
| `yard-invoice` | Expense: $1,676.90 paid by Sam, which doesn't split evenly 40/35/25. Maintenance: next oil change at 1,512 hours or 2027-10-02. |
| `manual-excerpt` | Q&A over manuals: maintenance intervals by hours and months, oil capacity. |
| `sail-loft-invoice` | Filing eval only (not in `boat.json` or the seed): a French invoice written the European way, `EUR 1.260,80` on `03.09.2026`, so filing has to read the document's separators and date order. |

## Emails

`emails/*.eml` are inbound messages to the boat's address, each with PDFs attached.

| File | From | Expected handling |
| --- | --- | --- |
| `01-insurance-certificate.eml` | Alex (forwarded from the insurer) | File the certificate, add the renewal |
| `02-registration.eml` | Jordan | File the registration, add the renewal |
| `03-yard-invoice.eml` | Sam (forwarded from the yard) | File the invoice, add the expense and maintenance done |
| `04-engine-manual.eml` | Alex, from a second verified address | File the manual excerpt for Q&A |
| `05-unknown-sender.eml` | Not a member of the boat | Hold, don't file |

## Changing the fixtures

Edit `documents/*.txt` (plain ASCII, one page of at most 56 lines) or the email list in
`build.mjs`, then rebuild the PDFs and emails from the repo root and commit everything:

```bash
node fixtures/sample-boat/build.mjs
```

After changing `boat.json` or a PDF, also regenerate the database seed (CI fails if it is out of
date, and the seed records each PDF's size):

```bash
node fixtures/sample-boat/build-seed.mjs
```

The output is deterministic, so a rebuild without changes leaves the files untouched.
