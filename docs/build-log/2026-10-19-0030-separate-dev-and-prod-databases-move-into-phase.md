## Separate dev and prod databases move into Phase 1

**Prompt**

```text
move dev/prod to phase 1
```

Context from the same session: asked when to work on hosted Supabase given PR #43, and whether to have a non-prod and a prod database. Claude recommended two hosted projects (dev for the dev site and previews, prod for real data), set up after #43 and before email-in (#10). It also noted that `docs/architecture.md` still listed the split under Phase 3.

**What Claude did**

- In `docs/architecture.md`, added a **Dev and prod** row to the Phase 1 components. Dev holds fixture data only and is seeded. Prod holds real data and is never seeded. Both get migrations from `main`, and the split lands before #10. Removed the split from the Phase 3 Operations row.
- Updated the Previews section of `docs/process.md`. It still said the domain moves "before sign-in (#5)", and #5 has merged.
- Moved issue #37 to the Phase 1 milestone. Rewrote its steps to cover both hosted projects and dropped "Blocked by: #5", since #5 is closed.

**What changed along the way**

- A first draft of #37's "Done when" said sign-in works on the hosted dev project with the fixture people. Hosted Supabase sends real email, and the fixture addresses are on `example.com`, so the line now only asks for the fixture boat to be loaded there.
- #37 stays one issue. It wasn't split into separate dev and prod issues.

**Pull request:** [#48](https://github.com/heynewton/newton/pull/48)
