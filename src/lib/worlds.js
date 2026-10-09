// The isekai worlds a hero can be reborn into. Each one has a backdrop from the
// /worlds folder and the anime genres (Jikan genre ids) that suit it, so the
// origin-story anime matches the world the country landed in.

const files = import.meta.glob('/worlds/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' });

const image = (prefix) => Object.entries(files).find(([path]) => path.includes(prefix))?.[1] ?? null;

export const WORLDS = {
  shrine: {
    name: 'The Starlit Shrine',
    tagline: 'Spirits walk the mountain paths beneath a burning sky.',
    image: image('b6d2b051'),
    accent: '#f472b6',
    genres: [{ id: 21, name: 'Samurai' }, { id: 13, name: 'Historical' }, { id: 37, name: 'Supernatural' }],
  },
  blossom: {
    name: 'The Blossom Court',
    tagline: 'Petals fall on quiet courtyards where old vows are kept.',
    image: image('dda4c938'),
    accent: '#fb7185',
    genres: [{ id: 22, name: 'Romance' }, { id: 17, name: 'Martial Arts' }, { id: 8, name: 'Drama' }],
  },
  walled: {
    name: 'The Walled Kingdom',
    tagline: 'No sea guards this land. Only stone, and those who stand on it.',
    image: image('9d28f13f'),
    accent: '#fb923c',
    genres: [{ id: 38, name: 'Military' }, { id: 76, name: 'Survival' }, { id: 41, name: 'Suspense' }],
  },
  sky: {
    name: 'The Sky Archipelago',
    tagline: 'Islands adrift on a sea of cloud, each one a world of its own.',
    image: image('1a6e8da1'),
    accent: '#f9a8d4',
    genres: [{ id: 2, name: 'Adventure' }, { id: 10, name: 'Fantasy' }],
  },
  azure: {
    name: 'The Azure Realm',
    tagline: 'Castle towns and green valleys under an endless blue.',
    image: image('cfa842aa'),
    accent: '#38bdf8',
    genres: [{ id: 10, name: 'Fantasy' }, { id: 62, name: 'Isekai' }],
  },
  frontier: {
    name: 'The Golden Frontier',
    tagline: 'Riders chase the horizon across plains of fire and gold.',
    image: image('3ae0e545'),
    accent: '#fbbf24',
    genres: [{ id: 1, name: 'Action' }, { id: 2, name: 'Adventure' }, { id: 6, name: 'Mythology' }],
  },
  meadow: {
    name: 'The Wild Meadow',
    tagline: 'Strange and gentle creatures gather by the lake at dusk.',
    image: image('51198bb7'),
    accent: '#a3e635',
    genres: [{ id: 4, name: 'Comedy' }, { id: 31, name: 'Super Power' }, { id: 15, name: 'Kids' }],
  },
  starfall: {
    name: 'The Starfall Fields',
    tagline: 'Comets cross a cold sky above fields that glow at night.',
    image: image('9ad45dac'),
    accent: '#a78bfa',
    genres: [{ id: 24, name: 'Sci-Fi' }, { id: 29, name: 'Space' }, { id: 7, name: 'Mystery' }],
  },
};
