## Project scaffold: npm workspaces, web app, calc package and CI

**Prompt**

````text
merged for 17
````

(Reply to Claude's question "Merge PR #17 so I can start on #3 (project scaffold)?")

**What Claude did**

- Moved #17 to Done and #3 to In progress on the board.
- Set up npm workspaces (no extra tool to install beyond Node 22): `apps/web` and `packages/calc`.
- Generated the web app with `create-next-app` (Next.js 16, App Router, TypeScript, Tailwind,
  ESLint), removed the template content and put a placeholder Newton page in its place.
- Created `packages/calc`, the home for every number Newton reports, with Vitest and
  typescript-eslint. Its first functions convert amounts to and from integer cents, which the cost
  split (#6) and document extraction (#11) will both need.
- Root commands `npm run check` (lint, type check, tests) and `npm run build`, and a GitHub Actions
  workflow running them on every PR and on `main`.
- Updated the `ship-change` build step, the README (Development section) and the stack table in
  `CLAUDE.md`. Added `.claude/launch.json` so the app can be previewed from Claude Code.

**What changed along the way**

- Picked npm workspaces instead of pnpm: pnpm wasn't installed, and npm keeps setup to one tool
  for contributors.
- Picked Next.js for the web framework, as #3 asked to propose one: its server routes can also
  receive the inbound-email webhook (#10), and it works well with Supabase auth.
- `npm audit` reports 5 high-severity advisories, all in the dev-only lint chain
  (`braces` via `eslint-config-next`), with no non-breaking fix yet. Left as is and noted in the PR.

**Pull request:** [#18](https://github.com/heynewton/newton/pull/18)
