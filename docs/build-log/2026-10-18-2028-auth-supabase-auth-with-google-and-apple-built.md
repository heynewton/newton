## Auth: Supabase Auth with Google and Apple, built so the provider can change

**Prompt**

````text
When is the work to deploy auth0 auth with profiles and tenant linked to a boat planned. I think this should be done very early in the project no?
````

````text
I think I'd rather use auth0 in case I want to move out of supabase. wdyt?
````

````text
I want google and apple social login. can supabase do that
````

````text
yes go ahead
````

**What Claude did**

- Found the work already planned as [#5](https://github.com/heynewton/newton/issues/5) (boats,
  people and memberships under row-level security), unblocked since the scaffold merged, and the
  base most other Phase 1 issues build on. The plan used Supabase Auth, not Auth0.
- Argued against Auth0 as an exit hedge: leaving Supabase is hard because of RLS on the user's
  token, Storage and the client calls, not because of auth. Supabase Auth users live in our own
  Postgres, and magic-link and social logins have no passwords to migrate.
- Proposed cheaper hedges instead and added them to #5: Newton's own `people.id` with the
  provider's ID only in `auth_subject`, RLS through a `current_person_id()` function, and one
  data-access module in the web app. Also added magic-link sign-in, which the architecture page
  listed under #5 but its checklist didn't.
- Confirmed Supabase Auth does Google and Apple, and filed
  [#27](https://github.com/heynewton/newton/issues/27) for them (blocked by #5).
- Wrote the first decision record, `docs/decisions/0001-auth.md`, and updated the Phase 1
  components on the architecture page.

**What changed along the way**

- Apple's "Hide My Email" relay addresses would break email-in, which holds mail from senders who
  aren't members: people forward from their real inbox, not the relay. #27 adds verified sender
  addresses per person, and the email-in row now matches against those.
- Apple's web client secret expires every 6 months, so #27 asks for the renewal to be written
  down with a reminder.

**Pull request:** [#28](https://github.com/heynewton/newton/pull/28)
