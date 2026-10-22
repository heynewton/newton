## Owner-written boat procedures Newton can answer from

**Prompt**

````text
/issue-fix
````

**What Claude did**

- Added boat-specific procedures that owners and co-owners can add, edit and delete; other boat
  members can read them.
- Indexed procedures alongside manual excerpts, with boat-scoped row-level security, and made
  answers cite each procedure's title and last-edited date.
- Added two invented sample procedures and a mooring question to the Q&A eval, plus export and
  architecture documentation.
- Ran `npm run check` and `npm run build`.

**What changed along the way**

- Issue #21's blocker, #13, was already closed.
- The Supabase migration and pgTAP tests could not be run because Docker is unavailable locally.
  The live Claude/Voyage eval also wasn't run because it needs API keys; offline tests use a fake
  embedder and model.

**Pull request:** [#169](https://github.com/heynewton/newton/pull/169)
