## Architecture doc: the scaffold today and the target for each phase

**Prompt**

````text
Is there a description of newton technical architecture somewhere? The current scaffold one and the target one for each phases?
If not produced it
````

Follow-up, after the PR was up:

````text
Invert order for phase 2 and 3. I’d like to start working on voice quickly
````

````text
Create issues for the items that you can’t do and I’ll have to do manually.
Update gdrive specs.
Double check that all reference to voice as phase 3 have been moved to phase 2 (and friends is now phase 3 everywhere)
````

**What Claude did**

- Looked in the repo and the Drive spec. The spec has a short architecture section with a diagram,
  but nothing described the current code or what each phase adds technically.
- Wrote `docs/architecture.md`: an overview diagram, the six principles turned into technical
  rules, what is actually built today, the Phase 1 to 4 targets (components, planned layout,
  data flows, matching issues) and the open decisions.
- Linked it from `README.md` and `CLAUDE.md`, and added a rule that PRs which change the
  architecture update the page.
- Rendered the five Mermaid diagrams with mermaid-cli to check they parse.

**What changed along the way**

- Choices not yet made (email provider, job runner, embeddings, voice engines, offline store,
  tides outside the US) are marked as open instead of decided, each pointing to the issue
  that will need it.
- Some sentences read as if the target already existed, so the page got a dated status line,
  and the overview says it shows the target.
- On-water voice moved to Phase 2 and friends' boats to Phase 3, in the README, `CLAUDE.md` (including
  the milestone names) and the architecture page. The voice section now says what it needs from
  Phase 1 (only sign-in, boats and memberships) and that its `calc` and tide work can start early.
- Updated the five phase references in the Drive spec (the Phase 2 ordering note, the emergency alerts
  phase, the voice ideas heading, the onboarding risk and the friends' boats open question).
- Searched the repo and the open issues for any other place that still used the old order. One
  historical build-log line now says "then Phase 3, now Phase 2"; the issues had none.
- Filed the two steps Claude can't do from its session: renaming the milestones
  ([#25](https://github.com/heynewton/newton/issues/25)) and redrawing the spec's build phases
  diagram, which is an image ([#26](https://github.com/heynewton/newton/issues/26)).

**Pull request:** [#23](https://github.com/heynewton/newton/pull/23)
