# 0004: Embeddings from Voyage AI `voyage-4`, 1024 dimensions, in pgvector

**Status:** Decided, 2026-10-18. **Issues:** #13 (index manuals), used by #14 (Q&A) and #21
(owner-written procedures).

## Context

Questions about the boat ("How much oil does the engine take?") are answered from its manuals,
with the document and page as the source (principle 6). To find the right page, each manual is
split into chunks, each chunk gets an embedding (a vector), and a question is matched against
them in pgvector, in the same Postgres database and under the same row-level security as the
rest of the boat's data.

Claude has no embeddings API, so the embeddings come from someone else. What matters for us:

- **Retrieval quality** on technical English: tables, part names, numbers with units.
- **Cost** for a typical manual. An engine or electronics manual is 50–300 pages; at roughly
  500 tokens a page, a big one is about **150,000 tokens**. A boat has maybe 10–20 manuals, so
  indexing a whole boat is around **2 million tokens**, once. Questions are a few dozen tokens.
- **Data.** Manufacturers' manuals are not sensitive, but owner-written procedures (#21) and,
  later, other documents may be. Newton's team is in the EU, and a paid product would need a
  processor agreement and, ideally, EU processing.
- **Switching later.** Vectors from different models can't be compared, so changing the model
  means re-embedding every chunk. That has to be cheap and planned for.

## Options compared

Prices checked on the providers' pages on 2026-10-18, per million input tokens.

| Option | Price | Whole boat (≈2M tokens) | Dimensions | Data |
| --- | --- | --- | --- | --- |
| **Voyage AI `voyage-4`** | $0.06, first 200M tokens free ([pricing](https://docs.voyageai.com/docs/pricing)) | Free; $0.12 after the free tokens | 1024 default; 256, 512, 2048 ([models](https://docs.voyageai.com/docs/embeddings)) | US processing. Trains on API content **unless you opt out**; after opting out, content is deleted once processed ([privacy](https://www.voyageai.com/privacy)). No EU region listed. |
| Voyage AI `voyage-4-lite` | $0.02, 200M free | Free; $0.04 after | Same | Same |
| Voyage AI `voyage-4-large` | $0.12, 200M free | Free; $0.24 after | Same | Same |
| OpenAI `text-embedding-3-small` | $0.02 ([pricing](https://developers.openai.com/api/docs/pricing)) | $0.04 | 1536 (can be shortened) | US by default; regional data-residency endpoints cost 10% more (same page). |
| OpenAI `text-embedding-3-large` | $0.13 (same page) | $0.26 | 3072 (can be shortened) | Same |
| Mistral `mistral-embed` | $0.10 ([model page](https://docs.mistral.ai/models/mistral-embed-23-12)) | $0.20 | 1024 | EU company, EU processing. 8k-token inputs. Older model (2023-12). |
| Open model run by us (for example `bge-m3`) | Hosting only | A server or GPU we run and keep up | 1024 | Stays wherever we run it. |

Every hosted option costs **well under a dollar per boat**, so price doesn't decide this.
Quality, effort and data do.

## Decision

Use **Voyage AI `voyage-4` at 1024 dimensions** (`output_dimension: 1024`, `input_type:
"document"` for chunks and `"query"` for questions).

- Anthropic's own docs point Claude users to Voyage, and Voyage's models are built for retrieval,
  with separate document and query modes. `voyage-4` is the middle of the range: better than
  `-lite` at no cost that matters to us (200M free tokens is about 100 boats).
- **1024 dimensions** is also what `mistral-embed` and `bge-m3` produce. The column is
  `vector(1024)`, so moving to either of those is a re-embed, not a schema change.
- Every chunk stores the model that embedded it (`embedding_model`), so a switch can re-embed
  boat by boat, and search only compares a question with chunks from the same model.

**Before the first real manual is indexed**, turn off training on our content in the Voyage
dashboard (the opt-out is per account and only covers content sent after it). The API key is
`VOYAGE_API_KEY` ([tokens](../tokens.md)), on the project account.

## What we won't send

Only documents of type `manual` (and later, owner-written procedures, #21) are embedded. Email
bodies, invoices, insurance certificates and contracts are not sent to the embedding provider.

## When indexing runs

When a document **becomes a manual**: stored with type `manual`, or changed to `manual` by
extraction (#11) or a person. Indexing replaces the document's chunks, so running it twice is
harmless, and changing the model means running it again for every manual.

It runs outside the request that stored the document, as a background job with the service
role, once the job runner is decided (#11): the job reads the PDF from Storage and calls
`indexDocument()` from `packages/indexing` when `shouldIndex()` says so. Until then nothing
calls it on its own. Email-in (#10), which stores manuals, and Q&A (#14), which searches them,
are not part of #13.

## What would make us switch

- **EU processing becomes a requirement** (a paid product, or a customer asking for a
  processor agreement with EU processing): move to Mistral or a model we host. Both are 1024
  dimensions.
- **Answers miss pages the manual clearly has**, measured by the Q&A evals (#14): try
  `voyage-4-large`, or a model that handles tables better.
- **Voyage changes its terms** (training without opt-out, the free allowance, or prices well
  above the table).
- **Offline on the boat** (Phase 2) needs questions embedded on the phone: a small open model
  would run there, and the boat's chunks would be re-embedded with it.

## Consequences

- `supabase/migrations/…_document_chunks.sql`: pgvector, `document_chunks` with `vector(1024)`
  and `embedding_model`, row-level security like `documents`, and `search_document_chunks()`.
- `packages/indexing`: PDF text per page, chunks that keep their page, an `Embedder` interface
  with the Voyage embedder and a deterministic fake one for tests, so CI needs no key.
- A model with a different size than 1024 needs a migration (a new column or table), not just a
  re-embed.
