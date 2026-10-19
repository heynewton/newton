## A boat's records on its page

**Prompt**

````text
Start #13 and #15 in parallel sessions.
````

**What Claude did**

- Extended the boat's page (`/boats/<id>`) from #32 rather than adding a new one. Under the
  boat's name it now shows renewals and maintenance (overdue, due in the next 60 days, and later),
  the co-owner balance, and the boat's documents. Read-only.
- Every date and amount comes from `packages/calc`: due dates from `findDue`/`nextDue`, balances
  from `splitCosts`, amounts through `formatCents`. A new pure module, `apps/web/src/lib/records`,
  only renames database columns into calc's inputs and groups the answers, and has unit tests
  (the web app's first, with Vitest) using the Kittiwake numbers.
- Each number says what it was worked out from: "Last done 18 Apr 2026 at 1,371 h, every 6
  months or 100 h", or "Split of 4 expenses totalling USD 3,478.90, from 15 Dec 2024 to 2 Oct 2026,
  by ownership share: Alex Sample 40, Sam Placeholder 35, Jordan Fictional 25".
- Each record links to its source document. The link goes to a route handler that checks the
  document through RLS as the signed-in person and redirects to a signed URL from the private
  bucket that expires after 60 seconds. Records without a document say so.
- Empty states say what will fill each section (forwarding documents, #10).
- No database change.

**What changed along the way**

- Newton has no engine hour meter yet, so maintenance due by engine hours is checked against the
  latest reading recorded with a service, and the page says which reading and that the meter has
  likely moved on since.
- Boats have no currency column, so the balance is split per expense currency (Kittiwake's are all
  USD). Expenses paid by someone with no ownership share (crew, or someone who left) can't go
  into calc's split, so they are listed as not counted instead of failing the page.
- The seed doesn't include the sample documents yet, so to check the links Claude added them to
  a private copy of the local database only. Seeding them for everyone is a follow-up.

**Pull request:** [#70](https://github.com/heynewton/newton/pull/70)

## History and architecture catch up with what has merged

**Prompt**

````text
What issues could you handle overnight?
Suggest several and I validate the list before you start
````

````text
Look at history and project. And propose new list
````

````text
Ok with the 6 and the order you defined.
Ok with resend for inbound
Ok with calc phase 2
You have 6 hours so no need to do everything in parallel. You can sequence to avoid using all credits too quickly.
````

**What Claude did**

- Read the open issues, `docs/history.md`, `docs/architecture.md`, the build log and the spec's
  build phases and feature ideas, then proposed six changes for one night, run one after the
  other: this catch-up, email-in (#10), reminders (#12), three Phase 2 calc functions, web tests
  and coverage (#47, #46), and Q&A over manuals (#14) if time allows.
- `docs/history.md`: #66, #67, #68, #69 and #70 move from **In progress** to their topics with
  their merge dates and the issues they closed. **What's next** drops #13 and #15 (closed) and
  lists the open steps toward production (#62, #71, #63, #37).
- `docs/architecture.md`: the status line is dated 2026-10-19 and names the boat page, the dev
  database and manual indexing; **Today** mentions the boat page (#15). Hosting for the web app
  is no longer listed as an open decision: Vercel has been running since #30.

**What changed along the way**

- Nothing: the inbound email provider had already been chosen in decision 0003 (Resend on
  `boats.heynewton.app`), so the maintainer's "Resend for inbound" confirms it.

**Pull request:** [#72](https://github.com/heynewton/newton/pull/72)

## Phase 2 calculations: tide height between high and low waters

**Prompt**

The overnight plan (see "History and architecture catch up with what has merged"), item 4:

````text
Ok with calc phase 2
````

**What Claude did**

- Filed three Phase 2 issues from the spec's feature ideas, in the `Phase 2: On-water voice`
  milestone with the `calc` label: tide height (#78), bearing, distance and time to a mark (#79),
  and course to steer with tidal stream and leeway (#80). The architecture says Phase 2's calc
  work needs nothing from Phase 1, so it can start now.
- `tideHeightAt(extremes, time)` in `packages/calc`: the height between the two cached high and
  low waters around a time, by the cosine method tide tables use, in the predictions' own units.
  It returns rising or falling and the two extremes it used, so an answer can say "from the
  predicted low water of 0.3 m at 03:00" (principle 6).
- It refuses what it can't answer honestly: times outside the cached predictions, predictions
  out of order or not alternating, a high water below its low water, and times without a time
  zone (which would silently depend on the phone's settings).
- 10 tests on made-up predictions: exact at the extremes, half range at mid-tide, the closed-form
  quarter-point values, within 2% of the range of the rule of twelfths hour by hour, monotonic on
  the flood and the ebb, and time zones.

**What changed along the way**

- Nothing fetches NOAA predictions yet: that's a `boat-data` issue for when Phase 2 starts.

**Pull request:** [#81](https://github.com/heynewton/newton/pull/81)

## Phase 2 calculations: bearing, distance and time to a mark

**Prompt**

The overnight plan (see "History and architecture catch up with what has merged"), item 4:

````text
Ok with calc phase 2
````

**What Claude did**

- `bearingAndDistance(from, to)` in `packages/calc`: initial great-circle bearing (degrees true)
  and distance (nautical miles) by the haversine formula on the mean Earth radius. The same point
  has no bearing (null) rather than a made-up 0°.
- `timeToMark(distanceNm, speedKnots, now)`: minutes en route and the ETA to the second, or no
  answer below 0.1 kn, since "infinity" isn't an ETA.
- 12 tests: the published Land's End to John o' Groats example (968.9 km, 009°07′11″), one degree
  along a meridian and the equator and back, the antimeridian, a mark 0.5 nm away at 045°, the
  same point, invalid positions, and ETAs across time zones.

**What changed along the way**

- Spherical rather than ellipsoidal: over a day's sailing the difference is a fraction of a
  percent, well under GPS and chart error. Rhumb lines were left out; a boat steers a course to a
  mark it can usually see.

**Pull request:** [#83](https://github.com/heynewton/newton/pull/83)

## Phase 2 calculations: course to steer for tidal stream and leeway

**Prompt**

The overnight plan (see "History and architecture catch up with what has merged"), item 4:

````text
Ok with calc phase 2
````

**What Claude did**

- `courseToSteer({ track, boatSpeed, tide, leeway })` in `packages/calc`: the vector triangle
  navigators draw on the chart. It splits the stream into its parts across and along the track,
  points the boat upstream just enough to cancel the cross-track part, then steers into the wind
  by the leeway. It returns the heading, the expected speed over the ground, and each correction
  separately, so the answer can say why ("23.6° to port for the stream").
- When the stream across the track is faster than the boat, or the stream against it is, it says
  the track can't be held instead of returning a number.
- 11 tests: no stream, stream with and against, the classic example (track 090°, 5 kn, stream
  180° at 2 kn: steer 066.4°, 4.58 kn over the ground), leeway on either tack and across north,
  and an independent check that adding the boat's vector (less leeway) and the stream's lands
  exactly on the track for four mixed cases.

**What changed along the way**

- The track is an input, so this didn't need #79 first; the issue's "Blocked by" line was taken
  out.

**Pull request:** [#84](https://github.com/heynewton/newton/pull/84)

## Test coverage on every PR

**Prompt**

The overnight plan (see "History and architecture catch up with what has merged"), item 5:

````text
Ok with the 6 and the order you defined.
````

**What Claude did**

- `@vitest/coverage-v8` (matching Vitest 5.0.5) in each workspace, and `npm run test:coverage`
  at the root, which runs every workspace's tests with coverage.
- `packages/calc/vitest.config.ts`: at least 95% of lines and branches, or the run fails
  (today 98.4% and 97.0%). The other workspaces are reported, not gated, as the issue asks.
- CI's `check` job runs `test:coverage` instead of `npm test`, then
  `davelosert/vitest-coverage-report-action@v2` once per workspace: a PR comment per workspace that
  is edited on later pushes, and the job summary. Fork PRs get a read-only token, so they skip the
  comment (`comment-on: none`) and keep the summary. The report runs even when the threshold
  fails, so the comment shows why.
- `docs/process.md` (Definition of Done) and the `ship-change` skill mention the bar and the report.

**Pull request:** [#86](https://github.com/heynewton/newton/pull/86)

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
