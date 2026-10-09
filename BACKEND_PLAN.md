# Backend Plan: Node + Express

**Job:** serve the three locations (story, characters, bosses, NPCs) as render-ready JSON. Limgrave is enriched from the Elden Ring Fan API; Yharnam and Lothric are local. Everything is cached and works offline.

- **Node 18+** (built-in `fetch`)
- Dependencies: `express`, `cors`, `compression`, `morgan`. Dev: `nodemon`
- One process serves `/api/*` + static `public/`

---

## Folder structure
```
server/
├── index.js                 # app, middleware, static, routes, error handler, boot preload
├── config.js                # PORT, TTLs, URLs, SNAPSHOT_MODE
├── routes/
│   ├── locations.js         # GET /api/locations, /api/locations/:id, /api/weapons
│   └── health.js            # GET /api/health
├── services/
│   ├── cache.js             # memory Map + disk JSON, TTL, in-flight de-dupe
│   ├── eldenRing.js         # fan API client: bosses, npcs, locations (filtered by region)
│   ├── locations.js         # loads local JSON, merges API data, validates shape
│   └── snapshot.js          # read/write bundled fallback JSON
├── utils/
│   └── errors.js            # ApiError, asyncHandler
├── data/
│   ├── weapons.json         # rarities + 22 weapons with skills
│   ├── locations/           # limgrave.json, yharnam.json, lothric.json (hand-written)
│   ├── cache/               # runtime (gitignored)
│   └── snapshots/           # bundled Elden Ring API fallback JSON
└── scripts/
    └── snapshot.js
public/                      # frontend (FRONTEND_PLAN.md)
package.json
```

---

## Location JSON (`data/locations/<id>.json`)
```json
{
  "id": "limgrave", "name": "Limgrave", "game": "Elden Ring",
  "tagline": "Where the Tarnished first see the Erdtree.",
  "coords": { "lat": 0, "lng": 0 },
  "story": ["…", "…", "…"],
  "characters": [
    { "id": "vagabond", "name": "Vagabond", "backstory": "…",
      "stats": { "HP": 15, "ATK": 14, "DEF": 12, "SPD": 9, "MAG": 9 }, "trait": "…" }
  ],
  "bosses": [
    { "id": "godrick", "name": "Godrick the Grafted", "title": "Shardbearer of Stormveil",
      "lore": "…", "stats": { "HP": 0, "ATK": 0, "DEF": 0, "SPD": 0, "MAG": 0 },
      "move": "Grafted Dragon", "apiRef": { "source": "eldenring", "name": "Godrick The Grafted" } }
  ],
  "npcs": [ { "id": "melina", "name": "Melina", "role": "Guide", "where": "Roundtable / grace sites", "quote": "…", "apiRef": null } ]
}
```
- `apiRef` is optional. When present, the service looks the entry up by name in the fan API and merges `image`, `description`, `drops`, `location`. **Local fields win** for lore and stats.
- Stats are hand-written (the API's `healthPoints` is often `"???"`). The stat keys are provisional until combat is designed.

---

## Services

### `eldenRing.js`
Base `https://eldenring.fanapis.com/api`. Endpoints used: `/bosses`, `/npcs`, `/locations` with `?limit=100&page=n`. Responses look like `{ success, count, total, data: [...] }`.
- Boss `region` and `location` are free text, so match on **name** (`apiRef`), not on region. A region filter pulled in unrelated bosses when tried.
- Cache 24h; on failure serve `snapshots/eldenring-*.json`.

### `locations.js`
1. At boot, read the three JSON files and validate required fields (fail fast with a clear error).
2. For each entry with `apiRef`, merge API data if found, else leave local data and log a warning.
3. Expose `list()` (summary cards) and `get(id)` (full record).

---

## Endpoints (shapes in API_CONTRACT.md)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | status, cache stats, snapshot mode |
| GET | `/api/locations` | summary list for the globe/picker |
| GET | `/api/locations/:id` | full location record |
| GET | `/api/weapons` | rarities and all weapons |

**Validation:** unknown `:id` → 404. **Errors:** one handler → `{ error: { status, code, message } }`. **Header:** `X-Cache: HIT | MISS | SNAPSHOT`.

---

## Snapshot / offline mode
`npm run snapshot` downloads all pages of `/bosses`, `/npcs`, `/locations` into `snapshots/`. With `SNAPSHOT_MODE=1`, or when the API fails after 3 retries (backoff `500ms × 2^n`), serve the snapshot with `X-Cache: SNAPSHOT`.

---

## package.json
```json
{
  "name": "soulbound",
  "version": "1.0.0",
  "main": "server/index.js",
  "scripts": {
    "dev": "nodemon server/index.js",
    "start": "node server/index.js",
    "snapshot": "node server/scripts/snapshot.js"
  },
  "dependencies": { "compression": "^1.7.4", "cors": "^2.8.5", "express": "^4.21.0", "morgan": "^1.10.0" },
  "devDependencies": { "nodemon": "^3.1.0" },
  "engines": { "node": ">=18" }
}
```

## Build order
1. `config`, `cache`, `errors`, `index.js` + `/api/health`
2. The three JSON files + `locations.js` + `/api/locations`
3. `eldenRing.js` merge for Limgrave
4. Snapshot script + fallback

## Test checklist
- [ ] `/api/locations` returns exactly 3 entries
- [ ] Each location has 4 characters, 4 bosses, 3+ NPCs, 3 story paragraphs
- [ ] Limgrave's Godrick entry has the API `image`/`drops` merged and local lore intact
- [ ] Repeat call → `X-Cache: HIT`
- [ ] Unknown id → 404
- [ ] API unreachable + snapshot → Limgrave still loads, `X-Cache: SNAPSHOT`
- [ ] A malformed location JSON stops boot with a readable error
