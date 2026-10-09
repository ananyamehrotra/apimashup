/* Battle effects. Every function takes the .stage element and positions effects relative to it. */
const FX = (() => {
  const centerOf = (stage, node) => {
    const s = stage.getBoundingClientRect();
    const r = node.getBoundingClientRect();
    return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 };
  };

  /** Restart a CSS animation class on a node and resolve when it should be over. */
  function anim(node, cls, ms) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
    return UI.sleep(ms).then(() => node.classList.remove(cls));
  }

  function spawn(stage, cls, pt, ms, attrs = {}, text = '') {
    const n = UI.el('div', { class: cls, style: { left: `${pt.x}px`, top: `${pt.y}px`, ...attrs } }, text);
    stage.append(n);
    setTimeout(() => n.remove(), ms);
    return n;
  }

  const floatText = (stage, node, text, cls = '') => {
    const pt = centerOf(stage, node);
    spawn(stage, `float ${cls}`, { x: pt.x + UI.rand(-26, 26), y: pt.y - 40 }, 1100, {}, text);
  };

  const slash = (stage, node, color) => {
    const pt = centerOf(stage, node);
    spawn(stage, 'slash', pt, 420, { '--rot': `${UI.rand(-35, 35)}deg`, '--c': color });
  };

  function burst(stage, node, color, n = 14) {
    const pt = centerOf(stage, node);
    for (let i = 0; i < n; i++) {
      const a = UI.rand(0, Math.PI * 2);
      const d = UI.rand(50, 130);
      spawn(stage, 'spark', pt, 750, { '--dx': `${Math.cos(a) * d}px`, '--dy': `${Math.sin(a) * d}px`, '--c': color });
    }
  }

  const flash = (stage, color = '#fff') => spawn(stage, 'flash', { x: 0, y: 0 }, 300, { '--c': color });

  /** Big centre-screen banner. Resolves after `ms`. */
  function banner(stage, title, { sub = '', color = 'var(--accent-2)', ms = 1100, cls = '' } = {}) {
    const n = UI.el('div', { class: `banner ${cls}`, style: { '--c': color } },
      UI.el('div', { class: 'banner-title' }, title), sub && UI.el('div', { class: 'banner-sub' }, sub));
    stage.append(n);
    setTimeout(() => n.remove(), ms + 300);
    return UI.sleep(ms);
  }

  /**
   * Timing ring: a ring shrinks onto the target and "impacts" after `duration` ms.
   * Resolves { dt } where dt = ms from the press to impact (positive = early), or { dt: null } if no press.
   * Press with Space / Enter / click / tap.
   */
  function timing(stage, node, { duration, label, danger = false }) {
    const pt = centerOf(stage, node);
    const host = spawn(stage, `ring${danger ? ' danger' : ''}`, pt, duration + 400);
    host.append(UI.el('div', { class: 'ring-core' }), UI.el('div', { class: 'ring-outer', style: { animationDuration: `${duration}ms` } }),
      UI.el('div', { class: 'ring-label' }, label));
    const tap = UI.el('div', { class: 'tap' });
    stage.append(tap);

    return new Promise((resolve) => {
      const start = performance.now();
      let done = false;
      const finish = (dt) => {
        if (done) return;
        done = true;
        window.removeEventListener('keydown', onKey);
        tap.remove();
        host.classList.add(dt == null ? 'ring-fade' : 'ring-hit');
        resolve({ dt });
      };
      const press = () => finish(start + duration - performance.now());
      const onKey = (e) => {
        if (e.repeat || (e.code !== 'Space' && e.code !== 'Enter')) return;
        e.preventDefault();
        press();
      };
      window.addEventListener('keydown', onKey);
      tap.addEventListener('pointerdown', press);
      setTimeout(() => finish(null), duration + 160);
    });
  }

  return { centerOf, anim, floatText, slash, burst, flash, banner, timing };
})();
