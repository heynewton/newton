# 0003: Resend for sign-in mail and email-in

**Status:** Decided, 2026-10-18. Setup in progress: both domains added to Resend and their DNS records in Cloudflare (2026-10-19); the SMTP key and Supabase settings are next. Updated 2026-10-20: dev gets its own Resend team ([below](#update-20-october-2026-dev-gets-its-own-resend-team-109)). **Issues:** #61, #10, #12, #63, #109.

## Context

Sign-in is an email link (#5, [0001](0001-auth.md)). Supabase's built-in email only reaches the
project's team members, about 2 messages an hour, with no delivery guarantee, so the hosted
projects need custom SMTP from our own domain before anyone else signs in
([Supabase: custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)).

Email-in (#10) is the main way data gets in (principle 3). It needs one address per boat,
every message posted to a webhook in the web app, and its attachments stored as documents.
Reminders (#12) will send mail too. One provider for all three is simpler: one account, one set
of DNS records, one bill.

Constraints: accounts on the project address (`dev@heynewton.app`), the cheapest plan that works
for a hobby project that may become a product, DNS on Cloudflare, the web app on Vercel. The root
domain already has mail of its own (the `dev@heynewton.app` forwarding), which must keep working.

## Options checked

Prices and limits from each provider's pages on 2026-10-18.

| Provider | Supabase SMTP | Inbound to many addresses | Free tier | First paid tier | EU |
| --- | --- | --- | --- | --- | --- |
| **Resend** | Listed by Supabase; [guide](https://resend.com/docs/send-with-supabase-smtp) | Any address on a domain with Resend's MX, webhook `email.received`, attachments through the API ([receiving](https://resend.com/docs/dashboard/receiving/introduction)) | 3,000 emails a month, 100 a day, 3 domains; received mail counts toward it ([pricing](https://resend.com/pricing)) | Pro, $20 a month: 50,000 emails, no daily limit | Can send from Ireland on any plan ([changelog](https://resend.com/changelog/multi-region-for-everyone)); account data stays in the US ([regions](https://resend.com/docs/dashboard/domains/regions)) |
| Postmark | Listed by Supabase | Inbound processing only from Pro ($16.50 a month) | 100 emails a month | Basic, $15 a month, 10,000 emails, no inbound ([pricing](https://postmarkapp.com/pricing)) | No EU region named |
| Mailgun | Standard SMTP | 1 inbound route on free, enough for a catch-all | 100 emails a day, 1 domain | Basic, $15 a month, 10,000 emails ([pricing](https://www.mailgun.com/pricing/)) | US or EU region |
| Amazon SES | Listed by Supabase | Receipt rules to S3 or a Lambda, then our own code posts to the web app | Free-tier credits for new AWS accounts only | $0.10 per 1,000 out; $0.10 per 1,000 in plus $0.09 per 1,000 256 KB chunks ([pricing](https://aws.amazon.com/ses/pricing/)) | EU regions |
| Brevo | Listed by Supabase | Has inbound parsing; attachment handling not confirmed | 300 emails a day ([limits](https://help.brevo.com/hc/en-us/articles/208580669)) | Not confirmed (pricing page didn't load) | Company in France |
| Cloudflare Email Service | Authenticated SMTP, sending in **beta** ([docs](https://developers.cloudflare.com/email-service/)) | Email Routing to a Worker, free and unlimited, 25 MiB per message ([limits](https://developers.cloudflare.com/email-routing/limits/)) | Inbound free; sending needs Workers Paid | $5 a month Workers Paid, 3,000 sends, then $0.35 per 1,000 ([pricing](https://developers.cloudflare.com/email-service/platform/pricing/)) | Cloudflare's network |

## Decision

**Resend, for sign-in mail now and for email-in (#10) and reminders (#12) later.** Free plan
until we outgrow it.

- **Sender:** `Hey Newton <noreply@heynewton.app>`. The domain `heynewton.app` is verified in Resend.
  Resend's records sit on `resend._domainkey` and a `send` subdomain, so the root's MX and SPF
  records (and `dev@heynewton.app`) aren't touched.
- **Inbound domain:** `boats.heynewton.app`, added to Resend as a second domain with receiving on.
  Its MX record points only that subdomain at Resend, which catches every address on it. #10
  decides the address format (for example `<boat>@boats.heynewton.app`) and how the webhook maps
  an address to a boat.
- **Sending region:** US East (`us-east-1`), the same as `newton-dev`. It's set per domain when
  it's added; moving later needs Resend support. Prod (#63) uses the same region as dev.
- **Inbound flow for #10:** Resend posts `email.received` with metadata only. The webhook checks
  the Svix signature ([verifying](https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests)),
  then fetches the body through the Received Emails API and each attachment from a download link
  valid for an hour ([attachments](https://resend.com/docs/dashboard/receiving/attachments)), and
  stores them in the boat's document folder. The webhook doesn't need to accept large request
  bodies on Vercel.

Why Resend:

- It is the only option with Supabase SMTP, a catch-all inbound webhook with attachments, and a
  free plan that covers both. Postmark charges for inbound, Mailgun's free plan is one domain,
  SES and Cloudflare make us run our own receiving code (S3 or a Worker) and parse MIME ourselves.
- Free covers Phase 1 and most of Phase 3: a few boats send a handful of sign-in links and
  forwarded emails a day.

## Alternatives considered

- **Cloudflare Email Service.** DNS is already there and inbound is free with no limits. Rejected
  for now: sending is a beta, sending needs Workers Paid ($5 a month), and inbound means a Worker
  of ours parsing raw MIME and forwarding to Vercel, another runtime to deploy and test. Revisit
  when sending leaves beta if Resend's limits start to bite.
- **Mailgun, EU region.** The best option if account data has to stay in the EU. Rejected for now:
  its free plan allows one domain, so sending and `boats.` would need the $15 plan.
- **Split providers** (one for sign-in, another for inbound). Two accounts, two sets of keys and
  DNS records for no gain at our volume.

## Costs

- $0 a month on the free plan: 3,000 emails a month and 100 a day, sent and received together.
- Pro at $20 a month when we pass about 100 emails a day (sign-in links plus forwarded mail plus
  reminders) or need more than 30 days of logs. That's likely in Phase 3 or 4, not Phase 1.

## What would make us switch

- **EU data residency** becomes a requirement (paying customers in the EU asking for it): Mailgun
  EU, or SES in an EU region.
- **Volume or price:** past Pro, SES is a fraction of the cost per email.
- **Cloudflare sending leaves beta** and running inbound in a Worker is worth it to drop a vendor.
- **Deliverability:** sign-in links landing in spam despite SPF, DKIM and DMARC.

The switch is cheap for sending (SMTP settings in Supabase, new DNS records). For inbound, keep
Resend's API calls in one module in `apps/web`, the way the database is reached through one module
([0001](0001-auth.md)).

## Consequences

- Received mail counts toward the 100-a-day limit, so a burst of forwarded email can delay
  sign-in links on the free plan. Supabase's own auth email limit (30 an hour by default) stays
  below what Resend allows in an hour but not in a day; watch Resend's dashboard as boats join.
- A new domain has no sending history, and Supabase's default templates link to `supabase.co`.
  The first test email passed SPF, DKIM and DMARC and still landed in Gmail's spam folder.
  Branded templates with links on our own domain (#71) fix the content; reputation builds as
  people sign in and mark the email "Not spam".
- Resend API keys don't expire on their own. We rotate them yearly by hand (calendar reminder).
- Resend keeps received mail and logs for 30 days on free and Pro; Newton keeps its own copy in
  Supabase Storage, so that's fine.
- Account data (logs, message metadata) is in the US whatever the sending region. The privacy
  policy (#33) lists Resend as a processor.

## Update, 20 October 2026: dev gets its own Resend team (#109)

**Problem.** Dev and prod shared one Resend team. Every message to `boats.heynewton.app`, real
boats' included, landed in it, and each webhook endpoint got every `email.received` event (the
first prod release on #63 saw prod mail reach dev's endpoint, which answered `unknown_address`).
Dev's email-in key needs Full access to read received mail, and a Full-access key reads **all**
the team's received mail. That key was set on `heynewton-web` for Production and Preview, and
previews run code from any branch. That breaks the rule behind #37: dev and previews never reach
real boat data or prod keys.

**What Resend offers** (checked 20 October 2026):

- A **team** is the boundary: "A Resend Team is the environment where your API keys, domains, and
  email data are stored", and one login can belong to several teams
  ([accounts vs teams](https://resend.com/docs/knowledge-base/how-can-i-delete-my-resend-account#understanding-accounts-vs-teams),
  [managing teams](https://resend.com/docs/dashboard/settings/team)). Each team has its own API
  keys, billing and usage ([merging teams](https://resend.com/docs/guides/account/can-i-merge-accounts-or-teams)),
  and a domain can be active on only one team at a time ([claiming a domain](https://resend.com/docs/dashboard/domains/claim)).
- **Received mail is per team:** List Received Emails "only returns emails received by your team"
  ([API](https://resend.com/docs/api-reference/emails/list-received-emails)). So a dev-team key,
  even with Full access, can't list or fetch prod's mail. To be checked once set up (below).
- **A second team may cost money.** Resend's announcement says that after naming a new team you
  "choose a paid transactional or marketing plan" ([multiple teams](https://resend.com/blog/multiple-teams),
  updated July 2026). Pro is $20 a month ([pricing](https://resend.com/pricing)). The docs don't
  say whether a free second team is possible today; the dashboard will.
- **Free plan limits** apply per account/team: 100 emails a day and 3,000 a month, sent and
  received together, 3 domains, 30 days of data
  ([quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits)). The API rate limit
  is per team. A dev team on its own free plan also stops dev's test mail eating prod's daily 100.
- One domain can **send and receive**: receiving is a toggle plus one MX record on a verified
  domain ([custom receiving domains](https://resend.com/docs/dashboard/receiving/custom-domains)).

**Decision.** A separate Resend team for dev, with its own domains, keys and webhook; the
existing team becomes prod's only.

- **How the team is made:** first try Resend → team switcher → **Create team** `newton-dev` on the
  project login (`dev@heynewton.app`). If it offers the Free plan, take it. If it asks for a paid
  plan, don't pay $20 a month for test mail: create a **separate free Resend account** instead,
  signed up with a new project address `resend-dev@heynewton.app` (a Cloudflare Email Routing
  address forwarding to the project Gmail, like `dev@`). Resend's terms don't limit the number of
  accounts ([terms](https://resend.com/legal/terms-of-service)). Either way the isolation is the
  same, because the boundary is the team; a separate account only adds a second login to the
  password manager.
- **Dev sending domain: `dev.heynewton.app`**, sender `Hey Newton <noreply@dev.heynewton.app>`.
  `dev` is a CNAME to Vercel (#106), so it can't hold any other record itself, but Resend's sending
  records all sit *below* it (`resend._domainkey.dev`, `send.dev`), not on `dev`. The sender then
  matches the dev site's address, and sign-in and reminder emails say plainly that they come from
  dev.
- **Dev inbound domain: `boats.dev.heynewton.app`**, receiving on. Receiving needs an MX record
  on the domain itself, which `dev` can't have next to its CNAME, so it's a subdomain; the name
  mirrors prod's `boats.heynewton.app`, so a dev boat's address reads as dev at a glance
  (`kittiwake-…@boats.dev.heynewton.app`). Its records are on `boats.dev` and below, separate from
  prod's `boats` MX and from the root's Cloudflare Email Routing MX.
- **Two domains of the free plan's three.** One domain doing both (sending from
  `noreply@boats.dev.heynewton.app`) would save one but reads oddly in a sign-in email; the third
  stays spare.
- **Region:** US East (`us-east-1`), like prod and `newton-dev`.
- **Previews get no Resend key at all**, even from the dev team. Resend's webhook only calls the dev
  site, so a preview never receives mail, and its `/api/email-in` answers 503 "Email-in is not set
  up here". The dev key stays on the dev site only (Production target of `heynewton-web`), where
  only `main` runs. A contributor's preview reaches `newton-dev` (fixture data) and nothing in
  Resend; the dev site reaches the dev team (test mail only); nothing in dev reaches the prod team.
- **Prod team after the split:** domains `heynewton.app` and `boats.heynewton.app`, keys
  `supabase-newton-prod` and `email-in-newton-prod`, one webhook (prod's). Nothing else.

The setup, in order, is in `docs/tokens.md`, [Dev Resend team](../tokens.md#dev-resend-team-109).
The code didn't need to change: the inbound domain (`INBOUND_EMAIL_DOMAIN`) and the reminders
sender (`REMINDERS_FROM`) were already per deployment, and boats store only their alias, so dev's
boats move to the new domain with the variable.

## Setup

For the maintainer. Accounts, DNS and keys are done in the providers' dashboards; nothing here
goes in the repo. Every value (DKIM keys, API keys) is copied from the provider's screen, never
typed from this page.

### 1. Resend account

- [ ] Sign up at [resend.com](https://resend.com) with `dev@heynewton.app` (not a personal
      address). Free plan. Turn on two-factor authentication.
- [ ] Add the account's recovery details to the project password manager as "Resend".

### 2. Sending domain `heynewton.app`

- [ ] Resend → Domains → Add domain → `heynewton.app`. Region: US East (`us-east-1`), like the
      Supabase projects. Leave receiving **off** for this domain.
- [ ] Resend shows the records to add. Add each in Cloudflare → `heynewton.app` → DNS → Records,
      copying name, type, value and priority exactly:
  - **TXT** `resend._domainkey`: the DKIM key.
  - **MX** `send`: the bounce (return-path) server, with the priority Resend shows.
  - **TXT** `send`: the SPF record for the return path (`v=spf1 include:…`).
  - **CNAME** `rsend`: Resend's sending host.
  - Set Cloudflare's proxy to **DNS only** on the CNAME (MX and TXT have no proxy). A proxied
    CNAME fails verification.
- [ ] If `heynewton.app` has no `_dmarc` record yet, add **TXT** `_dmarc` with
      `v=DMARC1; p=none; rua=mailto:dev@heynewton.app`. Tighten to `p=quarantine` after a few weeks
      of clean reports.
- [ ] Don't change the root's existing MX or SPF records: they carry `dev@heynewton.app`.
- [ ] Click **Verify DNS records** in Resend and wait until the domain shows **Verified**.
- [ ] In the domain's settings, turn **off** click and open tracking: tracking rewrites links,
      which breaks or looks suspicious in sign-in links.

### 3. Inbound domain `boats.heynewton.app`

Can wait until #10 starts, but doing it now proves the DNS in one go.

- [ ] Resend → Domains → Add domain → `boats.heynewton.app`, same region. Add the records it shows
      in Cloudflare the same way (`resend._domainkey.boats`, `send.boats`, `rsend.boats`).
- [ ] Turn **receiving on** for this domain and add the **MX** record for `boats` that Resend shows.
      It must be the only MX on `boats`.
- [ ] Wait for the receiving record to show **Verified**. Send a test email to any address
      `@boats.heynewton.app` and check it appears under Emails → Receiving.
- [ ] Then the webhook, below.

### 3b. Email-in webhook (#10)

The web app's `/api/email-in` route files mail sent to boats' addresses. It needs four settings
where it runs, and the Supabase URL and keys from #62. Real boats' mail must only ever reach prod
(#63, #37), so on dev, send test mail to test boats only.

- [x] Resend → Webhooks → Add endpoint: `https://heynewton-web.vercel.app/api/email-in` (the dev
      site), event `email.received` only. Copy its signing secret (`whsec_…`). Since #106 the
      endpoint is `https://dev.heynewton.app/api/email-in` (`docs/tokens.md`, Dev site address).
- [x] Resend → API Keys → Create API key `email-in-newton-dev`. Reading received mail needs more
      than "Sending access"; pick the narrowest permission that can read received emails (at the
      time of writing, "Full access") and write down which one in `docs/tokens.md`.
- [x] Vercel → `heynewton-web` → Settings → Environment Variables, for Preview and Production
      (both are dev while #63 is open): `RESEND_WEBHOOK_SECRET`, `RESEND_API_KEY`,
      `INBOUND_EMAIL_DOMAIN=boats.heynewton.app`, and `SUPABASE_SECRET_KEY` (newton-dev → Project
      Settings → API Keys → secret key). Mark the secrets **Sensitive**. Redeploy.
- [ ] Test: sign in on the dev site, add a test boat, copy its address from the boat's page and
      email it a PDF from the address you signed in with. It appears under Documents within a
      minute. Send another from an address that isn't on the boat: Resend shows it delivered to
      the webhook (200, `held`), and nothing new appears on the page.
- [ ] Prod (#63) gets its own endpoint, key and secret. Both webhooks receive every message on
      `boats.heynewton.app`; each one ignores addresses that aren't its own boats' (it answers
      200 `unknown_address` and downloads nothing). Since #109 dev has its own Resend team, inbound
      domain `boats.dev.heynewton.app` and webhook, and the dev endpoint no longer gets prod's mail.

### 4. SMTP key for `newton-dev`

- [ ] Resend → API Keys → Create API key:
  - **Name:** `supabase-newton-dev`
  - **Permission:** Sending access (not Full access).
  - **Domain:** `heynewton.app` only.
- [ ] Copy the key straight into Supabase in the next step. Don't save it anywhere else: Supabase
      keeps it, and a lost key is replaced, not recovered.
- [ ] Add a calendar reminder to rotate it in one year (Resend keys have no expiry date).

### 5. Supabase `newton-dev`

- [ ] Supabase → `newton-dev` → Authentication → Emails → SMTP Settings → Enable custom SMTP:
  - **Sender email:** `noreply@heynewton.app`
  - **Sender name:** `Hey Newton`
  - **Host:** `smtp.resend.com`, **Port:** `465`
  - **Username:** `resend`
  - **Password:** the `supabase-newton-dev` key
- [ ] Authentication → Rate Limits: keep **emails per hour** at the default 30 for now.
- [x] Authentication → URL Configuration: **Site URL** is the dev site, and the redirect URLs
      include the dev site's and previews' `/auth/callback` (#62 covers previews).
- [ ] Test: on the dev site, sign in with an address that is **not** on the Supabase team (a
      personal Gmail is fine for the test). The email should arrive in the inbox, not spam, from
      `Hey Newton <noreply@heynewton.app>`, and the link should sign in. In Gmail, "Show original"
      should say SPF, DKIM and DMARC **PASS**.
- [ ] Comment on #61 with the result. #61 closes when this test passes.

### 6. Supabase `newton-prod` (#63)

- [ ] Create a second key, `supabase-newton-prod`, with the same settings, and enter it only in
      `newton-prod`'s SMTP settings. Never one key for both projects: revoking one doesn't break
      the other.
- [ ] Same sender, rate limit and test, with the prod site's URLs (`https://heynewton.app` since #37;
      `https://heynewton-prod.vercel.app` before). The rest of prod's setup is under [Production](../tokens.md#production) in
      `docs/tokens.md`.

### 7. Write it down

- [ ] Check the key's settings in Resend against [Resend SMTP keys](../tokens.md#resend-smtp-keys)
      in `docs/tokens.md`, and correct that section if they differ.
