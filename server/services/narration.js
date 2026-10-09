const { formatStatRaw } = require('../utils/format');
const { createRng } = require('../utils/rng');

const TEMPLATES = {
  HP: [
    'ULTIMATE MOVE: {va}!',
    '{A} SUMMONS A HORDE OF {va}!',
    'LEGION BARRAGE: {va} MARCH FORTH!'
  ],
  DEF: [
    'ABSOLUTE TERRITORY: {va} OF IRON WILL!',
    "{A}'S BORDERS STRETCH {va}. THE ATTACK CANNOT REACH!",
    'IMPERVIOUS SHIELD: {va} DEFIES ALL ASSAULTS!'
  ],
  MP: [
    'FORBIDDEN CHANT IN {va}!',
    'POLYGLOT BARRAGE: {va} AT ONCE!',
    'ARCANA UNLEASHED THROUGH {va}!'
  ],
  SPD: [
    'TIME-SKIP ACROSS {va}!',
    '{A} MOVES BEFORE THE SUN RISES: {va} OF SPEED!',
    'LIGHTNING STRIDE ACROSS {va}!'
  ],
  CHA: [
    'SUMMON {va}!',
    'FRIENDSHIP POWER WRAPPED AROUND {va}!',
    "ALLIANCE PACT: {va} STAND AT {A}'S BACK!"
  ],
  LUK: [
    'FATE ROLLS {va}. DESTINY SMILES ON {A}!',
    'MIRACLE PROJECTION: {va} LUCK REROUTES REALITY!',
    'THE DICE LAND ON {va}. DIVINE GRACE!'
  ]
};

function generateNarration(statKey, fighterA, fighterB, winner, margin, seedStr) {
  const rng = createRng(`narration:${statKey}:${seedStr}`);

  if (winner === 'draw') {
    return {
      line: 'THE CLASH SHAKES THE HEAVENS… A DRAW!',
      subline: 'Neither realm yields a single step.'
    };
  }

  const winnerFighter = winner === 'a' ? fighterA : fighterB;
  const loserFighter = winner === 'a' ? fighterB : fighterA;
  const va = formatStatRaw(statKey, winnerFighter.effectiveRaw[statKey]);

  const list = TEMPLATES[statKey] || TEMPLATES.HP;
  const templateIdx = Math.floor(rng() * list.length);
  let line = list[templateIdx]
    .replace(/{va}/g, va)
    .replace(/{A}/g, winnerFighter.name.toUpperCase());

  let subline = null;
  if (margin < 0.05) {
    line = `…IT'S NEARLY A DRAW, BUT ${winnerFighter.name.toUpperCase()} HOLDS!`;
    subline = `${loserFighter.name} fell short by the narrowest margin.`;
  } else if (margin > 0.9) {
    subline = `${loserFighter.name.toUpperCase()} WAS NEVER IN THIS FIGHT.`;
  }

  return { line, subline };
}

module.exports = { generateNarration };
