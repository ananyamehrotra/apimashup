# ⚔️ SOULBOUND: Spin the Globe, Be Reborn in a Lost Land

> **"The globe turns. A land calls to you. Choose who you were… and face what waits there."**

1. **Spin the globe** and it lands on a location from a Souls-like world. Each location has its own story, bosses, NPCs and playable characters.
2. **Choose a character** from that location's roster (e.g. a Vagabond in Limgrave, a Hunter in Yharnam).
3. **Read the lore, meet the NPCs, face the bosses** of that land.

---

## Scope of this phase
**Three locations first.** The globe, the full character roster and the combat tuning come after the content exists.

| # | Location | Game | Tone | Data source |
|---|---|---|---|---|
| 1 | **Limgrave** | Elden Ring | Open fields, golden Erdtree, ruined castles | Elden Ring Fan API (`eldenring.fanapis.com`) + hand-written story/characters |
| 2 | **Yharnam** | Bloodborne | Gothic plague city, beasts, cosmic dread | Hand-written local JSON (no public API found) |
| 3 | **Lothric** | Dark Souls 3 | Dying kingdom, linking the flame, ash | Hand-written local JSON (only a 2017 build-planner API exists, offline when tested) |

Not in this phase: the globe spin, final character art, combat balance, sound, share card.

---

## What every location contains
```
Location
├── id, name, game, tagline, coordinates (placeholder until the globe phase)
├── story        : 3 short paragraphs (the land's history, the current threat, your reason to be here)
├── characters[] : 4 playable archetypes (name, backstory, starting stats, signature trait)
├── bosses[]     : 4 bosses in encounter order (name, title, lore, stats, signature move, optional API id)
└── npcs[]       : 3–5 NPCs (name, role, location inside the land, one quote or hint)
```
The same shape is used for all three games, so the frontend never branches on game.

---

## Starter content (hand-written, to be reviewed for lore accuracy)

### Limgrave (Elden Ring)
- **Story:** the Tarnished return to the Lands Between, guided by grace; the shattered Elden Ring has made demigods of the Shardbearers, and Godrick holds Stormveil.
- **Characters:** Vagabond, Samurai, Astrologer, Prophet.
- **Bosses:** Tree Sentinel, Margit the Fell Omen, Flying Dragon Agheel, Godrick the Grafted. API supplies Godrick, Agheel and Darriwil; Margit and the Tree Sentinel are checked at build time and hand-written if absent.
- **NPCs:** Melina, Merchant Kalé (API), Roderika, Varré.

### Yharnam (Bloodborne)
- **Story:** a blood-healing city sliding into a night of beasts; a hunter wakes in the clinic with a contract and no memory.
- **Characters:** Hunter archetypes: Lone Survivor, Military Veteran, Noble Lineage, Waif.
- **Bosses:** Cleric Beast, Father Gascoigne, Blood-Starved Beast, Vicar Amelia.
- **NPCs:** Gehrman, The Doll, Eileen the Crow, Iosefka.

### Lothric (Dark Souls 3)
- **Story:** the First Flame fades; the Lords of Cinder have abandoned their thrones and an Unkindled must link the flame or let it die.
- **Characters:** Knight, Herald, Sorcerer, Pyromancer.
- **Bosses:** Iudex Gundyr, Vordt of the Boreal Valley, Dancer of the Boreal Valley, Dragonslayer Armour.
- **NPCs:** The Fire Keeper, Andre of Astora, Ludleth of Courland, Yuria of Londor.

---

## Architecture
```
 Browser (public/)                    Node/Express (server/)                   External
┌───────────────────────┐  /api/*  ┌────────────────────────────────┐
│ Landing + location    │────────▶│ routes → services               │──▶ eldenring.fanapis.com/api
│ picker (globe later)  │         │  • Location service (merges)    │
│ Character select      │◀────────│  • Cache (memory + disk)        │
│ Lore/boss/NPC views   │  JSON    │  • Snapshot fallback            │
└───────────────────────┘         │  • data/locations/*.json (local)│
                                   └────────────────────────────────┘
```
Elden Ring lore is merged from the API at boot into the Limgrave record; Yharnam and Lothric come from local JSON only. The API is cached 24h and falls back to a bundled snapshot, so the app works offline.

---

## Milestones
| Step | What |
|---|---|
| 1 | Data schema + JSON for the 3 locations (this doc set) |
| 2 | Express server: `/api/locations`, `/api/locations/:id` |
| 3 | Character select + location lore pages (frontend) |
| 4 | Globe spin that lands on one of the 3 locations |
| 5 | Boss encounters (open question below) |
| 6 | More locations, polish, sound |

## Open questions
- **Boss encounters:** the earlier plan had a Top Trumps card duel with narration. Should that carry over as the boss fight (player card vs boss card, stat per round), or become something else?
- **Globe coordinates:** real-world places that echo each land (e.g. Alpine, Gothic Prague, medieval Spain), or a fictional globe?
- **Boss stats:** the API often returns `healthPoints: "???"`, so combat stats are hand-written for every boss.
- **Elden Ring API terms and uptime:** it is a community API; the snapshot fallback covers downtime.

## Run (once step 2 exists)
```bash
npm install
npm run dev            # http://localhost:3000
npm run snapshot       # cache the Elden Ring API data
SNAPSHOT_MODE=1 npm start
```
