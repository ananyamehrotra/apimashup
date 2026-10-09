// Voice narration using the browser's built-in speech synthesis: no audio
// files and no API. The music is turned down while a line is being read.

import { setMusicDucked } from './music.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
const TONES = {
  narrator: { rate: 0.98, pitch: 1 },
  villain: { rate: 0.9, pitch: 0.5 },
  system: { rate: 1.08, pitch: 1.35 },
};

let voice = null;
let muted = false;
let current = null;

// Prefer the more natural-sounding English voices when the browser has them.
function chooseVoice() {
  const english = synth.getVoices().filter((v) => /^en/i.test(v.lang));
  voice =
    english.find((v) => /natural/i.test(v.name)) ??
    english.find((v) => /google uk english male|google us english/i.test(v.name)) ??
    english.find((v) => /google|online/i.test(v.name)) ??
    english[0] ??
    null;
}
if (synth) {
  chooseVoice();
  synth.addEventListener?.('voiceschanged', chooseVoice);
}

const speakable = (text) => text.replace(/[“”"【】]/g, '').replace(/…/g, '...');

// Reads `text` aloud. Returns false if nothing will be spoken (muted or
// unsupported). `onEnd` runs only when the line finishes on its own.
export function narrate(text, { tone = 'narrator', onEnd } = {}) {
  if (!synth || muted) return false;
  current = null;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(speakable(text));
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? 'en-US';
  utterance.rate = TONES[tone].rate;
  utterance.pitch = TONES[tone].pitch;
  const finish = (completed) => {
    if (current !== utterance) return; // superseded or stopped
    current = null;
    setMusicDucked(false);
    if (completed) onEnd?.();
  };
  utterance.onend = () => finish(true);
  utterance.onerror = () => finish(false);
  current = utterance;
  setMusicDucked(true);
  synth.speak(utterance);
  return true;
}

export function hush() {
  current = null;
  synth?.cancel();
  setMusicDucked(false);
}

export function setNarrationMuted(value) {
  muted = value;
  if (value) hush();
}
