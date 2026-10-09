// Story mode: the short tale and boss fight that follow a reincarnation.
// Everything is built from the country (place names, language, allies, stats)
// and the anime (past-life form, villain, how strong the villain is).

import { foeName } from './combat.js';

const firstSentence = (text) => {
  const clean = (text ?? '').replace(/\[Written by MAL Rewrite\]/gi, '').replace(/\s+/g, ' ').trim();
  const match = clean.match(/^.{40,220}?[.!?](?=\s|$)/);
  return match ? match[0] : clean.slice(0, 160);
};

const PEOPLE = new Intl.NumberFormat('en', { notation: 'compact', compactDisplay: 'long', maximumFractionDigits: 1 });

const NAMELESS = { id: null, name: 'the Nameless Shadow', image: null, rival: false };

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
      { id: 'study', label: tongue ? `Study the old ${tongue} spellbooks` : 'Study the old spellbooks', effect: '+1 starting AP, +10% critical' },
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
