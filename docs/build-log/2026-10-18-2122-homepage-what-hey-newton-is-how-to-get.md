## Homepage: what Hey Newton is, how to get started, and a footer on every page

**Prompt**

````text
let's start phase 1 with a homepage for new boat / new user.
is there an issue for that? if not, create it. and define a plan for it
````

Follow-ups, in order (the later ones sent while Claude was working):

````text
Move #31 to In progress and build it on a new branch from main.
````

````text
Homepage should explain what is "Hey Newton".
And offer to "Get started for free", or offer to existing users to access their account.
````

````text
Every page should have a privacy and terms footer, maybe that should be design as one common element for all pages.
````

````text
how many screensize should we optimize for? 2 (phone, laptop) or 3 (phone, tablet, laptop)?
devices used are are typically:

* everywhere: phones: iphone 15 or similar

* on board the boat small tablets at nav station or outside: 9" screens
* on boat larger tablets ipad pro or laptops
* at home: laptops and desktop with large monitors
````

````text
do you recommend 2 or screen sizes? given that tablets are small, I would think 2 is fine
````

````text
2 or 3
````

````text
yes write in docs the decision for 2 screen sizes
````

````text
not "The assistant that knows your boat inside out."
but "The AI assistant that knows your boat inside out."
````

````text
"On the water, say “Hey Newton” and get answers out loud. At home, Newton help owners with maintenance, documents and navigation planning."
````

````text
wdyt of "Ask out loud, hands on the helm. Newton answers using data from your instruments, weather forecast, charts, and your specific boat files."
````

````text
add weather and add idea to spec
````

````text
instead of "Newton supports the skipper; it doesn't replace them. Every answer says where it came from and how fresh the data is." just "Newton supports the skipper; it doesn't replace them."
````

*Choice:* Yes, make the page description match the intro: answers out loud on the water, maintenance, documents and navigation planning at home.

**What Claude did**

- Found no existing issue. #15 (records screen) and #27 (Google and Apple sign-in) were close but
  assume a boat already exists. Split the first run into two flat issues: #31, the signed-out
  homepage (blocked by nothing), and #32, adding your first boat after signing in (blocked by #5
  and #31). Both went on the board with the Phase 1 milestone.
- Moved #31 to In progress and built it: a homepage that explains Hey Newton at home and on the
  water (on the water marked "Coming soon"), **Get started for free** and **Sign in**, and
  placeholder `/get-started` and `/sign-in` pages until the magic link lands in #5.
- Added one footer in the root layout, so every page has Privacy, Terms, licence and repo links.
  `/privacy` and `/terms` are placeholders. Opened #33 to write the real texts before sign-up
  opens to anyone outside the team.
- Checked the pages in the browser at phone, tablet and desktop widths, in light and dark mode.
  The tablet check showed some links were shorter than 44px, so they were made taller for touch.
- Recorded the screen-size decision in `docs/decisions/0002-screen-sizes.md`: two layouts (phone
  below 640px, wide from 640px up for tablets and laptops), touch targets of at least 44px on both,
  and checks at 390px, 800px and 1280px. Linked it from the architecture page and added the three
  widths to the `ship-change` checklist.
- Rewrote the homepage copy as asked: "The AI assistant…" headline (also in the page
  description), the new intro line, and the on-water card, which now lists instruments, tides,
  weather, charts and the boat's own documents, and keeps "even without signal".
- Added "Weather on request" to the spec's Phase 2 feature ideas, next to the storm alert: a marine
  forecast downloaded before leaving, always stated with its source and issue time. The forecast
  source is still open, under "Data we don't have yet".
- Shortened the safety line under "What is Hey Newton?" to "Newton supports the skipper; it
  doesn't replace them."
- Made the page description (search results and link previews) match the new intro line.

**What changed along the way**

- The first plan had a single **Sign in** button. It became "Get started for free" plus a way in
  for existing users, and #31 was rewritten to match.
- The footer started on the homepage only, then moved into the layout as a shared component.
- Claude first recommended three screen sizes (phone, tablet, laptop). The maintainer pointed out
  that the on-board tablets are small, and it became two layouts, still tested at three widths.
- For the on-water line, Claude suggested keeping "even without signal", saying "your boat's own
  documents" rather than "files", and leaving weather out until it had a phase in the spec. The
  maintainer chose to add weather and the spec idea together.
- One commit was pushed after a failed check: the shell had switched to Node 18 and the `&&`
  chain only tested `grep`. The code was fine on Node 22; checks now run with their real exit code.

**Pull request:** [#34](https://github.com/heynewton/newton/pull/34)
