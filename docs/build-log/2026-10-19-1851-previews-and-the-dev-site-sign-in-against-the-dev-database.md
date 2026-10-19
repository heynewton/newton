## Previews and the dev site sign in against the dev database

**Prompt**

A side session got this brief from the main session:

````text
Build issue #62, "Previews and the dev site sign in against the hosted dev database". Read the
issue, deploy.yml, apps/web's env handling and docs/tokens.md, and work from up-to-date origin/main.

- The dev site and every PR preview get SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY for newton-dev at
  build and run time. Prefer passing them from GitHub in deploy.yml (for example repo variables
  SUPABASE_DEV_URL and SUPABASE_DEV_PUBLISHABLE_KEY, with vercel build/vercel deploy env flags) so
  nothing has to be set by hand in the Vercel dashboard; if Vercel project env vars are the better
  choice, say why. Never a service-role or secret key.
- Dev Supabase auth: site URL is the dev site, and the redirect allow-list covers PR preview URLs.
  The token can't write auth config, so give the maintainer exact dashboard steps
  (Authentication → URL Configuration), or a one-off command they run themselves, and don't ask
  for wider token permissions unless there's no other way.
- Check the email link's redirect works from a preview (the link must come back to the same
  preview URL, not the dev site), and that a preview's sign-in creates data only in newton-dev.
- Docs: docs/process.md (Previews), docs/architecture.md (hosting/dev rows), docs/tokens.md (any
  new variables), plus your build-log file and history file per the #90 rules.

Steps for the maintainer go in the PR description as a short checklist. Testing: once the
maintainer has done them, sign-in on this PR's own preview is the real test; until then, say
clearly what couldn't be tested. Open the PR with Closes #62 and stop.
````

**What Claude did**

- Added two repo variables to the Deploy workflow, `SUPABASE_DEV_URL` and
  `SUPABASE_DEV_PUBLISHABLE_KEY`. They reach `vercel build` through the job's environment, and the
  running site through `vercel deploy --env`, since a prebuilt deployment doesn't keep the build's
  environment. A first step fails the job if the key isn't `sb_publishable_…`.
- Kept them in GitHub rather than Vercel's project settings: nothing to set by hand in a
  dashboard, the values sit next to `SUPABASE_DEV_PROJECT_REF`, and the workflow can check them.
- Checked the email link's way back: the sign-in action already sends the request's origin as
  the redirect, so a preview asks for its own `/auth/callback`. Supabase honours it only if it's
  on the allow-list; otherwise it falls back to the dev site, where the PKCE cookie is missing and
  the link shows as expired. No app code changed.
- Read real preview URLs from the deployments API (`heynewton-<hash>-hey-newton.vercel.app`) and
  wrote the allow-list: the dev site, `https://heynewton-*-hey-newton.vercel.app/**`, and
  heynewton.app until #37.
- Documented the variables and the Auth URL configuration in `docs/tokens.md`, and updated
  `docs/process.md` and `docs/architecture.md`.

**What changed along the way**

- heynewton.app still serves the dev site, so its origin goes on the dev allow-list too, to be
  removed with #37.
- Whether `--env` reaches a `--prebuilt` deployment at run time isn't spelled out in Vercel's
  docs; this PR's preview will show it once the variables are set. It does: the preview showed
  the sign-in form.

Then, after the maintainer did the checklist, from the main session:

````text
Sign-in on PR #98's preview fails: the session cookie never gets set. [...] It lands on
/sign-in, and opening /boats redirects to /sign-in again: no session. [...] Reproduce and fix
in PR #98. [...] Tell me exactly what the maintainer should retest once it's redeployed.
Don't merge.
````

- Read `newton-dev`'s API logs instead of guessing: the email link's code exchange succeeded
  (`/auth/v1/token?grant_type=pkce` → 200) and the next requests carried the session. The cookie
  was fine. Only `rpc/current_person_id` was called after it, never `people`, so it returned null.
- In the database, one of five auth users had no person: the maintainer's, created at 04:13 UTC
  while testing the Resend sign-in email (#61), before #60's first migration added the trigger
  that gives every new auth user a person. With no person, every page treats a valid session as
  signed out.
- Added a migration that gives every auth user without a person one, the same way the trigger
  does. Checked it on a local stack against a user created with the trigger off.
- Left `newton-dev`'s data alone: the migration fixes it when the PR merges. Until then, the
  preview can be tested with an email address that has never signed in to dev.

**Pull request:** [#98](https://github.com/heynewton/newton/pull/98)
