## Build log and history entries that don't conflict between open PRs

**Prompt**

````text
create an issue to avoid conflict on build-log.md
everytime a PR is merged, it creates a conflict on build-log.ms for the open PRs
````

Then:

````text
Move #89 to the top of Ready and start it.
````

**What Claude did**

- Filed [#89](https://github.com/heynewton/newton/issues/89). Every PR appended to the end of
  `docs/build-log.md` and added a line to `docs/history.md`, so each merge made every other open
  PR conflict on those two files. That happened on nearly every merge while four sessions worked in parallel.
- **Build log:** split into one file per entry in `docs/build-log/`, named
  `YYYY-MM-DD-HHMM-short-title.md`. All 42 existing entries keep their text unchanged; a check
  confirmed that every line of the old file is in the new files, in the same order (only the
  `---` lines between entries are gone). Each file's time is when its
  entry first appeared in the repo; one entry that landed in the same minute as the one before
  it was moved a minute later to keep the log's order. `docs/build-log/README.md` holds the
  log's introduction and how to add an entry, and `docs/build-log.md` is now a short pointer, so
  old links still lead somewhere.
- **History:** each merged PR is a small file in `docs/history/` (`pr-NNNN.md`: PR, merge time,
  phase, topic, closed issues, summary), with the topics and their descriptions in
  `docs/history/topics.json`. `npm run history` (`scripts/history.mjs`) builds `docs/history.md`
  from them, and `--check` says whether it's up to date. The 40 lines for merged PRs come out
  identical to the hand-written page. #85 and #73, still listed as in progress though merged,
  moved to their topics; #73 (email-in) got a new topic, "Email-in and filing". "What's next" moved to `docs/history/whats-next.md`, without #10, #46 and #47, which
  have closed.
- Updated the `ship-change` skill, `CLAUDE.md`, `docs/process.md`, `docs/maintainers.md` and the
  README: PRs add new files and never edit shared logs.

**What changed along the way**

- The first split cut the log at its `---` lines and found 33 entries. Recent entries had been
  appended without a `---` before them, so nine entries were hidden inside the ones before them
  (for example "heynewton.app serves the homepage" and "A hosted dev database"). Splitting at each
  entry's `## ` heading, outside quoted prompts, found all 42. Rebuilding the file couldn't catch
  this, since gluing entries back together restores the same text either way.
- #73 merged while this PR was open and added to both old files, which is exactly the conflict
  this PR removes. Its entry and history line were moved into the new files.

- The issue suggested generating history from GitHub's PR data. The hand-written summaries and
  topics don't exist there, so the generated page couldn't have matched. One small file per PR
  keeps them and still never conflicts.
- `docs/history.md` itself is still a single file, so it is regenerated in its own small PR now
  and then (for example at weekly planning) rather than by every PR. Between regenerations, the
  newest PRs are in `docs/history/` before they show on the page.

**Pull request:** see the history file `docs/history/pr-NNNN.md` added with this PR.
