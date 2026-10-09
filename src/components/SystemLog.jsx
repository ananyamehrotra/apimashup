import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { play } from '../lib/sound.js';

const STEP_MS = 650;
const LINGER_MS = 3500;
const MAX_SKILLS = 3;

function messagesFor(character, world) {
  const { skills, allies } = character;
  return [
    'Reincarnation complete.',
    `World entered: ${world.name}`,
    `Class obtained: ${character.class.name}`,
    `Soul rarity: ${character.rarity.name}`,
    ...skills.slice(0, MAX_SKILLS).map((skill) => `Skill acquired: ${skill}`),
    skills.length > MAX_SKILLS ? `…and ${skills.length - MAX_SKILLS} more skills` : null,
    allies.length ? `${allies.length} ${allies.length === 1 ? 'ally' : 'allies'} joined your party` : 'Title obtained: Lone Wanderer',
  ].filter(Boolean);
}

// The "system voice" of isekai stories: status messages that pop up one by one.
export default function SystemLog({ character, world }) {
  const [messages] = useState(() => messagesFor(character, world));
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown > messages.length) return;
    const done = shown === messages.length;
    const timer = setTimeout(() => setShown(shown + 1), done ? LINGER_MS : STEP_MS);
    if (!done) play('blip');
    return () => clearTimeout(timer);
  }, [shown, messages.length]);

  const visible = shown > messages.length ? [] : messages.slice(0, shown + 1);

  return (
    <ul className="pointer-events-none fixed right-3 bottom-4 z-40 w-64 space-y-1.5" aria-live="polite">
      <AnimatePresence>
        {visible.map((message) => (
          <motion.li
            key={message}
            className="rounded-sm border border-sky-300/60 bg-sky-950/90 px-3 py-1.5 font-mono text-xs text-sky-100 shadow-[0_0_14px_rgba(56,189,248,0.45)]"
            initial={{ opacity: 0, x: 30, scaleY: 0.2 }}
            animate={{ opacity: 1, x: 0, scaleY: 1 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.25 }}
          >
            <span className="text-sky-300">【System】</span> {message}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
