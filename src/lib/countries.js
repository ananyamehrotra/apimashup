// Fetch every country once and cache it; the data barely changes.

const CACHE_KEY = 'isekai.countries.v2';
const TTL_MS = 24 * 60 * 60 * 1000;

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (cached && Date.now() - cached.savedAt < TTL_MS && cached.countries?.length) return cached.countries;
  } catch {
    // unreadable or blocked storage: fall through to the network
  }
  return null;
}

export async function loadCountries() {
  const cached = readCache();
  if (cached) return cached;

  const res = await fetch('/api/countries');
  const body = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(body)) {
    throw new Error(body?.error ?? 'Could not load the world map. Please try again.');
  }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), countries: body }));
  } catch {
    // storage full or blocked: the app still works without the cache
  }
  return body;
}

export const flagUrl = (country) => `/api/flag?code=${country.code2.toLowerCase()}`;

export const pickRandom = (countries, exceptCode) => {
  const pool = countries.filter((c) => c.code !== exceptCode && c.lat != null && c.lng != null);
  return pool[Math.floor(Math.random() * pool.length)];
};
