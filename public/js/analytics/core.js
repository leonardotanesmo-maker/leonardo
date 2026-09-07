// Leonardo – kjernen i analyse/logg-modulen
//
// – Sporer hendelser (trackEvent) og sender dem i batcher til backend
//   (same-opphav /api/* eller konfigurert backendUrl).
// – Hvis ingen backend er tilgjengelig: LOKAL-modus. Hendelsene lagres da
//   KUN på den enheten (localStorage) og er tydelig merket som lokale i
//   dashbordet – de blandes aldri med globale tall.
// – Hendelser som IKKE er levert, beholdes i minnet/queue og sendes ved
//   neste anledning (f.eks. når siden navigerer videre).

import { getConfig } from './config.js';
import { getContext } from './context.js';

const EVENT_NAMES = {
  PAGE_VIEW: 'PAGE_VIEW',
  APP_LOADED: 'APP_LOADED',
  SUBJECT_OPENED: 'SUBJECT_OPENED',
  QUIZ_STARTED: 'QUIZ_STARTED',
  QUIZ_QUESTION_ANSWERED: 'QUIZ_QUESTION_ANSWERED',
  QUIZ_COMPLETED: 'QUIZ_COMPLETED',
  MATH_STARTED: 'MATH_STARTED',
  MATH_QUESTION_ANSWERED: 'MATH_QUESTION_ANSWERED',
  MATH_COMPLETED: 'MATH_COMPLETED',
  BUTTON_CLICKED: 'BUTTON_CLICKED',
  ERROR: 'ERROR',
};

const TEST_NAMES = {
  TEST_EVENT: 'TEST_EVENT',
  TEST_PAGE_VIEW: 'TEST_PAGE_VIEW',
  TEST_QUIZ_STARTED: 'TEST_QUIZ_STARTED',
  TEST_QUIZ_QUESTION_ANSWERED: 'TEST_QUIZ_QUESTION_ANSWERED',
  TEST_QUIZ_COMPLETED: 'TEST_QUIZ_COMPLETED',
  TEST_MATH_STARTED: 'TEST_MATH_STARTED',
  TEST_MATH_QUESTION_ANSWERED: 'TEST_MATH_QUESTION_ANSWERED',
  TEST_MATH_COMPLETED: 'TEST_MATH_COMPLETED',
  TEST_ERROR: 'TEST_ERROR',
};

let sessionId = null;
let context = null;
let backend = null; // null = LOKAL-modus; ellers { base, mode:'server' }
let backendResolved = false;
let queue = [];
let flushTimer = null;
let flushing = false;
let lastSeq = 0; // siste server-sekvens vi har sett (for live-oppdatering)
let localSeq = 0; // lokal sekvens i LOKAL-modus

