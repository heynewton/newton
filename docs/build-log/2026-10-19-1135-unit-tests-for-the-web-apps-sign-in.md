## Unit tests for the web app's sign-in and database layer

**Prompt**

The overnight plan (see "History and architecture catch up with what has merged"), item 5:

````text
Ok with the 6 and the order you defined.
````

**What Claude did**

- `apps/web` already had Vitest and a `test` script since #70, picked up by the root `npm test`
  and CI. This adds `vitest.config.ts` with the `@/` alias and a stand-in for `server-only`
  (which throws outside a Server Components build, by design), so server modules can be tested
  directly.
- 33 tests for `src/lib/db/index.ts` with supabase-js mocked: `sendSignInLink` (eight invalid
  addresses that never reach Supabase, no settings, a provider error, success with the trimmed
  address and redirect), `finishSignIn`, `signOut`, the cookie adapter (including Server
  Components that can't set cookies), `getCurrentPerson`, `listMyBoats` (mapping and sorting),
  `getMyBoat` (no query for an ID that isn't a UUID) and `createBoat` (name limits and each
  database error code).
- 4 tests for `src/lib/db/session.ts`: no settings, no claims, claims read from the request's
  cookies, and refreshed cookies and cache headers copied onto the response.

**Pull request:** [#85](https://github.com/heynewton/newton/pull/85)
