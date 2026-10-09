import { motion } from 'motion/react';
import { heroLook } from '../lib/spriteForge.js';

const SYNOPSIS_LIMIT = 300;

function shorten(text) {
  const clean = text.replace(/\[Written by MAL Rewrite\]/gi, '').replace(/\s+/g, ' ').trim();
  if (clean.length <= SYNOPSIS_LIMIT) return clean;
  return `${clean.slice(0, clean.lastIndexOf(' ', SYNOPSIS_LIMIT))}…`;
}

const article = (word) => (/^[aeiou]/i.test(word) ? 'an' : 'a');

// The line that ties the anime to the country.
function Tale({ anime, character, world }) {
  const genre = anime.theme ?? anime.genres[0];
  const kind = genre ? `${article(genre)} ${genre.toLowerCase()} tale` : 'a tale';
  const { country } = character;
  return (
    <p className="rounded-lg border-l-2 bg-black/35 py-2.5 pr-3 pl-3 text-sm leading-relaxed text-white" style={{ borderColor: world.accent }}>
      In your past life you were{' '}
      {anime.form ? <strong style={{ color: world.accent }}>{anime.form.name}</strong> : 'a nameless side character'} in{' '}
      <em>{anime.title}</em>, {kind}. Then came the truck. You awoke in {world.name}, reborn in{' '}
      <strong>{country.name}</strong> as {heroLook(character).name}, the {character.title}.
    </p>
  );
}

// `origin` is { status: 'loading' | 'ready', data? }. Jikan failures fall back
// to the built-in archive, so there is no error state to draw.
export default function OriginStory({ origin, character, world }) {
  const anime = origin.data;

  return (
    <motion.section
      className="panel relative rounded-2xl border border-white/15 p-5"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.5 }}
    >
      <p className="mb-4 font-mono text-[11px] tracking-[0.35em] uppercase" style={{ color: world.accent }}>
        【 Origin Story 】
      </p>

      {origin.status === 'loading' && (
        <div className="space-y-3" aria-busy="true" aria-label="Recalling your past life">
          <div className="flex gap-4">
            <div className="shimmer h-44 w-32 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2.5 py-1">
              <div className="shimmer h-6 w-3/4 rounded" />
              <div className="shimmer h-3 w-1/2 rounded" />
              <div className="shimmer h-5 w-2/3 rounded-full" />
            </div>
          </div>
          <div className="shimmer h-16 rounded-lg" />
          <div className="shimmer h-12 rounded" />
        </div>
      )}

      {origin.status === 'ready' && (
        <div className="space-y-4">
          <div className="flex gap-4">
            {anime.poster && (
              <img
                src={anime.poster}
                alt={`Poster for ${anime.title}`}
                crossOrigin="anonymous"
                className="h-44 w-32 shrink-0 rounded-lg object-cover shadow-xl ring-1 ring-white/25"
              />
            )}
            <div className="min-w-0 flex-1">
              <a
                href={anime.url}
                target="_blank"
                rel="noreferrer"
                className="font-display text-xl leading-snug font-bold text-white hover:underline"
              >
                {anime.title}
              </a>
              <p className="mt-1 text-xs text-indigo-100/80">
                {[
                  anime.score ? `★ ${anime.score}` : 'Unrated',
                  anime.type,
                  anime.episodes ? `${anime.episodes} ep` : null,
                  anime.year,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {anime.genres.length > 0 && (
                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                  {anime.genres.slice(0, 5).map((genre) => (
                    <li
                      key={genre}
                      className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white ring-1 ring-white/25"
                      style={genre === anime.theme ? { background: `${world.accent}33`, '--tw-ring-color': world.accent } : undefined}
                    >
                      {genre}
                    </li>
                  ))}
                </ul>
              )}
              {anime.theme && (
                <p className="mt-2.5 text-xs text-indigo-100/75">
                  Chosen because {world.name} calls for {article(anime.theme)} {anime.theme.toLowerCase()} story.
                </p>
              )}
            </div>
          </div>

          <Tale anime={anime} character={character} world={world} />

          <p className="text-sm leading-relaxed text-indigo-50/90">
            {anime.synopsis ? shorten(anime.synopsis) : 'No one remembers how this tale began.'}
          </p>
        </div>
      )}
    </motion.section>
  );
}
