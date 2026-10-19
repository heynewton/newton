## heynewton.app serves the homepage

**Prompt**

````text
let start 35. I can do the vercel setup to start
````

**What Claude did**

- Checked that #35 was unblocked: the homepage (#31) had merged in #34.
- Split the work: the maintainer adds the domain in Vercel and the DNS records in Cloudflare
  (account access), Claude does the repo side.
- Opened #37 to move heynewton.app to a production Vercel and Supabase project before sign-in (#5)
  opens to anyone outside the team, so the domain never serves real boat data from the dev setup.
- Noted in `docs/process.md` (Previews) that heynewton.app currently serves the dev site and why
  that changes, and in `docs/architecture.md` where the domain points (Today, the Phase 1 Hosting
  row, and the Phase 3 dev/prod split).

**Pull request:** [#38](https://github.com/heynewton/newton/pull/38)
