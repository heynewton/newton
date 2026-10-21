## Sign in with Google next to the magic link

**Prompt**

````text
start working on google auth in addition to magic link. i think there is already an issue for this
````

**What Claude did**

- Found #27, which bundled Google, Apple, account linking and per-person sender addresses. Split
  Google out into #131 (with its own "Done when") so it can ship before Apple, which needs a paid
  Apple Developer account, and trimmed #27 to the rest.
- Added `startGoogleSignIn()` and `isGoogleSignInAvailable()` to `lib/db`, a server action and a
  "Continue with Google" button on `/sign-in`, and made `/auth/callback` send a cancelled Google
  sign-in back to `/sign-in` with a message. Google and a magic link share the callback, and
  Supabase Auth gives one verified email one user, so both land on the same person without a
  migration.
- Configured Google in `supabase/config.toml`, off by default, turned on locally by a git-ignored
  `supabase/.env`, and wrote the Google Cloud and Management API setup into `docs/tokens.md`.
- Tested with unit tests, `npm run check`, the build, and the local stack with a placeholder Google
  client: the button reaches Google with the right client ID, the cancel path shows the message,
  and the page looks right at three widths in light and dark.

**What changed along the way**

- With Google `enabled = true` and no keys, the Supabase CLI passed the literal `env(...)` text
  through and the auth server reported Google as on, so the button would show and fail. Google is
  now off in `config.toml`, the CLI's `SUPABASE_AUTH_EXTERNAL_GOOGLE_ENABLED` override turns it on
  from `supabase/.env`, and the page asks the auth server before showing the button.
- The first version awaited the auth settings in the page itself, which `next build` refused under
  Cache Components. That part moved behind Suspense.
- The in-app preview's dev server hung before Next.js started, so the dev server ran in a terminal
  tab instead.
- A real Google sign-in waits for the Google Cloud OAuth clients, which only the dashboard creates.

**PR:** [#132](https://github.com/heynewton/newton/pull/132)
