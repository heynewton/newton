## Branded 404, error and loading screens

**Prompt**

````text
Background (from the session that started this one):
Newton is a public AGPL repo (Next.js 16 App Router + Tailwind 4 in `apps/web`, Supabase). It is in Phase 1. A planning session turned a UI review into issues #133–#142, all labelled `web` in "Phase 1: Home side". The maintainer asked for the UI improvements to run overnight in cloud sessions. They are split three ways so no two sessions edit the same files: this session has the 404, error and loading screens; another has the boat page sections (#134–#137, #140); a third has the header and boat settings (#133, #142). #139 (shared button styles) waits until these merge, and #141 is blocked by #130. Use only fake data from `fixtures/sample-boat`, never real boat data or secrets. Cloud sessions can't reach the project board: the Board workflow moves cards when an issue is assigned and a PR says `Closes #N`. Follow `docs/decisions/0002-screen-sizes.md`: 44 px tap targets, nothing that depends on hover.

Task:
Implement GitHub issue #138 in heynewton/newton: branded 404, error and loading screens for the web app. Read it in full with `gh issue view 138` and meet its "Done when" checklist.

Files: new `apps/web/src/app/not-found.tsx`, `app/error.tsx`, optionally `app/boats/[boatId]/error.tsx`, and `loading.tsx` for `/boats` and `/boats/[boatId]` (skeletons in the shape of the sections). Reuse the site's existing look (the root layout, `site-footer.tsx`, the homepage styles). Don't edit `boats/[boatId]/page.tsx`, `records.tsx`, `boats/page.tsx`, `boats/new`, the delete pages or a `boats/layout.tsx`: other sessions are changing those tonight. If one of these screens needs a change there, note it in the PR instead of making it. Show no technical detail in the error screen.

Branch from `main` and open one PR that says `Closes #138`. Follow `.claude/skills/ship-change/SKILL.md`: `npm run check` and `npm run build` pass, plus a `docs/build-log/` entry and a `docs/history/` file for the PR (see `CLAUDE.md`). Assign yourself the issue if `gh` allows.

Check it on the PR's Vercel preview at 390, 800 and 1280 px, light and dark. Use `/boats/00000000-0000-4000-8000-000000000099` (no such boat) after signing in with "Sign in as…" on `/sign-in`. If you can't open the preview, say so in the PR's "not tested" list.

This runs overnight with nobody watching. Don't stop to ask: make a sensible call and note it in the PR. Don't merge anything. When you're done, leave a short summary with the PR and what's left untested.
````

**What Claude did**

- Read the Next.js 16 docs bundled in `node_modules` for `not-found`, `error` and `loading`: error
  screens now get `retry()`, which re-fetches the segment, rather than only `reset()`.
- Added `app/not-found.tsx` and `app/error.tsx` on a shared `status-screen.tsx` (the homepage's
  header and its two button styles), and `loading.tsx` skeletons for `/boats` and a boat's home,
  built from a small `Bone` block in the shape of each section.
- The 404 checks whether someone is signed in behind `Suspense`, as Cache Components requires, to
  offer Your boats instead of the homepage. The error screen picks Your boats or the homepage
  from the address, and shows nothing technical.
- Tested a production build against the local Supabase stack with the sample boat at 390, 800
  and 1280 px in light and dark: the 404 signed in and out, the error screen by revoking
  read access to one table on the local database (Try again loads the boat once it is granted
  back), and the skeletons on a temporary route that wasn't committed.

**What changed along the way**

- The boat pages wrap their content in their own `Suspense` with a "Loading…" fallback. With
  partial prerendering that fallback is part of the static shell, so `loading.tsx` alone rarely
  shows. The skeletons are exported so those fallbacks can use them, a one-line change per page
  left for after the other sessions' boat page PRs merge, since this session doesn't touch those files.
- For the same reason a missing boat's 404 keeps the boat page's title and a 200 status: it is
  raised after the response has started streaming. Noted in the PR.
- The first layout centred the text in a narrower column than the header, which looked off at
  1280 px; it now lines up with the header.
- The PR's Vercel preview couldn't be opened from the cloud session, so it is on the PR's
  "not tested" list.

**PR:** [#148](https://github.com/heynewton/newton/pull/148)
