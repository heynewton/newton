## Import documents from Google Drive without storing copies

**Prompt**

```text
new feature: instead of uploading or emailing docs, allow to point to a gDrive folder containing documents. heynewton should parse and learn from them but not do a full copy of the docs.
```

**What Claude did**

- Implemented a one-time Google Drive folder import for boat owners and co-owners, using temporary read-only OAuth access.
- Processes supported PDFs and images, and exports Google Docs, Sheets and Slides to PDF. Files are held in memory for filing; Newton retains Drive metadata, filing results, and derived manual passages and embeddings, not source-file bytes.
- Added retry handling for unfinished filings and manual indexing, plus an import summary with skipped and failed file reasons.
- Updated privacy, export, architecture and maintainer documentation; added database migrations and RLS-focused tests.
- Ran `npm run check` and `npm run build`. `npm run db:test` could not connect because local Docker/Supabase was not running. The authenticated boat screen was not browser-tested without local app configuration.
- CI's database job exposed an assumption about PostgreSQL's generated storage-path constraint name; updated the migration to locate the existing check by its definition.

**What changed along the way**

- The existing issue described copying Drive files into Newton. The implementation instead stores source metadata and derived manual content only.
- *Choice:* Use a private-folder OAuth flow with the restricted `drive.readonly` scope, rather than relying on `drive.file` access.
- *Choice:* Keep extracted manual text chunks, embeddings and Drive metadata, while discarding original file bytes and retaining no Google token.
- Clarified that repeated imports retry unfinished work but do not mirror source edits or deletions. Google OAuth verification and project credentials remain maintainer setup prerequisites before external use.

**Pull request:** [#170](https://github.com/heynewton/newton/pull/170)
