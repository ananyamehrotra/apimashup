// Jikan (MyAnimeList) proxy for src/lib/jikan.js. One server-side queue keeps
// every visitor together under Jikan's limits (3 req/s, 60 req/min); answers
// are cached and saved for offline use. If Jikan is down this answers 503 fast,
// and the frontend switches to its built-in archive.
const crypto = require('crypto');
const config = require('../config');
const cache = require('./cache');
const snapshot = require('./snapshot');
const { markCache } = require('../utils/requestContext');
const { ApiError } = require('../utils/errors');

const { BASE_URL, GAP_MS, PER_MIN, TIMEOUT_MS, RETRIES, DOWN_MS, TTL } = config.JIKAN;

// The only Jikan endpoints the frontend uses.
const ALLOWED = [
  /^\/anime$/, // genre search
  /^\/anime\/\d+$/, // one anime (shared links)
  /^\/anime\/\d+\/characters$/,
  /^\/characters\/\d+\/pictures$/,
  /^\/random\/anime$/,
];
const ALLOWED_PARAMS = new Set(['genres', 'sfw', 'order_by', 'sort', 'min_score', 'limit', 'page']);

class JikanQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.lastCallTime = 0;
    this.timestamps = [];
  }

  enqueue(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.processing) return;
    this.processing = true;
    while (this.queue.length > 0) {
      const now = Date.now();
      this.timestamps = this.timestamps.filter((t) => now - t < 60000);
      if (this.timestamps.length >= PER_MIN) {
        await new Promise((r) => setTimeout(r, 60000 - (now - this.timestamps[0]) + 50));
        continue;
      }
      const elapsed = now - this.lastCallTime;
      if (elapsed < GAP_MS) await new Promise((r) => setTimeout(r, GAP_MS - elapsed));

      const item = this.queue.shift();
      this.lastCallTime = Date.now();
      this.timestamps.push(this.lastCallTime);
      try {
        item.resolve(await item.fn());
      } catch (err) {
        item.reject(err);
      }
    }
    this.processing = false;
  }
}

const queue = new JikanQueue();
let downUntil = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url) {
  let lastErr;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    let res;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (err) { // network error or timeout
      lastErr = err;
      if (attempt < RETRIES - 1) await sleep(500 * 2 ** attempt);
      continue;
    }
    if (res.ok) return res.json();
    if (res.status === 404) throw new ApiError(404, 'NOT_FOUND', 'Not found on Jikan');
    lastErr = new Error(`Jikan responded ${res.status}`);
    if (res.status !== 429 && res.status < 500) throw new ApiError(502, 'UPSTREAM_ERROR', lastErr.message);
    const retryAfter = Number(res.headers.get('retry-after'));
    if (attempt < RETRIES - 1) await sleep(retryAfter ? retryAfter * 1000 : 500 * 2 ** attempt);
  }
  throw lastErr;
}

// "/anime" + {genres: "10", page: "2"} -> "/anime?genres=10&page=2", unknown params dropped, order fixed
function normalise(path, query) {
  if (!ALLOWED.some((re) => re.test(path))) throw new ApiError(404, 'NOT_FOUND', `Jikan path ${path} is not proxied`);
  const params = Object.entries(query)
    .filter(([k, v]) => ALLOWED_PARAMS.has(k) && typeof v === 'string' && v.length <= 40)
    .sort(([a], [b]) => a.localeCompare(b));
  const qs = new URLSearchParams(params).toString();
  return qs ? `${path}?${qs}` : path;
}

const snapName = (key) => `jikan-${crypto.createHash('sha1').update(key).digest('hex').slice(0, 16)}`;

function fromSnapshot(key) {
  const data = snapshot.read(snapName(key));
  if (data) markCache('SNAPSHOT');
  return data;
}

const unavailable = () => new ApiError(503, 'UPSTREAM_UNAVAILABLE', 'Jikan is unavailable');

// Returns the Jikan JSON body unchanged.
async function get(path, query = {}) {
  const key = normalise(path, query);
  const random = path === '/random/anime';
  if (config.SNAPSHOT_MODE || Date.now() < downUntil) {
    const saved = random ? null : fromSnapshot(key);
    if (saved) return saved;
    throw unavailable();
  }
  const live = () => queue.enqueue(() => fetchWithRetry(`${BASE_URL}${key}`));
  try {
    if (random) return await live(); // a cached "random" answer would never change
    const body = await cache.wrap(`jikan:${key}`, TTL, live);
    if (!snapshot.exists(snapName(key))) snapshot.write(snapName(key), body);
    return body;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) throw err;
    downUntil = Date.now() + DOWN_MS;
    console.warn(`[jikan] ${key}: ${err.message}`);
    const saved = random ? null : fromSnapshot(key);
    if (saved) return saved;
    throw unavailable();
  }
}

const info = () => ({ pending: queue.queue.length, reachable: Date.now() >= downUntil, lastMinute: queue.timestamps.filter((t) => Date.now() - t < 60000).length });

module.exports = { get, normalise, info, ALLOWED };
