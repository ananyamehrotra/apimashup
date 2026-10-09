# Frontend Plan: Vanilla JS + globe.gl + GSAP

**Goal:** a dark-fantasy anime game feel. Make the first spin impressive, make the character reveal feel like a gacha pull, and make the battle feel like a shonen fight. No build step: plain `<script>` files, libraries from a CDN, with offline copies in `public/vendor/`.

---

## Folder structure
```
public/
├── index.html
├── css/
│   ├── tokens.css         # colours, fonts, radii, shadows, rarity colours
│   ├── base.css           # reset, body, background (stars + rune circle), typography
│   ├── layout.css         # app shell, nav, views, responsive grid
│   ├── sheet.css          # character sheet, radar, stat bars, traits, party
│   ├── card.css           # fighter card (holographic), rarity frames
│   └── battle.css         # arena, versus screen, narration banner, effects
├── js/
│   ├── api.js             # fetch wrapper → /api/*, error normalisation, AbortController
│   ├── state.js           # tiny store + subscribe()
│   ├── router.js          # #c=CHE&r=0 · #battle=CHE-IND
│   ├── globe.js           # globe.gl: polygons, spin-and-land, highlight
│   ├── summon.js          # summon flow: button → spin → flash → reveal
│   ├── sheet.js           # character sheet render (radar, bars, crest, traits, destiny, party)
│   ├── radar.js           # SVG hexagon radar chart, animated
│   ├── card.js            # fighter card component (used on sheet + in battle)
│   ├── battle.js          # Top Trumps flow: pick stat → reveal → narrate → score
│   ├── fx.js              # screen shake, flash, particles, confetti, number count-up
│   ├── share.js           # (stretch) html2canvas → PNG
│   ├── ui.js              # toasts, skeletons, debounce, formatting
│   └── main.js            # boot, wiring
├── vendor/                # globe.gl, gsap, topojson-client, html2canvas (offline copies)
└── assets/
    ├── countries-110m.json    # world-atlas TopoJSON (ids = ccn3)
    └── sfx/ (stretch)         # whoosh.mp3, chime.mp3, hit.mp3
```

## Libraries
| Library | Use | Source |
|---|---|---|
| globe.gl | spinning 3D globe + country polygons | `cdn.jsdelivr.net/npm/globe.gl` |
| topojson-client | TopoJSON → GeoJSON | `cdn.jsdelivr.net/npm/topojson-client@3` |
| world-atlas | `countries-110m.json` | `cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json` |
| GSAP | every animation (timeline-based) | `cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js` |
| html2canvas (stretch) | share PNG | `cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js` |
| Google Fonts | **Cinzel** (fantasy headings), **Space Grotesk** (UI), **Bangers** (battle shouts), **Noto Sans JP** (異世界) | `fonts.googleapis.com` |

---

## Design system (`tokens.css`)
**Mood:** a summoning chamber at midnight. Deep indigo, arcane violet, gold trim, and neon gacha rarity glows.
```css
:root {
  --bg: #07061a;  --bg-2: #120f33;
  --glass: rgba(255,255,255,.06);  --glass-brd: rgba(255,255,255,.14);  --blur: 16px;
  --text: #f3f0ff;  --text-dim: #9a93c9;
  --arcane: #8b5cf6;   /* violet: rune circle, primary */
  --mana:   #22d3ee;   /* cyan: MP, highlights */
  --gold:   #fbbf24;   /* trim, titles, gold stat */
  --blood:  #f43f5e;   /* damage, HP, losing */
  --win:    #34d399;
  /* stat colours */
  --hp:#f43f5e; --def:#60a5fa; --mp:#a78bfa; --spd:#34d399; --cha:#f472b6; --luk:#fbbf24;
  /* rarity frames */
  --ssr: conic-gradient(from var(--a), #ff0080, #ffd700, #00ffd5, #8b5cf6, #ff0080);
  --sr:  linear-gradient(135deg, #fbbf24, #f59e0b);
  --r:   linear-gradient(135deg, #a78bfa, #6366f1);
  --n:   linear-gradient(135deg, #64748b, #334155);
  --font-fantasy:'Cinzel',serif; --font-ui:'Space Grotesk',system-ui,sans-serif;
  --font-shout:'Bangers',cursive; --font-jp:'Noto Sans JP',sans-serif;
  --r-sm:8px; --r-md:14px; --r-lg:22px; --ease:cubic-bezier(.22,1,.36,1);
}
```
- Background: radial indigo gradient + two drifting star layers + a slowly rotating **SVG rune circle** (concentric rings with glyph text on a `textPath`) behind the globe.
- Glass panels with gold 1px top edges and corner ornaments (CSS `::before` / `::after`).
- SSR cards: an animated conic border (`@property --a` rotates) plus a foil shimmer that follows the pointer.

