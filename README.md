# Isekai Reincarnation Generator

Spin a 3D globe, land on a random country, and get reborn as an RPG character built from that country's real data. A random anime becomes your origin story.

## How it works

1. The app loads every country once from [REST Countries](https://restcountries.com) and caches it for a day.
2. **Spin the Globe** picks a random country; the globe whirls, slows, and zooms in on it.
3. An isekai intro plays (truck-kun, "You died", a summoning circle) and the portal opens onto the country's world.
4. [Jikan](https://jikan.moe) supplies an anime whose genre suits that world. One of its main characters becomes your past-life form, and its villain follows you over.
5. The character sheet opens: the hero banner, a playable pixel-art hero coloured from the flag, the status window, and the origin story.
6. **Begin your story** starts story mode, in an arena that stays on screen throughout: your pixel hero walks forward as a narrator reads the tale aloud, two choices change your stats, and it ends in a turn-based boss fight against the villain.
7. **Reroll Destiny** does it again. **Download PNG** saves the sheet, and **Copy share link** gives a link like `?c=JPN&a=1535&f=71` that reopens the same roll.

## Worlds

Each country is reborn into one of eight worlds, chosen from its geography (see `worldKeyFor` in [src/lib/statGenerator.js](src/lib/statGenerator.js)). The backdrops live in `worlds/` and each world lists the anime genres that suit it in [src/lib/worlds.js](src/lib/worlds.js).

| World | Countries | Anime genres |
| ----- | --------- | ------------ |
| The Starlit Shrine | Eastern Asia | Samurai, Historical, Supernatural |
| The Walled Kingdom | Landlocked countries | Military, Survival, Suspense |
| The Sky Archipelago | Island nations, Oceania | Adventure, Fantasy |
| The Starfall Fields | Northern Europe, Antarctic | Sci-Fi, Space, Mystery |
| The Azure Realm | Rest of Europe | Fantasy, Isekai |
| The Blossom Court | Southern and South-Eastern Asia | Romance, Martial Arts, Drama |
| The Wild Meadow | The Americas | Comedy, Super Power, Kids |
| The Golden Frontier | Africa, Western and Central Asia | Action, Adventure, Mythology |

## When Jikan is down

Jikan is a free, volunteer-run service and has outages. If it does not answer within 6 seconds (or keeps rate-limiting), the app uses the built-in archive in [src/data/animeSnapshot.json](src/data/animeSnapshot.json): 48 well-known anime with their main characters and villains. The switch is silent, and the app goes back to Jikan on its own a minute later. Requests to Jikan are spaced 1.1 seconds apart, a 429 is retried once, and adult titles are filtered out twice (Jikan's `sfw` flag, then a check on rating and genres).

## The boss fight

Your HP and armour come from the country's population and area; the villain's strength comes from the anime's score. The villain's third move is always a telegraphed heavy attack, so guarding at the right time matters. The rules are in [src/lib/story.js](src/lib/story.js).

## Character sheet rules

| Stat    | Comes from                                                                 |
| ------- | -------------------------------------------------------------------------- |
| HP      | Population, on a log scale from 1 to 999                                   |
| Defense | Area, on a log scale from 1 to 999                                         |
| Gold    | 250 per currency, plus 5 × the letter positions of its code (an invented rule) |
| Skills  | Languages spoken                                                           |
| Allies  | Bordering countries; island nations are "Lone wanderer, no allies"         |
| Class   | Region: Europe → Knight, Asia → Monk, Africa → Shaman, Americas → Ranger, Oceania → Navigator, Antarctic → Frost Mage |
| Rarity  | Population: under 100k Legendary, under 1M Epic, under 10M Rare, under 50M Uncommon, otherwise Common |

All of this lives in [src/lib/statGenerator.js](src/lib/statGenerator.js).

## Run it locally

Requires Node.js 18 or higher.

```bash
npm install
cp .env.example .env   # then put your REST Countries key in .env
npm run dev
```

Open http://localhost:5173. Run the unit tests with `npm test`.

Production-style, one process serving the built app and the API:

```bash
npm run build
npm start              # http://localhost:3001 (PORT in .env)
```

## Backend

`server/` is an Express app (`server/app.js`) that `npm run dev` mounts inside Vite and `npm start` runs on its own, so both use the same code:

| Route | What it does |
| ----- | ------------ |
| `GET /api/countries` | Every country from REST Countries v5 (3 paginated requests), cached in memory and on disk for 7 days so the free 1000-requests/month tier lasts; retries with backoff; falls back to `server/data/snapshots/countries.json` if REST Countries is down |
| `GET /api/flag?code=jp` | Flag SVG proxy (the flag CDN sends no CORS header), cached on disk |
| `GET /api/jikan/*` | Jikan proxy for the five endpoints `src/lib/jikan.js` uses. One server-side queue keeps all visitors under Jikan's limits (≥350 ms apart, ≤58/min), answers are cached 6 h and saved for offline use. If Jikan is down it answers 503 at once for a minute, and the frontend switches to its archive |
| `GET /api/health` | Key set?, Jikan reachable?, cache stats |

Every API response carries `X-Cache: HIT | MISS | STALE | SNAPSHOT`.

Offline demo: run `npm run snapshot` once while online (saves countries, all flags and Jikan's anime pages for every world genre), then `SNAPSHOT_MODE=1 npm start` never touches the network.

## Deploy on Vercel

1. Push the repository to GitHub and import it in Vercel (it detects Vite automatically).
2. In the project's **Settings → Environment Variables**, add `COUNTRY_API` with your REST Countries key.
3. Deploy.

The key stays on the server: the browser calls `/api/countries`, `/api/flag` and `/api/jikan/*`, which are small Vercel functions in [api/](api/) that reuse the services in [server/](server/). During `npm run dev`, the Express app in `server/app.js` serves the same routes through a plugin in [vite.config.js](vite.config.js).

## Project layout

```
api/                  Vercel functions (countries list, flag proxy, Jikan proxy)
server/               Express backend: app.js (routes), index.js (npm start), services/ (REST Countries, Jikan queue, cache, snapshots), data/snapshots/ (offline copies)
src/
  components/         GlobeView, IntroSequence, StoryMode, HeroBanner, HeroStage, CharacterSheet, OriginStory
  lib/                countries, jikan, worlds, story, spriteForge, statGenerator, sound, music
  data/               animeSnapshot.json (offline anime archive)
  App.jsx             Screen flow: landing → spinning → intro → sheet
public/textures/      Globe textures (from three-globe)
worlds/               World backdrop images
songs/                Background music (.mp3)
```

## Built with

React, Vite, Tailwind CSS, react-globe.gl, Motion, and html-to-image. Sound effects are synthesised in the browser with the Web Audio API.

## Narration

Story lines are read aloud with the browser's built-in speech synthesis (no audio files or API), with a deeper voice for the villain. The music turns down while a line is spoken and the story advances when the line ends. Voices differ between browsers and devices; where none is available the story is click-through. The speaker button mutes narration, music and effects together.

## Background music

Any `.mp3` placed in the `songs/` folder is shuffled as background music, starting on the first spin. Only add music and world images you have the right to publish before deploying the site publicly.

## Credits

Country data from REST Countries. Anime data from Jikan, the unofficial MyAnimeList API. Globe textures from three-globe.
