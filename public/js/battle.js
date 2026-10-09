/* Play view: bonfire (rest + equip) → boss fight → next boss … → ending. Driven by App.run.phase. */
const RARITY_COLOR = (r) => App.rarities[r].color;
const bossOf = () => App.location.bosses[App.run.bossIndex];
const weaponOf = () => App.weapons.get(App.run.equipped);

App.views.play = async (root, { loc }) => {
  await loadLocation(loc);
  const run = App.run;
  if (run.location !== loc) { App.run = null; return Router.render(); }
  if (run.phase === 'bonfire') return renderBonfire(root);
  if (run.phase === 'ending') return renderEnding(root);
  fightBoss(root).catch((e) => UI.toast(e.message)); // runs for the whole fight; don't block the router
};

const showPhase = (phase) => { App.run.phase = phase; Router.render(); };

/* ---------- bonfire ---------- */
function renderBonfire(root) {
  const run = App.run;
  const l = App.location;
  const boss = bossOf();
  const loot = run.loot && App.weapons.get(run.loot.id);

  root.replaceChildren(
    UI.el('section', { class: 'panel bonfire' },
      UI.el('div', { class: 'flame' }, '🔥'),
      UI.el('h1', {}, run.bossIndex === 0 && !loot ? `${l.name} awaits` : 'Bonfire lit'),
      UI.el('div', { class: 'progress' }, l.bosses.map((_, i) => UI.el('i', { class: i < run.bossIndex ? 'done' : i === run.bossIndex ? 'now' : '' }))),
      UI.el('p', {}, `${run.character.icon} ${run.character.name} rests and is fully restored. Flasks and AP refill before every fight.`),
      loot && UI.el('div', { class: 'loot' },
        UI.el('div', { class: 'banner-sub' }, run.loot.isNew ? '✦ New weapon ✦' : 'Duplicate (already owned)'),
        weaponChip(loot)),
      UI.el('h2', {}, 'Your weapons'),
      UI.el('div', { class: 'inv' }, run.owned.map((id) => {
        const w = App.weapons.get(id);
        return weaponChip(w, { equipped: id === run.equipped, onclick: () => { Run.equip(id); renderBonfire(root); } });
      })),
      UI.el('div', { class: 'next' },
        UI.el('p', {}, `Next: ${boss.icon} ${boss.name} — ${boss.title}`),
        UI.el('button', { class: 'btn primary', onclick: () => { run.loot = null; showPhase('battle'); } }, '⚔ Face the boss'),
        ' ',
        UI.el('button', { class: 'btn ghost', onclick: () => { App.run = null; Router.go({ loc: l.id }); } }, 'Leave'))));
}

function renderEnding(root) {
  const l = App.location;
  root.replaceChildren(UI.el('section', { class: 'ending' },
    UI.el('h1', {}, 'LAND LIBERATED'),
    UI.el('p', {}, l.ending),
    UI.el('p', {}, `${App.run.character.icon} ${App.run.character.name} defeated ${l.bosses.length} bosses and collected ${App.run.owned.length} weapons.`),
    UI.el('button', { class: 'btn primary', onclick: () => { App.run = null; Router.go({}); } }, 'Choose another land')));
}

/* ---------- fight ---------- */
const bar = (cls, withNum) => {
  const trail = UI.el('div', { class: 'trail' });
  const fill = UI.el('div', { class: 'fill' });
  const num = withNum ? UI.el('span', { class: 'num' }) : null;
  return { node: UI.el('div', { class: `bar ${cls}` }, trail, fill, num), trail, fill, num };
};
const setBar = (b, cur, max) => {
  const pct = `${Math.max(0, (cur / max) * 100)}%`;
  b.fill.style.width = pct;
  b.trail.style.width = pct;
  if (b.num) b.num.textContent = `${Math.max(0, Math.round(cur))} / ${max}`;
};

