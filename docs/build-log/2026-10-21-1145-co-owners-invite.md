## Co-owners invite other co-owners

**Prompt**

````text
UI should allow a co-owner to invite another co-owner
````

**What Claude did**

- Found no issue or PR for invitations, and that the database only let owners add members, by
  person ID. Filed #160 with a "Done when" list.
- Added `invite_to_boat()` and an `invitations` table: owners and co-owners invite by email as
  co-owner, crew or read-only (never owner). Someone who already has a person is added at once;
  anyone else waits in `invitations` until a person with that email appears or a person's email
  changes to it, when a trigger on `people` turns it into a membership. The memberships policies
  are unchanged. At most 20 invitations wait on one boat.
- Added a "People on this boat" section to boat settings: who is on the boat, invitations still
  waiting (with Cancel), and the invite form. The server action emails the person through Resend
  (the reminders sender) and says so on the page when email isn't set up.
- On the boat page, "Invite your co-owners" replaces "inviting co-owners and crew" in coming soon,
  shown to owners and co-owners while they are alone on the boat.
- 24 pgTAP tests, unit tests for the data layer and the email, and a check in the running app
  (local Supabase stack, built app, Playwright): signed in as the sample boat's co-owner, invited a
  new address, an existing member and a bad address, cancelled one, checked crew gets a 404 on
  settings, then signed in as the invited address through a magic link from the local mail
  catcher and landed on the boat as co-owner. Screens at 390, 800 and 1280 px, light and dark.

**What changed along the way**

- Co-owners add people only through the function, which checks the role, rather than by widening
  the "memberships: owners add" policy, so they still can't make anyone an owner.
- The prompt only asked for co-owners; the form also offers crew and read-only, since the role is
  one choice in the same form and the boat page already promised "co-owners and crew".
- A new co-owner's ownership share is 0 until an owner sets it, and there is no screen to set
  shares yet.
- The container had Node 22 and no Docker daemon; Claude ran Node 24 through `npx`, started
  `dockerd`, and ran the pgTAP files with `psql` because the `pg_prove` image couldn't be pulled.

**PR:** [#161](https://github.com/heynewton/newton/pull/161)
