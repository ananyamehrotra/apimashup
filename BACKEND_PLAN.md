# Backend Plan: Node + Express

**Job:** load countries once, turn real data into RPG stats, chain into Jikan for the anime world and character form, run Top Trumps battles with narration, and return render-ready JSON. All of it is rate-limit-safe, cached, and works offline.

- **Node 18+** (built-in `fetch`)
- Dependencies: `express`, `cors`, `compression`, `morgan`. Dev: `nodemon`
- One process serves `/api/*` + static `public/`

---

## Folder structure
```
server/
├── index.js                 # app, middleware, static, routes, error handler, boot preload
├── config.js                # PORT, TTLs, URLs, SNAPSHOT_MODE, limits
├── routes/
│   ├── countries.js         # GET /api/countries
│   ├── reincarnate.js       # GET /api/reincarnate
│   ├── battle.js            # GET /api/battle
│   ├── img.js               # GET /api/img?url=        (stretch: PNG export)
│   └── health.js            # GET /api/health
├── services/
│   ├── cache.js             # memory Map + disk JSON, TTL, in-flight de-dupe
│   ├── restCountries.js     # 2 calls merged, indexes, spin pool, percentile tables
│   ├── jikan.js             # rate-limited queue + retry + helpers
│   ├── stats.js             # stats, rarity, traits, title
│   ├── classes.js           # stat → class → Jikan genre IDs
│   ├── destiny.js           # anime world + form (seeded, fallback chain)
│   ├── battle.js            # Top Trumps engine
│   ├── narration.js         # dramatic move text templates
│   └── snapshot.js          # read/write bundled fallback JSON
├── utils/
│   ├── rng.js               # mulberry32 + hashString → seed
│   ├── format.js            # 1428627663 → "1.4 BILLION"
│   └── errors.js            # ApiError, asyncHandler
├── data/
│   ├── cache/               # runtime (gitignored)
│   └── snapshots/           # bundled offline JSON
└── scripts/
    └── snapshot.js
public/                      # frontend (FRONTEND_PLAN.md)
package.json
```

---

## config.js
```js
module.exports = {
  PORT: process.env.PORT || 3000,
  JIKAN: 'https://api.jikan.moe/v4',
  COUNTRIES: 'https://restcountries.com/v3.1',
  SNAPSHOT_MODE: process.env.SNAPSHOT_MODE === '1',
  TTL: { countries: 24*3600e3, pool: 6*3600e3, characters: 6*3600e3 },
  JIKAN_GAP_MS: 350,          // ≈2.8 req/s (limit 3)
  JIKAN_PER_MIN: 58,          // limit 60
  JIKAN_TIMEOUT_MS: 8000,
  PARTY_SIZE: 4,
  ROUNDS_TO_WIN: 3,           // best of 5
  IMG_ALLOW: ['cdn.myanimelist.net', 'flagcdn.com', 'mainfacts.com', 'upload.wikimedia.org'],
};
```

---

## Services

### 1. `restCountries.js`
REST Countries allows at most **10 fields** per request, so make two calls merged by `cca3`:
- **A:** `/all?fields=name,cca3,ccn3,flags,population,area,languages,currencies,borders,timezones`
- **B:** `/all?fields=cca3,capital,region,subregion,landlocked,coatOfArms,latlng,unMember`

```js
Country = { cca3, ccn3, name, flag, flagPng, crest, capital, region, subregion,
            population, area, languages: [], currencies: [{code,name,symbol}],
            borders: [], timezones: [], landlocked, latlng: [lat,lng], unMember }
```
- Indexes: `byCca3`, `byCcn3`, `spinPool` (UN members with `population > 0`, about 193).
- At boot: build **sorted value arrays** for each stat over `spinPool` (used for percentiles).
- Cached 24h; fall back to `snapshots/countries.json`.

### 2. `stats.js`
```js
pct(v, sorted) = round(1 + 98 * countLess(sorted, v) / (sorted.length - 1))   // binary search

raw = { HP: population, DEF: area, MP: languages.length, SPD: timezones.length, CHA: borders.length,
        LUK: 1 + floor(rng(hash(cca3+':'+reroll)) * 99) }
stats = { HP: pct(...), DEF: pct(...), MP: pct(...), SPD: pct(...), CHA: pct(...), LUK: raw.LUK }
power  = sum(stats)
rarity = power >= 420 ? 'SSR' : power >= 330 ? 'SR' : power >= 240 ? 'R' : 'N'   // tune with real data
```
**Traits:**
| Condition | Trait | Battle effect |
|---|---|---|
| `landlocked` | ⛰️ Earthbound | DEF raw ×1.1 |
| `borders.length === 0` | 🌊 Sea Wanderer | SPD raw +1 |
| `languages.length >= 3` | 📚 Polyglot | MP raw +1 |
| `population > 100M` | 👥 Legion | HP raw ×1.1 |
| `area < 1000` | 🧚 Pocket Realm | LUK +15 |

