// Presentational pieces of the battle screen: bars, AP gems, the telegraph badge, slash effects,
// floating numbers and the special-attack cut-in. No game rules live here (see ../lib/combat.js).
import { motion } from 'motion/react';
import { INTENT_INFO } from '../lib/combat.js';

export const FX_COLORS = { slash: '#93c5fd', cross: '#fca5a5', flurry: '#fcd34d', pierce: '#a5f3fc', burst: '#d8b4fe' };
export const FX_LABELS = { slash: 'Slash', cross: 'Cross cut', flurry: 'Flurry', pierce: 'Pierce', burst: 'Burst' };

/* ---------- bars ---------- */

// A fighting-game life bar: angled ends, the fill anchored to the outer edge, and a red chunk that
// drains slowly behind it to show how much the last hit took. `side` is 'left' (you) or 'right' (the villain).
export function FightBar({ value, max, side = 'left', label }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const low = pct <= 25;
  const right = side === 'right';
  const anchor = right ? { right: 0 } : { left: 0 };
  return (
    <div
      className="relative h-7 overflow-hidden border-2 border-white/90 bg-black/80 shadow-[0_0_14px_rgba(0,0,0,0.7)]"
      style={{ transform: `skewX(${right ? 14 : -14}deg)` }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <motion.div className="absolute inset-y-0 bg-orange-500" style={anchor} initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: 0.5 }} />
      <motion.div
        className="absolute inset-y-0"
        style={{ ...anchor, background: low ? 'linear-gradient(180deg,#fecaca,#ef4444)' : 'linear-gradient(180deg,#99f6e4 0%,#2dd4bf 45%,#0f9d94 100%)' }}
        initial={false}
        animate={{ width: `${pct}%`, opacity: low ? [1, 0.55, 1] : 1 }}
        transition={{ width: { duration: 0.2 }, opacity: { duration: 0.5, repeat: low ? Infinity : 0 } }}
      />
      <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 11px, rgba(0,0,0,0.7) 11px 12px)' }} />
      <div className="absolute inset-x-0 top-0 h-1/3 bg-white/25" />
      <span className={`absolute inset-y-0 flex items-center px-3 text-[11px] font-black text-white tabular-nums italic ${right ? 'left-0' : 'right-0'}`} style={{ transform: `skewX(${right ? -14 : 14}deg)`, textShadow: '0 1px 2px #000, 0 0 4px #000' }}>
        {value}/{max}
      </span>
    </div>
  );
}

// The hexagon between the bars. A real-time fighter counts down here; this one is untimed (a turn-based fight),
// so it shows an infinity sign with the turn underneath.
export function TurnBox({ turn }) {
  return (
    <div className="relative h-[4.25rem] w-[5.5rem]" aria-label={`Turn ${turn}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-white to-slate-400" style={{ clipPath: 'polygon(14% 0, 86% 0, 100% 50%, 86% 100%, 14% 100%, 0 50%)' }} />
      <div className="absolute inset-[3px] flex flex-col items-center justify-center bg-gradient-to-b from-[#1b2230] to-black" style={{ clipPath: 'polygon(14% 0, 86% 0, 100% 50%, 86% 100%, 14% 100%, 0 50%)' }}>
        <span className="font-black text-4xl leading-none text-white">∞</span>
        <motion.span key={turn} className="font-mono text-[10px] tracking-[0.25em] text-teal-300" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          TURN {String(turn).padStart(2, '0')}
        </motion.span>
      </div>
    </div>
  );
}

// A character badge in the corner of the HUD, crackling with lightning.
export function CornerPortrait({ src, side = 'left', color = '#5eead4', fallback = '👤' }) {
  const flip = side === 'right' ? -1 : 1;
  const bolts = [
    'M2 30 L12 24 L9 18 L20 10 L16 4',
    'M4 56 L14 50 L10 44 L22 38',
    'M58 6 L50 14 L54 18 L44 26',
  ];
  return (
    <div className="relative h-16 w-16 shrink-0 sm:h-20 sm:w-20">
      <svg className="absolute -inset-3 z-10 h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)] overflow-visible" viewBox="0 0 64 64" style={{ transform: `scaleX(${flip})` }} aria-hidden>
        {bolts.map((d, i) => (
          <motion.path key={i} d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 3px ${color})` }} animate={{ opacity: [0, 1, 0, 0, 1, 0] }} transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.37, times: [0, 0.05, 0.12, 0.5, 0.55, 0.65] }} />
        ))}
      </svg>
      <div className="h-full w-full overflow-hidden border-2 border-white/90 bg-black shadow-[0_0_16px_rgba(0,0,0,0.7)]" style={{ clipPath: 'polygon(14% 0, 100% 0, 86% 100%, 0 100%)' }}>
        {src ? <img src={src} alt="" className="h-full w-full object-cover object-top" /> : <div className="flex h-full items-center justify-center text-2xl">{fallback}</div>}
      </div>
    </div>
  );
}

