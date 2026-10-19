# 0005: Scheduled jobs run as Vercel Cron calling the web app

**Status:** Decided, 2026-10-19. **Issues:** #12. The queue for extraction and indexing (#11)
is still open.

## Context

Reminders (#12) need something to run once a day without anyone asking: work out what is due on
every boat, email a digest and remember what was sent. The architecture listed "where background
jobs run" as open, needed by #11 and #12.

The due dates come from `packages/calc`, through `apps/web/src/lib/records`, which the boat page
already uses. Whatever runs the job should reuse that code as it is, so the email and the page
can't disagree.

## Options

| Option | Runs | Reuses the web app's code | Cost |
| --- | --- | --- | --- |
| **Vercel Cron → a route in `apps/web`** | Vercel calls `GET /api/reminders` on the production deployment on a schedule, with `Authorization: Bearer $CRON_SECRET` | Yes: same Node runtime, same modules | Included. Hobby allows daily schedules, run at some point within the scheduled hour |
| Supabase `pg_cron` → Edge Function | In the Supabase project | No: Edge Functions are Deno, so `calc` and `lib/records` would need a second build | Included |
| GitHub Actions `schedule` → the same route | A workflow calls the route with a secret | Yes | Free minutes, but schedules can be late or skipped when GitHub is busy, and a second place to keep secrets |

## Decision

**Vercel Cron calling `/api/reminders` once a day at 07:00 UTC** (`apps/web/vercel.json`).

- The route refuses any call without `Authorization: Bearer $CRON_SECRET`. Vercel sends that
  header when `CRON_SECRET` is set on the project.
- Only the production target runs crons. While #63 is open, that is the dev site, so reminders
  go to the dev database's fixture people (`@example.*` addresses, which don't deliver).
- The job is safe to run twice: a person's digest has a Resend idempotency key per day, and
  every reminder is recorded with a unique key (`reminders_sent`).

## Consequences

- Moving off Vercel means moving the schedule too, but the job is a plain HTTP route, so any
  scheduler (GitHub Actions, Supabase `pg_net`) can call it the same way.
- A run is one request, so it has the function's time limit. Fine for a few boats; at Phase 3 or
  4 volumes, split it into one request per boat.
- Hobby's limits (daily only, within the hour) suit a daily digest. Anything that needs to react
  within minutes (extraction after an email arrives, #11) needs a queue, which is still open.
