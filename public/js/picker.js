App.views.picker = async (root) => {
  root.append(
    UI.el('section', { class: 'hero' },
      UI.el('h1', {}, 'Choose a Land'),
      UI.el('p', {}, 'Three realms are waiting. Pick one, choose who you were, and face the guardians that remain.')),
    UI.skeleton(3));

  const grid = root.querySelector('.char-grid');
  const { data } = await Api.get('/locations', { latest: true });
  App.locations = data.locations;

  grid.replaceWith(UI.el('div', { class: 'loc-grid' }, App.locations.map((l) =>
    UI.el('button', {
      class: 'loc-card', 'data-theme': l.id,
      onclick: () => Router.go({ loc: l.id }),
    },
    UI.el('div', { class: 'icon' }, l.icon),
    UI.el('h2', {}, l.name),
    UI.el('div', { class: 'game' }, l.game),
    UI.el('p', { class: 'tag' }, l.tagline),
    UI.el('div', { class: 'counts' }, `${l.characterCount} characters · ${l.bossCount} bosses · ${l.npcCount} NPCs`)))));
};
