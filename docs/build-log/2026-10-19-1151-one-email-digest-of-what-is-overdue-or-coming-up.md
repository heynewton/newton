## One email digest of what is overdue or coming up

**Prompt**

The overnight plan (see "History and architecture catch up with what has merged"), item 3:

````text
Ok with the 6 and the order you defined.
````

**What Claude did**

- **Where it runs** ([decision 0005](decisions/0005-scheduled-jobs.md)): Vercel Cron calls
  `GET /api/reminders` daily at 07:00 UTC with `CRON_SECRET`. It's a route in the web app, so it
  reuses `packages/calc` through `lib/records` exactly as the boat page does. Supabase Edge
  Functions (Deno, a second build of calc) and GitHub Actions schedules (late or skipped when
  busy) were the alternatives. The queue for #11 stays open.
- **What goes in a digest:** for every boat, `schedule()` finds what is overdue or due within
  30 days (or 25 engine hours). Each owner and co-owner gets one email across all their boats,
  with each item's due date, what it was worked out from ("Last done 18 Apr 2026 at 1,371 h,
  every 6 months or 100 h"), its source document or "entered by hand", and the date it was
  worked out.
- **Not twice:** `reminders_sent` records every item sent, unique per person, item, due date and
  status. So an item is reminded once when it comes up and once more if it becomes overdue; a
  new due date (renewed, or done again) starts over. Resend gets an idempotency key per person
  and day, so a retried run doesn't send twice either. One person's failed send doesn't stop the
  others, and they get theirs on the next run.
- The "when is it due" wording (`dueLine`, `interval`, `hours`) moved from the boat page into
  `lib/records`, so the page and the email say the same thing.
- **Tests:** 10 unit tests on Kittiwake's records (on 19 Oct 2026 the anodes are overdue for
  Alex, Sam and Jordan, but not Riley who is crew; the registration comes up on 1 Dec; no
  repeats; reminded again when overdue; one digest across two boats; HTML escaping; a failed
  send retried the next day), and 8 pgTAP tests for `reminders_sent`.

**What changed along the way**

- The issue says "not sent twice for the same due date". Claude reads that as no repeats of the
  same news, and sends one more reminder when a coming-up item becomes overdue, since that's
  when it matters most. Easy to drop (one line in `sentKey`) if the maintainer prefers a single
  reminder.

**Pull request:** [#77](https://github.com/heynewton/newton/pull/77)
