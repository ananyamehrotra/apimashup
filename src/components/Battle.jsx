// The boss fight screen, dressed as a pixel-art fighting game: two full-body fighters face to face on a
// tiled stage, life bars and portraits across the top, "ROUND 1 / FIGHT!" in and "K.O." out.
// The rules stay turn-based and live in ../lib/combat.js; this file only sequences what the player sees.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimate } from 'motion/react';
import { NO_COMBO, createBattle, extendCombo, intentFor, takeTurn } from '../lib/combat.js';
import { beep, play } from '../lib/sound.js';
import { createArena, foeLook } from '../lib/spriteForge.js';
import { ApGems, BreakBar, ComboCounter, CornerPortrait, CutIn, FX_COLORS, FX_LABELS, FightBar, FloatingNumber, HitSpark, IntentBadge, SlamBanner, SlashFx, TurnBox, WinMark } from './BattleUi.jsx';

const HIT_MS = 140; // gap between the hits of one move
const STRIKE_MS = 270; // how long a fighter takes to wind up and dash in before the blow lands

function CommandButton({ keyHint, icon, label, note, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="panel min-w-0 border-b-4 border-teal-300/90 bg-black/50 px-2.5 py-1.5 text-left transition hover:bg-teal-300/15 disabled:opacity-40"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-black tracking-wide text-white uppercase italic sm:text-base">
          {icon} {label}
        </span>
        <kbd className="rounded bg-white/15 px-1.5 text-[11px] text-white/80">{keyHint}</kbd>
      </span>
      <span className="block truncate text-[11px] text-white/75">{note}</span>
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
      className="panel relative min-w-0 overflow-hidden border-b-4 bg-black/55 px-2.5 py-1.5 text-left transition disabled:opacity-45"
      style={{ borderColor: affordable ? color : 'rgba(255,255,255,0.25)', boxShadow: affordable ? `0 0 16px ${color}44` : 'none' }}
    >
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} />
      <span className="flex items-center justify-between gap-2 pl-1.5">
        <span className="truncate text-sm font-black tracking-wide text-white uppercase italic sm:text-base">{special.name}</span>
        <kbd className="rounded bg-white/15 px-1.5 text-[11px] text-white/80">{keyHint}</kbd>
      </span>
      <span className="mt-0.5 flex items-center gap-2 pl-1.5 text-[11px] text-white/80">
        <span className="flex gap-1" aria-label={`${special.cost} AP`}>
          {Array.from({ length: special.cost }, (_, i) => (
            <span key={i} className="block h-2.5 w-2.5 rotate-45 rounded-[2px]" style={{ background: affordable ? '#38bdf8' : '#475569' }} />
          ))}
        </span>
        <span>
          {special.hits > 1 ? `${special.hits} hits` : '1 hit'} · {FX_LABELS[special.fx]}
        </span>
      </span>
      {!affordable && <span className="block pl-1.5 text-[10px] text-amber-300">Needs {special.cost - ap} more AP</span>}
    </motion.button>
  );
}

