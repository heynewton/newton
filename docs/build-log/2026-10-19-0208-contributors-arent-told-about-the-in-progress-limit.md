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
