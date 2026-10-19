## Every boat gets its own email address

**Prompt**

The overnight plan (see "History and architecture catch up with what has merged"), item 2:

````text
Ok with the 6 and the order you defined.
Ok with resend for inbound
````

**What Claude did**

- **Addresses:** every boat gets an `email_alias`, its name plus six random characters
  (`kittiwake-x7k2qd`), set by a trigger when the boat is created and not editable through the
  API, so the address can't be guessed or changed to a guessable one. The address is the alias at
  `INBOUND_EMAIL_DOMAIN` (`boats.heynewton.app`), shown on the boat's page under Documents and in
  the first next step, which is no longer "Coming soon".
- **Who counts as a member:** `match_inbound_email(alias, sender)` finds the boat and the member
  whose sign-in address or verified `sender_addresses` entry is the From address. The new
  `sender_addresses` table is seeded from the fixture's verified senders; confirming new ones by
  email stays in #27.
- **The webhook** (`/api/email-in`) checks Resend's Svix signature (written with `node:crypto`,
  tested, no new runtime dependency), then:
  - from a member: records the message in `inbound_emails`, downloads the original message
    (`.eml`) and the attachments from Resend's API, and stores each as a document of the boat
    (`source` email; type `email` for the message, `unsorted` for attachments, for #11 to sort),
    linked to the message, with the email's received date;
  - from anyone else: holds it. Only the sender, subject and attachment count are kept, and
    nothing is downloaded. Owners and co-owners can see held mail through RLS; crew and
    read-only members only see filed mail.
  - a retried delivery is a no-op, and one that failed halfway finishes on the retry without
    copies (unique provider ID, fixed storage paths, `completed_at`).
- **Tests:** the five fixture emails run through the filing code with a fake Resend built from
  the `.eml` files (`postal-mime`, dev only): 01–04 are filed with the exact fixture PDFs, 05 is
  held without any download. Plus signature, retry, inline-image and address tests (40 web
  tests), and 25 pgTAP tests for addresses, matching and RLS.
- **Docs:** setup steps for the webhook in decision 0003, the new secrets in `docs/tokens.md`, the
  architecture's Today section, and the fixtures README.

**What changed along the way**

- Resend's docs site wasn't reachable from the session, so the API shapes (received email with
  a `raw` download link, attachments list with `download_url`, the `email.received` payload) come
  from the types in Resend's own Node SDK (`resend@6.34.1`).
- Inbound mail was decided in 0003 already, so no new decision record: the issue's first item was
  covered by #66.
- Owners need a way to see held mail and let it in, and the boat's address may need changing if
  it leaks. Both are left for follow-up issues.

**Pull request:** [#73](https://github.com/heynewton/newton/pull/73)
