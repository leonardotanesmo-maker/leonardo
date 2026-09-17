// Leonardo – analyse-lagring for serveren
//
// Dette er den PERSISTERENDE logg/analytics-delen som kjører i server.js
// («npm run dev» / «npm start»). Den lagrer hendelsene som JSON-linjer på
// disk under server-data/analytics/events.jsonl og serverer dem til det
// innebygde admin-dashbordet (#/admin).
//
// – Hendelsene knyttes til en tilfeldig pseudonym sesjons-id (session),
//   besøkerens IP (se server-geo.js for IP_MODE) og grove enhets-kategorier (ctx).
// – Hendelser dedupliseres med klientens eid (event-id), så retries gir
//   ikke duplikater.
//
// Brukervalgte miljøvariabler:
//   LEONARDO_ANALYTICS_DIR  – katalog for events.jsonl (default: server-data/analytics)
//   LEONARDO_ADMIN_KEY      – eventuell admin-nøkkel for GET /api/events og /api/stats
//                             (lesing). Settes av eieren; leses fra miljøvariabel,
//                             aldri fra klient-kode.
//   LEONARDO_ANALYTICS_IP_MODE – 'full' (default) lagrer hele IP-en,
//                             'forkortet' maskerer siste oktett (GDPR-snillere).

import { mkdir, writeFile, appendFile, stat, rename } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { clientIp, storedIp, geoForIp, ipMode, geoCacheInfo, geoAvailable } from './server-geo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MAX_EVENTS = 100000;          // hard tak i filen – eldste halvdel slettes
const MAX_BATCH = 200;              // maks hendelser per POST
const MAX_BODY_BYTES = 512 * 1024;  // maks body-størrelse
const DEDUP_WINDOW = 5000;          // antall nylige eid-er som huskes

const DATA_DIR = process.env.LEONARDO_ANALYTICS_DIR || path.join(__dirname, 'server-data', 'analytics');

let seq = 0;
let eventCount = 0;
const recentEids = new Set();
const eidQueue = [];

function guessSeverity(data) {
  if (!data) return 'info';
  if (data.severity === 'warn' || data.severity === 'error') return data.severity;
  return 'info';
}

// Grov UA-sjekk: merk kjente bot-/automasjons-UA-er så de ikke teller som «ekte» besøkende.
function isBotUA(ua) {
  const u = String(ua || '').toLowerCase();
  return /headless|phantom|puppeteer|playwright|selenium|webdriver|curl|wget|python-requests|httpx|node-fetch|axios|okhttp|scrapy|java\/|go-http|crawler|crawl|spider|slurp|bingbot|googlebot|bot\b|facebookexternalhit|whatsapp|telegrambot|monitoring|uptime|pingdom|screenshot|preview/i.test(u);
}

export async function ensureAnalytics() {
  await mkdir(DATA_DIR, { recursive: true });
  const file = eventsFile();
  try {
    await stat(file);
  } catch {
    await writeFile(file, '', 'utf8');
    return;
  }
  // Tell antall hendelser og siste seq ved oppstart (leser bare siste linje).
  await loadMeta();
}

function eventsFile() {
  return path.join(DATA_DIR, 'events.jsonl');
}

function streamLines(file, onLine) {
  return new Promise((resolve, reject) => {
    const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
    rl.on('line', onLine);
    rl.on('close', resolve);
    rl.on('error', reject);
  });
}

async function loadMeta() {
  let last = 0;
  let count = 0;
  await streamLines(eventsFile(), (line) => {
    if (!line.trim()) return;
    count++;
    try {
      const evt = JSON.parse(line);
      if (Number.isFinite(evt.seq) && evt.seq > last) last = evt.seq;
    } catch { /* ignorér korrupte linjer ved oppstart */ }
  });
  seq = last;
  eventCount = count;
}

export function analyticsStatus() {
  return {
    ok: true,
    adminKeyRequired: !!process.env.LEONARDO_ADMIN_KEY,
    dir: DATA_DIR,
    events: eventCount,
    lastSeq: seq,
    geo: {
      ipMode: ipMode(),
      geoLookup: geoAvailable(),
      cache: geoCacheInfo(),
    },
  };
}

