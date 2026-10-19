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

---

## Build phases diagram with on-water voice as Phase 2

**Prompt**

````text
Do issue heynewton/newton#26: redraw the build phases diagram in our spec to use the new phase order.

Background: PR heynewton/newton#23 moved on-water voice up to Phase 2 and friends' boats to Phase 3. The spec ("Newton — Product & Architecture Spec", Google Doc in the heynewton folder of the team Drive) has a "build phases · 4 phases, 3 gates" diagram under **Build phases**. The text of the spec already uses the new order. The diagram is an image, so it still shows the old one: Phase 2 friends' boats, Phase 3 on-water voice.

Steps:

1. Open the spec and get the current diagram. Use the Google Drive / Docs connector if you have it, or the browser. If you can't see the image, stop and ask me for a screenshot. Then write down exactly what it shows: each phase box, the three gate diamonds and their wording, the arrows, the caption under it, and the visual style (colours, fonts, layout).
2. Propose the new version in text before drawing anything:
   - Order: Phase 1 home side → Phase 2 on-water voice → Phase 3 friends' boats → Phase 4 paid product.
   - Rewrite each gate so it still makes sense where it now sits. The gate into voice is about our own boat (for example, "Newton is useful on our own boat"). A "friends' boats are useful" gate now goes before Phase 4. Keep the original wording wherever it still fits.
   - Update the caption if it needs it.
   Wait for my OK.
3. Draw it in a style close to the original: SVG, exported to PNG at 2x width for the doc. Save both outside the repo, for example ~/Downloads/newton-build-phases.svg and .png. The spec lives in Drive, so don't commit them.
4. Put the new image in the doc. If you can edit the doc (connector or browser), swap the image in place, keep its size and position, and fix the caption. If you can't, tell me the file path and the exact caption text, and I'll swap it myself.
5. Read the Build phases section back and check that the picture, the caption and the text all agree.
6. Close #26 with a short comment saying what changed (new order, any gate wording that changed). End the comment with:

