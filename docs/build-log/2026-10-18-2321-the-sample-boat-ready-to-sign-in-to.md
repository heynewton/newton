## The sample boat, ready to sign in to after a database reset

**Prompt**

This one came from another Claude Code session, which split it off while working on sign-in:

````text
Background (from the session that started this one):
Newton (heynewton/newton) is in Phase 1. PR #41 (branch feat/supabase-auth, closes #5) adds a local Supabase stack: a migration with boats, people (Newton's own id, with the auth provider id only in people.auth_subject) and memberships with roles, RLS through current_person_id(), pgTAP tests, and magic-link sign-in in apps/web with a /boats page. The fake sample boat (#4) landed on main separately, in PR #36. supabase/seed.sql is just a placeholder comment for now. Start this after #41 merges, or branch from feat/supabase-auth if it hasn't merged yet. Never put real boat data in the repo.

Task:
Load the fake sample boat in `fixtures/sample-boat/boat.json` (Kittiwake, its people and memberships) into the local Supabase stack through `supabase/seed.sql`, so `npm run db:reset` gives a signed-in-ready demo boat. Each fixture person needs an `auth.users` row (the `create_person_for_auth_user` trigger then creates their `people` row), plus a boat and memberships with the right roles (owner, co_owner, crew, read_only). Generate the seed from boat.json with a small script (as `fixtures/sample-boat/build.mjs` does for PDFs) or write it by hand, whichever is clearer. Ownership shares belong to the cost-split work (#6/#9), so leave them out unless a column already exists. Done when `npm run db:reset` loads the boat, signing in locally by magic link as a fixture person (the mail catcher is at http://127.0.0.1:54324) shows Kittiwake on `/boats` with the right role, and `npm run db:test` still passes. Follow CLAUDE.md: first search for an existing issue (`gh issue list --search "seed"`) and create one if there is none, branch from an up-to-date main, open one PR, and add a build-log entry.
````

**What Claude did**

- Found no issue for the seed, so opened #42 (backend, Phase 1) and moved it to In progress.
  #41 hadn't merged yet, so the branch starts from `feat/supabase-auth` and the PR is stacked on it.
- Wrote `fixtures/sample-boat/build-seed.mjs`, which turns `boat.json` into `supabase/seed.sql`:
  an auth user and email identity per person, the boat, and the memberships. The trigger makes each
  person, who then takes the fixture's ID and name. The auth IDs are kept separate from the person
  IDs, as the auth decision asks.
- Added a CI step that fails if `seed.sql` no longer matches `boat.json`, and documented how to sign
  in as each fixture person.
- Reset the local database, ran the RLS tests (26 pass), then signed in as Sam by magic link
  through the mail catcher: `/boats` showed Kittiwake as Co-owner.

**What changed along the way**

- Generating instead of hand-writing the seed won because `boat.json` already holds the IDs and
  roles, and a CI check can keep the two in step.
- The fixture has no read-only person, so the seed covers owner, co-owner and crew only. Ownership
  shares wait for #9.

**Pull request:** [#43](https://github.com/heynewton/newton/pull/43)