function readBody(req, max = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > max) { reject(new Error('body for stor')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function trimIfNeeded() {
  if (eventCount <= MAX_EVENTS) return;
  const file = eventsFile();
  const tmp = file + '.trim';
  const keep = Math.floor(MAX_EVENTS * 0.5);
  const lines = [];
  await streamLines(file, (line) => {
    if (!line.trim()) return;
    lines.push(line);
  });
  // Behold de nyeste `keep` linjene.
  const kept = lines.slice(-keep);
  await writeFile(tmp, kept.join('\n') + (kept.length ? '\n' : ''), 'utf8');
  await rename(tmp, file);
  eventCount = kept.length;
}

/**
 * Lagrer en batch hendelser fra klienten.
 * req kan være et HTTP-request-objekt (server.js) eller null –
 * i sistnevnte tilfelle (f.eks. tester) settes ingen IP/geo.
 * body kan være { batch: [...] } eller et rent array.
 */
export async function ingestEvents(rawBody, req = null) {
  let arr = null;
  if (Array.isArray(rawBody)) arr = rawBody;
  else if (rawBody && Array.isArray(rawBody.batch)) arr = rawBody.batch;
  if (!arr) throw new Error('ugyldig payload');
  if (arr.length > MAX_BATCH) arr = arr.slice(0, MAX_BATCH);

  // Besøker-IP + geo slås opp én gang per batch. UA-bot-sjekk for å skille
  // ekte besøkende fra automatiserte besøk (headless/curl osv.).
  const ip = clientIp(req);
  const ipStore = storedIp(ip);
  const geo = geoForIp(ipStore);
  const ua = (req && req.headers && req.headers['user-agent']) || '';
  const uaBot = isBotUA(ua);

  const file = eventsFile();
  const added = [];
  for (const e of arr) {
    if (!e || typeof e !== 'object') continue;
    const eventName = String(e.event || '').trim();
    if (!eventName) continue;
    const eid = String(e.eid || '');
    if (eid) {
      if (recentEids.has(eid)) continue; // dedup av retries
      recentEids.add(eid);
      eidQueue.push(eid);
      while (eidQueue.length > DEDUP_WINDOW) {
        const old = eidQueue.shift();
        recentEids.delete(old);
      }
    }
    const ts = Number.isFinite(e.ts) ? e.ts : Date.now();
    const isTest = !!e.test;
    const isBot = uaBot || e.bot === true;
    const lineEvent = {
      id: randomUUID(),
      seq: ++seq,
      recv: Date.now(),
      ts,
      event: eventName,
      session: typeof e.session === 'string' ? e.session.slice(0, 64) : '',
      test: isTest,
      bot: isBot,
      real: !(isTest || isBot), // «ekte menneske»: verken test- eller bot-hendelse
      severity: guessSeverity(e.data),
      data: sanitize(e.data || {}),
      ctx: sanitize(e.ctx || {}),
    };
    if (geo) lineEvent.geo = geo;
    lineEvent.ip = ipStore; // lagres på hver hendelse (IP_MODE-styrt)
    await appendFile(file, JSON.stringify(lineEvent) + '\n', 'utf8');
    eventCount++;
    added.push(lineEvent);
  }
  // Rydd opp hvis filen ble for stor.
  if (eventCount > MAX_EVENTS + 500) await trimIfNeeded();
  return { added: added.length, lastSeq: seq, events: added };
}

// Kun tillat enkle primitiver og små strenger – aldri for lange verdier,
// så dashbordet ikke må håndtere «helt ledig» data fra klienten.
function sanitize(obj) {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      out[k] = v.slice(0, 240);
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      out[k] = v;
    } else if (typeof v === 'boolean') {
      out[k] = v;
    }
  }
  return out;
}

