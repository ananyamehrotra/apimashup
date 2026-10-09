/* Turn-based combat engine (Expedition 33 style). Pure logic: no DOM, no timers.
 *
 * Player turn:  Attack (free, +1 AP) · Skill (costs AP, weapon-specific) · Flask (heal).
 *               Attacks/skills have a timing ring: PERFECT 1.4x, GOOD 1.0x, MISS 0.75x.
 * Boss turn:    each hit is telegraphed. Dodge in time to avoid it; time it tightly to PARRY
 *               (no damage, counter-attack, +1 AP). Miss and you take the hit.
 * Break gauge:  attacks fill it. When full the boss is staggered: it skips a turn and
 *               takes +50% damage on your next action.
 */
const Combat = (() => {
  const R = {
    PLAYER_SCALE: 1.5, BOSS_SCALE: 3,
    AP_MAX: 6, AP_START: 2, FLASKS: 3, FLASK_HEAL: 0.4,
    TIMING: { perfect: 1.4, good: 1.0, miss: 0.75 },
    CRIT_MULT: 1.5, BREAK_BONUS: 1.5, BREAK_FRACTION: 0.35,
    ENRAGE_AT: 0.5, ENRAGE_MULT: 1.25,
    DOT_TURNS: 3, DOT_RATIO: 0.45, HEAL_SKILL: 0.15, PARRY_COUNTER: 0.6,
    ATTACK_WINDOW: { perfect: 130, good: 330 },
  };

  const armour = (def) => 100 / (100 + def * 3);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function create(character, weapon, boss) {
    const m = character.trait.effect || {};
    const maxHp = 80 + character.stats.HP * 8;
    const bossHp = boss.stats.HP;
    return {
      p: {
        name: character.name, icon: character.icon, stats: character.stats, weapon, mods: m,
        maxHp, hp: maxHp, ap: clamp(R.AP_START + (m.start_ap || 0), 0, R.AP_MAX),
        flasks: R.FLASKS + (m.flasks || 0), def: character.stats.DEF + (m.def || 0),
      },
      b: {
        name: boss.name, title: boss.title, icon: boss.icon, image: boss.image, moves: boss.moves,
        atk: boss.stats.ATK, def: boss.stats.DEF, maxHp: bossHp, hp: bossHp,
        breakGauge: 0, breakMax: Math.round(bossHp * R.BREAK_FRACTION),
        broken: 0, stunned: false, dot: null, enraged: false,
      },
    };
  }

  const attackStat = (p) => (p.weapon.scaling === 'MAG' ? p.stats.MAG : p.stats.ATK) + p.weapon.atk;
  const critChance = (p, rarities) => rarities[p.weapon.rarity].crit + (p.mods.crit || 0);

  /** kind: 'attack' | 'skill'; timing: 'perfect' | 'good' | 'miss'. Mutates s and returns what happened. */
  function playerAction(s, kind, timing, rarities, rng = Math.random) {
    const { p, b } = s;
    const skill = kind === 'skill' ? p.weapon.skill : null;
    if (skill) {
      if (p.ap < skill.cost) throw new Error('Not enough AP');
      p.ap -= skill.cost;
    }
    const hitCount = skill ? skill.hits : 1;
    const mult = (skill ? skill.mult : 1) * R.TIMING[timing] * (b.broken > 0 ? R.BREAK_BONUS : 1);
    const total = attackStat(p) * mult * R.PLAYER_SCALE * armour(b.def);
    const cc = critChance(p, rarities);

    const hits = [];
    for (let i = 0; i < hitCount; i++) {
      const crit = rng() < cc;
      hits.push({ dmg: Math.max(1, Math.round((total / hitCount) * (crit ? R.CRIT_MULT : 1))), crit });
    }
    const dmg = hits.reduce((a, h) => a + h.dmg, 0);
    b.hp = Math.max(0, b.hp - dmg);

    let healed = 0;
    if (skill?.effect === 'heal') {
      healed = Math.min(p.maxHp - p.hp, Math.round(p.maxHp * R.HEAL_SKILL));
      p.hp += healed;
    }
    let dot = false;
    if (skill?.effect === 'dot') {
      b.dot = { turns: R.DOT_TURNS, dmg: Math.max(1, Math.round(attackStat(p) * R.DOT_RATIO * R.PLAYER_SCALE * armour(b.def) / 2)) };
      dot = true;
    }

    const apGain = (skill ? 0 : 1) + (timing === 'perfect' ? 1 : 0);
    p.ap = clamp(p.ap + apGain, 0, R.AP_MAX);

    const breakAdd = Math.round((p.weapon.break + (skill ? skill.break : 0)) * (p.mods.break || 1));
    let broke = false;
    if (b.broken === 0 && b.hp > 0) {
      b.breakGauge = Math.min(b.breakMax, b.breakGauge + breakAdd);
      if (b.breakGauge >= b.breakMax) { b.breakGauge = 0; b.broken = 2; b.stunned = true; broke = true; }
    }
    return { hits, dmg, healed, dot, apGain, broke, killed: b.hp <= 0, skill };
  }

  function useFlask(s) {
    const { p } = s;
    if (p.flasks <= 0) throw new Error('No flasks left');
    p.flasks--;
    const healed = Math.min(p.maxHp - p.hp, Math.round(p.maxHp * R.FLASK_HEAL));
    p.hp += healed;
    return { healed };
  }

  function updateEnrage(s) {
    const { b } = s;
    if (!b.enraged && b.hp > 0 && b.hp <= b.maxHp * R.ENRAGE_AT) { b.enraged = true; return true; }
    return false;
  }

  /** Called when the boss turn starts. Returns { stunned } and ticks the break bonus counter. */
  function beginBossTurn(s) {
    const { b } = s;
    const stunned = b.stunned;
    b.stunned = false;
    if (b.broken > 0) b.broken--;
    return { stunned };
  }

  function chooseMove(s, rng = Math.random) {
    const moves = s.b.moves;
    let roll = rng() * moves.reduce((a, m) => a + m.weight, 0);
    for (const m of moves) { roll -= m.weight; if (roll <= 0) return m; }
    return moves[0];
  }

  /** outcome: 'hit' | 'dodge' | 'parry'. Mutates s; returns { dmg, counter, apGain, healed }. */
  function resolveBossHit(s, move, outcome) {
    const { p, b } = s;
    if (outcome === 'hit') {
      const dmg = Math.max(1, Math.round(b.atk * move.power * R.BOSS_SCALE * armour(p.def) * (b.enraged ? R.ENRAGE_MULT : 1)));
      p.hp = Math.max(0, p.hp - dmg);
      return { dmg, counter: 0, apGain: 0, healed: 0 };
    }
    if (outcome === 'dodge') return { dmg: 0, counter: 0, apGain: 0, healed: 0 };
    const counter = Math.max(1, Math.round(attackStat(p) * R.PARRY_COUNTER * R.PLAYER_SCALE * armour(b.def) * (b.broken > 0 ? R.BREAK_BONUS : 1)));
    b.hp = Math.max(0, b.hp - counter);
    p.ap = clamp(p.ap + 1, 0, R.AP_MAX);
    const healed = p.mods.parry_heal ? Math.min(p.maxHp - p.hp, Math.round(p.maxHp * p.mods.parry_heal)) : 0;
    p.hp += healed;
    return { dmg: 0, counter, apGain: 1, healed };
  }

  function tickDot(s) {
    const { b } = s;
    if (!b.dot) return 0;
    const dmg = Math.min(b.hp, b.dot.dmg);
    b.hp -= dmg;
    if (--b.dot.turns <= 0) b.dot = null;
    return dmg;
  }

  /** dt = ms between the button press and the impact (positive = pressed early). null = no press. */
  function judgeAttack(dt) {
    if (dt == null) return 'miss';
    const d = Math.abs(dt);
    return d <= R.ATTACK_WINDOW.perfect ? 'perfect' : d <= R.ATTACK_WINDOW.good ? 'good' : 'miss';
  }

  function judgeDodge(dt, p) {
    if (dt == null) return 'miss';
    const spd = p.stats.SPD;
    if (Math.abs(dt) <= 100 + spd * 3) return 'parry';
    if (dt <= 300 + spd * 6 && dt >= -60) return 'dodge';
    return dt > 0 ? 'early' : 'miss';
  }

  return { R, create, playerAction, useFlask, updateEnrage, beginBossTurn, chooseMove, resolveBossHit, tickDot, judgeAttack, judgeDodge, attackStat };
})();

/* The in-progress playthrough: owned weapons, equipped weapon, which boss is next. */
const Run = {
  start(loc, character) {
    App.run = { location: loc.id, character, owned: [character.weapon], equipped: character.weapon, bossIndex: 0, phase: 'bonfire', loot: null };
  },
  equip(id) { if (App.run.owned.includes(id)) App.run.equipped = id; },
  /** Returns true if the weapon is new. */
  addWeapon(id) {
    if (App.run.owned.includes(id)) return false;
    App.run.owned.push(id);
    return true;
  },
};
