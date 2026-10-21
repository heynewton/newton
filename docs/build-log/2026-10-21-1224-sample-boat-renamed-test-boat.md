## The sample boat is called "Test boat"

**Prompt**

````text
Instead of "Kittiwake", call test boat "Test boat"
````

**What Claude did**

- Renamed the made-up sample boat from Kittiwake to Test boat in `fixtures/sample-boat/boat.json`,
  the document text sources and `build.mjs`, with the inbound address `test-boat@in.heynewton.test`
  (alias `test-boat`), then regenerated the PDFs, the `.eml` files and `supabase/seed.sql`.
- Updated the tests, evals, code comments, README and docs that named the boat. Test helpers
  called `kittiwake` became `testBoat`.
- Ran `npm run check` and `npm run build`.

**What changed along the way**

- "Test boat" sorts after "Petrel", so the expected order in the boat-list test changed.
- Build-log and history entries and the applied email-in migration keep "Kittiwake": they record
  what happened then.

**PR:** [#162](https://github.com/heynewton/newton/pull/162)
