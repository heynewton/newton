## Claude runs the service CLIs instead of asking for dashboard steps

**Prompt**

````text
note that I prefer to have claude run cli for cloudflare, vercel, resend, supabase, github instead of asking to run manual updates via ui. note in both claude.md and in docs/
````

**What Claude did**

- Added the rule to the Workflow section of `CLAUDE.md`: Claude runs `gh`, `supabase`, `vercel`, `wrangler` and Resend's API or connector itself, and asks for a dashboard only when no CLI or API can do the job.
- Added the longer version to "Working with Claude" in `docs/maintainers.md`, with the limits: secret values piped straight into their destination, never shown, and a yes before anything hard to undo on prod.

**What changed along the way**

- Nothing; docs only.

**Pull request:** [#119](https://github.com/heynewton/newton/pull/119)
