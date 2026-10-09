/* Hash routes:  #                          → location picker
 *               #loc=limgrave              → location
 *               #loc=limgrave&view=characters
 *               #loc=limgrave&view=play    → bonfire / battle / ending (needs an active run)
 */
const Router = (() => {
  const parse = () => Object.fromEntries(new URLSearchParams(location.hash.slice(1)));

  function go(params) {
    const q = new URLSearchParams(params).toString();
    location.hash = q;
  }

  async function render() {
    const p = parse();
    const root = document.getElementById('app');
    document.body.dataset.theme = p.loc || '';
    root.dataset.theme = p.loc || '';
    root.replaceChildren();
    let view = 'picker';
    if (p.loc) view = p.view || 'location';
    if (view === 'play' && !App.run) view = 'characters';
    try {
      await App.views[view](root, p);
    } catch (e) {
      if (e.name === 'AbortError') return;
      UI.toast(e.message, render);
    }
  }

  window.addEventListener('hashchange', render);
  return { go, render, parse };
})();
