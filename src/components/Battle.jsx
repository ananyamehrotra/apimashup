// The boss fight screen. Rules live in ../lib/combat.js; this file sequences what the player sees:
// the hero's move (with a cut-in for specials), each hit landing, then the villain's telegraphed reply.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimate } from 'motion/react';
import { createBattle, intentFor, takeTurn } from '../lib/combat.js';
import { beep, play } from '../lib/sound.js';
import { createStage } from '../lib/spriteForge.js';
import { ApGems, BreakBar, CutIn, FloatingNumber, FX_COLORS, FX_LABELS, HealthBar, IntentBadge, SlashFx } from './BattleUi.jsx';

const HIT_MS = 140; // gap between the hits of one move

function CommandButton({ keyHint, icon, label, note, onClick, disabled, accent }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="panel rounded-xl border px-3 py-2.5 text-left transition hover:bg-white/15 disabled:opacity-40"
      style={{ borderColor: `${accent}99` }}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-base font-bold text-white">
          {icon} {label}
        </span>
        <kbd className="rounded bg-white/15 px-1.5 text-[11px] text-white/80">{keyHint}</kbd>
      </span>
      <span className="block text-xs text-white/75">{note}</span>
    </button>
  );
}

function SpecialCard({ special, keyHint, ap, onUse, onPreview, busy }) {
  const color = FX_COLORS[special.fx];
  const affordable = ap >= special.cost;
  return (
    <motion.button
      type="button"
      onClick={onUse}
      disabled={busy || !affordable}
      onMouseEnter={() => affordable && onPreview(special.cost)}
      onMouseLeave={() => onPreview(0)}
      onFocus={() => affordable && onPreview(special.cost)}
      onBlur={() => onPreview(0)}
      whileHover={affordable && !busy ? { y: -3, scale: 1.02 } : undefined}
      className="panel relative overflow-hidden rounded-xl border px-3 py-2.5 text-left transition disabled:opacity-45"
      style={{ borderColor: affordable ? color : 'rgba(255,255,255,0.2)', boxShadow: affordable ? `0 0 16px ${color}44` : 'none' }}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      <span className="flex items-center justify-between gap-2 pl-1">
        <span className="truncate font-display text-sm font-bold text-white sm:text-base">✨ {special.name}</span>
        <kbd className="rounded bg-white/15 px-1.5 text-[11px] text-white/80">{keyHint}</kbd>
      </span>
      <span className="mt-1 flex items-center gap-2 pl-1 text-xs text-white/80">
        <span className="flex gap-1" aria-label={`${special.cost} AP`}>
          {Array.from({ length: special.cost }, (_, i) => (
            <span key={i} className="block h-2.5 w-2.5 rotate-45 rounded-[2px]" style={{ background: affordable ? '#38bdf8' : '#475569' }} />
          ))}
        </span>
        <span>
          {special.hits > 1 ? `${special.hits} hits` : '1 hit'} · {FX_LABELS[special.fx]}
        </span>
      </span>
      {!affordable && <span className="block pl-1 text-[11px] text-amber-300">Needs {special.cost - ap} more AP</span>}
    </motion.button>
  );
}

