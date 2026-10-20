## A person's stored email follows their sign-in email

**Prompt**

Started by another Claude Code session, which wrote (its background paragraph on the project is
left out):

````text
Build issue #117, "A person's stored email follows their sign-in email". Read the issue, the tenancy, backfill and email-in migrations, and lib/db/email-in.ts, from up-to-date origin/main.

Done when (from the issue): when an auth user's email changes, people.email changes with it (for example an AFTER UPDATE OF email trigger on auth.users, security definer, with execute revoked from API roles like the existing trigger function); email-in's member matching uses the current address, and the old one stops matching unless it's also a verified sender address; pgTAP tests cover the change, the no-change case, and that matching follows.

Name the migration `supabase/migrations/20261022130000_people_email_sync.sql`. Think about the edge cases and say in the PR how they're handled: an email changed to one another person already uses (people.email uniqueness, if any), an email change that's pending confirmation (Supabase keeps it in email_change until confirmed; only follow the confirmed email), and existing rows that already differ today (a one-off sync in the same migration, if any differ).

Run npm run check and the database tests on the local stack. Add your build-log and history files, open the PR with `Closes #117`, and stop. Don't merge. Report the PR link, the edge-case handling, and any questions.
````

**What Claude did**

- Added `update_person_email_for_auth_user()` (security definer, empty search path, execute
  revoked from `public`, `anon` and `authenticated`) and an `after update of email` trigger on
  `auth.users` that only fires when the email actually differs. It copies the new address to the
  person with that `auth_subject`.
- Left `match_inbound_email()` as it is: it already compares against `people.email`, so it
  follows the stored address. The old address keeps matching only through a verified
  `sender_addresses` entry.
- The same migration copies the current sign-in email to any person whose stored email already
  differs, and does nothing where none do.
- Added `people_email_sync.test.sql` (12 pgTAP tests): a confirmed change is copied, other people
  are untouched, an update that leaves the email as it was doesn't fire, a change waiting in
  `email_change` isn't followed until it's confirmed, mail from the new address files under the
  person and from the old one is held, an old address that is also a verified sender address
  still matches, the API roles can't call the function, and people still can't edit their stored
  email themselves.
- Ran the database tests on a private local stack (its own project ID and ports, so it didn't
  collide with the other sessions' stacks), checked the one-off sync and an update made as
  `supabase_auth_admin` (the role Supabase Auth writes with) by hand, and ran `npm run check`.

**What changed along the way**

- The tests first switched to `supabase_auth_admin` before updating `auth.users`, to match what
  Supabase Auth does. The test runner's role can't switch to it, so the tests update as the
  database owner, and the `supabase_auth_admin` path was checked by hand as a superuser instead.
- `npm run check` failed under the shell's default Node 18 (Next.js needs 20.9 or later, the
  repo asks for 22); it passes under Node 22.

**Pull request:** [#123](https://github.com/heynewton/newton/pull/123)
