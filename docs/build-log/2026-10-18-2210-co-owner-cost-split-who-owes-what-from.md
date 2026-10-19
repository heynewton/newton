## Co-owner cost split: who owes what, from tested code

**Prompt**

````text
what issues can you handle now
````

````text
start 6 and 7
````

**What Claude did**

- Listed the open issues and checked what each was blocked by. #6 (cost split) and #7 (due dates)
  were the only ones blocked by nothing open, with nothing to wait on from the maintainer: pure
  functions in `packages/calc`, which already exists.
- Took #6 first and wrote `splitCosts`. Expenses in integer cents with a payer and a date, plus
  ownership shares, give each co-owner what they paid, their part, and their balance.
- Picked the remainder rule and wrote it down in the code. Each expense is split on its own,
  whole cents rounded down, with leftover cents going to the largest fractional parts and ties
  going to the first co-owner in the list. Parts always add up to the expense, and balances to zero.
- Wrote tests for the three cases the issue named (a 3-way split with a remainder, unequal shares,
  one owner paying everything), plus refunds, shares as a ratio, a sweep of amounts checking the
  sums, and every kind of bad input.
- Listed the function in the Today section of `docs/architecture.md`.

**What changed along the way**

- One test failed at first because Claude's hand arithmetic for the expected values was wrong
  (two of the three expenses left two cents over, not one). The function was right; the expected
  values were fixed and the working was written next to them.
- #6 and #7 go in separate PRs, one issue per PR.
- The board couldn't be updated from the session (#24), so the cards still need moving by hand.

**Pull request:** [#39](https://github.com/heynewton/newton/pull/39)
