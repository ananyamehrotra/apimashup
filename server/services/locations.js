const fs = require('fs');
const path = require('path');
const cfg = require('../config');
const eldenRing = require('./eldenRing');
const { ApiError } = require('../utils/errors');

const read = (...p) => JSON.parse(fs.readFileSync(path.join(cfg.DATA_DIR, ...p), 'utf8'));

const REQUIRED = ['id', 'name', 'game', 'tagline', 'story', 'ending', 'characters', 'bosses', 'npcs'];
const STAT_KEYS = ['HP', 'ATK', 'DEF', 'SPD', 'MAG'];

const weaponData = read('weapons.json');
const weaponById = new Map(weaponData.weapons.map((w) => [w.id, w]));

/** Fail fast with a readable message if a data file is malformed. */
function validate(loc) {
  for (const k of REQUIRED) if (loc[k] == null) throw new Error(`${loc.id || '?'}: missing "${k}"`);
  for (const c of loc.characters) {
    if (!weaponById.has(c.weapon)) throw new Error(`${loc.id}/${c.id}: unknown weapon ${c.weapon}`);
    for (const k of STAT_KEYS) if (typeof c.stats?.[k] !== 'number') throw new Error(`${loc.id}/${c.id}: stat ${k}`);
  }
  for (const b of loc.bosses) {
    if (!weaponById.has(b.drop)) throw new Error(`${loc.id}/${b.id}: unknown drop ${b.drop}`);
    if (!b.moves?.length) throw new Error(`${loc.id}/${b.id}: no moves`);
  }
}

const base = new Map();
for (const id of cfg.LOCATION_IDS) {
  const loc = read('locations', `${id}.json`);
  validate(loc);
  base.set(id, loc);
}

const summary = (l) => ({
  id: l.id, name: l.name, game: l.game, icon: l.icon, tagline: l.tagline, coords: l.coords,
  characterCount: l.characters.length, bossCount: l.bosses.length, npcCount: l.npcs.length,
});

function list() {
  return [...base.values()].map(summary);
}

/** Merge API data (image, drops, description) into entries that have an apiRef. Local fields win. */
function merge(entry, index, extra) {
  const ref = entry.apiRef;
  const found = ref && ref.source === 'eldenring' ? index.get(eldenRing.norm(ref.name)) : null;
  const { apiRef, ...rest } = entry; // eslint-disable-line no-unused-vars
  return { ...rest, image: found?.image || null, ...(extra ? extra(found) : {}) };
}

async function get(id) {
  const loc = base.get(id);
  if (!loc) throw new ApiError(404, 'NOT_FOUND', `Unknown location '${id}'.`);
  const needsApi = [...loc.bosses, ...loc.npcs].some((e) => e.apiRef);
  let cacheState = 'MISS';
  let bosses = { index: new Map() };
  let npcs = { index: new Map() };
  if (needsApi) {
    [bosses, npcs] = await Promise.all([eldenRing.load('bosses'), eldenRing.load('npcs')]);
    cacheState = [bosses.source, npcs.source].includes('SNAPSHOT') ? 'SNAPSHOT'
      : [bosses.source, npcs.source].every((s) => s === 'HIT') ? 'HIT' : 'MISS';
  } else {
    cacheState = 'HIT'; // purely local data
  }
  const data = {
    ...loc,
    bosses: loc.bosses.map((b) => merge(b, bosses.index, (f) => ({ drops: f?.drops || [] }))),
    npcs: loc.npcs.map((n) => merge(n, npcs.index)),
  };
  return { data, cache: cacheState };
}

const weapons = () => weaponData;

module.exports = { list, get, weapons };
