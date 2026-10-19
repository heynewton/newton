## How Newton uses Voyage and Claude

**Prompt**

````text
explain how heynewton works with voyageai and claude (and other ai models)
goal is to update architecture.md
````

Then, offered to add it to the manual Q&A PR (#87):

````text
Put the architecture.md update in its own branch and PR from main instead.
````

**What Claude did**

- Read `packages/indexing` (the Voyage embedder), `packages/agent` (Claude reading excerpts and
  the guards after it), decision 0004 and `docs/tokens.md`.
- Added an "AI models: who does what" section to `docs/architecture.md`: one table for the two
  models (job, what each is sent, what each never does, code, key, stand-in for tests), a sequence
  diagram of one question from embedding to citation, the checks code runs on Claude's answer,
  how to change either model, and the uses still to come (extraction, record lookup, on-device
  voice, offline search, cost per boat).
- Added `packages/agent` and Claude to the "Today" diagram.
- Rendered the diagrams it touched with the Mermaid CLI to check they parse.

**What changed along the way**

- The change was first written on the manual Q&A branch; #87 had already merged, so it moved to
  its own branch from `main`.

**Pull request:** [#96](https://github.com/heynewton/newton/pull/96)
