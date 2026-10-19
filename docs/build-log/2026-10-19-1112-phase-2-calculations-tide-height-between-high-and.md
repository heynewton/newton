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
