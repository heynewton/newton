## File forwarded documents into records, with code checking every value

**Prompt**

Started by another Claude Code session, which wrote (its background paragraph on the project is
left out):

````text
Build issue #11, "Classify and extract inbound documents into records". Read the issue (including the comment about European amounts), the email-in code, packages/agent, packages/calc and the fixtures, from up-to-date origin/main.

Done when (from the issue): Claude classifies each stored document's type and proposes fields (dates, amounts, currency, vendor, what it renews or services); dates and amounts are parsed and validated by code before saving, including formats like 1.234,56 € (extend packages/calc with tested parsing if needed); records link to their source document; low-confidence or invalid results are saved as flagged for review rather than guessed; and an eval over the fixture documents is checked in and passes with the stand-in, plus a way to run it against the real model locally when a key is set.

Decide and document where filing runs (for example right after email-in stores a document, as a job, idempotent so re-running doesn't duplicate records) and record it in docs/architecture.md. If you need a migration, name it `supabase/migrations/20261022100000_document_filing.sql` with explicit grants and RLS like the others, plus pgTAP tests. Don't edit email-in's sender matching (another issue covers it), only hook filing in after a document is stored.

Run npm run check, the database tests on the local stack, and the build. Add your build-log and history files, open the PR with `Closes #11`, and stop. Don't merge. Report the PR link, where filing runs, the eval result, and any questions for the maintainer.
````

**What Claude did**

- Added parsers to `packages/calc` for values as documents print them: amounts (`USD 1,676.90`,
  `1.234,56 €`, `€ 1 234,56`, `CHF 1'234.50`, credits in brackets), engine-hour readings and
  dates (numeric in any order, and month names in English, French, German, Spanish, Italian,
  Dutch and Portuguese). They use the document's decimal separator and date order and refuse
  anything ambiguous. Plus `wholeMonthsBetween`, to turn a next-due date into an interval.
- In `packages/agent`, Claude reads the file itself and copies every value as printed;
  `checkProposal()` then requires each value to appear in the document's text, parses it with
  calc, works out intervals, matches the boat's existing maintenance and catches duplicates. A
  low-confidence answer saves nothing.
- Added `document_filings` and `save_document_filing()`, which writes a filing and its records in
  one transaction, once per document, with pgTAP tests.
- Decided where filing runs (decision 0006): right after the email-in webhook answers, in
  Next.js `after()`, and daily at 06:00 UTC from Vercel Cron for anything left. Unsorted
  documents are the queue.
- Wrote a made-up French sail-loft invoice for the fixtures and an eval over every fixture
  document, graded on what would be saved. It passes with a stand-in in CI and passed 6/6 twice
  against `claude-opus-5-5` locally.
- Ran `npm run check`, the database tests and the build, and an end-to-end run of the web app's
  filing code against a local Supabase stack.

**What changed along the way**

- Claude is asked for values as printed, not as numbers or ISO dates, so code can check them
  against the document's text before calc reads them. The currency code it gives has to be
  shown on the document too.
- The issue's comment proposed normalising amounts by the document's language. Claude names the
  document's decimal separator and date order instead, and calc refuses an amount or date that
  contradicts them, which also covers a French invoice in a US boat's mail.
- Expenses need a payer, which a document rarely names. The default is the member who forwarded
  it, and the PR asks the maintainer whether that is right.
- The live eval showed certificates print a premium or fee without a payment date, so those
  expenses are flagged for review rather than dated by guess.
- The migration was renamed to `20261022150000_document_filing.sql`, after the email sync
  (#123) and boat deletion (#127) migrations landed first: the Supabase CLI won't apply a
  migration dated before the last one a database has applied.
- CodeQL flagged five regular expressions in the new calc parsers that a crafted value could
  make backtrack for a long time. They were rewritten as plain prefix and suffix checks, every
  parser refuses input over 64 characters, and tests feed them a million characters.

**Pull request:** [#128](https://github.com/heynewton/newton/pull/128)
