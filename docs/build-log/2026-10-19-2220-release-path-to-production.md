## Release path to production: a prod database and site behind the maintainer's approval

**Prompt**

````text
#63's blockers (#60, #61) are closed and the dev pipeline is proven by #62, so it's ready to start. But its scope has grown since I wrote it: email-in, reminders and fixture sign-in now exist and need a prod side too, so the issue should be updated first.
Update #63 with these recommendations and start it?
````

**What Claude did**

- Rewrote #63's "Done when" so prod gets its own side of email-in (webhook, keys, secret key),
  reminders (cron, `CRON_SECRET`, `SITE_URL`) and a guarantee that fixture sign-in is never on.
  Recorded that prod needs its own Vercel project, since `heynewton-web`'s production target is
  already the dev site. Added the `email-in` label and assigned the issue.
- Added the Production workflow: it follows a successful Dev database run on `main`, waits for the
  maintainer's approval on the `production` environment, applies migrations to `newton-prod`
  without seeding, and deploys to `heynewton-prod`. It refuses dev's URL, non-publishable keys and
  `FIXTURE_SIGN_IN`, and checks the fixture route answers 404 after deploying.
- Wrote the release path into `docs/process.md`, and a one-time setup checklist for every prod
  account step into `docs/tokens.md`.

**What changed along the way**

- One job does both migrations and the deploy, so a release needs a single approval.
- `workflow_run` only fires from the default branch, so the workflow can't run before merge.

**Pull request:** [#103](https://github.com/heynewton/newton/pull/103)
