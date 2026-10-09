# Frontend Plan: Vanilla JS (+ globe.gl later)

**Goal:** a dark, ashen Souls feel. This phase covers the **three locations**: pick a location, read its story, choose a character, browse bosses and NPCs. The globe spin comes next and plugs into the same picker. No build step: plain `<script>` files.

---

## Folder structure
```
public/
├── index.html
├── css/
│   ├── tokens.css      # colours, fonts, rarity colours, per-location themes
│   ├── base.css        # reset, buttons, embers, toasts
│   ├── views.css       # picker, location, character select, weapon chips, bonfire
│   └── battle.css      # arena, HP/break bars, fighters, effects, timing ring
├── js/
│   ├── ui.js           # el() builder, sleep, toast, skeleton, embers
│   ├── api.js          # fetch wrapper → /api/*, offline badge
│   ├── state.js        # App: locations, weapons, current run
│   ├── router.js       # hash routes → App.views
│   ├── picker.js       # location picker (globe replaces this later)
│   ├── location.js     # story, bosses, NPCs; loadLocation()
│   ├── characters.js   # character select; weaponChip()
│   ├── combat.js       # pure combat engine + Run (owned/equipped weapons)
│   ├── fx.js           # animations, banners, timing ring
│   ├── battle.js       # bonfire, boss fight UI, ending
│   └── main.js         # boot
└── assets/
```

## Design system
**Mood:** a dim bonfire. Charcoal base, ember orange accent, aged-gold titles. Each location overrides a few tokens:

| Location | Accent | Feel |
|---|---|---|
| Limgrave | gold `#d9a441` | warm, golden light on grey stone |
| Yharnam | blood `#8b1e2d` | cold fog, gaslight |
| Lothric | ember `#e2662a` | ash and embers |

Fonts: a serif for titles (Cinzel), a clean sans for body (Inter). Body text stays high-contrast.

---

## Views

### 1. Location picker
Three large cards (name, game, tagline). Clicking one opens that location. **Later, the globe spin chooses one of these three at random** and runs the same open-location action.

### 2. Location view
```
┌────────────────────────────────────────────────────────────┐
│ ← Back            LIMGRAVE  · Elden Ring                    │
│ "Where the Tarnished first see the Erdtree."                │
├──────────────────────────────┬─────────────────────────────┤
│ STORY (3 paragraphs)         │ BOSSES (encounter order)    │
│                              │  1 Tree Sentinel …          │
│ [ Choose your character ▶ ]  │ NPCS                        │
│                              │  Melina · Merchant Kalé …   │
└──────────────────────────────┴─────────────────────────────┘
```
Boss and NPC items expand to show lore, signature move, drops and a quote or hint. Images come from the API when present, otherwise a themed silhouette placeholder.

### 3. Character select
Four cards per location, with backstory, the five starting stats as bars, and the trait. Selecting one stores `{ location, character }` in state and the URL hash. What happens next (boss encounters) is an open question in PLAN.md.

---

## State & routing
```js
{ view: 'picker' | 'location' | 'characters',
  locations: [], location: null, character: null }
```
Hash routes: `#loc=limgrave` · `#loc=yharnam&char=lone-survivor`.

## UX states
| State | Treatment |
|---|---|
| Loading | Skeleton blocks in the story and lists |
| Missing image | Themed silhouette placeholder |
| Elden Ring API down | Limgrave still loads from snapshot; small "OFFLINE" badge when `X-Cache: SNAPSHOT` |
| API error | Toast with Retry |

**Accessibility:** visible focus rings, keyboard navigation, `prefers-reduced-motion` respected, alt text on images. **Mobile (< 768px):** single column, no horizontal scroll at 375px.

## Build order
1. Shell + tokens + per-location themes
2. `api.js` + picker with 3 cards
3. Location view (story, bosses, NPCs)
4. Character select + hash routing
5. Boss runs: combat engine, fx, bonfire, ending (done)
6. Globe spin (next phase)

## Test checklist
- [ ] Picker shows 3 locations; each opens its own theme and content
- [ ] Each location shows 4 characters, 4 bosses and its NPCs
- [ ] Deep link `#loc=lothric` opens Lothric directly
- [ ] Missing images show placeholders, not broken icons
- [ ] Keyboard-only flow works
- [ ] 375px width: no horizontal scroll
