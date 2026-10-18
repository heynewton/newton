# Sample boat: Kittiwake

**Everything in this folder is made up.** The boat, people, companies, addresses, phone numbers,
policy, registration and hull numbers are invented for tests and demos. Email addresses use the
reserved `example.com`, `example.net`, `example.org` and `.test` domains, and phone numbers use the
fictional 555-01xx range. Never add real boat data here (see the repo rules in `CLAUDE.md`).

## The boat and its people

`boat.json` holds the boat and who is on it, shaped like the planned `boats`, `people` and
`memberships` tables (see `docs/architecture.md`).

| Person | Role | Ownership | Verified sender addresses |
| --- | --- | --- | --- |
| Alex Sample | owner | 40% | alex@example.com, alex.sample@example.org |
| Sam Placeholder | co-owner | 35% | sam@example.net |
| Jordan Fictional | co-owner | 25% | jordan@example.com |
| Riley Testcase | crew | 0% | riley@example.org |

Kittiwake is a 2009 Example Yachts EY 34 sloop with a Sample Marine SM-30 diesel (1,412 engine
hours on 2026-10-02). Its inbound address is `kittiwake@in.heynewton.test`.

`supabase/seed.sql` is generated from `boat.json`, so `npm run db:reset` loads the boat, its people
and their memberships into the local database. Each person signs in with their first verified
sender address. Ownership shares aren't seeded yet: they wait for the cost-split tables (#9).

## Documents

Each document has a text source (`documents/*.txt`) and a generated one-page PDF next to it.

| Document | What tests can use it for |
| --- | --- |
| `insurance-certificate` | Renewal: policy expires 2027-04-30. Premium $1,284.00. |
| `registration` | Renewal: expires 2026-12-31, soon after the fixture's "today" in October 2026. |
| `yard-invoice` | Expense: $1,676.90 paid by Sam, which doesn't split evenly 40/35/25. Maintenance: next oil change at 1,512 hours or 2027-10-02. |
| `manual-excerpt` | Q&A over manuals: maintenance intervals by hours and months, oil capacity. |

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

After changing `boat.json`, also regenerate the database seed (CI fails if it is out of date):

```bash
node fixtures/sample-boat/build-seed.mjs
```

The output is deterministic, so a rebuild without changes leaves the files untouched.
