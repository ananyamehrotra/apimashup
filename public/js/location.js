/* Loads the full location record (cached in App.location) and the weapon table. */
async function loadLocation(id) {
  if (!App.weapons.size) {
    const { data } = await Api.get('/weapons');
    App.rarities = data.rarities;
    App.weapons = new Map(data.weapons.map((w) => [w.id, w]));
  }
  if (App.location?.id !== id) {
    const { data } = await Api.get(`/locations/${id}`, { latest: true });
    App.location = data;
  }
  return App.location;
}

function bossEntry(b, i) {
  const drop = App.weapons.get(b.drop);
  return UI.el('details', { class: 'entry' },
    UI.el('summary', {},
      UI.img(b.image, b.icon, 'thumb'),
      UI.el('div', {}, UI.el('strong', {}, `${i + 1}. ${b.name}`), UI.el('div', { class: 'sub' }, b.title))),
    UI.el('div', { class: 'body' },
      UI.el('p', {}, b.lore),
      UI.el('div', { class: 'stats-line' }, `HP ${b.stats.HP} · ATK ${b.stats.ATK} · DEF ${b.stats.DEF}`),
      drop && UI.el('div', { class: 'stats-line' }, `Drops: ${drop.icon} ${drop.name} (${App.rarities[drop.rarity].name})`)));
}

function npcEntry(n) {
  return UI.el('details', { class: 'entry' },
    UI.el('summary', {},
      UI.img(n.image, '👤', 'thumb'),
      UI.el('div', {}, UI.el('strong', {}, n.name), UI.el('div', { class: 'sub' }, `${n.role} · ${n.where}`))),
    UI.el('div', { class: 'body' }, UI.el('em', {}, `“${n.quote}”`)));
}

App.views.location = async (root, { loc }) => {
  root.append(UI.skeleton(2));
  const l = await loadLocation(loc);
  root.replaceChildren(
    UI.el('button', { class: 'btn ghost back', onclick: () => Router.go({}) }, '← All lands'),
    UI.el('div', { class: 'loc-head' },
      UI.el('h1', {}, `${l.icon} ${l.name}`),
      UI.el('div', { class: 'tag' }, `${l.game} — ${l.tagline}`)),
    UI.el('div', { class: 'split' },
      UI.el('section', { class: 'panel' },
        UI.el('h2', {}, 'Story'),
        l.story.map((p) => UI.el('p', {}, p)),
        UI.el('button', { class: 'btn primary', onclick: () => Router.go({ loc, view: 'characters' }) }, 'Choose your character ▶')),
      UI.el('div', {},
        UI.el('section', { class: 'panel' }, UI.el('h2', {}, 'Bosses'), l.bosses.map(bossEntry)),
        UI.el('section', { class: 'panel', style: { marginTop: '20px' } }, UI.el('h2', {}, 'NPCs'), l.npcs.map(npcEntry)))));
};
