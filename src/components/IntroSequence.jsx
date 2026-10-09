import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { flagUrl } from '../lib/countries.js';
import { play } from '../lib/sound.js';
import { MagicCircle, Particles, SpeedLines } from './Effects.jsx';

// Scene lengths in milliseconds.
const SCENES = {
  truck: { ms: 1900, sound: 'horn' },
  died: { ms: 2600, sound: 'impact' },
  summon: { ms: 5200, sound: 'portal' },
};
const FULL = ['truck', 'died', 'summon'];
const SHORT = ['summon']; // rerolls skip straight to the summoning

function TruckScene() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#05040f]"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      animate={{ x: [0, 0, -10, 12, -8, 8, 0], y: [0, 0, 6, -6, 4, -4, 0] }}
    >
      <SpeedLines />
      <motion.svg
        viewBox="0 0 200 160"
        className="w-40"
        initial={{ scale: 0.05, opacity: 0.4 }}
        animate={{ scale: 14, opacity: 1 }}
        transition={{ duration: SCENES.truck.ms / 1000, ease: [0.7, 0, 1, 0.6] }}
        aria-hidden
      >
        <defs>
          <radialGradient id="headlight">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="35%" stopColor="#fff7c2" />
            <stop offset="100%" stopColor="#fff7c2" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="30" y="10" width="140" height="120" rx="12" fill="#1b1a2e" stroke="#3b3963" strokeWidth="2" />
        <rect x="42" y="22" width="116" height="46" rx="6" fill="#0b0a17" stroke="#3b3963" />
        <rect x="52" y="96" width="96" height="22" rx="3" fill="#0b0a17" />
        <rect x="24" y="126" width="152" height="14" rx="4" fill="#2a2846" />
        <rect x="40" y="138" width="26" height="20" rx="4" fill="#000" />
        <rect x="134" y="138" width="26" height="20" rx="4" fill="#000" />
        <circle cx="48" cy="106" r="34" fill="url(#headlight)" />
        <circle cx="152" cy="106" r="34" fill="url(#headlight)" />
      </motion.svg>
      <motion.p
        className="absolute bottom-[14%] font-display text-xl text-white sm:text-3xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.5, times: [0, 0.15, 0.8, 1] }}
      >
        …huh? Is that a truck—
      </motion.p>
    </motion.div>
  );
}

function DiedScene() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="absolute inset-0 bg-white"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.9 }}
      />
      <motion.h2
        className="relative font-display text-5xl font-black text-rose-600 drop-shadow-[0_0_30px_rgba(225,29,72,0.7)] sm:text-8xl"
        initial={{ opacity: 0, letterSpacing: '0.02em', scale: 1.3 }}
        animate={{ opacity: 1, letterSpacing: '0.18em', scale: 1 }}
        transition={{ delay: 0.5, duration: 1.4, ease: 'easeOut' }}
      >
        YOU DIED
      </motion.h2>
      <motion.p
        className="relative text-sm tracking-[0.3em] text-rose-200/70 uppercase"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
      >
        Cause of death: Truck-kun
      </motion.p>
      {/* the soul leaving */}
      <motion.span
        className="absolute h-4 w-4 rounded-full bg-sky-200 shadow-[0_0_24px_8px_rgba(186,230,253,0.8)]"
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: -320, opacity: [0, 1, 1, 0], x: [0, 14, -10, 6] }}
        transition={{ delay: 1.1, duration: 1.5, ease: 'easeIn' }}
        aria-hidden
      />
    </motion.div>
  );
}

function SummonScene({ country, world }) {
  const end = SCENES.summon.ms / 1000;
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-hidden px-6 text-center"
      style={{ background: 'radial-gradient(circle at 50% 55%, #2a1c6b 0%, #0a0720 55%, #000 100%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* the portal opens onto the world you are headed for */}
      <motion.img
        src={world.image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        initial={{ opacity: 0, scale: 1.35 }}
        animate={{ opacity: 0.75, scale: 1.05 }}
        transition={{ delay: 2.9, duration: 1.9, ease: 'easeOut' }}
      />
      <div className="absolute inset-0 bg-black/35" />
      <Particles count={36} color="#fde68a" />
      <motion.div
        className="magic-fast absolute text-amber-300"
        style={{ filter: 'drop-shadow(0 0 12px rgba(251,191,36,0.9))' }}
        initial={{ scale: 0, opacity: 0, rotate: -90 }}
        animate={{ scale: 1, opacity: 0.85, rotate: 0 }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      >
        <MagicCircle className="h-[92vmin] w-[92vmin]" />
      </motion.div>
      {/* pillar of light rising from the circle */}
      <motion.div
        className="absolute bottom-0 h-full w-[38vmin] origin-bottom"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(253,230,138,0.28) 35%, rgba(255,255,255,0.5) 50%, rgba(253,230,138,0.28) 65%, transparent)' }}
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: [0, 1, 0.6] }}
        transition={{ delay: 1.1, duration: 1.2, ease: 'easeOut' }}
        aria-hidden
      />

      <motion.p
        className="text-shadow relative font-display text-lg text-indigo-100 sm:text-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.7 }}
      >
        A voice calls from another world…
      </motion.p>
      <motion.p
        className="text-shadow relative font-display text-xl text-white sm:text-3xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.7, duration: 0.7 }}
      >
        “O hero, be reborn in…”
      </motion.p>
      <motion.div
        className="relative flex flex-col items-center gap-3"
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2.8, type: 'spring', stiffness: 160, damping: 12 }}
      >
        <img
          src={flagUrl(country)}
          alt=""
          className="h-20 w-32 rounded-md object-cover shadow-[0_0_40px_rgba(251,191,36,0.8)] ring-2 ring-amber-300 sm:h-24 sm:w-40"
        />
        <p className="text-shadow font-display text-4xl font-black text-gold drop-shadow-[0_0_24px_rgba(251,191,36,0.8)] sm:text-6xl">
          {country.name}
        </p>
        <motion.p
          className="text-shadow font-display text-base tracking-[0.25em] text-white uppercase sm:text-xl"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          {world.name}
        </motion.p>
      </motion.div>

      {/* white-out into the new world */}
      <motion.div
        className="pointer-events-none absolute inset-0 bg-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: end - 0.6, duration: 0.55, ease: 'easeIn' }}
      />
    </motion.div>
  );
}

export default function IntroSequence({ country, world, short, onDone }) {
  const scenes = short ? SHORT : FULL;
  const [step, setStep] = useState(0);
  const scene = scenes[step];

  useEffect(() => {
    play(SCENES[scene].sound);
    const timer = setTimeout(() => {
      if (step < scenes.length - 1) setStep(step + 1);
      else onDone();
    }, SCENES[scene].ms);
    return () => clearTimeout(timer);
  }, [scene, step, scenes.length, onDone]);

  return (
    <motion.button
      type="button"
      onClick={onDone}
      aria-label="Skip intro"
      className="fixed inset-0 z-30 overflow-hidden bg-black"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence>
        {scene === 'truck' && <TruckScene key="truck" />}
        {scene === 'died' && <DiedScene key="died" />}
        {scene === 'summon' && <SummonScene key="summon" country={country} world={world} />}
      </AnimatePresence>
      <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs tracking-widest text-indigo-200/50 uppercase">
        Tap to skip
      </span>
    </motion.button>
  );
}
