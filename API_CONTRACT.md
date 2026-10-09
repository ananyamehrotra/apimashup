# API Contract: Frontend ⇄ Backend

Base: same origin, `/api`. JSON only. Every response has the header `X-Cache: HIT | MISS | SNAPSHOT`.

## Error shape (all endpoints)
```json
{ "error": { "status": 404, "code": "NOT_FOUND", "message": "Unknown location 'foo'." } }
```
Codes: `BAD_REQUEST` 400 · `NOT_FOUND` 404 · `UPSTREAM_UNAVAILABLE` 503 · `INTERNAL` 500

---

## GET `/api/health`
```json
{ "ok": true, "uptime": 312.4, "snapshotMode": false,
  "cache": { "entries": 6, "hits": 20, "misses": 4 } }
```

## GET `/api/locations`
Summary list for the globe/picker.
```json
{ "count": 3,
  "locations": [
    { "id": "limgrave", "name": "Limgrave", "game": "Elden Ring",
      "tagline": "Where the Tarnished first see the Erdtree.",
      "coords": { "lat": 0, "lng": 0 },
      "characterCount": 4, "bossCount": 4, "npcCount": 4 }
  ] }
```

## GET `/api/locations/:id`
`id` ∈ `limgrave | yharnam | lothric`.
```json
{
  "id": "limgrave", "name": "Limgrave", "game": "Elden Ring",
  "tagline": "…", "coords": { "lat": 0, "lng": 0 },
  "story": ["…", "…", "…"],
  "characters": [
    { "id": "vagabond", "name": "Vagabond", "backstory": "…",
      "stats": { "HP": 15, "ATK": 14, "DEF": 12, "SPD": 9, "MAG": 9 }, "trait": "…" }
  ],
  "bosses": [
    { "id": "godrick", "name": "Godrick the Grafted", "title": "Shardbearer of Stormveil",
      "lore": "…", "stats": { "HP": 0, "ATK": 0, "DEF": 0, "SPD": 0, "MAG": 0 },
      "move": "…", "image": "https://eldenring.fanapis.com/images/bosses/….png",
      "drops": ["20.000 Runes", "Remembrance of the Grafted"] }
  ],
  "npcs": [
    { "id": "melina", "name": "Melina", "role": "Guide", "where": "…", "quote": "…", "image": null }
  ]
}
```
Notes:
- `image` and `drops` appear only when the Elden Ring API supplied them; they are `null` / `[]` otherwise (always for Yharnam and Lothric until art exists).
- The numeric stats are placeholders; their tuning belongs to the combat phase.
- Stat keys (`HP, ATK, DEF, SPD, MAG`) are provisional.
- Example values are illustrative; the real text lives in `server/data/locations/*.json`.
