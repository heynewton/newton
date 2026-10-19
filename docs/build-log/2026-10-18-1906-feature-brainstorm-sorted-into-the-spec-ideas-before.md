## Feature brainstorm sorted into the spec, ideas before issues

**Prompt**

````text
Here is a brainstorm of features for newton.

Review and Organize them

Auto start / stop navigation log

Voice command
Find Near shelter
Water Temperature
UV index -> how much sunscreen
Where you're going
When do we get there (destination)
Degree to go

Alert
Low water depth soon
Storm strong wind coming

Reminders
Clean seaweed
Ask for alerts
Check the oil

SOP
Instructions on how to get buoys

Profiles:
Owner
Racing
Cruising
Kids
Guest profile
````

````text
Degree means course more than bearing. Course is corrected for ride and other factors.

Ask for alerts is a mistake. I meant that newton should also proactively alert the user in certain situations.
Emergency: low depth, storm coming
Normal notification: maintenance of oil needed soon

Buoys is about tips to pick our mooring at our regular marina.
````

````text
Check for duplicates
````

````text
Wouldn't it make more sense to organize features in a gdoc first and only create issues for the one we're working to develop in the near term?
Or can we have many issues and still have a way to efficiently have an overview and prioritize.
I think there is a GH project. Do you have access to it in this session?
````

````text
Go ahead with all 3
````

**What Claude did**

- Sorted the brainstorm by build phase and split "Profiles" into three separate ideas: role
  (who you are on the boat), sailing mode (racing or cruising) and audience (kids, guests).
- Asked about three unclear items, then read "degree to go" as course to steer (corrected for
  tidal stream and leeway), "ask for alerts" as proactive alerts at two levels (emergency and
  normal), and "buoys" as owner-written tips for picking up the mooring.
- Checked the 12 proposed issues against the 14 open ones: maintenance schedules and reminders
  were already covered (#7, #9, #12), owner-written procedures partly overlap the manuals Q&A
  (#13, #14), and nothing yet covers the on-water voice ideas (then Phase 3, now Phase 2 since #23).
- Added a "Feature ideas" section to the spec in the team Drive, grouped by phase, with the data
  sources Newton doesn't have yet (marine weather, tidal streams, chart depth, harbours, leeway).
- Wrote down in `docs/process.md` and `CLAUDE.md` that ideas live in the spec until their phase
  is close, and become issues at weekly planning.

**What changed along the way**

- The plan was to file every idea as an issue. It changed to keeping ideas in the spec and filing
  issues only for the current and next phase, so the board stays short.
- At first the Claude GitHub App had no access to the repo, so issue creation and the push were
  refused. Once the maintainer installed it, Claude pushed and filed #21 (owner-written
  procedures). The project board still isn't reachable from the session, so cards move by hand.

**Pull request:** [#22](https://github.com/heynewton/newton/pull/22)
