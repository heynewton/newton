## Anthropic key and the first live manual Q&A eval

**Prompt**

````text
pr87, instructions for anthropic key and live eval
````

Then, while setting up the key:

````text
anthropic individual or org
````

````text
what's difference in price
````

````text
I'd rather use individual
````

````text
could I create a workspace in my claude existing account
````

````text
I've done a claude org for heynewton
````

````text
should I have a newton-dev and newton-prod workspaces?
````

````text
created 2 workspaces.
identity federation instead of api key?
````

````text
key generated and saved. how to put it in .env (and not include on gh)
````

````text
go
````

````text
resolve conflict on pr87
````

**What Claude did**

- Wrote the steps for the key: an account on the project address (`dev@heynewton.app`), not a
  personal one; a `newton-dev` workspace with a monthly spend limit; the key added to the
  git-ignored `.env` from the clipboard, so it never lands in shell history or the chat.
- Answered along the way: token prices are the same for an individual or an organization (VAT
  is the only difference); a workspace in a personal account works but ties Newton's billing and
  keys to one person; separate `newton-dev` and `newton-prod` workspaces keep budgets and
  revocation apart; identity federation suits the prod app on Vercel later, not a laptop eval.
- Merged `main` into the PR. Main had moved the build log and history to one file per entry
  (#90), so the PR's history line became `docs/history/pr-0087.md` under a new "Manual Q&A"
  topic, and its original build-log entry, lost in an earlier merge, was restored as its own file.
- Updated `docs/tokens.md`: the `heynewton` Console org, one workspace per environment, and how
  to load `.env` for the eval. Moved the misplaced "Supabase project settings" heading back
  above its table.
- Ran `npm run check` (all pass) and the live eval: **10/10** on `claude-opus-5-5`, with the
  fake embedder since there's no Voyage key yet.

**What changed along the way**

- The plan was an individual Console account; it became a `heynewton` organization.
- Vitest doesn't read `.env`, and without a key the eval is skipped rather than failed, so a run
  can look green without calling Claude. `docs/tokens.md` gives the command that loads `.env`.
- The machine's default Node was 18; the repo needs 22 (`.nvmrc`), so the checks ran on Node 22.

**Pull request:** [#87](https://github.com/heynewton/newton/pull/87)
