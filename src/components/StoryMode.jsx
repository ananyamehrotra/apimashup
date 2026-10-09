import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { hush, narrate } from '../lib/narrator.js';
import { beep, play } from '../lib/sound.js';
import { createStage, heroLook } from '../lib/spriteForge.js';
import { createBattle } from '../lib/combat.js';
import { buildStory } from '../lib/story.js';
import { WORLDS } from '../lib/worlds.js';
import Battle from './Battle.jsx';
import { Particles } from './Effects.jsx';

const TYPE_MS = 16;
const AUTO_NEXT_MS = 550; // pause after the narrator finishes a line
const CHAPTERS = {
  opening: 'Chapter I · Awakening',
  choice1: 'Chapter I · Awakening',
  rising: 'Chapter II · The Shadow',
  choice2: 'Chapter II · The Shadow',
  battle: 'Chapter III · The Battle',
  ending: 'Epilogue',
  result: 'Epilogue',
};
// What the hero does in the arena when a choice is made.
const PICK_MOVE = { train: 'attack', study: 'victory', feast: 'jump', ally: 'victory', sea: 'jump', alone: 'attack', ward: 'jump' };

/* ---------- the lower panel: story text, choices, battle commands ---------- */

function Dialogue({ lines, accent, onLine, onDone }) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const [spoken, setSpoken] = useState(-1); // last line the narrator finished reading
  const line = lines[index];
  const typing = shown < line.text.length;

  // Each line is reported and read aloud once, when it first appears.
  useEffect(() => {
    onLine(line);
    const tone = line.speaker === 'System' ? 'system' : line.speaker ? 'villain' : 'narrator';
    narrate(line.text, { tone, onEnd: () => setSpoken(index) });
    return hush;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    if (!typing) return;
    const timer = setTimeout(() => setShown((n) => n + 2), TYPE_MS);
    return () => clearTimeout(timer);
  }, [typing, shown]);

  const next = () => {
    if (index === lines.length - 1) return onDone();
    setIndex(index + 1);
    setShown(0);
    play('blip');
  };
  const advance = () => (typing ? setShown(line.text.length) : next());

  // Once a line has been read aloud, the story moves on by itself.
  useEffect(() => {
    if (spoken !== index) return;
    const timer = setTimeout(next, AUTO_NEXT_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spoken, index]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const system = line.speaker === 'System';
  return (
    <button
      type="button"
      onClick={advance}
      className="panel block w-full cursor-pointer rounded-2xl border p-4 text-left sm:p-5"
      style={{ borderColor: `${accent}88` }}
      aria-label="Continue the story"
    >
      {line.speaker && (
        <span className="mb-1.5 block font-mono text-xs tracking-[0.25em] uppercase" style={{ color: system ? '#7dd3fc' : accent }}>
          {system ? '【System】' : line.speaker}
        </span>
      )}
      <span className={`block min-h-[5.5rem] text-base leading-relaxed sm:text-lg ${system ? 'font-mono text-sky-100' : 'text-white'}`}>
        {line.text.slice(0, shown)}
      </span>
      <span className="mt-1 block text-right text-xs text-white/60">
        {index + 1} / {lines.length} · {typing ? 'click to skip' : 'click to continue ▼'}
      </span>
    </button>
  );
}

function Choice({ prompt, options, accent, onPick }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-shadow mb-3 text-center font-display text-xl font-bold text-white sm:text-2xl">{prompt}</h2>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((option, i) => (
          <motion.button
            key={option.id}
            type="button"
            onClick={() => onPick(option)}
            className="panel rounded-xl border px-4 py-3 text-left transition hover:scale-[1.03] hover:bg-white/10"
            style={{ borderColor: `${accent}88` }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1 }}
          >
            <span className="block text-sm font-semibold text-white sm:text-base">{option.label}</span>
            <span className="text-sm" style={{ color: accent }}>
              {option.effect}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function Bar({ value, max, color }) {
  return (
    <div className="h-3 overflow-hidden rounded-full bg-black/60 ring-1 ring-white/25">
      <motion.div className="h-full rounded-full" style={{ background: color }} animate={{ width: `${(value / max) * 100}%` }} transition={{ duration: 0.4 }} />
    </div>
  );
}

/* ---------- the whole story ---------- */

// Plays right after the reincarnation. The arena (your pixel hero on the left,
// the villain on the right) stays on screen from the first line to the last
// blow. Calls onFinish({ outcome, foe }): 'victory', 'defeat' or 'skipped'.
export default function StoryMode({ character, world, origin, onFinish }) {
  const story = useMemo(() => buildStory(character, world, origin), [character, world, origin]);
  const look = useMemo(() => heroLook(character), [character]);
  const canvasRef = useRef(null);
  const stageRef = useRef(null);

  const [step, setStep] = useState('opening');
  const [picks, setPicks] = useState([]);
  const [battle, setBattle] = useState(null); // live fight state once the battle starts
  const [revealed, setRevealed] = useState(false); // has the villain stepped out of the shadows?
  const [battleKey, setBattleKey] = useState(0); // bumped to start a fresh fight
  const [hit, setHit] = useState({ side: null, id: 0, text: '' });
  // The journey passes through another, randomly chosen land once the sky tears open.
  const [farImage] = useState(() => {
    const others = Object.values(WORLDS).filter((w) => w.image && w.image !== world.image);
    return others[Math.floor(Math.random() * others.length)]?.image ?? world.image;
  });

  // Before the fight, show the stats the hero would enter it with, so every choice is visible at once.
  const { hero, foe, turn, outcome } = battle ?? createBattle(character, origin, picks);
  const calm = step === 'opening' || step === 'choice1';
  const accent = calm ? world.accent : '#fb7185';

  useEffect(() => {
    const stage = createStage(canvasRef.current, look, beep);
    stageRef.current = stage;
    stage.press('right', true); // the hero walks forward for the whole story
    return () => stage.destroy();
  }, [look]);

  const handleLine = useCallback(
    (line) => {
      if (line.portrait !== 'villain') return;
      if (!revealed) play('impact');
      setRevealed(true);
    },
    [revealed],
  );

  // The first choice is answered by a line of story before the next chapter.
  const risingLines = useMemo(
    () => [{ text: story.reactions[picks[0]] }, ...story.rising].filter((line) => line.text),
    [story, picks],
  );

  const pick = (option, nextStep) => {
    setPicks((previous) => [...previous, option.id]);
    setHit((h) => ({ side: 'buff', id: h.id + 1, text: option.effect }));
    stageRef.current?.[PICK_MOVE[option.id] ?? 'jump']();
    play('reveal');
    setStep(nextStep);
  };

  const startBattle = (option) => {
    setBattle(null);
    pick(option, 'battle');
  };

  // The fight reports back once it is decided; the arena then shows the final numbers.
  const endBattle = ({ state }) => {
    setBattle(state);
    setStep('ending');
  };

  const retry = () => {
    setBattle(null);
    setBattleKey((k) => k + 1);
    setStep('battle');
    stageRef.current?.press('right', true);
    stageRef.current?.jump();
  };

  const finish = (result) => onFinish({ outcome: result, foe: story.foe });
  return (
    <motion.div className="fixed inset-0 z-30 overflow-hidden bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <img src={world.image} alt="" className="kenburns absolute inset-0 h-full w-full object-cover" />
      <img src={farImage} alt="" className={`kenburns absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ${calm ? 'opacity-0' : 'opacity-100'}`} />
      <div className={`absolute inset-0 transition-colors duration-700 ${calm ? 'bg-black/35' : 'bg-[#1a0410]/55'}`} />
      <Particles count={20} color={accent} />
      {/* stepping out of the white-out that ended the summoning */}
      <motion.div className="pointer-events-none absolute inset-0 bg-white" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1.1 }} />

      <div className="absolute inset-0 overflow-y-auto">
        <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center gap-3 p-3 pt-14 sm:gap-4 sm:px-6 sm:pb-6">
          {/* ---- the arena: on screen for the story; the battle brings its own ---- */}
          <div className={`grid grid-cols-2 gap-3 sm:gap-5 ${step === 'battle' ? 'hidden' : ''}`}>
            <motion.div
              className="panel relative rounded-2xl border border-white/20 p-3"
              animate={{ x: hit.side === 'hero' ? [0, -10, 10, -6, 6, 0] : 0 }}
              transition={{ duration: 0.4 }}
            >
              <canvas ref={canvasRef} className="block aspect-[3/2] w-full rounded-lg bg-black" style={{ imageRendering: 'pixelated' }} aria-label="Your hero in the arena" />
              {(hit.side === 'hero' || hit.side === 'buff') && (
                <motion.span
                  key={hit.id}
                  className={`text-shadow absolute top-6 right-0 left-0 text-center font-display font-black ${hit.side === 'hero' ? 'text-3xl text-rose-400' : 'text-xl text-emerald-300'}`}
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: -40 }}
                  transition={{ duration: 1.4 }}
                >
                  {hit.text}
                </motion.span>
              )}
              <div className="mt-2 flex items-center gap-2">
                {(origin.form?.image ?? origin.poster) && (
                  <img src={origin.form?.image ?? origin.poster} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover object-top ring-1 ring-white/50" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold text-white sm:text-base">{hero.name}</p>
                  <p className="truncate text-[11px] text-white/70">
                    {look.name} of {character.country.name}
                  </p>
                </div>
              </div>
              <div className="mt-1.5">
                <Bar value={hero.hp} max={hero.maxHp} color="linear-gradient(90deg,#16a34a,#4ade80)" />
              </div>
              <p className="mt-1 text-xs text-white/85">
                HP {hero.hp} / {hero.maxHp} · ⚔ {hero.atk} · AP {hero.ap}
              </p>
            </motion.div>

            <motion.div
              className={`panel relative rounded-2xl border p-3 transition-colors duration-700 ${revealed ? 'border-rose-400/60' : 'border-white/10'}`}
              animate={{ x: hit.side === 'foe' ? [0, 12, -12, 7, -7, 0] : 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg bg-black">
                {revealed && story.villain.image ? (
                  <motion.img
                    src={story.villain.image}
                    alt={story.foe}
                    className={`h-full w-full object-cover object-top ${story.villain.rival ? 'brightness-50 contrast-125 hue-rotate-180' : ''}`}
                    initial={{ opacity: 0, scale: 1.3 }}
                    animate={{ opacity: outcome === 'victory' ? 0.25 : 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 text-white/40">
                    <span className="text-5xl">{revealed ? '👤' : '？'}</span>
                    {!revealed && <span className="font-mono text-[10px] tracking-[0.3em] uppercase">Something is coming</span>}
                  </div>
                )}
                {hit.side === 'foe' && <motion.div key={hit.id} className="absolute inset-0 bg-white" initial={{ opacity: 0.8 }} animate={{ opacity: 0 }} transition={{ duration: 0.35 }} />}
              </div>
              {hit.side === 'foe' && (
                <motion.span key={hit.id} className="text-shadow absolute top-6 right-0 left-0 text-center font-display text-3xl font-black text-amber-300" initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -40 }} transition={{ duration: 1 }}>
                  {hit.text}
                </motion.span>
              )}
              <div className="mt-2 flex h-9 flex-col justify-center">
                <p className="truncate font-display text-sm font-bold text-rose-200 sm:text-base">{revealed ? story.foe : 'Unknown'}</p>
                <p className="truncate text-[11px] text-white/70">{revealed ? `from ${origin.title}` : 'A presence from your past life'}</p>
              </div>
              <div className="mt-1.5">
                <Bar value={revealed ? foe.hp : 0} max={foe.maxHp} color="linear-gradient(90deg,#be123c,#fb7185)" />
              </div>
              <p className="mt-1 text-xs text-white/85">{revealed ? `HP ${foe.hp} / ${foe.maxHp} · ⚔ ${foe.atk}` : 'HP ???'}</p>
            </motion.div>
          </div>

          {/* ---- story, choices, commands ---- */}
          {step === 'opening' && <Dialogue key="opening" lines={story.opening} accent={accent} onLine={handleLine} onDone={() => setStep('choice1')} />}
          {step === 'choice1' && (
            <Choice prompt={`Your first days in ${character.country.name}`} options={story.firstChoice} accent={accent} onPick={(option) => pick(option, 'rising')} />
          )}
          {step === 'rising' && <Dialogue key="rising" lines={risingLines} accent={accent} onLine={handleLine} onDone={() => setStep('choice2')} />}
          {step === 'choice2' && <Choice prompt="One night to prepare" options={story.secondChoice} accent={accent} onPick={startBattle} />}

          {step === 'battle' && (
            <Battle key={`battle-${battleKey}`} character={character} origin={origin} world={world} picks={picks} story={story} look={look} onEnd={endBattle} />
          )}

          {step === 'ending' && (
            <Dialogue
              key={`ending-${outcome}`}
              lines={outcome === 'victory' ? story.victory : story.defeat}
              accent={outcome === 'victory' ? '#fbbf24' : '#fb7185'}
              onLine={handleLine}
              onDone={() => setStep('result')}
            />
          )}

          {step === 'result' && (
            <motion.div className="panel rounded-2xl border border-white/20 p-5 text-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <h2
                className={`font-display text-4xl font-black sm:text-6xl ${outcome === 'victory' ? 'text-gold drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]' : 'text-rose-500 drop-shadow-[0_0_30px_rgba(225,29,72,0.7)]'}`}
              >
                {outcome === 'victory' ? 'VICTORY' : 'DEFEATED'}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-white">
                {outcome === 'victory'
                  ? `${story.foe} is gone, and ${character.country.name} is safe. Your legend here has only begun.`
                  : `${story.foe} still stands over ${character.country.name}. You can rise and try again.`}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {outcome === 'defeat' && (
                  <button type="button" onClick={retry} className="rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 px-7 py-3 font-display font-bold text-white shadow-[0_0_28px_rgba(244,63,94,0.6)] hover:scale-105">
                    Rise again
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => finish(outcome)}
                  className={`rounded-full px-7 py-3 font-display font-bold text-white hover:scale-105 ${outcome === 'victory' ? 'bg-gradient-to-r from-indigo-500 to-fuchsia-500 shadow-[0_0_28px_rgba(139,123,255,0.6)]' : 'bg-black/60 ring-1 ring-white/40'}`}
                >
                  Open your status window
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <p className="text-shadow pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 font-mono text-[11px] tracking-[0.3em] whitespace-nowrap text-white/85 uppercase">
        {CHAPTERS[step]}
      </p>
      {step !== 'result' && (
        <button
          type="button"
          onClick={() => finish('skipped')}
          className="absolute top-3 left-3 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white ring-1 ring-white/25 hover:bg-black/70"
        >
          Skip story ⏭
        </button>
      )}
    </motion.div>
  );
}