---
_Generated by [Claude Code](https://claude.ai/code)_

Don't change anything else in the spec. Don't open a branch or a PR: no repo files change.
````

Follow-ups, in order:

````text
yes
Yes, draw it
````

When asked how to get the PNG into the doc (the Docs API only inserts images from a public URL):

````text
push to repo which is public and link in gdoc from there.
````

*Choice:* Branch + PR, keep it

**What Claude did**

- Read the spec through the Google Docs connector and downloaded the embedded diagram: four phase
  boxes (Phase 1 highlighted in blue), a gate line with three diamonds, and the title "Each phase
  earns the next: prove it on our boat before asking friends".
- Swapped the Phase 2 and Phase 3 boxes and reordered the gates to match. Every gate's original
  wording still fit where it now sits, so none was rewritten: "Co-owners use it instead of our
  folders and emails" leads into voice, "Answers trusted in a real race" into friends' boats, and
  "Friends keep using it without our help" into the paid product. The caption stayed the same.
- Redrew it as SVG at the original's proportions and exported a 1344 × 476 PNG with `rsvg-convert`.
- Committed both to `docs/images/`, pushed the branch, and inserted the PNG into the doc from its
  commit-pinned raw GitHub URL at the original 432 × 153 pt, replacing the old image in place.
- Read the Build phases section back and downloaded the embedded image to confirm the swap.

**What changed along the way**

- The brief said not to commit the diagram. Because the Docs API only inserts images from a public
  URL, the files went into the repo instead, which also keeps the SVG source for the next edit.
- The spec was edited by someone else between the read and the first write, so the first insert was
  refused on its revision check and redone against a fresh read.

**Pull request:** [#29](https://github.com/heynewton/newton/pull/29)

---

## Preview deployments for every PR

**Prompt**

````text
can I have a link to a preview in the PR? like "deployed to dev"
````

Then, after Claude suggested Vercel and asked how to sign up:

````text
should I sign with [personal email] on vercel or with a @heynewton.app email? (via email forward)
````

````text
why not a vercel team right away
````

````text
I don't like a vercel linked to my personal email for heynewton previews. suggest another way to get vercel previews
````

````text
dev@heynewton.app rule route to [project inbox]
````

````text
preview with option b
````

**What Claude did**

- Filed [#19](https://github.com/heynewton/newton/issues/19) and kept it up to date as the
  decisions came in.
- Added `.github/workflows/deploy.yml`. On each PR from this repo it builds the web app with the
  Vercel command-line tool and deploys a preview. On each push to `main` it updates the dev site.
  Each deploy is reported as a GitHub deployment (`preview` or `dev` environment), so the PR shows
  "This branch was successfully deployed" with a **View deployment** button.
- The workflow also turns off Vercel Authentication on the project, so contributors can open
  previews without a Vercel account. This is safe because previews only use fake data.
- Added a "Previews" section to `docs/process.md`.

**What changed along the way**

- Claude first suggested signing up to Vercel with "Continue with GitHub". The maintainer didn't
  want the project tied to a personal account, so the Vercel account uses the project address on
  the `heynewton.app` domain. Of the two ways to connect it (Vercel's GitHub app on the org, or
  GitHub Actions with a token), *Choice:* option B, GitHub Actions. The only link between the repo
  and Vercel is the `VERCEL_TOKEN` secret.
- Claude explained that a Vercel team needs the paid Pro plan, so the project starts on the free
  Hobby plan and moves to a team before Phase 4 (commercial use).
- The production URL handling was simplified to "report the URL Vercel prints", because it couldn't
  be checked until the token exists.
- The maintainer created the Vercel account and set `VERCEL_TOKEN` with `gh secret set`, so the
  token never went through the chat.
- The first deploy failed: npm workspaces put packages in the root `node_modules`, which a deploy
  run from `apps/web` can't see. Claude switched to Vercel's monorepo setup: run from the repo root,
  with the project's root directory set to `apps/web`.
- The project's very first deploy went to Vercel's production target even though it came from a PR.
  A re-run confirmed that later PR deploys are previews.
- While fixing this, Claude found another branch checked out in the main folder, so it did the fix in
  a separate git worktree.

**Pull request:** [#30](https://github.com/heynewton/newton/pull/30)

---

## Homepage: what Hey Newton is, how to get started, and a footer on every page

**Prompt**

````text
let's start phase 1 with a homepage for new boat / new user.
is there an issue for that? if not, create it. and define a plan for it
````

Follow-ups, in order (the later ones sent while Claude was working):

````text
Move #31 to In progress and build it on a new branch from main.
````

````text
Homepage should explain what is "Hey Newton".
And offer to "Get started for free", or offer to existing users to access their account.
````

````text
Every page should have a privacy and terms footer, maybe that should be design as one common element for all pages.
````

````text
how many screensize should we optimize for? 2 (phone, laptop) or 3 (phone, tablet, laptop)?
devices used are are typically:

* everywhere: phones: iphone 15 or similar

* on board the boat small tablets at nav station or outside: 9" screens
* on boat larger tablets ipad pro or laptops
* at home: laptops and desktop with large monitors
````

````text
do you recommend 2 or screen sizes? given that tablets are small, I would think 2 is fine
````

````text
2 or 3
````

````text
yes write in docs the decision for 2 screen sizes
````

````text
not "The assistant that knows your boat inside out."
but "The AI assistant that knows your boat inside out."
````

````text
"On the water, say “Hey Newton” and get answers out loud. At home, Newton help owners with maintenance, documents and navigation planning."
````

````text
wdyt of "Ask out loud, hands on the helm. Newton answers using data from your instruments, weather forecast, charts, and your specific boat files."
````

````text
add weather and add idea to spec
````

````text
instead of "Newton supports the skipper; it doesn't replace them. Every answer says where it came from and how fresh the data is." just "Newton supports the skipper; it doesn't replace them."
````

*Choice:* Yes, make the page description match the intro: answers out loud on the water, maintenance, documents and navigation planning at home.

**What Claude did**

- Found no existing issue. #15 (records screen) and #27 (Google and Apple sign-in) were close but
  assume a boat already exists. Split the first run into two flat issues: #31, the signed-out
  homepage (blocked by nothing), and #32, adding your first boat after signing in (blocked by #5
  and #31). Both went on the board with the Phase 1 milestone.
- Moved #31 to In progress and built it: a homepage that explains Hey Newton at home and on the
  water (on the water marked "Coming soon"), **Get started for free** and **Sign in**, and
  placeholder `/get-started` and `/sign-in` pages until the magic link lands in #5.
- Added one footer in the root layout, so every page has Privacy, Terms, licence and repo links.
  `/privacy` and `/terms` are placeholders. Opened #33 to write the real texts before sign-up
  opens to anyone outside the team.
- Checked the pages in the browser at phone, tablet and desktop widths, in light and dark mode.
  The tablet check showed some links were shorter than 44px, so they were made taller for touch.
- Recorded the screen-size decision in `docs/decisions/0002-screen-sizes.md`: two layouts (phone
  below 640px, wide from 640px up for tablets and laptops), touch targets of at least 44px on both,
  and checks at 390px, 800px and 1280px. Linked it from the architecture page and added the three
  widths to the `ship-change` checklist.
- Rewrote the homepage copy as asked: "The AI assistant…" headline (also in the page
  description), the new intro line, and the on-water card, which now lists instruments, tides,
  weather, charts and the boat's own documents, and keeps "even without signal".
- Added "Weather on request" to the spec's Phase 2 feature ideas, next to the storm alert: a marine
  forecast downloaded before leaving, always stated with its source and issue time. The forecast
  source is still open, under "Data we don't have yet".
- Shortened the safety line under "What is Hey Newton?" to "Newton supports the skipper; it
  doesn't replace them."
- Made the page description (search results and link previews) match the new intro line.

**What changed along the way**

- The first plan had a single **Sign in** button. It became "Get started for free" plus a way in
  for existing users, and #31 was rewritten to match.
- The footer started on the homepage only, then moved into the layout as a shared component.
- Claude first recommended three screen sizes (phone, tablet, laptop). The maintainer pointed out
  that the on-board tablets are small, and it became two layouts, still tested at three widths.
- For the on-water line, Claude suggested keeping "even without signal", saying "your boat's own
  documents" rather than "files", and leaving weather out until it had a phase in the spec. The
  maintainer chose to add weather and the spec idea together.
- One commit was pushed after a failed check: the shell had switched to Node 18 and the `&&`
  chain only tested `grep`. The code was fine on Node 22; checks now run with their real exit code.

**Pull request:** [#34](https://github.com/heynewton/newton/pull/34)

## heynewton.app serves the homepage

**Prompt**

````text
let start 35. I can do the vercel setup to start
````

**What Claude did**

- Checked that #35 was unblocked: the homepage (#31) had merged in #34.
- Split the work: the maintainer adds the domain in Vercel and the DNS records in Cloudflare
  (account access), Claude does the repo side.
- Opened #37 to move heynewton.app to a production Vercel and Supabase project before sign-in (#5)
  opens to anyone outside the team, so the domain never serves real boat data from the dev setup.
- Noted in `docs/process.md` (Previews) that heynewton.app currently serves the dev site and why
  that changes, and in `docs/architecture.md` where the domain points (Today, the Phase 1 Hosting
  row, and the Phase 3 dev/prod split).

**Pull request:** [#38](https://github.com/heynewton/newton/pull/38)

---

## Fake sample boat in fixtures/

**Prompt**

````text
items in progress are almost done. what is next
````

Claude read the board: the top of Ready was #4, the sample boat. *Choice:* "Start #4 once #30 and #34 are merged: branch from an up-to-date main and build the fake sample boat in fixtures/." #30 was merged, but #34 (the homepage) was still waiting for review. *Choice:* "Don't wait for #34. Start #4 from main now, and rebase it later if the build log conflicts."

**What Claude did**

- Added `fixtures/sample-boat/` with an invented boat, Kittiwake, in `boat.json`: three co-owners at 40/35/25, a crew member, and each person's verified sender addresses, shaped like the planned `boats`, `people` and `memberships` tables.
- Wrote four fake documents as plain text (insurance certificate, registration, yard invoice, engine manual excerpt), plus five inbound `.eml` files with them attached as PDFs. One email comes from a non-member, so email-in can test holding mail.
- Added `build.mjs`, a script with no dependencies that turns the text into one-page PDFs and builds the emails. It gives the same bytes on every run.
- Chose numbers that are useful in tests: an invoice total that doesn't split evenly, a registration that expires soon, and an oil change due by hours or date, whichever comes first.
- Updated the Fixtures row in `docs/architecture.md`.

**What changed along the way**

- Claude first planned text-only attachments. It switched to generated PDFs so the emails look like real inbound mail, while keeping the text sources easy to review.
- Rendering the invoice PDF showed the totals sitting two characters right of the amount column, so the text source was realigned.
- `npm run check` failed at first on `apps/web/.next` types left over from the homepage branch. Those are generated and git-ignored, so Claude deleted the folder and the checks passed.

**Pull request:** [#36](https://github.com/heynewton/newton/pull/36)

---

## Due dates: what's overdue and what's coming up, by date or engine hours

**Prompt**

````text
start 6 and 7
````

*Choice* when asked where #7 should go, since the session could only push to the branch holding
#6: **Separate branch** (its own PR, one issue per PR).

**What Claude did**

- Wrote `nextDue` for the three kinds of due date the issue named: a renewal's expiry date, a
  yearly renewal one year after it was last done, and maintenance every N months and/or N engine
  hours.
- Wrote `findDue`, which splits items into overdue and due soon within a window of days (and
  optionally engine hours). Maintenance is due on whichever of date and hours comes first, and
  each result says which one triggered it, so a reminder can give its reason.
- Kept dates as plain `YYYY-MM-DD` with no time zone. Adding months moves to the month's last day
  when the day doesn't exist (31 January + 1 month is 28 or 29 February).
- Tests cover month ends, leap years (including a yearly renewal done on 29 February), the
  boundaries of the due day and the window, both ways "whichever comes first" can go, and bad input.
- Listed the functions in the Today section of `docs/architecture.md`.

**What changed along the way**

- #6 and #7 were built in the same session but shipped as two PRs, one issue per PR.
- Results keep their input order; sorting the digest by urgency is left to the reminders job (#12).

**Pull request:** [#40](https://github.com/heynewton/newton/pull/40)

---

## Co-owner cost split: who owes what, from tested code

**Prompt**

````text
what issues can you handle now
````

````text
start 6 and 7
````

**What Claude did**

- Listed the open issues and checked what each was blocked by. #6 (cost split) and #7 (due dates)
  were the only ones blocked by nothing open, with nothing to wait on from the maintainer: pure
  functions in `packages/calc`, which already exists.
- Took #6 first and wrote `splitCosts`. Expenses in integer cents with a payer and a date, plus
  ownership shares, give each co-owner what they paid, their part, and their balance.
- Picked the remainder rule and wrote it down in the code. Each expense is split on its own,
  whole cents rounded down, with leftover cents going to the largest fractional parts and ties
  going to the first co-owner in the list. Parts always add up to the expense, and balances to zero.
- Wrote tests for the three cases the issue named (a 3-way split with a remainder, unequal shares,
  one owner paying everything), plus refunds, shares as a ratio, a sweep of amounts checking the
  sums, and every kind of bad input.
- Listed the function in the Today section of `docs/architecture.md`.

**What changed along the way**

- One test failed at first because Claude's hand arithmetic for the expected values was wrong
  (two of the three expenses left two cents over, not one). The function was right; the expected
  values were fixed and the working was written next to them.
- #6 and #7 go in separate PRs, one issue per PR.
- The board couldn't be updated from the session (#24), so the cards still need moving by hand.

**Pull request:** [#39](https://github.com/heynewton/newton/pull/39)

---

## Sign in with an email link, with boats, people and roles under row-level security

**Prompt**

````text
can you start #5 sign-in now?
````

Follow-up, sent while Claude was working:

````text
what account should I use on docker
````

**What Claude did**

- Read #5 (boats, people and roles under RLS, with magic-link sign-in) and its blocker #3, already
  closed. The current checkout had uncommitted work for the sample boat (#4), so #5 was built in a
  separate git worktree on a new branch from `main`, leaving that work untouched.
- Set up the Supabase CLI in the repo and wrote one migration: `boats`, `people` and `memberships`
  with the four roles. As in decision 0001, `people.id` is Newton's own ID, the provider's user ID
  stays in `people.auth_subject` (column grants keep it out of the API), and every policy goes
  through `current_person_id()`. A `can_write_boat()` helper is ready for record tables, so
  read-only members can't write.
- Wrote 26 pgTAP tests with four made-up people across two boats. They cover what each role can
  see and change, signed-out access and `auth_subject`. Added a CI job that runs them on a fresh
  Postgres.
- Built the web side: a data-access module in `apps/web/src/lib/db` (with a lint rule against
  Supabase imports anywhere else), the magic-link form, a callback route, a `/boats` page, a
  "link didn't work" page and a proxy that refreshes the session. Without Supabase settings, as on
  previews, `/sign-in` keeps its placeholder.
- Tried the whole flow in the browser on the local stack with a fake address, from requesting the
  link to signing out and reusing an old link. Checked the screens at 390px, 800px and 1280px.
- Answered the follow-up: local Supabase needs no Docker account, so skip sign-in. If one is ever
  needed, use the project address, not a personal one.

**What changed along the way**

- `/boats` first got stuck on "Loading…": with Cache Components on, the Supabase client read the
  clock while Next.js prerendered the page. The data-access module now waits for the request
  (`connection()`) before touching the database.
- The first screen check found the email field and button were about 40px tall. They now meet the
  44px touch-target rule from the screen-size decision.
- Another session's dev server held port 3000, so the local redirect allow-list now accepts any
  localhost port.
- A test meant to show that co-owners can't add members passed for the wrong reason: the co-owner
  couldn't even see the person being added. The tests now look up IDs outside RLS.

**Pull request:** [#41](https://github.com/heynewton/newton/pull/41)

---

## The sample boat, ready to sign in to after a database reset

**Prompt**

This one came from another Claude Code session, which split it off while working on sign-in:

````text
Background (from the session that started this one):
Newton (heynewton/newton) is in Phase 1. PR #41 (branch feat/supabase-auth, closes #5) adds a local Supabase stack: a migration with boats, people (Newton's own id, with the auth provider id only in people.auth_subject) and memberships with roles, RLS through current_person_id(), pgTAP tests, and magic-link sign-in in apps/web with a /boats page. The fake sample boat (#4) landed on main separately, in PR #36. supabase/seed.sql is just a placeholder comment for now. Start this after #41 merges, or branch from feat/supabase-auth if it hasn't merged yet. Never put real boat data in the repo.

Task:
Load the fake sample boat in `fixtures/sample-boat/boat.json` (Kittiwake, its people and memberships) into the local Supabase stack through `supabase/seed.sql`, so `npm run db:reset` gives a signed-in-ready demo boat. Each fixture person needs an `auth.users` row (the `create_person_for_auth_user` trigger then creates their `people` row), plus a boat and memberships with the right roles (owner, co_owner, crew, read_only). Generate the seed from boat.json with a small script (as `fixtures/sample-boat/build.mjs` does for PDFs) or write it by hand, whichever is clearer. Ownership shares belong to the cost-split work (#6/#9), so leave them out unless a column already exists. Done when `npm run db:reset` loads the boat, signing in locally by magic link as a fixture person (the mail catcher is at http://127.0.0.1:54324) shows Kittiwake on `/boats` with the right role, and `npm run db:test` still passes. Follow CLAUDE.md: first search for an existing issue (`gh issue list --search "seed"`) and create one if there is none, branch from an up-to-date main, open one PR, and add a build-log entry.
````

**What Claude did**

- Found no issue for the seed, so opened #42 (backend, Phase 1) and moved it to In progress.
  #41 hadn't merged yet, so the branch starts from `feat/supabase-auth` and the PR is stacked on it.
- Wrote `fixtures/sample-boat/build-seed.mjs`, which turns `boat.json` into `supabase/seed.sql`:
  an auth user and email identity per person, the boat, and the memberships. The trigger makes each
  person, who then takes the fixture's ID and name. The auth IDs are kept separate from the person
  IDs, as the auth decision asks.
- Added a CI step that fails if `seed.sql` no longer matches `boat.json`, and documented how to sign
  in as each fixture person.
- Reset the local database, ran the RLS tests (26 pass), then signed in as Sam by magic link
  through the mail catcher: `/boats` showed Kittiwake as Co-owner.

**What changed along the way**

- Generating instead of hand-writing the seed won because `boat.json` already holds the IDs and
  roles, and a CI check can keep the two in step.
- The fixture has no read-only person, so the seed covers owner, co-owner and crew only. Ownership
  shares wait for #9.

**Pull request:** [#43](https://github.com/heynewton/newton/pull/43)

---

## Board cards move by themselves

**Prompt**

````text
can you improve the gh project workflow so that the cards move when the PR is created and merged?
````

**What Claude did**

- Filed [#49](https://github.com/heynewton/newton/issues/49) and checked the board's built-in
  workflows. All of them except "Auto-add sub-issues" were off, including "Item closed" and
  "Pull request merged", which is why cards kept getting stuck.
- Added `.github/workflows/board.yml` and `.github/scripts/board.sh`:
  - Opening a PR moves it and the issues it closes to In review; a draft moves them to In progress.
  - Merging moves them to Done. A PR closed without merging sends its issues back to Ready.
  - New issues land in Inbox, and assigning one moves it to In progress.
- Added a "Cards move by themselves" section to `docs/process.md`.

**What changed along the way**

- The built-in workflows can only be switched on in the GitHub UI and can't move an issue when its
  PR opens, so the workflow handles every move itself. It doesn't depend on the built-ins.
- `GITHUB_TOKEN` can't write to an organisation's project, so the workflow needs a `PROJECT_TOKEN`
  secret.
- Claude first said the same token could go in the cloud environment for #24. The Claude Code docs
  say the cloud sessions' GitHub proxy blocks GraphQL (which Projects v2 needs) whatever the token,
  so that can't work. This workflow is how cards move when a cloud session opens or merges a PR.
  Claude noted this on #24.
- The workflow uses `pull_request`, not `pull_request_target`, so it runs from the PR's own branch
  and could be tested on this PR before merging. Forks don't get secrets, so their cards stay manual.
- Claude tested the script locally against the real board on cases that shouldn't move anything
  (#49 assigned while already In progress, #4 closed while already Done).

**Pull request:** [#50](https://github.com/heynewton/newton/pull/50)

---

## Who can move board cards, now that cloud sessions can't

**Prompt**

````text
start 24, 8 and 9 in 3 parallel sessions
````

**What Claude did**

- Started one session per issue. This entry is the one for
  [#24](https://github.com/heynewton/newton/issues/24) (giving Claude access to the board).
- Rewrote #24's "Done when" for the approach that works: the Board workflow from #50 and its
  `PROJECT_TOKEN` repo secret keep the board current, and the cloud `GH_TOKEN` items are gone.
  Checked off what was already true (#21 and #24 are on the board, the token exists as the secret,
  the workflow moves cards).
- Added a "Who can move cards by hand" note to `docs/process.md`: people and local sessions can;
  cloud sessions can't, because their GitHub proxy blocks GraphQL, so they assign the issue and
  open the PR with `Closes #N` and let the workflow move the cards. It also says the token expires
  and must be renewed.
- Updated the board line in `CLAUDE.md` to say the same.

**What changed along the way**

- The plan in #24 was to put a token in the cloud environment as `GH_TOKEN`. The Claude Code docs
  say that can't work whatever the token, so #24 now closes with docs instead of a token.

**Pull request:** [#51](https://github.com/heynewton/newton/pull/51)

---

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

---

## A private document store for each boat

**Prompt**

````text
start 24, 8 and 9 in 3 parallel sessions
````

**What Claude did**

- Started one session per issue. This entry is the one for
  [#8](https://github.com/heynewton/newton/issues/8) (the per-boat document store).
- Added `supabase/migrations/20261019100000_documents.sql`:
  - A private Storage bucket, `documents`, with one folder per boat (`<boat_id>/...`).
  - A `documents` table: boat, storage path, type, source (email or upload), received date,
    filename, content type, size and who added it.
  - Row-level security on both, reusing the roles from #41: members read; owners, co-owners and
    crew add; owners and co-owners delete; read-only members only read.
- Added 32 database tests in `supabase/tests/database/documents.test.sql`, covering every role and
  signed-out visitors, for both the table and the bucket.
- Updated `docs/architecture.md` with the document store.

**What changed along the way**

- The issue asked the tests to reuse the existing tenancy setup, which lived inside
  `rls.test.sql`. Claude moved it into `supabase/tests/database/setup/tenancy.psql` and both test
  files include it. Claude first checked that `supabase test db` follows `\ir` includes and doesn't
  run the `.psql` file as a test.
- Files have no update policy, so a stored document can't be overwritten: a correction is a new
  file. Only a document's type and filename can be changed after it's added.
- The first test run failed because the test chose a document's `id`, which the column grants
  didn't allow. Claude allowed it, so an upload path can include the document's id before the row
  exists.
- CI starts only Postgres, not the Storage API, so the storage policies are tested by writing
  `storage.objects` rows as the signed-in person. No real upload went through the API yet. The PR
  says so.
- Deleting a boat removes its document rows but not its files, since files can only be removed
  through the Storage API. Noted for export and transfer (#16).
- The two parallel sessions agreed up front: #8 keeps the `documents` name and an `id uuid` key
  for #9 to reference, uses the earlier migration timestamp, and leaves `supabase/seed.sql` to #9.
  Seeding sample documents is a follow-up.

**Pull request:** [#52](https://github.com/heynewton/newton/pull/52)

---

## Add your first boat after signing in

**Prompt**

````text
can you also start 32 and 37 in parallel or they depend on other items?
````

**What Claude did**

- Built [#32](https://github.com/heynewton/newton/issues/32) in its own session, in parallel with
  the sessions on #8, #9 and #24.
- Added `create_boat(boat_name)`, a SQL function that inserts the boat and the caller's `owner`
  membership in one transaction, so a boat never exists without an owner. Signed-in people still
  can't insert boats directly. 14 new pgTAP tests cover it.
- `/` now sends a signed-in person to `/boats`, which goes on to `/boats/new` (no boat), their one
  boat, or a picker. `/boats/new` asks only for the name. `/boats/<id>` shows the boat's name and
  next steps marked "Coming soon".
- Checked the flow in the running app with made-up people, at 390px, 800px and 1280px, in light
  and dark mode.

**What changed along the way**

- Two other sessions were changing the database at the same time, so Claude ran its own Supabase
  stack under a different project name and ports instead of sharing the default one.
- Testing the picker showed the boat list wasn't sorted: ordering by an embedded table in Supabase
  only sorts inside each row's embed. The list is now sorted in code.
- Vercel previews have no database until #37, so the flow was only tested locally.

**Pull request:** [#53](https://github.com/heynewton/newton/pull/53)

---

## Renewals, maintenance and expenses stored per boat

**Prompt**

````text
start 24, 8 and 9 in 3 parallel sessions
````

The session that got the prompt started this one with issue #9 and the coordination rules for
working next to #8: #8 owns the `documents` table and the earlier migration timestamp, this PR owns
`supabase/seed.sql`, and `document_id` becomes a foreign key once #8 has merged.

**What Claude did**

- Read the inputs of `calc`'s due dates (#40) and cost split (#39) first, then shaped the tables to
  match: `renewals` with an expiry date, `maintenance_items` with an interval in months and/or engine
  hours plus the last-done date and reading, `expenses` in integer cents with a currency and a payer.
  A reader only renames columns.
- Added `ownership_share` to `memberships`, which the cost split needs and #43 had left for this PR.
- Row-level security reuses `can_read_boat()` and `can_write_boat()` from #41: the same four
  policies on each table. 43 new pgTAP tests in `supabase/tests/database/records.test.sql`.
- Added Kittiwake's renewals, maintenance and expenses to `boat.json`, mostly from the fixture
  documents (the yard invoice, the insurance certificate, the registration and the manual's
  intervals), and extended `build-seed.mjs` to write them and the ownership shares into the seed.
- Checked that the seeded rows go straight into `findDue` and `splitCosts` with a throwaway script.

**What changed along the way**

- Another session already had a local Supabase stack running under the default project name, so
  Claude ran its database from a scratch copy of `supabase/` with its own project name and ports.
- The payer is checked by a trigger rather than a foreign key to `memberships`, so an expense stays
  when its payer later leaves the boat and past splits don't change.
- #8's PR (#52) hadn't merged when this PR opened, so `document_id` started as a plain column.
  After #52 merged, Claude rebased, made `document_id` a foreign key and switched the tests to #52's
  shared `setup/tenancy.psql`. The foreign key covers `(document_id, boat_id)`, so a record can't
  point at another boat's document, and deleting a document clears only `document_id`
  (`on delete set null (document_id)`, Postgres 15 and later) and keeps the record.
- The seed leaves `document_id` null: the sample documents aren't seeded yet.

**Pull request:** [#54](https://github.com/heynewton/newton/pull/54)

---

## Board views, and up to four issues in progress

**Prompt**

````text
could you change the board design to something easier to visualize? propose a way to group, maybe with columns or whatever is standard for board design. But I find the current table view not easy to follow
````

Then:

````text
I've decided to allow max 4 in progress at a time.
updated on gh, reflect in /docs/
````

**What Claude did**

- Added two views to the project board through GitHub's REST API:
  - **Kanban**: issue cards in Status columns, showing the area label, phase, linked PR and
    assignee. PRs are left out because they already show on the issue they close.
  - **By phase**: open issues grouped by milestone and sorted by status, for planning.
- Changed the work-in-progress limit from two to four in `docs/process.md`, `CLAUDE.md` and
  `CONTRIBUTING.md`, so all three agree with the column limit the maintainer set on the board.
  `docs/process.md` now links straight to the Kanban view.

**What changed along the way**

- The API can create views but can't edit or delete them. A first board view came out without
  labels or phase on its cards, so Claude created a corrected "Kanban" view. The maintainer
  deleted the first one, renamed the original table to "All items", moved Kanban to the first tab
  and set the column limit in the GitHub UI.
- The limit also appeared in `CLAUDE.md` and `CONTRIBUTING.md`, outside `docs/`, so Claude updated
  them in the same PR so the rules don't contradict each other.
- The main folder had another session's branch checked out, so Claude made this change in a
  separate git worktree.

**Pull request:** [#44](https://github.com/heynewton/newton/pull/44)

---

## Link the team Drive, spec and admin docs from the repo

**Prompt**

````text
should we add in the repo the link to the gdrive folder? access is restricted so it shouldn't be an issue for confidentiality?
[link to the heynewton Drive folder]

spec doc: [link to the spec]
admin info: [link to the accounts, domain and expenses doc]
````

**What Claude did**

- Confirmed that a link to a Drive folder or doc shared as "Restricted" only opens for people it
  is shared with, so it is safe in a public repo. The risk is someone later switching sharing to
  "Anyone with the link", so `CLAUDE.md` now says to keep it on "Restricted".
- Added the folder, the spec and the accounts, domain and expenses doc to `CLAUDE.md`, and linked
  the spec where `docs/architecture.md` and `docs/process.md` mention it.
- Opened both docs with the Google Docs connector to check the titles. Nothing from them was
  copied into the repo.

**What changed along the way**

- The session started with a request to edit the spec. Drive search wasn't working in the
  session, so Claude couldn't find the doc without its link. With the links in the repo, later
  sessions can open the spec directly through the Google Docs connector.

**Pull request:** [#56](https://github.com/heynewton/newton/pull/56)

---

## History of PRs by phase and topic

**Prompt**

````text
create a doc that gives an history of the PR grouped by logic categories, maybe the issues milestones? suggest a plan.
````

````text
go with the repo, your categories, and update via ship-change
````

**What Claude did**

- Read every PR and open issue. Every open issue is in the Phase 1 milestone, so grouping by
  milestone alone would put everything in one bucket. Proposed phase first, then topic, and a
  repo page over a Google Doc so it updates with each PR.
- Added `docs/history.md`: Phase 1 merged PRs under seven topics (how we work, architecture and
  decisions, repo and infrastructure, brand and website, calculations, data and security, web
  app features), each line with the merge date and the issue it closed. Then the open PRs, and
  the open Phase 1 issues grouped by what they deliver.
- Added a step to the `ship-change` skill and a line to `CLAUDE.md` so every PR adds itself to the
  page.

**What changed along the way**

- Most PRs carry no labels or milestones, so each PR's topic came from the issue it closed, or
  from its content when it closed none.
- #44 and #54 merged while this was being written, so `main` was merged in first and both went
  under their topics.
- Added to the open PR for the Drive links (#56) rather than a new PR, since this session works
  on one branch.

**Pull request:** [#56](https://github.com/heynewton/newton/pull/56)

---

## A brief for new maintainers

**Prompt**

```text
A friend, [name] (https://github.com/[handle]) may start contributing as admin / maintainer. I gave him access to gh and gdrive.
write a brief for a new admin / maintainer, I think this is different than contribute.md (PR but no review or merge, nor backlog priorities; and no access to gdrive)
```

**What Claude did**

- Added `docs/maintainers.md`: what a maintainer does on top of contributing (merging, triage and
  the order of Ready, milestones, the spec in Google Drive, repo settings and secrets), how to
  merge given the current rules on `main`, and how to work with Claude.
- Checked the "Protect main" ruleset before writing the merge section: squash only, threads must be
  resolved, no approvals required, no required CI check and no bypass, so admins also go through PRs.
- Changed "the maintainer" to "maintainers" in `docs/process.md` and `CONTRIBUTING.md`, with links
  to the brief.

**What changed along the way**

- The "Between maintainers" section (agree direction-changing calls, don't merge your own product
  or settings PR alone) is a proposed default, not an existing rule.

**Pull request:** [#55](https://github.com/heynewton/newton/pull/55)

---

## Contributors aren't told about the in-progress limit

**Prompt**

````text
remove the reference to at most two, it's not really relevant
````

**What Claude did**

- The old "at most two" wording was already gone from `main` (#44), and #55 had been updated to say
  four. What remained was the sentence in `CONTRIBUTING.md` telling contributors how many issues
  can be in progress across the team. Claude removed it: contributors only need to assign
  themselves before starting.
- The limit stays where the board rules live: `docs/process.md` (the In progress column) and
  `CLAUDE.md`.

**Pull request:** [#57](https://github.com/heynewton/newton/pull/57)

---

## README links to the docs

**Prompt**

```text
revise root readme.md to link more to the .md files in docs.
architecture.md
history.md
process.md
maintainer.md
contributin.md (should we move contributing into docs, or not because it's common to have it at root?)
```

**What Claude did**

- Added a Documentation table near the top of `README.md` linking architecture, decisions,
  history, build log, process, CONTRIBUTING and the maintainer brief, each with one line on what
  it covers.
- Linked the history page under Build phases, and process and the maintainer brief under
  Contributing.
- Added the missing Web app row (Next.js + Tailwind) to the README stack table, to match `CLAUDE.md`.
- Kept `CONTRIBUTING.md` at the root: it's where people look for it, and other pages link to it there.

**What changed along the way**

- Moved #55 and #56 from **In progress** to "How we work" in `docs/history.md`, now that they merged.
- #57 merged without a history line, so it went under "How we work" when `main` was merged in.

**Pull request:** [#58](https://github.com/heynewton/newton/pull/58)

---

## Deploys stay under Vercel's free upload limit, and the road to production

**Prompt**

````text
plan what should be the next issues. goal is to get 37.
````

Then:

````text
Create the issues from your plan, re-scope #37 as the final cutover with Blocked by lines, put them in Ready in that order, and start the deploy-upload fix. Merge #57 as docs-only.
````

**What Claude did**

- While waiting on #57's checks, the deploy failed twice. The Vercel CLI said the free plan's
  5,000 uploaded files a day were used up, and suggested `--archive=tgz`. `main` deploys failed
  the same way, so the dev site stopped updating.
- Planned the work to reach #37 (heynewton.app on production) as five issues, in order:
  - [#59](https://github.com/heynewton/newton/issues/59): deploys stay under the upload limit (this PR)
  - [#60](https://github.com/heynewton/newton/issues/60): a hosted dev database, migrated and
    seeded from `main`
  - [#61](https://github.com/heynewton/newton/issues/61): sign-in emails sent from `heynewton.app`
    through an email provider, possibly the same one #10 uses for inbound mail
  - [#62](https://github.com/heynewton/newton/issues/62): previews and the dev site sign in against
    the dev database
  - [#63](https://github.com/heynewton/newton/issues/63): a production database and deployment,
    behind an approval
- Re-scoped [#37](https://github.com/heynewton/newton/issues/37) as the final DNS cutover, blocked
  by #62 and #63, and put the six issues at the top of Ready in that order.
- Merged #57 as docs-only, since its only failing check was the deploy quota.
- For #59: added `--archive=tgz` to the deploy step, and a note in `docs/process.md` (Previews) on
  the limit and what a quota failure means.

**What changed along the way**

- Claude's previous reply ended in the question box before the plan itself was written out, so the
  maintainer approved the plan without seeing it. Claude spelled out the plan when creating the
  issues.

Then, in another session:

````text
suggest ways to not be blocked by the vercel limit
````

````text
do 1 and 2 in one pr
````

- Claude read the failed runs: the cap is files uploaded a day, not deploys, and `--prebuilt`
  uploads every file of the build output. Most of that evening's PRs were docs-only, yet each
  deployed twice (preview, then `main`).
- It suggested, best first: upload one archive, skip deploys when the site didn't change, promote
  the preview instead of rebuilding on merge, or move to the Pro plan (already planned for #37).
- Option 1 was already in this PR, so Claude added option 2 here instead of opening a new one: the
  Deploy workflow only runs when `apps/web/`, `packages/`, the root package files, `.nvmrc` or the
  workflow change. Deploy isn't a required check in the `main` ruleset, so a skipped run doesn't
  block merging.
- Moved #58 from **In progress** to "How we work" in `docs/history.md`, now that it merged.

**Pull request:** [#64](https://github.com/heynewton/newton/pull/64)

---

## Every token written down, so prod gets the same ones

**Prompt**

````text
write details on token in repo so that we can have exact same for prod
````

Before this, while setting up the hosted dev database (#60), the maintainer asked:

````text
checked or not
````

(about Supabase's Data API options),

````text
gh token is from my personal user or from org?
````

and shared screenshots of Supabase's token permissions form, asking which permissions to choose.

**What Claude did**

- Added `docs/tokens.md`. It lists every secret and variable the automation uses (`VERCEL_TOKEN`,
  `PROJECT_TOKEN`, the Supabase access token, the database passwords and the project ref) with
  who issued it, who owns it, its scope, permissions, expiry and where it's stored. No values.
- Recorded the Supabase dev token exactly as created: `newton-dev` only, 90 days, write access
  to Migrations, read access to Project Settings, Connection Pooling, Data API Config and Storage
  Config, everything else None. Also recorded how to create the prod token as an exact copy,
  limited to `newton-prod` and stored only in the GitHub `production` environment.
- Recorded the Supabase project settings chosen at creation (Data API on, new tables not exposed
  automatically, automatic RLS on) to reuse for prod.
- Linked it from `docs/maintainers.md`. That section also said `PROJECT_TOKEN` was on a project
  account, which isn't true: GitHub tokens always belong to a person, so Claude corrected it.

**What changed along the way**

- Only the Supabase dev token's settings could be confirmed, from the creation screen. The names
  and expiry dates of `VERCEL_TOKEN` and `PROJECT_TOKEN` are what the setup steps suggested, and the
  doc says so, so the maintainer can check them on the token pages.
- Merged `main` in, which had added #64's entry. Moved #64 from **In progress** to "Repo and
  infrastructure" in `docs/history.md`, now that it merged, and added this PR under **In progress**.

**Pull request:** [#65](https://github.com/heynewton/newton/pull/65)

## A hosted dev database, migrated and seeded from main

**Prompt**

````text
SUPABASE_ACCESS_TOKEN, SUPABASE_DEV_DB_PASSWORD and SUPABASE_DEV_PROJECT_REF are saved. Start #60 and #61 in parallel sessions.
````

**What Claude did**

- Added `.github/workflows/dev-database.yml`, in the `dev` environment. On every push to `main` it
  links `newton-dev`, runs `supabase db push` and then loads `supabase/seed.sql` with `psql`
  through the project's connection pooler (GitHub runners have no IPv6, which the direct database
  host needs). A failed migration or seed fails the run.
- On PRs that touch `supabase/` or `fixtures/sample-boat/`, the same workflow runs a **Dry run
  against dev**: link, `supabase db push --dry-run`, and, when dev already has every migration, the
  seed inside a transaction that is rolled back. Nothing in dev changes. Forks skip it.
- Made the seed safe to re-run: `build-seed.mjs` now writes `on conflict` clauses, so existing
  sign-in rows are left alone and the boat, memberships and records are reset to `boat.json`.
  CI's database job loads the seed a second time to prove it.
- `docs/architecture.md` and `docs/process.md` say where dev lives, how it's updated, that it only
  holds fixture data, and that the hosted projects don't expose new tables the way the local stack
  does, so every migration grants explicitly.

**What changed along the way**

- The plan was `supabase db push --include-seed`. Tried locally, it loads the seed only the first
  time; after the seed changes it only records the new file hash and never runs it again. So the
  workflow runs the seed itself.
- The session hit a usage limit halfway through and was resumed later.

**Pull request:** [#68](https://github.com/heynewton/newton/pull/68)

---

## No limit on issues in progress

**Prompt**

````text
remove the limit of 4
````

**What Claude did**

- Removed the in-progress limit from `CLAUDE.md` and `docs/process.md`, the only two places that
  still stated it (#57 had already removed it from `CONTRIBUTING.md`). The board's column limit is
  a GitHub UI setting for the maintainer to remove.

**Pull request:** [#67](https://github.com/heynewton/newton/pull/67)

---

## Sign-in email provider: Resend

**Prompt**

```text
SUPABASE_ACCESS_TOKEN, SUPABASE_DEV_DB_PASSWORD and SUPABASE_DEV_PROJECT_REF are saved. Start #60 and #61 in parallel sessions.
```

**What Claude did**

- Took #61 in its own session, next to the dev database (#60).
- Compared Resend, Postmark, Mailgun, Amazon SES, Brevo and Cloudflare Email Service on Supabase
  SMTP support, inbound mail to many addresses with webhooks and attachments (for #10), free and
  first paid tiers, and EU options, from each provider's current pages.
- Wrote `docs/decisions/0003-email-provider.md`: Resend for sign-in mail, email-in and reminders,
  on the free plan. Sign-in mail comes from `noreply@heynewton.app`; email-in uses its own
  subdomain, `boats.heynewton.app`, so the root domain's mail isn't touched.
- Added a setup checklist for the maintainer: the Resend account on the project address, the
  Cloudflare DNS records (where to copy each from), a sending-only key per Supabase project, the
  Supabase SMTP and rate limit settings, and the test that closes #61.
- Updated `docs/architecture.md`: sign-in mail, email-in and reminders name Resend, and the email
  provider is no longer an open decision.

**What changed along the way**

- `docs/tokens.md` (#65) hadn't merged, so the record lists what to add there instead.
- The PR says "Refs #61": the issue closes once the setup is done and a sign-in email arrives.
- Moved #64 and #65 from **In progress** to "Repo and infrastructure" in `docs/history.md`, now that they merged.

**Pull request:** [#66](https://github.com/heynewton/newton/pull/66)

---

## Manuals indexed for search with pgvector, and an embeddings provider chosen

**Prompt**

````text
Start #13 and #15 in parallel sessions.
````

The planning session started this one for #13 with a brief: a decision record for the embedding
provider with current prices, a `document_chunks` migration with row-level security and a search
function, pgTAP tests including a cross-boat leak test, indexing code behind an embedder interface
with a fake embedder for tests, tested on the fixture manual, and a note on when indexing runs.

**What Claude did**

- Checked current prices on the providers' pages and wrote `docs/decisions/0004-embeddings.md`:
  Voyage AI `voyage-4` at 1024 dimensions, compared with `voyage-4-lite` and `-large`, OpenAI's
  two models, Mistral's EU-hosted `mistral-embed` and an open model run by us. Every hosted option
  costs well under a dollar to index a whole boat, so quality, effort and data decided it. 1024
  dimensions is also what Mistral and `bge-m3` produce, so the EU options are a re-embed away, not
  a migration. The record says to opt out of Voyage's training on our content before the first
  real manual, only manuals are sent, and what would make us switch.
- Added `supabase/migrations/20261019130000_document_chunks.sql`: pgvector, `document_chunks`
  (boat, document, page, chunk text, embedding, model name) tied to its document's boat with a
  composite foreign key, the same roles as `documents` (members read, writers add and remove, no
  edits), explicit grants including the service role for the indexing job, and
  `search_document_chunks()`, which runs as the caller, checks `can_read_boat()` again, and returns
  the document's name and dates so answers can state source and freshness.
- Added 24 pgTAP tests, including the leak test: a crew member searching with exactly another
  boat's chunk vector gets only their own boat's chunks.
- Added `packages/indexing`: text per page from a PDF (`unpdf`), chunks that split at numbered
  headings and never span pages, an `Embedder` interface with the Voyage embedder (key from
  `VOYAGE_API_KEY`) and a deterministic bag-of-words fake, an in-memory store for tests and a
  Supabase store, plus `indexDocument()`, `searchChunks()` and `shouldIndex()` (manuals only).
- Made the fixture manual excerpt two PDF pages (a form feed in the text starts a page), so the
  tests check that page numbers survive: the oil capacity question finds 6.3 on page 2.
- Documented `VOYAGE_API_KEY` in `docs/tokens.md`, updated `docs/architecture.md`, and regenerated
  `database.types.ts`.

**What changed along the way**

- The records migration (#54) had already added a unique `(id, boat_id)` on `documents`, so the
  chunks table reuses it instead of adding its own.
- The fixture PDFs were one page each. `build.mjs` now writes extra pages after the existing
  objects, so the one-page PDFs and their emails come out byte for byte the same.
- Indexing has no trigger yet: the background job runner is still open (#11), so the decision
  record says the job calls `indexDocument()` when a document becomes a manual, and nothing calls
  it until then.

**Pull request:** [#69](https://github.com/heynewton/newton/pull/69)

---

## A boat's records on its page

**Prompt**

````text
Start #13 and #15 in parallel sessions.
````

**What Claude did**

- Extended the boat's page (`/boats/<id>`) from #32 rather than adding a new one. Under the
  boat's name it now shows renewals and maintenance (overdue, due in the next 60 days, and later),
  the co-owner balance, and the boat's documents. Read-only.
- Every date and amount comes from `packages/calc`: due dates from `findDue`/`nextDue`, balances
  from `splitCosts`, amounts through `formatCents`. A new pure module, `apps/web/src/lib/records`,
  only renames database columns into calc's inputs and groups the answers, and has unit tests
  (the web app's first, with Vitest) using the Kittiwake numbers.
- Each number says what it was worked out from: "Last done 18 Apr 2026 at 1,371 h, every 6
  months or 100 h", or "Split of 4 expenses totalling USD 3,478.90, from 15 Dec 2024 to 2 Oct 2026,
  by ownership share: Alex Sample 40, Sam Placeholder 35, Jordan Fictional 25".
- Each record links to its source document. The link goes to a route handler that checks the
  document through RLS as the signed-in person and redirects to a signed URL from the private
  bucket that expires after 60 seconds. Records without a document say so.
- Empty states say what will fill each section (forwarding documents, #10).
- No database change.

**What changed along the way**

- Newton has no engine hour meter yet, so maintenance due by engine hours is checked against the
  latest reading recorded with a service, and the page says which reading and that the meter has
  likely moved on since.
- Boats have no currency column, so the balance is split per expense currency (Kittiwake's are all
  USD). Expenses paid by someone with no ownership share (crew, or someone who left) can't go
  into calc's split, so they are listed as not counted instead of failing the page.
- The seed doesn't include the sample documents yet, so to check the links Claude added them to
  a private copy of the local database only. Seeding them for everyone is a follow-up.

**Pull request:** [#70](https://github.com/heynewton/newton/pull/70)

## History and architecture catch up with what has merged

**Prompt**

````text
What issues could you handle overnight?
Suggest several and I validate the list before you start
````

````text
Look at history and project. And propose new list
````

````text
Ok with the 6 and the order you defined.
Ok with resend for inbound
Ok with calc phase 2
You have 6 hours so no need to do everything in parallel. You can sequence to avoid using all credits too quickly.
````

**What Claude did**

- Read the open issues, `docs/history.md`, `docs/architecture.md`, the build log and the spec's
  build phases and feature ideas, then proposed six changes for one night, run one after the
  other: this catch-up, email-in (#10), reminders (#12), three Phase 2 calc functions, web tests
  and coverage (#47, #46), and Q&A over manuals (#14) if time allows.
- `docs/history.md`: #66, #67, #68, #69 and #70 move from **In progress** to their topics with
  their merge dates and the issues they closed. **What's next** drops #13 and #15 (closed) and
  lists the open steps toward production (#62, #71, #63, #37).
- `docs/architecture.md`: the status line is dated 2026-10-19 and names the boat page, the dev
  database and manual indexing; **Today** mentions the boat page (#15). Hosting for the web app
  is no longer listed as an open decision: Vercel has been running since #30.

**What changed along the way**

- Nothing: the inbound email provider had already been chosen in decision 0003 (Resend on
  `boats.heynewton.app`), so the maintainer's "Resend for inbound" confirms it.

**Pull request:** [#72](https://github.com/heynewton/newton/pull/72)

## Phase 2 calculations: tide height between high and low waters

**Prompt**

The overnight plan (see "History and architecture catch up with what has merged"), item 4:

````text
Ok with calc phase 2
````

**What Claude did**

- Filed three Phase 2 issues from the spec's feature ideas, in the `Phase 2: On-water voice`
  milestone with the `calc` label: tide height (#78), bearing, distance and time to a mark (#79),
  and course to steer with tidal stream and leeway (#80). The architecture says Phase 2's calc
  work needs nothing from Phase 1, so it can start now.
- `tideHeightAt(extremes, time)` in `packages/calc`: the height between the two cached high and
  low waters around a time, by the cosine method tide tables use, in the predictions' own units.
  It returns rising or falling and the two extremes it used, so an answer can say "from the
  predicted low water of 0.3 m at 03:00" (principle 6).
- It refuses what it can't answer honestly: times outside the cached predictions, predictions
  out of order or not alternating, a high water below its low water, and times without a time
  zone (which would silently depend on the phone's settings).
- 10 tests on made-up predictions: exact at the extremes, half range at mid-tide, the closed-form
  quarter-point values, within 2% of the range of the rule of twelfths hour by hour, monotonic on
  the flood and the ebb, and time zones.

**What changed along the way**

- Nothing fetches NOAA predictions yet: that's a `boat-data` issue for when Phase 2 starts.

**Pull request:** [#81](https://github.com/heynewton/newton/pull/81)

## Phase 2 calculations: bearing, distance and time to a mark

**Prompt**

The overnight plan (see "History and architecture catch up with what has merged"), item 4:

````text
Ok with calc phase 2
````

**What Claude did**

- `bearingAndDistance(from, to)` in `packages/calc`: initial great-circle bearing (degrees true)
  and distance (nautical miles) by the haversine formula on the mean Earth radius. The same point
  has no bearing (null) rather than a made-up 0°.
- `timeToMark(distanceNm, speedKnots, now)`: minutes en route and the ETA to the second, or no
  answer below 0.1 kn, since "infinity" isn't an ETA.
- 12 tests: the published Land's End to John o' Groats example (968.9 km, 009°07′11″), one degree
  along a meridian and the equator and back, the antimeridian, a mark 0.5 nm away at 045°, the
  same point, invalid positions, and ETAs across time zones.

**What changed along the way**

- Spherical rather than ellipsoidal: over a day's sailing the difference is a fraction of a
  percent, well under GPS and chart error. Rhumb lines were left out; a boat steers a course to a
  mark it can usually see.

**Pull request:** [#83](https://github.com/heynewton/newton/pull/83)

## Phase 2 calculations: course to steer for tidal stream and leeway

**Prompt**

The overnight plan (see "History and architecture catch up with what has merged"), item 4:

````text
Ok with calc phase 2
````

**What Claude did**

- `courseToSteer({ track, boatSpeed, tide, leeway })` in `packages/calc`: the vector triangle
  navigators draw on the chart. It splits the stream into its parts across and along the track,
  points the boat upstream just enough to cancel the cross-track part, then steers into the wind
  by the leeway. It returns the heading, the expected speed over the ground, and each correction
  separately, so the answer can say why ("23.6° to port for the stream").
- When the stream across the track is faster than the boat, or the stream against it is, it says
  the track can't be held instead of returning a number.
- 11 tests: no stream, stream with and against, the classic example (track 090°, 5 kn, stream
  180° at 2 kn: steer 066.4°, 4.58 kn over the ground), leeway on either tack and across north,
  and an independent check that adding the boat's vector (less leeway) and the stream's lands
  exactly on the track for four mixed cases.

**What changed along the way**

- The track is an input, so this didn't need #79 first; the issue's "Blocked by" line was taken
  out.

**Pull request:** [#84](https://github.com/heynewton/newton/pull/84)

## Test coverage on every PR

**Prompt**

The overnight plan (see "History and architecture catch up with what has merged"), item 5:

````text
Ok with the 6 and the order you defined.
````

**What Claude did**

- `@vitest/coverage-v8` (matching Vitest 5.0.5) in each workspace, and `npm run test:coverage`
  at the root, which runs every workspace's tests with coverage.
- `packages/calc/vitest.config.ts`: at least 95% of lines and branches, or the run fails
  (today 98.4% and 97.0%). The other workspaces are reported, not gated, as the issue asks.
- CI's `check` job runs `test:coverage` instead of `npm test`, then
  `davelosert/vitest-coverage-report-action@v2` once per workspace: a PR comment per workspace that
  is edited on later pushes, and the job summary. Fork PRs get a read-only token, so they skip the
  comment (`comment-on: none`) and keep the summary. The report runs even when the threshold
  fails, so the comment shows why.
- `docs/process.md` (Definition of Done) and the `ship-change` skill mention the bar and the report.

**Pull request:** [#86](https://github.com/heynewton/newton/pull/86)

## One email digest of what is overdue or coming up

**Prompt**

The overnight plan (see "History and architecture catch up with what has merged"), item 3:

````text
Ok with the 6 and the order you defined.
````

**What Claude did**

- **Where it runs** ([decision 0005](decisions/0005-scheduled-jobs.md)): Vercel Cron calls
  `GET /api/reminders` daily at 07:00 UTC with `CRON_SECRET`. It's a route in the web app, so it
  reuses `packages/calc` through `lib/records` exactly as the boat page does. Supabase Edge
  Functions (Deno, a second build of calc) and GitHub Actions schedules (late or skipped when
  busy) were the alternatives. The queue for #11 stays open.
- **What goes in a digest:** for every boat, `schedule()` finds what is overdue or due within
  30 days (or 25 engine hours). Each owner and co-owner gets one email across all their boats,
  with each item's due date, what it was worked out from ("Last done 18 Apr 2026 at 1,371 h,
  every 6 months or 100 h"), its source document or "entered by hand", and the date it was
  worked out.
- **Not twice:** `reminders_sent` records every item sent, unique per person, item, due date and
  status. So an item is reminded once when it comes up and once more if it becomes overdue; a
  new due date (renewed, or done again) starts over. Resend gets an idempotency key per person
  and day, so a retried run doesn't send twice either. One person's failed send doesn't stop the
  others, and they get theirs on the next run.
- The "when is it due" wording (`dueLine`, `interval`, `hours`) moved from the boat page into
  `lib/records`, so the page and the email say the same thing.
- **Tests:** 10 unit tests on Kittiwake's records (on 19 Oct 2026 the anodes are overdue for
  Alex, Sam and Jordan, but not Riley who is crew; the registration comes up on 1 Dec; no
  repeats; reminded again when overdue; one digest across two boats; HTML escaping; a failed
  send retried the next day), and 8 pgTAP tests for `reminders_sent`.

**What changed along the way**

- The issue says "not sent twice for the same due date". Claude reads that as no repeats of the
  same news, and sends one more reminder when a coming-up item becomes overdue, since that's
  when it matters most. Easy to drop (one line in `sentKey`) if the maintainer prefers a single
  reminder.

**Pull request:** [#77](https://github.com/heynewton/newton/pull/77)
