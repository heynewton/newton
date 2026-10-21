## The boat's email address is shown once, with a Copy button

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

- Showed the boat's address once, in Documents, as a `mailto:` link with a 44 px Copy button that
  says "Copied" through `role="status"`.
- Made Next steps list only what can be done now: "Forward documents" shows only while the boat
  has no documents and links to the address instead of repeating it. The two "Coming soon" cards
  became one line.
- Ran `npm run check` and `npm run build`, and checked Kittiwake and an empty boat at 390, 800
  and 1280 px in light and dark, on the local render and the PR's Vercel preview.

**What changed along the way**

- The first version linked to Documents from inside a sentence in the next-step card, under 44 px;
  it became a "Find the address" link of its own.
- With this the stack of five boat-page PRs (#144, #145, #146, #149, #150) is complete.

**PR:** [#150](https://github.com/heynewton/newton/pull/150)
