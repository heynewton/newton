## Link the team Drive, spec and admin docs from the repo

**Prompt**

````text
should we add in the repo the link to the gdrive folder? access is restricted so it shouldn't be an issue for confidentiality?
[link to the heynewton Drive folder]

spec doc: [link to the spec]
admin info: [link to the accounts, domain and expenses doc]
````

**What Claude did**

- Confirmed that a link to a Drive folder or doc shared as "Restricted" only opens for people it
  is shared with, so it is safe in a public repo. The risk is someone later switching sharing to
  "Anyone with the link", so `CLAUDE.md` now says to keep it on "Restricted".
- Added the folder, the spec and the accounts, domain and expenses doc to `CLAUDE.md`, and linked
  the spec where `docs/architecture.md` and `docs/process.md` mention it.
- Opened both docs with the Google Docs connector to check the titles. Nothing from them was
  copied into the repo.

**What changed along the way**

- The session started with a request to edit the spec. Drive search wasn't working in the
  session, so Claude couldn't find the doc without its link. With the links in the repo, later
  sessions can open the spec directly through the Google Docs connector.

**Pull request:** [#56](https://github.com/heynewton/newton/pull/56)
