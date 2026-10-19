## Sign in with an email link, with boats, people and roles under row-level security

**Prompt**

````text
can you start #5 sign-in now?
````

Follow-up, sent while Claude was working:

````text
what account should I use on docker
````

**What Claude did**

- Read #5 (boats, people and roles under RLS, with magic-link sign-in) and its blocker #3, already
  closed. The current checkout had uncommitted work for the sample boat (#4), so #5 was built in a
  separate git worktree on a new branch from `main`, leaving that work untouched.
- Set up the Supabase CLI in the repo and wrote one migration: `boats`, `people` and `memberships`
  with the four roles. As in decision 0001, `people.id` is Newton's own ID, the provider's user ID
  stays in `people.auth_subject` (column grants keep it out of the API), and every policy goes
  through `current_person_id()`. A `can_write_boat()` helper is ready for record tables, so
  read-only members can't write.
- Wrote 26 pgTAP tests with four made-up people across two boats. They cover what each role can
  see and change, signed-out access and `auth_subject`. Added a CI job that runs them on a fresh
  Postgres.
- Built the web side: a data-access module in `apps/web/src/lib/db` (with a lint rule against
  Supabase imports anywhere else), the magic-link form, a callback route, a `/boats` page, a
  "link didn't work" page and a proxy that refreshes the session. Without Supabase settings, as on
  previews, `/sign-in` keeps its placeholder.
- Tried the whole flow in the browser on the local stack with a fake address, from requesting the
  link to signing out and reusing an old link. Checked the screens at 390px, 800px and 1280px.
- Answered the follow-up: local Supabase needs no Docker account, so skip sign-in. If one is ever
  needed, use the project address, not a personal one.

**What changed along the way**

- `/boats` first got stuck on "Loading…": with Cache Components on, the Supabase client read the
  clock while Next.js prerendered the page. The data-access module now waits for the request
  (`connection()`) before touching the database.
- The first screen check found the email field and button were about 40px tall. They now meet the
  44px touch-target rule from the screen-size decision.
- Another session's dev server held port 3000, so the local redirect allow-list now accepts any
  localhost port.
- A test meant to show that co-owners can't add members passed for the wrong reason: the co-owner
  couldn't even see the person being added. The tests now look up IDs outside RLS.

**Pull request:** [#41](https://github.com/heynewton/newton/pull/41)
