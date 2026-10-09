// Origin stories from Jikan (unofficial MyAnimeList API, no key needed).
//
// A roll picks an anime whose genre suits the hero's world, then a main
// character from it as the hero's past-life form. If Jikan is down, slow or
// rate-limiting, the built-in archive in src/data answers instead, so a roll
// never ends without an origin story.

import archive from '../data/animeSnapshot.json';

const BASE = '/api/jikan'; // our backend proxy to https://api.jikan.moe/v4 (rate limit, cache, offline copy)
const TIMEOUT_MS = 6000;
const SPACING_MS = 1100; // Jikan allows ~3 requests/second; stay well under
const RETRY_AFTER_429_MS = 1500;
const OFFLINE_COOLDOWN_MS = 60_000;
const PAGES = 3; // 25 per page, most popular first

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let queue = Promise.resolve();
let lastRequestAt = 0;
// Remembered across reloads in this tab, so an outage costs one timeout rather than one per page load.
const OFFLINE_KEY = 'isekai.jikanOfflineUntil';
let offlineUntil = Number(sessionStorage.getItem(OFFLINE_KEY)) || 0;
function setOfflineUntil(time) {
  offlineUntil = time;
  try {
    sessionStorage.setItem(OFFLINE_KEY, String(time));
  } catch {
    // storage blocked: the in-memory value still works
  }
}

// Requests run one at a time, spaced apart.
function get(path) {
  const run = async (retried) => {
    await sleep(Math.max(0, lastRequestAt + SPACING_MS - Date.now()));
    lastRequestAt = Date.now();
    const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status === 429 && !retried) {
      await sleep(RETRY_AFTER_429_MS);
      return run(true);
    }
    if (!res.ok) throw new Error(`Jikan responded ${res.status}`);
    return (await res.json()).data;
  };
  const result = queue.then(() => run(false));
  queue = result.catch(() => {});
  return result;
}

// `sfw` already filters most of this; reject anything that slips through.
const isSafe = (a) =>
  !/^Rx/i.test(a.rating ?? '') &&
  ![...(a.genres ?? []), ...(a.explicit_genres ?? [])].some((g) => /hentai|erotica/i.test(g.name));

const isPresentable = (a) => isSafe(a) && a.synopsis && a.images?.jpg?.image_url;

// MyAnimeList stores names as "Family, Given".
const flipName = (name) => {
  const parts = name.split(', ');
  return parts.length === 2 ? `${parts[1]} ${parts[0]}` : name;
};

const toAnime = (a) => ({
  id: a.mal_id,
  title: a.title_english || a.title,
  poster: a.images?.jpg?.large_image_url ?? a.images?.jpg?.image_url ?? null,
  score: a.score ?? null,
  genres: [...(a.genres ?? []), ...(a.themes ?? [])].map((g) => g.name),
  synopsis: a.synopsis ?? null,
  type: a.type ?? null,
  episodes: a.episodes ?? null,
  year: a.year ?? a.aired?.prop?.from?.year ?? null,
  url: a.url,
});

async function liveAnime(genres, animeId) {
  if (animeId) {
    const anime = await get(`/anime/${animeId}`);
    if (isSafe(anime)) return { anime: toAnime(anime), theme: null };
  }
  const genre = pick(genres);
  const page = 1 + Math.floor(Math.random() * PAGES);
  const list = await get(`/anime?genres=${genre.id}&sfw=true&order_by=members&sort=desc&min_score=7&limit=25&page=${page}`);
  const candidates = list.filter(isPresentable);
  if (candidates.length) return { anime: toAnime(pick(candidates)), theme: genre.name };
  // Nothing usable in that genre page: fall back to a fully random title.
  for (let attempt = 0; attempt < 3; attempt++) {
    const anime = await get('/random/anime?sfw');
    if (isPresentable(anime)) return { anime: toAnime(anime), theme: null };
  }
  throw new Error('No suitable anime found');
}

const portraitOf = (character) => {
  const image = character.images?.jpg?.image_url ?? null;
  return image && !image.includes('questionmark') ? image : null;
};

// Jikan does not say who the antagonist is. Well-known anime use the villain
// recorded in the archive; otherwise the most popular supporting character
// becomes a "rival" (the story treats it as a shadow wearing their face).
function villainFrom(cast, animeId, formId) {
  const known = archive.find((a) => a.id === animeId)?.villain;
  if (known && known.id !== formId) return known;
  const rival = cast
    .filter((c) => c.role !== 'Main' && c.character.mal_id !== formId && portraitOf(c.character))
    .sort((a, b) => (b.favorites ?? 0) - (a.favorites ?? 0))[0];
  return rival ? { id: rival.character.mal_id, name: flipName(rival.character.name), image: portraitOf(rival.character), rival: true } : null;
}

// The past-life form: a main character, with a portrait from /characters/{id}/pictures.
async function liveCast(animeId, formId) {
  const cast = await get(`/anime/${animeId}/characters`);
  const mains = cast.filter((c) => c.role === 'Main');
  const chosen = cast.find((c) => c.character.mal_id === Number(formId)) ?? pick(mains.length ? mains : cast);
  if (!chosen) return { form: null, villain: villainFrom(cast, animeId, null) };
  const villain = villainFrom(cast, animeId, chosen.character.mal_id);
  return { form: await liveForm(chosen), villain };
}

async function liveForm(chosen) {
  const { character } = chosen;
  let image = character.images?.jpg?.image_url ?? null;
  try {
    const pictures = await get(`/characters/${character.mal_id}/pictures`);
    image = pick(pictures)?.jpg?.image_url ?? image; // a different picture of them on every roll
  } catch {
    // the cast list already gave us a portrait
  }
  if (!image || image.includes('questionmark')) return null;
  return { id: character.mal_id, name: flipName(character.name), image };
}

function fromArchive(genres, animeId, formId) {
  const names = genres.map((g) => g.name);
  const themed = archive.filter((a) => a.genres.some((g) => names.includes(g)));
  const entry = archive.find((a) => a.id === Number(animeId)) ?? pick(themed.length ? themed : archive);
  const { characters, ...anime } = entry;
  return {
    ...anime,
    theme: entry.genres.find((g) => names.includes(g)) ?? null,
    form: characters.find((c) => c.id === Number(formId)) ?? pick(characters) ?? null,
    villain: entry.villain ?? null,
    source: 'archive',
  };
}

// Always resolves. `genres` come from the hero's world; `animeId` and `formId`
// are set when reopening a shared link.
export async function summonOrigin({ genres, animeId, formId }) {
  if (Date.now() < offlineUntil) return fromArchive(genres, animeId, formId);
  try {
    const { anime, theme } = await liveAnime(genres, animeId);
    setOfflineUntil(0);
    const { form, villain } = await liveCast(anime.id, formId).catch(() => ({ form: null, villain: null }));
    return { ...anime, theme, form, villain, source: 'live' };
  } catch {
    // Skip the wait on the next few rolls instead of timing out every time.
    setOfflineUntil(Date.now() + OFFLINE_COOLDOWN_MS);
    return fromArchive(genres, animeId, formId);
  }
}
