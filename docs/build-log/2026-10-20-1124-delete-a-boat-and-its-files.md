## Delete a boat, and its files in Storage with it

**Prompt**

Started by another Claude Code session, which wrote (its background paragraph on the project is
left out):

````text
Build issue #115, "Deleting a boat also deletes its files in Storage". Read the issue, the schema, Storage policies, apps/web's boat pages and data access, and docs/tokens.md's cleanup steps, from up-to-date origin/main.

Done when (from the issue): one server-side "delete this boat" path removes the boat's rows and every file under its Storage folder, and reports what it removed; only the boat's owners can run it (RLS plus a check in the server code; co-owners, crew and read-only can't); nothing of the boat is left in the database or Storage afterwards; docs/tokens.md's manual cleanup points at it.

Order it so a failure can't leave rows pointing at missing files in a way the app breaks on (for example delete files first and retry-safe, or mark the boat as deleting first; explain the choice). Add a small UI on the boat's settings or page with a clear confirmation (type the boat's name), behind owner-only access. If you need a migration, name it `supabase/migrations/20261022120000_boat_delete.sql` with explicit grants like the others.

Tests: pgTAP for who may delete, and a check against the local stack with the sample boat's files that nothing remains in either the database or Storage, and another boat is untouched. Run npm run check, the database tests and the build. Add your build-log and history files, open the PR with `Closes #115`, and stop. Don't merge. Report the PR link, the failure-ordering choice, and any questions.
````

**What Claude did**

- Read the tenancy, documents, records, email-in and reminders migrations. Every boat-scoped
  table already cascades from `boats`, so only the files needed new work. Storage refuses direct
  SQL deletes, so the files have to go through the Storage API.
- Used both of the prompt's options: mark the boat first, then delete files, then rows.
  - `begin_boat_deletion()` sets `boats.deleting_since` and lists the folder's files.
  - The server removes them with the Storage API as the signed-in owner.
  - `delete_boat()` refuses while a file is left, then deletes the boat and returns row counts.
  - The mark makes `can_write_boat()` false, and the boat page shows "being deleted" instead of
    dead links. Every step can be re-run.
  - `authenticated` lost `DELETE` on `boats`, so the old "SQL delete leaves files" path is closed.
- Added `deleteBoat()` to `lib/db`. It runs with the owner's session (RLS everywhere), not the
  secret key. Also added an owner-only `/boats/<id>/delete` page that asks for the boat's name
  and lists what was removed, and a footer link on the boat page.
- Wrote pgTAP tests (24) for who may delete, the order of the steps, and nothing left behind.
  Wrote unit tests for `deleteBoat()`. Then ran the real function against a private local stack
  with the sample boat's four PDFs: Kittiwake went entirely, and a second boat kept its file.
- Checked the screens in the browser as the co-owner (404) and the owner, including finishing a
  deletion that had been interrupted.
- Pointed the production checklist's manual cleanup in `docs/tokens.md` at the page, and added a
  row to `docs/architecture.md`.

**Along the way**

- The machine's network dropped partway through, so the build's Google Fonts fetch failed until
  it came back. The build passed on the second run.
- The first version of the page kept the warning and "Keep the boat" link above the "deleted"
  summary. The form now owns them, so the summary replaces them.

PR: https://github.com/heynewton/newton/pull/127
