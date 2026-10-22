## Document Google Drive importer environment setup

**Prompt**

```text
give me instructions for these 2 x 2 env var
adn update tokens.md accordingly
there is already an oauth client in gcp for the app to make the login with google work. do we need additional vars?
```

**What Claude did**

- Updated `docs/tokens.md` with Google Drive Picker setup and Vercel assignments for dev and production.
- Documented that the existing `newton-dev` and `newton-prod` OAuth clients are reused; no additional OAuth client or client secret is needed for Drive import.
- Explained the separate Picker API keys, allowed origins and API restrictions, `drive.readonly` verification requirement, and redeploy steps.
- Ran `git diff --check`; no runtime behavior or external configuration was changed.

**What changed along the way**

- Clarified that the OAuth client ID is an existing value that must also be supplied to the browser build, while the Picker API key is an additional value.
- Documented dev values on `heynewton-web` Production and Preview, and production values on `heynewton-prod` Production. Preview OAuth origins must be added exactly, without wildcards.

**Pull request:** [#172](https://github.com/heynewton/newton/pull/172)
