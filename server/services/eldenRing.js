const cfg = require('../config');
const cache = require('./cache');
const snapshot = require('./snapshot');

const KINDS = ['bosses', 'npcs'];
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

async function fetchJson(url) {
  let lastErr;
  for (let n = 0; n < cfg.FETCH_RETRIES; n++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(cfg.FETCH_TIMEOUT_MS) });
      if (res.ok) return await res.json();
      lastErr = new Error(`HTTP ${res.status}`);
      const retryAfter = Number(res.headers.get('retry-after'));
      if (res.status !== 429 && res.status < 500) break;
      await new Promise((r) => setTimeout(r, retryAfter ? retryAfter * 1000 : 500 * 2 ** n));
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 500 * 2 ** n));
    }
  }
  throw lastErr;
}

/** Download every page of /bosses or /npcs. Used by the loader and the snapshot script. */
async function fetchAll(kind) {
  const all = [];
  for (let page = 0; page < 20; page++) {
    const body = await fetchJson(`${cfg.ELDEN_RING_API}/${kind}?limit=${cfg.PAGE_SIZE}&page=${page}`);
    all.push(...(body.data || []));
    if (!body.data || body.data.length < cfg.PAGE_SIZE) break;
  }
  return all;
}

/** Returns { index: Map(normalizedName -> entry), source: 'HIT' | 'MISS' | 'SNAPSHOT' | 'NONE' }. */
async function load(kind) {
  if (!KINDS.includes(kind)) throw new Error(`unknown kind ${kind}`);
  let list = null;
  let source = 'NONE';
  if (cfg.SNAPSHOT_MODE) {
    list = snapshot.read(`eldenring-${kind}`);
    if (list) source = 'SNAPSHOT';
  } else {
    try {
      const { value, hit } = await cache.wrap(`eldenring-${kind}`, cfg.TTL.eldenRing, () => fetchAll(kind));
      list = value;
      source = hit ? 'HIT' : 'MISS';
    } catch (e) {
      console.warn(`eldenRing: ${kind} fetch failed (${e.message}), trying snapshot`);
      list = snapshot.read(`eldenring-${kind}`);
      if (list) source = 'SNAPSHOT';
    }
  }
  return { index: new Map((list || []).map((e) => [norm(e.name), e])), source };
}

module.exports = { load, fetchAll, norm };
