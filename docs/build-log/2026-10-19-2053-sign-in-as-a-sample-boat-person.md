## Sign in as a sample-boat person on the dev site and previews

**Prompt**

````text
start 97
````

**What Claude did**

- Read #97 and checked its blocker, #62, was closed by #98. Assigned the issue so the board
  card moves.
- Added `/auth/fixture-sign-in`: it makes a magic link with the secret key
  (`auth.admin.generateLink`) and verifies it at once with `verifyOtp` on the browser's cookie
  client, so the session cookie is set and no email goes out. It is a 404 without
  `FIXTURE_SIGN_IN=1`, and it refuses any address but the four fixture people (each must also be on
  a reserved domain). It then redirects to `/boats`, which forwards a one-boat person to Kittiwake.
- `/sign-in` lists the four people as buttons when the flag is on.
- Set the flag in the Deploy workflow rather than in Vercel's dashboard. That workflow only
  deploys the dev site and previews, so production can't inherit it, and the setting sits in the
  repo next to the other values it passes.
- Unit tests for the route cover: flag off gives 404; other addresses are refused before any link
  is made; a fixture address gets a session; a missing secret key and Supabase errors are
  handled. A test also checks the list matches `boat.json`.
- Documented the flag and the secret key in `docs/tokens.md`, and how to use the option in the
  sample boat's README.

**What changed along the way**

- The secret key is only in Vercel's Production target (the dev site). Previews need it added to
  the Preview target too; the PR says so.
- The local Supabase stack wouldn't start in the cloud container (Docker Hub and ECR rate
  limits). The real sign-in is therefore left to the PR's preview; a local production build
  checked the page and the route's 404, 403 and 503 answers.
- `SUPABASE_SECRET_KEY` turned out to be on Vercel's Preview target already; the maintainer added
  it to Production. After a re-run of Deploy, choosing "Alex Sample" on the PR's preview signed in
  and opened Kittiwake's page.

**Pull request:** [#99](https://github.com/heynewton/newton/pull/99)
