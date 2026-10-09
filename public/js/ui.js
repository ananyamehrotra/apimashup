/* Small DOM + timing helpers. Text is always set via textContent, never innerHTML. */
const UI = (() => {
  function el(tag, attrs = {}, ...kids) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'style') Object.assign(node.style, v);
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return node;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);

  function toast(message, retry) {
    const t = el('div', { class: 'toast' }, el('span', {}, message));
    if (retry) t.append(el('button', { class: 'btn', onclick: () => { t.remove(); retry(); } }, 'Retry'));
    document.getElementById('toasts').append(t);
    setTimeout(() => t.remove(), 8000);
  }

  function skeleton(n = 3) {
    return el('div', { class: 'char-grid' }, Array.from({ length: n }, () => el('div', { class: 'skeleton' })));
  }

  function embers(count = 26) {
    const host = document.getElementById('embers');
    for (let i = 0; i < count; i++) {
      host.append(el('span', {
        class: 'ember',
        style: {
          left: `${rand(0, 100)}%`, animationDuration: `${rand(7, 15)}s`, animationDelay: `${rand(0, 10)}s`,
          '--dx': `${rand(-80, 80)}px`,
        },
      }));
    }
  }

  const statBars = (stats) => el('div', {}, Object.entries(stats).map(([k, v]) =>
    el('div', { class: 'bar-row' }, el('span', {}, k), el('div', { class: 'bar' }, el('i', { style: { width: `${Math.min(100, v * 5)}%` } })), el('span', {}, v))));

  function img(src, fallback, cls = '') {
    const wrap = el('div', { class: cls }, fallback);
    if (src) {
      const i = el('img', { src, alt: '', loading: 'lazy' });
      i.addEventListener('load', () => wrap.replaceChildren(i));
    }
    return wrap;
  }

  return { el, sleep, rand, toast, skeleton, embers, statBars, img };
})();
