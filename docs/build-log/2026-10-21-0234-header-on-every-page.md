## The header on every page, with the logo back to the homepage

**Prompt**

````text
Implement GitHub issue #155 in heynewton/newton: every page gets the header, with the logo on the left linking to the homepage and the profile on the right. Read it in full with `gh issue view 155` and meet its "Done when" checklist.

Today the header exists only in `apps/web/src/app/boats/layout.tsx` (from PR #147). Move it into the root layout `apps/web/src/app/layout.tsx` so `/`, `/privacy`, `/terms`, `/sign-in`, `/get-started`, the 404 and error pages and `/boats/*` all get it, and remove the separate header from `boats/layout.tsx` so no page shows two. Reuse `boats-header-bar.tsx`, `menu.tsx`, `menu-item.ts` and `sign-out.tsx`, moving them to a shared place if needed. Signed out, the right side shows a "Sign in" link; signed in, the existing account menu. Keep the boat switcher on `/boats/*`. Keep the signed-in part in `Suspense` so static pages like privacy and terms stay fast. 44 px tap targets, nothing hover-only (`docs/decisions/0002-screen-sizes.md`).

Branch from an up-to-date `main` and open one PR that says `Closes #155`. Follow `.claude/skills/ship-change/SKILL.md`: `npm run check` and `npm run build` pass, plus a `docs/build-log/` entry and a `docs/history/` file for the PR (see `CLAUDE.md`). If the header is a new shared component, update `docs/architecture.md` where it describes the web app. Assign yourself the issue if `gh` allows.

Check it on the PR's Vercel preview at 390, 800 and 1280 px, light and dark, both signed out and signed in (use "Sign in as…" on `/sign-in`). Visit the homepage, privacy, terms, a boat page and a missing boat (`/boats/00000000-0000-4000-8000-000000000099`). If you can't open the preview, say so in the PR's "not tested" list.

Don't stop to ask: make a sensible call and note it in the PR. Don't merge. When you're done, leave a short summary with the PR link and what's left untested.
````

**What Claude did**

- Moved the header components from `app/boats/` to `app/site-header/` and rendered a new
  `SiteHeader` from the root layout: the logo (with "Hey Newton" from 640 px up) links to `/`, the
  boat switcher shows on `/boats/*`, and the right side is the account menu or "Sign in".
- Removed `boats/layout.tsx` and the homepage's and 404/error screen's own headers, so every page
  has exactly one.
- Added "Your boats" to the account menu, so a signed-in person on privacy or terms can get back.
- Checked it with Playwright at 390, 800 and 1280 px in light and dark, signed out and signed in
  as a sample-boat person, on the local Supabase stack (with a second fake boat to try the
  switcher) and on the PR's Vercel preview.

**What changed along the way**

- The signed-in part stays behind `Suspense` with an empty fallback rather than "Sign in", so a
  signed-in person never sees "Sign in" flash. With `cacheComponents`, privacy and terms are now
  partially prerendered: the logo is in the static shell and the profile streams in.
- A failed session or boat-list read now falls back to the signed-out header instead of
  breaking pages like privacy and terms.
- Creating a boat revalidated the `/boats` layout to refresh the header's boat list; the list now
  lives in the root layout, so it revalidates that instead.
- "Sign in" is hidden on `/sign-in` itself.
- The container had Node 22 (the repo asks for 24), so `npm ci` ran with `--engine-strict=false`,
  and Docker had to be started by hand before `supabase start`.

**PR:** [#156](https://github.com/heynewton/newton/pull/156)
