# Build log

How this project is being built with [Claude Code](https://claude.com/claude-code), one request at a time.

Each entry quotes the prompt **word for word**, lightly cleaned where privacy needs it: replaced text is shown in [brackets]. Then it says what Claude did, what changed along the way, and which pull request came out of it. Answers picked from multiple-choice questions Claude asked are shown as *Choice*.

---

## Workflow conventions, ship-change skill and build log

**Prompt**

````text
Set up my working conventions in this repo. Create or update these three things, adapting them to this project (its build/test commands, labels, default branch):

1. Add this section to CLAUDE.md (create the file if it doesn't exist):

## Workflow

- One branch and one PR per change, from an up-to-date `main`. Never commit to `main` directly.
- If a change belongs to an open PR on the same topic, add it there instead of opening a new one.
- When a PR grows, update its title and description to match.
- PR descriptions list what was tested and what wasn't.
- Commit messages say what changed and why.
- After each PR, add an entry to `docs/build-log.md`, lightly cleaning the prompt where privacy needs it.

### Issues are the todo list

- One issue = one PR-sized change. A bigger job is split into flat issues, not parents and sub-issues. Each issue has a short "Done when" checklist, and the PR says `Closes #N`. Blockers are a "Blocked by: #N" line above "Done when".
- Labels say where it belongs, not how urgent it is, plus `bug` and `documentation`. No priority labels.
- Milestones are the goals. Every open issue has one.
- Priority is the order of work: first what is blocked by nothing, then what unblocks other work, then small steps toward users. Keep at most two issues in progress.
- Before creating an issue, search the open ones for a duplicate. New ideas that come up mid-task become an issue, and the current task carries on.

2. Create the skill `.claude/skills/ship-change/SKILL.md`:

---
name: ship-change
description: The checklist for landing any change in this repo, from branch to PR to build-log entry. Use when finishing a change, before opening or updating a pull request.
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(gh pr view *) Bash(gh pr list *)
---

# Ship a change

## 1. Branch
- If the change belongs to an open PR on the same topic, add it there; otherwise start a new branch from an up-to-date `main` (`git fetch && git checkout -b <topic> origin/main`).
- Never commit to `main` directly.

## 2. Build and check
- Run the tests and the project's build step (fill in the real commands for this repo).
- Check the change in the running app, not just in the tests.

## 3. Commit
- Stage files by name. Don't use `git add -A`, because it can pick up untracked local files.
- Commit message: what changed and why.

## 4. Pull request
- The title says what the user gets. The body covers what changed, why, what was tested, and what wasn't (be explicit about anything that couldn't be tested).
- When adding to an existing PR, update its title and description to match.

## 5. Build log
Add an entry to `docs/build-log.md` for the request, following the existing format: the prompt word for word (lightly cleaned where privacy needs it, with replaced text in [brackets]), what Claude did, what changed along the way, and the PR link.

3. Create `docs/build-log.md` with this header (keep any existing content below it):

# Build log

How this project is being built with [Claude Code](https://claude.com/claude-code), one request at a time.

Each entry quotes the prompt **word for word**, lightly cleaned where privacy needs it: replaced text is shown in [brackets]. Then it says what Claude did, what changed along the way, and which pull request came out of it. Answers picked from multiple-choice questions Claude asked are shown as *Choice*.

---

Then follow these conventions for this setup change too: make a branch, commit, open a PR, and add the first build-log entry quoting this request.
````

**What Claude did**

- Added the `## Workflow` section to `CLAUDE.md` and adapted it to Newton. It names area labels that match the stack (`backend`, `email-in`, `agent`, `calc`, `mobile`, `boat-data`, `repo`), makes one milestone per build phase, and points to the skill.
- Created `.claude/skills/ship-change/SKILL.md`. Because there is no app code yet, the build step says there are no build or test commands and marks where to add them. It also adds a check of the diff for real boat data and secrets, since the repo is public, and allows `gh issue list` for the duplicate search.
- Created this build log and added `.claude/settings.local.json` to `.gitignore`.

**What changed along the way**

- `CLAUDE.md` only existed on the still-open [#1](https://github.com/heynewton/newton/pull/1), not on `main`. Instead of creating a second copy that would conflict, Claude branched from #1 and opened this PR stacked on it.
- Claude asked whether to create the labels and milestones on GitHub. *Choice:* Yes, create them. Claude then created the seven area labels and the four phase milestones, and left GitHub's default labels as they were.

**Pull request:** [#2](https://github.com/heynewton/newton/pull/2)

---

## Process: roles, board, weekly rhythm and the Phase 1 backlog

**Prompt**

````text
plan the work to build hey newton.
as a scrum master, propose a way to organize.
I'll be prioritizing, and claude will do all the coding.
2 friends could be interested in reviewing, contributing
````

Then, after the proposal:

````text
Yes, set it up. I've run gh auth refresh -s project. Phase 1 screen: web. Friends get write access.
````

**What Claude did**

- Proposed light Kanban with a weekly beat instead of full Scrum: since Claude writes the code, the
  maintainer's review time is the bottleneck, so the process optimizes for small PRs and clear
  "Done when" lists. Roles: maintainer as product owner (merging is acceptance), Claude as the dev
  team, friends as reviewers and contributors.
- Wrote `docs/process.md` (roles, board columns, Definition of Ready and Done, weekly planning and
  review, monthly retro) and added "Picking up work" and "Reviewing" sections to `CONTRIBUTING.md`.
- Created a `web` area label and the 14 Phase 1 issues ([#3](https://github.com/heynewton/newton/issues/3)
  to [#16](https://github.com/heynewton/newton/issues/16)), in dependency order, each with a
  "Done when" list and "Blocked by" lines. The two self-contained `calc` functions are marked
  `help wanted` and the fake sample boat `good first issue`, as entry points for contributors.
- Updated `CLAUDE.md` with the `web` label, a web row in the stack table, and a pointer to the process.

**What changed along the way**

- *Choice:* Phase 1 screen: web. *Choice:* friends get write access.
- The repo ruleset requires no approving reviews but does require resolved review threads, so
  `CONTRIBUTING.md` says reviews are welcome but optional, and that an open thread blocks the merge.
- The `gh` token didn't have the `project` scope yet on the first try, so Claude wrote the docs and
  opened the PR first, then created the [Newton board](https://github.com/orgs/heynewton/projects/1)
  once the scope came through: Status columns Inbox, Ready, In progress, In review, Done, with
  #3 to #16 in Ready in priority order and this PR in review.

**Pull request:** [#17](https://github.com/heynewton/newton/pull/17)

---

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

---

## Logo: the "talking sail", with the web app favicon

**Prompt**

````text
suggest a logo for hey newton
````

Follow-ups, in order:

````text
make talking sail with a nicer boat with spinnaker, going faster
boat is going down, should be the opposite, slightly up. also teal mainsail is too small make it bigger, and spinnaker should be more towards the front of the boat
make boat flat / level. move mast forward to make teal mainsail bigger
remove the teal waves, and make a nicer sea giving some impression of speed
remove the white lines and smooth out the sea at the bow
remove the sea
happy with it
add favicon
make sure to have monochrome version
````

**What Claude did**

- Proposed three concepts as inline SVG sketches: a speech bubble with a sailboat ("talking
  sail"), an N whose diagonal is a sail, and Newton's apple with a sail for a leaf.
- Iterated on the talking sail: added a spinnaker, levelled the boat, moved the mast forward for a
  bigger mainsail, then tried and dropped a sea under the hull.
- Exported the set to `assets/brand/` (primary, small, favicon, light and dark marks, two
  one-colour versions using `currentColor`) with a README on usage and colours.
- Set `favicon.svg` as the web app's App Router icon, replacing the default Next.js `favicon.ico`.
- Rendered every file with `rsvg-convert` to check it, ran `npm run check` and `npm run build`, and
  confirmed the running app serves the icon.

**What changed along the way**

- The mainsail grew twice and the sea came and went; the final mark is just the boat in the bubble.
- The web app only exists in the scaffold PR (#18), so this PR is stacked on `feat/scaffold`
  rather than `main`.

**Pull request:** [#20](https://github.com/heynewton/newton/pull/20)

---

## Feature brainstorm sorted into the spec, ideas before issues

**Prompt**

````text
Here is a brainstorm of features for newton.

Review and Organize them

Auto start / stop navigation log

Voice command
Find Near shelter
Water Temperature
UV index -> how much sunscreen
Where you're going
When do we get there (destination)
Degree to go

Alert
Low water depth soon
Storm strong wind coming

Reminders
Clean seaweed
Ask for alerts
Check the oil

SOP
Instructions on how to get buoys

Profiles:
Owner
Racing
Cruising
Kids
Guest profile
````

````text
Degree means course more than bearing. Course is corrected for ride and other factors.

Ask for alerts is a mistake. I meant that newton should also proactively alert the user in certain situations.
Emergency: low depth, storm coming
Normal notification: maintenance of oil needed soon

Buoys is about tips to pick our mooring at our regular marina.
````

````text
Check for duplicates
````

````text
Wouldn't it make more sense to organize features in a gdoc first and only create issues for the one we're working to develop in the near term?
Or can we have many issues and still have a way to efficiently have an overview and prioritize.
I think there is a GH project. Do you have access to it in this session?
````

````text
Go ahead with all 3
````

**What Claude did**

- Sorted the brainstorm by build phase and split "Profiles" into three separate ideas: role
  (who you are on the boat), sailing mode (racing or cruising) and audience (kids, guests).
- Asked about three unclear items, then read "degree to go" as course to steer (corrected for
  tidal stream and leeway), "ask for alerts" as proactive alerts at two levels (emergency and
  normal), and "buoys" as owner-written tips for picking up the mooring.
- Checked the 12 proposed issues against the 14 open ones: maintenance schedules and reminders
  were already covered (#7, #9, #12), owner-written procedures partly overlap the manuals Q&A
  (#13, #14), and nothing yet covers the on-water voice ideas (then Phase 3, now Phase 2 since #23).
- Added a "Feature ideas" section to the spec in the team Drive, grouped by phase, with the data
  sources Newton doesn't have yet (marine weather, tidal streams, chart depth, harbours, leeway).
- Wrote down in `docs/process.md` and `CLAUDE.md` that ideas live in the spec until their phase
  is close, and become issues at weekly planning.

**What changed along the way**

- The plan was to file every idea as an issue. It changed to keeping ideas in the spec and filing
  issues only for the current and next phase, so the board stays short.
- At first the Claude GitHub App had no access to the repo, so issue creation and the push were
  refused. Once the maintainer installed it, Claude pushed and filed #21 (owner-written
  procedures). The project board still isn't reachable from the session, so cards move by hand.

**Pull request:** [#22](https://github.com/heynewton/newton/pull/22)

---

## Architecture doc: the scaffold today and the target for each phase

**Prompt**

````text
Is there a description of newton technical architecture somewhere? The current scaffold one and the target one for each phases?
If not produced it
````

Follow-up, after the PR was up:

````text
Invert order for phase 2 and 3. I’d like to start working on voice quickly
````

````text
Create issues for the items that you can’t do and I’ll have to do manually.
Update gdrive specs.
Double check that all reference to voice as phase 3 have been moved to phase 2 (and friends is now phase 3 everywhere)
````

**What Claude did**

- Looked in the repo and the Drive spec. The spec has a short architecture section with a diagram,
  but nothing described the current code or what each phase adds technically.
- Wrote `docs/architecture.md`: an overview diagram, the six principles turned into technical
  rules, what is actually built today, the Phase 1 to 4 targets (components, planned layout,
  data flows, matching issues) and the open decisions.
- Linked it from `README.md` and `CLAUDE.md`, and added a rule that PRs which change the
  architecture update the page.
- Rendered the five Mermaid diagrams with mermaid-cli to check they parse.

**What changed along the way**

- Choices not yet made (email provider, job runner, embeddings, voice engines, offline store,
  tides outside the US) are marked as open instead of decided, each pointing to the issue
  that will need it.
- Some sentences read as if the target already existed, so the page got a dated status line,
  and the overview says it shows the target.
- On-water voice moved to Phase 2 and friends' boats to Phase 3, in the README, `CLAUDE.md` (including
  the milestone names) and the architecture page. The voice section now says what it needs from
  Phase 1 (only sign-in, boats and memberships) and that its `calc` and tide work can start early.
- Updated the five phase references in the Drive spec (the Phase 2 ordering note, the emergency alerts
  phase, the voice ideas heading, the onboarding risk and the friends' boats open question).
- Searched the repo and the open issues for any other place that still used the old order. One
  historical build-log line now says "then Phase 3, now Phase 2"; the issues had none.
- Filed the two steps Claude can't do from its session: renaming the milestones
  ([#25](https://github.com/heynewton/newton/issues/25)) and redrawing the spec's build phases
  diagram, which is an image ([#26](https://github.com/heynewton/newton/issues/26)).

**Pull request:** [#23](https://github.com/heynewton/newton/pull/23)

---

## Auth: Supabase Auth with Google and Apple, built so the provider can change

**Prompt**

````text
When is the work to deploy auth0 auth with profiles and tenant linked to a boat planned. I think this should be done very early in the project no?
````

````text
I think I'd rather use auth0 in case I want to move out of supabase. wdyt?
````

````text
I want google and apple social login. can supabase do that
````

````text
yes go ahead
````

**What Claude did**

- Found the work already planned as [#5](https://github.com/heynewton/newton/issues/5) (boats,
  people and memberships under row-level security), unblocked since the scaffold merged, and the
  base most other Phase 1 issues build on. The plan used Supabase Auth, not Auth0.
- Argued against Auth0 as an exit hedge: leaving Supabase is hard because of RLS on the user's
  token, Storage and the client calls, not because of auth. Supabase Auth users live in our own
  Postgres, and magic-link and social logins have no passwords to migrate.
- Proposed cheaper hedges instead and added them to #5: Newton's own `people.id` with the
  provider's ID only in `auth_subject`, RLS through a `current_person_id()` function, and one
  data-access module in the web app. Also added magic-link sign-in, which the architecture page
  listed under #5 but its checklist didn't.
- Confirmed Supabase Auth does Google and Apple, and filed
  [#27](https://github.com/heynewton/newton/issues/27) for them (blocked by #5).
- Wrote the first decision record, `docs/decisions/0001-auth.md`, and updated the Phase 1
  components on the architecture page.

**What changed along the way**

- Apple's "Hide My Email" relay addresses would break email-in, which holds mail from senders who
  aren't members: people forward from their real inbox, not the relay. #27 adds verified sender
  addresses per person, and the email-in row now matches against those.
- Apple's web client secret expires every 6 months, so #27 asks for the renewal to be written
  down with a reminder.

**Pull request:** [#28](https://github.com/heynewton/newton/pull/28)