**Title:** `The {Class} of {Country}, the {Epithet}`. The epithet comes from the second-highest stat: HP *Unyielding*, DEF *Unbreakable*, MP *Wise*, SPD *Swift*, CHA *Beloved*, LUK *Fortunate*.
**Stat explanation** (for tooltips): `"Population 8.7M, beats 52% of countries"`.

### 3. `classes.js`
Jikan genre IDs (**check them at boot** via `GET /genres/anime` and log a warning on mismatch):
`Action 1 · Adventure 2 · Comedy 4 · Fantasy 10 · Romance 22 · Slice of Life 36 · Supernatural 37 · Military 38 · Isekai 62`
```js
const CLASSES = {
  HP:     { id:'berserker', name:'Berserker', icon:'⚔️', genres:[1],     flavor:'Strength in numbers.' },
  DEF:    { id:'paladin',   name:'Paladin',   icon:'🛡️', genres:[10,38], flavor:'A realm too vast to fall.' },
  MP:     { id:'archmage',  name:'Archmage',  icon:'🔮', genres:[10,37], flavor:'Many tongues, many spells.' },
  SPD:    { id:'rogue',     name:'Rogue',     icon:'🗡️', genres:[2],     flavor:'Always ahead of the sun.' },
  CHA:    { id:'bard',      name:'Bard',      icon:'🎻', genres:[4,22],  flavor:'Friends on every border.' },
  HERMIT: { id:'hermit',    name:'Hermit',    icon:'🏝️', genres:[36],    flavor:'An island unto itself.' },
};
// borders.length===0 && stats.DEF < 30 → HERMIT; else the max of HP/DEF/MP/SPD/CHA (ties broken in that order)
```

### 4. `jikan.js`
- **Queue:** single worker, at least `JIKAN_GAP_MS` between calls, plus a sliding 60-second window ≤ `JIKAN_PER_MIN`.
- **Retry:** 429/5xx → wait `500ms × 2^n` + jitter (honour `Retry-After`), up to 3 tries. Timeout via `AbortController`.
- Everything goes through `cache.wrap` (with in-flight de-dupe).
- Helpers:
  - `animeByGenres(ids, page=1)` → `/anime?genres=<ids>&min_score=7&order_by=members&sort=desc&sfw=true&limit=25&page=`
  - `characters(animeId)` → `/anime/{id}/characters`
  - `genres()` → `/genres/anime`

### 5. `destiny.js`
```
pickDestiny(classDef, seed):
  pool  = animeByGenres([...genres, 62]) → if < 5 results: animeByGenres(genres) → else animeByGenres([10])
  anime = pool[floor(rng(seed) * pool.length)]
  chars = characters(anime.id)
  mains = chars.filter(role==='Main' && hasRealImage)
  form  = pick(mains, seed+1) || chars.find(hasRealImage) || null   // null → use anime poster
```
`hasRealImage` rejects MAL `questionmark` placeholder images.
**Cost:** the pool is cached for 6h per class (6 pools total), so after warm-up a reincarnation is **≤ 1 Jikan call**, and that's cached too.

### 6. Party
`borders → byCca3 → sort by population desc → slice(PARTY_SIZE)` → `{cca3, name, flag, class, power, rarity}`. Pure computation, **0 API calls**.

### 7. `battle.js`: Top Trumps engine
The server knows both fighters and computes **every stat matchup up front**. The frontend drives the turn order (who picks which stat), so the duel is interactive but all logic and narration come from the server.
```
buildBattle(a, b):
  for stat in [HP, DEF, MP, SPD, CHA, LUK]:
     va = effectiveRaw(a, stat)   // raw value with trait modifiers
     vb = effectiveRaw(b, stat)
     winner = va > vb ? 'a' : vb > va ? 'b' : (a.LUK !== b.LUK ? higherLUK : 'draw')
     margin = |va - vb| / max(va, vb)
     line   = narration(stat, winnerFighter, loserFighter, margin)
  aiPick(card) = the stat with the highest percentile not used yet   // for the opponent's turn
  return { a: card(a), b: card(b), matchups: {HP:{...}, ...}, aiOrder: [...] }
```
**Rules (applied in the frontend from `matchups`):** best of 5 (first to 3). The round winner picks the next stat. A stat can't be used twice in a match. Draw → no point, same picker.

