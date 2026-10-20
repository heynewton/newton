## Export all of a boat's data

**Prompt**

Started by another Claude Code session, which wrote (its background paragraph on the project is
left out):

````text
Build issue #16, "Export all of a boat's data". Read the issue, the schema migrations, apps/web's boat pages and data access, and /privacy, from up-to-date origin/main.

Done when (from the issue): an owner or co-owner can download, from the boat's page, one archive (zip) with every record of that boat as JSON (one file per table, plus a manifest with the export date, boat, schema version and file list) and every stored file; only owners and co-owners can export (enforced on the server and by RLS, crew and read-only can't); the format is described in docs/export.md so another tool or a buyer can read it.

Decide what's excluded and say why in docs/export.md (for example embeddings, which can be recomputed, and other people's private data beyond what the boat shares, such as other members' sign-in details). Stream the archive or bound its size so a large boat doesn't time out on Vercel, and say what the limit is. If you need a migration, name it `supabase/migrations/20261022110000_boat_export.sql` with explicit grants like the others; prefer none.

Tests: unit tests for the archive building, and a check against the local stack with the sample boat (its files included) that the archive has every table and file and nothing from another boat. Run npm run check, the database tests and the build. Update /privacy's export wording if it's now inaccurate. Add your build-log and history files, open the PR with `Closes #16`, and stop. Don't merge. Report the PR link, the size limit, what's excluded, and any questions.
````

**What Claude did**

- Added `GET /boats/<id>/export`, which streams a zip: `data/<table>.json` for the boat, people
  (ID and name only), memberships, documents, renewals, maintenance items, expenses and inbound
  emails; every stored file at `files/<storage path>`; and `manifest.json`, written last, with
  the export date, boat, who exported it, the format version, each table's row count and each
  file's size and SHA-256.
- Built the archive with `fflate` in `src/lib/export/archive.ts`, pulled entry by entry as the
  browser downloads it, so one file at a time is in memory and a slow download slows the reads
  from Storage. A file that can't be read fails the download rather than ending a partial zip.
- `src/lib/db/export.ts` reads everything as the signed-in person under RLS (no secret key),
  page by page past PostgREST's 1000-row limit, after checking they are an owner or co-owner
  of the boat. Crew and read-only members get 403 and no button; non-members get 404.
- Capped an export at 500 MB of stored files, so it ends inside Vercel's 300-second function
  limit on a slow connection. A boat over it sees a note to write to us, and the route answers 413.
- Added a "Your boat's data" section with the download button to the boat page, for owners and
  co-owners, showing the size of the files.
- Wrote `docs/export.md` (layout, every table, the manifest, what is left out and why, the size
  limit, a reading example), updated `/privacy`'s export wording and `docs/architecture.md`.
- Unit tests for the archive (tables, files, manifest, checksums, empty boat, one file opened at
  a time, a failing file, path cleaning, the file name). Against a private local stack with the
  sample boat and a second boat Alex also owns: the archive has every table, all four PDFs with
  matching sizes and checksums, nothing from the second boat and no email addresses; crew gets
  403, a co-owner can export, signed out redirects, another boat is 404; `unzip -t` reads it.

**What changed along the way**

- No migration. RLS can't stop crew from exporting rows it may already read one by one, so the
  owner and co-owner rule is the server's, while RLS bounds what any export can contain.
  Held mail, which only owners and co-owners can read, is in the archive because of RLS. The PR
  asks whether a database-level gate is wanted anyway.
- `reminders_sent` and `sender_addresses` are left out: RLS shows each person only their own
  rows, and they are about people's inboxes, not the boat. Other members' email addresses are
  left out too; the PR asks whether co-owners should get them.
- The manifest has a format version rather than the database's migration version, so other
  PRs adding migrations don't have to touch the export.

**Pull request:** [#PR](https://github.com/heynewton/newton/pull/PR)
