// REST Countries v5: every country in the shape src/lib/countries.js expects,
// fetched once (3 paginated requests), cached on disk for a week, with the
// bundled snapshot as the offline fallback.
const config = require('../config');
const cache = require('./cache');
const snapshot = require('./snapshot');
const { markCache } = require('../utils/requestContext');
const { upstream } = require('../utils/errors');

const { BASE_URL, FLAGS_URL, API_KEY, PAGE_SIZE, TIMEOUT_MS, RETRIES, TTL } = config.REST_COUNTRIES;
const CACHE_KEY = 'restcountries:v5:frontend:v1';
const SNAPSHOT_NAME = 'countries';

const FIELDS = [
  'names.common', 'names.official', 'codes.alpha_2', 'codes.alpha_3', 'capitals.name', 'flag.emoji',
  'flag.colors.palette', 'flag.colors.swatches.vibrant', 'region', 'subregion', 'area.kilometers', 'borders',
  'coordinates', 'currencies', 'languages.name', 'population', 'landlocked', 'demonyms.eng', 'descriptions.short',
].join(',');

// [secondary, primary, trim]: the flag's boldest colour, flanked by its two largest others.
function flagColors(flag) {
  const palette = [...(flag?.colors?.palette ?? [])].sort((a, b) => b.proportion - a.proportion).map((p) => p.hex);
  const primary = flag?.colors?.swatches?.vibrant ?? palette[1] ?? palette[0];
  if (!primary) return [];
  const rest = palette.filter((hex) => hex !== primary);
  return [rest[0] ?? primary, primary, rest[1] ?? rest[0] ?? primary];
}

const slim = (c) => ({
  code: c.codes?.alpha_3 || null,
  code2: c.codes?.alpha_2 || null,
  name: c.names?.common ?? 'Unknown land',
  official: c.names?.official ?? null,
  capital: c.capitals?.[0]?.name ?? null,
  emoji: c.flag?.emoji ?? null,
  colors: flagColors(c.flag),
  region: c.region ?? null,
  subregion: c.subregion ?? null,
  area: c.area?.kilometers ?? null,
  borders: c.borders ?? [],
  lat: c.coordinates?.lat ?? null,
  lng: c.coordinates?.lng ?? null,
  currencies: (c.currencies ?? []).map(({ code, name, symbol }) => ({ code, name, symbol })),
  languages: (c.languages ?? []).map((l) => l.name).filter(Boolean),
  population: c.population ?? null,
  landlocked: c.landlocked ?? false,
  demonym: c.demonyms?.eng?.m ?? null,
  blurb: c.descriptions?.short ?? null,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// GET with timeout; retries network errors, 429 and 5xx with 500ms × 2^n backoff.
async function fetchWithRetry(url, options = {}) {
  let lastErr;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.ok || (res.status < 500 && res.status !== 429)) return res;
      lastErr = new Error(`REST Countries responded ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    if (attempt < RETRIES - 1) await sleep(500 * 2 ** attempt);
  }
  throw lastErr;
}

async function fetchAll() {
  if (!API_KEY) throw new Error('COUNTRY_API is not set in .env');
  const all = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const res = await fetchWithRetry(`${BASE_URL}?limit=${PAGE_SIZE}&offset=${offset}&response_fields=${FIELDS}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.data?.objects) {
      throw new Error(body?.errors?.[0]?.message ?? `REST Countries responded ${res.status}`);
    }
    all.push(...body.data.objects.map(slim));
    if (!body.data.meta?.more) break;
  }
  const countries = all.filter((c) => c.code && c.code2);
  if (countries.length < 150) throw new Error(`REST Countries returned only ${countries.length} countries`);
  return countries;
}

// cache -> live -> stale cache -> snapshot. SNAPSHOT_MODE skips the network.
async function getCountries() {
  if (config.SNAPSHOT_MODE) {
    const data = snapshot.read(SNAPSHOT_NAME);
    if (!data) throw upstream('SNAPSHOT_MODE is on but server/data/snapshots/countries.json is missing (run npm run snapshot)');
    markCache('SNAPSHOT');
    return data;
  }
  try {
    const data = await cache.wrap(CACHE_KEY, TTL, fetchAll);
    if (!snapshot.exists(SNAPSHOT_NAME)) snapshot.write(SNAPSHOT_NAME, data); // first live load seeds the offline copy
    return data;
  } catch (err) {
    console.warn('[restCountries] live load failed:', err.message);
    const data = snapshot.read(SNAPSHOT_NAME);
    if (!data) throw upstream(`Could not load the world map: ${err.message}`);
    markCache('SNAPSHOT');
    return data;
  }
}

// Flags are proxied because the flag CDN sends no CORS header, which would
// leave them blank in the downloaded character sheet.
async function getFlagSvg(code2) {
  if (!/^[a-z]{2}$/i.test(code2 ?? '')) return null;
  const code = code2.toLowerCase();
  const fetchSvg = async () => {
    const res = await fetchWithRetry(`${FLAGS_URL}/${code}.svg`);
    if (!res.ok) throw Object.assign(new Error(`flag ${code}: ${res.status}`), { status: res.status });
    return res.text();
  };
  try {
    return await cache.wrap(`flag:${code}`, config.FLAG_TTL, fetchSvg);
  } catch (err) {
    if (err.status === 404) return null;
    const saved = snapshot.read(`flag-${code}`);
    if (saved) markCache('SNAPSHOT');
    return saved;
  }
}

module.exports = { getCountries, getFlagSvg, fetchAll, slim, flagColors };
