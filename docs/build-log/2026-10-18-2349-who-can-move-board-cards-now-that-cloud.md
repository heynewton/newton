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
