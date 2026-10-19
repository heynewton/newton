## Production checklist: first-release checks done

**Prompt**

````text
Delete Test boat with its documents and files from newton-prod (keep Mini Max, Minx and my account), comment the results on #63, and open a small PR ticking step 5 in docs/tokens.md.
````

Earlier in the same session, after #103 merged: "Walk me through creating newton-prod and heynewton-prod first, then we merge #103", then "can you automate the vercel setup?" and "can you automate part 4".

**What Claude did**

- Helped set up prod. The Supabase connection read `newton-prod`'s ref, URL and publishable key into the `production` environment. The signed-in Vercel CLI created `heynewton-prod` and its env vars, with `CRON_SECRET` generated and piped in without being shown. The maintainer created the access token and Resend keys in the dashboards, piping each into its destination so no secret appeared in the conversation.
- Followed the first Production run: it failed at `supabase link` on an invalid token before touching prod. A replacement token was checked against the pooler endpoint (HTTP status only) before it was saved. The next run applied all 8 migrations and deployed.
- Checked prod: no seeded rows, fixture sign-in 404, email-in filed on prod while dev's webhook answered `unknown_address`, reminders 200, the cron registered, and each Vercel project holding its own keys. Commented the results on #63.
- Deleted the test boat's rows from `newton-prod`.

**What changed along the way**

- `newton-prod` first went into us-west-2 and was recreated in us-east-1, next to dev and Vercel's functions.
- A project created with the Vercel CLI defaults to framework "Other", so #103 had the workflow set Next.js.
- Supabase refuses `delete from storage.objects` ("Use the Storage API instead"), so the test boat's two files are removed in the Storage UI. The checklist now says so.

**Pull request:** [#105](https://github.com/heynewton/newton/pull/105)
