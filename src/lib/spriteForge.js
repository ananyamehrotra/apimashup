// Isekai Sprite Forge: a tiny playable pixel-art stage for the reborn hero.
// The archetype comes from the hero's class, the accent and the night sky are
// tinted from the country's real flag colours, and the aura from the rarity.
// Archetypes are original designs built from common anime tropes.

const SW = 120, SH = 80, GY = 68; // stage size (logical pixels) and ground line
const W = 56, H = 52, OX = 8, OY = 8; // sprite canvas + draw offsets
const CX = 60; // the hero stays centred; the world scrolls

/* ---------- colour + noise helpers ---------- */
const h2r = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => { const A = h2r(a), B = h2r(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const dark = (c, t = 0.3) => mix(c, '#000000', t);
const light = (c, t = 0.3) => mix(c, '#ffffff', t);
const cdist = (a, b) => { const A = h2r(a), B = h2r(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
function hash(n) { let t = (n * 374761393 + 668265263) | 0; t = ((t ^ (t >>> 13)) * 1274126177) | 0; return ((t ^ (t >>> 16)) >>> 0) / 4294967296; }
function noise(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) + (hash(i + 1) - hash(i)) * u; }

/* ---------- data ---------- */
export const ARCHETYPES = {
  Knight: { name: 'Iron Vanguard', tag: 'Unbreakable frontline hero. Sword-and-armor fantasy archetype.', hair: '#e8c35a', eye: '#3b7dff', skin: '#f1c27d', pri: '#2a3f7a', trim: '#c9d1e0', style: 0 },
  Monk: { name: 'Fist of Dawn', tag: 'Hot-blooded martial artist. Classic shonen brawler archetype.', hair: '#241408', eye: '#f0a020', skin: '#e0ac69', pri: '#e8812a', trim: '#fff3d0', style: 3 },
  Ranger: { name: 'Verdant Archer', tag: 'Calm sharpshooter of the wilds. Fantasy ranger archetype.', hair: '#3aa876', eye: '#2fbf71', skin: '#f1c27d', pri: '#2f7a4a', trim: '#d9c9a0', style: 1 },
  Rogue: { name: 'Night Blade', tag: 'Quiet, fast and dangerous. Shadow-assassin archetype.', hair: '#4a3a7a', eye: '#e0405a', skin: '#fddbb4', pri: '#2a2440', trim: '#8a4ad0', style: 0 },
  Mage: { name: 'Star Witch', tag: 'Cheerful caster with huge magic. Magical-girl archetype.', hair: '#ff7ab6', eye: '#9b59ff', skin: '#ffe0d0', pri: '#6a3ab0', trim: '#ffd166', style: 2 },
  Priest: { name: 'Holy Maiden', tag: 'Gentle healer wrapped in light. Cleric / saint archetype.', hair: '#f4efd8', eye: '#f0a020', skin: '#ffe0d0', pri: '#f2f2f8', trim: '#ffd166', style: 1 },
};

// The sheet's classes (from the country's region) mapped onto sprite archetypes.
const SPRITE_CLASS = { Knight: 'Knight', Monk: 'Monk', Shaman: 'Priest', Ranger: 'Ranger', Navigator: 'Rogue', 'Frost Mage': 'Mage', Wanderer: 'Rogue' };
const AURA = { Common: null, Uncommon: null, Rare: '#4aa3ff', Epic: '#c25cff', Legendary: '#ffd166' };
const FALLBACK_FLAG = ['#ffffff', '#6a5acd', '#ffd166'];
const isHex = (c) => /^#[0-9a-f]{6}$/i.test(c ?? '');

// flag = [secondary, primary, trim], taken from the real flag's colours.
export function heroLook(character) {
  const cls = SPRITE_CLASS[character.class.name] ?? 'Rogue';
  const base = ARCHETYPES[cls];
  const colors = (character.country.colors ?? []).filter(isHex);
  const flag = colors.length >= 3 ? colors.slice(0, 3) : FALLBACK_FLAG;
  let accent = flag[1];
  if (cdist(accent, base.pri) < 90) accent = flag[2];
  if (cdist(accent, base.pri) < 90) accent = flag[0];
  return { ...base, cls, accent, flag, glow: AURA[character.rarity.name] ?? null, legendary: character.rarity.name === 'Legendary' };
}

/* ---------- animations ---------- */
const ANIMS = {
  idle: [{ dy: 0 }, { dy: 0 }, { dy: -1 }, { dy: -1 }],
  walk: [{ dy: -1, lL: 2, aL: 1, aR: -1 }, { dy: 0 }, { dy: -1, rL: 2, aL: -1, aR: 1 }, { dy: 0 }],
  jump: [{ dy: -1, lL: 3, rL: 2, armL: 'up' }],
  attack: [{ wp: 1, dy: -1, aR: -2 }, { wp: 1, dy: -1, aR: -2 }, { wp: 2, dy: 0 }, { wp: 0, dy: 0 }],
  victory: [{ dy: 0, armL: 'up', armR: 'raise', wp: 1 }, { dy: -2, armL: 'up', armR: 'raise', wp: 1, lL: 1, rL: 1 }],
};

/* ---------- sprite (pose-driven) ---------- */
function drawSprite(off, p, pose) {
  const o = off.getContext('2d');
  const R = (x, y, w, h, c) => { o.fillStyle = c; o.fillRect(x, y, w, h); };
  o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, W, H); o.translate(OX, OY);
  const { skin, hair, eye, pri, trim, cls, style } = p, sec = p.accent;
  const dy = pose.dy || 0, wp = pose.wp || 0, lL = pose.lL || 0, rL = pose.rL || 0, aL = pose.aL || 0, aR = pose.aR || 0;
  const RU = (x, y, w, h, c) => R(x, y + dy, w, h, c);
  const skinD = dark(skin, 0.15), hairD = dark(hair, 0.3), hairL = light(hair, 0.4);
  const priD = dark(pri, 0.3), pants = dark(pri, 0.6), gold = '#ffd166', wood = '#6b4226';
  const robe = cls === 'Mage' || cls === 'Priest', bare = cls === 'Monk';
  const steel = '#c9d1e0', steelD = '#8f9bb3', steelL = '#f2f6ff';

  // back hair
  RU(9, 5, 14, 8, hair);
  if (style === 1) { RU(8, 5, 16, 22, hair); RU(8, 21, 16, 6, hairD); }
  if (style === 2) { RU(6, 10, 3, 15, hair); RU(23, 10, 3, 15, hair); RU(6, 22, 3, 3, hairD); RU(23, 22, 3, 3, hairD); }
  // cape
  if (cls === 'Knight') RU(8, 18, 16, 21, dark(sec, 0.45));
  if (cls === 'Ranger') RU(8, 18, 16, 21, priD);
  // legs + boots (lift = walking / jumping)
  const boot = cls === 'Knight' ? steelD : '#3a2a22';
  R(12, 31, 3, 8 - lL, pants); R(17, 31, 3, 8 - rL, pants);
  R(11, 38 - lL, 4, 3, boot); R(17, 38 - rL, 4, 3, boot);
  R(11, 38 - lL, 4, 1, light(boot, 0.35)); R(17, 38 - rL, 4, 1, light(boot, 0.35));
  // torso + tunic
  RU(11, 19, 10, 9, pri); RU(19, 19, 2, 9, priD);
  if (!bare) RU(15, 19, 2, 8, sec);
  RU(11, 27, 10, 1, trim); RU(15, 27, 2, 1, gold);
  const len = robe ? 9 : 3;
  RU(10, 28, 12, len, pri); RU(20, 28, 2, len, priD); RU(10, 28 + len - 1, 12, 1, trim);
  if (robe) RU(15, 28, 2, len - 1, sec);
  RU(15, 18, 2, 1, skinD);
  if (bare) { RU(14, 19, 4, 1, skin); RU(15, 20, 2, 1, skin); for (let i = 0; i < 9; i++) RU(11 + i, 19 + i, 2, 1, sec); }

  // arms
  const colL = bare ? skin : pri, colR = bare ? skinD : priD, hand = bare ? trim : skin;
  function arm(right, mode, s) {
    const col = right ? colR : colL;
    if (mode === 'rest') { const x = right ? 21 : 9; RU(x, 20 + s, 2, 7, col); if (!bare) RU(x, 26 + s, 2, 1, trim); RU(x, 27 + s, 2, 2, hand); }
    else if (mode === 'up') { const x = right ? 22 : 8; RU(x, 13, 2, 8, col); if (!bare) RU(x, 19, 2, 1, trim); RU(x, 11, 2, 2, hand); }
    else if (mode === 'raise') { RU(21, 19, 2, 2, col); RU(22, 13, 2, 7, col); RU(22, 11, 2, 2, hand); }
    else if (mode === 'fwd') { RU(21, 19, 2, 4, col); RU(23, 21, 5, 2, col); RU(28, 20, 2, 3, hand); }
  }
  const modeR = pose.armR || (wp === 0 ? 'rest' : wp === 1 ? (cls === 'Ranger' ? 'fwd' : cls === 'Monk' ? 'rest' : 'raise') : 'fwd');
  arm(false, pose.armL || 'rest', aL); arm(true, modeR, aR);

  // head + face
  RU(10, 7, 12, 10, skin); RU(11, 6, 10, 1, skin); RU(11, 17, 10, 1, skin); RU(21, 8, 1, 9, skinD);
  [12, 17].forEach((ex) => {
    if (pose.blink) { RU(ex, 13, 3, 1, '#1a0f1f'); }
    else { RU(ex, 11, 3, 1, '#1a0f1f'); RU(ex, 12, 3, 3, eye); RU(ex + 1, 13, 1, 1, '#12081f'); RU(ex, 14, 3, 1, light(eye, 0.45)); RU(ex, 12, 1, 1, '#ffffff'); }
  });
  if (wp === 2 || pose.armL === 'up') RU(15, 16, 2, 2, '#7a2030'); else RU(15, 16, 2, 1, '#c0645a');
  RU(11, 15, 1, 1, '#ff9aa2'); RU(20, 15, 1, 1, '#ff9aa2');

  // front hair
  RU(9, 5, 14, 3, hair);
  [10, 11, 13, 14, 16, 17, 19, 20, 21].forEach((x) => RU(x, 8, 1, 1, hair));
  [12, 13, 17, 18].forEach((x) => RU(x, 6, 1, 1, hairL));
  if (style === 0) { RU(15, 3, 1, 2, hair); RU(16, 2, 1, 2, hair); RU(10, 8, 1, 4, hair); RU(21, 8, 1, 4, hair); }
  if (style === 1 || style === 2) { RU(9, 8, 2, 10, hair); RU(21, 8, 2, 10, hair); RU(9, 14, 2, 4, hairD); RU(21, 14, 2, 4, hairD); }
  if (style === 3) { RU(10, 4, 2, 2, hair); RU(13, 3, 2, 3, hair); RU(16, 2, 2, 4, hair); RU(19, 3, 2, 3, hair); RU(10, 8, 1, 4, hair); RU(21, 8, 1, 4, hair); }

  // weapons
  function blade(l, col, col2) {
    if (wp === 0) { RU(24, 28 - l, 1, l, col); RU(25, 29 - l, 1, l - 1, col2); RU(22, 28, 5, 1, gold); RU(24, 29, 1, 3, wood); }
    else if (wp === 1) { RU(22, 10 - l, 2, l, col); RU(23, 11 - l, 1, l - 1, col2); RU(20, 10, 6, 1, gold); }
    else { RU(30, 20, l, 2, col); RU(30, 21, l, 1, col2); RU(29, 18, 1, 6, gold); }
  }
  function orbAt(x, y, c) { RU(x, y + 1, 3, 2, c); RU(x + 1, y, 1, 4, c); RU(x, y + 1, 1, 1, '#ffffff'); }
  function staff(c) {
    if (wp === 0) { RU(24, 10, 1, 28, wood); orbAt(23, 6, c); }
    else if (wp === 1) { RU(22, 1, 1, 18, wood); orbAt(21, -3, c); }
    else { RU(30, 21, 11, 1, wood); orbAt(41, 19, c); }
  }

  if (cls === 'Knight') {
    RU(8, 19, 3, 3, steel); RU(21, 19, 3, 3, steel); RU(8, 19, 3, 1, steelL); RU(21, 19, 3, 1, steelL);
    RU(12, 20, 8, 5, steel); RU(12, 20, 8, 1, steelL); RU(18, 21, 2, 4, steelD); RU(15, 20, 2, 5, sec);
    RU(10, 7, 12, 1, gold);
    RU(15, 1, 2, 5, sec); RU(14, 2, 1, 4, dark(sec, 0.3)); RU(17, 3, 1, 3, dark(sec, 0.2));
    blade(15, '#dfe8f5', '#9fb0c8');
  }
  if (cls === 'Mage') {
    RU(8, 5, 16, 1, priD);
    RU(10, 4, 12, 1, pri); RU(11, 3, 10, 1, pri); RU(12, 2, 8, 1, pri); RU(13, 1, 6, 1, pri); RU(14, 0, 4, 1, pri);
    RU(10, 4, 12, 1, trim); RU(17, 1, 2, 3, priD);
    RU(11, 19, 10, 1, trim);
    staff(sec);
  }
  if (cls === 'Monk') {
    RU(9, 7, 14, 1, sec); RU(23, 8, 2, 1, sec); RU(24, 9, 2, 2, sec); RU(23, 11, 1, 1, sec);
  }
  if (cls === 'Rogue') {
    RU(9, 4, 14, 2, priD); RU(8, 6, 15, 1, priD); RU(8, 7, 2, 10, priD); RU(22, 7, 2, 10, priD);
    RU(10, 18, 12, 2, sec); RU(20, 20, 2, 6, sec); RU(20, 24, 2, 2, dark(sec, 0.2));
    if (wp === 0) { RU(8, 26, 1, 4, '#dfe8f5'); RU(8, 29, 1, 1, wood); RU(23, 26, 1, 4, '#dfe8f5'); RU(23, 29, 1, 1, wood); }
    else { RU(8, 26, 1, 4, '#dfe8f5'); RU(8, 29, 1, 1, wood); blade(8, '#dfe8f5', '#9fb0c8'); }
  }
  if (cls === 'Ranger') {
    RU(10, 7, 12, 1, priD); RU(10, 8, 1, 1, sec); RU(21, 8, 1, 1, sec);
    RU(21, 14, 3, 6, wood); RU(21, 14, 3, 1, light(wood, 0.4));
    const str = '#e8e8d0';
    if (pose.armR === 'raise') { RU(25, 2, 1, 14, wood); RU(24, 1, 1, 1, wood); RU(24, 16, 1, 1, wood); RU(24, 2, 1, 14, str); }
    else if (wp === 0) { RU(25, 13, 1, 16, wood); RU(24, 12, 1, 1, wood); RU(24, 29, 1, 1, wood); RU(24, 13, 1, 16, str); }
    else {
      RU(31, 13, 1, 16, wood); RU(30, 12, 1, 1, wood); RU(30, 29, 1, 1, wood);
      if (wp === 1) { RU(30, 13, 1, 8, str); RU(29, 21, 1, 2, str); RU(30, 23, 1, 6, str); RU(24, 21, 9, 1, '#d9c9a0'); RU(33, 20, 1, 3, steel); }
      else RU(30, 13, 1, 16, str);
    }
  }
  if (cls === 'Priest') {
    RU(13, 0, 6, 1, gold); RU(11, 1, 2, 1, gold); RU(19, 1, 2, 1, gold); RU(13, 2, 6, 1, gold);
    RU(11, 19, 10, 1, gold); RU(10, 28, 12, 1, gold);
    staff(gold);
  }

  // outline pass
  const id = o.getImageData(0, 0, W, H), s = id.data, out = new Uint8ClampedArray(s);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (s[i + 3] === 0) {
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ax, ay]) => { const nx = x + ax, ny = y + ay; return nx >= 0 && ny >= 0 && nx < W && ny < H && s[(ny * W + nx) * 4 + 3] > 0; });
      if (n) { out[i] = 18; out[i + 1] = 8; out[i + 2] = 31; out[i + 3] = 255; }
    }
  }
  o.putImageData(new ImageData(out, W, H), 0, 0);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  c.getContext('2d').drawImage(off, 0, 0);
  return c;
}

