const express = require('express');
const router = express.Router();
const { ApiError, asyncHandler } = require('../utils/errors');
const { formatStatRaw } = require('../utils/format');
const battleService = require('../services/battle');
const destinyService = require('../services/destiny');

async function getFighterCard(cca3, reroll = 0) {
  let country, stats, raw, classDef, traits;

  try {
    const restCountries = require('../services/restCountries');
    const statsService = require('../services/stats');
    const classesService = require('../services/classes');

    country = restCountries.getByCca3(cca3);
    if (!country) throw new ApiError(404, 'NOT_FOUND', `Country '${cca3}' not found`);

    const computed = statsService.getStatsForCountry(country, reroll);
    stats = computed.stats;
    raw = computed.raw;
    classDef = classesService.getClassForStats(stats, country);
    traits = computed.traits;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Standalone fallback for testing before Person A finishes
    country = {
      cca3: cca3.toUpperCase(),
      name: cca3.toUpperCase() === 'CHE' ? 'Switzerland' : (cca3.toUpperCase() === 'IND' ? 'India' : cca3),
      flag: `https://flagcdn.com/${cca3.toLowerCase().slice(0, 2)}.svg`,
      population: cca3.toUpperCase() === 'IND' ? 1428627663 : 8654622,
      area: cca3.toUpperCase() === 'IND' ? 3287263 : 41284,
      languages: ['French', 'German'],
      timezones: ['UTC+1'],
      borders: ['FRA', 'DEU', 'ITA', 'AUT'],
      landlocked: cca3.toUpperCase() === 'CHE',
    };
    stats = { HP: 52, DEF: 31, MP: 98, SPD: 12, CHA: 71, LUK: 77 };
    raw = { HP: country.population, DEF: country.area, MP: 4, SPD: 1, CHA: 5, LUK: 77 };
    classDef = { id: 'archmage', name: 'Archmage', icon: '🔮', genres: [10, 37] };
  }

  const effectiveRaw = battleService.applyTraits(
    stats,
    raw,
    country.landlocked,
    (country.borders || []).length,
    (country.languages || []).length,
    country.population,
    country.area
  );

  const destinyRes = await destinyService.pickDestiny(classDef, reroll);

  return {
    cca3: country.cca3,
    name: country.name,
    flag: country.flag,
    portrait: destinyRes?.form?.image || destinyRes?.anime?.image || country.flag,
    formName: destinyRes?.form?.name || destinyRes?.anime?.title || 'Unknown Hero',
    class: {
      id: classDef.id,
      icon: classDef.icon,
      name: classDef.name
    },
    rarity: 'SR',
    stats,
    raw,
    effectiveRaw,
    display: {
      HP: formatStatRaw('HP', effectiveRaw.HP),
      DEF: formatStatRaw('DEF', effectiveRaw.DEF),
      MP: formatStatRaw('MP', effectiveRaw.MP),
      SPD: formatStatRaw('SPD', effectiveRaw.SPD),
      CHA: formatStatRaw('CHA', effectiveRaw.CHA),
      LUK: formatStatRaw('LUK', effectiveRaw.LUK)
    }
  };
}

router.get('/', asyncHandler(async (req, res) => {
  const { a, b, ra = 0, rb = 0 } = req.query;

  if (!a || !b) {
    throw new ApiError(400, 'BAD_REQUEST', 'Parameters "a" and "b" (cca3 codes) are required.');
  }

  if (a.toUpperCase() === b.toUpperCase()) {
    throw new ApiError(400, 'BAD_REQUEST', 'Fighter A and Fighter B cannot be the same country.');
  }

  const fighterA = await getFighterCard(a.toUpperCase(), parseInt(ra, 10));
  const fighterB = await getFighterCard(b.toUpperCase(), parseInt(rb, 10));

  const battleResult = battleService.buildBattle(fighterA, fighterB);

  res.setHeader('X-Cache', 'MISS');
  res.json(battleResult);
}));

module.exports = router;