### 8. `narration.js`
Templates per stat, filled with formatted raw values (`format.js`: `1428627663 → "1.4 BILLION"`, `17098246 → "17.1 MILLION KM²"`):
```js
HP:  ['ULTIMATE MOVE: {va} PEOPLE!', '{A} SUMMONS A HORDE OF {va}!']
DEF: ['ABSOLUTE TERRITORY: {va} OF IRON WILL!', '{A}\'S BORDERS STRETCH {va}. THE ATTACK CANNOT REACH!']
MP:  ['FORBIDDEN CHANT IN {va} TONGUES!', 'POLYGLOT BARRAGE: {va} LANGUAGES AT ONCE!']
SPD: ['TIME-SKIP ACROSS {va} TIMEZONES!', '{A} MOVES BEFORE THE SUN RISES. {va} ZONES OF SPEED!']
CHA: ['SUMMON {va} NEIGHBOURING ALLIES!', 'FRIENDSHIP POWER ×{va}!']
LUK: ['FATE ROLLS {va}. DESTINY SMILES ON {A}!']
close (margin < 0.05):  '…IT\'S NEARLY A DRAW, BUT {A} HOLDS!'
crush (margin > 0.9):   '{B} WAS NEVER IN THIS FIGHT.'
draw:                   'THE CLASH SHAKES THE HEAVENS… A DRAW!'
```
Template choice uses a seeded RNG, so the same battle always narrates identically.

### 9. `/api/img` proxy (stretch)
Only allows hosts in `IMG_ALLOW` (otherwise 400, so it can't be used as an **open proxy / SSRF**). Streams the image with `Cache-Control: max-age=86400` and `Access-Control-Allow-Origin: *`, plus a disk cache. This lets `html2canvas` export cards.

---

## Endpoints (shapes in API_CONTRACT.md)
| Method | Path | Purpose | Cold Jikan calls |
|---|---|---|---|
| GET | `/api/health` | status, cache stats, queue length, snapshot mode | 0 |
| GET | `/api/countries` | spin pool for globe/picker | 0 |
| GET | `/api/reincarnate?cca3=CHE&reroll=0` | full sheet + fighter card (random country if `cca3` is missing) | ≤ 2 |
| GET | `/api/battle?a=CHE&b=IND&ra=0&rb=0` | both cards + all stat matchups + narration + AI order | ≤ 4 (usually cached) |
| GET | `/api/img?url=` | image proxy | 0 |

**Validation:** `cca3` in `byCca3` (else 404), `reroll` integer 0–999, `a ≠ b` (else 400).
**Errors:** one handler → `{ error: { status, code, message } }`.
**Header:** `X-Cache: HIT | MISS | SNAPSHOT` everywhere.

---

## Snapshot / offline mode
`npm run snapshot`:
1. Countries (A + B merged) → `snapshots/countries.json`
2. Six class pools → `snapshots/pool-<classId>.json`
3. Characters for every pool anime (about 150 calls, about 1 min at 2.8 rps) → `snapshots/chars-<id>.json`

That means **every** country works offline. At runtime, `SNAPSHOT_MODE=1` **or** an upstream failure after retries → serve the snapshot with `X-Cache: SNAPSHOT`.

---

## package.json
```json
{
  "name": "isekai-reincarnation",
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

---

## Build order
1. `config`, `cache`, `errors`, `index.js` + `/api/health`
2. `restCountries` + `/api/countries`
3. `stats` + `classes` (pure; log CHE, RUS, IND, JAM to sanity-check classes)
4. `jikan` + `destiny` + `/api/reincarnate` ← **first priority**
5. `narration` + `battle` + `/api/battle`
6. Snapshot script + fallback
7. `/api/img` (stretch)

## Test checklist
- [ ] `/api/countries` ≈ 193 entries with `latlng` + `ccn3`
- [ ] Classes look sensible: CHE → Archmage · RUS → Paladin/Rogue · IND → Berserker · island micro-state → Hermit
- [ ] Same `cca3` + `reroll` → identical JSON; `reroll` changes only LUK/anime/form
- [ ] Repeat call → `X-Cache: HIT`, < 20 ms
- [ ] 10 parallel `/reincarnate` → no 429 reaches the client
- [ ] `/api/battle?a=IND&b=CHE` → HP narration contains "1.4 BILLION"; `a=b` → 400
- [ ] `/api/img?url=https://evil.com/x.png` → 400
- [ ] Wi-Fi off + `SNAPSHOT_MODE=1` → summon, reroll and battle all work
