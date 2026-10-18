# Newton

Newton is an AI assistant that knows one boat inside out.

- **On the water** it answers voice questions: *"Hey Newton, what's the target apparent wind angle?"*
- **At home** it keeps the boat's documents, maintenance, budget and co-owner costs organized.

It starts as a hobby project for our own boat and a few friends' boats, but it is designed
from day one to support many boats and many owners, so it can grow into a paid product.

Website: [heynewton.app](https://heynewton.app)

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

## Development

You need Node.js 22 (see `.nvmrc`).

```bash
npm install      # install every workspace
npm run dev      # web app on http://localhost:3000
npm run check    # lint, type check and tests
npm run build    # production build
```

| Folder | What it is |
| --- | --- |
| `apps/web` | The web app (Next.js): the Phase 1 screen |
| `packages/calc` | Deterministic, tested functions for every number Newton reports |
| `fixtures` | Fake sample data (no real boat data) |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[GNU Affero General Public License v3.0](LICENSE).
