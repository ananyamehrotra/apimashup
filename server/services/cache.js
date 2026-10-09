const fs = require('fs');
const path = require('path');
const config = require('../config');

const memoryCache = new Map();
const inFlight = new Map();

function ensureCacheDir() {
  if (!fs.existsSync(config.CACHE_DIR)) {
    fs.mkdirSync(config.CACHE_DIR, { recursive: true });
  }
}

function getDiskPath(key) {
  const safeKey = key.replace(/[^a-z0-9_-]/gi, '_');
  return path.join(config.CACHE_DIR, `${safeKey}.json`);
}

function get(key) {
  const now = Date.now();
  if (memoryCache.has(key)) {
    const item = memoryCache.get(key);
    if (item.expiresAt > now) {
      return item.data;
    }
    memoryCache.delete(key);
  }

  const diskPath = getDiskPath(key);
  if (fs.existsSync(diskPath)) {
    try {
      const raw = fs.readFileSync(diskPath, 'utf8');
      const item = JSON.parse(raw);
      if (item.expiresAt > now) {
        memoryCache.set(key, item);
        return item.data;
      }
      fs.unlinkSync(diskPath);
    } catch (e) {
      // Ignore disk cache read errors
    }
  }
  return null;
}

function set(key, data, ttlMs = 3600e3) {
  const expiresAt = Date.now() + ttlMs;
  const item = { data, expiresAt };
  memoryCache.set(key, item);
  try {
    ensureCacheDir();
    fs.writeFileSync(getDiskPath(key), JSON.stringify(item), 'utf8');
  } catch (e) {
    console.warn(`[Cache] Failed to write disk cache for ${key}:`, e.message);
  }
}

async function wrap(key, fetcherFn, ttlMs = 3600e3) {
  const cached = get(key);
  if (cached !== null) {
    return { data: cached, source: 'HIT' };
  }
  if (inFlight.has(key)) {
    const data = await inFlight.get(key);
    return { data, source: 'HIT' };
  }

  const promise = (async () => {
    try {
      const data = await fetcherFn();
      set(key, data, ttlMs);
      return data;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  const data = await promise;
  return { data, source: 'MISS' };
}

module.exports = { get, set, wrap };
