## Deploys stay under Vercel's free upload limit, and the road to production

**Prompt**

````text
plan what should be the next issues. goal is to get 37.
````

Then:

````text
Create the issues from your plan, re-scope #37 as the final cutover with Blocked by lines, put them in Ready in that order, and start the deploy-upload fix. Merge #57 as docs-only.
````

**What Claude did**

- While waiting on #57's checks, the deploy failed twice. The Vercel CLI said the free plan's
  5,000 uploaded files a day were used up, and suggested `--archive=tgz`. `main` deploys failed
  the same way, so the dev site stopped updating.
- Planned the work to reach #37 (heynewton.app on production) as five issues, in order:
  - [#59](https://github.com/heynewton/newton/issues/59): deploys stay under the upload limit (this PR)
  - [#60](https://github.com/heynewton/newton/issues/60): a hosted dev database, migrated and
    seeded from `main`
  - [#61](https://github.com/heynewton/newton/issues/61): sign-in emails sent from `heynewton.app`
    through an email provider, possibly the same one #10 uses for inbound mail
  - [#62](https://github.com/heynewton/newton/issues/62): previews and the dev site sign in against
    the dev database
  - [#63](https://github.com/heynewton/newton/issues/63): a production database and deployment,
    behind an approval
- Re-scoped [#37](https://github.com/heynewton/newton/issues/37) as the final DNS cutover, blocked
  by #62 and #63, and put the six issues at the top of Ready in that order.
- Merged #57 as docs-only, since its only failing check was the deploy quota.
- For #59: added `--archive=tgz` to the deploy step, and a note in `docs/process.md` (Previews) on
  the limit and what a quota failure means.

**What changed along the way**

- Claude's previous reply ended in the question box before the plan itself was written out, so the
  maintainer approved the plan without seeing it. Claude spelled out the plan when creating the
  issues.

Then, in another session:

````text
suggest ways to not be blocked by the vercel limit
````

````text
do 1 and 2 in one pr
````

- Claude read the failed runs: the cap is files uploaded a day, not deploys, and `--prebuilt`
  uploads every file of the build output. Most of that evening's PRs were docs-only, yet each
  deployed twice (preview, then `main`).
- It suggested, best first: upload one archive, skip deploys when the site didn't change, promote
  the preview instead of rebuilding on merge, or move to the Pro plan (already planned for #37).
- Option 1 was already in this PR, so Claude added option 2 here instead of opening a new one: the
  Deploy workflow only runs when `apps/web/`, `packages/`, the root package files, `.nvmrc` or the
  workflow change. Deploy isn't a required check in the `main` ruleset, so a skipped run doesn't
  block merging.
- Moved #58 from **In progress** to "How we work" in `docs/history.md`, now that it merged.

**Pull request:** [#64](https://github.com/heynewton/newton/pull/64)