function uuid() {
  try {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* ignorer */ }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export function getSessionId() {
  if (sessionId) return sessionId;
  const cfg = getConfig();
  try {
    const existing = localStorage.getItem(cfg.sessionKey);
    if (existing) {
      sessionId = existing;
      return sessionId;
    }
    sessionId = uuid();
    localStorage.setItem(cfg.sessionKey, sessionId);
  } catch {
    sessionId = uuid(); // privat modus: kun i minnet for denne økten
  }
  return sessionId;
}

function localEventsRead() {
  try {
    const raw = localStorage.getItem(getConfig().localEventsKey);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function localEventsWrite(arr) {
  try {
    localStorage.setItem(getConfig().localEventsKey, JSON.stringify(arr));
  } catch { /* privat modus: event lagres ikke i LOKAL-modus */ }
}

export function backendInfo() {
  return backend
    ? { mode: 'server', base: backend.base, adminKeyRequired: backend.adminKeyRequired }
    : { mode: 'local' };
}

export function mode() {
  return backend ? 'server' : 'local';
}

// Er dette en automatisert økt (bot)? Da merkes hendelsene som «bot» og
// teller ikke som ekte besøkende. Aktiveres via:
//   – window.__LEONARDO_BOT__ = true (innsprøytet av automasjon)
//   – ?bot=1 i URL-en, eller
//   – localStorage 'leonardo:analytics:bot' = '1'
function isBotEnv() {
  try {
    if (typeof window !== 'undefined' && window.__LEONARDO_BOT__) return true;
    if (typeof window !== 'undefined' && /[?&]bot=1/.test(window.location.search || '')) return true;
    if (localStorage.getItem('leonardo:analytics:bot') === '1') return true;
  } catch { /* ignorér */ }
  return false;
}

export function botActive() {
  return isBotEnv();
}

export function lastServerSeq() {
  return lastSeq;
}

// Finn og bekreft backend-en. Kalles én gang ved oppstart, men kan kalles
// på nytt for å «re-prøve» å finne backend.
export async function resolveBackend() {
  if (backendResolved) return backend;
  backendResolved = true;
  const cfg = getConfig();
  if (!cfg.enabled) { backend = null; return null; }

  const candidates = [];
  if (cfg.backendUrl) {
    try {
      candidates.push(new URL(cfg.backendUrl).origin);
    } catch { /* ugyldig URL i config */ }
  }
  if (candidates.length === 0 || !cfg.backendUrl) {
    // Samme-opphav: kun hvis siden faktisk serveres fra server.js.
    if (/^(http|https):\/\/[^/]+$/.test(window.location.origin)) {
      candidates.push(window.location.origin);
    }
  }

  for (const base of candidates) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(base + '/api/health', { signal: controller.signal, cache: 'no-store' });
      clearTimeout(id);
      if (res.ok) {
        const info = await res.json().catch(() => ({}));
        if (info && info.ok) {
          backend = { base, adminKeyRequired: !!info.adminKeyRequired };
          return backend;
        }
      }
    } catch { /* prøv neste kandidat */ }
  }
  backend = null;
  return null;
}

function normalizeLocalEvents(arr) {
  // Lag høyere-sekvens-først med serverlignende felt, sortert nyest øverst.
  return arr
    .filter((e) => e && e.event)
    .map((e, i) => ({
      id: e.id || e.eid || 'local-' + i,
      seq: e.seq || i + 1,
      recv: e.ts || Date.now(),
      ts: e.ts || Date.now(),
      event: e.event,
      session: e.session || '',
      test: !!e.test,
      bot: !!e.bot,
      severity: e.severity || 'info',
      data: e.data || {},
      ctx: e.ctx || {},
      local: true,
    }))
    .sort((a, b) => b.seq - a.seq);
}

export function trackEvent(event, data = {}, opts = {}) {
  const cfg = getConfig();
  if (!cfg.enabled) return null;
  const e = {
    eid: uuid(),
    event,
    ts: Date.now(),
    session: getSessionId(),
    test: !!opts.test,
    bot: opts.bot === true || isBotEnv(),
    data: data || {},
    ctx: opts.ctx || getCtx(),
  };

  if (backend) {
    queue.push(e);
    scheduleFlush();
  } else {
    // LOKAL-modus: legg nyest først i localStorage-listen.
    const events = localEventsRead();
    events.unshift(e);
    const max = Math.max(cfg.maxLocalEvents || 400, 50);
    if (events.length > max) events.length = max;
    localEventsWrite(events);
  }
  return e;
}

function getCtx() {
  if (!context) {
    try { context = getContext(); } catch { context = {}; }
  }
  return context;
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, 800);
}

export async function flush() {
  if (flushing || !queue.length || !backend) return;
  flushing = true;
  const batch = queue;
  queue = [];
  try {
    const raw = JSON.stringify({ batch });
    let ok = false;
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      try {
        ok = navigator.sendBeacon(backend.base + '/api/events', new Blob([raw], { type: 'application/json' }));
      } catch { ok = false; }
    }
    if (!ok) {
      const res = await fetch(backend.base + '/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: raw,
        keepalive: true,
      });
      ok = res.ok;
    }
    if (!ok) {
      // Behold batch til neste forsøk (begrenset).
      queue = batch.concat(queue).slice(0, 100);
    }
  } catch {
    queue = batch.concat(queue).slice(0, 100);
  } finally {
    flushing = false;
  }
}

