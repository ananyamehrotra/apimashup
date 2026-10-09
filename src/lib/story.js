// Story mode: the short tale and boss fight that follow a reincarnation.
// Everything is built from the country (place names, language, allies, stats)
// and the anime (past-life form, villain, how strong the villain is).

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const firstSentence = (text) => {
  const clean = (text ?? '').replace(/\[Written by MAL Rewrite\]/gi, '').replace(/\s+/g, ' ').trim();
  const match = clean.match(/^.{40,220}?[.!?](?=\s|$)/);
  return match ? match[0] : clean.slice(0, 160);
};

const PEOPLE = new Intl.NumberFormat('en', { notation: 'compact', compactDisplay: 'long', maximumFractionDigits: 1 });

const NAMELESS = { id: null, name: 'the Nameless Shadow', image: null, rival: false };

// A "rival" is a non-villain character, so the story casts a shadow in their shape.
export const foeName = (villain) => (villain.rival ? `Shadow of ${villain.name}` : villain.name);

/* ---------- the tale ---------- */

export function buildStory(character, world, origin) {
  const { country } = character;
  const villain = origin.villain ?? NAMELESS;
  const foe = foeName(villain);
  const form = origin.form?.name ?? 'a nameless wanderer';
  const capital = country.capital ?? `the heart of ${country.name}`;
  const tongue = character.skills[0] ?? null;
  const ally = character.allies[0] ?? null;
  const people = country.population ? `${PEOPLE.format(country.population)} people` : 'its few scattered souls';
  const memory = firstSentence(origin.synopsis);

  return {
    villain,
    foe,
    opening: [
      { text: `Cold grass. Warm light. You open your eyes beneath a sky you have never seen. This is ${world.name}. ${world.tagline}` },
      { text: `But the banners along the road are ones you somehow recognise. In this world, the land is called ${country.name}.` },
      country.blurb ? { text: `An old map lies in the dust beside you. Its faded ink reads: ${country.blurb}` } : null,
      {
        text: tongue
          ? `In ${capital}, a stranger greets you in ${tongue}. You have never studied it, yet every word is clear. Around you, ${people} go about their day, unaware that a hero has arrived.`
          : `You walk into ${capital}. Around you, ${people} go about their day, unaware that a hero has arrived.`,
      },
      { speaker: 'System', text: `Soul registered. Class: ${character.title}. Rarity: ${character.rarity.name}. Starting gold: ${character.gold}.` },
      { portrait: 'hero', text: `Then the memories return. In your last life you were ${form}, of ${origin.title}.${memory ? ` ${memory}` : ''}` },
      { text: `That story ended beneath the wheels of a truck. This one is yours to write. How will you spend your first days in ${country.name}?` },
    ].filter(Boolean),
    firstChoice: [
      { id: 'train', label: `Train with the ${character.class.name}s of ${capital}`, effect: '+5 Attack' },
      { id: 'study', label: tongue ? `Study the old ${tongue} spellbooks` : 'Study the old spellbooks', effect: '+1 Skill charge, +10% critical' },
      { id: 'feast', label: `Feast with the people of ${capital}`, effect: '+25 Max HP' },
    ],
    // One line of story for each choice, told right after it is made.
    reactions: {
      train: `For weeks you train with the ${character.class.name}s of ${capital} until your arms ache. Your strikes land harder now.`,
      study: `Night after night you read ${tongue ?? 'forgotten'} spellbooks by candlelight. The words begin to answer when you call.`,
      feast: `The people of ${capital} feed you until you can barely stand. You have never felt so alive, or so welcome.`,
      ally: `Your riders reach ${ally?.name ?? 'the border'} by dawn. A horn answers from across the hills. They will come when you call.`,
      sea: 'You stand at the edge of your homeland and breathe it in. Its strength settles into your bones.',
      alone: 'You sit alone through the night, blade across your knees, until nothing is left in you but resolve.',
      ward: `You wake the old wards of ${capital}. Pale light rises around the walls like a held breath.`,
    },
    rising: [
      { text: `Peace does not last. One evening the sky above ${capital} splits like torn paper, and every bird falls silent.` },
      {
        portrait: 'villain',
        text: villain.rival
          ? `Something steps through. It wears the face of ${villain.name}, someone you knew in ${origin.title}. But the eyes are hollow. A shadow has followed your soul across worlds.`
          : `Something steps through. ${villain.name}. You know that face from ${origin.title}. The truck was not the only thing that crossed over.`,
      },
      { speaker: foe, portrait: 'villain', text: `“So this is where you ran to, ${form}. Did you think dying would free you from me?”` },
      { speaker: foe, portrait: 'villain', text: `“I will take ${country.name} the way I took everything else. Its people will kneel, or burn.”` },
      {
        text: `${
          ally ? `Across the border, ${ally.name} has seen the sky break too.` : `${country.name} stands alone, with no neighbours to call on.`
        } The enemy will strike at dawn. You have one night to prepare.`,
      },
    ],
    secondChoice: [
      ally
        ? { id: 'ally', label: `Send riders to your ally, ${ally.name}`, effect: 'Ally strike, once per battle' }
        : { id: 'sea', label: 'Draw strength from your homeland', effect: '+20 Max HP' },
      { id: 'alone', label: 'Sharpen your resolve alone', effect: '+15% critical' },
      { id: 'ward', label: `Raise the wards of ${capital}`, effect: 'Guard blocks almost everything' },
    ],
    victory: [
      { portrait: 'villain', speaker: foe, text: '“Impossible… this world was never even yours…”' },
      { text: `${foe} breaks apart into drifting light. Above ${capital}, the torn sky knits itself closed.` },
      { text: `By morning, all of ${country.name} knows your name. They do not call you ${form} here. They call you the ${character.title}.` },
      { speaker: 'System', text: `Quest complete. Title obtained: Saviour of ${country.name}.` },
    ],
    defeat: [
      { portrait: 'villain', speaker: foe, text: `“Is that all, ${form}? Then ${country.name} is mine.”` },
      { text: 'Your knees give way. The world dims. Somewhere far away, a truck horn sounds.' },
      { speaker: 'System', text: 'You have fallen. But a soul that crossed worlds once can stand up again.' },
    ],
  };
}

