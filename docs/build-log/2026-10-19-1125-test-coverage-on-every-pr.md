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