function fmtDay(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ISO-landkoder → norske landsnavn (kun for visning i dashbordet).
const COUNTRY_NAMES = {
  NO: 'Norge', SE: 'Sverige', DK: 'Danmark', FI: 'Finland', IS: 'Island',
  DE: 'Tyskland', GB: 'Storbritannia', US: 'USA', CA: 'Canada', FR: 'Frankrike',
  ES: 'Spania', IT: 'Italia', NL: 'Nederland', BE: 'Belgia', AT: 'Østerrike',
  CH: 'Sveits', PL: 'Polen', IE: 'Irland', PT: 'Portugal', CZ: 'Tsjekkia',
  UA: 'Ukraina', RU: 'Russland', IN: 'India', CN: 'Kina', JP: 'Japan',
  KR: 'Sør-Korea', AU: 'Australia', NZ: 'New Zealand', BR: 'Brasil', MX: 'Mexico',
  AR: 'Argentina', CL: 'Chile', TR: 'Tyrkia', GR: 'Hellas', TH: 'Thailand',
  ID: 'Indonesia', MY: 'Malaysia', SG: 'Singapore', VN: 'Vietnam', PH: 'Filippinene',
  ZA: 'Sør-Afrika', EG: 'Egypt', NG: 'Nigeria', KE: 'Kenya', GH: 'Ghana',
  IL: 'Israel', SA: 'Saudi-Arabia', AE: 'De forente arabiske emirater',
  EE: 'Estland', LV: 'Latvia', LT: 'Litauen', RO: 'Romania', BG: 'Bulgaria',
  HU: 'Ungarn', SK: 'Slovakia', SI: 'Slovenia', HR: 'Kroatia', RS: 'Serbia',
  PR: 'Puerto Rico', HK: 'Hongkong', TW: 'Taiwan', PK: 'Pakistan', BD: 'Bangladesh',
  IR: 'Iran', KZ: 'Kasakhstan', UZ: 'Usbekistan', LB: 'Libanon', JO: 'Jordan',
  MA: 'Marokko', TN: 'Tunisia', DZ: 'Algeria', ET: 'Etiopia', TZ: 'Tanzania',
};

export function countryName(code) {
  if (!code) return 'Ukjent';
  return COUNTRY_NAMES[String(code).toUpperCase()] || String(code).toUpperCase();
}

function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeek(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (day - 1));
  return d.getTime();
}

function startOfMonth(ts) {
  const d = new Date(ts);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Leser hendelser fra fil (nyeste først, begrenset).
 * query: { limit, after (seq), test: 'all'|'0'|'1', types, since }
 */
export async function listEvents(query = {}) {
  const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 2000);
  const after = Number(query.after) || 0;
  const since = Number(query.since) || 0;
  const testMode = query.test === 'all' ? 'all' : query.test === '1' ? '1' : '0';
  const types = new Set(String(query.types || '').split(',').map((t) => t.trim()).filter(Boolean));

  const all = [];
  await streamLines(eventsFile(), (line) => {
    if (!line.trim()) return;
    try {
      const evt = JSON.parse(line);
      if (evt.seq <= after) return;
      if (since && evt.ts < since) return;
      // Standard: kun ekte besøkende. '1' = kun test. 'all' = alt (med badge).
      if (testMode === '0' && (evt.test || evt.bot)) return;
      if (testMode === '1' && !evt.test) return;
      if (types.size && !types.has(evt.event)) return;
      all.push(evt);
    } catch { /* ignorér korrupte linjer under lesing */ }
  });
  all.sort((a, b) => b.seq - a.seq);
  return {
    count: all.length,
    lastSeq: seq,
    events: all.slice(0, limit),
  };
}

/**
 * Aggregeringspunkter for dashbordet. Hopp over test-hendelser som standard.
 */
