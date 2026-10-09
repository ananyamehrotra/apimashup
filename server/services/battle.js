const { formatStatRaw } = require('../utils/format');
const { generateNarration } = require('./narration');

function applyTraits(stats, raw, landlocked, borderCount, langCount, population, area) {
  const effectiveRaw = { ...raw };

  // Traits modifier logic:
  // landlocked -> DEF raw * 1.1
  if (landlocked) effectiveRaw.DEF = Math.round(effectiveRaw.DEF * 1.1);
  // borders === 0 -> SPD raw + 1
  if (borderCount === 0) effectiveRaw.SPD = effectiveRaw.SPD + 1;
  // languages >= 3 -> MP raw + 1
  if (langCount >= 3) effectiveRaw.MP = effectiveRaw.MP + 1;
  // population > 100M -> HP raw * 1.1
  if (population > 100000000) effectiveRaw.HP = Math.round(effectiveRaw.HP * 1.1);
  // area < 1000 -> LUK + 15
  if (area < 1000) effectiveRaw.LUK = Math.min(99, effectiveRaw.LUK + 15);

  return effectiveRaw;
}

function buildBattle(cardA, cardB) {
  const statsKeys = ['HP', 'DEF', 'MP', 'SPD', 'CHA', 'LUK'];
  const matchups = {};

  statsKeys.forEach(stat => {
    const va = cardA.effectiveRaw[stat];
    const vb = cardB.effectiveRaw[stat];

    let winner = 'draw';
    if (va > vb) winner = 'a';
    else if (vb > va) winner = 'b';
    else {
      // Tie breaker by LUK
      if (cardA.effectiveRaw.LUK > cardB.effectiveRaw.LUK) winner = 'a';
      else if (cardB.effectiveRaw.LUK > cardA.effectiveRaw.LUK) winner = 'b';
    }

    const maxVal = Math.max(va, vb, 1);
    const margin = Math.abs(va - vb) / maxVal;

    const seedStr = `${cardA.cca3}:${cardB.cca3}:${stat}`;
    const { line, subline } = generateNarration(stat, cardA, cardB, winner, margin, seedStr);

    matchups[stat] = {
      a: va,
      b: vb,
      winner,
      margin: parseFloat(margin.toFixed(2)),
      line,
      subline
    };
  });

  // Calculate AI order (sorted by highest percentile stat in cards)
  const aiOrderA = [...statsKeys].sort((s1, s2) => cardA.stats[s2] - cardA.stats[s1]);
  const aiOrderB = [...statsKeys].sort((s1, s2) => cardB.stats[s2] - cardB.stats[s1]);

  return {
    a: cardA,
    b: cardB,
    matchups,
    aiOrder: {
      a: aiOrderA,
      b: aiOrderB
    },
    rules: {
      roundsToWin: 3,
      noRepeatStats: true,
      winnerPicksNext: true
    }
  };
}

module.exports = { buildBattle, applyTraits };
