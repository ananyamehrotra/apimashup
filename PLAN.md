# 🌀 ISEKAI: Reincarnation Generator × Battle Cards

> **"You died. The globe spins. Where, and who, will you be reborn as… and can you win the duel?"**

1. **Reincarnate:** spin the globe and you're reborn in a real country. Its real data (REST Countries) becomes your **RPG character sheet**. Your stats decide your **class**, the class picks your **anime world**, and a main character from it becomes **your form** (Jikan).
2. **Battle Cards:** your sheet becomes a **Top Trumps-style fighter card**. Challenge another country (or a judge's spin). Pick a stat; the higher *real* value wins the round, with dramatic shonen narration:
   *"ULTIMATE MOVE: 1.4 BILLION PEOPLE!"*

The APIs are **chained**, not just sitting side by side:
```
Spin → Country (REST) → Stats (percentile-ranked real data) → Class → Jikan genre IDs
     → Anime world (Jikan genre search) → Main character = your form (Jikan characters)
     → Party = bordering countries (REST borders) → Battle uses raw REST values
```
The same country always gets the same stats and class (deterministic logic).

---

## Plan files
| File | Contents |
|---|---|
| `PLAN.md` | Overview, features, scope, timeline, rubric mapping, demo script, risks |
| `BACKEND_PLAN.md` | Express server, stat engine, class rules, Jikan queue, cache, battle engine, fallbacks |
| `FRONTEND_PLAN.md` | Screens, summon animation, character sheet, fighter cards, battle arena, design system |
| `API_CONTRACT.md` | Exact JSON shapes between frontend and backend |

---

## Features

### 1. 🌍 Summoning (landing)
Dark-fantasy screen with a glowing rune circle around a 3D globe. Press **REINCARNATE**: the globe spins fast, slows down, and lands on a country, which lights up. White flash, then the sheet reveal.

### 2. 📜 Character Sheet
| Stat | Source (REST Countries) | Card value (raw, used in battle) | Sheet value |
|---|---|---|---|
| ❤️ **HP** Vitality | `population` | 1,428,627,663 | percentile 1–99 |
| 🛡️ **DEF** Fortitude | `area` km² | 3,287,263 km² | percentile |
| ✨ **MP** Arcana | number of `languages` | 4 tongues | percentile |
| 💨 **SPD** Agility | number of `timezones` | 12 zones | percentile |
| 🤝 **CHA** Alliance | number of `borders` | 14 neighbours | percentile |
| 🍀 **LUK** Fate | seeded RNG (`cca3` + reroll) | 77 | 1–99 |

Also on the sheet:
- **Gold** = currency name + symbol
- **Crest** = `coatOfArms` (falls back to the flag)
- **Traits** from `landlocked`, island, multilingual and so on
- **Rarity** (SSR/SR/R/N) from total power
- **Title:** *"The Archmage of Switzerland, the Beloved"*

**Class = highest stat → Jikan genres (+ Isekai genre):**
| Highest | Class | Anime-world genres |
|---|---|---|
| HP | ⚔️ Berserker | Action |
| DEF | 🛡️ Paladin | Fantasy + Military |
| MP | 🔮 Archmage | Fantasy + Supernatural |
| SPD | 🗡️ Rogue | Adventure |
| CHA | 🎻 Bard | Comedy + Romance |
| island & small | 🏝️ Hermit | Slice of Life |

### 3. 🎬 Destiny: anime world + form
A well-rated anime (score ≥ 7) in your class's genres. A **Main** character from it is your avatar ("reborn as Frieren"). The synopsis is shown as your *origin story*. **Reroll destiny** keeps the country and redraws LUK, the anime and the form.

### 4. 🤝 Party
Bordering countries appear as ally mini-cards (flag, class, power). Click one to reincarnate as them.

### 5. ⚔️ Battle Cards (Top Trumps duel)
- Your sheet collapses into a **fighter card**: anime character portrait as the "spirit", country flag, class, 6 stats with raw values.
- **Opponent:** spin again (a judge plays), pick a party ally, or a random rival.
- **Rounds (best of 5):** the round's attacker picks a stat. Both raw values are revealed and the higher one wins. The winner of each round picks next (classic Top Trumps). The AI picks its own best percentile stat.
- **Dramatic narration** from templates, e.g.:
  - HP: *"ULTIMATE MOVE: 1.4 BILLION PEOPLE!"*
  - DEF: *"ABSOLUTE TERRITORY: 17 MILLION KM² OF IRON WILL!"*
  - MP: *"FORBIDDEN CHANT IN 4 TONGUES!"*
  - SPD: *"TIME-SKIP ACROSS 12 TIMEZONES!"*
  - CHA: *"SUMMON 14 NEIGHBOURING ALLIES!"*
  - Close call (< 5% gap): *"…IT'S NEARLY A DRAW, BUT ___ HOLDS!"*
- Screen shake, damage numbers, a power-up aura on the winning card, and a VICTORY banner with a confetti burst.

### 6. 🖼️ Share card (stretch)
Download your fighter card as a PNG (images go through the backend proxy so the export works).

---

## Architecture
```
 Browser (public/)                        Node/Express (server/)                External
┌──────────────────────────┐  /api/*  ┌──────────────────────────────┐
│ Summon globe (globe.gl)  │────────▶│ routes → services             │──▶ restcountries.com/v3.1
│ Character sheet + radar  │         │  • Stat engine (percentiles)  │
│ Fighter cards + arena    │◀────────│  • Class rules → genre IDs    │──▶ api.jikan.moe/v4
│ Party, reroll, share     │  JSON    │  • Jikan queue (3 rps)+retry  │
└──────────────────────────┘         │  • Cache (memory + disk)      │
                                      │  • Battle engine + narration  │
                                      │  • Image proxy · snapshots    │
                                      └──────────────────────────────┘
```

---

## Scope
### MUST ship
1. Summon spin → country
2. `/api/reincarnate`: stats, class, traits, anime world, form, party
3. Character sheet UI (portrait, radar chart, stats, crest, gold, traits, origin story)
4. **Battle Cards duel**: pick stat → reveal → narration → best of 5 → winner
5. Reroll, click ally, deep links
6. Backend queue, cache, retries, snapshot fallback

### Stretch (cut from the bottom)
- Sound effects
- Download card PNG (+ image proxy)
- Battle vs. AI opponent picking smartly (the fallback is the AI picking at random)

---

## 90-minute timeline
| Min | Backend | Frontend |
|---|---|---|
| 0–10 | Scaffold, cache, `restCountries` (2 calls merged), `/api/countries` | Shell, tokens, fonts, rune/star background |
| 10–22 | Stat engine + classes + traits | Globe + spin-and-land animation |
| 22–38 | Jikan queue + destiny + `/api/reincarnate` | Character sheet: portrait, radar, stats, crest, origin story |
| 38–50 | Battle engine + narration + `/api/battle` | Party cards, reroll, deep link |
| 50–65 | Snapshot script + fallback, validation | **Battle arena**: cards, stat pick, reveal, narration, best of 5 |
| 65–75 | Image proxy (stretch) | Polish: reveal flash, rarity glow, screen shake, mobile, loading/error states |
| 75–82 | Run snapshot, final test | Share card (stretch), final test |
| 82–90 | Rehearse demo ×2, buffer | |

**Feature freeze at minute 65.**

---

## Rubric mapping
| Criterion | Marks | What earns it |
|---|---|---|
| Tech & API | 25 | 3-hop API chain, percentile stat engine, rate-limited queue + backoff, two-tier cache, server-side battle engine, image proxy, offline snapshots |
| Product & logic | 20 | Deterministic stats from real data, explainable class rules, traits, rarity, Top Trumps rules, narration from real values |
| UI/frontend | 20 | Summon globe, dark-fantasy sheet, animated radar, holographic fighter cards, battle effects |
| UX/usability | 15 | One-button start, reroll, click allies, stat tooltips explaining the source data, deep links, mobile, loading states |
| Presentation | 20 | A judge spins live and duels us, dramatic narration gets a laugh, offline-safe |

---

## Demo script (2 min)
1. **Hook:** *"Every isekai starts the same way: you die and get reborn somewhere new. We built that from real-world data."*
2. **Spin**, landing on Switzerland: *"4 official languages, so MP is its highest stat: **Archmage**. Archmages get Fantasy worlds… reborn as **Frieren**."* Hover a stat to show *"Population 8.7M, beats 52% of countries"*.
3. **Reroll destiny** once: new anime, same stats. *"The stats are real, so only fate changes."*
4. **"Judge, your turn"**: they spin and land on, say, India. **Battle Cards.**
5. They pick HP: *"ULTIMATE MOVE: 1.4 BILLION PEOPLE!"* We pick MP and win the round back. Play to the victory banner.
6. **Close:** *"Three-hop API chain, a rate-limited and cached backend, battles computed server-side, and it all runs offline if the Wi-Fi dies."*

---

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| Jikan limits (3/s, 60/min) or downtime | Queue + backoff + cache + full snapshots |
| REST Countries allows max 10 `fields` | Two calls, merged by `cca3`, cached 24h |
| Genre search comes back empty | Fallback: class genres + Isekai → class genres → Fantasy top |
| Character without image | Skip MAL `questionmark` images; fall back to the anime poster |
| Tiny territories are boring | Spin pool = UN members with population > 0 |
| Battle stat ties | Tie → compare LUK; still tied → "DRAW", round replayed |
| Wi-Fi dies | `SNAPSHOT_MODE=1`, vendored CDN libs, OFFLINE badge |

## Run
```bash
npm install
npm run dev            # http://localhost:3000
npm run snapshot       # pre-cache all class pools + characters
SNAPSHOT_MODE=1 npm start
```
