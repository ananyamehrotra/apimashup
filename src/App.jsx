import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { toPng } from 'html-to-image';
import CharacterSheet from './components/CharacterSheet.jsx';
import HeroBanner from './components/HeroBanner.jsx';
import HeroStage from './components/HeroStage.jsx';
import IntroSequence from './components/IntroSequence.jsx';
import OriginStory from './components/OriginStory.jsx';
import StoryMode from './components/StoryMode.jsx';
import SystemLog from './components/SystemLog.jsx';
import { MagicCircle, Particles, SpeedLines } from './components/Effects.jsx';
import { loadCountries, pickRandom } from './lib/countries.js';
import { summonOrigin } from './lib/jikan.js';
import { nextTrack, setMusicMuted, startMusic, useNowPlaying } from './lib/music.js';
import { setNarrationMuted } from './lib/narrator.js';
import { play, setMuted } from './lib/sound.js';
import { generateCharacter, getRanges, worldKeyFor } from './lib/statGenerator.js';
import { WORLDS } from './lib/worlds.js';

// three.js is heavy, so the globe loads separately from the rest of the UI.
const GlobeView = lazy(() => import('./components/GlobeView.jsx'));

const HISTORY_KEY = 'isekai.history.v2';
const HISTORY_LIMIT = 8;
const LANDED_PAUSE_MS = 900;

const readHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) ?? [];
  } catch {
    return [];
  }
};

// Shared links look like ?c=JPN&a=1535&f=71 (country, anime, past-life character).
const shareQuery = (code, anime) =>
  `?c=${code}${anime ? `&a=${anime.id}` : ''}${anime?.form ? `&f=${anime.form.id}` : ''}`;

const numericParam = (params, name) => (/^\d+$/.test(params.get(name) ?? '') ? params.get(name) : null);

