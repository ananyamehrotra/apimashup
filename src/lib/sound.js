// Sound effects synthesised with the Web Audio API, so there are no audio
// files to license or load. Browsers only allow audio after a user gesture,
// so the context is created on the first play() call (the Spin click).

let ctx;
let muted = false;

export const setMuted = (value) => {
  muted = value;
};

function context() {
  ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(ac, { freq, to, start = 0, duration, type = 'sine', gain = 0.12 }) {
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  const t = ac.currentTime + start;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + duration);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp).connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

const EFFECTS = {
  spin: (ac) => tone(ac, { freq: 90, to: 900, duration: 1.4, type: 'sawtooth', gain: 0.05 }),
  land: (ac) => tone(ac, { freq: 220, to: 55, duration: 0.5, type: 'triangle', gain: 0.25 }),
  horn: (ac) => {
    tone(ac, { freq: 311, duration: 1.1, type: 'sawtooth', gain: 0.09 });
    tone(ac, { freq: 392, duration: 1.1, type: 'sawtooth', gain: 0.09 });
  },
  impact: (ac) => {
    tone(ac, { freq: 140, to: 30, duration: 0.9, type: 'square', gain: 0.22 });
    tone(ac, { freq: 2400, to: 200, duration: 0.25, type: 'sawtooth', gain: 0.08 });
  },
  portal: (ac) => {
    tone(ac, { freq: 110, to: 880, duration: 2.6, type: 'sine', gain: 0.1 });
    tone(ac, { freq: 165, to: 1320, duration: 2.6, type: 'triangle', gain: 0.05 });
  },
  slash: (ac) => {
    tone(ac, { freq: 2400, to: 320, duration: 0.14, type: 'sawtooth', gain: 0.06 });
    tone(ac, { freq: 200, to: 70, duration: 0.18, type: 'triangle', gain: 0.16, start: 0.03 });
  },
  special: (ac) =>
    [392, 523, 698, 932].forEach((freq, i) => tone(ac, { freq, to: freq * 1.6, start: i * 0.06, duration: 0.4, type: 'sawtooth', gain: 0.06 })),
  guard: (ac) => tone(ac, { freq: 340, to: 190, duration: 0.22, type: 'triangle', gain: 0.2 }),
  heal: (ac) => [660, 880, 1175].forEach((freq, i) => tone(ac, { freq, start: i * 0.07, duration: 0.3, type: 'sine', gain: 0.08 })),
  break: (ac) => {
    tone(ac, { freq: 900, to: 50, duration: 0.8, type: 'square', gain: 0.16 });
    tone(ac, { freq: 2000, to: 300, duration: 0.35, type: 'sawtooth', gain: 0.07 });
  },
  blip: (ac) => tone(ac, { freq: 1320, to: 1760, duration: 0.12, type: 'square', gain: 0.04 }),
  reveal: (ac) =>
    [523, 659, 784, 1047].forEach((freq, i) => tone(ac, { freq, start: i * 0.09, duration: 0.5, type: 'triangle' })),
  legendary: (ac) =>
    [523, 659, 784, 1047, 1319, 1568].forEach((freq, i) =>
      tone(ac, { freq, start: i * 0.1, duration: 0.9, type: 'triangle', gain: 0.14 }),
    ),
};

// A raw tone for the pixel hero stage, which brings its own sound design.
export function beep(freq, to, duration, type = 'square', gain = 0.1, start = 0) {
  if (muted) return;
  try {
    tone(context(), { freq, to, duration, type, gain, start });
  } catch {
    // audio is a nice-to-have
  }
}

export function play(name) {
  if (muted) return;
  try {
    EFFECTS[name]?.(context());
  } catch {
    // audio is a nice-to-have; never let it break the app
  }
}
