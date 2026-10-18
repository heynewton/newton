# Newton

Newton is an AI assistant that knows one boat inside out. On the water it answers voice
questions ("Hey Newton, what's the target apparent wind angle?"). At home it keeps the
boat's documents, maintenance, budget and co-owner costs organized.

It starts as a hobby project for our own boat and a few friends' boats, but the design
assumes it may become a paid product, so it is multi-boat and multi-owner from day one.

- Website / domain: heynewton.app
- Repo: github.com/heynewton/newton (public, AGPL-3.0)
- Full spec: "Newton — Product & Architecture Spec" in the team Google Drive (heynewton folder)

## Principles (follow these in every change)

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
6. **Safety framing.** The assistant supports the skipper; it always states its source and
   how fresh the data is.

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

## Build phases

1. Home side for our own boat: email-in filing, maintenance and renewal reminders,
   co-owner cost split, Q&A over manuals.
2. Three to five friends' boats: self-serve onboarding; measure time until a new boat is useful.
3. On-water voice: tide and course-to-mark first (phone GPS only), then target angles via Signal K.
4. Paid product.

We are in **Phase 1**.

## Repo rules

- `main` is protected: every change goes through a pull request. Never push to `main` directly.
- **No real boat data in the repo** (contracts, insurance, receipts, polars, personal info).
  Use fake sample data in `fixtures/`.
- **No secrets in the repo.** Keys go in `.env` (git-ignored). Secret scanning and push
  protection are on.
- The repo is public and AGPL-3.0: assume anything committed is visible to everyone.
