## Show the running version in the site footer

**Prompt**

```text
Start fixing the issue linked to this session. Read the issue context, inspect the relevant code, and implement the smallest complete fix. Add or update focused tests for the changed behavior, validate the result, and summarize the meaningful change when finished.
```

**What Claude did**

- Read issue #165 and its comments, then added the current user as assignee.
- Added a compact version line to the site footer. Production links its release tag to the GitHub Release; dev and previews link the short commit SHA, and previews also link the PR number.
- Passed the release tag, verified commit SHA, and preview PR number from the deployment workflows at build time.
- Added focused tests for production, preview and missing build metadata.
- Ran `npm run check` and `npm run build`. Built with release metadata and confirmed the prerendered homepage displays and links the tag. Checked the footer in the browser at 1280px in dark mode; other widths and light mode were not checked.

**What changed along the way**

- Preview builds use the PR's head SHA rather than GitHub's synthetic merge commit, so the footer points to the commit being reviewed.

**Pull request:** [#168](https://github.com/heynewton/newton/pull/168)
