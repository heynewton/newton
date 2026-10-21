#!/usr/bin/env node
// Drafts the notes for the next production release (#164) from docs/history/, and with --create
// saves them as a draft GitHub Release. Never publishes: publishing is the maintainer's, and it is
// what releases to production (#163).
//
//   npm run release-notes                      notes for origin/main since the last release
//   npm run release-notes -- --to <sha>        up to that commit instead
//   npm run release-notes -- --from <ref>      since that commit instead of the last release
//   npm run release-notes -- --create          also check the commit passed on dev and save the
//                                              draft release (replacing an existing draft)
//   --date YYYY-MM-DD picks the tag's day (default today, UTC); --no-fetch skips `git fetch`.
//
// The range starts at the newest release tag (2026.10.21, 2026.10.21.2, …) the target contains.
// Before the first release tag, it starts at the commit production last deployed, from the
// `production` environment's deployments.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  REPO,
  collectEntries,
  ghApi,
  git,
  lastProductionDeployment,
  lastReleaseTag,
  nextTag,
  passedOnDev,
  rangeCommits,
  rangeMigrations,
  renderNotes,
} from "./release-lib.mjs";

function parseArgs(argv) {
  const opts = { to: "origin/main", from: null, date: null, create: false, fetch: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--create") opts.create = true;
    else if (a === "--no-fetch") opts.fetch = false;
    else if (["--to", "--from", "--date"].includes(a) && argv[i + 1]) opts[a.slice(2)] = argv[++i];
    else throw new Error(`unknown argument ${a} (see the top of scripts/release-notes.mjs)`);
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const log = (s) => console.error(s);

const topics = JSON.parse(readFileSync("docs/history/topics.json", "utf8"));
const bad = topics.filter((t) => !["new", "hood"].includes(t.release));
if (bad.length) {
  throw new Error(`docs/history/topics.json: set "release" to "new" or "hood" for ${bad.map((t) => t.topic).join(", ")}`);
}

if (opts.fetch) git(["fetch", "--quiet", "--tags", "origin", "main"]);
const to = git(["rev-parse", "--verify", `${opts.to}^{commit}`]);
const tags = git(["tag", "--list", "20*"]).split("\n").filter(Boolean);

let base;
if (opts.from) {
  base = git(["rev-parse", "--verify", `${opts.from}^{commit}`]);
  log(`Since ${base.slice(0, 7)}, as asked (--from ${opts.from}).`);
} else {
  const last = lastReleaseTag(to);
  if (last) {
    base = git(["rev-parse", `${last}^{commit}`]);
    log(`Since the last release, ${last} (${base.slice(0, 7)}).`);
  } else {
    const deployed = lastProductionDeployment();
    if (!deployed) throw new Error("No release tag and no successful production deployment: pass --from <ref>.");
    base = deployed.sha;
    log(`No release tag yet: since production's last deployment, ${base.slice(0, 7)} (${deployed.at}).`);
  }
}
if (git(["merge-base", base, to]) !== base) {
  throw new Error(`${base.slice(0, 7)} isn't an ancestor of ${to.slice(0, 7)}: nothing to compare.`);
}

const { entries, others } = collectEntries(rangeCommits(base, to));
const migrations = rangeMigrations(base, to);
const notes = renderNotes({ entries, others, migrations, topics, base, to });
const tag = nextTag(opts.date ?? new Date(), tags);
log(`Up to ${to.slice(0, 7)}: ${entries.length} PR(s), ${migrations.length} migration(s). Next tag: ${tag}.\n`);

if (!opts.create) {
  console.log(`# ${tag}\n\n${notes}`);
  process.exit(0);
}

if (!entries.length && !others.length) throw new Error("Nothing to release: no changes since the last release.");
const dev = passedOnDev(to);
log(dev.lines.join("\n"));
if (!dev.ok) {
  throw new Error(`Not drafting: ${to.slice(0, 7)} hasn't passed on dev.\n${dev.reasons.map((r) => `- ${r}`).join("\n")}`);
}

// One draft at a time: an existing draft is updated with the new tag, target and notes.
const drafts = ghApi(`repos/${REPO}/releases?per_page=100`).filter((r) => r.draft);
const body = JSON.stringify({ tag_name: tag, target_commitish: to, name: tag, body: notes, draft: true });
const api = (method, path) =>
  JSON.parse(execFileSync("gh", ["api", "-X", method, path, "--input", "-"], { input: body, encoding: "utf8" }));
let release;
if (drafts.length) {
  if (drafts.length > 1) log(`${drafts.length} drafts exist: updating the newest, ${drafts[0].name}.`);
  release = api("PATCH", `repos/${REPO}/releases/${drafts[0].id}`);
} else {
  release = api("POST", `repos/${REPO}/releases`);
}
if (!release.draft) throw new Error(`${release.html_url} isn't a draft: check it now.`);
log(`Draft release ${tag} saved (not published): ${release.html_url}`);
console.log(release.html_url);