// Send alt som står i køen nå (f.eks. ved hash-navigasjon/avslutning).
export async function flushNow() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  await flush();
}

// Spar på nettsiden: ikke forsøk å tipse/sende når dokumentet skjules.
export function onVisibilityHidden() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  flush();
}

// ---- LOKAL-modus: les/hent for dashbordet (kun lokal enhet) ----

export function localStats() {
  const events = normalizeLocalEvents(localEventsRead());
  const now = Date.now();
  const zero = () => ({ pageViews: 0, visits: 0, sessions: 0, quizzesCompleted: 0, mathCompleted: 0, errors: 0 });
  const totals = { events: events.length, ...zero() };
  const ranges = { idag: zero(), uke: zero(), måned: zero() };
  const byType = {};
  const perDay = {};
  const popularPages = {};
  const popularSubjects = {};
  const popularQuizzes = {};
  const device = {};
  const browser = {};
  const os = {};
  const screen = {};
  const scores = [];
  const sessions = new Set();

  const day = (t) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const start = (t) => { const d = new Date(t); d.setHours(0,0,0,0); return d.getTime(); };
  const startW = (t) => { const d = new Date(t); d.setHours(0,0,0,0); const dow = d.getDay() === 0 ? 7 : d.getDay(); d.setDate(d.getDate() - (dow - 1)); return d.getTime(); };
  const startM = (t) => { const d = new Date(t); d.setDate(1); d.setHours(0,0,0,0); return d.getTime(); };
  const dayS = start(now), weekS = startW(now), monthS = startM(now);

  for (const e of events) {
    if (e.test || e.bot) continue;
    const t = e.ts || e.recv || now;
    totals.events++;
    byType[e.event] = (byType[e.event] || 0) + 1;
    const dk = day(t);
    perDay[dk] = perDay[dk] || { date: dk, events: 0, visits: 0 };
    perDay[dk].events++;
    const d = e.data || {};
    const c = e.ctx || {};

    if (e.event === 'PAGE_VIEW') {
      totals.visits++;
      perDay[dk].visits++;
      const p = d.path ? String(d.path).split('?')[0] : '/';
      popularPages[p || '/'] = (popularPages[p || '/'] || 0) + 1;
      if (t >= dayS) { ranges.idag.visits++; if (e.session) sessions.add(e.session); }
      if (t >= weekS) ranges.uke.visits++;
      if (t >= monthS) ranges.måned.visits++;
      if (e.session) totals.sessions++;
    }
    if (e.event === 'SUBJECT_OPENED' && d.subjectLabel) popularSubjects[d.subjectLabel] = (popularSubjects[d.subjectLabel] || 0) + 1;
    if (e.event === 'QUIZ_STARTED' && d.quizTitle) popularQuizzes[d.quizTitle] = (popularQuizzes[d.quizTitle] || 0) + 1;
    if (e.event === 'QUIZ_STARTED') totals.quizzesStarted = (totals.quizzesStarted || 0) + 1;
    if (e.event === 'QUIZ_COMPLETED') {
      totals.quizzesCompleted++;
      if (t >= dayS) ranges.idag.quizzesCompleted++;
      if (t >= weekS) ranges.uke.quizzesCompleted++;
      if (t >= monthS) ranges.måned.quizzesCompleted++;
      if (Number.isFinite(d.score) && Number.isFinite(d.total) && d.total > 0) scores.push((d.score / d.total) * 100);
    }
    if (e.event === 'MATH_STARTED') totals.mathStarted = (totals.mathStarted || 0) + 1;
    if (e.event === 'MATH_COMPLETED') { totals.mathCompleted++; if (t >= dayS) ranges.idag.mathCompleted++; }
    if (e.event === 'SUBJECT_OPENED') totals.subjectsOpened = (totals.subjectsOpened || 0) + 1;
    if (e.event === 'ERROR') { totals.errors++; if (t >= dayS) ranges.idag.errors++; }

    if (c.dv) device[c.dv] = (device[c.dv] || 0) + 1;
    if (c.br) browser[c.br] = (browser[c.br] || 0) + 1;
    if (c.os) os[c.os] = (os[c.os] || 0) + 1;
    if (c.sc) screen[c.sc] = (screen[c.sc] || 0) + 1;
  }

  ranges.idag.sessions = sessions.size;
  totals.uniqueSessions = sessions.size;
  const top = (obj, n = 8) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, count]) => ({ label, count }));

  return {
    mode: 'local',
    totals,
    ranges,
    perDayList: Object.values(perDay).sort((a, b) => a.date.localeCompare(b.date)).slice(-30),
    byEventList: top(byType, 12),
    popularPages: top(popularPages),
    popularSubjects: top(popularSubjects),
    popularQuizzes: top(popularQuizzes),
    deviceCountList: top(device),
    browserCountList: top(browser),
    osCountList: top(os),
    screenCountList: top(screen),
    avgQuizScorePct: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    now,
    countryList: [],
    cityList: [],
    visitors: [],
    geoCache: { ipMode: 'lokal' },
  };
}

