import { useState } from 'react';

const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
const HEX_POINTS = [0, 60, 120, 180, 240, 300].map((deg) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [200 + 150 * Math.cos(rad), 200 + 150 * Math.sin(rad)];
});
const triangle = (offset) => [0, 2, 4].map((i) => HEX_POINTS[i + offset].join(',')).join(' ');

// The summoning circle. Colour comes from `currentColor`, so set text colour on it.
export function MagicCircle({ className = '', style }) {
  return (
    <svg viewBox="0 0 400 400" className={className} style={style} fill="none" stroke="currentColor" aria-hidden>
      <defs>
        <path id="rune-ring" d="M200,200 m-170,0 a170,170 0 1,1 340,0 a170,170 0 1,1 -340,0" />
      </defs>
      <g className="magic-spin">
        <circle cx="200" cy="200" r="195" strokeWidth="2" />
        <circle cx="200" cy="200" r="185" strokeWidth="0.75" />
        <text fill="currentColor" stroke="none" fontSize="17" letterSpacing="5.6">
          <textPath href="#rune-ring">{RUNES + RUNES}</textPath>
        </text>
        <circle cx="200" cy="200" r="158" strokeWidth="1.5" />
      </g>
      <g className="magic-spin-reverse">
        <polygon points={triangle(0)} strokeWidth="1.5" />
        <polygon points={triangle(1)} strokeWidth="1.5" />
        {HEX_POINTS.map(([x, y]) => (
          <circle key={x + y} cx={x} cy={y} r="9" strokeWidth="1.5" fill="rgba(0,0,0,0.5)" />
        ))}
        <circle cx="200" cy="200" r="86" strokeWidth="1.5" />
        <rect x="140" y="140" width="120" height="120" strokeWidth="1" />
        <rect x="140" y="140" width="120" height="120" strokeWidth="1" transform="rotate(45 200 200)" />
        <circle cx="200" cy="200" r="28" strokeWidth="2" />
      </g>
    </svg>
  );
}

// Motes of light drifting upward.
export function Particles({ count = 28, color = '#c4b5fd' }) {
  const [motes] = useState(() =>
    Array.from({ length: count }, (_, id) => ({
      id,
      left: `${Math.random() * 100}%`,
      size: 2 + Math.random() * 4,
      duration: `${5 + Math.random() * 8}s`,
      delay: `${-Math.random() * 12}s`,
    })),
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {motes.map((mote) => (
        <span
          key={mote.id}
          className="mote absolute bottom-0 rounded-full"
          style={{
            left: mote.left,
            width: mote.size,
            height: mote.size,
            background: color,
            boxShadow: `0 0 ${mote.size * 3}px ${color}`,
            animationDuration: mote.duration,
            animationDelay: mote.delay,
          }}
        />
      ))}
    </div>
  );
}

// Anime-style radial speed lines around the edge of the screen.
export function SpeedLines({ color = 'rgba(255,255,255,0.22)' }) {
  return (
    <div
      className="speed-lines pointer-events-none absolute inset-[-25%]"
      style={{
        background: `repeating-conic-gradient(from 0deg, transparent 0deg 3deg, ${color} 3deg 3.6deg, transparent 3.6deg 7deg, ${color} 7deg 7.3deg)`,
      }}
      aria-hidden
    />
  );
}
