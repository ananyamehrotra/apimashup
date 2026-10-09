// The turn-based boss fight. Pure rules, no UI: StoryMode and Battle.jsx only render what happens here.
//
// Resources
//   HP     – yours and the villain's.
//   AP     – action points (0 to 6). Attacks and guarding build them; special attacks spend them.
//   Break  – the villain's stagger gauge. Everything you do fills it; when it is full the villain is
//            stunned (it loses its next move) and takes +50% damage on your next action.
//
// The villain telegraphs its next move: Strike, Flurry (three light hits) or Heavy, in that order
// every three turns. Guarding blunts every hit of the move it is used against.

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const AP_MAX = 6;
export const AP_START = 2;
const GUARD_HEAL = 8;
const ALLY_DAMAGE = 24;
const ALLY_HEAL = 15;
const ALLY_BREAK = 15;
const STAGGER_BONUS = 1.5;
const ATTACK_BREAK = 10;
const RARITY_CRIT = { Legendary: 0.2, Epic: 0.12, Rare: 0.06 };

export const foeName = (villain) => (villain.rival ? `Shadow of ${villain.name}` : villain.name);
const NAMELESS = { id: null, name: 'the Nameless Shadow', image: null, rival: false };

/* ---------- special attacks ---------- */

// Three specials per class: a quick one, a multi-hit one and a finisher.
const TIERS = [
  { cost: 2, hits: 1, mult: 1.9, brk: 18 },
  { cost: 3, hits: 3, mult: 2.8, brk: 26 },
  { cost: 5, hits: 2, mult: 4.8, brk: 50 },
];
// [name, slash animation]: slash · cross · flurry · pierce · burst
const MOVES = {
  Knight: [['Rising Slash', 'slash'], ['Shield Crash', 'burst'], ['Dawn Cleave', 'cross']],
  Monk: [['Palm Strike', 'burst'], ['Hundred Fists', 'flurry'], ["Heaven's Gate", 'cross']],
  Shaman: [['Spirit Bolt', 'pierce'], ['Hex of Thorns', 'flurry'], ["Ancestors' Wrath", 'burst']],
  Ranger: [['Piercing Shot', 'pierce'], ['Rain of Arrows', 'flurry'], ["Eagle's Verdict", 'cross']],
  Navigator: [['Tide Cut', 'slash'], ['Riptide', 'flurry'], ['Maelstrom', 'burst']],
  'Frost Mage': [['Ice Shard', 'pierce'], ['Blizzard', 'flurry'], ['Absolute Zero', 'burst']],
  Wanderer: [['Hard Strike', 'slash'], ['Quick Flurry', 'flurry'], ['Last Stand', 'cross']],
};

export const specialsFor = (className) =>
  (MOVES[className] ?? MOVES.Wanderer).map(([name, fx], i) => ({ id: `s${i + 1}`, name, fx, ...TIERS[i] }));

/* ---------- the villain's moves ---------- */

const INTENTS = ['strike', 'flurry', 'heavy'];
export const intentFor = (turn) => INTENTS[turn % INTENTS.length];
export const INTENT_INFO = {
  strike: { label: 'Strike', hits: 1 },
  flurry: { label: 'Flurry', hits: 3 },
  heavy: { label: 'Heavy attack', hits: 1 },
};

/* ---------- setup ---------- */

const PICKS = {
  train: (hero) => ({ ...hero, atk: hero.atk + 5 }),
  study: (hero) => ({ ...hero, ap: hero.ap + 1, crit: hero.crit + 0.1 }),
  feast: (hero) => ({ ...hero, maxHp: hero.maxHp + 25 }),
  sea: (hero) => ({ ...hero, maxHp: hero.maxHp + 20 }),
  alone: (hero) => ({ ...hero, crit: hero.crit + 0.15 }),
  ward: (hero) => ({ ...hero, guardBlock: 0.92 }),
  ally: (hero) => ({ ...hero, allyReady: true }),
};