/* ---------- stage ---------- */
// `look` comes from heroLook(); `beep(f0, f1, duration, type, volume, delay)` plays a tone.
// Returns { press(key, down), jump, attack, victory, destroy }.
export function createStage(canvas, look, beep = () => {}) {
  const cx = canvas.getContext('2d');
  canvas.width = SW; canvas.height = SH;
  const off = document.createElement('canvas'); off.width = W; off.height = H;

  const P = look;
  const S = { cam: 0, y: 46, vy: 0, facing: 1, atk: -1, fired: false, vict: false, flash: 1, dust: 0, drop: true, moving: false };
  const keys = {}, parts = [], shots = [], cache = {};
  let time = 0, raf = 0, last = performance.now();

  const frame = (anim, i, blink) => {
    const k = `${anim}|${i}|${blink ? 1 : 0}`;
    cache[k] ??= drawSprite(off, P, { ...ANIMS[anim][i], blink });
    return cache[k];
  };
  const addPart = (x, y, vx, vy, life, c, g = 0) => parts.push({ x, y, vx, vy, life, max: life, c, g });

  /* theme: a night sky tinted by the flag */
  const pri = P.flag[1];
  const top = mix(pri, '#04020c', 0.88), bot = mix(light(pri, 0.1), '#3a2060', 0.5);
  const theme = { far: mix(bot, '#000000', 0.4), near: mix(bot, '#000000', 0.6), tree: mix(bot, '#000000', 0.72), ground: mix(bot, '#000000', 0.75), seam: mix(bot, '#000000', 0.9), grass: mix(P.flag[2], '#1e5a3a', 0.55) };
  const sky = document.createElement('canvas'); sky.width = SW; sky.height = SH;
  {
    const s = sky.getContext('2d');
    for (let y = 0; y < GY; y++) { s.fillStyle = mix(top, bot, Math.pow(y / GY, 1.4)); s.fillRect(0, y, SW, 1); }
    s.globalAlpha = 0.08; s.fillStyle = '#fff3c4';
    [12, 17].forEach((r) => { s.beginPath(); s.arc(92, 16, r, 0, 7); s.fill(); });
    s.globalAlpha = 1;
    for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) if (x * x + y * y <= 64) { s.fillStyle = '#fff3c4'; s.fillRect(92 + x, 16 + y, 1, 1); }
    s.fillStyle = '#e6d79a'; [[-3, -2, 2], [2, 2, 2], [1, -4, 1], [-4, 3, 1]].forEach(([x, y, r]) => s.fillRect(92 + x, 16 + y, r, r));
  }
  const STARS = Array.from({ length: 40 }, (_, i) => ({ x: hash(i * 3) * SW, y: hash(i * 3 + 1) * 38, p: hash(i * 3 + 2) * 6 }));
  const FIRE = Array.from({ length: 16 }, (_, i) => ({ x: hash(i * 5 + 1) * SW, y: 35 + hash(i * 5 + 2) * 28, p: hash(i * 5 + 3) * 6 }));

  function layer(par, base, amp, scale, color) {
    cx.fillStyle = color;
    for (let x = 0; x < SW; x++) { const h = Math.floor(base - amp * noise((x + S.cam * par) * scale)); cx.fillRect(x, h, 1, GY - h); }
  }
  function drawBG(t) {
    cx.drawImage(sky, 0, 0);
    STARS.forEach((st) => {
      const x = (((st.x - S.cam * 0.02) % SW) + SW) % SW;
      cx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + st.p));
      cx.fillStyle = '#fff'; cx.fillRect(Math.floor(x), Math.floor(st.y), 1, 1);
    });
    cx.globalAlpha = 1;
    layer(0.12, 46, 16, 0.045, theme.far);
    layer(0.3, 56, 12, 0.07, theme.near);
    // pines
    cx.fillStyle = theme.tree;
    const off55 = Math.floor(S.cam * 0.55);
    for (let sx = 0; sx < SW; sx++) {
      const wx = sx + off55;
      if (wx % 17 === 0 && hash(Math.floor(wx / 17)) > 0.45) {
        for (let r = 0; r < 10; r++) { const hf = Math.floor(r / 2); cx.fillRect(sx - hf, GY - 15 + r, hf * 2 + 1, 1); }
        cx.fillRect(sx, GY - 5, 1, 5);
      }
    }
    // ground
    cx.fillStyle = theme.ground; cx.fillRect(0, GY, SW, SH - GY);
    cx.fillStyle = theme.grass; cx.fillRect(0, GY, SW, 2);
    cx.fillStyle = theme.seam;
    const cam = Math.floor(S.cam);
    for (let row = 0, y = GY + 3; y < SH; y += 5, row++) {
      cx.fillRect(0, y, SW, 1);
      const sh = row % 2 ? 6 : 0;
      for (let x = -((((cam + sh) % 12) + 12) % 12); x < SW; x += 12) cx.fillRect(x, y, 1, 5);
    }
    // foreground grass tufts
    cx.fillStyle = theme.grass;
    for (let sx = 0; sx < SW; sx++) { const wx = sx + cam; if (hash(wx * 13) > 0.93) { cx.fillRect(sx, GY - 2, 1, 2); cx.fillRect(sx + 1, GY - 3, 1, 1); } }
    // fireflies
    FIRE.forEach((f) => {
      const x = (((f.x - S.cam * 0.5 + Math.sin(t * 0.8 + f.p) * 6) % SW) + SW) % SW, y = f.y + Math.sin(t * 1.2 + f.p * 2) * 4;
      cx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + f.p));
      cx.fillStyle = P.accent; cx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
    });
    cx.globalAlpha = 1;
  }

  /* actions */
  function jump() { if (S.y <= 0 && S.atk < 0) { S.vy = 105; S.vict = false; beep(300, 720, 0.15); } }
  function attack() { if (S.atk < 0) { S.atk = 0; S.fired = false; S.vict = false; } }
  function victory() {
    S.vict = true;
    [523, 659, 784, 1047].forEach((f, i) => beep(f, f * 1.01, 0.18, 'square', 0.09, i * 0.1));
    for (let i = 0; i < 20; i++) addPart(CX, GY - 30 - S.y, (Math.random() - 0.5) * 60, -20 - Math.random() * 40, 1, P.accent, 40);
  }
  function spawnAttack() {
    const f = S.facing, cy = GY - 22 - S.y, acc = P.accent;
    beep(900, 180, 0.12, 'sawtooth', 0.09);
    if (P.cls === 'Knight' || P.cls === 'Rogue' || P.cls === 'Monk') {
      const reach = P.cls === 'Monk' ? 10 : 17;
      for (let i = 0; i < 18; i++) {
        const a = -1.15 + i * (2.3 / 17);
        addPart(CX + f * (10 + Math.cos(a) * reach), cy + Math.sin(a) * reach, f * 25, 0, 0.2, i % 3 ? '#ffffff' : acc);
      }
      if (P.cls === 'Monk') for (let i = 0; i < 10; i++) addPart(CX + f * 30, cy, f * (20 + Math.random() * 50), (Math.random() - 0.5) * 40, 0.3, acc);
    } else {
      shots.push({ x: CX + f * 26, y: GY - 20 - S.y, vx: f * 110, life: 1.1, kind: P.cls === 'Ranger' ? 'arrow' : 'orb', f });
    }
  }
  function land() {
    beep(120, 50, 0.1, 'sine', 0.2);
    for (let i = 0; i < 8; i++) addPart(CX + (Math.random() - 0.5) * 10, GY - 1, (Math.random() - 0.5) * 40, -Math.random() * 14, 0.4, '#cfc8e8', 30);
    // the arrival: falling out of the sky into the new world
    if (S.drop) { S.drop = false; for (let i = 0; i < 40; i++) addPart(CX, GY - 3, (Math.random() - 0.5) * 110, -Math.random() * 60, 0.8, i % 2 ? '#ffd166' : '#ffffff', 60); }
  }

  function update(dt) {
    const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    S.moving = false;
    if (S.atk >= 0) {
      S.atk += dt; const f = Math.floor(S.atk * 10);
      if (f >= 2 && !S.fired) { S.fired = true; spawnAttack(); }
      if (f >= 4) S.atk = -1;
    } else if (dir) { S.facing = dir; S.cam += dir * 42 * dt; S.moving = true; S.vict = false; }
    if (S.y > 0 || S.vy > 0) { S.vy -= 260 * dt; S.y += S.vy * dt; if (S.y <= 0) { S.y = 0; S.vy = 0; land(); } }
    if (S.moving && S.y === 0) { S.dust -= dt; if (S.dust <= 0) { S.dust = 0.16; addPart(CX - S.facing * 6, GY - 1, -S.facing * 10, -6, 0.35, '#cfc8e8', 20); } }
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i]; s.x += s.vx * dt; s.life -= dt;
      if (s.kind === 'orb') addPart(s.x, s.y, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, 0.3, P.accent);
      if (s.life <= 0 || s.x < -10 || s.x > SW + 10) { for (let k = 0; k < 10; k++) addPart(s.x, s.y, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50, 0.3, P.accent); shots.splice(i, 1); }
    }
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.life -= dt; if (p.life <= 0) parts.splice(i, 1); }
    if (S.flash > 0) S.flash -= dt * 1.4;
  }

  function render() {
    drawBG(time);
    const cy = GY - 22 - S.y;
    // rarity aura
    if (P.glow) {
      cx.globalAlpha = (P.legendary ? 0.16 : 0.1) + 0.04 * Math.sin(time * 3); cx.fillStyle = P.glow;
      cx.beginPath(); cx.ellipse(CX, cy, 22, 30, 0, 0, 7); cx.fill();
      cx.globalAlpha = 0.07; cx.beginPath(); cx.ellipse(CX, cy, 30, 38, 0, 0, 7); cx.fill();
      cx.globalAlpha = 1;
      const n = P.legendary ? 8 : 4;
      for (let i = 0; i < n; i++) { const a = time * 1.4 + (i * 6.283) / n; cx.fillStyle = P.glow; cx.fillRect(Math.round(CX + Math.cos(a) * 24), Math.round(cy + Math.sin(a) * 30), 1, 1); }
    }
    // shadow
    const sw = Math.max(8, 20 - S.y * 0.3); cx.fillStyle = 'rgba(0,0,0,.45)'; cx.fillRect(Math.round(CX - sw / 2), GY - 1, Math.round(sw), 2);
    // pick animation frame
    let anim = 'idle', fi = Math.floor(time * 3) % 4;
    if (S.atk >= 0) { anim = 'attack'; fi = Math.min(3, Math.floor(S.atk * 10)); }
    else if (S.y > 0) { anim = 'jump'; fi = 0; }
    else if (S.vict) { anim = 'victory'; fi = Math.floor(time * 4) % 2; }
    else if (S.moving) { anim = 'walk'; fi = Math.floor(time * 9) % 4; }
    const f = frame(anim, fi, time % 3.2 < 0.13);
    cx.save(); cx.translate(CX, 0); cx.scale(S.facing, 1);
    cx.drawImage(f, -24, Math.round(GY - (OY + 41) - S.y));
    cx.restore();
    // projectiles
    shots.forEach((s) => {
      if (s.kind === 'arrow') { cx.fillStyle = '#d9c9a0'; cx.fillRect(Math.round(s.x - 4), Math.round(s.y), 8, 1); cx.fillStyle = '#fff'; cx.fillRect(Math.round(s.x + (s.f > 0 ? 4 : -5)), Math.round(s.y - 1), 1, 3); }
      else { cx.fillStyle = P.accent; cx.fillRect(Math.round(s.x - 2), Math.round(s.y - 2), 4, 4); cx.fillStyle = '#fff'; cx.fillRect(Math.round(s.x - 1), Math.round(s.y - 1), 2, 2); }
    });
    // particles
    parts.forEach((p) => { cx.globalAlpha = Math.max(0, p.life / p.max); cx.fillStyle = p.c; cx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); });
    cx.globalAlpha = 1;
    if (S.flash > 0) { cx.fillStyle = `rgba(255,255,255,${Math.min(1, S.flash)})`; cx.fillRect(0, 0, SW, SH); }
    if (P.legendary && Math.random() < 0.35) addPart(CX + (Math.random() - 0.5) * 36, cy + 20, 0, -14 - Math.random() * 14, 1, '#ffd166');
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    update(dt); render();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  return {
    press: (key, down) => { keys[key] = down; },
    jump, attack, victory,
    destroy: () => cancelAnimationFrame(raf),
  };
}

