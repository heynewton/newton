## Email-in setup on the dev site

**Prompt**

````text
I think most of the steps in https://github.com/heynewton/newton/blob/main/docs/decisions/0003-email-provider.md#3b-email-in-webhook-10 have already been done. double check, and check the checkboxes for those already done.
````

````text
what do I do for INBOUND_EMAIL_DOMAIN=boats.heynewton.app
````

````text
redeploy
````

````text
I gave email-in-newton-dev Full access. Note it in docs/tokens.md and tick steps 1–3 of section 3b in a PR.
````

**What Claude did**

- Checked each step of section 3b against Resend (through its MCP server) and the dev site. At
  first none was done: Resend had no webhook and no `email-in-newton-dev` key, and
  `/api/email-in` answered 503 "Email-in is not set up here", which the route gives when any of
  its four settings is missing.
- Explained how to add `INBOUND_EMAIL_DOMAIN` in Vercel (not Sensitive, Production and Preview),
  after checking that `boats.heynewton.app` is verified with receiving on in Resend.
- Redeployed the dev site by re-running the latest `main` run of the Deploy workflow, which has no
  manual trigger. `/api/email-in` then answered 401 "Bad signature", so all four settings are in
  place, and Resend showed the webhook (`email.received` only) and the key.
- Ticked steps 1–3 and recorded the key's permission, Full access, in `docs/tokens.md`.

**What changed along the way**

- The maintainer set up the webhook, the key and the Vercel variables during the conversation,
  so the first check found nothing done and the second found steps 1–3 done.
- The test with a real email (step 4) and the prod endpoint (step 5, #63) are still open.

**Pull request:** [#100](https://github.com/heynewton/newton/pull/100)
