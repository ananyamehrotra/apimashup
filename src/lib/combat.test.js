import test from 'node:test';
import assert from 'node:assert/strict';
import { AP_MAX, createBattle, intentFor, specialsFor, takeTurn } from './combat.js';

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
const origin = (over = {}) => ({ title: 'Frieren', score: 9.25, form: { name: 'Fern' }, villain: { name: 'Aura', image: 'x', rival: false }, ...over });
const fixed = (value) => () => value;
const sum = (list) => list.reduce((a, b) => a + b, 0);

test('battle stats come from the country and the anime score, and picks apply', () => {
  const base = createBattle(character(), origin());
  assert.equal(base.hero.maxHp, 70 + Math.round((827 / 999) * 50));
  assert.equal(base.hero.armor, 3);
  assert.equal(base.foe.maxHp, 157);
  assert.equal(base.foe.atk, 18);
  assert.equal(base.hero.ap, 2);
  assert.ok(createBattle(character(), origin({ score: 7 })).foe.maxHp < base.foe.maxHp);
  const buffed = createBattle(character(), origin(), ['train', 'ally', 'study']);
  assert.equal(buffed.hero.atk, 20);
  assert.equal(buffed.hero.allyReady, true);
  assert.equal(buffed.hero.ap, 3); // study: +1 starting AP
});

test('every class has three specials that get costlier and stronger, unknown classes fall back', () => {
  for (const name of ['Knight', 'Monk', 'Shaman', 'Ranger', 'Navigator', 'Frost Mage', 'Wanderer', 'Something Else']) {
    const specials = specialsFor(name);
    assert.equal(specials.length, 3, name);
    assert.deepEqual(specials.map((s) => s.cost), [2, 3, 5]);
    assert.ok(specials[2].mult > specials[0].mult);
    assert.ok(specials.every((s) => ['slash', 'cross', 'flurry', 'pierce', 'burst'].includes(s.fx)));
  }
  assert.notEqual(specialsFor('Knight')[0].name, specialsFor('Monk')[0].name);
});

test('attacking builds AP, specials spend it, and an unaffordable special becomes an attack', () => {
  let state = createBattle(character(), origin());
  const first = takeTurn(state, 'attack', fixed(0.99)); // no crit
  assert.equal(first.mid.hero.ap, 3);
  assert.equal(first.heroEvent.apGain, 1);

  state = { ...state, hero: { ...state.hero, ap: 1 } };
  assert.equal(takeTurn(state, 's1', fixed(0.99)).heroEvent.kind, 'attack'); // costs 2, has 1

  state = { ...state, hero: { ...state.hero, ap: 4 } };
  const used = takeTurn(state, 's2', fixed(0.99));
  assert.equal(used.heroEvent.kind, 'special');
  assert.equal(used.mid.hero.ap, 1); // 4 - 3

  const full = takeTurn({ ...state, hero: { ...state.hero, ap: AP_MAX } }, 'attack', fixed(0.99));
  assert.equal(full.mid.hero.ap, AP_MAX); // never above the cap
  assert.equal(takeTurn(state, 'guard', fixed(0.99)).mid.hero.ap, 5); // guard also gives +1 AP
});

test('crits grant an extra AP', () => {
  const state = createBattle(character(), origin());
  const crit = takeTurn(state, 'attack', fixed(0)); // always crit
  assert.equal(crit.heroEvent.crit, true);
  assert.equal(crit.heroEvent.apGain, 2);
});

test('a multi-hit special splits its total across the hits and hits harder than an attack', () => {
  const state = { ...createBattle(character(), origin()), hero: { ...createBattle(character(), origin()).hero, ap: 5 } };
  const flurry = takeTurn(state, 's2', fixed(0.99)).heroEvent;
  assert.equal(flurry.hits.length, 3);
  assert.equal(sum(flurry.hits), flurry.damage);
  assert.ok(flurry.damage > takeTurn(state, 'attack', fixed(0.99)).heroEvent.damage * 2);
  const finisher = takeTurn(state, 's3', fixed(0.99)).heroEvent;
  assert.equal(finisher.hits.length, 2);
  assert.ok(finisher.damage > flurry.damage);
});