/* ======================================================================
 * Fighting-game arena: both fighters, full body, face to face on a tiled stage.
 * Reuses drawSprite, so the villain is forged in the same pixel style as the hero.
 * ====================================================================== */

// A villain's pixel look, picked from its name so the same villain always looks the same.
// "Rivals" (shadows of non-villains) are drawn in drained, monochrome colours.
export function foeLook(name = '', rival = false) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pick = (list, shift) => list[(h >>> shift) % list.length];
  const base = {
    cls: pick(['Knight', 'Monk', 'Rogue', 'Mage'], 3),
    style: h % 4,
    skin: pick(['#d9b08c', '#c99a7a', '#e8cdb0', '#a98a9a'], 11),
    hair: pick(['#1a1020', '#8a1f3a', '#d8d8e8', '#3a1f5a', '#c0392b'], 5),
    eye: pick(['#ff3a4a', '#ffb020', '#b05cff', '#4aeaff'], 8),
    pri: pick(['#5a1020', '#2a1a4a', '#1f2a3a', '#4a2a10'], 14),
    trim: pick(['#c9a45a', '#a0a0b8', '#e04a5a'], 17),
    accent: pick(['#ff3a4a', '#b05cff', '#ff9a2a', '#2fe0c8'], 20),
  };
  if (!rival) return base;
  return { ...base, skin: '#8a8aa0', hair: '#14141c', eye: '#c9c9ff', pri: '#22222e', trim: '#6a6a8a', accent: '#7a5cff' };
}

