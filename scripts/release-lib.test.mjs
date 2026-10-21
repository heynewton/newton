// Tests for scripts/release-lib.mjs: tags, the range of PRs, grouping and the notes. Run with
// `npm run test:scripts` (part of `npm test`).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import {
  collectEntries,
  compareTags,
  lastReleaseTag,
  latestTag,
  nextTag,
  parseHistoryFile,
  parsePushPaths,
  prNumber,
  rangeCommits,
  rangeMigrations,
  renderNotes,
} from "./release-lib.mjs";

const topics = JSON.parse(readFileSync("docs/history/topics.json", "utf8"));
const history = (pr, topic, summary, closes) =>
  [`pr: ${pr}`, "phase: Phase 1: Home side", `topic: ${topic}`, closes ? `closes: ${closes}` : "", `summary: ${summary}`]
    .filter(Boolean)
    .join("\n");

describe("tags", () => {
  it("names the first release of a day after the date, zero-padded", () => {
    assert.equal(nextTag("2026-10-21", []), "2026.10.21");
    assert.equal(nextTag("2027-03-05", ["2026.10.21"]), "2027.03.05");
    assert.equal(nextTag(new Date("2026-10-21T23:59:00Z"), []), "2026.10.21");
  });

  it("adds .2, .3 for later releases the same day", () => {
    assert.equal(nextTag("2026-10-21", ["2026.10.21"]), "2026.10.21.2");
    assert.equal(nextTag("2026-10-21", ["2026.10.21", "2026.10.21.2"]), "2026.10.21.3");
    assert.equal(nextTag("2026-10-21", ["2026.10.21.2", "2026.10.20.5"]), "2026.10.21.3");
  });

  it("ignores tags that aren't release tags", () => {
    assert.equal(nextTag("2026-10-21", ["v1.0", "2026.10.21-rc1"]), "2026.10.21");
    assert.equal(latestTag(["v9", "nightly"]), null);
  });

  it("rejects a date it can't read", () => {
    assert.throws(() => nextTag("21/10/2026", []), /not a date/);
  });

  it("orders tags by date, then by number, not as text", () => {
    assert.equal(latestTag(["2026.10.21.2", "2026.10.21.10", "2026.10.21", "2026.09.30.4"]), "2026.10.21.10");
    assert.ok(compareTags("2026.10.21", "2026.10.21.2") < 0);
    assert.ok(compareTags("2026.11.01", "2026.10.31.9") > 0);
    assert.equal(compareTags("2026.10.21", "2026.10.21"), 0);
  });
});

