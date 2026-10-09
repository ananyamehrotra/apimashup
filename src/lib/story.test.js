import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStory, createBattle, intentFor, takeTurn } from './story.js';

const character = (over = {}) => ({
  country: { name: 'France', capital: 'Paris' },
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
const fixed = (value) => () => value;

test('the story names the country, the anime, the form and the villain', () => {
  const story = buildStory(character(), world, origin());
  const all = JSON.stringify(story);
  for (const word of ['France', 'Paris', 'Frieren', 'Fern', 'Aura', 'Spain', 'The Azure Realm']) assert.ok(all.includes(word), word);
  assert.equal(story.secondChoice[0].id, 'ally');
});

test('islands get a different choice, rivals become shadows, missing villains still work', () => {
  const island = buildStory(character({ allies: [], skills: [] }), world, origin({ villain: { name: 'Nanachi', rival: true } }));
  assert.equal(island.secondChoice[0].id, 'sea');
  assert.equal(island.foe, 'Shadow of Nanachi');
  assert.equal(buildStory(character(), world, origin({ villain: null, form: null })).foe, 'the Nameless Shadow');
});

test('battle stats come from the country and the anime score, and picks apply', () => {
  const base = createBattle(character(), origin());
  assert.equal(base.hero.maxHp, 70 + Math.round((827 / 999) * 50));
  assert.equal(base.hero.armor, 3);
  assert.equal(base.foe.maxHp, 157);
  assert.equal(base.foe.atk, 18);
  const weak = createBattle(character(), origin({ score: 7 }));
  assert.ok(weak.foe.maxHp < base.foe.maxHp);
  const buffed = createBattle(character(), origin(), ['train', 'ally']);
  assert.equal(buffed.hero.atk, 20);
  assert.equal(buffed.hero.allyReady, true);
});

test('every third villain move is heavy, and guarding blunts it', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(intentFor), ['strike', 'strike', 'heavy', 'strike', 'strike', 'heavy']);
  const start = { ...createBattle(character(), origin()), turn: 2 };
  const open = takeTurn(start, 'attack', fixed(0.5)).foeEvent;
  const guarded = takeTurn(start, 'guard', fixed(0.5)).foeEvent;
  assert.equal(open.kind, 'heavy');
  assert.ok(guarded.damage < open.damage / 2);
});

test('skills spend charges, the ally works once, and fights end', () => {
  let state = createBattle(character(), origin(), ['ally']);
  const charges = state.hero.charges;
  state = takeTurn(state, 'skill', fixed(0.5)).end;
  assert.equal(state.hero.charges, charges - 1);
  state = takeTurn(state, 'ally', fixed(0.5)).end;
  assert.equal(state.hero.allyReady, false);
  assert.equal(takeTurn(state, 'ally', fixed(0.5)).heroEvent.kind, 'attack'); // falls back to a plain attack

  // guarding the heavy turns and attacking otherwise wins this matchup
  let fight = createBattle(character(), origin(), ['train', 'ally']);
  for (let i = 0; i < 40 && !fight.outcome; i++) {
    const action = intentFor(fight.turn) === 'heavy' ? 'guard' : fight.hero.charges ? 'skill' : fight.hero.allyReady ? 'ally' : 'attack';
    fight = takeTurn(fight, action, fixed(0.5)).end;
  }
  assert.equal(fight.outcome, 'victory');

  // never guarding against a strong villain loses
  let reckless = createBattle(character({ hp: 100, defense: 100 }), origin());
  for (let i = 0; i < 40 && !reckless.outcome; i++) reckless = takeTurn(reckless, 'attack', fixed(0.5)).end;
  assert.equal(reckless.outcome, 'defeat');
});
