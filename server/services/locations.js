// Loads the hand-written location JSON, validates it (fail fast at boot),
// and merges Elden Ring Fan API data into entries that carry an apiRef.
// Local fields win; the API only fills image, drops and missing quotes.
const fs = require('fs');
const path = require('path');
const config = require('../config');
const eldenRing = require('./eldenRing');
const { markCache } = require('../utils/requestContext');

const DIR = path.join(__dirname, '..', 'data', 'locations');
const STAT_KEYS = ['HP', 'ATK', 'DEF', 'SPD', 'MAG'];

// ---------- validation ----------

function validate(loc, file) {
  const problems = [];
  const need = (cond, msg) => cond || problems.push(msg);
  const str = (v) => typeof v === 'string' && v.trim().length > 0;
  const statsOk = (s) => s && STAT_KEYS.every((k) => Number.isFinite(s[k]));
  const uniqueIds = (arr, label) => {
    const ids = arr.map((x) => x.id);
    need(new Set(ids).size === ids.length, `${label}: duplicate ids`);
  };

  for (const k of ['id', 'name', 'game', 'tagline']) need(str(loc[k]), `"${k}" must be a non-empty string`);
  need(Number.isFinite(loc.coords?.lat) && Number.isFinite(loc.coords?.lng), '"coords" needs numeric lat and lng');
  need(Array.isArray(loc.story) && loc.story.length === 3 && loc.story.every(str), '"story" must be 3 non-empty paragraphs');

  const list = (key, min, max, check) => {
    const arr = loc[key];
    if (!Array.isArray(arr) || arr.length < min || arr.length > max) {
      problems.push(`"${key}" must have ${min === max ? min : `${min}-${max}`} entries`);
      return;
    }
    arr.forEach((x, i) => check(x, `${key}[${i}]${x?.id ? ` (${x.id})` : ''}`));
    uniqueIds(arr, key);
  };

  list('characters', 4, 4, (c, at) => {
    for (const k of ['id', 'name', 'backstory', 'trait']) need(str(c[k]), `${at}.${k} is required`);
    need(statsOk(c.stats), `${at}.stats needs numeric ${STAT_KEYS.join(', ')}`);
  });
  list('bosses', 4, 4, (b, at) => {
    for (const k of ['id', 'name', 'title', 'lore', 'move']) need(str(b[k]), `${at}.${k} is required`);
    need(statsOk(b.stats), `${at}.stats needs numeric ${STAT_KEYS.join(', ')}`);
    if (b.apiRef) need(str(b.apiRef.name) && b.apiRef.source === 'eldenring', `${at}.apiRef needs source "eldenring" and a name`);
  });
  list('npcs', 3, 5, (n, at) => {
    for (const k of ['id', 'name', 'role', 'where']) need(str(n[k]), `${at}.${k} is required`);
    need(str(n.quote) || n.apiRef, `${at} needs a quote, or an apiRef to take the quote from`);
    if (n.apiRef) need(str(n.apiRef.name) && n.apiRef.source === 'eldenring', `${at}.apiRef needs source "eldenring" and a name`);
  });

  if (problems.length) {
    throw new Error(`Invalid location file ${file}:\n  - ${problems.join('\n  - ')}`);
  }
  return loc;
}

function loadLocal() {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
  if (files.length === 0) throw new Error(`No location JSON files in ${DIR}`);
  const locs = files.map((f) => {
    let json;
    try {
      json = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    } catch (err) {
      throw new Error(`Location file ${f} is not valid JSON: ${err.message}`);
    }
    validate(json, f);
    if (json.id !== path.basename(f, '.json')) throw new Error(`Location file ${f} has id "${json.id}"; the id must match the file name`);
    return json;
  });
  return locs;
}

// ---------- merge ----------

const norm = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function indexByName(items) {
  const map = new Map();
  for (const it of items) if (it.name) map.set(norm(it.name), it);
  return map;
}

function mergeEntry(entry, index, report, kind) {
  const { apiRef, ...out } = entry;
  const api = apiRef ? index?.get(norm(apiRef.name)) : null;
  if (apiRef) report[api ? 'matched' : 'missing'].push(`${kind}:${apiRef.name}`);
  out.image = out.image ?? api?.image ?? null;
  if (kind === 'boss') out.drops = out.drops ?? api?.drops ?? [];
  if (kind === 'npc') out.quote = out.quote ?? api?.quote ?? null;
  return out;
}

function merge(locals, bosses, npcs) {
  const report = { matched: [], missing: [] };
  const bossIdx = bosses && indexByName(bosses);
  const npcIdx = npcs && indexByName(npcs);
  const merged = locals.map((loc) => ({
    ...loc,
    bosses: loc.bosses.map((b) => mergeEntry(b, bossIdx, report, 'boss')),
    npcs: loc.npcs.map((n) => mergeEntry(n, npcIdx, report, 'npc')),
  }));
  return { merged, report };
}

// ---------- state ----------

const locals = loadLocal(); // throws at require time, so a bad file stops boot
let state = null; // { byId, list, source, report, at }
let merging = null;

async function buildState() {
  let bosses = null;
  let npcs = null;
  let source = 'LIVE';
  let apiError = null;
  try {
    const [b, n] = await Promise.all([eldenRing.getCollection('bosses'), eldenRing.getCollection('npcs')]);
    bosses = b.data;
    npcs = n.data;
    if (b.source === 'SNAPSHOT' || n.source === 'SNAPSHOT') source = 'SNAPSHOT';
  } catch (err) {
    source = 'LOCAL_ONLY';
    apiError = err.message;
    console.warn('[locations] Elden Ring data unavailable, serving local data only:', err.message);
  }
  const { merged, report } = merge(locals, bosses, npcs);
  if (report.missing.length && source !== 'LOCAL_ONLY') {
    console.warn('[locations] apiRef not found in the Elden Ring API:', report.missing.join(', '));
  }
  return { byId: new Map(merged.map((l) => [l.id, l])), list: merged, source, apiError, report, at: Date.now() };
}

async function ensure() {
  const retryDue = state?.source === 'LOCAL_ONLY' && Date.now() - state.at > config.ELDEN_RING.RETRY_MERGE_MS;
  if ((!state || retryDue) && !merging) {
    merging = buildState()
      .then((s) => (state = s))
      .finally(() => (merging = null));
  }
  if (!state) await merging;
  if (state.source === 'SNAPSHOT') markCache('SNAPSHOT');
  return state;
}

function summary(loc) {
  return {
    id: loc.id,
    name: loc.name,
    game: loc.game,
    tagline: loc.tagline,
    coords: loc.coords,
    characterCount: loc.characters.length,
    bossCount: loc.bosses.length,
    npcCount: loc.npcs.length,
  };
}

async function list() {
  const s = await ensure();
  return s.list.map(summary);
}

async function get(id) {
  const s = await ensure();
  return s.byId.get(id) || null;
}

function info() {
  if (!state) return { loaded: false, files: locals.map((l) => l.id) };
  return { loaded: true, source: state.source, apiError: state.apiError, apiMatched: state.report.matched.length, apiMissing: state.report.missing };
}

module.exports = { ensure, list, get, info, validate, merge, norm };
