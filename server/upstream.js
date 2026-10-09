// Server-side calls to REST Countries. Shared by the Vite dev middleware and
// the Vercel functions in /api, so the API key never reaches the browser.

const BASE = 'https://api.restcountries.com/countries/v5';
const FLAGS = 'https://flags.restcountries.com/v5/svg';
const PAGE_SIZE = 100; // free plan cap per request

const FIELDS = [
  'names.common',
  'names.official',
  'codes.alpha_2',
  'codes.alpha_3',
  'capitals.name',
  'flag.emoji',
  'flag.colors.palette',
  'flag.colors.swatches.vibrant',
  'region',
  'subregion',
  'area.kilometers',
  'borders',
  'coordinates',
  'currencies',
  'languages.name',
  'population',
  'landlocked',
  'demonyms.eng',
  'descriptions.short',
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
  code: c.codes?.alpha_3 ?? null,
  code2: c.codes?.alpha_2 ?? null,
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

export async function fetchAllCountries(key) {
  if (!key) throw new Error('COUNTRY_API is not set');
  const all = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const res = await fetch(`${BASE}?limit=${PAGE_SIZE}&offset=${offset}&response_fields=${FIELDS}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.errors?.[0]?.message ?? `REST Countries responded ${res.status}`);
    }
    all.push(...body.data.objects.map(slim));
    if (!body.data.meta.more) break;
  }
  return all.filter((c) => c.code && c.code2);
}

// Flags are proxied because the flag CDN sends no CORS header, which would
// leave them blank in the downloaded character sheet.
export async function fetchFlagSvg(code2) {
  if (!/^[a-z]{2}$/i.test(code2 ?? '')) return null;
  const res = await fetch(`${FLAGS}/${code2.toLowerCase()}.svg`);
  return res.ok ? res.text() : null;
}