// Props: character, origin, world (tints the stage), picks (the story choices), story (the villain's name
// and picture), look (the pixel hero), onEnd({ state }) once the fight is decided.
export default function Battle({ character, origin, world, picks, story, look, onEnd }) {
  const [state, setState] = useState(() => createBattle(character, origin, picks));
  const [busy, setBusy] = useState(true); // locked during the "ROUND 1 / FIGHT!" intro
  const [acting, setActing] = useState(false); // the villain is mid-attack
  const [log, setLog] = useState('');
  const [preview, setPreview] = useState(0);
  const [apPulse, setApPulse] = useState(null);
  const [fx, setFx] = useState({ foe: null, hero: null });
  const [flash, setFlash] = useState({ foe: null, hero: null });
  const [nums, setNums] = useState([]);
  const [sparks, setSparks] = useState([]);
  const [cut, setCut] = useState(null);
  const [banner, setBanner] = useState(null);
  const [combo, setCombo] = useState(NO_COMBO);
  const [wins, setWins] = useState({ hero: false, foe: false });

  const canvasRef = useRef(null);
  const arenaApi = useRef(null);
  const alive = useRef(true);
  const seq = useRef(0);
  const actRef = useRef(null);
  const [arena, animateArena] = useAnimate();
  const box = useRef(null); // the space the stage may fill
  const [size, setSize] = useState({ w: 0, h: 0, aw: 240 }); // stage size in CSS px, and its logical pixel width

  const { hero, foe } = state;
  const intent = intentFor(state.turn);
  const stunned = foe.stagger > 0;
  const outcome = state.outcome;

  const wait = (ms) => new Promise((resolve, reject) => setTimeout(() => (alive.current ? resolve() : reject(new Error('gone'))), ms));
  const nextId = () => ++seq.current;

  // Build the stage, then play "ROUND 1" and "FIGHT!" before the controls unlock.
  useEffect(() => {
    alive.current = true;
    const stage = createArena(canvasRef.current, look, foeLook(story.foe, story.villain.rival), { accent: world.accent, beep });
    arenaApi.current = stage;
    (async () => {
      try {
        setBanner({ id: nextId(), text: 'ROUND 1', sub: story.foe, color: '#fde047' });
        play('impact');
        await wait(1300);
        setBanner({ id: nextId(), text: 'FIGHT!', color: '#fb7185' });
        play('special');
        await wait(850);
        setBanner(null);
        setLog(`${story.foe} blocks your path. Watch the badge above them: guard against the heavy attack.`);
        setBusy(false);
      } catch {
        // closed during the intro
      }
    })();
    return () => {
      alive.current = false;
      stage.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look, story.foe]);

  // Fill the window: measure the free space, then render the pixel stage at exactly that shape.
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const MIN = 240 / 135, MAX = 420 / 135; // 16:9 up to ultra-wide; narrower screens letterbox
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      const aspect = Math.min(MAX, Math.max(MIN, width / height));
      const w = Math.min(width, height * aspect);
      setSize({ w: Math.floor(w), h: Math.floor(w / aspect), aw: Math.round(135 * aspect) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    arenaApi.current?.resize(size.aw);
  }, [size.aw]);

  // stars circle the villain's head while it is stunned
  useEffect(() => {
    arenaApi.current?.stun('foe', stunned);
  }, [stunned]);

  const pushNum = (side, text, kind, x = 50, delay = 0) => {
    const id = nextId();
    setNums((list) => [...list, { id, side, text, kind, x, delay }]);
    setTimeout(() => setNums((list) => list.filter((n) => n.id !== id)), 1800 + delay * 1000);
  };
  const pushSpark = (side, color, big) => {
    const id = nextId();
    setSparks((list) => [...list, { id, side, color, big, x: 30 + Math.random() * 40, y: 25 + Math.random() * 35 }]);
    setTimeout(() => setSparks((list) => list.filter((s) => s.id !== id)), 450);
  };
  const jitter = () => 30 + Math.random() * 40;
  const punch = () => arena.current && animateArena(arena.current, { scale: [1, 1.03, 1] }, { duration: 0.26 });
  const flashOn = (side, color = '#fff') => setFlash((f) => ({ ...f, [side]: { id: nextId(), color } }));

  const canDo = (action) => {
    const special = hero.specials.find((s) => s.id === action);
    if (special) return hero.ap >= special.cost;
    if (action === 'ally') return hero.allyReady;
    return true;
  };

  const knockOut = async (finalState, heroWon) => {
    setWins({ hero: heroWon, foe: !heroWon });
    arenaApi.current?.ko(heroWon ? 'foe' : 'hero');
    arenaApi.current?.victory(heroWon ? 'hero' : 'foe');
    flashOn(heroWon ? 'foe' : 'hero', '#fff');
    play('break');
    setBanner({ id: nextId(), text: 'K.O.', sub: heroWon ? 'YOU WIN' : 'YOU LOSE', color: heroWon ? '#fbbf24' : '#fb7185', size: 'text-8xl sm:text-9xl' });
    if (heroWon) play('legendary');
    await wait(1900);
    onEnd({ state: finalState });
  };

  const act = async (action) => {
    if (busy || state.outcome || !canDo(action)) return;
    setBusy(true);
    setPreview(0);
    const { mid, end, heroEvent, foeEvent } = takeTurn(state, action);
    const stage = arenaApi.current;
    try {
      /* ---- the hero ---- */
      if (heroEvent.kind === 'special') {
        setCut({ id: nextId(), name: heroEvent.name, sub: `${look.name} · special attack`, color: FX_COLORS[heroEvent.fx] });
        play('special');
        await wait(720);
        setCut(null);
      }
      setLog(heroEvent.text);
      setApPulse({ id: nextId(), from: state.hero.ap, to: mid.hero.ap });

      if (heroEvent.kind === 'guard') {
        stage?.guard('hero');
        play('guard');
        play('heal');
        setState(mid);
        pushNum('hero', `+${heroEvent.heal} HP`, 'heal');
        pushNum('hero', '+1 AP', 'ap', 50, 0.2);
      } else {
        const big = heroEvent.crit || heroEvent.kind === 'special';
        stage?.attack('hero', big ? 46 : 32); // dash across the stage
        await wait(STRIKE_MS);
        const color = FX_COLORS[heroEvent.fx];
        setFx((f) => ({ ...f, foe: { id: nextId(), fx: heroEvent.fx, hits: heroEvent.hits.length, color } }));
        setState(mid);
        for (let i = 0; i < heroEvent.hits.length; i++) {
          if (i > 0) await wait(HIT_MS);
          play(i % 2 ? 'land' : 'slash');
          pushNum('foe', heroEvent.crit ? `${heroEvent.hits[i]}!` : `${heroEvent.hits[i]}`, heroEvent.crit ? 'crit' : 'dmg', jitter());
          stage?.hit('foe', big);
          if (big) pushSpark('foe', color, true);
          flashOn('foe');
          if (big) {
            punch();
            await wait(60); // a beat of hit-stop on the heavy ones
          }
        }
        setCombo((c) => extendCombo(c, heroEvent, null));
        if (heroEvent.kind === 'ally') pushNum('hero', `+${heroEvent.heal} HP`, 'heal', 50, 0.15);
        if (heroEvent.apGain > 0) pushNum('hero', `+${heroEvent.apGain} AP`, 'ap', 50, 0.25);
        if (heroEvent.crit) pushNum('foe', 'CRITICAL', 'text', 50, 0.2);
        if (heroEvent.broke) {
          await wait(260);
          play('break');
          stage?.shake(true);
          punch();
          setCut({ id: nextId(), name: 'BREAK!', sub: 'The villain is stunned', color: '#fbbf24' });
          await wait(760);
          setCut(null);
        }
      }
      await wait(520);

      if (mid.outcome === 'victory') return await knockOut(mid, true);

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
        stage?.attack('foe', heavy ? 46 : 32);
        if (foeEvent.guarded) stage?.guard('hero');
        await wait(STRIKE_MS);
        play(heavy ? 'impact' : 'slash');
        setFx((f) => ({ ...f, hero: { id: nextId(), fx: heavy ? 'cross' : foeEvent.kind === 'flurry' ? 'flurry' : 'slash', hits: foeEvent.hits.length, color: '#fb7185', heavy } }));
        setState(end);
        setCombo(extendCombo(NO_COMBO, null, foeEvent)); // the villain's strike ends your combo
        for (let i = 0; i < foeEvent.hits.length; i++) {
          if (i > 0) await wait(HIT_MS);
          play('land');
          pushNum('hero', `-${foeEvent.hits[i]}`, foeEvent.guarded ? 'block' : 'hurt', jitter());
          if (!foeEvent.guarded) stage?.hit('hero', heavy);
          else stage?.shake(false);
          if (heavy) pushSpark('hero', '#fb7185', true);
          flashOn('hero', '#ef4444');
          if (heavy) punch();
        }
        if (foeEvent.guarded) {
          play('guard');
          pushNum('hero', 'BLOCKED', 'block', 50, 0.15);
        }
        setActing(false);
      }
      await wait(460);

      if (end.outcome === 'defeat') return await knockOut(end, false);
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
  const sideNums = (side) => nums.filter((n) => n.side === side).map((n) => <FloatingNumber key={n.id} text={n.text} kind={n.kind} x={n.x} delay={n.delay} />);
  const sideSparks = (side) => sparks.filter((s) => s.side === side).map((s) => <HitSpark key={s.id} x={s.x} y={s.y} color={s.color} big={s.big} />);
  const locked = busy || Boolean(outcome);
  const plate = 'truncate text-base font-black tracking-wide uppercase italic sm:text-xl';

  return (
    <div className="flex h-full w-full flex-col gap-2 p-2 sm:p-3">
      {/* ---- the stage fills all the space the controls leave ---- */}
      <div ref={box} className="flex min-h-0 flex-1 items-center justify-center">
      <div ref={arena} className="relative shrink-0 overflow-hidden rounded-xl border-2 border-white/40 bg-black shadow-[0_0_40px_rgba(0,0,0,0.6)]" style={{ width: size.w || '100%', height: size.h || '100%' }}>
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ imageRendering: 'pixelated' }} aria-label="The arena: your hero faces the villain" />

        <div className="absolute inset-x-0 top-0 z-20 grid grid-cols-[1fr_auto_1fr] items-start gap-2 bg-gradient-to-b from-black/55 to-transparent px-2 py-2 sm:gap-4 sm:px-16 sm:py-3">
          <div className="flex min-w-0 items-start gap-2">
            <CornerPortrait src={heroImage} side="left" color="#5eead4" fallback="🛡️" />
            <div className="min-w-0 flex-1 pt-1">
              <p className={`${plate} text-white`} style={{ textShadow: '0 2px 0 #000' }}>
                {hero.name}
              </p>
              <FightBar value={hero.hp} max={hero.maxHp} side="left" label={`${hero.name} health`} />
              <p className="mt-0.5 hidden truncate text-[10px] text-white/70 sm:block">
                {look.name} · ⚔ {hero.atk} · crit {Math.round(hero.crit * 100)}%
              </p>
            </div>
          </div>

          <TurnBox turn={state.turn + 1} />

          <div className="flex min-w-0 items-start justify-end gap-2 text-right">
            <div className="min-w-0 flex-1 pt-1">
              <p className={`${plate} text-rose-100`} style={{ textShadow: '0 2px 0 #000' }}>
                {story.foe}
              </p>
              <FightBar value={foe.hp} max={foe.maxHp} side="right" label={`${story.foe} health`} />
              <p className="mt-0.5 hidden truncate text-[10px] text-white/70 sm:block">
                from {origin.title} · ⚔ {foe.atk}
              </p>
            </div>
            <CornerPortrait src={story.villain.image} side="right" color="#fb7185" />
          </div>
        </div>

        {/* effects sit over each fighter */}
        <div className="pointer-events-none absolute top-[30%] left-[12%] z-10 h-[52%] w-[38%]">
          {fx.hero && <SlashFx key={fx.hero.id} fx={fx.hero.fx} hits={fx.hero.hits} color={fx.hero.color} heavy={fx.hero.heavy} />}
          {flash.hero && <motion.div key={flash.hero.id} className="absolute inset-0 rounded-full" style={{ background: flash.hero.color }} initial={{ opacity: 0.35 }} animate={{ opacity: 0 }} transition={{ duration: 0.35 }} />}
          {sideSparks('hero')}
          {sideNums('hero')}
        </div>
        <div className="pointer-events-none absolute top-[30%] right-[12%] z-10 h-[52%] w-[38%]">
          {fx.foe && <SlashFx key={fx.foe.id} fx={fx.foe.fx} hits={fx.foe.hits} color={fx.foe.color} />}
          {flash.foe && <motion.div key={flash.foe.id} className="absolute inset-0 rounded-full" style={{ background: flash.foe.color }} initial={{ opacity: 0.35 }} animate={{ opacity: 0 }} transition={{ duration: 0.3 }} />}
          {sideSparks('foe')}
          {sideNums('foe')}
        </div>

        <div className="absolute inset-x-0 top-[27%] z-10 flex justify-center">{!outcome && !busy && <IntentBadge intent={intent} stunned={stunned} acting={acting} />}</div>
        <ComboCounter combo={combo} />
        <AnimatePresence>{cut && <CutIn key={cut.id} name={cut.name} sub={cut.sub} color={cut.color} />}</AnimatePresence>
        {banner && <SlamBanner key={banner.id} text={banner.text} sub={banner.sub} color={banner.color} size={banner.size} />}
      
        {/* gauges sit on the stage so the whole fight fits the screen */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-3 bg-gradient-to-t from-black/65 to-transparent p-2 sm:p-3">
          <div className="flex items-center gap-3">
            <ApGems ap={hero.ap} max={hero.maxAp} preview={preview} pulse={apPulse} />
            <WinMark lit={wins.hero} side="left" />
          </div>
          <div className="flex items-center justify-end gap-3">
            <WinMark lit={wins.foe} side="right" />
            <div className="w-40 sm:w-72">
              <BreakBar value={foe.brk} max={foe.brkMax} stunned={stunned} />
            </div>
          </div>
        </div>
      </div>
      </div>

      <div className="border-l-4 border-teal-300 bg-black/65 px-3 py-1.5" aria-live="polite">
        <p className="truncate text-sm font-semibold text-white italic sm:text-base">{log || '\u00a0'}</p>
      </div>

      <div className={`grid grid-cols-3 gap-2 ${picks.includes('ally') ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
        <CommandButton keyHint="A" icon="⚔️" label="Attack" note={`${hero.atk}+ dmg · +1 AP`} onClick={() => act('attack')} disabled={locked} />
        <CommandButton keyHint="G" icon="🛡️" label="Guard" note={`block ${Math.round(hero.guardBlock * 100)}% · +1 AP`} onClick={() => act('guard')} disabled={locked} />
        {picks.includes('ally') && (
          <CommandButton keyHint="4" icon="📯" label={hero.allyName ?? 'Ally'} note={hero.allyReady ? 'ally strike · once' : 'used'} onClick={() => act('ally')} disabled={locked || !hero.allyReady} />
        )}
        {hero.specials.map((special, i) => (
          <SpecialCard key={special.id} special={special} keyHint={String(i + 1)} ap={hero.ap} busy={locked} onUse={() => act(special.id)} onPreview={setPreview} />
        ))}
      </div>
    </div>
  );
}
