# 0006: Filing runs after the email-in response, with a daily sweep, and the documents table as the queue

**Status:** Decided, 2026-10-20. **Issues:** #11. Closes the open decision "where queued background
work runs" for filing; indexing manuals can use the same pattern.

## Context

Filing (#11) reads each stored document with Claude and saves the records it supports. It must
not run inside the webhook's response: Resend waits for a 2xx and retries on timeouts, and a few
PDFs through Claude can take tens of seconds. It must also survive failures (Claude overloaded,
a deploy mid-run) without losing a document or filing one twice.

[Decision 0005](0005-scheduled-jobs.md) left a queue open: Vercel Hobby crons run daily at most,
so they can't react to an email within minutes.

## Options

| Option | Reacts in | New moving parts | Notes |
| --- | --- | --- | --- |
| **`after()` in the webhook, plus a daily sweep (Vercel Cron)** | Seconds | None: Next.js `after()` and the cron we already run | Work after the response runs within the same function's time limit (`maxDuration` 300 s). If it dies, the sweep files the document the next morning |
| Supabase Queues (pgmq) + a worker | Seconds to a minute | A queue extension, and something to poll it (a cron that runs every minute needs Vercel Pro, or `pg_cron` + `pg_net` calling a route) | The right shape at Phase 3 volumes |
| A hosted job runner (Inngest, Trigger.dev) | Seconds | A new account, keys, and a vendor in the data path | Retries and observability built in; more than a few boats need |
| Database trigger + `pg_net` calling a route | Seconds | Secrets inside the database, HTTP from Postgres | Hard to test locally, and a retry story of its own |

## Decision

**Filing runs right after email-in stores a message's files, in `after()`, and once a day at 06:00
UTC from Vercel Cron (`/api/filing`) for anything still waiting.** There is no separate jobs
table: an unsorted document with no filing (or a failed one) *is* the queue entry, found by
`documents_to_file()`.

- **Idempotent.** `save_document_filing()` locks the document's row, writes the filing and its
  records in one transaction, and does nothing if the document is already filed or waiting for
  review. The store also skips documents that are filed before calling Claude, so a retry
  doesn't pay twice.
- **Retries.** A failed attempt (Claude unreachable, a cut-off reply) is recorded in
  `document_filings` with the error. The sweep retries it, up to 3 attempts; then it waits for a
  person, like a flagged document.
- **Bounded.** The sweep files at most 20 documents per run, inside one request's time limit.
- **Order.** It runs in the 06:00 hour, before the reminders at 07:00, so a renewal filed
  overnight is in that morning's digest.
- **Off without a key.** Without `ANTHROPIC_API_KEY` in the deployment, nothing is sent to
  Anthropic: documents stay unsorted, the webhook logs it, and the sweep answers 503.

## Consequences

- A document whose `after()` run was cut off waits until the next morning. Fine for paperwork; if
  it isn't, the sweep can run more often on Vercel Pro, or move to a queue.
- At Phase 3 volumes (many boats forwarding at once), one function per email and 20 documents a
  day from the sweep won't keep up: move to Supabase Queues with a worker, keeping
  `fileDocument()` and `save_document_filing()` as they are.
- Indexing manuals (#13) can hook in the same way: after a document is filed as a manual, and in
  the same sweep.
