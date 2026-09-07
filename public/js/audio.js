// Leonardo – lyd-/interaksjonsmodul (WebAudio, ingen filer)
//
// Genererer korte, myke toner direkte i nettleseren – ingen lydfiler laster
// ned, ingen autoplay. Lyd brukes kun som bekreftelse på interaksjoner
// (riktig/galt svar, vunnen quiz) og er alltid koblet av når:
//   – brukeren har skrudd den av (bryter i footeren, lagres i localStorage),
//   – prefers-reduced-motion er aktiv, eller
//   – nettleseren ikke støtter WebAudio.
// Siden fungerer 100 % uten lyd.

const STORE_KEY = 'leonardo:sound';

let ctx = null;
let cached = null;

function prefersReduced() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function stored() {
  try {
    return localStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
}

// Standard: på. Kobles automatisk av ved prefers-reduced-motion.
export function soundsEnabled() {
  if (cached !== null) return cached;
  if (prefersReduced()) { cached = false; return false; }
  cached = stored() !== '0';
  return cached;
}

export function setSoundEnabled(on) {
  cached = !!on;
  try { localStorage.setItem(STORE_KEY, on ? '1' : '0'); } catch { /* privat modus */ }
  return cached;
}

// Etter at brukeren endrer preferansen i en annen fane, respekterer vi den igjen.
export function refreshSoundPref() {
  cached = null;
  return soundsEnabled();
}

function ensureCtx() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, { t = 0, dur = 0.12, type = 'sine', gain = 0.05 } = {}) {
  if (!ctx) return;
  try {
    const now = ctx.currentTime + t;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.001), now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.03);
  } catch { /* ignorer – lyd er aldri kritisk */ }
}

// Lave, korte toner: bekreftelse uten støy.
export function play(name) {
  if (!soundsEnabled()) return;
  if (!ensureCtx()) return;
  if (name === 'correct') {
    tone(660, { dur: 0.09 });
    tone(880, { t: 0.08, dur: 0.16 });
  } else if (name === 'wrong') {
    tone(233, { type: 'triangle', dur: 0.17, gain: 0.045 });
  } else if (name === 'win') {
    tone(523, { dur: 0.11 });
    tone(659, { t: 0.1, dur: 0.1 });
    tone(784, { t: 0.2, dur: 0.2 });
  } else if (name === 'done') {
    tone(587, { dur: 0.14, gain: 0.04 });
  } else if (name === 'click') {
    tone(560, { type: 'triangle', dur: 0.05, gain: 0.03 });
  }
}

// Kobler av alle lyder og lukker audiokonteksten (respekt for batteri/ro).
export function silenceAll() {
  if (ctx) {
    try { ctx.close(); } catch { /* ignorer */ }
    ctx = null;
  }
}

export function isSettable() {
  return typeof window !== 'undefined' && !!((window.AudioContext) || (window.webkitAudioContext));
}