// Props: character, origin, world, picks (the story choices), story (for the villain's name),
// look (pixel hero), onEnd({ state }) once the fight is decided.
export default function Battle({ character, origin, world, picks, story, look, onEnd }) {
  const [state, setState] = useState(() => createBattle(character, origin, picks));
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState(false); // the villain is mid-attack
  const [log, setLog] = useState(`${story.foe} blocks your path. Watch the badge above them: guard against the heavy attack.`);
  const [preview, setPreview] = useState(0);
  const [apPulse, setApPulse] = useState(null);
  const [fx, setFx] = useState({ foe: null, hero: null });
  const [flash, setFlash] = useState({ foe: null, hero: null });
  const [nums, setNums] = useState([]);
  const [cut, setCut] = useState(null);

  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const alive = useRef(true);
  const seq = useRef(0);
  const actRef = useRef(null);
  const [heroCard, animateHero] = useAnimate();
  const [foeCard, animateFoe] = useAnimate();

  const { hero, foe } = state;
  const intent = intentFor(state.turn);
  const stunned = foe.stagger > 0;

  useEffect(() => {
    alive.current = true;
    const stage = createStage(canvasRef.current, look, beep);
    stageRef.current = stage;
    // a short "battle start" banner
    setCut({ id: -1, name: 'BATTLE START', sub: story.foe, color: '#fb7185' });
    play('impact');
    const timer = setTimeout(() => setCut(null), 900);
    return () => {
      alive.current = false;
      clearTimeout(timer);
      stage.destroy();
    };
  }, [look, story.foe]);

  const wait = (ms) => new Promise((resolve, reject) => setTimeout(() => (alive.current ? resolve() : reject(new Error('gone'))), ms));
  const nextId = () => ++seq.current;
  const pushNum = (side, text, kind, x = 50, delay = 0) => {
    const id = nextId();
    setNums((list) => [...list, { id, side, text, kind, x, delay }]);
    setTimeout(() => setNums((list) => list.filter((n) => n.id !== id)), 1800 + delay * 1000);
  };
  const jitter = () => 36 + Math.random() * 28;
  const shake = (side, strong = false) => {
    const scope = side === 'foe' ? foeCard : heroCard;
    const run = side === 'foe' ? animateFoe : animateHero;
    if (scope.current) run(scope.current, { x: strong ? [0, 16, -16, 10, -10, 4, 0] : [0, 9, -9, 5, -5, 0] }, { duration: strong ? 0.5 : 0.3 });
  };
  const flashOn = (side, color = '#fff') => setFlash((f) => ({ ...f, [side]: { id: nextId(), color } }));

  const canDo = (action) => {
    const special = hero.specials.find((s) => s.id === action);
    if (special) return hero.ap >= special.cost;
    if (action === 'ally') return hero.allyReady;
    return true;
  };

  const act = async (action) => {
    if (busy || state.outcome || !canDo(action)) return;
    setBusy(true);
    setPreview(0);
    const { mid, end, heroEvent, foeEvent } = takeTurn(state, action);
    try {
      /* ---- the hero ---- */
      if (heroEvent.kind === 'special') {
        setCut({ id: nextId(), name: heroEvent.name, sub: `${look.name} · special attack`, color: FX_COLORS[heroEvent.fx] });
        play('special');
        stageRef.current?.attack();
        await wait(720);
        setCut(null);
      }
      setLog(heroEvent.text);
      setApPulse({ id: nextId(), from: state.hero.ap, to: mid.hero.ap });

      if (heroEvent.kind === 'guard') {
        play('guard');
        play('heal');
        setState(mid);
        pushNum('hero', `+${heroEvent.heal} HP`, 'heal');
        pushNum('hero', '+1 AP', 'ap', 50, 0.2);
      } else {
        stageRef.current?.attack();
        const color = FX_COLORS[heroEvent.fx];
        setFx((f) => ({ ...f, foe: { id: nextId(), fx: heroEvent.fx, hits: heroEvent.hits.length, color } }));
        await wait(110);
        setState(mid);
        for (let i = 0; i < heroEvent.hits.length; i++) {
          if (i > 0) await wait(HIT_MS);
          play(i % 2 ? 'land' : 'slash');
          pushNum('foe', heroEvent.crit ? `${heroEvent.hits[i]}!` : `${heroEvent.hits[i]}`, heroEvent.crit ? 'crit' : 'dmg', jitter());
          shake('foe', heroEvent.crit || heroEvent.kind === 'special');
          flashOn('foe');
        }
        if (heroEvent.kind === 'ally') pushNum('hero', `+${heroEvent.heal} HP`, 'heal', 50, 0.15);
        if (heroEvent.apGain > 0) pushNum('hero', `+${heroEvent.apGain} AP`, 'ap', 50, 0.25);
        if (heroEvent.crit) pushNum('foe', 'CRITICAL', 'text', 50, 0.2);
        if (heroEvent.broke) {
          await wait(260);
          play('break');
          shake('foe', true);
          setCut({ id: nextId(), name: 'BREAK!', sub: 'The villain is stunned', color: '#fbbf24' });
          await wait(760);
          setCut(null);
        }
      }
      await wait(480);

      if (mid.outcome === 'victory') {
        stageRef.current?.victory();
        play('legendary');
        if (foeCard.current) animateFoe(foeCard.current, { opacity: 0.35, scale: 0.96 }, { duration: 0.8 });
        await wait(1300);
        onEnd({ state: mid });
        return;
      }

      /* ---- the villain ---- */
      if (foeEvent.kind === 'stunned') {
        setLog(foeEvent.text);
        pushNum('foe', 'STUNNED', 'text');
        setState(end);
        await wait(900);
      } else {
        setActing(true);
        setLog(foeEvent.text);
        const heavy = foeEvent.kind === 'heavy';
        if (foeCard.current) animateFoe(foeCard.current, { x: [0, -48, 0], scale: [1, 1.05, 1] }, { duration: 0.38 });
        await wait(190);
        play(heavy ? 'impact' : 'slash');
        setFx((f) => ({ ...f, hero: { id: nextId(), fx: heavy ? 'cross' : foeEvent.kind === 'flurry' ? 'flurry' : 'slash', hits: foeEvent.hits.length, color: '#fb7185', heavy } }));
        await wait(110);
        setState(end);
        for (let i = 0; i < foeEvent.hits.length; i++) {
          if (i > 0) await wait(HIT_MS);
          play('land');
          pushNum('hero', `-${foeEvent.hits[i]}`, foeEvent.guarded ? 'block' : 'hurt', jitter());
          shake('hero', heavy);
          flashOn('hero', '#ef4444');
        }
        if (foeEvent.guarded) {
          play('guard');
          pushNum('hero', 'BLOCKED', 'block', 50, 0.15);
        }
        setActing(false);
      }
      await wait(420);

      if (end.outcome === 'defeat') {
        await wait(500);
        onEnd({ state: end });
        return;
      }
      setBusy(false);
    } catch {
      // the screen was closed mid-turn
    }
  };
  actRef.current = act;

  useEffect(() => {
    const keys = { a: 'attack', g: 'guard', 1: 's1', 2: 's2', 3: 's3', 4: 'ally', y: 'ally' };
    const onKey = (event) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const action = keys[event.key.toLowerCase()];
      if (action) {
        event.preventDefault();
        actRef.current?.(action);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const heroImage = origin.form?.image ?? origin.poster;
  const outcome = state.outcome;
  const sideNums = (side) => nums.filter((n) => n.side === side).map((n) => <FloatingNumber key={n.id} text={n.text} kind={n.kind} x={n.x} delay={n.delay} />);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative grid grid-cols-2 gap-3 sm:gap-5">
        {/* ---- you ---- */}
        <div ref={heroCard} className="panel relative rounded-2xl border border-white/25 p-3">
          <div className="relative overflow-hidden rounded-lg">
            <canvas ref={canvasRef} className="block aspect-[3/2] w-full rounded-lg bg-black" style={{ imageRendering: 'pixelated' }} aria-label="Your hero in the arena" />
            {fx.hero && <SlashFx key={fx.hero.id} fx={fx.hero.fx} hits={fx.hero.hits} color={fx.hero.color} heavy={fx.hero.heavy} />}
            {flash.hero && <motion.div key={flash.hero.id} className="pointer-events-none absolute inset-0" style={{ background: flash.hero.color }} initial={{ opacity: 0.55 }} animate={{ opacity: 0 }} transition={{ duration: 0.35 }} />}
            {sideNums('hero')}
          </div>
          <div className="mt-2 flex items-center gap-2">
            {heroImage && <img src={heroImage} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover object-top ring-1 ring-white/50" />}
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold text-white sm:text-base">{hero.name}</p>
              <p className="truncate text-[11px] text-white/70">
                {look.name} of {character.country.name} · ⚔ {hero.atk} · crit {Math.round(hero.crit * 100)}%
              </p>
            </div>
          </div>
          <div className="mt-2">
            <HealthBar value={hero.hp} max={hero.maxHp} label={`${hero.name} health`} />
          </div>
          <div className="mt-2">
            <ApGems ap={hero.ap} max={hero.maxAp} preview={preview} pulse={apPulse} />
          </div>
        </div>

        {/* ---- the villain ---- */}
        <div ref={foeCard} className="panel relative rounded-2xl border border-rose-400/60 p-3">
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg bg-black">
            {story.villain.image ? (
              <img
                src={story.villain.image}
                alt={story.foe}
                className={`h-full w-full object-cover object-top transition-[filter] duration-300 ${story.villain.rival ? 'brightness-50 contrast-125 hue-rotate-180' : ''} ${stunned ? 'grayscale-[60%] brightness-75' : ''}`}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl text-white/40">👤</div>
            )}
            <div className="absolute inset-x-0 top-2 z-10 flex justify-center">{!outcome && <IntentBadge intent={intent} stunned={stunned} acting={acting} />}</div>
            {stunned && <motion.div className="pointer-events-none absolute inset-0 border-4 border-amber-300/70" animate={{ opacity: [0.9, 0.3, 0.9] }} transition={{ duration: 0.7, repeat: Infinity }} />}
            {fx.foe && <SlashFx key={fx.foe.id} fx={fx.foe.fx} hits={fx.foe.hits} color={fx.foe.color} />}
            {flash.foe && <motion.div key={flash.foe.id} className="pointer-events-none absolute inset-0" style={{ background: flash.foe.color }} initial={{ opacity: 0.7 }} animate={{ opacity: 0 }} transition={{ duration: 0.3 }} />}
            {sideNums('foe')}
          </div>
          <div className="mt-2 flex h-9 flex-col justify-center">
            <p className="truncate font-display text-sm font-bold text-rose-200 sm:text-base">{story.foe}</p>
            <p className="truncate text-[11px] text-white/70">
              from {origin.title} · ⚔ {foe.atk}
            </p>
          </div>
          <div className="mt-2">
            <HealthBar value={foe.hp} max={foe.maxHp} tone="foe" label={`${story.foe} health`} />
          </div>
          <div className="mt-2">
            <BreakBar value={foe.brk} max={foe.brkMax} stunned={stunned} />
          </div>
        </div>

        <AnimatePresence>{cut && <CutIn key={cut.id} name={cut.name} sub={cut.sub} color={cut.color} />}</AnimatePresence>
      </div>

      <div className="panel rounded-xl border border-white/20 px-4 py-3" aria-live="polite">
        <p className="min-h-[2.75rem] text-sm text-white sm:text-base">{log}</p>
      </div>

      <div className={`grid grid-cols-2 gap-2 ${picks.includes('ally') ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <CommandButton keyHint="A" icon="⚔️" label="Attack" note={`${hero.atk}+ damage · +1 AP`} onClick={() => act('attack')} disabled={busy || Boolean(outcome)} accent={world.accent} />
        <CommandButton keyHint="G" icon="🛡️" label="Guard" note={`block ${Math.round(hero.guardBlock * 100)}% · +1 AP · +8 HP`} onClick={() => act('guard')} disabled={busy || Boolean(outcome)} accent={world.accent} />
        {picks.includes('ally') && (
          <CommandButton keyHint="4" icon="📯" label={hero.allyName ?? 'Ally'} note={hero.allyReady ? 'ally strike · once' : 'used'} onClick={() => act('ally')} disabled={busy || Boolean(outcome) || !hero.allyReady} accent={world.accent} />
        )}
      </div>

      <div>
        <p className="mb-1.5 font-mono text-[11px] tracking-[0.3em] text-sky-200/90 uppercase">Special attacks · cost AP</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {hero.specials.map((special, i) => (
            <SpecialCard key={special.id} special={special} keyHint={String(i + 1)} ap={hero.ap} busy={busy || Boolean(outcome)} onUse={() => act(special.id)} onPreview={setPreview} />
          ))}
        </div>
      </div>
    </div>
  );
}
