# API Contract: Frontend ⇄ Backend

Base: same origin, `/api`. JSON only. Every response has the header `X-Cache: HIT | MISS | SNAPSHOT`.

## Error shape (all endpoints)
```json
{ "error": { "status": 503, "code": "UPSTREAM_UNAVAILABLE", "message": "Jikan is not responding." } }
```
Codes: `BAD_REQUEST` 400 · `NOT_FOUND` 404 · `RATE_LIMITED` 429 · `UPSTREAM_UNAVAILABLE` 503 · `INTERNAL` 500

---

## GET `/api/health`
```json
{ "ok": true, "uptime": 312.4, "snapshotMode": false,
  "cache": { "entries": 42, "hits": 120, "misses": 18 }, "jikanQueue": { "pending": 0 } }
```

## GET `/api/countries`
The spin pool (UN members with population > 0).
```json
{ "count": 193,
  "countries": [ { "cca3": "CHE", "ccn3": "756", "name": "Switzerland", "flag": "https://flagcdn.com/ch.svg", "latlng": [47, 8] } ] }
```

## GET `/api/reincarnate?cca3=CHE&reroll=0`
`cca3` is optional (missing means random from the pool). `reroll` is 0–999 (default 0).
```json
{
  "country": {
    "cca3": "CHE", "ccn3": "756", "name": "Switzerland", "capital": "Bern",
    "region": "Europe", "subregion": "Western Europe",
    "flag": "https://flagcdn.com/ch.svg", "crest": "https://mainfacts.com/media/images/coats_of_arms/ch.svg",
    "latlng": [47, 8], "landlocked": true,
    "gold": { "code": "CHF", "name": "Swiss franc", "symbol": "Fr." },
    "languages": ["French", "Swiss German", "Italian", "Romansh"]
  },
  "reroll": 0,
  "stats": { "HP": 52, "DEF": 31, "MP": 98, "SPD": 12, "CHA": 71, "LUK": 77 },
  "raw":   { "HP": 8654622, "DEF": 41284, "MP": 4, "SPD": 1, "CHA": 5, "LUK": 77 },
  "explain": {
    "HP":  "Population 8.7M, beats 52% of countries",
    "DEF": "Area 41,284 km², beats 31% of countries",
    "MP":  "4 official languages, beats 98% of countries",
    "SPD": "1 timezone, beats 12% of countries",
    "CHA": "5 bordering countries, beats 71% of countries",
    "LUK": "Fate rolled 77"
  },
  "power": 341,
  "rarity": "SR",
  "class": { "id": "archmage", "name": "Archmage", "icon": "🔮", "flavor": "Many tongues, many spells.", "statKey": "MP" },
  "title": "The Archmage of Switzerland, the Beloved",
  "traits": [
    { "id": "earthbound", "name": "Earthbound", "icon": "⛰️", "desc": "Landlocked: DEF ×1.1 in battle" },
    { "id": "polyglot",   "name": "Polyglot",   "icon": "📚", "desc": "3+ languages: MP +1 in battle" }
  ],
  "destiny": {
    "anime": {
      "id": 52991, "title": "Sousou no Frieren", "titleEn": "Frieren: Beyond Journey's End",
      "image": "https://cdn.myanimelist.net/images/anime/1015/138006l.jpg",
      "score": 9.3, "episodes": 28, "year": 2023,
      "genres": ["Adventure", "Drama", "Fantasy"],
      "synopsis": "During their decade-long quest…",
      "url": "https://myanimelist.net/anime/52991"
    },
    "form": {
      "id": 184947, "name": "Frieren", "role": "Main",
      "image": "https://cdn.myanimelist.net/images/characters/7/525105.jpg"
    }
  },
  "party": [
    { "cca3": "DEU", "name": "Germany", "flag": "https://flagcdn.com/de.svg", "class": { "id": "berserker", "icon": "⚔️", "name": "Berserker" }, "power": 360, "rarity": "SR" }
  ]
}
```
Notes:
- `destiny.form` can be `null`; the frontend then uses `destiny.anime.image` as the portrait.
- If Jikan fails and there's no snapshot, `destiny` is `null` and `destinyError` is `"UPSTREAM_UNAVAILABLE"`. The sheet still renders.
- The example values are illustrative; the real numbers come from the live APIs.

## GET `/api/battle?a=CHE&b=IND&ra=0&rb=0`
`ra`/`rb` are the reroll indexes (they affect LUK + form). `a ≠ b`.
```json
{
  "a": { "cca3": "CHE", "name": "Switzerland", "flag": "…", "portrait": "…", "formName": "Frieren",
         "class": { "id": "archmage", "icon": "🔮", "name": "Archmage" }, "rarity": "SR",
         "stats": { "HP": 52, "DEF": 31, "MP": 98, "SPD": 12, "CHA": 71, "LUK": 77 },
         "raw":   { "HP": 8654622, "DEF": 41284, "MP": 4, "SPD": 1, "CHA": 5, "LUK": 77 },
         "display": { "HP": "8.7M", "DEF": "41.3K km²", "MP": "4", "SPD": "1", "CHA": "5", "LUK": "77" } },
  "b": { "…same shape…": "" },
  "matchups": {
    "HP":  { "a": 8654622, "b": 1428627663, "winner": "b", "margin": 0.99,
             "line": "ULTIMATE MOVE: 1.4 BILLION PEOPLE!", "subline": "SWITZERLAND WAS NEVER IN THIS FIGHT." },
    "MP":  { "a": 5, "b": 2, "winner": "a", "margin": 0.6,
             "line": "FORBIDDEN CHANT IN 5 TONGUES!", "subline": null },
    "DEF": { "…": "" }, "SPD": { "…": "" }, "CHA": { "…": "" }, "LUK": { "…": "" }
  },
  "aiOrder": { "a": ["MP", "CHA", "LUK", "HP", "DEF", "SPD"], "b": ["HP", "DEF", "CHA", "SPD", "LUK", "MP"] },
  "rules": { "roundsToWin": 3, "noRepeatStats": true, "winnerPicksNext": true }
}
```
- `matchups[stat].a/b` are **effective** raw values (with trait modifiers applied), which is why Switzerland's MP shows as 5 (4 + Polyglot).
- `winner` ∈ `"a" | "b" | "draw"`.
- The frontend runs the round loop; the server owns every outcome and line.

## GET `/api/img?url=<encoded>` (stretch)
Returns the image bytes with the upstream `Content-Type`, `Cache-Control: public, max-age=86400` and `Access-Control-Allow-Origin: *`.
A host outside the allow-list → `400 BAD_REQUEST`.
