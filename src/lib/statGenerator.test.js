import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCharacter, toStat, worldKeyFor } from './statGenerator.js';

const country = (over) => ({
  code: 'AAA', code2: 'AA', name: 'Aland', region: 'Europe', demonym: 'Alandic',
  population: 1000, area: 10, borders: [], currencies: [], languages: [], ...over,
});

test('toStat maps the range onto 1..999 on a log scale', () => {
  assert.equal(toStat(100, 100, 1e6), 1);
  assert.equal(toStat(1e6, 100, 1e6), 999);
  assert.equal(toStat(1e4, 100, 1e6), 500);
});

test('toStat falls back to 1 for missing or zero values', () => {
  assert.equal(toStat(null, 100, 1e6), 1);
  assert.equal(toStat(0, 100, 1e6), 1);
});

test('generateCharacter builds class, rarity, gold and allies', () => {
  const big = country({ code: 'BBB', name: 'Bigland', population: 2e8, area: 1e6 });
  const tiny = country({
    borders: ['BBB', 'ZZZ'],
    currencies: [{ code: 'ABC', name: 'Coin', symbol: '¤' }],
    languages: ['Alandic'],
  });
  const hero = generateCharacter(tiny, [tiny, big]);
  assert.equal(hero.class.name, 'Knight');
  assert.equal(hero.title, 'Alandic Knight');
  assert.equal(hero.rarity.name, 'Legendary');
  assert.equal(hero.hp, 1);
  assert.equal(hero.gold, 250 + 5 * (1 + 2 + 3));
  assert.deepEqual(hero.allies.map((a) => a.code), ['BBB']); // unknown border codes are dropped
  assert.equal(generateCharacter(big, [tiny, big]).rarity.name, 'Common');
});

test('generateCharacter survives a country with no data', () => {
  const empty = { code: 'XXX', code2: 'XX', name: 'Nowhere', region: null, population: null, area: null };
  const hero = generateCharacter(empty, [empty, country()]);
  assert.equal(hero.class.name, 'Wanderer');
  assert.equal(hero.hp, 1);
  assert.equal(hero.gold, 0);
  assert.deepEqual(hero.skills, []);
  assert.deepEqual(hero.allies, []);
});

test('worldKeyFor picks a world from geography', () => {
  assert.equal(worldKeyFor(country({ region: 'Asia', subregion: 'Eastern Asia' })), 'shrine'); // Japan
  assert.equal(worldKeyFor(country({ landlocked: true, borders: ['BBB'] })), 'walled'); // Switzerland
  assert.equal(worldKeyFor(country({ region: 'Americas', subregion: 'Caribbean' })), 'sky'); // island
  assert.equal(worldKeyFor(country({ borders: ['BBB'], subregion: 'Western Europe' })), 'azure'); // France
  assert.equal(worldKeyFor(country({ region: 'Asia', subregion: 'Southern Asia', borders: ['BBB'] })), 'blossom'); // India
  assert.equal(worldKeyFor(country({ region: 'Africa', subregion: 'Eastern Africa', borders: ['BBB'] })), 'frontier');
  assert.equal(worldKeyFor(country({ region: 'Americas', subregion: 'South America', borders: ['BBB'] })), 'meadow');
  assert.equal(worldKeyFor(country({ region: 'Antarctic' })), 'starfall');
});
