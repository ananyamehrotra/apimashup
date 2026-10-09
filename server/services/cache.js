// Two-tier cache: in-memory Map in front of JSON files on disk.
// wrap() also de-duplicates concurrent calls for the same key, and serves
// expired (stale) data if the refresh fails.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { markCache } = require('../utils/requestContext');

const DIR = path.join(__dirname, '..', 'data', 'cache');
fs.mkdirSync(DIR, { recursive: true });

const mem = new Map();
const inflight = new Map();
const stats = { hits: 0, misses: 0, stale: 0 };

const fileFor = (key) => path.join(DIR, crypto.createHash('sha1').update(key).digest('hex') + '.json');

// Returns { value, fresh } or undefined.
async function read(key) {
  let entry = mem.get(key);
  if (!entry) {
    try {
      entry = JSON.parse(await fs.promises.readFile(fileFor(key), 'utf8'));
      mem.set(key, entry);
    } catch {
      return undefined;
    }
  }
  return { value: entry.value, fresh: entry.expires > Date.now() };
}

async function get(key) {
  const entry = await read(key);
  return entry && entry.fresh ? entry.value : undefined;
}

function set(key, value, ttlMs) {
  const entry = { key, expires: Date.now() + ttlMs, value };
  mem.set(key, entry);
  fs.promises.writeFile(fileFor(key), JSON.stringify(entry)).catch(() => {});
  return value;
}

async function wrap(key, ttlMs, fn) {
  const entry = await read(key);
  if (entry && entry.fresh) {
    stats.hits++;
    markCache('HIT');
    return entry.value;
  }
  stats.misses++;
  markCache('MISS');
  if (inflight.has(key)) return inflight.get(key);

  const p = (async () => {
    try {
      return set(key, await fn(), ttlMs);
    } catch (err) {
      if (entry) {
        stats.stale++;
        markCache('STALE');
        return entry.value;
      }
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

function info() {
  return { entries: mem.size, inflight: inflight.size, ...stats };
}

module.exports = { get, set, wrap, info };