export async function aggregateStats() {
  const now = Date.now();
  const dayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const stats = {
    ok: true,
    now,
    generatedAt: new Date(now).toISOString(),
    totals: {
      events: 0,
      pageViews: 0,
      visits: 0,
      sessions: 0,
      uniqueSessions: 0,
      quizzesStarted: 0,
      quizzesCompleted: 0,
      mathStarted: 0,
      mathCompleted: 0,
      subjectsOpened: 0,
      errors: 0,
      avgQuizScorePct: null,
    },
    ranges: {
      today: { dayStart, visits: 0, sessions: 0, quizzesCompleted: 0, mathCompleted: 0, errors: 0 },
      week: { weekStart, visits: 0, sessions: 0, quizzesCompleted: 0, errors: 0 },
      month: { monthStart, visits: 0, sessions: 0, quizzesCompleted: 0, errors: 0 },
    },
    onlineNow: 0,             // økter med hendelse de siste 10 minuttene
    returningSessions: 0,     // økter sett på >= 2 ulike dager
    perDay: {},
    perHour: {},              // time 0-23 → visits
    byEventType: {},
    severityCounts: { info: 0, warn: 0, error: 0 },
    popularPages: {},
    popularSubjects: {},
    popularQuizzes: {},
    deviceCounts: {},
    browserCounts: {},
    osCounts: {},
    screenCounts: {},
    referrerCounts: {},
    countryCounts: {},
    regionCounts: {},
    cityCounts: {},
    quizScores: [],
    quizPerf: {},             // quizTitle → { attempts, completed, sumPct }
  };

  let last = null;
  const seenSessionsToday = new Set();
  const seenSessionsWeek = new Set();
  const seenSessionsMonth = new Set();
  const sessionLastSeen = new Map(); // session → siste recv (for «aktiv nå»)
  const sessionDays = new Map();     // session → sett med dager (for tilbakevendende)

  await streamLines(eventsFile(), (line) => {
    if (!line.trim()) return;
    try { last = JSON.parse(line); } catch { return; }
    // KUN ekte besøkende teller: test- og bot-hendelser ignoreres i statistikken.
    if (!last.real) return;
    // Bruk serverens mottakstidspunkt for aggregering – klientklokker kan være skjeve.
    const t = last.recv || last.ts || now;
    stats.totals.events++;
    stats.byEventType[last.event] = (stats.byEventType[last.event] || 0) + 1;
    stats.severityCounts[last.severity] = (stats.severityCounts[last.severity] || 0) + 1;

    if (last.session) {
      sessionLastSeen.set(last.session, t);
      const dkDay = fmtDay(t);
      let days = sessionDays.get(last.session);
      if (!days) { days = new Set(); sessionDays.set(last.session, days); }
      days.add(dkDay);
    }

    const day = fmtDay(t);
    const dayStat = (stats.perDay[day] = stats.perDay[day] || { date: day, events: 0, visits: 0 });
    dayStat.events++;

    const d = last.data || {};

    if (last.event === 'PAGE_VIEW') {
      stats.totals.visits++;
      dayStat.visits++;
      const hour = new Date(t).getHours();
      stats.perHour[hour] = (stats.perHour[hour] || 0) + 1;
      const p = d.path ? String(d.path).replace(/\?.*/, '') : '';
      const label = p || '/';
      stats.popularPages[label] = (stats.popularPages[label] || 0) + 1;
      if (t >= dayStart) {
        stats.ranges.today.visits++;
        if (last.session) seenSessionsToday.add(last.session);
      }
      if (t >= weekStart) {
        stats.ranges.week.visits++;
        if (last.session) seenSessionsWeek.add(last.session);
      }
      if (t >= monthStart) {
        stats.ranges.month.visits++;
        if (last.session) seenSessionsMonth.add(last.session);
      }
      if (last.session) stats.totals.sessions++;
    }

    if (last.event === 'SUBJECT_OPENED' && d.subjectLabel) {
      stats.popularSubjects[d.subjectLabel] = (stats.popularSubjects[d.subjectLabel] || 0) + 1;
    }
    if (last.event === 'QUIZ_STARTED' && d.quizTitle) {
      stats.popularQuizzes[d.quizTitle] = (stats.popularQuizzes[d.quizTitle] || 0) + 1;
    }

    if (last.event === 'QUIZ_STARTED') {
      stats.totals.quizzesStarted++;
      if (d.quizTitle) {
        const p = (stats.quizPerf[d.quizTitle] = stats.quizPerf[d.quizTitle] || { attempts: 0, completed: 0, sumPct: 0 });
        p.attempts++;
      }
    }
    if (last.event === 'QUIZ_COMPLETED') {
      stats.totals.quizzesCompleted++;
      if (Number.isFinite(d.score) && Number.isFinite(d.total) && d.total > 0) {
        const pct = (d.score / d.total) * 100;
        stats.quizScores.push(pct);
        if (d.quizTitle) {
          const p = (stats.quizPerf[d.quizTitle] = stats.quizPerf[d.quizTitle] || { attempts: 0, completed: 0, sumPct: 0 });
          p.completed++;
          p.sumPct += pct;
        }
      }
      if (t >= dayStart) stats.ranges.today.quizzesCompleted++;
      if (t >= weekStart) stats.ranges.week.quizzesCompleted++;
      if (t >= monthStart) stats.ranges.month.quizzesCompleted++;
      if (Number.isFinite(d.score) && Number.isFinite(d.total) && d.total > 0) {
        stats.quizScores.push((d.score / d.total) * 100);
      }
    }
    if (last.event === 'MATH_STARTED') stats.totals.mathStarted++;
    if (last.event === 'MATH_COMPLETED') {
      stats.totals.mathCompleted++;
      if (t >= dayStart) stats.ranges.today.mathCompleted++;
    }
    if (last.event === 'SUBJECT_OPENED') stats.totals.subjectsOpened++;
    if (last.event === 'ERROR') {
      stats.totals.errors++;
      if (t >= dayStart) stats.ranges.today.errors++;
      if (t >= weekStart) stats.ranges.week.errors++;
      if (t >= monthStart) stats.ranges.month.errors++;
    }

    const c = last.ctx || {};
    if (c.dv) stats.deviceCounts[c.dv] = (stats.deviceCounts[c.dv] || 0) + 1;
    if (c.br) stats.browserCounts[c.br] = (stats.browserCounts[c.br] || 0) + 1;
    if (c.os) stats.osCounts[c.os] = (stats.osCounts[c.os] || 0) + 1;
    if (c.sc) stats.screenCounts[c.sc] = (stats.screenCounts[c.sc] || 0) + 1;
    if (c.ref) stats.referrerCounts[c.ref] = (stats.referrerCounts[c.ref] || 0) + 1;

    // Geo: land/region/by-summer fra hendelsens geo-oppslag.
    const g = last.geo || {};
    if (g.countryCode) stats.countryCounts[g.countryCode] = (stats.countryCounts[g.countryCode] || 0) + 1;
    if (g.countryCode && g.region) stats.regionCounts[g.countryCode + ':' + g.region] = (stats.regionCounts[g.countryCode + ':' + g.region] || 0) + 1;
    if (g.countryCode && g.city) stats.cityCounts[g.countryCode + ':' + g.city] = (stats.cityCounts[g.countryCode + ':' + g.city] || 0) + 1;
  });

  stats.totals.uniqueSessions = stats.totals.sessions;
  stats.totals.pageViews = stats.totals.visits;
  stats.ranges.today.sessions = seenSessionsToday.size;
  stats.ranges.week.sessions = seenSessionsWeek.size;
  stats.ranges.month.sessions = seenSessionsMonth.size;

  // «Aktiv nå»: økter med hendelse de siste 10 minuttene.
  const ACTIVE_WINDOW = 10 * 60 * 1000;
  let online = 0;
  for (const [, lastT] of sessionLastSeen) if (now - lastT <= ACTIVE_WINDOW) online++;
  stats.onlineNow = online;

  // Tilbakevendende: økter sett på minst 2 forskjellige dager.
  let returning = 0;
  for (const [, days] of sessionDays) if (days.size >= 2) returning++;
  stats.returningSessions = returning;

  if (stats.quizScores.length) {
    const sum = stats.quizScores.reduce((a, b) => a + b, 0);
    stats.totals.avgQuizScorePct = Math.round(sum / stats.quizScores.length);
  }
  delete stats.quizScores;

  const top = (obj, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([label, count]) => ({ label, count }));

  const quizPerformance = Object.entries(stats.quizPerf)
    .map(([title, p]) => ({
      title,
      attempts: p.attempts,
      completed: p.completed,
      avgScorePct: p.completed ? Math.round(p.sumPct / p.completed) : null,
    }))
    .sort((a, b) => b.attempts - a.attempts || (b.avgScorePct || 0) - (a.avgScorePct || 0))
    .slice(0, 10);
  delete stats.quizPerf;

  const hourList = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: String(hour).padStart(2, '0') + ':00',
    visits: stats.perHour[hour] || 0,
  }));

  return {
    ...stats,
    perDayList: Object.values(stats.perDay).sort((a, b) => a.date.localeCompare(b.date)).slice(-30),
    hourList: hourList.filter((h) => h.visits > 0).length ? hourList : [],
    quizPerformance,
    popularPages: top(stats.popularPages),
    popularSubjects: top(stats.popularSubjects),
    popularQuizzes: top(stats.popularQuizzes),
    byEventList: top(stats.byEventType, 12),
    deviceCountList: top(stats.deviceCounts),
    browserCountList: top(stats.browserCounts),
    osCountList: top(stats.osCounts),
    screenCountList: top(stats.screenCounts),
    referrerList: top(stats.referrerCounts, 8),
    countryList: Object.entries(stats.countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([code, count]) => ({ code, label: countryName(code), country: COUNTRY_NAMES[code] || code, count })),
    regionList: top(stats.regionCounts, 12).map(({ label, count }) => {
      const [code, region] = String(label).split(':');
      return { code, region, country: countryName(code), count };
    }),
    cityList: top(stats.cityCounts, 12).map(({ label, count }) => {
      const [code, city] = String(label).split(':');
      return { code, city, country: countryName(code), count };
    }),
    geoCache: geoCacheInfo(),
  };
}

