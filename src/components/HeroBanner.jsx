import { motion } from 'motion/react';
import { flagUrl } from '../lib/countries.js';

const SPARKLES = [
  { top: '4%', left: '6%' },
  { top: '18%', left: '92%' },
  { top: '70%', left: '2%' },
  { top: '82%', left: '96%' },
  { top: '8%', left: '55%' },
  { top: '90%', left: '40%' },
];

// Top of the sheet: the past-life character from the anime, reborn under the
// country's flag, in the world the country belongs to.
export default function HeroBanner({ character, world, origin, saga }) {
  const { country, rarity } = character;
  const ready = origin.status === 'ready';
  const form = ready ? origin.data.form : null;
  const portrait = form?.image ?? (ready ? origin.data.poster : null);
  const place = [country.capital, country.subregion ?? country.region].filter(Boolean).join(' · ');

  return (
    <header className="relative flex flex-col items-center gap-5 pt-2 pb-6 text-center sm:flex-row sm:items-end sm:gap-7 sm:text-left">
      {rarity.name === 'Legendary' &&
        SPARKLES.map((pos, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="pointer-events-none absolute text-xl text-gold"
            style={pos}
            animate={{ opacity: [0, 1, 0], scale: [0.4, 1.4, 0.4], rotate: [0, 90] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3 }}
          >
            ✦
          </motion.span>
        ))}

      <motion.div
        className="relative shrink-0"
        initial={{ opacity: 0, scale: 0.6, rotate: -6 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 14 }}
      >
        <div
          className="h-52 w-36 overflow-hidden rounded-2xl bg-black/50 ring-2 sm:h-60 sm:w-44"
          style={{ '--tw-ring-color': rarity.color, boxShadow: `0 0 44px -4px ${rarity.color}` }}
        >
          {portrait ? (
            <img src={portrait} alt={form ? form.name : ''} crossOrigin="anonymous" className="h-full w-full object-cover object-top" />
          ) : (
            <div className="shimmer h-full w-full" aria-label="Summoning your form" />
          )}
        </div>
        <img
          src={flagUrl(country)}
          alt={`Flag of ${country.name}`}
          className="absolute -right-4 -bottom-3 h-11 w-16 rounded-md object-cover shadow-lg ring-2 ring-white/80"
        />
      </motion.div>

      <motion.div
        className="min-w-0 flex-1"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6 }}
      >
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <span
            className="rounded-full px-3 py-0.5 text-[11px] font-bold tracking-[0.2em] text-black uppercase"
            style={{ background: rarity.color }}
          >
            {rarity.name}
          </span>
          <span
            className="rounded-full bg-black/55 px-3 py-0.5 text-[11px] font-semibold tracking-[0.15em] uppercase ring-1"
            style={{ color: world.accent, '--tw-ring-color': `${world.accent}88` }}
          >
            {world.name}
          </span>
        </div>

        <p className="text-shadow mt-3 text-sm text-white/85">You have been reborn in</p>
        <h2 className="text-shadow font-display text-4xl leading-none font-black text-white sm:text-6xl">{country.name}</h2>
        <p className="text-shadow mt-2 font-display text-lg text-white sm:text-2xl">
          {form ? (
            <>
              <span style={{ color: world.accent }}>{form.name}</span>, the {character.title}
            </>
          ) : (
            <>
              {character.class.icon} The {character.title}
            </>
          )}
        </p>
        {place && <p className="text-shadow mt-1 text-sm text-white/75">{place}</p>}
        <p className="text-shadow mt-2 text-sm text-white/80 italic">{world.tagline}</p>
        {saga && (
          <p
            className={`mt-3 inline-block rounded-md px-3 py-1 text-sm font-semibold ${
              saga.outcome === 'victory' ? 'bg-amber-400/90 text-black' : 'bg-rose-950/80 text-rose-100 ring-1 ring-rose-400/60'
            }`}
          >
            {saga.outcome === 'victory' ? `⚔ Saviour of ${country.name} · defeated ${saga.foe}` : `☠ Fell to ${saga.foe}`}
          </p>
        )}
      </motion.div>
    </header>
  );
}
