#!/usr/bin/env node
// Checks a release tag before the Production workflow releases it (#163): a calendar tag
// (2026.10.21 or 2026.10.21.2) with a published GitHub Release that isn't a prerelease, on a commit
// that is on main and passed on dev. Prints the tagged commit; in GitHub Actions also writes it to
// the step's `sha` output and the checks to the run summary. Exits 1 with the reasons otherwise.
//
//   npm run release-check -- <tag>
//
// Needs the repo's history and tags (`git fetch --tags`) and `gh` signed in (GH_TOKEN in Actions).
import { appendFileSync } from "node:fs";
import { REPO, REPO_URL, TAG_PATTERN, ghApi, git, passedOnDev } from "./release-lib.mjs";

const tag = process.argv[2];
const summary = [];
const fail = (reasons) => {
  const text = [`**Not released: ${tag ?? "no tag"}.**`, "", ...reasons.map((r) => `- ${r}`)].join("\n");
  for (const r of reasons) console.error(`::error::${r}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  process.exit(1);
};

if (!tag) fail(["Usage: npm run release-check -- <tag>"]);
if (!TAG_PATTERN.test(tag)) fail([`${tag} isn't a release tag: they look like 2026.10.21, or 2026.10.21.2.`]);

let release;
try {
  release = ghApi(`repos/${REPO}/releases/tags/${tag}`);
} catch {
  fail([`No published GitHub Release for ${tag}.`]);
}
if (release.draft) fail([`The release ${tag} is still a draft.`]);
if (release.prerelease) fail([`The release ${tag} is a prerelease: production only takes full releases.`]);

let sha;
try {
  sha = git(["rev-parse", "--verify", `refs/tags/${tag}^{commit}`], undefined, { quiet: true });
} catch {
  fail([`The tag ${tag} isn't in this checkout.`]);
}

const dev = passedOnDev(sha);
if (!dev.ok) fail(dev.reasons);

summary.push(
  `**Releasing [${tag}](${release.html_url})**, commit [${sha.slice(0, 7)}](${REPO_URL}/commit/${sha}).`,
  "",
  ...dev.lines,
);
console.log(summary.join("\n"));
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `sha=${sha}\n`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary.join("\n")}\n`);