function adminHeaders() {
  try {
    const k = localStorage.getItem(getConfig().adminKeyKey);
    return k ? { 'X-Admin-Key': k } : {};
  } catch {
    return {};
  }
}

// Henter de hendelsene dashbordet skal vise (lokalt eller fra backend).
// Returnerer { mode, events (nyest først), count, lastSeq }.
export async function fetchEvents(params = {}) {
  if (backend) {
    const q = new URLSearchParams();
    if (params.limit) q.set('limit', String(params.limit));
    if (params.after) q.set('after', String(params.after));
    if (params.test) q.set('test', params.test);
    if (params.types) q.set('types', params.types.join(','));
    if (params.since) q.set('since', String(params.since));
    const res = await fetch(backend.base + '/api/events?' + q.toString(), {
      headers: adminHeaders(),
      cache: 'no-store',
    });
    const body = await res.json().catch(() => ({ ok: false }));
    if (!body.ok) throw new Error(body.error || 'kunne ikke hente hendelser');
    lastSeq = body.lastSeq || lastSeq;
    return { mode: 'server', events: body.events || [], count: body.count || 0, lastSeq: body.lastSeq || 0 };
  }
  const all = normalizeLocalEvents(localEventsRead());
  let list = all;
  if (params.after) list = list.filter((e) => e.seq > Number(params.after));
  if (params.test === '0') list = list.filter((e) => !e.test && !e.bot);
  if (params.test === '1') list = list.filter((e) => e.test);
  if (params.types && params.types.length) list = list.filter((e) => params.types.includes(e.event));
  if (params.since) list = list.filter((e) => (e.ts || e.recv || 0) >= Number(params.since));
  return { mode: 'local', events: list.slice(0, (params.limit || 200)), count: list.length, lastSeq: 0 };
}

// Full statistikk (backend eller lokal).
export async function fetchStats() {
  if (backend) {
    const res = await fetch(backend.base + '/api/stats', { headers: adminHeaders(), cache: 'no-store' });
    const body = await res.json().catch(() => ({ ok: false }));
    if (!body.ok) throw new Error(body.error || 'kunne ikke hente statistikk');
    return { ...body, mode: 'server' };
  }
  return localStats();
}

// Besøkende med IP + geo (kun backend – lokalt er det ingen server-side geo).
export async function fetchVisitors() {
  if (!backend) return { mode: 'local', count: 0, visitors: [] };
  const res = await fetch(backend.base + '/api/visitors', { headers: adminHeaders(), cache: 'no-store' });
  const body = await res.json().catch(() => ({ ok: false }));
  if (!body.ok) throw new Error(body.error || 'kunne ikke hente besøkende');
  return { mode: 'server', count: body.count || 0, visitors: body.visitors || [] };
}

export { EVENT_NAMES, TEST_NAMES };