---

## Views

### 0. Boot intro (≈1.5s)
**異世界** fades in, then "ISEKAI" letter-spaces in (Cinzel), then the subtitle *"Reincarnation Generator"*. The rune circle draws itself (SVG `stroke-dashoffset`), the globe fades in. Meanwhile `GET /api/countries` runs.

### 1. Summon view
```
┌───────────────────────────────────────────────────────────┐
│ 異世界 ISEKAI                     [Summon] [Battle]        │
│                                                           │
│              ◌ rotating rune circle ◌                     │
│                   🌍 3D globe                              │
│                                                           │
│        "You have died. Fate will choose your world."      │
│                 [ ✦ REINCARNATE ✦ ]                       │
│        or pick a country ▾   (searchable, with flags)      │
└───────────────────────────────────────────────────────────┘
```
**Summon sequence (`summon.js`, one GSAP timeline):**
1. Fire `GET /api/reincarnate` **at the same time** as the animation starts, so the network time is hidden behind the spin.
2. The globe spins fast (`controls.autoRotateSpeed` 0 → 35), the rune circle speeds up and glows.
3. Once the response arrives **and** at least 2.2s have passed, the spin slows down and `pointOfView` flies to the country's `latlng` (1.2s).
4. The country polygon rises and glows in the class colour, with a pulsing ring.
5. White flash (`fx.flash()`), then the sheet slides in. The rarity is announced in a big gacha banner: **"✦ SSR ✦"** with a confetti burst for SSR/SR.

### 2. Character sheet view
```
┌───────────────┬──────────────────────────────┬──────────────────┐
│  [PORTRAIT]   │ The Archmage of Switzerland  │   🏰 CREST       │
│  anime char   │ the Swift          ✦ SR ✦    │   💰 Swiss franc │
│  rarity frame │ 🔮 ARCHMAGE "Many tongues…"  │   Fr.            │
│  "Reborn as   │                              │   Traits:        │
│   Frieren"    │    ⬡ RADAR (6 stats)         │   ⛰️ Earthbound  │
│               │  HP ▓▓▓▓░░ 52                │   📚 Polyglot    │
│  🇨🇭 flag      │  DEF ▓▓░░░ 31 ...            │                  │
├───────────────┴──────────────────────────────┴──────────────────┤
│ 📖 ORIGIN STORY: [poster] Sousou no Frieren ★9.3 · synopsis…   │
├────────────────────────────────────────────────────────────────┤
│ 🤝 PARTY: [🇩🇪 Paladin][🇫🇷 Bard][🇮🇹 Archmage][🇦🇹 Hermit]       │
├────────────────────────────────────────────────────────────────┤
│ [🎲 Reroll destiny] [🌀 New life] [⚔️ Battle!] [⬇ Share card]  │
└────────────────────────────────────────────────────────────────┘
```
- **Portrait:** character image in the rarity frame, with a slow parallax tilt on pointer move.
- **Radar (`radar.js`):** an SVG hexagon with 6 axes. The polygon animates from the centre out (GSAP tween of point radii). Each axis is coloured with its stat colour.
- **Stat bars:** count-up numbers. **Hover/tap tooltip** shows the real data: *"❤️ HP 52: population 8.7M, beats 52% of countries"*. This makes the logic clear to judges.
- **Destiny card:** poster, title, score, episodes, a 3-line synopsis with "read more", and a MAL link.
- **Party:** mini-cards that stagger in. Clicking one runs a quick re-summon (short spin) as that country.
- **Actions:**
  - *Reroll destiny*: same country, flip animation on the portrait and destiny card.
  - *New life*: back to summon.
  - *Battle!*: opens the arena with you as player A.
  - *Share card* (stretch).

### 3. Battle arena (Top Trumps)
**Opponent select:** three big options: **🌀 Summon a challenger** (spin; the judge presses it), **🤝 Fight an ally** (from your party), **🎲 Random rival**. Then `GET /api/battle?a=&b=` returns both cards and **all matchups** in one response.

**VS screen (1.2s):** the two cards slam in from the left and right, a lightning **VS** splits the screen (Bangers font), with screen shake.

