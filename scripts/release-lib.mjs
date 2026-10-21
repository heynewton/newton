// What `npm run release-notes` and `npm run release-check` share (#163, #164): calendar tags, the
// range of PRs since the last release, the notes, and whether a commit passed on dev. The pure
// functions are unit-tested in release-lib.test.mjs; the rest calls git and `gh api`.
import { execFileSync } from "node:child_process";

export const REPO = "heynewton/newton";
export const REPO_URL = `https://github.com/${REPO}`;

// 2026.10.21, then 2026.10.21.2 for a second release that day.
export const TAG_PATTERN = /^(\d{4})\.(\d{2})\.(\d{2})(?:\.(\d+))?$/;

export function isReleaseTag(tag) {
  return TAG_PATTERN.test(tag);
}

function tagParts(tag) {
  const m = TAG_PATTERN.exec(tag);
  return [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4] ?? 1)];
}

export function compareTags(a, b) {
  const pa = tagParts(a);
  const pb = tagParts(b);
  for (let i = 0; i < pa.length; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

// The newest release tag among `tags`, ignoring any that aren't calendar tags. null if none.
export function latestTag(tags) {
  const release = tags.filter(isReleaseTag).sort(compareTags);
  return release.length ? release[release.length - 1] : null;
}

// The tag for a release on `date` (UTC), given the tags that already exist.
export function nextTag(date, tags) {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00Z`) : date;
  if (Number.isNaN(d.getTime())) throw new Error(`not a date: ${date}`);
  const day = [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, "0"),
    String(d.getUTCDate()).padStart(2, "0"),
  ].join(".");
  const taken = tags.filter((t) => isReleaseTag(t) && t.split(".").slice(0, 3).join(".") === day);
  if (!taken.length) return day;
  const n = Math.max(...taken.map((t) => tagParts(t)[3]));
  return `${day}.${n + 1}`;
}

// The fields of a docs/history/pr-NNNN.md file (format in docs/history/README.md).
export function parseHistoryFile(text, path = "history file") {
  const fields = {};
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const m = /^([a-z]+):\s*(.*)$/.exec(line);
    if (!m) throw new Error(`${path}: can't read line "${line}"`);
    fields[m[1]] = m[2];
  }
  for (const key of ["pr", "topic", "summary"]) {
    if (!fields[key]) throw new Error(`${path}: missing ${key}:`);
  }
  return {
    pr: Number(fields.pr),
    phase: fields.phase,
    topic: fields.topic,
    closes: (fields.closes || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number),
    summary: fields.summary,
  };
}

// Commits pushed to main by the History workflow, which aren't changes of their own.
const BOT_SUBJECT = /^Regenerate docs\/history\.md$/;

// The PR a commit on main merged: squash merges end their subject with "(#N)". null if none.
export function prNumber(subject) {
  const m = /\(#(\d+)\)$/.exec(subject) ?? /^Merge pull request #(\d+) /.exec(subject);
  return m ? Number(m[1]) : null;
}

// One entry per PR merged in the range, in merge order. `commits` are main's commits in the range,
// oldest first: { sha, subject, history } with `history` the text of the PR's
// docs/history/pr-NNNN.md, or null when it has none. Without one, the subject is the summary and
// the topic is unknown (null), for a person to sort. Commits that aren't PRs are kept as
// { sha, subject }, except the History workflow's.
export function collectEntries(commits) {
  const entries = [];
  const others = [];
  for (const c of commits) {
    const pr = prNumber(c.subject);
    if (pr === null) {
      if (!BOT_SUBJECT.test(c.subject)) others.push({ sha: c.sha, subject: c.subject });
    } else if (c.history) {
      const e = parseHistoryFile(c.history, `pr-${String(pr).padStart(4, "0")}.md`);
      if (e.pr !== pr) throw new Error(`pr-${String(pr).padStart(4, "0")}.md says pr: ${e.pr}`);
      entries.push({ ...e, sha: c.sha });
    } else {
      const summary = c.subject.replace(/\s*\(#\d+\)$/, "");
      entries.push({ pr, topic: null, closes: [], summary, sha: c.sha });
    }
  }
  return { entries, others };
}

// The `push.paths` filter of a workflow file, as written in deploy.yml. Only that layout is read:
// a `push:` key, then `paths:`, then one `- path` per line.
export function parsePushPaths(yaml) {
  const lines = yaml.split("\n");
  const push = lines.findIndex((l) => /^\s+push:\s*$/.test(l));
  if (push < 0) throw new Error("no push: trigger");
  const pushIndent = lines[push].search(/\S/);
  const paths = [];
  let inPaths = false;
  for (const line of lines.slice(push + 1)) {
    if (!line.trim()) continue;
    const indent = line.search(/\S/);
    if (indent <= pushIndent) break;
    if (/^\s+paths:\s*$/.test(line)) {
      inPaths = true;
      continue;
    }
    const item = /^\s+-\s+["']?([^"']+?)["']?\s*$/.exec(line);
    if (inPaths && item) paths.push(item[1]);
    else if (inPaths) break;
  }
  if (!paths.length) throw new Error("no paths under the push: trigger");
  return paths;
}

const prLink = (n) => `[#${n}](${REPO_URL}/pull/${n})`;
const issueLink = (n) => `[#${n}](${REPO_URL}/issues/${n})`;

function entryLine(e) {
  const closes = e.closes.length ? `, closes ${e.closes.map(issueLink).join(", ")}` : "";
  return `- ${e.summary} (${prLink(e.pr)}${closes})`;
}

// The release notes, in Markdown. `topics` is docs/history/topics.json: each topic's `release` is
// "new" (What's new) or "hood" (Under the hood), and its order there is the order here.
export function renderNotes({ entries, others = [], migrations, topics, base, to }) {
  const section = (kind) =>
    topics
      .filter((t) => t.release === kind)
      .map((t) => ({ t, rows: entries.filter((e) => e.topic === t.topic) }))
      .filter((b) => b.rows.length)
      .flatMap(({ t, rows }) => ["", `### ${t.topic}`, "", ...rows.map(entryLine)]);

  const known = new Set(topics.map((t) => t.topic));
  const unsorted = entries.filter((e) => !known.has(e.topic));
  const parts = ["## What's new"];
  const isNew = section("new");
  parts.push(...(isNew.length ? isNew : ["", "Nothing you'd see in the app: this release is all under the hood."]));

  parts.push("", "## Under the hood");
  const hood = section("hood");
  parts.push(...(hood.length || unsorted.length || others.length ? hood : ["", "Nothing."]));
  if (unsorted.length) {
    parts.push("", "### Not sorted yet", "", "PRs without a history file: move each to its topic.", "");
    parts.push(...unsorted.map(entryLine));
  }
  if (others.length) {
    parts.push("", "### Other commits", "");
    parts.push(...others.map((c) => `- ${c.subject} ([${c.sha.slice(0, 7)}](${REPO_URL}/commit/${c.sha}))`));
  }

  parts.push("", "## Database changes", "");
  if (migrations.length) {
    parts.push(
      `Publishing this release applies ${migrations.length === 1 ? "this migration" : `these ${migrations.length} migrations`} to \`newton-prod\`. ` +
        "**They can't be undone:** rolling back a release puts the old code back, not the old database.",
      "",
      ...migrations.map((p) => `- [\`${p.split("/").pop()}\`](${REPO_URL}/blob/${to}/${p})`),
    );
  } else {
    parts.push("None: this release doesn't change the database.");
  }

  parts.push(
    "",
    "---",
    "",
    `All changes: [${base.slice(0, 7)}...${to.slice(0, 7)}](${REPO_URL}/compare/${base}...${to}). ` +
      "Drafted from `docs/history/` by `npm run release-notes`.",
    "",
  );
  return parts.join("\n");
}

// ---- git and GitHub ----

export function git(args, cwd, { quiet = false } = {}) {
  const stdio = ["ignore", "pipe", quiet ? "ignore" : "inherit"];
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio, maxBuffer: 64 * 1024 * 1024 }).trim();
}

export function ghApi(path, args = []) {
  return JSON.parse(
    execFileSync("gh", ["api", ...args, path], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }) || "null",
  );
}

// main's commits after `base` up to `to`, oldest first, each with its PR's history file as it is at
// `to` (so a later fix to its wording is used).
export function rangeCommits(base, to, cwd) {
  const log = git(["log", "--first-parent", "--reverse", "--format=%H%x09%s", `${base}..${to}`], cwd);
  if (!log) return [];
  return log.split("\n").map((line) => {
    const [sha, ...rest] = line.split("\t");
    const subject = rest.join("\t");
    const pr = prNumber(subject);
    let history = null;
    if (pr !== null) {
      try {
        history = git(["show", `${to}:docs/history/pr-${String(pr).padStart(4, "0")}.md`], cwd, { quiet: true });
      } catch {
        // no history file for this PR
      }
    }
    return { sha, subject, history };
  });
}

// The newest release tag that `to` contains, or null before the first release.
export function lastReleaseTag(to, cwd) {
  return latestTag(git(["tag", "--merged", to, "--list", "20*"], cwd).split("\n").filter(Boolean));
}

// Migration files added after `base` up to `to`, in the order they apply.
export function rangeMigrations(base, to, cwd) {
  const out = git(["diff", "--name-only", "--diff-filter=A", base, to, "--", "supabase/migrations/"], cwd);
  return out ? out.split("\n").filter((p) => p.endsWith(".sql")).sort() : [];
}

// The commit production last deployed: the newest deployment to the `production` environment whose
// latest status is success. Used for the first release, before there is any release tag.
export function lastProductionDeployment() {
  const deployments = ghApi(`repos/${REPO}/deployments?environment=production&per_page=50`);
  for (const d of deployments) {
    const [latest] = ghApi(`repos/${REPO}/deployments/${d.id}/statuses?per_page=1`);
    if (latest?.state === "success") return { sha: d.sha, at: latest.created_at };
  }
  return null;
}

function workflowRuns(file, sha) {
  return ghApi(`repos/${REPO}/actions/workflows/${file}/runs?head_sha=${sha}&event=push&branch=main&per_page=50`)
    .workflow_runs;
}

// Whether `sha` is on main and passed on dev: the Dev database workflow succeeded on it, and the
// Deploy workflow succeeded on the last commit up to it that changed the app (Deploy only runs on
// pushes that touch its `paths`, so a docs-only commit has no Deploy run of its own and runs the app
// of the commit before). Needs git history up to `sha` in `cwd`. Returns { ok, reasons, lines }.
export function passedOnDev(sha, cwd) {
  const reasons = [];
  const lines = [];
  const { status } = ghApi(`repos/${REPO}/compare/${sha}...main`);
  if (status === "ahead" || status === "identical") {
    lines.push(`- On main: yes (main is ${status === "identical" ? "at this commit" : "ahead of it"}).`);
  } else {
    reasons.push(`${sha.slice(0, 7)} is not on main (compare says "${status}").`);
  }

  const devDb = workflowRuns("dev-database.yml", sha);
  const dbOk = devDb.find((r) => r.conclusion === "success");
  if (dbOk) lines.push(`- Dev database: [succeeded](${dbOk.html_url}) on this commit.`);
  else {
    reasons.push(
      devDb.length
        ? `The Dev database run on ${sha.slice(0, 7)} didn't succeed (${devDb.map((r) => r.conclusion ?? r.status).join(", ")}).`
        : `The Dev database workflow hasn't run on ${sha.slice(0, 7)} (it may have been replaced by a later push: release a later commit).`,
    );
  }

  const paths = parsePushPaths(git(["show", `${sha}:.github/workflows/deploy.yml`], cwd));
  const appSha = git(["log", "-1", "--format=%H", sha, "--", ...paths.map((p) => `:(glob)${p}`)], cwd);
  if (!appSha) {
    reasons.push("No commit up to this one changed the app, so there is no Deploy run to check.");
  } else {
    const deploys = workflowRuns("deploy.yml", appSha);
    const deployOk = deploys.find((r) => r.conclusion === "success");
    const which = appSha === sha ? "this commit" : `${appSha.slice(0, 7)}, the last commit up to this one that changed the app`;
    if (deployOk) lines.push(`- Dev site: Deploy [succeeded](${deployOk.html_url}) on ${which}.`);
    else {
      reasons.push(
        deploys.length
          ? `The Deploy run on ${which} didn't succeed (${deploys.map((r) => r.conclusion ?? r.status).join(", ")}).`
          : `The Deploy workflow hasn't run on ${which} (a later push may have replaced it: release a later commit).`,
      );
    }
  }
  return { ok: reasons.length === 0, reasons, lines };
}
