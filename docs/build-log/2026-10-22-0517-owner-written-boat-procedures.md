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
- Ran `npm run check` and `npm run build`; GitHub's database job also passed after a test fix.

**What changed along the way**

- Issue #21's blocker, #13, was already closed.
- The first GitHub database run caught invalid nested data-modifying CTEs in the RLS assertions;
  replaced them with invoker helper functions, then the migration and pgTAP tests passed. Local
  Supabase couldn't be started because Docker is unavailable.
- The live Claude/Voyage eval wasn't run because it needs API keys; offline tests use a fake
  embedder and model.
- The preview homepage and sign-in loaded, but the boat page returned an error: its migration is
  only dry-run against the shared dev database. So the new screen couldn't be checked at the
  required widths and themes.

**Pull request:** [#169](https://github.com/heynewton/newton/pull/169)
