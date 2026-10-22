# 0007: One-time Google Drive import, with derived text but no stored files or tokens

**Status:** Decided, 2026-10-22. **Issue:** #111.

## Context

Boat owners already keep documents in Google Drive. Selecting a private folder should let Newton
file and search those documents without taking ownership of another complete copy of the files.
The import needs temporary read access to the selected folder, and later Q&A needs searchable
content even after that access ends.

## Decision

- Use the Google Picker and the read-only `drive.readonly` OAuth scope. A whole-folder import
  needs to enumerate and read all files below the selected folder; the narrower `drive.file` scope
  may not grant access to every child. Google verification is required before external users can
  use this restricted scope.
- Import is a one-time, repeatable action, not a continuously synchronized connection. A repeated
  import skips completed Drive file IDs already recorded for that boat, but retries unfinished
  filings and manual indexing. It does not mirror later edits or deletions; an existing imported
  document keeps the derived content from its original import.
- Support PDFs, JPEG/PNG/GIF/WebP images, and Google Docs, Sheets and Slides exported to PDF.
  Skip other types, files over 20 MiB, imports beyond 100 files or 100 MiB total, with a reason
  in the result. A 20 MiB file limit and 100-file ceiling bound a run to the web function's
  300-second limit; rerun to import remaining files.
- File bytes are read and processed in memory, then discarded. Newton stores the Drive file ID,
  source link, name, size, modification time, filing results, and (for manuals only) extracted
  text chunks and embeddings. These derived passages allow search and Q&A; they are not a full
  binary copy of the original files.
- The browser's short-lived OAuth access token is sent only for the import request and is not
  logged or stored by Newton. No refresh token or long-lived Google Drive connection is kept.
- Owners and co-owners can import; other boat roles cannot.

## Consequences

- Drive-origin documents have no Storage object. Their source link opens the file in Google Drive,
  subject to that person's current Google permissions.
- An import can be retried safely, but changed source files do not update existing extracted
  content automatically.
- The web app needs a Google Picker API key and an OAuth web client ID; both must be restricted to
  Newton's allowed origins. The Google Picker API and Drive API must be enabled and the app must
  complete Google's verification for the restricted scope.
- Google receives the OAuth request and serves the selected Drive files. Anthropic sees supported
  files while filing; Voyage receives manual text while embedding. The privacy policy names these
  uses and the derived data retained.
