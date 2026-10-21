## Get started lets anyone sign up, with a note that Newton is in alpha

**Prompt**

> On https://heynewton.app/get-started move to alpha test. Offer to people to register for alpha test.

Then, after the first version:

> Dev deploy failed. Instead of specific list reviewed by maintainers, simply allow people to sign in with a text on the page saying application is in alpha

**What Claude did**

- First built an alpha sign-up list: a form on `/get-started`, an `alpha_signups` table only a
  `register_for_alpha` function could write, and pgTAP and unit tests.
- On the follow-up, removed all of that and made `/get-started` the sign-in screen (Google, Apple
  or an email link, whichever are on) under a "Get started" title, with a note that Newton is in
  alpha, free while we test it, with rough edges. A first sign-in already creates the account, so
  no new backend was needed. `/sign-in` and `/get-started` now share one `SignInScreen` component.
- Renamed the homepage button to "Try the alpha for free" and updated `docs/architecture.md`.
- Checked the page at three widths in light and dark.

**What changed along the way**

- The "failed" dev runs were the first commit's, cancelled when the second push superseded them;
  the latest commit's dev dry run and deploy had passed. The switch was a product choice, not a fix.

**PR:** [#157](https://github.com/heynewton/newton/pull/157)
