const config = require('../config');
const cache = require('./cache');
const snapshot = require('./snapshot');
const { ApiError } = require('../utils/errors');

class JikanQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.lastCallTime = 0;
    this.timestamps = [];
  }

  async enqueue(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();

      // Clean sliding 60s window
      this.timestamps = this.timestamps.filter(t => now - t < 60000);
      if (this.timestamps.length >= config.JIKAN_PER_MIN) {
        const oldest = this.timestamps[0];
        const waitMs = 60000 - (now - oldest) + 50;
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      // Gap between calls
      const elapsed = now - this.lastCallTime;
      if (elapsed < config.JIKAN_GAP_MS) {
        await new Promise(r => setTimeout(r, config.JIKAN_GAP_MS - elapsed));
      }

      const item = this.queue.shift();
      this.lastCallTime = Date.now();
      this.timestamps.push(this.lastCallTime);

      try {
        const res = await item.fn();
        item.resolve(res);
      } catch (err) {
        item.reject(err);
      }
    }

    this.processing = false;
  }
}

const queue = new JikanQueue();

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.JIKAN_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);

      if (res.status === 429 || res.status >= 500) {
        const retryAfterHeader = res.headers.get('Retry-After');
        const delay = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : 500 * Math.pow(2, attempt) + Math.random() * 200;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      if (!res.ok) {
        throw new ApiError(res.status, 'UPSTREAM_ERROR', `Jikan returned ${res.status}`);
      }

      const json = await res.json();
      return json;
    } catch (err) {
      clearTimeout(timeout);
      if (attempt === retries - 1) throw err;
      const delay = 500 * Math.pow(2, attempt) + Math.random() * 200;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new ApiError(503, 'UPSTREAM_UNAVAILABLE', 'Jikan API unavailable');
}

async function callJikan(endpoint) {
  const url = `${config.JIKAN}${endpoint}`;
  return queue.enqueue(() => fetchWithRetry(url));
}

// Helpers
async function getAnimeByGenres(genreIds, page = 1) {
  const idsStr = Array.isArray(genreIds) ? genreIds.join(',') : genreIds;
  const key = `jikan_anime_genres_${idsStr}_page_${page}`;

  if (config.SNAPSHOT_MODE) {
    const snapData = snapshot.getPoolSnapshot(idsStr);
    if (snapData) return { data: snapData, source: 'SNAPSHOT' };
  }

  try {
    const res = await cache.wrap(key, () => callJikan(`/anime?genres=${idsStr}&min_score=7&order_by=members&sort=desc&sfw=true&limit=25&page=${page}`), config.TTL.pool);
    return res;
  } catch (err) {
    console.warn(`[Jikan] Fetch failed for genres [${idsStr}], checking snapshot fallback...`);
    const snapData = snapshot.getPoolSnapshot(idsStr);
    if (snapData) return { data: snapData, source: 'SNAPSHOT' };
    throw new ApiError(503, 'UPSTREAM_UNAVAILABLE', `Could not fetch anime for genres ${idsStr}`);
  }
}

async function getCharacters(animeId) {
  const key = `jikan_anime_chars_${animeId}`;

  if (config.SNAPSHOT_MODE) {
    const snapData = snapshot.getCharactersSnapshot(animeId);
    if (snapData) return { data: snapData, source: 'SNAPSHOT' };
  }

  try {
    const res = await cache.wrap(key, () => callJikan(`/anime/${animeId}/characters`), config.TTL.characters);
    return res;
  } catch (err) {
    console.warn(`[Jikan] Fetch failed for characters animeId=${animeId}, checking snapshot fallback...`);
    const snapData = snapshot.getCharactersSnapshot(animeId);
    if (snapData) return { data: snapData, source: 'SNAPSHOT' };
    throw new ApiError(503, 'UPSTREAM_UNAVAILABLE', `Could not fetch characters for anime ${animeId}`);
  }
}

async function getGenres() {
  const key = `jikan_genres_list`;
  return cache.wrap(key, () => callJikan('/genres/anime'), config.TTL.pool * 4);
}

module.exports = {
  callJikan,
  getAnimeByGenres,
  getCharacters,
  getGenres,
  queue,
};
