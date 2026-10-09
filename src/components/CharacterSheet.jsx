import { motion } from 'motion/react';
import { flagUrl } from '../lib/countries.js';
import { STAT_MAX } from '../lib/statGenerator.js';

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

function StatBar({ label, value, detail, color, delay }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-semibold tracking-wide text-white">{label}</span>
        <span className="text-indigo-200">
          <span className="font-display text-lg font-bold text-white">{value}</span>
          <span className="text-indigo-300/70"> / {STAT_MAX}</span>
        </span>
      </div>
      <div className="h-3.5 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/15">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, boxShadow: '0 0 12px rgba(255,255,255,0.35) inset' }}
          initial={{ width: 0 }}
          animate={{ width: `${(value / STAT_MAX) * 100}%` }}
          transition={{ delay, duration: 1.2, ease: 'easeOut' }}
        />
      </div>
      {detail && <p className="mt-1 text-xs text-indigo-200/70">{detail}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-semibold tracking-[0.25em] text-indigo-200/70 uppercase">{title}</h3>
      {children}
    </div>
  );
}

// The status window: everything here is derived from the country's real data.
export default function CharacterSheet({ character }) {
  const { country, rarity } = character;

  return (
    <motion.section
      className="sheen panel relative rounded-2xl border p-5"
      style={{ borderColor: `${rarity.color}99` }}
      initial={{ opacity: 0, scaleY: 0.05 }}
      animate={{ opacity: 1, scaleY: 1 }}
      transition={{ delay: 0.25, duration: 0.45, ease: 'easeOut' }}
    >
      <p className="mb-4 font-mono text-[11px] tracking-[0.35em] uppercase" style={{ color: rarity.color }}>
        【 Status Window 】
      </p>

      <div className="space-y-4">
        <StatBar
          label="❤️ HP"
          value={character.hp}
          detail={country.population ? `from a population of ${compact.format(country.population)}` : 'no one lives here'}
          color="linear-gradient(90deg,#e11d48,#fb7185)"
          delay={0.6}
        />
        <StatBar
          label="🛡️ Defense"
          value={character.defense}
          detail={country.area ? `from ${compact.format(country.area)} km² of land` : null}
          color="linear-gradient(90deg,#0ea5e9,#818cf8)"
          delay={0.8}
        />
      </div>

      <div className="mt-5 space-y-5">
        <Section title="Gold">
          {character.currencies.length ? (
            <p className="text-sm text-indigo-100">
              <span className="font-display text-2xl font-bold text-gold">🪙 {character.gold.toLocaleString()}</span>
              <span className="ml-2 text-indigo-200/80">
                paid in {character.currencies.map((c) => [c.symbol, c.name].filter(Boolean).join(' ')).join(', ')}
              </span>
            </p>
          ) : (
            <p className="text-sm text-indigo-200 italic">Penniless. This land mints no coin.</p>
          )}
        </Section>

        <Section title="Skills · languages spoken">
          {character.skills.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {character.skills.map((skill) => (
                <li key={skill} className="rounded-md bg-indigo-400/20 px-2 py-0.5 text-sm text-white ring-1 ring-indigo-300/40">
                  {skill}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-indigo-200 italic">Speaks only in silence.</p>
          )}
        </Section>

        <Section title="Allies · bordering lands">
          {character.allies.length ? (
            <ul className="flex flex-wrap gap-2">
              {character.allies.map((ally) => (
                <li key={ally.code} className="flex items-center gap-1.5 rounded-md bg-black/40 py-1 pr-2 pl-1 text-xs text-white ring-1 ring-white/15">
                  <img src={flagUrl(ally)} alt="" className="h-4 w-6 rounded-sm object-cover" />
                  {ally.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-indigo-200 italic">Lone wanderer, no allies.</p>
          )}
        </Section>
      </div>
    </motion.section>
  );
}
