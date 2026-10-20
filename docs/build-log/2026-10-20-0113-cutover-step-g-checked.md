## Cutover step g checked

**Prompt**

````text
I signed in on heynewton.app: the link came back to heynewton.app, the test boat is only in newton-prod, and I deleted it. Please tick step g and finish the PR.
````

Earlier in the same session: "can you implement the changes needed?", then "Both Supabase URL configurations are updated. Go ahead and move the domains and re-run Production."

**What Claude did**

- Set `SITE_URL` on `heynewton-prod` and `PROD_SITE_URL` in the `production` environment to `https://heynewton.app`. Then moved `heynewton.app` (and with it `www`) from `heynewton-web` to `heynewton-prod` with Vercel's domain move endpoint, so there was no gap. The maintainer changed both Supabase URL configurations in the dashboard and approved the Production run.
- Checked from outside: heynewton.app and www are aliases of `heynewton-prod`'s production deployment, fixture sign-in answers 404 there, and the dev site still offers it. Results are in #107.
- #107 merged before step g's tick, so this PR ticks it.

**What changed along the way**

- The first Production run was cancelled before it ran. It was re-run and passed.

**Pull request:** see `docs/history/` for this PR's number.
