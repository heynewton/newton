# Sign in with Apple

**Prompt**

````text
add apple sign-in
````

**What Claude did**

- Followed the Google sign-in from #132: replaced the Google-only check and start in `lib/db` with
  `availableSignInProviders()` and `startProviderSignIn()`, added a server action and a "Continue
  with Apple" button on `/sign-in`, shown only where the auth server has Apple on, and made a
  cancelled Google or Apple sign-in return to `/sign-in` with one message.
- Configured Apple in `supabase/config.toml`, off by default and turned on locally from
  `supabase/.env`.
- Added `scripts/apple-client-secret.mjs`, which makes the 6-month client-secret JWT from the Sign
  in with Apple key, and wrote the Apple Developer setup, the Management API command and the
  renewal into `docs/tokens.md`.
- Tested with unit tests, `npm run check`, the build, and the local stack with a placeholder
  Services ID: the button reaches Apple with the right parameters, and the page looks right at
  three widths in light and dark. Checked the script's JWT against a throwaway key.

**What changed along the way**

- The intro text named "Google or Apple" while the buttons went Apple first, so the buttons now
  follow the same order as the text.
- Restarting the local stack failed on the log collector's health check, so it ran without it
  (`supabase start -x vector,logflare`).
- Apple refuses http and IP return URLs, so locally the button only gets as far as Apple; a full
  sign-in needs the dev site.
- The project has no Apple Developer account yet, so dev and prod stay off. The PR is "Part of
  #27", which also keeps account linking and verified sender addresses.

**PR:** [#152](https://github.com/heynewton/newton/pull/152)