// HP and armour come from the country's stats; the villain scales with the anime's score.
export function createBattle(character, origin, picks = []) {
  const villain = origin.villain ?? NAMELESS;
  let hero = {
    name: origin.form?.name ?? character.title,
    maxHp: 70 + Math.round((character.hp / 999) * 50),
    atk: 15,
    armor: Math.round((character.defense / 999) * 4),
    crit: 0.12 + (RARITY_CRIT[character.rarity.name] ?? 0),
    ap: AP_START,
    maxAp: AP_MAX,
    guardBlock: 0.7,
    allyReady: false,
    allyName: character.allies[0]?.name ?? null,
    specials: specialsFor(character.class?.name),
  };
  for (const pick of picks) hero = PICKS[pick]?.(hero) ?? hero;

  const score = clamp(origin.score ?? 7.5, 6, 9.5);
  const maxHp = Math.round(108 + (score - 6) * 15);
  const foe = {
    name: foeName(villain),
    maxHp,
    atk: Math.round(13 + (score - 6) * 1.5),
    brk: 0,
    brkMax: Math.round(maxHp * 0.4),
    stagger: 0, // >0 while stunned: 2 = loses its next move, then 1 = still takes bonus damage
  };
  return { hero: { ...hero, hp: hero.maxHp }, foe: { ...foe, hp: foe.maxHp }, turn: 0, outcome: null };
}

/* ---------- a turn ---------- */

// Splits a total across n hits (the last one takes the remainder).
const split = (total, n) => Array.from({ length: n }, (_, i) => Math.floor(total / n) + (i === n - 1 ? total % n : 0));

