## Logo: the "talking sail", with the web app favicon

**Prompt**

````text
suggest a logo for hey newton
````

Follow-ups, in order:

````text
make talking sail with a nicer boat with spinnaker, going faster
boat is going down, should be the opposite, slightly up. also teal mainsail is too small make it bigger, and spinnaker should be more towards the front of the boat
make boat flat / level. move mast forward to make teal mainsail bigger
remove the teal waves, and make a nicer sea giving some impression of speed
remove the white lines and smooth out the sea at the bow
remove the sea
happy with it
add favicon
make sure to have monochrome version
````

**What Claude did**

- Proposed three concepts as inline SVG sketches: a speech bubble with a sailboat ("talking
  sail"), an N whose diagonal is a sail, and Newton's apple with a sail for a leaf.
- Iterated on the talking sail: added a spinnaker, levelled the boat, moved the mast forward for a
  bigger mainsail, then tried and dropped a sea under the hull.
- Exported the set to `assets/brand/` (primary, small, favicon, light and dark marks, two
  one-colour versions using `currentColor`) with a README on usage and colours.
- Set `favicon.svg` as the web app's App Router icon, replacing the default Next.js `favicon.ico`.
- Rendered every file with `rsvg-convert` to check it, ran `npm run check` and `npm run build`, and
  confirmed the running app serves the icon.

**What changed along the way**

- The mainsail grew twice and the sea came and went; the final mark is just the boat in the bubble.
- The web app only exists in the scaffold PR (#18), so this PR is stacked on `feat/scaffold`
  rather than `main`.

**Pull request:** [#20](https://github.com/heynewton/newton/pull/20)
