## Preview deployments for every PR

**Prompt**

````text
can I have a link to a preview in the PR? like "deployed to dev"
````

Then, after Claude suggested Vercel and asked how to sign up:

````text
should I sign with [personal email] on vercel or with a @heynewton.app email? (via email forward)
````

````text
why not a vercel team right away
````

````text
I don't like a vercel linked to my personal email for heynewton previews. suggest another way to get vercel previews
````

````text
dev@heynewton.app rule route to [project inbox]
````

````text
preview with option b
````

**What Claude did**

- Filed [#19](https://github.com/heynewton/newton/issues/19) and kept it up to date as the
  decisions came in.
- Added `.github/workflows/deploy.yml`. On each PR from this repo it builds the web app with the
  Vercel command-line tool and deploys a preview. On each push to `main` it updates the dev site.
  Each deploy is reported as a GitHub deployment (`preview` or `dev` environment), so the PR shows
  "This branch was successfully deployed" with a **View deployment** button.
- The workflow also turns off Vercel Authentication on the project, so contributors can open
  previews without a Vercel account. This is safe because previews only use fake data.
- Added a "Previews" section to `docs/process.md`.

**What changed along the way**

- Claude first suggested signing up to Vercel with "Continue with GitHub". The maintainer didn't
  want the project tied to a personal account, so the Vercel account uses the project address on
  the `heynewton.app` domain. Of the two ways to connect it (Vercel's GitHub app on the org, or
  GitHub Actions with a token), *Choice:* option B, GitHub Actions. The only link between the repo
  and Vercel is the `VERCEL_TOKEN` secret.
- Claude explained that a Vercel team needs the paid Pro plan, so the project starts on the free
  Hobby plan and moves to a team before Phase 4 (commercial use).
- The production URL handling was simplified to "report the URL Vercel prints", because it couldn't
  be checked until the token exists.
- The maintainer created the Vercel account and set `VERCEL_TOKEN` with `gh secret set`, so the
  token never went through the chat.
- The first deploy failed: npm workspaces put packages in the root `node_modules`, which a deploy
  run from `apps/web` can't see. Claude switched to Vercel's monorepo setup: run from the repo root,
  with the project's root directory set to `apps/web`.
- The project's very first deploy went to Vercel's production target even though it came from a PR.
  A re-run confirmed that later PR deploys are previews.
- While fixing this, Claude found another branch checked out in the main folder, so it did the fix in
  a separate git worktree.

**Pull request:** [#30](https://github.com/heynewton/newton/pull/30)
