## The boat page opens with a one-line summary of what needs attention

**Prompt**

````text
Background (from the session that started this one):
Newton is a public AGPL repo (Next.js 16 App Router + Tailwind 4 in `apps/web`, Supabase, `packages/calc` for every number). It is in Phase 1. A planning session turned a UI review into issues #133–#142, all labelled `web` in "Phase 1: Home side". The maintainer asked for the UI improvements to run overnight in cloud sessions. They are split three ways so no two sessions edit the same files: this session has the boat page sections; another has the header and boat settings (#133, #142); a third has the 404, error and loading screens (#138). #139 (shared button styles) waits until these merge, and #141 is blocked by #130. Use only fake data from `fixtures/sample-boat` (Kittiwake), never real boat data or secrets. Cloud sessions can't reach the project board: the Board workflow moves cards when an issue is assigned and a PR says `Closes #N`. Follow `docs/decisions/0002-screen-sizes.md`: 44 px tap targets, nothing that depends on hover.

Task:
Work through these GitHub issues in heynewton/newton, in this order, with one PR per issue: #135 (item states in words, `details` chevrons, heading outline), #136 (the co-owner balance marks "You"), #134 (one-line summary under the boat name), #140 (a source · freshness line on every section), #137 (the boat's email address shown once with a Copy button; tidier next steps). Read each issue in full with `gh issue view N` and meet its "Done when" checklist.

Files: mostly `apps/web/src/app/boats/[boatId]/page.tsx` and `records.tsx`, `apps/web/src/lib/records`, and `packages/calc` for any new number (for example days overdue). Any computed value gets a unit test in calc or lib (principle 2: no numbers computed in components). Don't touch the bottom link row or nav of the boat page, `boats/layout.tsx`, `/boats`, `/boats/new` or the delete page. Another session is changing those tonight (#133, #142).

Stack the PRs: branch #135 from `main`, then each next branch from the previous one, and open each PR against the previous branch. Say "Stacked on #X, merge after it" at the top of the body. Each PR says `Closes #N` and follows `.claude/skills/ship-change/SKILL.md`: `npm run check` and `npm run build` pass, plus a `docs/build-log/` entry and a `docs/history/` file for that PR (see `CLAUDE.md`). Assign yourself the issue when you start it, if `gh` allows.

Check each change on the PR's Vercel preview at 390, 800 and 1280 px, light and dark. Previews sign in as the sample boat's people with "Sign in as…" on `/sign-in`. If you can't open the preview, say so in the PR's "not tested" list.

This runs overnight with nobody watching. Don't stop to ask: make a sensible call and note it in the PR. Don't merge anything. When you're done, leave a short summary listing each PR and what's left untested.
````

**What Claude did**

- Added `attentionSummary()` to `@/lib/records`, built from the same schedule and cost split the
  sections show, and moved `money()` there so amounts read the same everywhere. Unit tested.
- Put the line under the boat's name: "1 overdue · nothing due in the next 60 days · you're owed
  USD 312.44", each part a 44 px link to its heading. Someone with no ownership share gets no
  balance part; an empty boat gets what to do first instead of zeros.
- Ran `npm run check` and `npm run build`, and checked the page as Alex, Riley and an empty boat
  at 390, 800 and 1280 px in light and dark.

**What changed along the way**

- At 390 px the line wrapped with a "·" at the start of the second line, so the separator now
  ends each part instead.
- The first empty-boat text had its link inline in a sentence, under 44 px; it is now a link of
  its own.
- Partway through, the maintainer opened the cloud session's network to the Vercel previews and
  the dev site, so the stack's previews were checked with "Sign in as…" too.

**PR:** [#146](https://github.com/heynewton/newton/pull/146)