test('the villain telegraphs strike, flurry, heavy in turn, and guarding blunts each hit', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(intentFor), ['strike', 'flurry', 'heavy', 'strike', 'flurry', 'heavy']);
  const base = createBattle(character(), origin());
  const at = (turn) => ({ ...base, turn });
  const strike = takeTurn(at(0), 'attack', fixed(0.5)).foeEvent;
  const flurry = takeTurn(at(1), 'attack', fixed(0.5)).foeEvent;
  const heavy = takeTurn(at(2), 'attack', fixed(0.5)).foeEvent;
  assert.equal(strike.hits.length, 1);
  assert.equal(flurry.hits.length, 3);
  assert.equal(sum(flurry.hits), flurry.damage);
  assert.ok(heavy.damage > strike.damage * 1.8);
  const guarded = takeTurn(at(2), 'guard', fixed(0.5)).foeEvent;
  assert.ok(guarded.damage < heavy.damage / 2);
  assert.equal(guarded.guarded, true);
});

test('filling the break gauge stuns the villain: it loses a move, then takes bonus damage', () => {
  let state = createBattle(character(), origin());
  state = { ...state, hero: { ...state.hero, ap: 0, hp: 9999, maxHp: 9999 }, foe: { ...state.foe, hp: 9999, maxHp: 9999 } }; // outlast the villain's attacks
  let broke = null;
  for (let i = 0; i < 20 && !broke; i++) {
    const turn = takeTurn(state, 'attack', fixed(0.99));
    state = turn.end;
    if (turn.heroEvent.broke) broke = turn;
  }
  assert.ok(broke, 'the gauge eventually fills');
  assert.equal(broke.mid.foe.stagger, 2);
  assert.equal(broke.foeEvent.kind, 'stunned');
  assert.equal(broke.foeEvent.damage, 0); // the villain did nothing
  assert.equal(broke.end.hero.hp, broke.mid.hero.hp);

  const plain = createBattle(character(), origin());
  const normal = takeTurn(plain, 'attack', fixed(0.99)).heroEvent.damage;
  const open = takeTurn(state, 'attack', fixed(0.99));
  assert.ok(open.heroEvent.damage >= Math.round(normal * 1.4), 'bonus damage while stunned');
  assert.equal(open.end.foe.stagger, 0);
  assert.equal(open.end.foe.brk, 0); // gauge resets once the stun is over
  assert.notEqual(open.foeEvent.kind, 'stunned');
});

test('the ally works once, and the hero can win with a sensible plan or lose by never guarding', () => {
  let state = createBattle(character(), origin(), ['ally']);
  state = takeTurn(state, 'ally', fixed(0.99)).end;
  assert.equal(state.hero.allyReady, false);
  assert.equal(takeTurn(state, 'ally', fixed(0.99)).heroEvent.kind, 'attack');

  // spend AP on the best special you can afford, guard against heavy hits
  let fight = createBattle(character(), origin(), ['train', 'ally']);
  for (let i = 0; i < 60 && !fight.outcome; i++) {
    const heavy = intentFor(fight.turn) === 'heavy';
    const affordable = [...fight.hero.specials].reverse().find((s) => s.cost <= fight.hero.ap);
    const action = heavy && fight.hero.hp < 70 ? 'guard' : affordable ? affordable.id : fight.hero.allyReady ? 'ally' : 'attack';
    fight = takeTurn(fight, action, fixed(0.5)).end;
  }
  assert.equal(fight.outcome, 'victory');

  let reckless = createBattle(character({ hp: 100, defense: 100 }), origin());
  for (let i = 0; i < 80 && !reckless.outcome; i++) reckless = takeTurn(reckless, 'attack', fixed(0.99)).end;
  assert.equal(reckless.outcome, 'defeat');
});

test('damage and hp never go out of range', () => {
  let state = createBattle(character({ hp: 1, defense: 1 }), origin({ score: 9.5 }));
  for (let i = 0; i < 40 && !state.outcome; i++) {
    const turn = takeTurn(state, ['attack', 's1', 's2', 's3', 'guard'][i % 5], Math.random);
    state = turn.end;
    assert.ok(state.hero.hp >= 0 && state.hero.hp <= state.hero.maxHp);
    assert.ok(state.foe.hp >= 0 && state.foe.hp <= state.foe.maxHp);
    assert.ok(state.hero.ap >= 0 && state.hero.ap <= AP_MAX);
    assert.ok(state.foe.brk >= 0 && state.foe.brk <= state.foe.brkMax);
  }
});
