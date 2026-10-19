## Fake sample boat in fixtures/

**Prompt**

````text
items in progress are almost done. what is next
````

Claude read the board: the top of Ready was #4, the sample boat. *Choice:* "Start #4 once #30 and #34 are merged: branch from an up-to-date main and build the fake sample boat in fixtures/." #30 was merged, but #34 (the homepage) was still waiting for review. *Choice:* "Don't wait for #34. Start #4 from main now, and rebase it later if the build log conflicts."

**What Claude did**

- Added `fixtures/sample-boat/` with an invented boat, Kittiwake, in `boat.json`: three co-owners at 40/35/25, a crew member, and each person's verified sender addresses, shaped like the planned `boats`, `people` and `memberships` tables.
- Wrote four fake documents as plain text (insurance certificate, registration, yard invoice, engine manual excerpt), plus five inbound `.eml` files with them attached as PDFs. One email comes from a non-member, so email-in can test holding mail.
- Added `build.mjs`, a script with no dependencies that turns the text into one-page PDFs and builds the emails. It gives the same bytes on every run.
- Chose numbers that are useful in tests: an invoice total that doesn't split evenly, a registration that expires soon, and an oil change due by hours or date, whichever comes first.
- Updated the Fixtures row in `docs/architecture.md`.

**What changed along the way**

- Claude first planned text-only attachments. It switched to generated PDFs so the emails look like real inbound mail, while keeping the text sources easy to review.
- Rendering the invoice PDF showed the totals sitting two characters right of the amount column, so the text source was realigned.
- `npm run check` failed at first on `apps/web/.next` types left over from the homepage branch. Those are generated and git-ignored, so Claude deleted the folder and the checks passed.

**Pull request:** [#36](https://github.com/heynewton/newton/pull/36)
