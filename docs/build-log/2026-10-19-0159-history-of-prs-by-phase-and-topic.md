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