export default function App() {
  const [countries, setCountries] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [phase, setPhase] = useState('landing'); // landing | spinning | intro | story | sheet
  const [target, setTarget] = useState(null);
  const [spinId, setSpinId] = useState(0);
  const [landed, setLanded] = useState(false);
  const [origin, setOrigin] = useState({ status: 'loading' });
  const [muted, setMutedState] = useState(false);
  const [history, setHistory] = useState(readHistory);
  const [toast, setToast] = useState(null);
  const [saga, setSaga] = useState(null); // how the story ended: { outcome, foe }
  const nowPlaying = useNowPlaying();
  const cardRef = useRef(null);
  const originRequest = useRef(0);

  // The origin anime is chosen to suit the world the country belongs to.
  const loadOrigin = useCallback(async (country, options = {}) => {
    const request = ++originRequest.current;
    setOrigin({ status: 'loading' });
    const data = await summonOrigin({ genres: WORLDS[worldKeyFor(country)].genres, ...options });
    if (request === originRequest.current) setOrigin({ status: 'ready', data });
  }, []);

  const loadWorld = useCallback(async () => {
    setLoadError(null);
    try {
      const list = await loadCountries();
      setCountries(list);
      const params = new URLSearchParams(window.location.search);
      const shared = list.find((c) => c.code === params.get('c')?.toUpperCase());
      if (shared) {
        setTarget(shared);
        setPhase('sheet');
        loadOrigin(shared, { animeId: numericParam(params, 'a'), formId: numericParam(params, 'f') });
      }
    } catch (err) {
      setLoadError(err.message);
    }
  }, [loadOrigin]);

  useEffect(() => {
    loadWorld();
  }, [loadWorld]);

  const ranges = useMemo(() => (countries ? getRanges(countries) : null), [countries]);
  const character = useMemo(
    () => (target && countries ? generateCharacter(target, countries, ranges) : null),
    [target, countries, ranges],
  );
  const world = character ? WORLDS[character.worldKey] : null;

  // Rerolling is blocked while a Jikan request is in flight (rate limit: ~3/s).
  const busy = phase === 'spinning' || phase === 'intro' || phase === 'story' || (phase === 'sheet' && origin.status === 'loading');

  const spin = () => {
    if (!countries || busy) return;
    const next = pickRandom(countries, target?.code);
    window.history.replaceState(null, '', window.location.pathname);
    new Image().src = WORLDS[worldKeyFor(next)].image; // warm the backdrop before the reveal
    setTarget(next);
    setSpinId((n) => n + 1);
    setLanded(false);
    setSaga(null);
    setPhase('spinning');
    startMusic();
    play('spin');
    loadOrigin(next);
  };

  const handleLanded = useCallback(() => {
    setLanded(true);
    play('land');
    setTimeout(() => setPhase('intro'), LANDED_PAUSE_MS);
  }, []);

  const handleIntroDone = useCallback(() => {
    setPhase((current) => (current === 'intro' ? 'sheet' : current));
  }, []);

  // Starting the story is a click, so it can also start the music on shared links.
  const beginStory = () => {
    startMusic();
    setPhase('story');
  };

  const handleStoryDone = useCallback((result) => {
    setSaga(result.outcome === 'skipped' ? null : result);
    setPhase('sheet');
  }, []);

  useEffect(() => {
    if (phase === 'sheet' && spinId > 0 && character) {
      play(character.rarity.name === 'Legendary' ? 'legendary' : 'reveal');
    }
    // only when the sheet opens, not when the character object changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Once the roll is complete, put it in the URL and in the history panel.
  useEffect(() => {
    if (phase !== 'sheet' || !character || origin.status !== 'ready') return;
    const query = shareQuery(character.country.code, origin.data);
    window.history.replaceState(null, '', query);
    setHistory((previous) => {
      const entry = {
        query,
        name: character.country.name,
        hero: origin.data.form?.name ?? character.title,
        color: character.rarity.color,
        anime: origin.data.title,
      };
      const next = [entry, ...previous.filter((h) => h.query !== query)].slice(0, HISTORY_LIMIT);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        // history is optional
      }
      return next;
    });
  }, [phase, character, origin]);

  const flash = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const download = async () => {
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: '#07061a',
        filter: (node) => node.dataset?.noCapture !== 'true',
      });
      const link = document.createElement('a');
      link.download = `isekai-${character.country.code.toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      flash('Could not create the image. Try again.');
    }
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      flash('Link copied to clipboard');
    } catch {
      flash('Copy the link from your address bar');
    }
  };

  const toggleMute = () => {
    setMuted(!muted);
    setMusicMuted(!muted);
    setNarrationMuted(!muted);
    setMutedState(!muted);
  };

  const spinLabel = loadError ? 'World unavailable' : !countries ? 'Loading the world…' : 'Spin the Globe';

  return (
    <div className="relative h-full">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden text-indigo-400/25">
        <MagicCircle className="h-[125vmin] w-[125vmin] shrink-0" />
      </div>
      <Particles />
      <div className="absolute inset-0">
        <Suspense fallback={null}>
          <GlobeView target={target} spinId={spinId} onLanded={handleLanded} paused={phase === 'sheet' || phase === 'story'} />
        </Suspense>
      </div>
      {phase === 'spinning' && !landed && <SpeedLines color="rgba(196,181,253,0.25)" />}

      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? 'Unmute sound' : 'Mute sound'}
        className="fixed top-3 right-3 z-40 rounded-full bg-black/50 px-3 py-1.5 text-lg ring-1 ring-white/20 hover:bg-black/70"
      >
        {muted ? '🔇' : '🔊'}
      </button>

      {nowPlaying && (
        <div className="fixed top-3 right-16 z-40 flex max-w-[55vw] items-center gap-2 rounded-full bg-black/50 py-1.5 pr-2 pl-3 text-xs text-white ring-1 ring-white/20">
          <span className="truncate">♪ {nowPlaying}</span>
          <button type="button" onClick={nextTrack} aria-label="Next song" className="rounded-full px-1.5 hover:bg-white/15">
            ⏭
          </button>
        </div>
      )}

      {(phase === 'landing' || phase === 'spinning') && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-between px-4 py-8 text-center sm:py-12">
          <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <p className="text-xs tracking-[0.4em] text-indigo-300 uppercase">Isekai</p>
            <h1 className="font-display text-3xl font-black text-white drop-shadow-[0_0_24px_rgba(139,123,255,0.8)] sm:text-6xl">
              Reincarnation Generator
            </h1>
            <p className="text-shadow mx-auto mt-2 max-w-lg text-sm text-white">
              Spin the globe. Wherever it lands, you are reborn there: a real country decides your stats and your world, and an
              anime becomes your past life.
            </p>
          </motion.header>

          <div className="pointer-events-auto flex flex-col items-center gap-3">
            {phase === 'landing' ? (
              <>
                <button
                  type="button"
                  onClick={spin}
                  disabled={!countries}
                  className="relative rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-10 py-4 font-display text-lg font-bold text-white shadow-[0_0_32px_rgba(139,123,255,0.7)] transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {countries && <span className="pulse-ring absolute inset-0 rounded-full ring-2 ring-fuchsia-300" aria-hidden />}
                  {spinLabel}
                </button>
                {loadError && (
                  <p role="alert" className="max-w-sm rounded-lg bg-black/60 px-3 py-2 text-sm text-rose-200">
                    {loadError}{' '}
                    <button type="button" onClick={loadWorld} className="underline">
                      Retry
                    </button>
                  </p>
                )}
              </>
            ) : (
              <p className="font-display text-xl text-indigo-100 sm:text-2xl" aria-live="polite">
                {landed ? `Fate has chosen ${target.name}` : 'Fate spins the world…'}
              </p>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {phase === 'story' && character && origin.status === 'ready' && (
          <StoryMode key={`story-${character.country.code}`} character={character} world={world} origin={origin.data} onFinish={handleStoryDone} />
        )}
        {phase === 'story' && origin.status !== 'ready' && (
          <motion.div key="story-wait" className="fixed inset-0 z-30 flex items-center justify-center bg-white" exit={{ opacity: 0 }}>
            <p className="font-display text-xl text-indigo-900">The mists of your past life are clearing…</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'intro' && target && (
          <IntroSequence
            key="intro"
            country={target}
            world={WORLDS[worldKeyFor(target)]}
            short={spinId > 1}
            onDone={handleIntroDone}
          />
        )}
      </AnimatePresence>

      {phase === 'sheet' && character && (
        <main className="fixed inset-0 z-20 overflow-x-hidden overflow-y-auto bg-void">
          {/* the world, soft and dark, filling the whole screen */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
            <img key={world.image} src={world.image} alt="" className="kenburns h-full w-full scale-110 object-cover blur-md" />
            <div className="absolute inset-0 bg-[#07061a]/55" />
          </div>
          <Particles count={22} color={world.accent} />
          {/* arriving out of the white-out that ends the intro */}
          {spinId > 0 && (
            <motion.div
              key={spinId}
              className="pointer-events-none fixed inset-0 z-10 bg-white"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1.1 }}
            />
          )}
          <SystemLog key={character.country.code} character={character} world={world} />

          <div className="relative mx-auto max-w-5xl px-3 py-16 sm:px-5">
            {origin.status === 'ready' && !saga && (
              <motion.button
                type="button"
                onClick={beginStory}
                className="panel mb-4 flex w-full items-center justify-between gap-4 rounded-2xl border border-rose-400/60 px-5 py-4 text-left shadow-[0_0_30px_-6px_rgba(244,63,94,0.7)] transition hover:bg-rose-500/15"
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
              >
                <span>
                  <span className="block font-mono text-[11px] tracking-[0.3em] text-rose-300 uppercase">【 Quest available 】</span>
                  <span className="block text-sm text-white sm:text-base">
                    {origin.data.villain
                      ? `Something from ${origin.data.title} has followed you into ${character.country.name}.`
                      : `A shadow has followed you into ${character.country.name}.`}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 px-5 py-2.5 font-display font-bold whitespace-nowrap text-white">
                  ⚔ Begin your story
                </span>
              </motion.button>
            )}
            {/* everything inside cardRef is what Download PNG captures */}
            <motion.div
              ref={cardRef}
              key={character.country.code}
              className="relative overflow-hidden rounded-3xl ring-1"
              style={{ '--tw-ring-color': `${character.rarity.color}aa`, boxShadow: `0 0 70px -12px ${character.rarity.color}` }}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <img src={world.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-[#0a0820]/60 to-[#0a0820]/90" />
              <div className="pointer-events-none absolute -top-40 -right-40 opacity-25" style={{ color: world.accent }}>
                <MagicCircle className="h-[30rem] w-[30rem]" />
              </div>

              <div className="relative p-4 sm:p-8">
                <HeroBanner character={character} world={world} origin={origin} saga={saga} />
                <div className="grid items-start gap-4 lg:grid-cols-2">
                  <HeroStage character={character} world={world} />
                  <CharacterSheet character={character} />
                  <div className="lg:col-span-2">
                    <OriginStory origin={origin} character={character} world={world} />
                  </div>
                </div>
                <p className="mt-5 text-center text-[11px] tracking-[0.3em] text-white/50 uppercase">
                  Isekai Reincarnation Generator
                </p>
              </div>
            </motion.div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={spin}
                disabled={busy}
                className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-7 py-3 font-display font-bold text-white shadow-[0_0_28px_rgba(139,123,255,0.6)] transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                {busy ? 'Summoning…' : 'Reroll Destiny'}
              </button>
              <button
                type="button"
                onClick={beginStory}
                disabled={origin.status === 'loading'}
                className="rounded-full bg-gradient-to-r from-rose-500 to-amber-500 px-6 py-3 font-display font-bold text-white shadow-[0_0_24px_rgba(244,63,94,0.5)] transition hover:scale-105 disabled:opacity-50"
              >
                {saga ? '⚔ Replay story' : '⚔ Play your story'}
              </button>
              <button
                type="button"
                onClick={download}
                disabled={origin.status === 'loading'}
                className="rounded-full bg-black/50 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-black/70 disabled:opacity-50"
              >
                Download PNG
              </button>
              <button
                type="button"
                onClick={share}
                className="rounded-full bg-black/50 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-black/70"
              >
                Copy share link
              </button>
            </div>

            {history.length > 1 && (
              <section className="mt-8">
                <h3 className="mb-2 text-center text-xs font-semibold tracking-[0.25em] text-white/70 uppercase">Past lives</h3>
                <ul className="flex flex-wrap justify-center gap-2">
                  {history.slice(1).map((life) => (
                    <li key={life.query}>
                      <a
                        href={life.query}
                        title={`Origin: ${life.anime}`}
                        className="block rounded-lg bg-black/55 px-3 py-1.5 text-xs text-white ring-1 hover:bg-black/75"
                        style={{ '--tw-ring-color': life.color }}
                      >
                        {life.hero} · {life.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </main>
      )}

      {toast && (
        <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-sm text-white ring-1 ring-white/20">
          {toast}
        </div>
      )}
    </div>
  );
}
