## Phase 2 calculations: bearing, distance and time to a mark

**Prompt**

The overnight plan (see "History and architecture catch up with what has merged"), item 4:

````text
Ok with calc phase 2
````

**What Claude did**

- `bearingAndDistance(from, to)` in `packages/calc`: initial great-circle bearing (degrees true)
  and distance (nautical miles) by the haversine formula on the mean Earth radius. The same point
  has no bearing (null) rather than a made-up 0°.
- `timeToMark(distanceNm, speedKnots, now)`: minutes en route and the ETA to the second, or no
  answer below 0.1 kn, since "infinity" isn't an ETA.
- 12 tests: the published Land's End to John o' Groats example (968.9 km, 009°07′11″), one degree
  along a meridian and the equator and back, the antimeridian, a mark 0.5 nm away at 045°, the
  same point, invalid positions, and ETAs across time zones.

**What changed along the way**

- Spherical rather than ellipsoidal: over a day's sailing the difference is a fraction of a
  percent, well under GPS and chart error. Rhumb lines were left out; a boat steers a course to a
  mark it can usually see.

**Pull request:** [#83](https://github.com/heynewton/newton/pull/83)