/* ---------- the boss fight ---------- */

const RARITY_CRIT = { Legendary: 0.2, Epic: 0.12, Rare: 0.06 };
const HEAVY_EVERY = 3; // the villain's third move is always a telegraphed heavy attack
const GUARD_HEAL = 8;
const ALLY_DAMAGE = 24;
const ALLY_HEAL = 15;

const PICKS = {
  train: (hero) => ({ ...hero, atk: hero.atk + 5 }),
  study: (hero) => ({ ...hero, charges: hero.charges + 1, crit: hero.crit + 0.1 }),
  feast: (hero) => ({ ...hero, maxHp: hero.maxHp + 25 }),
  sea: (hero) => ({ ...hero, maxHp: hero.maxHp + 20 }),
  alone: (hero) => ({ ...hero, crit: hero.crit + 0.15 }),
  ward: (hero) => ({ ...hero, guardBlock: 0.92 }),
  ally: (hero) => ({ ...hero, allyReady: true }),
};

export const intentFor = (turn) => (turn % HEAVY_EVERY === HEAVY_EVERY - 1 ? 'heavy' : 'strike');

// HP and armour come from the country's stats; the villain scales with the anime's score.
export function createBattle(character, origin, picks = []) {
  const villain = origin.villain ?? NAMELESS;
  let hero = {
    name: origin.form?.name ?? character.title,
    maxHp: 70 + Math.round((character.hp / 999) * 50),
    atk: 15,
    armor: Math.round((character.defense / 999) * 4),
    crit: 0.12 + (RARITY_CRIT[character.rarity.name] ?? 0),
    charges: clamp(character.skills.length, 1, 3) + 1,
    guardBlock: 0.7,
    allyReady: false,
    allyName: character.allies[0]?.name ?? null,
    skills: character.skills.length ? character.skills : ['Ancient'],
  };
  for (const pick of picks) hero = PICKS[pick]?.(hero) ?? hero;

  const score = clamp(origin.score ?? 7.5, 6, 9.5);
  const foe = { name: foeName(villain), maxHp: Math.round(108 + (score - 6) * 15), atk: Math.round(13 + (score - 6) * 1.5) };

  return { hero: { ...hero, hp: hero.maxHp }, foe: { ...foe, hp: foe.maxHp }, turn: 0, outcome: null };
}

