// Presentational pieces of the battle screen: bars, AP gems, the telegraph badge, slash effects,
// floating numbers and the special-attack cut-in. No game rules live here (see ../lib/combat.js).
import { motion } from 'motion/react';
import { INTENT_INFO } from '../lib/combat.js';

export const FX_COLORS = { slash: '#93c5fd', cross: '#fca5a5', flurry: '#fcd34d', pierce: '#a5f3fc', burst: '#d8b4fe' };
export const FX_LABELS = { slash: 'Slash', cross: 'Cross cut', flurry: 'Flurry', pierce: 'Pierce', burst: 'Burst' };

/* ---------- bars ---------- */

// A health bar with a pale "ghost" that drains slowly behind the real value, so you can see how much a hit took.
export function HealthBar({ value, max, tone = 'hero', label }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill =
    tone === 'foe' || pct <= 25
      ? 'linear-gradient(90deg,#9f1239,#fb7185)'
      : pct <= 50
        ? 'linear-gradient(90deg,#b45309,#fbbf24)'
        : 'linear-gradient(90deg,#15803d,#4ade80)';
  return (
    <div
      className="relative h-6 overflow-hidden rounded-md bg-black/70 ring-1 ring-white/35"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <motion.div className="absolute inset-y-0 left-0 bg-white/85" initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, delay: 0.45 }} />
      <motion.div className="absolute inset-y-0 left-0" style={{ background: fill }} initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.25 }} />
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 9px, rgba(0,0,0,0.6) 9px 10px)' }} />
      <span className="text-shadow absolute inset-0 flex items-center justify-between px-2 text-[11px] font-bold text-white tabular-nums">
        <span className="tracking-widest opacity-80">{tone === 'foe' ? 'HP' : 'HP'}</span>
        <span>
          {value} / {max}
        </span>
      </span>
    </div>
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
