// Background music: shuffles every .mp3 dropped into the /songs folder.
// Playback starts on the first Spin click, because browsers block audio
// until the user interacts with the page.

import { useSyncExternalStore } from 'react';

const VOLUME = 0.3;
const DUCKED_VOLUME = 0.08; // while the narrator is speaking

const files = import.meta.glob('/songs/*.mp3', { eager: true, query: '?url', import: 'default' });

const titleFrom = (path) =>
  path
    .split('/')
    .pop()
    .replace(/\.mp3$/i, '')
    .replace(/^\d+\s*[.-]\s*/, '');

const tracks = Object.entries(files)
  .filter(([path]) => !/\(\d+\)\.mp3$/i.test(path)) // skip "Name (1).mp3" duplicate downloads
  .map(([path, url]) => ({ url, title: titleFrom(path) }))
  .sort(() => Math.random() - 0.5);

let audio = null;
let index = -1;
let failures = 0;
let muted = false;
let ducked = false;
let nowPlaying = null;
const listeners = new Set();

function setNowPlaying(title) {
  nowPlaying = title;
  listeners.forEach((notify) => notify());
}

export function nextTrack() {
  if (!audio || !tracks.length) return;
  index = (index + 1) % tracks.length;
  audio.src = tracks[index].url;
  audio.play().catch(() => {});
  setNowPlaying(tracks[index].title);
}

export function startMusic() {
  if (audio || !tracks.length) return;
  audio = new Audio();
  audio.volume = ducked ? DUCKED_VOLUME : VOLUME;
  audio.muted = muted;
  audio.addEventListener('playing', () => {
    failures = 0;
  });
  audio.addEventListener('ended', nextTrack);
  // A file that won't decode is skipped, unless every file is failing.
  audio.addEventListener('error', () => {
    if (++failures < tracks.length) nextTrack();
    else setNowPlaying(null);
  });
  nextTrack();
}

export function setMusicDucked(value) {
  ducked = value;
  if (audio) audio.volume = value ? DUCKED_VOLUME : VOLUME;
}

export function setMusicMuted(value) {
  muted = value;
  if (audio) audio.muted = value;
}

const subscribe = (notify) => {
  listeners.add(notify);
  return () => listeners.delete(notify);
};

export const useNowPlaying = () => useSyncExternalStore(subscribe, () => nowPlaying);