**Round loop (`battle.js`):**
```
┌──────────────┐        ROUND 2  •  YOU 1 – 0 RIVAL       ┌──────────────┐
│  YOUR CARD   │                                          │ RIVAL CARD   │
│  portrait    │   "Choose your move!"                    │  (face down  │
│  ❤️ HP   [■] │   ← stat rows on your card are buttons   │   until the  │
│  🛡️ DEF  [■] │                                          │   reveal)    │
│  ✨ MP   [■] │                                          │              │
└──────────────┘                                          └──────────────┘
```
1. **Picker:** if it's your turn, the stat rows on your card glow and become clickable (keys 1–6 work too). On the rival's turn, the AI picks from `aiOrder` after a 700ms "thinking…" pause.
2. **Reveal:** the rival card flips face up (3D rotateY). Both chosen stat rows enlarge, and their raw values count up side by side.
3. **Narration:** a full-width banner slams in (Bangers, gold-to-red gradient text, black outline) with the server's line, e.g. **"ULTIMATE MOVE: 1.4 BILLION PEOPLE!"**. The winning card glows with an aura; the losing card shakes and flashes red, and a damage number floats up.
4. Score pips update. Used stats grey out on both cards. The round winner picks next.
5. **First to 3 → Victory screen:** the winner card is centred and enlarged with a crown, confetti and *"{Country} WINS THE ISEKAI WAR!"*. Buttons: **Rematch** (same cards, fresh picks), **New challenger**, **Back to sheet**.

**Accessibility in battle:** narration is also in an `aria-live="assertive"` region; `prefers-reduced-motion` turns off screen shake and flashes.

### 4. Share card (stretch)
`html2canvas` on the fighter card element (all images via `/api/img?url=`), then a download named `isekai-<country>.png`.

---

## State & routing
```js
// state.js
{ view: 'summon' | 'sheet' | 'battle',
  countries: [], sheet: null, reroll: 0,
  battle: { data: null, round: 1, score: {a:0,b:0}, used: [], picker: 'a', log: [] },
  muted: true }
```
Hash routes, which also give the demo bookmarks:
- `#c=CHE` → sheet for Switzerland · `#c=CHE&r=2` → reroll 2
- `#battle=CHE-IND` → arena directly

---

## UX states
| State | Treatment |
|---|---|
| Summoning (waiting on API) | The spin itself is the loader. If it's slower than 6s, show the caption *"The gods are deliberating…"* |
| Sheet images loading | Shimmer skeleton inside the frames |
| Jikan failed but country OK | Sheet still renders. The destiny shows *"Your fate is clouded…"* with a **Retry** button |
| API error | Glass toast with a red edge and Retry |
| Offline snapshot | Nav badge `● OFFLINE MODE` |
| Battle draw round | *"THE CLASH SHAKES THE HEAVENS… A DRAW!"*, same picker goes again |

**Polish checklist:** visible focus rings (`--mana` glow), every control works by keyboard, images have `alt` text and `loading="lazy"`, numbers formatted with `Intl.NumberFormat(…, {notation:'compact'})`. **Mobile (< 768px):** single column, with the globe at the top 40vh. In battle the cards stack vertically and stat buttons span full width. No horizontal scroll at 375px.

---

## Build order
1. Shell + tokens + background + fonts
2. `api.js` + globe renders polygons + spin-and-land on a hard-coded country
3. Summon flow wired to `/api/reincarnate` ← **first wow moment by minute ~25**
4. Sheet: portrait, title, radar, stat bars + tooltips, crest/gold/traits, destiny, party
5. Reroll, ally click, deep links
6. **Battle arena**: VS screen, pick, reveal, narration, score, victory
7. Polish: rarity banner, flash/shake/confetti, mobile, error states
8. Stretch: share PNG → SFX

## Test checklist
- [ ] Spin → lands on the correct country → sheet matches the API response
- [ ] Hover stat → tooltip shows the real value + percentile
- [ ] Reroll → same stats, new LUK/anime/form
- [ ] Click ally → re-summon as that country
- [ ] Battle: pick HP as India → "1.4 BILLION" narration; first to 3 → victory screen; rematch works
- [ ] Keyboard-only full flow (Tab, Enter, 1–6 in battle)
- [ ] 375px width: no horizontal scroll, battle playable
- [ ] Wi-Fi off + snapshot mode: summon, sheet and battle all work
