const weaponChip = (w, { equipped = false, onclick } = {}) => {
  const tag = onclick ? 'button' : 'div';
  return UI.el(tag, { class: `weapon${equipped ? ' equipped' : ''}`, 'data-rarity': w.rarity, onclick },
    UI.el('span', { class: 'w-icon' }, w.icon),
    UI.el('div', {},
      UI.el('div', { class: 'w-name' }, w.name),
      UI.el('div', { class: 'w-meta' }, `${App.rarities[w.rarity].name} ${w.type} · ${w.scaling} ${w.atk} · Crit ${Math.round(App.rarities[w.rarity].crit * 100)}%`),
      UI.el('div', { class: 'w-meta' }, `Skill: ${w.skill.name} (${w.skill.cost} AP)`)));
};

App.views.characters = async (root, { loc }) => {
  root.append(UI.skeleton(4));
  const l = await loadLocation(loc);
  root.replaceChildren(
    UI.el('button', { class: 'btn ghost back', onclick: () => Router.go({ loc }) }, `← ${l.name}`),
    UI.el('div', { class: 'hero' }, UI.el('h1', {}, 'Who were you?'), UI.el('p', {}, 'Your origin sets your stats, a trait, and your first weapon.')),
    UI.el('div', { class: 'char-grid' }, l.characters.map((c) => {
      const w = App.weapons.get(c.weapon);
      return UI.el('button', { class: 'char-card', onclick: () => { Run.start(l, c); Router.go({ loc, view: 'play' }); } },
        UI.el('div', { class: 'sigil' }, c.icon),
        UI.el('h3', {}, c.name),
        UI.el('p', { class: 'back-text' }, c.backstory),
        UI.statBars(c.stats),
        UI.el('div', { class: 'trait' }, `${c.trait.name}: ${c.trait.desc}`),
        UI.el('div', { class: 'start-weapon' }, weaponChip(w)));
    })));
};
