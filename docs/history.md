# History

What has landed, grouped by phase and then by topic. One line per merged PR: the PR, its merge
date (UTC), what it gave us, and the issue it closed. The build log (`docs/build-log.md`) has
the full story of each change in date order; this page is the summary by topic.

Each PR adds its own line here (see the `ship-change` skill). When a PR is still open, it goes
under **In progress** and moves to its topic when it merges.

## Phase 1: Home side

### How we work

Workflow, board and process: how changes land, how issues are picked up, and how cards move.

- [#1](https://github.com/heynewton/newton/pull/1) · 2026-10-18 · Project docs and `.gitignore`
- [#2](https://github.com/heynewton/newton/pull/2) · 2026-10-18 · How changes land: workflow, `ship-change` skill, build log
- [#17](https://github.com/heynewton/newton/pull/17) · 2026-10-18 · How we work: roles, board, weekly rhythm, and how to pick up issues
- [#22](https://github.com/heynewton/newton/pull/22) · 2026-10-18 · Feature ideas live in the spec until their phase is close
- [#50](https://github.com/heynewton/newton/pull/50) · 2026-10-18 · Board cards move by themselves when issues and PRs change · closes [#49](https://github.com/heynewton/newton/issues/49)
- [#51](https://github.com/heynewton/newton/pull/51) · 2026-10-18 · Board docs say who can move cards: cloud sessions let the workflow do it · closes [#24](https://github.com/heynewton/newton/issues/24)
- [#44](https://github.com/heynewton/newton/pull/44) · 2026-10-19 · Up to four issues in progress, and the board opens on the Kanban view
- [#56](https://github.com/heynewton/newton/pull/56) · 2026-10-19 · Open the spec and team docs from the repo, and see every PR by phase and topic
- [#55](https://github.com/heynewton/newton/pull/55) · 2026-10-19 · A brief for maintainers: merging, backlog, settings and working with Claude
- [#57](https://github.com/heynewton/newton/pull/57) · 2026-10-19 · Contributor guide no longer mentions the in-progress limit
- [#58](https://github.com/heynewton/newton/pull/58) · 2026-10-19 · README links to every page in `docs/`

### Architecture and decisions

The architecture page, the phase order and the recorded decisions.

- [#23](https://github.com/heynewton/newton/pull/23) · 2026-10-18 · Architecture doc per phase, and on-water voice moves up to Phase 2
- [#28](https://github.com/heynewton/newton/pull/28) · 2026-10-18 · Auth decision: Supabase Auth, with the provider kept swappable
- [#29](https://github.com/heynewton/newton/pull/29) · 2026-10-18 · Spec diagram shows on-water voice as Phase 2 · closes [#26](https://github.com/heynewton/newton/issues/26)
- [#48](https://github.com/heynewton/newton/pull/48) · 2026-10-19 · Plan for separate dev and prod databases in Phase 1, before real boat data

### Repo and infrastructure

The workspace, checks and CI, preview deployments and the domain.

- [#18](https://github.com/heynewton/newton/pull/18) · 2026-10-18 · Project scaffold: web app, calc package, one-command checks and CI · closes [#3](https://github.com/heynewton/newton/issues/3)
- [#30](https://github.com/heynewton/newton/pull/30) · 2026-10-18 · Preview link on every PR, and a dev site from `main` · closes [#19](https://github.com/heynewton/newton/issues/19)
- [#38](https://github.com/heynewton/newton/pull/38) · 2026-10-18 · heynewton.app serves the homepage · closes [#35](https://github.com/heynewton/newton/issues/35)
- [#64](https://github.com/heynewton/newton/pull/64) · 2026-10-19 · Deploys upload one archive and skip docs-only changes, so previews keep working on busy days · closes [#59](https://github.com/heynewton/newton/issues/59)
- [#65](https://github.com/heynewton/newton/pull/65) · 2026-10-19 · Every token written down, so prod gets exactly the same ones

### Brand and website

The Hey Newton logo and the public homepage.

- [#20](https://github.com/heynewton/newton/pull/20) · 2026-10-18 · Hey Newton logo, with the web app favicon
- [#34](https://github.com/heynewton/newton/pull/34) · 2026-10-18 · Homepage that explains Hey Newton, a shared footer, and the screen-size decision · closes [#31](https://github.com/heynewton/newton/issues/31)

### Calculations

Deterministic, tested functions in `calc` for the numbers Newton reports.

- [#40](https://github.com/heynewton/newton/pull/40) · 2026-10-18 · Due dates for renewals and maintenance: what's overdue and coming up · closes [#7](https://github.com/heynewton/newton/issues/7)
- [#39](https://github.com/heynewton/newton/pull/39) · 2026-10-18 · Co-owner cost split: who owes what · closes [#6](https://github.com/heynewton/newton/issues/6)

### Data and security

The Supabase schema, row-level security, sign-in, storage and the sample boat.

- [#36](https://github.com/heynewton/newton/pull/36) · 2026-10-18 · A made-up sample boat for tests and demos · closes [#4](https://github.com/heynewton/newton/issues/4)
- [#41](https://github.com/heynewton/newton/pull/41) · 2026-10-18 · Sign in with an email link, with boats, people and roles locked down by row-level security · closes [#5](https://github.com/heynewton/newton/issues/5)
- [#43](https://github.com/heynewton/newton/pull/43) · 2026-10-18 · Sample boat Kittiwake ready to sign in to after `db:reset` · closes [#42](https://github.com/heynewton/newton/issues/42)
- [#52](https://github.com/heynewton/newton/pull/52) · 2026-10-19 · Every boat gets its own private document store, locked to its members · closes [#8](https://github.com/heynewton/newton/issues/8)
- [#54](https://github.com/heynewton/newton/pull/54) · 2026-10-19 · Renewals, maintenance and expenses stored per boat · closes [#9](https://github.com/heynewton/newton/issues/9)

### Web app features

What a signed-in person can do in the app.

- [#53](https://github.com/heynewton/newton/pull/53) · 2026-10-19 · Add your first boat after signing in · closes [#32](https://github.com/heynewton/newton/issues/32)

### In progress

- [#87](https://github.com/heynewton/newton/pull/87) · Answers from the boat's manuals, with the page they came from
- [#70](https://github.com/heynewton/newton/pull/70) · A boat's page shows its renewals, maintenance, co-owner balance and documents
- [#65](https://github.com/heynewton/newton/pull/65) · Every token written down, so prod gets exactly the same ones
- [#68](https://github.com/heynewton/newton/pull/68) · A hosted dev database, migrated and seeded from every merge to `main`
- [#66](https://github.com/heynewton/newton/pull/66) · Sign-in emails from heynewton.app: Resend chosen, with the setup steps
- [#69](https://github.com/heynewton/newton/pull/69) · Manuals split into pages and chunks for search, locked to each boat, with Voyage AI chosen for embeddings

### What's next

The open Phase 1 issues, grouped by what they deliver. The board holds their order.

- **Email-in and filing:** [#10](https://github.com/heynewton/newton/issues/10) per-boat inbound address, [#11](https://github.com/heynewton/newton/issues/11) classify and extract documents into records
- **Reminders:** [#12](https://github.com/heynewton/newton/issues/12) email reminders for renewals and maintenance
- **Q&A over manuals:** [#13](https://github.com/heynewton/newton/issues/13) index manuals with pgvector, [#14](https://github.com/heynewton/newton/issues/14) answer from manuals with sources, [#21](https://github.com/heynewton/newton/issues/21) owner-written procedures
- **Web app:** [#15](https://github.com/heynewton/newton/issues/15) minimal screen for a boat's records
- **Owners own their data:** [#16](https://github.com/heynewton/newton/issues/16) export all of a boat's data
- **Before sign-up opens:** [#27](https://github.com/heynewton/newton/issues/27) Google and Apple sign-in, [#37](https://github.com/heynewton/newton/issues/37) production project for heynewton.app, [#33](https://github.com/heynewton/newton/issues/33) privacy policy and terms
- **Quality:** [#46](https://github.com/heynewton/newton/issues/46) test coverage on every PR, [#47](https://github.com/heynewton/newton/issues/47) unit tests for sign-in and the database layer
