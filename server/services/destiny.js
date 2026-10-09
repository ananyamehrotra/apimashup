const jikan = require('./jikan');
const { createRng } = require('../utils/rng');

function hasRealImage(imgUrl) {
  if (!imgUrl) return false;
  return !imgUrl.includes('questionmark') && !imgUrl.includes('qm_g.gif');
}

/**
 * Class definition has genres array e.g. [10, 38] or [1]
 * Tier 1: genres + [62] (Isekai)
 * Tier 2: genres
 * Tier 3: [10] (Fantasy default)
 */
async function pickDestiny(classDef, seed = 0) {
  const rng = createRng(`destiny:${classDef.id}:${seed}`);
  const baseGenres = classDef.genres || [10];

  let poolRes = null;

  // Tier 1: search with Isekai (genre 62)
  try {
    const tier1Genres = Array.from(new Set([...baseGenres, 62]));
    const res = await jikan.getAnimeByGenres(tier1Genres);
    if (res && res.data && res.data.data && res.data.data.length >= 5) {
      poolRes = res.data.data;
    }
  } catch (e) {
    // fallback to Tier 2
  }

  // Tier 2: search with base genres
  if (!poolRes) {
    try {
      const res = await jikan.getAnimeByGenres(baseGenres);
      if (res && res.data && res.data.data && res.data.data.length > 0) {
        poolRes = res.data.data;
      }
    } catch (e) {
      // fallback to Tier 3
    }
  }

  // Tier 3: search Fantasy (genre 10)
  if (!poolRes) {
    try {
      const res = await jikan.getAnimeByGenres([10]);
      if (res && res.data && res.data.data && res.data.data.length > 0) {
        poolRes = res.data.data;
      }
    } catch (e) {
      // pool remains null
    }
  }

  if (!poolRes || poolRes.length === 0) {
    return {
      anime: null,
      form: null,
      error: 'UPSTREAM_UNAVAILABLE'
    };
  }

  // Pick anime deterministically from pool
  const animeIndex = Math.floor(rng() * poolRes.length);
  const rawAnime = poolRes[animeIndex];

  const anime = {
    id: rawAnime.mal_id,
    title: rawAnime.title,
    titleEn: rawAnime.title_english || rawAnime.title,
    image: rawAnime.images?.jpg?.large_image_url || rawAnime.images?.jpg?.image_url,
    score: rawAnime.score || 7.5,
    episodes: rawAnime.episodes || 12,
    year: rawAnime.year || (rawAnime.aired?.prop?.from?.year) || 2022,
    genres: rawAnime.genres ? rawAnime.genres.map(g => g.name) : [],
    synopsis: rawAnime.synopsis || 'Reborn into a realm of mystery and grand fate...',
    url: rawAnime.url || `https://myanimelist.net/anime/${rawAnime.mal_id}`
  };

  // Fetch characters
  let form = null;
  try {
    const charsRes = await jikan.getCharacters(anime.id);
    const charList = charsRes?.data?.data || [];

    const mainChars = charList.filter(c => c.role === 'Main' && hasRealImage(c.character?.images?.jpg?.image_url));
    const validChars = charList.filter(c => hasRealImage(c.character?.images?.jpg?.image_url));

    if (mainChars.length > 0) {
      const charRng = createRng(`form:${anime.id}:${seed}`);
      const charIdx = Math.floor(charRng() * mainChars.length);
      const chosen = mainChars[charIdx].character;
      form = {
        id: chosen.mal_id,
        name: chosen.name,
        role: 'Main',
        image: chosen.images?.jpg?.image_url
      };
    } else if (validChars.length > 0) {
      const chosen = validChars[0].character;
      form = {
        id: chosen.mal_id,
        name: chosen.name,
        role: validChars[0].role || 'Supporting',
        image: chosen.images?.jpg?.image_url
      };
    }
  } catch (err) {
    console.warn(`[Destiny] Character lookup failed for anime ${anime.id}`);
  }

  return {
    anime,
    form,
  };
}

module.exports = { pickDestiny, hasRealImage };