async function fightBoss(root) {
  const run = App.run;
  const boss = bossOf();
  const weapon = weaponOf();
  const s = Combat.create(run.character, weapon, boss);
  const wColor = RARITY_COLOR(weapon.rarity);

  /* --- DOM --- */
  const bossHp = bar('boss', true);
  const bossBreak = bar('break');
  const tags = UI.el('div', { class: 'tags' });
  const playerHp = bar('player', true);
  const pips = Array.from({ length: Combat.R.AP_MAX }, () => UI.el('i', { class: 'pip' }));
  const hint = UI.el('div', { class: 'hint' });

  const playerEl = UI.el('div', { class: 'fighter player', style: { '--wc': wColor } },
    UI.el('div', { class: 'sprite' }, s.p.icon), UI.el('div', { class: 'shadow' }));
  const bossEl = UI.el('div', { class: 'fighter boss' }, UI.img(boss.image, boss.icon, 'sprite'), UI.el('div', { class: 'shadow' }));
  const stage = UI.el('div', { class: 'stage' }, UI.el('div', { class: 'ground' }), playerEl, bossEl);

  const skill = weapon.skill;
  const btnAttack = UI.el('button', { class: 'btn' }, UI.el('span', {}, '⚔ Attack ', UI.el('span', { class: 'key' }, '[1]')), UI.el('small', {}, '+1 AP · timing bonus'));
  const btnSkill = UI.el('button', { class: 'btn skill', 'data-rarity': weapon.rarity }, UI.el('span', {}, `${weapon.icon} ${skill.name} `, UI.el('span', { class: 'key' }, '[2]')), UI.el('small', {}, `${skill.cost} AP · ${skill.hits > 1 ? `${skill.hits} hits · ` : ''}x${skill.mult}`));
  const btnFlask = UI.el('button', { class: 'btn' });
  const menu = UI.el('div', { class: 'menu' }, btnAttack, btnSkill, btnFlask);

  const arena = UI.el('div', { class: 'arena' },
    UI.el('div', { class: 'hud hud-boss' }, UI.el('h2', {}, boss.name), UI.el('div', { class: 'title' }, boss.title), bossHp.node, bossBreak.node, tags),
    stage,
    UI.el('div', { class: 'hud hud-player' },
      UI.el('div', {}, UI.el('div', { class: 'who' }, `${s.p.icon} ${s.p.name}`), playerHp.node),
      UI.el('div', { class: 'pips', title: 'Action Points' }, pips)),
    hint, menu);
  root.replaceChildren(arena);

  const alive = () => arena.isConnected;

  function refresh() {
    setBar(bossHp, s.b.hp, s.b.maxHp);
    setBar(bossBreak, s.b.breakGauge, s.b.breakMax);
    setBar(playerHp, s.p.hp, s.p.maxHp);
    pips.forEach((p, i) => p.classList.toggle('on', i < s.p.ap));
    btnSkill.disabled = s.p.ap < skill.cost;
    btnFlask.disabled = s.p.flasks <= 0 || s.p.hp >= s.p.maxHp;
    btnFlask.replaceChildren(UI.el('span', {}, '🧪 Flask ', UI.el('span', { class: 'key' }, '[3]')), UI.el('small', {}, `${s.p.flasks} left · heal ${Math.round(Combat.R.FLASK_HEAL * 100)}%`));
    tags.replaceChildren(...[
      s.b.broken > 0 && UI.el('span', { class: 'tag broken' }, 'STAGGERED'),
      s.b.enraged && UI.el('span', { class: 'tag enraged' }, 'ENRAGED'),
      s.b.dot && UI.el('span', { class: 'tag dot' }, `BLEEDING ${s.b.dot.turns}`),
    ].filter(Boolean));
    bossEl.classList.toggle('stagger', s.b.broken > 0 && s.b.hp > 0);
  }
  const setMenu = (on) => { menu.style.pointerEvents = on ? '' : 'none'; menu.style.opacity = on ? '' : '.5'; };

  function pickAction() {
    refresh();
    setMenu(true);
    hint.replaceChildren('Choose your action. ', UI.el('b', {}, 'Attack'), ' builds AP; ', UI.el('b', {}, 'skills'), ' spend it.');
    return new Promise((resolve) => {
      const done = (kind) => { cleanup(); setMenu(false); resolve(kind); };
      const handlers = { attack: () => done('attack'), skill: () => !btnSkill.disabled && done('skill'), flask: () => !btnFlask.disabled && done('flask') };
      const onKey = (e) => {
        if (!alive()) return cleanup();
        if (e.repeat) return;
        if (e.key === '1') handlers.attack(); else if (e.key === '2') handlers.skill(); else if (e.key === '3') handlers.flask();
      };
      const cleanup = () => { window.removeEventListener('keydown', onKey); btnAttack.onclick = btnSkill.onclick = btnFlask.onclick = null; };
      btnAttack.onclick = handlers.attack; btnSkill.onclick = handlers.skill; btnFlask.onclick = handlers.flask;
      window.addEventListener('keydown', onKey);
    });
  }

  const pop = (node, text, cls) => FX.floatText(stage, node, text, cls);

  /* --- player actions --- */
  async function playerAct(kind) {
    if (kind === 'flask') {
      const { healed } = Combat.useFlask(s);
      hint.textContent = 'You drink from the flask…';
      FX.anim(playerEl, 'heal', 600);
      pop(playerEl, `+${healed}`, 'heal');
      FX.burst(stage, playerEl, '#4ade80', 10);
      refresh();
      await UI.sleep(700);
      return;
    }
    const isSkill = kind === 'skill';
    hint.replaceChildren('Press ', UI.el('b', {}, 'SPACE'), ' (or tap) as the ring closes!');
    if (isSkill) {
      playerEl.classList.add('aura');
      stage.classList.add('dim');
      await FX.banner(stage, weapon.skill.name, { sub: weapon.name, color: wColor, ms: 650 });
      stage.classList.remove('dim');
    }
    const { dt } = await FX.timing(stage, bossEl, { duration: 1100, label: isSkill ? 'SKILL' : 'STRIKE' });
    const timing = Combat.judgeAttack(dt);
    pop(bossEl, timing.toUpperCase(), timing === 'miss' ? 'miss' : timing);

    const before = s.b.hp;
    const r = Combat.playerAction(s, kind, timing, App.rarities);
    let shown = before;
    for (let i = 0; i < r.hits.length; i++) {
      const h = r.hits[i];
      FX.anim(playerEl, 'lunge', 300);
      await UI.sleep(130);
      FX.slash(stage, bossEl, wColor);
      FX.burst(stage, bossEl, wColor, h.crit ? 20 : 10);
      pop(bossEl, h.crit ? `${h.dmg}!` : `${h.dmg}`, h.crit ? 'crit' : '');
      FX.anim(bossEl, 'hit', 300);
      if (h.crit || r.hits.length === 1) { arena.classList.remove('shake'); void arena.offsetWidth; arena.classList.add('shake'); }
      shown -= h.dmg;
      setBar(bossHp, Math.max(0, shown), s.b.maxHp);
      await UI.sleep(i === r.hits.length - 1 ? 200 : 150);
    }
    playerEl.classList.remove('aura');
    if (r.healed) { pop(playerEl, `+${r.healed}`, 'heal'); FX.anim(playerEl, 'heal', 600); }
    if (r.dot) pop(bossEl, '🩸 BLEED', 'player-dmg');
    if (r.apGain) pips.forEach((p, i) => { if (i < s.p.ap && i >= s.p.ap - r.apGain) FX.anim(p, 'gain', 500); });
    if (r.broke) {
      FX.flash(stage, '#fbbf24');
      await FX.banner(stage, 'BREAK!', { sub: `${boss.name} is staggered`, color: 'var(--break)', ms: 800 });
    }
    refresh();
  }

  /* --- boss turn --- */
  async function bossTurn() {
    const { stunned } = Combat.beginBossTurn(s);
    if (stunned) {
      hint.textContent = `${boss.name} is staggered and cannot act!`;
      await UI.sleep(900);
      refresh();
      return;
    }
    if (Combat.updateEnrage(s)) {
      FX.flash(stage, '#ff3b30');
      refresh();
      await FX.banner(stage, 'ENRAGED', { sub: `${boss.name} fights with fury`, color: '#ff4a3a', ms: 900 });
    }
    const move = Combat.chooseMove(s);
    hint.replaceChildren(UI.el('b', {}, move.name), move.hits > 1 ? ` — ${move.hits} hits! Dodge each one.` : ' — dodge it!');
    bossEl.classList.add('windup');
    await UI.sleep(650);

    for (let i = 0; i < move.hits && s.p.hp > 0; i++) {
      const ringPromise = FX.timing(stage, playerEl, { duration: move.telegraph, label: 'DODGE', danger: true });
      const { dt } = await ringPromise;
      const outcome = Combat.judgeDodge(dt, s.p);
      const kind = outcome === 'parry' ? 'parry' : outcome === 'dodge' ? 'dodge' : 'hit';
      // The ring resolves when pressed, but the boss strike should land at the ring's impact time.
      if (dt != null && dt > 0) await UI.sleep(dt);
      FX.anim(bossEl, 'lunge', 360);
      await UI.sleep(150);
      const r = Combat.resolveBossHit(s, move, kind);
      if (kind === 'hit') {
        FX.slash(stage, playerEl, '#ff4a3a');
        FX.burst(stage, playerEl, '#ff4a3a', 10);
        pop(playerEl, `-${r.dmg}`, 'player-dmg');
        if (outcome === 'early') pop(playerEl, 'TOO EARLY', 'miss');
        FX.anim(playerEl, 'hit', 300);
        arena.classList.remove('shake'); void arena.offsetWidth; arena.classList.add('shake');
      } else if (kind === 'dodge') {
        FX.anim(playerEl, 'dodge', 450);
        pop(playerEl, 'DODGE', 'good');
      } else {
        FX.flash(stage, '#38bdf8');
        FX.burst(stage, playerEl, '#38bdf8', 18);
        pop(playerEl, 'PARRY!', 'parry');
        await UI.sleep(120);
        FX.slash(stage, bossEl, '#38bdf8');
        pop(bossEl, `${r.counter}`, '');
        FX.anim(bossEl, 'hit', 300);
        if (r.healed) pop(playerEl, `+${r.healed}`, 'heal');
      }
      refresh();
      await UI.sleep(kind === 'hit' ? 350 : 250);
      if (s.b.hp <= 0) return;
    }
    bossEl.classList.remove('windup');
    const dotDmg = Combat.tickDot(s);
    if (dotDmg) { pop(bossEl, `${dotDmg}`, 'player-dmg'); FX.anim(bossEl, 'hit', 300); refresh(); await UI.sleep(500); }
  }

  /* --- main loop --- */
  refresh();
  setMenu(false);
  await FX.banner(stage, boss.name, { sub: boss.title, color: 'var(--accent-2)', ms: 1300 });
  while (alive()) {
    await playerAct(await pickAction());
    if (!alive()) return;
    if (s.b.hp <= 0) return win();
    await bossTurn();
    if (!alive()) return;
    if (s.b.hp <= 0) return win();
    if (s.p.hp <= 0) return lose();
  }

  async function win() {
    bossEl.classList.remove('windup', 'stagger');
    bossEl.classList.add('dead');
    FX.flash(stage, '#fff');
    refresh();
    await FX.banner(stage, 'ENEMY FELLED', { sub: boss.name, color: 'var(--legendary)', ms: 1700 });
    const isNew = Run.addWeapon(boss.drop);
    run.loot = { id: boss.drop, isNew };
    run.bossIndex++;
    showPhase(run.bossIndex >= App.location.bosses.length ? 'ending' : 'bonfire');
  }

  async function lose() {
    playerEl.classList.add('dead');
    await FX.banner(stage, 'YOU DIED', { color: '#b02a2a', ms: 2200, cls: 'died' });
    hint.replaceChildren(
      UI.el('button', { class: 'btn primary', onclick: () => showPhase('bonfire') }, 'Return to the bonfire'), ' ',
      UI.el('button', { class: 'btn ghost', onclick: () => { App.run = null; Router.go({ loc: App.location.id }); } }, 'Give up'));
    menu.remove();
  }
}
