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
    { "id": "limgrave", "name": "Limgrave", "game": "Elden Ring", "icon": "🌳",
      "tagline": "Where the Tarnished first see the Erdtree.",
      "coords": { "lat": 0, "lng": 0 },
      "characterCount": 4, "bossCount": 4, "npcCount": 4 }
  ] }
```

## GET `/api/locations/:id`
`id` ∈ `limgrave | yharnam | lothric`.
```json
{
  "id": "limgrave", "name": "Limgrave", "game": "Elden Ring", "icon": "🌳",
  "tagline": "…", "coords": { "lat": 0, "lng": 0 },
  "story": ["…", "…", "…"], "ending": "…",
  "characters": [
    { "id": "vagabond", "name": "Vagabond", "icon": "🛡️", "weapon": "rogiers_rapier", "backstory": "…",
      "stats": { "HP": 16, "ATK": 14, "DEF": 13, "SPD": 9, "MAG": 8 },
      "trait": { "name": "Iron Will", "desc": "+3 DEF", "effect": { "def": 3 } } }
  ],
  "bosses": [
    { "id": "godrick", "name": "Godrick the Grafted", "title": "Shardbearer of Stormveil", "icon": "👑",
      "lore": "…", "stats": { "HP": 480, "ATK": 17, "DEF": 16 },
      "moves": [ { "name": "Axe of Godrick", "power": 1.3, "hits": 1, "telegraph": 950, "weight": 3 } ],
      "drop": "rivers_of_blood", "image": "https://eldenring.fanapis.com/images/bosses/….png",
      "drops": ["20.000 Runes", "Remembrance of the Grafted"] }
  ],
  "npcs": [
    { "id": "melina", "name": "Melina", "role": "Guide", "where": "…", "quote": "…", "image": null }
  ]
}
```
Notes:
- `image` and `drops` appear only when the Elden Ring API supplied them; they are `null` / `[]` otherwise (always for Yharnam and Lothric until art exists).
- `trait.effect` keys: `def`, `crit`, `start_ap`, `flasks`, `break`, `parry_heal`. They are read by `public/js/combat.js`.
- Boss `moves`: `power` multiplies the boss ATK, `hits` is the number of telegraphed strikes, `telegraph` is the ms from ring start to impact, `weight` is the pick chance.
- `drop` is a weapon id from `/api/weapons`.
- Example values are illustrative; the real text lives in `server/data/locations/*.json`.

## GET `/api/weapons`
```json
{ "rarities": { "common": { "name": "Common", "color": "#9ca3af", "crit": 0.05 }, "legendary": { "name": "Legendary", "color": "#fbbf24", "crit": 0.22 } },
  "weapons": [
    { "id": "uchigatana", "name": "Uchigatana", "game": "Elden Ring", "type": "katana", "scaling": "ATK",
      "rarity": "uncommon", "atk": 7, "break": 6, "icon": "🗡️", "desc": "…",
      "skill": { "name": "Unsheathe", "cost": 2, "mult": 2.6, "hits": 1, "break": 14, "effect": "dot" } } ] }
```
`scaling` is `ATK` or `MAG`. `effect` is `null`, `"dot"` or `"heal"`. Five rarities, 22 weapons.