// One full turn: the hero acts, then the villain. Returns the state after each
// half (so the UI can animate them in order) and a line of text for each.
export function takeTurn(state, action, rng = Math.random) {
  if (state.outcome) return { mid: state, end: state, heroEvent: null, foeEvent: null };
  const hero = { ...state.hero };
  const foe = { ...state.foe };
  const roll = (spread) => Math.floor(rng() * (spread + 1));
  let heroEvent;

  if (action === 'skill' && hero.charges > 0) {
    const skill = hero.skills[(hero.charges - 1) % hero.skills.length];
    const damage = Math.round(hero.atk * 1.8) + roll(6);
    hero.charges -= 1;
    foe.hp = Math.max(0, foe.hp - damage);
    heroEvent = { kind: 'skill', damage, text: `You chant in ${skill}. The spell tears into ${foe.name} for ${damage}!` };
  } else if (action === 'ally' && hero.allyReady) {
    hero.allyReady = false;
    foe.hp = Math.max(0, foe.hp - ALLY_DAMAGE);
    hero.hp = Math.min(hero.maxHp, hero.hp + ALLY_HEAL);
    heroEvent = { kind: 'ally', damage: ALLY_DAMAGE, heal: ALLY_HEAL, text: `${hero.allyName} answers your call! ${ALLY_DAMAGE} damage, and you recover ${ALLY_HEAL} HP.` };
  } else if (action === 'guard') {
    hero.hp = Math.min(hero.maxHp, hero.hp + GUARD_HEAL);
    heroEvent = { kind: 'guard', heal: GUARD_HEAL, text: `You brace yourself and steady your breathing. +${GUARD_HEAL} HP.` };
  } else {
    const crit = rng() < hero.crit;
    const damage = Math.round((hero.atk + roll(5)) * (crit ? 1.7 : 1));
    foe.hp = Math.max(0, foe.hp - damage);
    heroEvent = { kind: 'attack', damage, crit, text: crit ? `Critical hit! You strike ${foe.name} for ${damage}!` : `You strike ${foe.name} for ${damage}.` };
  }

  const mid = { hero: { ...hero }, foe: { ...foe }, turn: state.turn, outcome: foe.hp === 0 ? 'victory' : null };
  if (mid.outcome) return { mid, end: mid, heroEvent, foeEvent: null };

  const intent = intentFor(state.turn);
  const guarding = heroEvent.kind === 'guard';
  const raw = intent === 'heavy' ? Math.round(foe.atk * 2.4) : foe.atk + roll(4) - 2;
  const damage = Math.max(1, Math.round((raw - hero.armor) * (guarding ? 1 - hero.guardBlock : 1)));
  hero.hp = Math.max(0, hero.hp - damage);
  const foeEvent = {
    kind: intent,
    damage,
    guarded: guarding,
    text:
      intent === 'heavy'
        ? `${foe.name} unleashes everything! ${guarding ? `Your guard holds. Only ${damage} gets through.` : `You take ${damage}!`}`
        : `${foe.name} attacks${guarding ? ` your guard for ${damage}` : ` for ${damage}`}.`,
  };
  const end = { hero, foe, turn: state.turn + 1, outcome: hero.hp === 0 ? 'defeat' : null };
  return { mid, end, heroEvent, foeEvent };
}