// A round-win mark under a name plate; it lights when that side wins.
export function WinMark({ lit, side }) {
  return (
    <motion.span className={`block h-3 w-3 rotate-45 border ${side === 'right' ? 'border-rose-200' : 'border-amber-200'}`} animate={{ background: lit ? (side === 'right' ? '#fb7185' : '#fbbf24') : 'rgba(0,0,0,0.5)', scale: lit ? [1, 1.8, 1] : 1 }} transition={{ duration: 0.5 }} />
  );
}

// "3 HITS" with the damage underneath, in the corner like a fighting game's combo counter.
export function ComboCounter({ combo }) {
  if (combo.hits < 2) return null;
  return (
    <motion.div key={combo.hits} className="pointer-events-none absolute top-[27%] left-3 z-20 text-left" initial={{ scale: 1.9, x: -30, opacity: 0 }} animate={{ scale: 1, x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }}>
      <p className="font-black text-5xl leading-none text-amber-300 italic sm:text-6xl" style={{ WebkitTextStroke: '2px #7c2d12', textShadow: '0 4px 0 #7c2d12, 0 0 22px rgba(251,191,36,0.8)' }}>
        {combo.hits}
        <span className="ml-1 text-2xl sm:text-3xl">HITS</span>
      </p>
      <p className="font-black text-sm text-white italic" style={{ textShadow: '0 2px 0 #000' }}>
        {combo.damage} DAMAGE
      </p>
    </motion.div>
  );
}

