# Newton

Newton is an AI assistant that knows one boat inside out. On the water it answers voice
questions ("Hey Newton, what's the target apparent wind angle?"). At home it keeps the
boat's documents, maintenance, budget and co-owner costs organized.

It starts as a hobby project for our own boat and a few friends' boats, but the design
assumes it may become a paid product, so it is multi-boat and multi-owner from day one.

- Website / domain: heynewton.app
- Repo: github.com/heynewton/newton (public, AGPL-3.0)
- Team Google Drive: [heynewton folder](https://drive.google.com/drive/folders/1O-MYSYuXWingDvfq2jdmDhxgK5rPNn9P)
  - Full spec: [Newton — Product & Architecture Spec](https://docs.google.com/document/d/19byJe41PNjezQD93sBnIgbE90bdVzTzWd5ptSrVg5yU/edit)
  - Accounts, domain and expenses: [Newton — Accounts, Domain & Expenses](https://docs.google.com/document/d/1yNKJPDzgc-OO_nyNnlF-x5toDMCzRrqSQ_09dPOFIVA/edit)
  - These links only open for people the folder is shared with. Keep its sharing on "Restricted":
    the repo is public, so "Anyone with the link" would make the folder public.

## Principles (follow these in every change)

1. **The boat is the tenant, not the user.** Every record belongs to a boat. People have a
   role on a boat (owner, co-owner, crew, read-only) and can be on several boats.
2. **Numbers come from code, never from the model.** Tides, bearings, target angles, dates
   and cost splits are computed by deterministic, tested functions. The LLM only routes the
   question and phrases the answer.
3. **Zero data entry.** Forwarding an email or uploading a photo is the main way data gets
   in; forms are a fallback.
4. **Offline first on the boat.** The on-water runtime works from cached data and syncs when
   connected.
5. **Owners own their data.** Full export, and the boat record transfers to a buyer on sale.
6. **Safety framing.** The assistant supports the skipper; it always states its source and
   how fresh the data is.

## Planned stack

| Layer | Choice |
| --- | --- |
| Database and auth | Postgres with row-level security (Supabase) |
| File storage | Supabase Storage |
| Document search | pgvector |
| Agent | Claude API with tool use |
| Email-in | Inbound email to a per-boat address |
| Web app | Next.js (App Router) + Tailwind, in `apps/web` |
| Mobile app | Expo / React Native |
| Boat data | Signal K (Raspberry Pi + NMEA 2000 gateway) |
| Tides | NOAA predictions, cached |

The current architecture and the target for each phase are in `docs/architecture.md`. A change
that alters the architecture (a new component, service or decision) updates that page in the same PR.

## Build phases

1. Home side for our own boat: email-in filing, maintenance and renewal reminders,
   co-owner cost split, Q&A over manuals.
2. On-water voice: tide and course-to-mark first (phone GPS only), then target angles via Signal K.
3. Three to five friends' boats: self-serve onboarding; measure time until a new boat is useful.
4. Paid product.

We are in **Phase 1**.

## Repo rules

- `main` is protected: every change goes through a pull request. Never push to `main` directly.
- **No real boat data in the repo** (contracts, insurance, receipts, polars, personal info).
  Use fake sample data in `fixtures/`.
- **No secrets in the repo.** Keys go in `.env` (git-ignored). Secret scanning and push
  protection are on.
- The repo is public and AGPL-3.0: assume anything committed is visible to everyone.

## Workflow

- One branch and one PR per change, from an up-to-date `main`. Never commit to `main` directly.
- If a change belongs to an open PR on the same topic, add it there instead of opening a new one.
- When a PR grows, update its title and description to match.
- PR descriptions list what was tested and what wasn't.
- Commit messages say what changed and why.
- After each PR, add an entry to `docs/build-log.md`, lightly cleaning the prompt where privacy
  needs it (no real boat data or personal info, per the repo rules above).
- Each PR also adds a line to `docs/history.md`, the history of PRs by phase and topic.
- The `ship-change` skill (`.claude/skills/ship-change/SKILL.md`) is the checklist for landing a change.
- Roles, the project board and the weekly rhythm are in `docs/process.md`. Ready issues are worked
  top-down in board order; move issues across the board as they progress. The Board workflow moves
  most cards: assign the issue when you start it, and open the PR with `Closes #N`. Cloud sessions
  can't reach the board at all, so they rely on that (see "Cards move by themselves" in `docs/process.md`).

### Issues are the todo list

- One issue = one PR-sized change. A bigger job is split into flat issues, not parents and
  sub-issues. Each issue has a short "Done when" checklist, and the PR says `Closes #N`.
  Blockers are a "Blocked by: #N" line above "Done when".
- Labels say where it belongs, not how urgent it is, plus `bug` and `documentation`. No priority
  labels. Area labels:
  - `backend`: Supabase schema, row-level security, auth, storage
  - `email-in`: per-boat inbound email and filing
  - `agent`: Claude tool use, routing, document Q&A
  - `calc`: deterministic functions (tides, bearings, target angles, dates, cost splits)
  - `web`: the web app (the Phase 1 screen)
  - `mobile`: the Expo / React Native app
  - `boat-data`: Signal K, NMEA 2000, NOAA tides
  - `repo`: tooling, CI, repo setup
- Milestones are the goals: one per build phase (`Phase 1: Home side`, `Phase 2: On-water voice`,
  `Phase 3: Friends' boats`, `Phase 4: Paid product`). Every open issue has one.
- Priority is the order of work: first what is blocked by nothing, then what unblocks other work,
  then small steps toward users.
- Issues a contributor could pick up on their own get `help wanted` (or `good first issue` if small).
- Before creating an issue, search the open ones for a duplicate (`gh issue list --search "<words>"`).
  New ideas that come up mid-task become an issue if they belong to the current or next phase, and
  otherwise go in the spec's "Feature ideas" section (see `docs/process.md`). The current task carries on.
