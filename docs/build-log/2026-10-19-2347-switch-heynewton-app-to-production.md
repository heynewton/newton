## Switch heynewton.app to production

**Prompt**

Started by another Claude Code session, which wrote:

````text
Work on issue #37, "Switch heynewton.app to production". [...]
1. Work out the exact cutover, in order, with as little downtime as possible: move heynewton.app and www from the Vercel project heynewton-web to heynewton-prod (Vercel → project → Domains), what Cloudflare DNS records change, if any (Vercel tells you; keep the proxy off), newton-prod's Supabase auth site URL and redirect list to https://heynewton.app, removing https://heynewton.app/** from newton-dev's redirect list, and anything in the Resend setup that refers to the site URL. Also check whether anything in the repo or the prod workflow hard-codes the dev URL or the prod vercel.app URL as the public address (sign-in redirects use the request's Origin; check that holds on prod). Write the steps as a short checklist in the PR description and in docs/tokens.md (Production), so the maintainer can follow them. Don't change DNS, Vercel or Supabase yourself.
2. Update docs/process.md (Previews: heynewton.app no longer serves the dev site) and docs/architecture.md (Today, Hosting) to describe the split as it is after the switch, plus your build-log file and history file per the #90 rules.
3. Open the PR with `Closes #37` and stop. Report the link and the maintainer's checklist.
4. When the maintainer says the switch is done, verify from outside [...] Then record the results in the PR.
````

**What Claude did**

- Read #37, #63's first-release comment, #103, #105 and the docs, and looked at the live setup from outside: heynewton.app answers from Vercel with fixture sign-in on (the dev site), `www` 308-redirects to the apex, and the prod `vercel.app` URL answers 404 for fixture sign-in. The Cloudflare records point at Vercel with the proxy off.
- Checked the code for a hard-coded public address. None: the sign-in action sends the request's `Origin` as the link's return address, the callback redirects relative to the request URL, and the only configured address is `SITE_URL` (reminder email links). The Production workflow uses `PROD_SITE_URL` for the environment link and the fixture sign-in check.
- Wrote the cutover as step 6 of the Production checklist in `docs/tokens.md`: prepare prod (add heynewton.app to `newton-prod`'s redirect list, set `SITE_URL` and `PROD_SITE_URL`), move the two domains from `heynewton-web` to `heynewton-prod` back to back, then set prod's Site URL, drop the `vercel.app` and dev redirects, and re-run the Production workflow so the new `SITE_URL` is deployed and the 404 check runs on heynewton.app.
- Updated `docs/process.md`, `docs/architecture.md` and decision 0003 to describe the split after the switch.

**What changed along the way**

- No DNS change is expected: both Vercel projects are in the same team and the records belong to the domain. The checklist says what to do if Vercel asks for new ones.
- The prod email-in webhook stays on `heynewton-prod.vercel.app`, which remains prod's address, so Resend needs no change.

**Pull request:** see `docs/history/` for this PR's number.
