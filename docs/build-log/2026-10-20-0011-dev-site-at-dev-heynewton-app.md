## Dev site at dev.heynewton.app

**Prompt**

Started by another Claude Code session, which wrote:

````text
Build issue #106, "Dev site at dev.heynewton.app". Read the issue and the docs above. PR #107 (#37) is still open and touches the same docs: base your branch on its branch `claude/switch-domain-to-prod` until it merges, then rebase onto origin/main [...]
1. Repo changes: the dev site sends `X-Robots-Tag: noindex` (or an equivalent robots rule) on dev and previews only, never on prod; the deploy workflow's `dev` environment URL becomes https://dev.heynewton.app; docs/process.md, docs/architecture.md and docs/tokens.md use the new address (heynewton-web.vercel.app keeps working and can stay as a fallback mention). Check nothing else hard-codes the dev URL. Add your build-log and history files.
2. The maintainer's checklist, in order, in the PR description and docs/tokens.md: add dev.heynewton.app to heynewton-web (Vercel → Domains, production target) and the DNS record Vercel asks for on Cloudflare (proxy off, mail records untouched); newton-dev auth site URL https://dev.heynewton.app with https://dev.heynewton.app/** added to the redirect list (keep the existing dev and preview entries); SITE_URL on heynewton-web; the dev Resend webhook endpoint for email-in; then re-run the latest Deploy on main.
3. Open the PR with `Closes #106` and stop; report the link and the checklist.
4. When the maintainer says it's done: verify from outside that dev.heynewton.app serves the dev deployment with fixture sign-in and the noindex header, that heynewton.app (prod) has no noindex header and fixture sign-in is off, and record the results in the PR. [...]
````

**What Claude did**

- Both Vercel projects deploy to Vercel's production target, so `VERCEL_ENV` can't tell dev from prod. Added a `NOINDEX` variable instead: the deploy workflow (dev site and previews only) sets it, and `next.config.ts` sends `X-Robots-Tag: noindex` on every path when it is `1`. The Production workflow fails if `NOINDEX` is set, like its `FIXTURE_SIGN_IN` guard.
- Pointed the deploy workflow's `dev` environment link at `https://dev.heynewton.app`.
- Wrote the maintainer's setup as a new "Dev site address" section in `docs/tokens.md`, and updated the `newton-dev` Auth table, the `SITE_URL` row, `docs/process.md`, `docs/architecture.md` and decision 0003's dev webhook.
- Checked that no code hard-codes the dev URL: sign-in uses the request's `Origin`, email links use `SITE_URL`.
- Built the web app with and without `NOINDEX=1` to check the header rule appears only with it.

**What changed along the way**

- The branch is stacked on #107, which edits the same docs, and the PR targets its branch until it merges.

**Pull request:** [#108](https://github.com/heynewton/newton/pull/108)
