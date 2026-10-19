## Answers from the boat's manuals, with the page they came from

**Prompt**

The overnight plan (see "History and architecture catch up with what has merged"), item 6:

````text
Ok with the 6 and the order you defined.
````

**What Claude did**

- New package `packages/agent` (planned in the architecture). `answerFromManuals()` runs search
  (`packages/indexing`, #13), shows Claude only the closest excerpts, numbered, and gets back
  `{covered, answer, sources}` as structured output (`claude-opus-5-5` at low effort, cached
  system prompt, refusals retried on the default fallback model).
- Code decides what reaches the person, not the model:
  - the citation ("From manual-excerpt.pdf, page 2 (received 11 Oct 2026).") is built from the
    excerpts the answer names, with the manual's own page and dates (principle 6);
  - an answer that cites no excerpt it was given is withheld;
  - an answer with a number that isn't in the excerpts it cites is withheld, so Claude can
    quote the manual's figures but not convert, add up or invent one (principle 2);
  - nothing found, or Claude saying the excerpts don't cover it, gives "The boat's manuals on
    Newton don't cover that, so I won't guess."
- **The eval** (`packages/agent/evals/manual-qa.json`): ten questions about the sample engine
  manual. Six covered ones name the page and the words or figures the answer must contain (oil
  capacity 4.8 quarts / 4.5 liters on page 2, impeller every 250 h or 24 months on page 1...),
  and four aren't covered and must be declined, including the issue's own example, "How do I
  bleed the fuel system?", and "How many liters does the fuel tank hold?", which shares words
  with the oil section.
  - `npm run eval:manual-qa -w @newton/agent` runs it live with Claude, and Voyage if its key
    is set.
  - CI runs the retrieval half for real with the fake embedder (the page with the answer is in
    the top 4 for every covered question), and the harness with a stand-in that answers only
    from the excerpts (all pass) and one that guesses (fails).
- 26 tests in the package: the guards, the request Claude gets (no forced tool choice, which
  Claude Opus 5.5 rejects; structured output instead), refusals, malformed replies, and the eval.

**What changed along the way**

- There's no Anthropic or Voyage key in the session, so **the live eval hasn't been run**. The
  PR says so, and it needs one run with real keys before merging.
- Nothing in the app calls it yet: manuals aren't indexed until the job runner (#11), and there's
  no Ask screen. Claude filed that as a follow-up.

**Pull request:** [#87](https://github.com/heynewton/newton/pull/87)