// One full turn: the hero acts, then the villain. Returns the state after each half so the UI can
// animate them in order, plus an event for each half describing every hit.
// action: 'attack' | 'guard' | 'ally' | 's1' | 's2' | 's3'. An action you cannot afford becomes an attack.
export function takeTurn(state, action, rng = Math.random) {
  if (state.outcome) return { mid: state, end: state, heroEvent: null, foeEvent: null };
  const hero = { ...state.hero };
  const foe = { ...state.foe };
  const roll = (spread) => Math.floor(rng() * (spread + 1));
  const bonus = foe.stagger > 0 ? STAGGER_BONUS : 1;
  const special = hero.specials.find((s) => s.id === action);
  let heroEvent;

  if (special && hero.ap >= special.cost) {
    const crit = rng() < hero.crit;
    const total = Math.round((hero.atk * special.mult + roll(6)) * (crit ? 1.5 : 1) * bonus);
    const hits = split(total, special.hits);
    hero.ap -= special.cost;
    foe.hp = Math.max(0, foe.hp - total);
    if (!foe.stagger) foe.brk += special.brk;
    heroEvent = {
      kind: 'special', special, fx: special.fx, name: special.name, hits, damage: total, crit, apGain: -special.cost,
      text: `${special.name}! ${hits.length > 1 ? `${hits.length} hits for ${total} in all` : `${total} damage`}${crit ? ', critical' : ''}${bonus > 1 ? ', the villain is open' : ''}.`,
    };
  } else if (action === 'ally' && hero.allyReady) {
    hero.allyReady = false;
    foe.hp = Math.max(0, foe.hp - ALLY_DAMAGE);
    hero.hp = Math.min(hero.maxHp, hero.hp + ALLY_HEAL);
    if (!foe.stagger) foe.brk += ALLY_BREAK;
    heroEvent = { kind: 'ally', fx: 'burst', name: hero.allyName, hits: [ALLY_DAMAGE], damage: ALLY_DAMAGE, heal: ALLY_HEAL, apGain: 0, text: `${hero.allyName} answers your call! ${ALLY_DAMAGE} damage, and you recover ${ALLY_HEAL} HP.` };
  } else if (action === 'guard') {
    const healed = Math.min(hero.maxHp - hero.hp, GUARD_HEAL);
    hero.hp += healed;
    hero.ap = Math.min(hero.maxAp, hero.ap + 1);
    heroEvent = { kind: 'guard', hits: [], damage: 0, heal: healed, apGain: 1, text: `You brace yourself and steady your breathing. +${healed} HP, +1 AP.` };
  } else {
    const crit = rng() < hero.crit;
    const damage = Math.round((hero.atk + roll(5)) * (crit ? 1.7 : 1) * bonus);
    const gain = crit ? 2 : 1;
    foe.hp = Math.max(0, foe.hp - damage);
    hero.ap = Math.min(hero.maxAp, hero.ap + gain);
    if (!foe.stagger) foe.brk += ATTACK_BREAK;
    heroEvent = { kind: 'attack', fx: 'slash', name: 'Attack', hits: [damage], damage, crit, apGain: gain, text: crit ? `Critical hit! You strike for ${damage} and gain ${gain} AP.` : `You strike for ${damage}. +${gain} AP.` };
  }
  hero.ap = clamp(hero.ap, 0, hero.maxAp);

  // the break gauge fills; at full the villain is stunned
  if (foe.hp > 0 && !foe.stagger && foe.brk >= foe.brkMax) {
    foe.brk = foe.brkMax;
    foe.stagger = 2;
    heroEvent.broke = true;
    heroEvent.text += ' BREAK! The villain reels.';
  }

  const mid = { hero: { ...hero }, foe: { ...foe }, turn: state.turn, outcome: foe.hp === 0 ? 'victory' : null };
  if (mid.outcome) return { mid, end: mid, heroEvent, foeEvent: null };

  // the villain's move
  let foeEvent;
  if (foe.stagger > 0) {
    const skip = foe.stagger === 2;
    foe.stagger -= 1;
    if (foe.stagger === 0) foe.brk = 0;
    if (skip) foeEvent = { kind: 'stunned', hits: [], damage: 0, guarded: false, text: `${foe.name} is reeling and cannot act!` };
  }
  if (!foeEvent) {
    const intent = intentFor(state.turn);
    const guarding = heroEvent.kind === 'guard';
    const raws = intent === 'flurry'
      ? [0, 1, 2].map(() => Math.round(foe.atk * 0.55) + roll(2) - 1)
      : [intent === 'heavy' ? Math.round(foe.atk * 2.4) : foe.atk + roll(4) - 2];
    const hits = raws.map((raw) => Math.max(1, Math.round((raw - hero.armor) * (guarding ? 1 - hero.guardBlock : 1))));
    let left = hero.hp;
    const taken = hits.map((h) => { const dealt = Math.min(left, h); left -= dealt; return dealt; });
    hero.hp = left;
    const damage = taken.reduce((a, b) => a + b, 0);
    foeEvent = {
      kind: intent, hits: taken, damage, guarded: guarding,
      text:
        intent === 'heavy'
          ? `${foe.name} unleashes everything! ${guarding ? `Your guard holds. Only ${damage} gets through.` : `You take ${damage}!`}`
          : intent === 'flurry'
            ? `${foe.name} lashes out three times${guarding ? ` against your guard for ${damage}` : ` for ${damage}`}.`
            : `${foe.name} attacks${guarding ? ` your guard for ${damage}` : ` for ${damage}`}.`,
    };
  }
  const end = { hero, foe, turn: state.turn + 1, outcome: hero.hp === 0 ? 'defeat' : null };
  return { mid, end, heroEvent, foeEvent };
}

/* ---------- combo counter (for the fighting-game HUD) ---------- */

export const NO_COMBO = { hits: 0, damage: 0 };

// Hits you land chain into a combo. It keeps growing while the villain cannot answer (stunned) and ends
// the moment the villain strikes back. Guarding adds nothing and does not break the chain.
export function extendCombo(combo, heroEvent, foeEvent) {
  const landed = heroEvent?.hits?.length ? heroEvent : null;
  let next = landed ? { hits: combo.hits + landed.hits.length, damage: combo.damage + landed.damage } : combo;
  if (foeEvent && foeEvent.kind !== 'stunned') next = NO_COMBO; // the villain interrupts
  return next;
}
