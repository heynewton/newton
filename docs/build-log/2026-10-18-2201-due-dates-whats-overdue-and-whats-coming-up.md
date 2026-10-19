## Due dates: what's overdue and what's coming up, by date or engine hours

**Prompt**

````text
start 6 and 7
````

*Choice* when asked where #7 should go, since the session could only push to the branch holding
#6: **Separate branch** (its own PR, one issue per PR).

**What Claude did**

- Wrote `nextDue` for the three kinds of due date the issue named: a renewal's expiry date, a
  yearly renewal one year after it was last done, and maintenance every N months and/or N engine
  hours.
- Wrote `findDue`, which splits items into overdue and due soon within a window of days (and
  optionally engine hours). Maintenance is due on whichever of date and hours comes first, and
  each result says which one triggered it, so a reminder can give its reason.
- Kept dates as plain `YYYY-MM-DD` with no time zone. Adding months moves to the month's last day
  when the day doesn't exist (31 January + 1 month is 28 or 29 February).
- Tests cover month ends, leap years (including a yearly renewal done on 29 February), the
  boundaries of the due day and the window, both ways "whichever comes first" can go, and bad input.
- Listed the functions in the Today section of `docs/architecture.md`.

**What changed along the way**

- #6 and #7 were built in the same session but shipped as two PRs, one issue per PR.
- Results keep their input order; sorting the digest by urgency is left to the reminders job (#12).

**Pull request:** [#40](https://github.com/heynewton/newton/pull/40)
