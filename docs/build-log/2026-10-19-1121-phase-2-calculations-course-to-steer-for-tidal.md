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
