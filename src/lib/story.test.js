import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStory } from './story.js';

const character = (over = {}) => ({
  country: { name: 'France', capital: 'Paris', population: 69081996, blurb: 'France is a republic in Western Europe.' },
  gold: 470,
  title: 'French Knight',
  class: { name: 'Knight' },
  rarity: { name: 'Common' },
  hp: 827,
  defense: 803,
  skills: ['French'],
  allies: [{ name: 'Spain' }],
  ...over,
});
const world = { name: 'The Azure Realm', tagline: 'Castle towns.' };
const origin = (over = {}) => ({
  title: 'Frieren',
  score: 9.25,
  synopsis: 'During their decade-long quest to defeat the Demon King, the party forged bonds. Then more happened.',
  form: { name: 'Fern' },
  villain: { name: 'Aura', image: 'x', rival: false },
  ...over,
});

test('the story names the country, the anime, the form and the villain', () => {
  const story = buildStory(character(), world, origin());
  const all = JSON.stringify(story);
  for (const word of ['France', 'Paris', 'Frieren', 'Fern', 'Aura', 'Spain', 'The Azure Realm']) assert.ok(all.includes(word), word);
  assert.ok(all.includes('69.1 million people'));
  assert.equal(story.secondChoice[0].id, 'ally');
  for (const option of [...story.firstChoice, ...story.secondChoice]) assert.ok(story.reactions[option.id], option.id);
});

test('islands get a different choice, rivals become shadows, missing villains still work', () => {
  const island = buildStory(character({ allies: [], skills: [] }), world, origin({ villain: { name: 'Nanachi', rival: true } }));
  assert.equal(island.secondChoice[0].id, 'sea');
  assert.equal(island.foe, 'Shadow of Nanachi');
  assert.equal(buildStory(character(), world, origin({ villain: null, form: null })).foe, 'the Nameless Shadow');
});