// A jagged hit spark at the point of contact.
export function HitSpark({ x = 50, y = 45, color = '#fde047', big = false }) {
  const size = big ? 150 : 100;
  return (
    <motion.svg
      className="pointer-events-none absolute z-20"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
      viewBox="-50 -50 100 100"
      initial={{ scale: 0.2, opacity: 1, rotate: 0 }}
      animate={{ scale: [0.2, 1.15, 1.35], opacity: [1, 1, 0], rotate: 18 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      aria-hidden
    >
      <polygon
        points="0,-48 8,-16 40,-30 18,-6 48,6 16,14 28,44 0,22 -28,44 -16,14 -48,6 -18,-6 -40,-30 -8,-16"
        fill="#fff"
        stroke={color}
        strokeWidth="5"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 8px ${color})` }}
      />
    </motion.svg>
  );
}

// Big slam-in text: "ROUND 1", "FIGHT!", "K.O.".
export function SlamBanner({ text, sub, color = '#fde047', size = 'text-6xl sm:text-8xl' }) {
  return (
    <motion.div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center" initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }} transition={{ duration: 1.4, times: [0, 0.85, 1] }}>
      <motion.p
        className={`font-black ${size} italic tracking-tight`}
        style={{ color, WebkitTextStroke: '3px #000', textShadow: `0 6px 0 #000, 0 0 40px ${color}` }}
        initial={{ scale: 3.2, opacity: 0, filter: 'blur(10px)' }}
        animate={{ scale: [3.2, 0.92, 1, 1.04], opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.45, times: [0, 0.5, 0.75, 1], ease: 'easeOut' }}
      >
        {text}
      </motion.p>
      {sub && (
        <motion.p className="mt-1 font-black text-xl text-white italic sm:text-3xl" style={{ WebkitTextStroke: '1px #000', textShadow: '0 3px 0 #000' }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          {sub}
        </motion.p>
      )}
    </motion.div>
  );
}

export function BreakBar({ value, max, stunned }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className={`w-12 font-mono text-[10px] tracking-widest ${stunned ? 'text-amber-300' : 'text-amber-200/80'}`}>{stunned ? 'BROKEN' : 'BREAK'}</span>
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-black/70 ring-1 ring-white/25" role="progressbar" aria-label="Break gauge" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: stunned ? 'linear-gradient(90deg,#fbbf24,#fff7ad)' : 'linear-gradient(90deg,#d97706,#fbbf24)' }}
          initial={false}
          animate={{ width: `${pct}%`, opacity: stunned ? [1, 0.5, 1] : 1 }}
          transition={{ duration: stunned ? 0.7 : 0.35, repeat: stunned ? Infinity : 0 }}
        />
      </div>
    </div>
  );
}

// Action points as diamonds. `preview` marks the gems a hovered special would spend; `pulse` animates a gain or a spend.
export function ApGems({ ap, max, preview = 0, pulse }) {
  return (
    <div className="flex items-center gap-1.5" role="img" aria-label={`Action points: ${ap} of ${max}`}>
      <span className="mr-1 font-mono text-[11px] font-bold tracking-widest text-sky-200">AP</span>
      {Array.from({ length: max }, (_, i) => {
        const on = i < ap;
        const spending = on && i >= ap - preview;
        const pulsing = pulse && i >= Math.min(pulse.from, pulse.to) && i < Math.max(pulse.from, pulse.to);
        return (
          <motion.span
            key={`${pulse?.id ?? 0}-${i}`}
            className="block h-4 w-4 rotate-45 rounded-[3px] border"
            style={{
              background: spending ? '#fbbf24' : on ? '#38bdf8' : 'rgba(8,47,73,0.55)',
              borderColor: spending ? '#fef3c7' : on ? '#e0f2fe' : 'rgba(125,211,252,0.3)',
              boxShadow: on ? `0 0 ${spending ? 14 : 9}px ${spending ? '#fbbf24' : '#38bdf8'}` : 'none',
            }}
            animate={pulsing ? { scale: [1, 1.7, 1], rotate: [45, 135, 45] } : { scale: 1 }}
            transition={{ duration: 0.45 }}
          />
        );
      })}
      <span className="ml-1 text-xs font-bold text-sky-100 tabular-nums">
        {ap}/{max}
      </span>
    </div>
  );
}

// What the villain will do next. It changes as the turns go by, so you can plan your guard.
export function IntentBadge({ intent, stunned, acting }) {
  if (stunned) {
    return (
      <motion.div className="rounded-full bg-amber-400/90 px-3 py-1 text-xs font-bold text-black shadow-[0_0_18px_rgba(251,191,36,0.8)]" animate={{ rotate: [-2, 2, -2] }} transition={{ duration: 0.5, repeat: Infinity }}>
        💫 STUNNED · open to attack
      </motion.div>
    );
  }
  const info = INTENT_INFO[intent];
  const heavy = intent === 'heavy';
  const icon = { strike: '⚔️', flurry: '🌀', heavy: '☠️' }[intent];
  return (
    <motion.div
      key={intent}
      className={`rounded-full px-3 py-1 text-xs font-bold shadow-lg ${heavy ? 'bg-rose-600 text-white' : 'bg-black/75 text-white ring-1 ring-white/30'}`}
      initial={{ y: -8, opacity: 0 }}
      animate={heavy && !acting ? { y: 0, opacity: 1, scale: [1, 1.1, 1] } : { y: 0, opacity: 1 }}
      transition={heavy && !acting ? { scale: { duration: 0.8, repeat: Infinity } } : { duration: 0.25 }}
    >
      {acting ? '⚔️ attacking…' : `${icon} Next: ${info.label}${info.hits > 1 ? ` ×${info.hits}` : ''}${heavy ? ' — guard!' : ''}`}
    </motion.div>
  );
}

/* ---------- slash effects ---------- */

// Deterministic-ish jitter so repeated hits do not all land on the same line.
const wobble = (i, n) => ((i * 37 + n * 17) % 23) / 23;

// Builds the strokes for one attack. The overlay is a 150x100 box (the 3:2 shape of the card), so strokes are not stretched.
function strokesFor(fx, hits) {
  switch (fx) {
    case 'cross':
      return [
        { d: 'M16 14 L134 86', at: 0 },
        { d: 'M134 14 L16 86', at: 0.13 },
      ];
    case 'flurry':
      return Array.from({ length: Math.max(2, hits) }, (_, i) => {
        const y1 = 12 + wobble(i, 1) * 28;
        const y2 = 62 + wobble(i, 2) * 28;
        return { d: i % 2 ? `M138 ${y1} L12 ${y2}` : `M12 ${y1} L138 ${y2}`, at: i * 0.12, thin: true };
      });
    case 'pierce':
      return [{ d: 'M0 50 L150 50', at: 0 }];
    case 'burst':
      return [];
    default:
      return [{ d: 'M18 16 L132 84', at: 0 }];
  }
}

const DRAW = { duration: 0.4, times: [0, 0.4, 1], ease: 'easeOut' };

// A stroke "draws" across the target and fades, with a bright core and a coloured glow.
export function SlashFx({ fx, hits = 1, color = '#fff', heavy = false }) {
  const strokes = strokesFor(fx, hits);
  const width = heavy ? 4.2 : 2.8;
  return (
    <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible" viewBox="0 0 150 100" preserveAspectRatio="none" aria-hidden>
      {strokes.map((s, i) => {
        const w = s.thin ? width * 0.65 : width;
        return (
          <g key={i} style={{ filter: `drop-shadow(0 0 3px ${color}) drop-shadow(0 0 8px ${color})` }}>
            <motion.path d={s.d} fill="none" stroke={color} strokeLinecap="round" strokeWidth={w} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }} transition={{ ...DRAW, delay: s.at }} />
            <motion.path d={s.d} fill="none" stroke="#fff" strokeLinecap="round" strokeWidth={w * 0.4} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }} transition={{ ...DRAW, delay: s.at }} />
          </g>
        );
      })}
      {fx === 'burst' && (
        <g style={{ filter: `drop-shadow(0 0 6px ${color})` }}>
          <motion.circle cx="75" cy="50" fill="none" stroke={color} strokeWidth="1.6" initial={{ r: 4, opacity: 1 }} animate={{ r: 56, opacity: 0 }} transition={{ duration: 0.55, ease: 'easeOut' }} />
          <motion.circle cx="75" cy="50" fill="#fff" initial={{ r: 3, opacity: 0.95 }} animate={{ r: 24, opacity: 0 }} transition={{ duration: 0.4 }} />
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return (
              <motion.line
                key={i}
                x1="75" y1="50"
                x2={75 + Math.cos(a) * 62} y2={50 + Math.sin(a) * 42}
                stroke={color}
                strokeWidth="1.4"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 1 }}
                animate={{ pathLength: [0, 1, 1], opacity: [1, 1, 0] }}
                transition={{ duration: 0.5, times: [0, 0.4, 1] }}
              />
            );
          })}
        </g>
      )}
      {/* a flash at the point of impact */}
      <motion.circle cx="75" cy="50" fill="#fff" initial={{ r: 0, opacity: 0 }} animate={{ r: [0, heavy ? 30 : 18, 0], opacity: [0, 0.9, 0] }} transition={{ duration: 0.3, delay: 0.12 }} />
    </svg>
  );
}

