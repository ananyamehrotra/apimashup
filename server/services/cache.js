const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('../config');

const DISK_DIR = path.join(DATA_DIR, 'cache');
const mem = new Map();      // key -> { value, expires }
const inflight = new Map(); // key -> Promise
const stats = { hits: 0, misses: 0 };

const file = (key) => path.join(DISK_DIR, key.replace(/[^a-z0-9_-]/gi, '_') + '.json');

function readDisk(key) {
  try {
    const { value, expires } = JSON.parse(fs.readFileSync(file(key), 'utf8'));
    return { value, expires };
  } catch { return null; }
}

function writeDisk(key, entry) {
  try {
    fs.mkdirSync(DISK_DIR, { recursive: true });
    fs.writeFileSync(file(key), JSON.stringify(entry));
  } catch (e) { console.warn('cache: disk write failed', e.message); }
}

/** Returns { value, hit }. Concurrent misses for one key share a single loader call. */
async function wrap(key, ttl, loader) {
  const now = Date.now();
  let entry = mem.get(key) || readDisk(key);
  if (entry && entry.expires > now) {
    mem.set(key, entry);
    stats.hits++;
    return { value: entry.value, hit: true };
  }
  stats.misses++;
  if (!inflight.has(key)) {
    inflight.set(key, loader().then((value) => {
      entry = { value, expires: Date.now() + ttl };
      mem.set(key, entry);
      writeDisk(key, entry);
      return value;
    }).finally(() => inflight.delete(key)));
  }
  return { value: await inflight.get(key), hit: false };
}

const info = () => ({ entries: mem.size, ...stats });

module.exports = { wrap, info };
