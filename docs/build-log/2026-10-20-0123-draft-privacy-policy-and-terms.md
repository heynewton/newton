## Draft privacy policy and terms

**Prompt**

Started by another Claude Code session, which wrote (its background paragraph on the project is
left out):

````text
Work on issue #33, "Write the privacy policy and terms before sign-up opens". You draft; the maintainer decides and signs off. This is not legal advice and the PR must say so.

1. Read the issue, the placeholder pages, the footer, docs/architecture.md, docs/tokens.md and the decisions, from up-to-date origin/main. Build an accurate inventory: each kind of data Newton stores (people, boats, memberships, documents and files, records, inbound email and attachments, embeddings, sign-in data, logs), where it lives, which processor sees it (with region where the docs say), how long it's kept, and how it's exported or deleted today (and what's still planned, like #16).
2. Draft `/privacy` and `/terms` as real pages in the app's existing style, in plain English, each with a "last updated" date. Privacy: what's stored, why, processors, retention, rights and how to exercise them (export, delete, contact), third parties mentioned in forwarded mail. Terms: acceptable use, the safety framing (supports the skipper, doesn't replace navigation, seamanship or official sources), free service with no guarantee or warranty, the AGPL licence of the code, ending an account. Don't invent facts: where something is unknown (who runs the service and its legal identity, contact address, jurisdiction and applicable law, whether data stays in the EU), put a clearly visible placeholder and list it as a question.
3. Keep the pages simple to update later. Check they work at phone width, and add a small test if the app's test setup makes that natural.
4. Add your build-log and history files, and open the PR with `Refs #33` (not Closes: the issue's first item and the sign-off are the maintainer's). In the PR description, list every open question for the maintainer and suggest who could review the texts.
5. Stop and report the PR link, the open questions and anything in the inventory that surprised you (for example data kept longer than needed).
````

**What Claude did**

- Built the data inventory from the migrations, `docs/architecture.md`, `docs/tokens.md` and
  decisions 0003 and 0004: tables, storage, held mail, reminders, sign-in, logs, and which
  provider sees what. Supabase and Resend are in US East (decision 0003); Voyage processes in
  the US with training switched off (decision 0004); Claude and Voyage aren't called by the
  website yet, so the policy lists them as "coming soon".
- Replaced the placeholder with a shared `LegalPage` layout (title, "last updated" date, a draft
  notice) and a `ToDecide` marker that shows every open choice highlighted in the page, so an
  unfinished text can't pass for a finished one.
- Wrote `/privacy` (what is stored and why, people mentioned in forwarded mail, who can see it,
  providers with their region, retention, rights, security) and `/terms` (safety framing,
  account, content, acceptable use, free service with no warranty, AGPL, ending an account).
- Added a render test for both pages and checked them in the running app at 390, 800 and 1280px
  in light and dark mode, with no horizontal scroll.

**What changed along the way**

- Things the inventory turned up are in the PR description: held mail from non-members is kept
  as long as the boat, deleting a boat in SQL leaves its files in Storage, and a person who paid
  an expense can't be deleted without deciding what happens to that expense.

**Pull request:** [#PR](https://github.com/heynewton/newton/pull/PR)