describe("PRs in the range", () => {
  it("reads the PR from a squash or merge commit subject", () => {
    assert.equal(prNumber("Owners can rename their boat (#159)"), 159);
    assert.equal(prNumber("Merge pull request #12 from heynewton/fix"), 12);
    assert.equal(prNumber("Regenerate docs/history.md"), null);
    assert.equal(prNumber("Fix (#12) in the middle"), null);
  });

  it("parses a history file and refuses one without a topic", () => {
    assert.deepEqual(parseHistoryFile(history(5, "Web app features", "A thing", "3, 4")), {
      pr: 5,
      phase: "Phase 1: Home side",
      topic: "Web app features",
      closes: [3, 4],
      summary: "A thing",
    });
    assert.throws(() => parseHistoryFile("pr: 5\nsummary: x"), /missing topic/);
    assert.throws(() => parseHistoryFile("pr: 5\nnot a field"), /can't read line/);
  });

  it("keeps merge order, falls back to the subject without a history file, drops History commits", () => {
    const { entries, others } = collectEntries([
      { sha: "a1", subject: "First (#10)", history: history(10, "Web app features", "First thing", "9") },
      { sha: "a2", subject: "Regenerate docs/history.md", history: null },
      { sha: "a3", subject: "No history file (#11)", history: null },
      { sha: "a4", subject: "Hand-pushed fix", history: null },
    ]);
    assert.deepEqual(
      entries.map((e) => [e.pr, e.topic, e.summary, e.closes, e.sha]),
      [
        [10, "Web app features", "First thing", [9], "a1"],
        [11, null, "No history file", [], "a3"],
      ],
    );
    assert.deepEqual(others, [{ sha: "a4", subject: "Hand-pushed fix" }]);
  });

  it("refuses a history file that names another PR", () => {
    assert.throws(
      () => collectEntries([{ sha: "a", subject: "x (#10)", history: history(11, "Web app features", "x") }]),
      /says pr: 11/,
    );
  });
});

describe("notes", () => {
  const base = "b".repeat(40);
  const to = "c".repeat(40);
  const e = (pr, topic, summary, closes = []) => ({ pr, topic, summary, closes, sha: "x" });

  it("puts user-visible topics under What's new and the rest under the hood, in topics.json order", () => {
    const notes = renderNotes({
      entries: [
        e(3, "Repo and infrastructure", "CI is faster"),
        e(4, "Web app features", "Rename a boat", [158]),
        e(5, "Brand and website", "New homepage"),
        e(6, "How we work", "Release notes"),
      ],
      migrations: [],
      topics,
      base,
      to,
    });
    const [isNew, hood] = notes.split("## Under the hood");
    assert.match(isNew, /### Brand and website\n\n- New homepage \(\[#5\]\(https:\/\/github.com\/heynewton\/newton\/pull\/5\)\)/);
    assert.match(isNew, /- Rename a boat \(\[#4\]\(.*\/pull\/4\), closes \[#158\]\(.*\/issues\/158\)\)/);
    assert.ok(isNew.indexOf("Brand and website") < isNew.indexOf("Web app features"));
    assert.doesNotMatch(isNew, /CI is faster|Release notes/);
    assert.ok(hood.indexOf("### How we work") < hood.indexOf("### Repo and infrastructure"));
    assert.match(notes, /None: this release doesn't change the database\./);
    assert.match(notes, new RegExp(`compare/${base}\\.\\.\\.${to}`));
  });

  it("lists migrations with the warning, and PRs without a topic for sorting", () => {
    const notes = renderNotes({
      entries: [e(7, null, "Mystery change")],
      others: [{ sha: "d".repeat(40), subject: "Hand-pushed fix" }],
      migrations: ["supabase/migrations/20261022150000_document_filing.sql"],
      topics,
      base,
      to,
    });
    assert.match(notes, /Nothing you'd see in the app/);
    assert.match(notes, /### Not sorted yet[\s\S]*- Mystery change \(\[#7\]/);
    assert.match(notes, /### Other commits\n\n- Hand-pushed fix \(\[ddddddd\]/);
    assert.match(notes, /applies this migration to `newton-prod`\. \*\*They can't be undone/);
    assert.match(notes, new RegExp(`\\[\`20261022150000_document_filing.sql\`\\]\\(.*/blob/${to}/supabase/migrations/`));
  });
});

describe("deploy paths", () => {
  it("reads the push paths of deploy.yml", () => {
    const paths = parsePushPaths(readFileSync(".github/workflows/deploy.yml", "utf8"));
    assert.ok(paths.includes("apps/web/**"));
    assert.ok(paths.includes(".github/workflows/deploy.yml"));
  });

  it("stops at the end of the push trigger", () => {
    const yaml = 'on:\n  push:\n    branches: [main]\n    paths:\n      - "a/**"\n      - b\n  pull_request:\n    paths:\n      - c\n';
    assert.deepEqual(parsePushPaths(yaml), ["a/**", "b"]);
    assert.throws(() => parsePushPaths("on:\n  pull_request:\n"), /no push/);
  });
});

describe("range in a git repository", () => {
  const dir = mkdtempSync(join(tmpdir(), "release-notes-"));
  after(() => rmSync(dir, { recursive: true, force: true }));
  const run = (...args) => execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();
  const commit = (subject, files) => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(join(dir, dirname(path)), { recursive: true });
      writeFileSync(join(dir, path), text);
    }
    run("add", "-A");
    run("-c", "user.name=t", "-c", "user.email=t@example.com", "commit", "-q", "-m", subject);
    return run("rev-parse", "HEAD");
  };

  run("init", "-q", "-b", "main");
  const first = commit("Start (#1)", { "docs/history/pr-0001.md": history(1, "How we work", "Start") });
  run("tag", "2026.10.20");
  commit("Schema (#2)", {
    "docs/history/pr-0002.md": history(2, "Data and security", "Boats table", "2"),
    "supabase/migrations/20261021000000_boats.sql": "select 1;",
  });
  commit("Regenerate docs/history.md", { "docs/history.md": "x" });
  run("tag", "2026.10.21");
  run("tag", "v-not-a-release");
  const fix = commit("Quick fix (#3)", { "a.txt": "a" });
  commit("Second migration (#4)", {
    "docs/history/pr-0004.md": history(4, "Web app features", "Costs"),
    "supabase/migrations/20261021010000_costs.sql": "select 2;",
  });
  // A later PR fixes #4's summary: the notes use the wording at the target.
  const last = commit("Fix wording (#5)", {
    "docs/history/pr-0004.md": history(4, "Web app features", "Shared costs"),
    "docs/history/pr-0005.md": history(5, "How we work", "Wording"),
  });

  it("starts at the newest release tag the target contains", () => {
    assert.equal(lastReleaseTag(last, dir), "2026.10.21");
    assert.equal(lastReleaseTag(first, dir), "2026.10.20");
    assert.equal(lastReleaseTag(run("rev-list", "--max-parents=0", "HEAD"), dir), "2026.10.20");
  });

  it("lists the PRs and migrations after the base, up to the target", () => {
    const base = run("rev-parse", "2026.10.21^{commit}");
    const { entries } = collectEntries(rangeCommits(base, last, dir));
    assert.deepEqual(
      entries.map((e) => [e.pr, e.summary]),
      [
        [3, "Quick fix"],
        [4, "Shared costs"],
        [5, "Wording"],
      ],
    );
    assert.deepEqual(rangeMigrations(base, last, dir), ["supabase/migrations/20261021010000_costs.sql"]);
    // Up to an earlier commit, the later PRs and their migration stay out.
    assert.deepEqual(
      collectEntries(rangeCommits(base, fix, dir)).entries.map((e) => e.pr),
      [3],
    );
    assert.deepEqual(rangeMigrations(base, fix, dir), []);
  });

  it("covers everything since a given commit", () => {
    const { entries, others } = collectEntries(rangeCommits(first, last, dir));
    assert.deepEqual(entries.map((e) => e.pr), [2, 3, 4, 5]);
    assert.deepEqual(others, []);
    assert.equal(rangeMigrations(first, last, dir).length, 2);
    assert.deepEqual(rangeCommits(last, last, dir), []);
  });
});
