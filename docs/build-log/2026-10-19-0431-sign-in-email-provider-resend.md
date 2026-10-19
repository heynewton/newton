## Sign-in email provider: Resend

**Prompt**

```text
SUPABASE_ACCESS_TOKEN, SUPABASE_DEV_DB_PASSWORD and SUPABASE_DEV_PROJECT_REF are saved. Start #60 and #61 in parallel sessions.
```

**What Claude did**

- Took #61 in its own session, next to the dev database (#60).
- Compared Resend, Postmark, Mailgun, Amazon SES, Brevo and Cloudflare Email Service on Supabase
  SMTP support, inbound mail to many addresses with webhooks and attachments (for #10), free and
  first paid tiers, and EU options, from each provider's current pages.
- Wrote `docs/decisions/0003-email-provider.md`: Resend for sign-in mail, email-in and reminders,
  on the free plan. Sign-in mail comes from `noreply@heynewton.app`; email-in uses its own
  subdomain, `boats.heynewton.app`, so the root domain's mail isn't touched.
- Added a setup checklist for the maintainer: the Resend account on the project address, the
  Cloudflare DNS records (where to copy each from), a sending-only key per Supabase project, the
  Supabase SMTP and rate limit settings, and the test that closes #61.
- Updated `docs/architecture.md`: sign-in mail, email-in and reminders name Resend, and the email
  provider is no longer an open decision.

**What changed along the way**

- `docs/tokens.md` (#65) hadn't merged, so the record lists what to add there instead.
- The PR says "Refs #61": the issue closes once the setup is done and a sign-in email arrives.
- Moved #64 and #65 from **In progress** to "Repo and infrastructure" in `docs/history.md`, now that they merged.

**Pull request:** [#66](https://github.com/heynewton/newton/pull/66)
