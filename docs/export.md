# Boat export format

Owners own their data (principle 5). An owner or co-owner of a boat can download everything
Newton holds for that boat as one zip archive, from the boat's page ("Your boat's data" →
"Download all data"), to keep a copy, move to another tool, or hand to a buyer. This page
describes the archive so another program, or a person with a text editor, can read it.

The code is `apps/web/src/lib/export/archive.ts` (the archive) and `apps/web/src/lib/db/export.ts`
(what goes in it), served by `GET /boats/<boat_id>/export`.

## Who can export

Only the boat's **owners and co-owners**. Crew and read-only members don't see the button, and the
route answers 403 if they call it; someone who isn't on the boat gets 404, like the boat's page.

The export reads the database and the file store as the person exporting, never with the server's
secret key, so row-level security applies to every query: the archive can only contain rows and
files of that one boat, and only those the person is allowed to read. That is also why held mail
(mail from people who aren't on the boat, which only owners and co-owners can see) is in it.

## Layout

```
kittiwake-export-2026-10-20.zip
├── data/
│   ├── boat.json
│   ├── people.json
│   ├── memberships.json
│   ├── documents.json
│   ├── renewals.json
│   ├── maintenance_items.json
│   ├── expenses.json
│   └── inbound_emails.json
├── files/
│   └── <boat_id>/…            every stored file, at its storage path
└── manifest.json              written last
```

Files under `data/` are JSON arrays of objects, one object per row, UTF-8, pretty-printed.
`boat.json` is an array with the one boat. An empty table is `[]`.

### The tables

Each record table is exported with **every column** of every row whose `boat_id` is the boat's, so
a column added by a later migration appears without a format change. Column names and meanings are
those of the database; the migrations in `supabase/migrations/` describe each one. In short:

| File | What it holds |
| --- | --- |
| `boat.json` | The boat: `id`, `name`, `email_alias` (the part of its Newton email address before the @), `created_at`. |
| `people.json` | Everyone the other files refer to (members, expense payers, who added a document, who sent filed mail): `id` and `display_name` only. A former member who is no longer on any of the exporter's boats appears as an ID in the other files without a row here. |
| `memberships.json` | Who is on the boat: `person_id`, `role` (`owner`, `co_owner`, `crew`, `read_only`), `ownership_share` (only the ratio between shares matters), `created_at`. |
| `documents.json` | One row per stored file: `id`, `storage_path`, `type`, `source` (`email` or `upload`), `received_at`, `filename` (as sent), `content_type`, `size_bytes`, `added_by`, `inbound_email_id`. |
| `renewals.json` | Insurance, registration and licences: `kind`, `title`, `reference`, `expires_on`, `notes`, `document_id`. |
| `maintenance_items.json` | `title`, `every_months` and/or `every_engine_hours`, `last_done_on`, `last_done_engine_hours`, `notes`, `document_id`. |
| `expenses.json` | `description`, `amount_cents` (integer, negative for a refund), `currency` (ISO 4217), `spent_on`, `paid_by` (a person ID), `notes`, `document_id`. |
| `inbound_emails.json` | Mail sent to the boat's address: sender address and name, subject, `received_at`, `status` (`filed` or `held`), the member who sent it, attachment count. Held mail's content was never downloaded, so only this row exists for it. |

Conventions: IDs are UUIDs; `document_id`, `paid_by` and the like point at the `id` of a row in
another file. Dates (`expires_on`, `spent_on`, `last_done_on`) are calendar dates, `YYYY-MM-DD`.
Times (`created_at`, `received_at`) are ISO 8601 with a time zone. Money is integer cents with a
currency code, never a float. Engine hours are numbers in tenths, like the meter.

### The files

Every file in `documents.json` is in the archive at `files/<storage_path>`, byte for byte as
stored (email-in keeps the original message as an `.eml` file next to its attachments). Paths are
cleaned so they can't unpack outside the folder: no leading `/`, no `..`, no control characters.
If two paths clean up to the same name, the second gets ` (2)` appended. The manifest gives each
file's path in the archive with its document ID, so use the manifest rather than rebuilding paths.

### manifest.json

```json
{
  "format": "newton-boat-export",
  "format_version": 1,
  "exported_at": "2026-10-20T09:30:00.000Z",
  "boat": { "id": "00000000-0000-4000-8000-000000000001", "name": "Kittiwake" },
  "exported_by": { "person_id": "00000000-0000-4000-8000-000000000101", "role": "owner" },
  "tables": [{ "name": "expenses", "path": "data/expenses.json", "rows": 4 }],
  "files": [
    {
      "path": "files/00000000-0000-4000-8000-000000000001/yard-invoice.pdf",
      "document_id": "00000000-0000-4000-8000-000000000603",
      "size_bytes": 2814,
      "sha256": "…"
    }
  ],
  "excluded": ["document_chunks: …"]
}
```

- `format_version` is the version of this layout. It goes up only when a reader would break: a file
  renamed or removed, or a field whose meaning changes. New tables and new columns don't change it.
- `exported_at` is when the export started. The tables are read one after another, not in one
  transaction, so a change made during the export may show in one file and not another.
- `files` lists every file with its size and SHA-256, to check the archive is complete and intact.
- `manifest.json` is written **last**. An archive without it was cut off and is incomplete.

## What is left out, and why

| Left out | Why |
| --- | --- |
| `document_chunks` (manual passages and their embeddings) | Derived data: Newton recomputes it from the files, which are in the archive. Embeddings are specific to the model that made them and of no use elsewhere. |
| People's email addresses and sign-in details (`people.email`, `auth_subject`, Supabase Auth records) | Personal to each member, not the boat's. The boat's records refer to people by ID and name, which is enough to read them. The exporter's own account data is part of a personal data request, not the boat export. |
| `sender_addresses` | The other addresses a person forwards mail from: personal to that person, and RLS shows each person only their own. |
| `reminders_sent` | The log of which reminder emails went to whom, kept so nobody is reminded twice. It is about each recipient's inbox, not the boat, and RLS shows each person only their own. |
| The content of held mail | Never stored: Newton keeps only the sender, subject and attachment count, which are in `inbound_emails.json`. |
| Files with no `documents` row | None should exist: a stored file always gets its row (email-in retries until it does). The export follows the rows. |

## Size limit

One export holds at most **500 MB of stored files** (the sum of `documents.size_bytes`). The archive
streams: the server reads one file at a time and sends it as the browser downloads it, so a boat's
size doesn't fill memory. What bounds it is time: the route runs on Vercel, where a function stops
after 300 seconds, and the download goes at the speed of the person's connection; 500 MB leaves room
at about 2 MB/s. The zip format's 4 GiB limit (fflate doesn't write ZIP64) is far above it.

A boat over the limit doesn't get the button: its page says so and asks the owner to write to
privacy@heynewton.app, and the route answers 413. Above that size, the export would need to be built
in the background and stored for download, which isn't built (see the PR for #16).

The JSON files are compressed (deflate); stored files are kept as they are, since PDFs and photos
are already compressed.

## Reading an archive

Any unzip tool opens it. In a script: read `manifest.json`, load each path in `tables`, and use
`files` to find each document's file. For example, every expense with the file it came from:

```js
const manifest = JSON.parse(read("manifest.json"));
const expenses = JSON.parse(read("data/expenses.json"));
const fileOf = new Map(manifest.files.map((f) => [f.document_id, f.path]));
for (const e of expenses) console.log(e.spent_on, e.amount_cents / 100, e.currency, fileOf.get(e.document_id));
```

Newton can't import an archive yet. When a boat is sold, its record is meant to move to the buyer
inside Newton, which isn't built yet; until then the archive is how a buyer gets the history.
