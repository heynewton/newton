## Manuals indexed for search with pgvector, and an embeddings provider chosen

**Prompt**

````text
Start #13 and #15 in parallel sessions.
````

The planning session started this one for #13 with a brief: a decision record for the embedding
provider with current prices, a `document_chunks` migration with row-level security and a search
function, pgTAP tests including a cross-boat leak test, indexing code behind an embedder interface
with a fake embedder for tests, tested on the fixture manual, and a note on when indexing runs.

**What Claude did**

- Checked current prices on the providers' pages and wrote `docs/decisions/0004-embeddings.md`:
  Voyage AI `voyage-4` at 1024 dimensions, compared with `voyage-4-lite` and `-large`, OpenAI's
  two models, Mistral's EU-hosted `mistral-embed` and an open model run by us. Every hosted option
  costs well under a dollar to index a whole boat, so quality, effort and data decided it. 1024
  dimensions is also what Mistral and `bge-m3` produce, so the EU options are a re-embed away, not
  a migration. The record says to opt out of Voyage's training on our content before the first
  real manual, only manuals are sent, and what would make us switch.
- Added `supabase/migrations/20261019130000_document_chunks.sql`: pgvector, `document_chunks`
  (boat, document, page, chunk text, embedding, model name) tied to its document's boat with a
  composite foreign key, the same roles as `documents` (members read, writers add and remove, no
  edits), explicit grants including the service role for the indexing job, and
  `search_document_chunks()`, which runs as the caller, checks `can_read_boat()` again, and returns
  the document's name and dates so answers can state source and freshness.
- Added 24 pgTAP tests, including the leak test: a crew member searching with exactly another
  boat's chunk vector gets only their own boat's chunks.
- Added `packages/indexing`: text per page from a PDF (`unpdf`), chunks that split at numbered
  headings and never span pages, an `Embedder` interface with the Voyage embedder (key from
  `VOYAGE_API_KEY`) and a deterministic bag-of-words fake, an in-memory store for tests and a
  Supabase store, plus `indexDocument()`, `searchChunks()` and `shouldIndex()` (manuals only).
- Made the fixture manual excerpt two PDF pages (a form feed in the text starts a page), so the
  tests check that page numbers survive: the oil capacity question finds 6.3 on page 2.
- Documented `VOYAGE_API_KEY` in `docs/tokens.md`, updated `docs/architecture.md`, and regenerated
  `database.types.ts`.

**What changed along the way**

- The records migration (#54) had already added a unique `(id, boat_id)` on `documents`, so the
  chunks table reuses it instead of adding its own.
- The fixture PDFs were one page each. `build.mjs` now writes extra pages after the existing
  objects, so the one-page PDFs and their emails come out byte for byte the same.
- Indexing has no trigger yet: the background job runner is still open (#11), so the decision
  record says the job calls `indexDocument()` when a document becomes a manual, and nothing calls
  it until then.

**Pull request:** [#69](https://github.com/heynewton/newton/pull/69)
