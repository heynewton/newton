# Build log

How this project is being built with [Claude Code](https://claude.com/claude-code), one request at a time.

Each entry quotes the prompt **word for word**, lightly cleaned where privacy needs it: replaced text is shown in [brackets]. Then it says what Claude did, what changed along the way, and which pull request came out of it. Answers picked from multiple-choice questions Claude asked are shown as *Choice*.

## One file per entry

Each entry is its own file in this folder, so PRs that are open at the same time never conflict
over the log. File names start with the date and time (UTC) the entry was written, so the folder
lists the entries in order:

```text
docs/build-log/YYYY-MM-DD-HHMM-short-title.md
```

To add an entry, create a new file; never edit another PR's entry. The file starts with the
entry's `## ` heading and follows the same sections as the others: **Prompt**, **What Claude
did**, **What changed along the way** and **Pull request**.

Entries before #89 were written into a single `docs/build-log.md` and split into these files
with their text unchanged. Their times are when each entry first appeared in the repo.
