# How we work

Newton is built by a very small team. The process is light Kanban with a weekly beat: the
rules in [CLAUDE.md](../CLAUDE.md#workflow) say how a change lands, and this page says who
decides what and when.

## Roles

| Who | Role | Does |
| --- | --- | --- |
| Maintainer | Product owner | Orders the backlog, makes product calls, reviews and merges. Merging is acceptance. |
| Claude (Claude Code) | Dev team | Turns ideas into issues, writes the code, opens PRs, keeps the board and build log current, flags blockers. |
| Contributors | Reviewers and builders | Review PRs in the areas they care about, try Newton on their own boats, pick up `help wanted` issues. |

Claude writes code faster than anyone can review it, so review time is the bottleneck. The
process is built to keep that time well spent: small PRs, clear "Done when" checklists, and
explicit "what was not tested" notes.

## The board

The [Newton project board](https://github.com/orgs/heynewton/projects/1) has five columns:

**Inbox → Ready → In progress → In review → Done**

- **Inbox**: new issues nobody has looked at yet.
- **Ready**: issues ready to start, **in priority order**. The top one is next. There are no
  priority labels; the order is the priority.
- **In progress**: at most two issues at a time.
- **In review**: a PR is open and waiting for review.
- **Done**: merged.

### Ideas before issues

Feature ideas start in the **Feature ideas** section of the spec ("Newton — Product & Architecture
Spec" in the team Google Drive), grouped by phase, with their open questions next to them. They
are not filed as issues yet, so the board only holds work we expect to start soon.

At weekly planning, when a phase is getting close, its ideas are split into PR-sized issues
(after checking for duplicates). Each new issue links back to the idea, and the idea names its
issue.

### Definition of Ready

An issue moves to Ready when it has:

- an area label and a milestone,
- a short "Done when" checklist,
- its blockers listed ("Blocked by: #N"),
- the fake data it needs named (see `fixtures/`).

### Definition of Done

- Tests, lint and type checks pass in CI.
- Any number Newton reports is covered by a unit test.
- The PR says what was tested and what was not.
- No real boat data, personal information or secrets in the diff.
- An entry in [build-log.md](build-log.md).
- Merged into `main` (squash merge).

## Rhythm

| When | What | Who |
| --- | --- | --- |
| Weekly, ~15 min | **Planning**: order the top of Ready; refine those issues; turn ideas for the next phase into issues. | Maintainer, Claude |
| Continuously | **Flow**: take the top unblocked Ready issue, ship it with the `ship-change` skill. | Claude, contributors |
| Weekly | **Review**: demo what merged, on real boat data kept locally. A short update to contributors, based on the build log. | Maintainer, contributors |
| Monthly | **Retro**: what slowed us down, what broke, what to change. Changes go into CLAUDE.md or the skill. | Everyone |

## Order of work

From [CLAUDE.md](../CLAUDE.md#issues-are-the-todo-list): first what is blocked by nothing, then
what unblocks other work, then small steps toward users.
