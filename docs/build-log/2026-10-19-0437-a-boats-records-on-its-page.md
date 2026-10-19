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
