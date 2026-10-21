## Get started registers people for the alpha test

**Prompt**

> On https://heynewton.app/get-started move to alpha test. Offer to people to register for alpha test.

**What Claude did**

- Replaced the `/get-started` placeholder with a "Join the alpha test" page: what the alpha means
  (free, places opened a few boats at a time, rough edges) and a form for an email and an optional
  line about the boat.
- Added an `alpha_signups` table that nobody can read or write through the API, and a
  `register_for_alpha` function anyone can call, which keeps the first sign-up per address and
  doesn't reveal whether an address was already on the list. pgTAP and unit tests for both.
- Renamed the homepage button to "Join the alpha test", added the list to the privacy policy and
  updated `docs/architecture.md`.
- Checked the page at three widths in light and dark.

**What changed along the way**

- Kept the form open to signed-in people too, and made a repeat sign-up succeed silently, so the
  page never tells anyone whether an address is already registered.
- No Docker in the session, so the database test runs in CI only. Rate limiting and a
  confirmation email are left out and listed in the PR.

**PR:** [#157](https://github.com/heynewton/newton/pull/157)
