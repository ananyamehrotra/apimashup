// Story mode: the short tale and boss fight that follow a reincarnation.
// Everything is built from the country (place names, language, allies, stats)
// and the anime (past-life form, villain, how strong the villain is).

import { foeName } from './combat.js';

const firstSentence = (text) => {
  const clean = (text ?? '').replace(/\[Written by MAL Rewrite\]/gi, '').replace(/\s+/g, ' ').trim();
  const match = clean.match(/^.{40,220}?[.!?](?=\s|$)/);
  return match ? match[0] : clean.slice(0, 160);
};

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

  return {
    villain,
    foe,
    opening: [
      { text: `You open your eyes beneath an unfamiliar sky. This is ${world.name}. ${world.tagline}` },
      {
        text: `Yet the banners overhead are ones you somehow know. This land is ${country.name}.${
          tongue ? ` In ${capital}, people greet you in ${tongue}, and you understand every word.` : ''
        }`,
      },
      { speaker: 'System', text: `Soul registered. Class: ${character.title}. Rarity: ${character.rarity.name}.` },
      {
        portrait: 'hero',
        text: `Memories of another life drift back. You were ${form}, of ${origin.title}. ${firstSentence(origin.synopsis)}`,
      },
      { text: `That life is over. This one begins now. How will you spend your first days in ${country.name}?` },
    ],
    firstChoice: [
      { id: 'train', label: `Train with the ${character.class.name}s of ${capital}`, effect: '+5 Attack' },
      { id: 'study', label: tongue ? `Study the old ${tongue} spellbooks` : 'Study the old spellbooks', effect: '+1 starting AP, +10% critical' },
      { id: 'feast', label: `Feast with the people of ${capital}`, effect: '+25 Max HP' },
    ],
    rising: [
      { text: `Peace does not last. Over ${capital} the sky tears open like paper, and something steps through.` },
      {
        portrait: 'villain',
        text: villain.rival
          ? `It wears the face of ${villain.name}, someone you knew in ${origin.title}. But the eyes are hollow. A shadow has followed your soul across worlds.`
          : `${villain.name}. You know that face from ${origin.title}. The truck was not the only thing that crossed over.`,
      },
      {
        speaker: foe,
        portrait: 'villain',
        text: `“So this is where you ran to, ${form}. ${country.name} will fall, just like the world you left behind.”`,
      },
      {
        text: `${
          ally
            ? `Across the border, ${ally.name} has seen the sky break too.`
            : `${country.name} stands alone, with no neighbours to call on.`
        } You have one night to prepare.`,
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
      { portrait: 'villain', speaker: foe, text: '“Impossible… in a world that was never even yours…”' },
      { text: `${foe} breaks apart into light. The tear in the sky above ${capital} closes.` },
      { speaker: 'System', text: `Quest complete. Title obtained: Saviour of ${country.name}.` },
    ],
    defeat: [
      { portrait: 'villain', speaker: foe, text: `“Is that all, ${form}? Then ${country.name} is mine.”` },
      { text: 'Your vision fades. Somewhere far away, a truck horn sounds.' },
      { speaker: 'System', text: 'You have fallen. But a soul that crossed worlds once can stand up again.' },
    ],
  };
}
