# Newton

Newton is an AI assistant that knows one boat inside out.

- **On the water** it answers voice questions: *"Hey Newton, what's the target apparent wind angle?"*
- **At home** it keeps the boat's documents, maintenance, budget and co-owner costs organized.

It starts as a hobby project for our own boat and a few friends' boats, but it is designed
from day one to support many boats and many owners, so it can grow into a paid product.

Website: [heynewton.app](https://heynewton.app)

## Documentation

| Page | What it covers |
| --- | --- |
| [Architecture](docs/architecture.md) | How the parts fit together today, and the target for each phase |
| [Decisions](docs/decisions/) | Recorded decisions, such as [auth](docs/decisions/0001-auth.md) and [screen sizes](docs/decisions/0002-screen-sizes.md) |
| [History](docs/history.md) | Every merged PR by phase and topic, and what's next |
| [Build log](docs/build-log/) | How each change was built with Claude Code, prompt by prompt, one file per entry |
| [How we work](docs/process.md) | Roles, the project board and the weekly rhythm |
| [Contributing](CONTRIBUTING.md) | How to pick up an issue, open a PR and review |
| [Maintainer brief](docs/maintainers.md) | What maintainers do on top of contributing: merging, backlog, settings |

## Principles

1. **The boat is the tenant, not the user.** Every record belongs to a boat. People have a
   role on a boat (owner, co-owner, crew, read-only) and can be on several boats.
2. **Numbers come from code, never from the model.** Tides, bearings, target angles, dates
   and cost splits are computed by deterministic, tested functions. The LLM only routes the
   question and phrases the answer.
3. **Zero data entry.** Forwarding an email or uploading a photo is the main way data gets
   in; forms are a fallback.
4. **Offline first on the boat.** The on-water runtime works from cached data and syncs when
   connected.
5. **Owners own their data.** Full export, and the boat record transfers to a buyer on sale.
6. **Safety framing.** Newton supports the skipper; it always states its source and how
   fresh the data is.

## Planned stack

| Layer | Choice |
| --- | --- |
| Database and auth | Postgres with row-level security (Supabase) |
| File storage | Supabase Storage |
| Document search | pgvector |
| Agent | Claude API with tool use |
| Email-in | Inbound email to a per-boat address |
| Web app | Next.js (App Router) + Tailwind, in `apps/web` |
| Mobile app | Expo / React Native |
| Boat data | Signal K (Raspberry Pi + NMEA 2000 gateway) |
| Tides | NOAA predictions, cached |

How the parts fit together, today and in each phase: [docs/architecture.md](docs/architecture.md).

## Build phases

1. **Home side for our own boat** *(current)*: email-in filing, maintenance and renewal
   reminders, co-owner cost split, Q&A over manuals.
2. **On-water voice**: tide and course-to-mark first (phone GPS only), then target angles via Signal K.
3. **Three to five friends' boats**: self-serve onboarding; measure time until a new boat is useful.
4. **Paid product.**

What has landed so far, and what's next in Phase 1: [docs/history.md](docs/history.md).

## Development

You need Node.js 24, the version in `.nvmrc`. With [nvm](https://github.com/nvm-sh/nvm), from the
repo root:

```bash
nvm install      # once: installs the version in .nvmrc
nvm use          # in each new shell (or set it as your default: nvm alias default 24)
```

`npm install` refuses to run on any other version (`engine-strict` in `.npmrc`): if it fails with
`EBADENGINE` and `Required: {"node":"24.x"}`, run `nvm use` and try again. CI, the deploys and
Vercel use the same version.


```bash
npm install      # install every workspace
npm run dev      # web app on http://localhost:3000
npm run check    # lint, type check and tests
npm run build    # production build
```

The database and sign-in run on a local Supabase stack, which needs Docker (Docker Desktop works
without signing in):

```bash
npm run db:start  # Postgres, Auth and a mail catcher; prints the URL and publishable key
npm run db:test   # row-level security tests
npm run db:reset  # re-apply migrations and seed from scratch
npm run db:types  # regenerate apps/web/src/lib/db/database.types.ts after a migration
```

Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in the publishable key. Sign-in
emails don't leave your machine: open the mail catcher at http://127.0.0.1:54324 to click the link.
The seed loads the made-up sample boat Kittiwake (`fixtures/sample-boat`), so signing in as
`alex@example.com` (owner), `sam@example.net` or `jordan@example.com` (co-owners) or
`riley@example.org` (crew) shows it on `/boats`.

Email-in needs Resend, so locally the fixture emails go through the same filing code in the unit
tests (`apps/web/src/lib/email-in`). The sample boat's address is `kittiwake@in.heynewton.test`.

| Folder | What it is |
| --- | --- |
| `apps/web` | The web app (Next.js): the Phase 1 screen |
| `packages/calc` | Deterministic, tested functions for every number Newton reports |
| `packages/indexing` | Manuals split into pages and chunks, embedded for search |
| `packages/agent` | Claude: answers from the boat's manuals with their source, and the evals (`npm run eval:manual-qa -w @newton/agent`) |
| `supabase` | Database migrations, row-level security tests, local Supabase config |
| `fixtures` | Fake sample data (no real boat data) |

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md), then [How we work](docs/process.md) for roles and
the board. Maintainers also read the [maintainer brief](docs/maintainers.md).

## License

[GNU Affero General Public License v3.0](LICENSE).