/* ---------- floating numbers ---------- */

const NUMBER_STYLE = {
  dmg: 'text-3xl text-amber-300',
  crit: 'text-5xl text-yellow-200',
  hurt: 'text-3xl text-rose-400',
  heal: 'text-2xl text-emerald-300',
  block: 'text-xl text-sky-300',
  text: 'text-xl text-white',
  ap: 'text-lg text-sky-300',
};

export function FloatingNumber({ text, kind = 'dmg', x = 50, delay = 0 }) {
  return (
    <motion.span
      className={`text-shadow pointer-events-none absolute top-[28%] z-20 -translate-x-1/2 font-display font-black whitespace-nowrap ${NUMBER_STYLE[kind] ?? NUMBER_STYLE.dmg}`}
      style={{ left: `${x}%`, WebkitTextStroke: '1px rgba(0,0,0,0.55)' }}
      initial={{ opacity: 0, y: 10, scale: 0.5 }}
      animate={{ opacity: [0, 1, 1, 0], y: [10, -14, -44, -78], scale: kind === 'crit' ? [0.5, 1.5, 1.2, 1.1] : [0.5, 1.25, 1, 1] }}
      transition={{ duration: 1.15, delay, times: [0, 0.15, 0.6, 1] }}
    >
      {text}
    </motion.span>
  );
}

/* ---------- special-attack cut-in ---------- */

export function CutIn({ name, sub, color }) {
  return (
    <motion.div className="pointer-events-none absolute inset-x-[-4%] top-1/3 z-30 flex h-24 items-center overflow-hidden sm:h-28" initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }} transition={{ duration: 0.85, times: [0, 0.8, 1] }}>
      <motion.div
        className="absolute inset-0 -skew-x-12"
        style={{ background: `linear-gradient(90deg, transparent, ${color}cc 18%, #0b0920ee 40%, #0b0920ee 70%, transparent)` }}
        initial={{ x: '-100%' }}
        animate={{ x: ['-100%', '0%', '0%', '8%'] }}
        transition={{ duration: 0.85, times: [0, 0.25, 0.8, 1], ease: 'easeOut' }}
      />
      <motion.div className="relative w-full px-8 text-center" initial={{ x: -120, opacity: 0 }} animate={{ x: [-120, 0, 0, 40], opacity: [0, 1, 1, 0] }} transition={{ duration: 0.85, times: [0, 0.25, 0.8, 1] }}>
        <p className="font-mono text-[11px] tracking-[0.4em] text-white/80 uppercase">{sub}</p>
        <p className="text-shadow font-display text-3xl font-black tracking-wide text-white italic sm:text-5xl" style={{ textShadow: `0 0 24px ${color}, 0 3px 0 #000` }}>
          {name}
        </p>
      </motion.div>
    </motion.div>
  );
}
