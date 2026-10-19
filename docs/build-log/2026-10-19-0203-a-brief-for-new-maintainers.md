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
