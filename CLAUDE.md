# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**Soulbound** is a Souls-like "spin the globe, get reborn in a lost land" web app (Node/Express backend + vanilla JS frontend, no build step). The repo is a **scaffold in progress**: the plan docs are the source of truth and many files are still empty.

- **Implemented:** `server/config.js`, `services/{cache,eldenRing,snapshot}.js`, `utils/errors.js`, `scripts/snapshot.js`.
- **Empty (0 bytes), to be written per the plans:** `server/index.js`, `server/routes/*`, `server/services/locations.js`, everything under `public/` (HTML, CSS, JS). `server/data/locations/*.json` (limgrave/yharnam/lothric) don't exist yet.

Before building anything, read the relevant plan: `PLAN.md` (concept, content, open questions), `BACKEND_PLAN.md` (folder layout, location JSON schema, services, build order), `FRONTEND_PLAN.md` (views, state, hash routing, design tokens), `API_CONTRACT.md` (endpoint shapes and error format, which frontend and backend must both honour).

## Commands

```bash
npm install
npm run dev                  # nodemon server/index.js, http://localhost:3000 (PORT env overrides)
npm start                    # node server/index.js
npm run snapshot             # download Elden Ring API bosses+npcs into server/data/snapshots/
SNAPSHOT_MODE=1 npm start    # serve only from snapshots, never hit the network
```

There is no test runner, linter or build configured. The plans contain manual test checklists (BACKEND_PLAN.md, FRONTEND_PLAN.md). Requires Node >= 18 (uses global `fetch` and `AbortSignal.timeout`). Backend is CommonJS.

## Architecture

One Express process serves `/api/*` and static `public/`. The frontend is plain `<script>` files (no bundler/modules pipeline), with a hash router (`#loc=limgrave&char=vagabond`) and a small subscribe-style store.

**Data model:** every location (Limgrave/Elden Ring, Yharnam/Bloodborne, Lothric/Dark Souls 3) has the same shape: `story[3]`, `characters[4]`, `bosses[4]`, `npcs[3-5]`, so the frontend never branches on game. Location content is hand-written JSON in `server/data/locations/<id>.json`; `config.LOCATION_IDS` lists the valid ids.

**Elden Ring enrichment (Limgrave only):** entries may carry an `apiRef` (`{source, name}`). `services/locations.js` (not yet written) looks it up by **normalised name** (`eldenRing.norm`: lowercase, alphanumerics only), not by the API's free-text region, and merges `image`/`description`/`drops`/`location`. **Local fields always win** for lore and stats (API `healthPoints` is often `"???"`).

**Data-fetch layering (`server/services/`):**
- `eldenRing.load(kind)` (`bosses` | `npcs`) returns `{ index: Map(normName -> entry), source }`, where `source` is `HIT | MISS | SNAPSHOT | NONE` and feeds the `X-Cache` response header.
- Order of resolution: `SNAPSHOT_MODE` → snapshot only; otherwise `cache.wrap()` (memory Map, then disk JSON in `server/data/cache/`, 24h TTL, concurrent misses share one in-flight loader) → on fetch failure fall back to `snapshots/eldenring-<kind>.json`. `fetchJson` retries 3x with `500ms * 2^n` backoff and honours `Retry-After`.
- `snapshot.js` reads/writes `server/data/snapshots/` (committed, bundled fallback); `cache/` is runtime and gitignored.

**Errors:** throw `ApiError(status, code, message)` from `utils/errors.js` and wrap async route handlers in `asyncHandler`; the single `errorHandler` emits `{ error: { status, code, message } }` and hides messages for 5xx. Codes: `BAD_REQUEST`, `NOT_FOUND`, `UPSTREAM_UNAVAILABLE`, `INTERNAL`.

**Boot behaviour (planned):** `locations.js` loads and validates all three JSON files at startup and fails fast with a readable error on malformed data; an unresolved `apiRef` only logs a warning.

## Conventions worth knowing

- Stat keys `HP, ATK, DEF, SPD, MAG` are provisional until the combat phase; boss stats are always hand-written.
- Frontend per-location theming overrides CSS tokens (Limgrave gold `#d9a441`, Yharnam blood `#8b1e2d`, Lothric ember `#e2662a`); the picker is meant to be replaced/driven by a globe (globe.gl) in a later phase using the same open-location action.
- Open design questions (boss encounter mechanics, globe coordinates) are listed at the bottom of `PLAN.md`; don't assume answers.
