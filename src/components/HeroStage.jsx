import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { beep } from '../lib/sound.js';
import { createStage, heroLook } from '../lib/spriteForge.js';

const MOVE_KEYS = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
const BUTTON = 'rounded-md bg-black/50 px-3 py-2 text-xs font-semibold tracking-wider text-white uppercase ring-1 ring-white/30 select-none hover:bg-white/20 active:scale-95';

// The reborn hero as a playable pixel sprite: walk, jump, attack, celebrate.
export default function HeroStage({ character, world }) {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const look = useMemo(() => heroLook(character), [character]);

  useEffect(() => {
    const stage = createStage(canvasRef.current, look, beep);
    stageRef.current = stage;

    const onKeyDown = (event) => {
      if (event.target.closest?.('input, select, textarea')) return;
      if (MOVE_KEYS[event.code]) {
        stage.press(MOVE_KEYS[event.code], true);
        event.preventDefault();
      } else if (event.code === 'Space' || event.code === 'KeyW') {
        if (event.target.closest?.('button, a')) return; // Space still activates a focused button
        stage.jump();
        event.preventDefault();
      } else if (event.code === 'KeyZ' || event.code === 'KeyJ') stage.attack();
      else if (event.code === 'KeyV') stage.victory();
    };
    const onKeyUp = (event) => {
      if (MOVE_KEYS[event.code]) stage.press(MOVE_KEYS[event.code], false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      stage.destroy();
    };
  }, [look]);

  const hold = (key) => ({
    onPointerDown: (event) => {
      event.preventDefault();
      stageRef.current?.press(key, true);
    },
    onPointerUp: () => stageRef.current?.press(key, false),
    onPointerLeave: () => stageRef.current?.press(key, false),
    onPointerCancel: () => stageRef.current?.press(key, false),
  });

  return (
    <motion.section
      className="panel relative rounded-2xl border border-white/15 p-5"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
    >
      <p className="mb-3 font-mono text-[11px] tracking-[0.35em] uppercase" style={{ color: world.accent }}>
        【 Your New Form 】
      </p>
      <canvas
        ref={canvasRef}
        className="block aspect-[3/2] w-full rounded-lg bg-black ring-1 ring-white/20"
        style={{ imageRendering: 'pixelated' }}
        aria-label={`Pixel art of ${look.name}, your hero in ${character.country.name}`}
      />
      <p className="mt-3 font-display text-lg font-bold text-white">
        {look.name} <span className="text-sm font-normal text-indigo-100/75">of {character.country.name}</span>
      </p>
      <p className="text-xs text-indigo-100/75">{look.tag} Coloured from the flag.</p>

      <div data-no-capture="true" className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={BUTTON} aria-label="Walk left" {...hold('left')}>
          ◀
        </button>
        <button type="button" className={BUTTON} aria-label="Walk right" {...hold('right')}>
          ▶
        </button>
        <button type="button" className={BUTTON} onClick={() => stageRef.current?.jump()}>
          Jump
        </button>
        <button type="button" className={BUTTON} onClick={() => stageRef.current?.attack()}>
          Attack
        </button>
        <button type="button" className={BUTTON} onClick={() => stageRef.current?.victory()}>
          Victory
        </button>
        <span className="hidden text-[11px] text-indigo-100/60 sm:inline">← → move · Space jump · Z attack · V victory</span>
      </div>
    </motion.section>
  );
}
