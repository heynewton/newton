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
