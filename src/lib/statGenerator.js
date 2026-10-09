// All the RPG logic: turns a country record into a character sheet.

export const STAT_MAX = 999;

// Log scale, so mid-sized countries don't all look tiny next to India or China.
export const toStat = (value, min, max) => {
  if (!(value > 0) || !(min > 0) || !(max > min)) return 1;
  const t = (Math.log(value) - Math.log(min)) / (Math.log(max) - Math.log(min));
  return Math.round(1 + (STAT_MAX - 1) * Math.min(1, Math.max(0, t)));
};

const CLASSES = {
  Europe: { name: 'Knight', icon: '⚔️' },
  Asia: { name: 'Monk', icon: '📿' },
  Africa: { name: 'Shaman', icon: '🔮' },
  Americas: { name: 'Ranger', icon: '🏹' },
  Oceania: { name: 'Navigator', icon: '🧭' },
  Antarctic: { name: 'Frost Mage', icon: '❄️' },
};
const DEFAULT_CLASS = { name: 'Wanderer', icon: '🎒' };

// Ordered rarest first; a country gets the first tier its population fits under.
export const RARITIES = [
  { name: 'Legendary', maxPopulation: 100_000, color: '#fbbf24' },
  { name: 'Epic', maxPopulation: 1_000_000, color: '#c084fc' },
  { name: 'Rare', maxPopulation: 10_000_000, color: '#60a5fa' },
  { name: 'Uncommon', maxPopulation: 50_000_000, color: '#4ade80' },
  { name: 'Common', maxPopulation: Infinity, color: '#cbd5e1' },
];

const rarityFor = (population) =>
  RARITIES.find((r) => (population ?? 0) < r.maxPopulation) ?? RARITIES.at(-1);

// A currency has no "value" in the country data, so gold is an invented rule:
// 250 per currency, plus 5 for every letter position in its code (A=1 … Z=26).
const goldFor = (currencies) =>
  currencies.reduce((sum, { code }) => {
    const letters = [...(code ?? '')].reduce((n, ch) => n + (ch.toUpperCase().charCodeAt(0) - 64), 0);
    return sum + 250 + 5 * Math.max(0, letters);
  }, 0);

// Which isekai world a country is reborn into. Keys match src/lib/worlds.js.
export function worldKeyFor(country) {
  const { region, subregion } = country;
  if (region === 'Antarctic') return 'starfall';
  if (subregion === 'Eastern Asia') return 'shrine';
  if (country.landlocked) return 'walled';
  if (!country.borders?.length) return 'sky'; // island nations
  if (subregion === 'Northern Europe') return 'starfall';
  if (region === 'Europe') return 'azure';
  if (subregion === 'South-Eastern Asia' || subregion === 'Southern Asia') return 'blossom';
  if (region === 'Americas') return 'meadow';
  if (region === 'Oceania') return 'sky';
  if (region === 'Asia' || region === 'Africa') return 'frontier';
  return 'azure';
}

export function getRanges(countries) {
  const positive = (pick) => countries.map(pick).filter((v) => v > 0);
  const pops = positive((c) => c.population);
  const areas = positive((c) => c.area);
  return {
    population: { min: Math.min(...pops), max: Math.max(...pops) },
    area: { min: Math.min(...areas), max: Math.max(...areas) },
  };
}

export function generateCharacter(country, countries, ranges = getRanges(countries)) {
  const byCode = new Map(countries.map((c) => [c.code, c]));
  const currencies = country.currencies ?? [];
  const allies = (country.borders ?? []).map((code) => byCode.get(code)).filter(Boolean);

  return {
    country,
    title: `${country.demonym ?? country.name} ${(CLASSES[country.region] ?? DEFAULT_CLASS).name}`,
    class: CLASSES[country.region] ?? DEFAULT_CLASS,
    rarity: rarityFor(country.population),
    worldKey: worldKeyFor(country),
    hp: toStat(country.population, ranges.population.min, ranges.population.max),
    defense: toStat(country.area, ranges.area.min, ranges.area.max),
    gold: goldFor(currencies),
    currencies,
    skills: country.languages ?? [],
    allies,
  };
}