const AW = 240, AH = 135; // arena size in logical pixels (16:9)
const FLOOR_Y = 78; // where the tiled floor begins
const FEET_Y = 118; // fighters stand on this line
const SCALE = 2; // fighters are drawn at 2x so they fill the stage
const POSES = {
  idle: ANIMS.idle,
  attack: ANIMS.attack,
  victory: ANIMS.victory,
  guard: [{ dy: 0, armL: 'up', armR: 'up' }],
  hurt: [{ dy: 1, aL: -1, aR: -1, lL: 1 }],
};

// Returns { attack(who, reach), hit(who, strong), guard(who), stun(who, on), ko(who), victory(who), shake(strong), destroy }.
// `who` is 'hero' or 'foe'. `accent` tints the stage (a hex colour); `beep` plays a tone.
export function createArena(canvas, heroLook, foeLookData, { accent = '#7dd3fc', beep = () => {} } = {}) {
  const cx = canvas.getContext('2d');
  canvas.width = AW; canvas.height = AH;
  cx.imageSmoothingEnabled = false; // keep the 2x pixel art crisp
  const off = document.createElement('canvas'); off.width = W; off.height = H;
  const cache = new Map();
  const sprite = (look, key, pose, blink, flash) => {
    const k = `${look.cls}|${look.hair}|${look.pri}|${key}|${blink ? 1 : 0}|${flash ? 1 : 0}`;
    if (!cache.has(k)) {
      const c = drawSprite(off, look, { ...pose, blink });
      if (flash) {
        const f = document.createElement('canvas'); f.width = W; f.height = H;
        const g = f.getContext('2d'); g.drawImage(c, 0, 0);
        g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(0, 0, W, H);
        cache.set(k, f);
      } else cache.set(k, c);
    }
    return cache.get(k);
  };

  const mk = (look, base, facing) => ({ look, base, x: base, facing, st: 'idle', t: 0, reach: 30, struck: false, kn: 0, flash: 0, stun: false, down: 0, vict: false });
  const F = { hero: mk(heroLook, 74, 1), foe: mk(foeLookData, 166, -1) };
  const parts = [];
  let time = 0, raf = 0, last = performance.now(), shakeT = 0, shakeAmp = 0;

  const addPart = (x, y, vx, vy, life, c, g = 140) => parts.push({ x, y, vx, vy, life, max: life, c, g });
  const burst = (x, y, strong) => {
    const n = strong ? 30 : 16;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 30 + Math.random() * (strong ? 120 : 70);
      addPart(x, y, Math.cos(a) * s, Math.sin(a) * s - 20, 0.35 + Math.random() * 0.3, ['#ffffff', '#2dd4bf', '#fb923c', '#fde047'][i % 4]);
    }
  };

  /* ---------- the stage ---------- */
  const wall = mix('#8d97a8', accent, 0.18), wallD = dark(wall, 0.28);
  const bg = document.createElement('canvas'); bg.width = AW; bg.height = AH;
  {
    const g = bg.getContext('2d');
    for (let y = 0; y < FLOOR_Y; y++) { g.fillStyle = mix(dark(wall, 0.5), light(wall, 0.15), y / FLOOR_Y); g.fillRect(0, y, AW, 1); }
    // stacked cubes, pyramid-shaped on both sides
    const cube = (x, y, s, tone) => {
      const face = mix(wall, tone, 0.12);
      g.fillStyle = face; g.fillRect(x, y, s, s);
      g.fillStyle = light(face, 0.28); g.fillRect(x, y, s, 2);
      g.fillStyle = dark(face, 0.25); g.fillRect(x + s - 3, y + 2, 3, s - 2);
      g.fillStyle = dark(face, 0.45); g.fillRect(x, y + s - 1, s, 1); g.fillRect(x, y, 1, s);
    };
    [[0, [5, 4, 3, 2, 1]], [AW - 16 * 5, [1, 2, 3, 4, 5]]].forEach(([x0, hs]) => hs.forEach((h, i) => { for (let r = 0; r < h; r++) cube(x0 + i * 16, FLOOR_Y - 16 * (r + 1), 16, r % 2 ? '#ffffff' : '#000000'); }));
    // glass panels in the middle
    for (let i = 0; i < 4; i++) {
      const x = 92 + i * 15;
      g.fillStyle = `rgba(255,255,255,${0.1 + (i % 2) * 0.06})`; g.fillRect(x, 8, 13, FLOOR_Y - 12);
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x, 8, 13, 1); g.fillRect(x, 8, 1, FLOOR_Y - 12);
    }
    // the tiled floor, in perspective
    const vx = AW / 2;
    for (let y = FLOOR_Y; y < AH; y++) { g.fillStyle = mix(light(wall, 0.3), light(wall, 0.55), (y - FLOOR_Y) / (AH - FLOOR_Y)); g.fillRect(0, y, AW, 1); }
    g.fillStyle = wallD; g.fillRect(0, FLOOR_Y, AW, 1);
    g.fillStyle = dark(wall, 0.18);
    for (let i = 0; i < 9; i++) { const t = i / 8; g.fillRect(0, Math.round(FLOOR_Y + 2 + (AH - FLOOR_Y) * t * t * 1.05), AW, 1); }
    for (let k = -9; k <= 9; k++) {
      const bx = vx + k * 34; // where this line meets the bottom edge
      for (let y = FLOOR_Y; y < AH; y++) {
        const t = (y - FLOOR_Y) / (AH - FLOOR_Y);
        const x = Math.round(vx + (bx - vx) * (0.18 + 0.82 * t));
        if (x >= 0 && x < AW) g.fillRect(x, y, 1, 1);
      }
    }
  }
  const DIAMONDS = Array.from({ length: 7 }, (_, i) => ({ x: hash(i * 7) * AW, y: 10 + hash(i * 7 + 1) * 60, s: 3 + Math.floor(hash(i * 7 + 2) * 4), p: hash(i * 7 + 3) * 6 }));

  /* ---------- actions ---------- */
  const other = (who) => (who === 'hero' ? 'foe' : 'hero');
  function attack(who, reach = 30) {
    const f = F[who];
    if (f.st === 'ko') return;
    f.st = 'attack'; f.t = 0; f.reach = reach; f.struck = false; f.vict = false;
  }
  function hit(who, strong = false) {
    const f = F[who];
    if (f.st === 'ko') return;
    f.kn = f.facing * -(strong ? 14 : 8); f.flash = 0.13;
    if (f.st === 'idle') { f.st = 'hurt'; f.t = 0; }
    burst(f.base + f.kn + f.facing * -4, FEET_Y - 52, strong);
    if (strong) shake(true);
  }
  function guard(who) { const f = F[who]; if (f.st === 'ko') return; f.st = 'guard'; f.t = 0; }
  function stun(who, on) { F[who].stun = on; }
  function ko(who) { const f = F[who]; f.st = 'ko'; f.t = 0; f.stun = false; beep(160, 40, 0.5, 'sawtooth', 0.12); burst(f.x, FEET_Y - 40, true); }
  function victory(who) { const f = F[who]; if (f.st !== 'ko') { f.st = 'victory'; f.vict = true; f.t = 0; } }
  function shake(strong = false) { shakeT = strong ? 0.3 : 0.18; shakeAmp = strong ? 3 : 1.5; }

  /* ---------- frame loop ---------- */
  const ease = (t) => 1 - (1 - t) * (1 - t);
  function update(dt) {
    for (const who of ['hero', 'foe']) {
      const f = F[who];
      f.t += dt;
      f.flash = Math.max(0, f.flash - dt);
      f.kn *= Math.pow(0.0006, dt); // knockback recovers quickly
      let dx = 0;
      if (f.st === 'attack') {
        const t = f.t;
        if (t < 0.12) dx = -f.facing * 5 * (t / 0.12);                       // wind up
        else if (t < 0.27) dx = f.facing * (-5 + (f.reach + 5) * ease((t - 0.12) / 0.15)); // dash in
        else if (t < 0.5) dx = f.facing * f.reach;                           // strike
        else if (t < 0.7) dx = f.facing * f.reach * (1 - ease((t - 0.5) / 0.2)); // back
        else { f.st = 'idle'; }
        if (t >= 0.27 && !f.struck) { f.struck = true; beep(700, 160, 0.1, 'sawtooth', 0.05); for (let i = 0; i < 6; i++) addPart(f.x - f.facing * 8, FEET_Y - 1, -f.facing * (20 + Math.random() * 40), -Math.random() * 20, 0.3, '#e6e0f0', 80); }
      } else if (f.st === 'hurt' && f.t > 0.3) f.st = 'idle';
      else if (f.st === 'guard' && f.t > 0.55) f.st = 'idle';
      f.x = f.base + dx + f.kn;
      if (f.st === 'ko') f.down = Math.min(1, f.t / 0.7);
    }
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.life -= dt; if (p.life <= 0) parts.splice(i, 1); }
    shakeT = Math.max(0, shakeT - dt);
  }

  function poseFor(f) {
    if (f.st === 'attack') return ['attack', Math.min(3, Math.floor(f.t * 7)), ANIMS.attack[Math.min(3, Math.floor(f.t * 7))]];
    if (f.st === 'guard') return ['guard', 0, POSES.guard[0]];
    if (f.st === 'hurt') return ['hurt', 0, POSES.hurt[0]];
    if (f.st === 'victory') { const i = Math.floor(time * 4) % 2; return ['victory', i, POSES.victory[i]]; }
    if (f.st === 'ko') return ['hurt', 0, POSES.hurt[0]];
    const i = Math.floor(time * 3) % 4;
    return ['idle', i, POSES.idle[i]];
  }

  function drawFighter(f, reflect) {
    const [name, i, pose] = poseFor(f);
    const img = sprite(f.look, `${name}${i}`, pose, time % 3.4 < 0.13, f.flash > 0);
    cx.save();
    cx.translate(Math.round(f.x), FEET_Y);
    if (f.st === 'ko') { cx.translate(0, 4 * f.down); cx.rotate(-f.facing * (Math.PI / 2) * ease(f.down)); }
    cx.scale(f.facing * SCALE, reflect ? -SCALE : SCALE);
    cx.drawImage(img, -24, -49);
    cx.restore();
  }

  function render() {
    cx.save();
    if (shakeT > 0) cx.translate(Math.round((Math.random() - 0.5) * 2 * shakeAmp), Math.round((Math.random() - 0.5) * 2 * shakeAmp));
    cx.drawImage(bg, 0, 0);
    // floating diamonds
    DIAMONDS.forEach((d) => {
      const y = (((d.y - time * 6 + d.p * 10) % 75) + 75) % 75 + 4;
      cx.globalAlpha = 0.45 + 0.35 * Math.sin(time * 2 + d.p);
      cx.fillStyle = '#2dd4bf';
      for (let k = 0; k < d.s; k++) { // a diamond: widening to the middle row, then narrowing
        cx.fillRect(Math.round(d.x - k), Math.round(y + k), k * 2 + 1, 1);
        cx.fillRect(Math.round(d.x - (d.s - 1 - k)), Math.round(y + d.s + k), (d.s - 1 - k) * 2 + 1, 1);
      }
      cx.globalAlpha = 1;
    });
    // shadows + reflections
    ['hero', 'foe'].forEach((who) => {
      const f = F[who];
      cx.fillStyle = 'rgba(0,0,0,0.3)'; cx.fillRect(Math.round(f.x - 18), FEET_Y, 36, 3);
      if (f.st !== 'ko') { cx.globalAlpha = 0.16; drawFighter(f, true); cx.globalAlpha = 1; }
    });
    // the fighters (the one striking is drawn on top)
    const order = F.hero.st === 'attack' ? ['foe', 'hero'] : ['hero', 'foe'];
    order.forEach((who) => drawFighter(F[who]));
    // guard shield
    ['hero', 'foe'].forEach((who) => {
      const f = F[who];
      if (f.st !== 'guard') return;
      cx.strokeStyle = `rgba(125,211,252,${0.9 - f.t})`; cx.lineWidth = 2;
      cx.beginPath(); cx.ellipse(f.x + f.facing * 14, FEET_Y - 40, 14 + f.t * 6, 40, 0, 0, 7); cx.stroke();
    });
    // stun stars
    ['hero', 'foe'].forEach((who) => {
      const f = F[who];
      if (!f.stun) return;
      for (let k = 0; k < 3; k++) { const a = time * 5 + k * 2.1; cx.fillStyle = '#fde047'; cx.fillRect(Math.round(f.x + Math.cos(a) * 14), Math.round(FEET_Y - 100 + Math.sin(a) * 4), 3, 3); }
    });
    parts.forEach((p) => { cx.globalAlpha = Math.max(0, p.life / p.max); cx.fillStyle = p.c; cx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); });
    cx.globalAlpha = 1;
    // vignette
    const v = cx.createRadialGradient(AW / 2, AH / 2, 50, AW / 2, AH / 2, 150);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.38)');
    cx.fillStyle = v; cx.fillRect(0, 0, AW, AH);
    cx.restore();
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    update(dt); render();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  return { attack, hit, guard, stun, ko, victory, shake, other, destroy: () => cancelAnimationFrame(raf) };
}