export async function aggregateVisitors() {
  const now = Date.now();
  const bySession = new Map();

  await streamLines(eventsFile(), (line) => {
    if (!line.trim()) return;
    let e;
    try { e = JSON.parse(line); } catch { return; }
    if (!e.real) return; // kun ekte besøkende vises som «besøkende»
    const key = (e.session && e.session.trim()) || e.ip || e.id || '';
    if (!key) return;
    let vis = bySession.get(key);
    if (!vis) {
      vis = {
        session: e.session || '',
        ip: e.ip || '',
        geo: e.geo ? { ...e.geo } : null,
        device: '',
        browser: '',
        os: '',
        screen: '',
        lang: '',
        tz: '',
        firstSeen: e.recv || e.ts || now,
        lastSeen: e.recv || e.ts || now,
        events: 0,
        visits: 0,
        errors: 0,
        lastEvent: e.event || '',
        lastPath: '',
        subject: '',
        quiz: '',
        test: false,
      };
      bySession.set(key, vis);
    }
    const t = e.recv || e.ts || now;
    if (t < vis.firstSeen) vis.firstSeen = t;
    if (t > vis.lastSeen) vis.lastSeen = t;
    vis.events++;
    if (e.ip) vis.ip = e.ip;
    if (e.geo) vis.geo = { ...e.geo };
    const c = e.ctx || {};
    if (c.dv) vis.device = c.dv;
    if (c.br) vis.browser = c.br;
    if (c.os) vis.os = c.os;
    if (c.sc) vis.screen = c.sc;
    if (c.ln) vis.lang = c.ln;
    if (c.tz) vis.tz = c.tz;
    if (e.event) vis.lastEvent = e.event;
    const d = e.data || {};
    if (e.event === 'PAGE_VIEW') {
      vis.visits++;
      if (d.path) vis.lastPath = String(d.path).split('?')[0];
    }
    if (e.event === 'ERROR') vis.errors++;
    if (e.event === 'SUBJECT_OPENED' && (d.subjectLabel || d.subjectSlug)) vis.subject = d.subjectLabel || d.subjectSlug;
    if ((e.event === 'QUIZ_STARTED' || e.event === 'MATH_STARTED') && (d.quizTitle || d.quizId)) vis.quiz = d.quizTitle || d.quizId;
    if (e.test) vis.test = true;
  });

  const list = [...bySession.values()].sort((a, b) => b.lastSeen - a.lastSeen);
  return { ok: true, now, visitors: list, count: list.length };
}

export function adminKeyOk(req) {
  const expected = process.env.LEONARDO_ADMIN_KEY;
  if (!expected) return true;
  const got = req.headers['x-admin-key'] || '';
  return got === expected;
}

export { DATA_DIR };