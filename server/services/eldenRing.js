// Elden Ring Fan API client. Downloads whole collections (bosses, npcs,
// locations), keeps only the fields we merge, caches them for 24h and falls
// back to the bundled snapshot when the API is down.
const config = require('../config');
const cache = require('./cache');
const snapshot = require('./snapshot');
const { markCache } = require('../utils/requestContext');
const { upstream } = require('../utils/errors');

const { BASE_URL, PAGE_SIZE, TIMEOUT_MS, RETRIES, TTL, COLLECTIONS } = config.ELDEN_RING;

async function fetchJson(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) {
        const err = new Error(`Elden Ring API answered HTTP ${res.status}`);
        err.retryable = res.status === 429 || res.status >= 500;
        throw err;
      }
      const body = await res.json();
      if (!body.success || !Array.isArray(body.data)) throw new Error('Elden Ring API returned an unexpected body');
      return body;
    } catch (err) {
      const retryable = err.retryable || err.name === 'TimeoutError' || err.name === 'TypeError';
      if (!retryable || attempt >= RETRIES - 1) throw err;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
}

// "Godrick's Great Rune, Remembrance of the Grafted" -> two drops. "50,000 Runes" stays whole.
const splitDrops = (drops) =>
  (drops || []).flatMap((d) => String(d).split(/,\s+/)).map((d) => d.trim()).filter(Boolean);

const clean = (s) => (typeof s === 'string' && s.trim() ? s.trim() : null);

function slim(item) {
  return {
    id: item.id,
    name: clean(item.name),
    image: clean(item.image),
    description: clean(item.description),
    location: clean(item.location),
    region: clean(item.region),
    role: clean(item.role),
    quote: clean(item.quote),
    drops: splitDrops(item.drops),
    healthPoints: clean(item.healthPoints),
  };
}

// Live download of every page of one collection (pages are zero-based)
async function fetchCollection(name) {
  const items = [];
  for (let page = 0; ; page++) {
    const body = await fetchJson(`${BASE_URL}/${name}?limit=${PAGE_SIZE}&page=${page}`);
    items.push(...body.data.map(slim));
    if (body.data.length < PAGE_SIZE || (body.total && items.length >= body.total)) break;
  }
  return items;
}

// Cached collection: cache -> live -> stale cache -> snapshot
async function getCollection(name) {
  const snapName = `eldenring-${name}`;
  if (config.SNAPSHOT_MODE) {
    const data = snapshot.read(snapName);
    if (!data) throw upstream(`SNAPSHOT_MODE is on but snapshots/${snapName}.json is missing (run npm run snapshot)`);
    markCache('SNAPSHOT');
    return { data, source: 'SNAPSHOT' };
  }
  try {
    const data = await cache.wrap(`eldenring:${name}:v1`, TTL, () => fetchCollection(name));
    if (!snapshot.exists(snapName)) snapshot.write(snapName, data); // first live load seeds the offline copy
    return { data, source: 'LIVE' };
  } catch (err) {
    const data = snapshot.read(snapName);
    if (!data) throw upstream(`Elden Ring API unavailable and no snapshot: ${err.message}`);
    console.warn(`[eldenRing] ${name}: ${err.message}; using snapshot`);
    markCache('SNAPSHOT');
    return { data, source: 'SNAPSHOT' };
  }
}

module.exports = { COLLECTIONS, fetchCollection, getCollection };
