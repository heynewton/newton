## Add your first boat after signing in

**Prompt**

````text
can you also start 32 and 37 in parallel or they depend on other items?
````

**What Claude did**

- Built [#32](https://github.com/heynewton/newton/issues/32) in its own session, in parallel with
  the sessions on #8, #9 and #24.
- Added `create_boat(boat_name)`, a SQL function that inserts the boat and the caller's `owner`
  membership in one transaction, so a boat never exists without an owner. Signed-in people still
  can't insert boats directly. 14 new pgTAP tests cover it.
- `/` now sends a signed-in person to `/boats`, which goes on to `/boats/new` (no boat), their one
  boat, or a picker. `/boats/new` asks only for the name. `/boats/<id>` shows the boat's name and
  next steps marked "Coming soon".
- Checked the flow in the running app with made-up people, at 390px, 800px and 1280px, in light
  and dark mode.

**What changed along the way**

- Two other sessions were changing the database at the same time, so Claude ran its own Supabase
  stack under a different project name and ports instead of sharing the default one.
- Testing the picker showed the boat list wasn't sorted: ordering by an embedded table in Supabase
  only sorts inside each row's embed. The list is now sorted in code.
- Vercel previews have no database until #37, so the flow was only tested locally.

**Pull request:** [#53](https://github.com/heynewton/newton/pull/53)
