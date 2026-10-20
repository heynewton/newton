## Separate Resend for dev and prod

**Prompt**

Started by another Claude Code session, which wrote:

````text
Work on issue #109, "Separate Resend for dev and prod, so dev and previews can't read real boat mail". Read the issue, decision 0003, docs/tokens.md and the email-in code, from up-to-date origin/main.

1. First, ask the maintainer (in your report) to do the issue's quick fix right away if not done: remove RESEND_API_KEY and RESEND_WEBHOOK_SECRET from heynewton-web's Preview environment. Check what previews then do with email-in (it should fail closed, clearly, not crash the app), and fix the code if it doesn't.
2. Check Resend's current docs and pricing for teams (several teams under one login, separate keys, webhooks and logs per team), free-plan limits per team (domains, sending and receiving), and whether a Full-access key in one team can read another team's received mail (it shouldn't). Cite the pages.
3. Pick the dev names: a dev sending domain and a dev inbound domain that don't clash with dev.heynewton.app's CNAME or prod's mail records (for example mail.dev.heynewton.app or boats-dev.heynewton.app), within the free plan's domain limit. Record the choice in decision 0003 (an update section) with the reasons.
4. Make any code or config change the split needs (for example INBOUND_EMAIL_DOMAIN per environment, the fixture's inbound addresses, the seed), and update docs/tokens.md, docs/architecture.md and decision 0003. Add the maintainer's setup checklist, in order, with the dev team, its domains and DNS records on Cloudflare, new dev keys, the newton-dev SMTP settings, the dev webhook, the Vercel env vars on heynewton-web, then deleting the old dev keys and webhook from the prod team. Add your build-log and history files.
5. Open the PR with `Closes #109` and stop; report the link, the quick-fix status and the checklist.
6. When the maintainer says the setup is done: check from outside that mail to a prod boat address reaches only prod's webhook (ask them to send a test email; you can watch the dev site's response and any logs you can read), and that dev's key can't list prod's received mail (ask them to run a one-line check if you can't). Record the results in the PR. [...]
````

**What Claude did**

- Read `/api/email-in`: without the Resend key, webhook secret, inbound domain or Supabase secret
  key it answers 503 "Email-in is not set up here" before reading the request, so previews
  already fail closed. Added a route test for each missing variable, checking nothing calls
  Resend. A preview deployed before the quick fix still answered 401 "Bad signature", so it
  had the secret; existing previews keep old values until redeployed.
- Checked Resend's docs: a team holds its own keys, domains and email data, List Received Emails
  returns only the team's mail, and a domain is active on one team at a time. Free plan: 100 a
  day, 3,000 a month (received mail counts), 3 domains. Resend's announcement says a new team
  needs a paid plan, so the decision falls back to a separate free account on a new project
  address if the dashboard asks for one.
- Picked `dev.heynewton.app` as the dev sending domain (Resend's records sit below `dev`, so
  the Vercel CNAME isn't touched) and `boats.dev.heynewton.app` as the dev inbound domain (MX
  needs its own name), two of the three free domains.
- Found that reminders send from `noreply@heynewton.app` unless `REMINDERS_FROM` is set, which a
  dev-team key can't do; the setup sets it on the dev site, and `.env.example` documents it.
  No code, fixture or seed change was needed otherwise: boats store only their alias.
- Wrote the update in decision 0003, a "Dev Resend team" section with the setup checklist in
  `docs/tokens.md`, and updated `docs/architecture.md`.

**What changed along the way**

- Previews stay without any Resend key even after the split: Resend's webhook only calls the dev
  site, so a preview never needs one.

**Pull request:** [#112](https://github.com/heynewton/newton/pull/112)
