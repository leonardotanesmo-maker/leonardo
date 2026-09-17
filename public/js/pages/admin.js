// Leonardo – internt admin-dashbord for logg/statistikk (#/admin)
//
// Dette er en UBESKYTTET side som vises til alle som kjenner adressen.
// Sørg for at viderebrukere ikke får tilgang til det samme nettstedet i
// drift uten egen avtale om sikkerhet. Les nøkkel-krav i server.js/server-
// analytics.js (LEONARDO_ADMIN_KEY) – leseruter kan låses bak en admin-nøkkel.
//
// Dashbordet viser:
//   – status-banner (SERVER-modus vs LOKAL-modus)
//   – statistikker/kort + «topp»-lister
//   – live-logg med filtre
//   – utstyr/nettleser/OS/skjerm-fordeling
//   – knapper som genererer TEST-hendelser (skilles fra ekte trafikk)

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { crumbs } from '../components.js';
import { trackEvent, TEST_NAMES } from '../analytics/index.js';
import { fetchStats, fetchEvents, fetchVisitors, backendInfo } from '../analytics/core.js';
import { getConfig } from '../analytics/config.js';

const POLL_MS = () => Math.max(getConfig().pollIntervalMs || 4000, 1000);

const EVENT_STYLE = {
  PAGE_VIEW: 'pv',
  APP_LOADED: 'al',
  SUBJECT_OPENED: 'so',
  QUIZ_STARTED: 'qs',
  QUIZ_QUESTION_ANSWERED: 'qq',
  QUIZ_COMPLETED: 'qc',
  MATH_STARTED: 'ms',
  MATH_QUESTION_ANSWERED: 'mq',
  MATH_COMPLETED: 'mc',
  BUTTON_CLICKED: 'bc',
  ERROR: 'er',
};

function styleOf(name) {
  const base = String(name || '').replace(/^TEST_/, '');
  return EVENT_STYLE[base] || 'ot';
}

const TYPE_GROUPS = [
  { label: 'Sidevisninger', names: ['PAGE_VIEW', 'APP_LOADED'] },
  { label: 'Fag', names: ['SUBJECT_OPENED'] },
  { label: 'Quizer', names: ['QUIZ_STARTED', 'QUIZ_QUESTION_ANSWERED', 'QUIZ_COMPLETED'] },
  { label: 'Matte', names: ['MATH_STARTED', 'MATH_QUESTION_ANSWERED', 'MATH_COMPLETED'] },
  { label: 'Klikk', names: ['BUTTON_CLICKED'] },
  { label: 'Feil', names: ['ERROR'] },
];

const state = {
  pollTimer: null,
  live: true,
  hidden: false,
  search: '',
  test: '0',           // '0' uten test, '1' kun test, 'all' alle
  types: new Set(),    // tom = alle
  onlyErrors: false,
  detailSeq: 0,
  vismap: {},        // session → utvidet besøker
  statusMsg: '',
  started: false,
};

let statusHost = null;

export function renderAdmin() {
  const contentHost = h('div', { class: 'admin-content' });
  statusHost = h('div', { class: 'admin-status' });

  const searchInput = h('input', { class: 'text-input admin-search', type: 'search', placeholder: 'Filtrer loggen…', value: state.search });
  searchInput.addEventListener('input', () => {
    state.search = searchInput.value.toLowerCase();
    refresh();
  });

  const radioGroup = h('div', { class: 'admin-radio', role: 'group', 'aria-label': 'Vis test-hendelser' },
    radio('Kun ekte (test/bot skjult)', '0'),
    radio('Kun test', '1'),
    radio('Alle', 'all'),
  );

  const errorsChk = h('label', { class: 'admin-chk' },
    h('input', { type: 'checkbox', checked: state.onlyErrors }),
    ' Bare feil (ERROR)',
  );
  errorsChk.addEventListener('change', () => {
    state.onlyErrors = errorsChk.querySelector('input').checked;
    refresh();
  });

  const typeFilter = h('div', { class: 'admin-types' });
  const typeBoxes = TYPE_GROUPS.map((g) => {
    const box = h('label', { class: 'admin-chk' },
      h('input', { type: 'checkbox', checked: groupAllSelected(g.names) }),
      ' ' + g.label,
    );
    box.addEventListener('change', () => {
      const on = box.querySelector('input').checked;
      for (const n of g.names) {
        if (on) state.types.add(n);
        else state.types.delete(n);
      }
      refresh();
    });
    return box;
  });
  typeBoxes.forEach((b) => typeFilter.appendChild(b));

  const liveBtn = h('button', { class: 'btn btn-ghost btn-sm', type: 'button', html: icon('pause', 14) + ' Live-på/av', onclick: () => {
    state.live = !state.live;
    if (state.live) startPolling();
    else stopPolling();
    refresh();
  } });
  const refreshBtn = h('button', { class: 'btn btn-ghost btn-sm', type: 'button', html: icon('refresh', 14) + ' Oppdater', onclick: () => refresh() });
  const clearBtn = h('button', { class: 'btn btn-ghost btn-sm', type: 'button', html: icon('close', 14) + ' Nullstill filtre', onclick: () => {
    state.search = '';
    state.test = '0';
    state.onlyErrors = false;
    state.types = new Set();
    state.detailSeq = 0;
    searchInput.value = '';
    refreshFilterBar(radioGroup, errorsChk, typeBoxes);
    refresh();
  } });

  const filterBar = h('div', { class: 'admin-filterbar' },
    searchInput,
    h('div', { class: 'admin-filter-row' }, radioGroup, errorsChk),
    h('div', { class: 'admin-filter-row' }, typeFilter),
    h('div', { class: 'admin-filter-actions' }, liveBtn, refreshBtn, clearBtn),
  );

  const el = h('div', { class: 'container page-pad' },
    crumbs([{ label: 'Hjem', href: '#/' }, { label: 'Admin-logg' }]),
    h('div', { class: 'admin-head' },
      h('h1', {},
        'Logg og statistikk ',
        h('span', { class: 'admin-badge' }, 'admin'),
      ),
      h('p', { style: 'color:var(--ink-2)' }, 'Internt dashbord – se trafikken på siden, quizer og matteøving, feil, enhetsfordeling og besøkende (land/by/IP).'),
    ),
    statusHost,
    filterBar,
    contentHost,
  );

  function refreshFilterBar(radioGroup, errorsChk, typeBoxes) {
    radioGroup.querySelectorAll('input').forEach((inp) => {
      inp.checked = String(inp.value) === state.test;
    });
    errorsChk.querySelector('input').checked = state.onlyErrors;
    typeBoxes.forEach((b, i) => {
      b.querySelector('input').checked = groupAllSelected(TYPE_GROUPS[i].names);
    });
  }

  async function refresh() {
    if (!contentHost) return;
    try {
      const [stats, feed, visitorsData] = await Promise.all([
        fetchStats(),
        fetchFeed(),
        fetchVisitors().catch(() => ({ count: 0, visitors: [], mode: 'local' })),
      ]);
      if (statusHost) renderBanner(stats);
      contentHost.innerHTML = '';
      contentHost.appendChild(renderStats(stats));
      contentHost.appendChild(renderTrend(stats));
      contentHost.appendChild(renderPopular(stats));
      contentHost.appendChild(renderVisitors(stats, visitorsData));
      contentHost.appendChild(renderFeed(feed ? feed.events : [], feed ? feed.count : 0));
      contentHost.appendChild(renderTestPanel());
      contentHost.appendChild(renderSettings());
    } catch (err) {
      contentHost.innerHTML = '';
      contentHost.appendChild(h('div', { class: 'card admin-empty' },
        h('p', { text: 'Kunne ikke hente data: ' + String(err && err.message || err) }),
        h('p', { text: 'Sjekk at serveren kjører (server.js), at backendUrl er riktig, eller at admin-nøkkelen er lagt inn under «Innstillinger».' }),
      ));
    }
  }

  function fetchFeed() {
    const params = { limit: 200, test: state.test };
    if (state.onlyErrors) params.types = ['ERROR'];
    return fetchEvents(params);
  }

  function startPolling() {
    stopPolling();
    state.pollTimer = setInterval(() => {
      if (document.hidden) return;
      refresh();
    }, POLL_MS());
  }

  function stopPolling() {
    if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; }
  }

  function onVisibility() {
    state.hidden = document.hidden;
    if (!state.hidden && state.live) refresh();
  }

  const mount = () => {
    refresh();
    if (state.live) startPolling();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  };

  return { title: 'Admin – Leonardo', element: el, mount };
}

function radio(label, value) {
  const lab = h('label', { class: 'admin-chk' },
    h('input', { type: 'radio', name: 'admin-test', value }),
    ' ' + label,
  );
  lab.querySelector('input').checked = state.test === value;
  lab.addEventListener('change', () => { if (lab.querySelector('input').checked) { state.test = value; refresh(); } });
  return lab;
}

function groupAllSelected(names) {
  return names.every((n) => state.types.has(n));
}

// ---- Status-banner ----

function renderBanner(stats) {
  const info = backendInfo();
  const isServer = info.mode === 'server';
  const isAdminLocked = isServer && info.adminKeyRequired;
  const r = stats.ranges || {};
  const today = r.idag || r.today || {};

  const rows = h('div', { class: 'admin-banner-rows' },
    bannerRow('Visninger', stats.totals ? stats.totals.visits : 0, today.visits, 'i dag'),
    bannerRow('Økter', stats.totals ? stats.totals.uniqueSessions : 0, today.sessions, 'i dag'),
    bannerRow('Aktiv nå', stats.onlineNow ?? 0, null, null),
    bannerRow('Quizer fullført', stats.totals ? stats.totals.quizzesCompleted : 0, today.quizzesCompleted, 'i dag'),
    bannerRow('Matte fullført', stats.totals ? stats.totals.mathCompleted : 0, today.mathCompleted, 'i dag'),
  );

  statusHost.classList.remove('admin-ok', 'admin-warn', 'admin-info');
  const cls = isServer ? (isAdminLocked ? 'admin-warn' : 'admin-ok') : 'admin-info';
  statusHost.classList.add(cls);

  statusHost.innerHTML = '';
  statusHost.appendChild(h('div', { class: 'admin-banner' },
    h('div', { class: 'admin-banner-main' },
      h('span', { class: 'admin-mode-dot', html: icon(isServer ? 'globe' : 'laptop', 16) }),
      h('div', {},
        h('div', { class: 'admin-mode-title', text: isServer ? 'SERVER-modus – samler fra besøkende' : 'LOKAL-modus – kun denne enheten' }),
        h('div', { class: 'admin-mode-sub', text: isServer
          ? (info.base ? 'Backend: ' + info.base : 'Backend aktiv') + (isAdminLocked ? ' · leseruter låst med admin-nøkkel' : ' · leseruter åpne')
          : 'Ingen backend ble funnet. Hendelser lagres bare lokalt (localStorage) på denne enheten og vises med badge «lokal». Start server.js og last siden derfra for å samle fra ekte besøkende.' }),
      ),
    ),
    rows,
  ));
  return statusHost;
}

function bannerRow(label, value, extra, extraLabel) {
  return h('div', { class: 'admin-banner-row' },
    h('div', { class: 'admin-banner-num', text: String(value ?? 0) }),
    h('div', { class: 'admin-banner-label', text: label }),
    value != null && extra != null
      ? h('div', { class: 'admin-banner-extra', text: '+' + String(extra) + ' ' + (extraLabel || label.toLowerCase()) })
      : null,
  );
}

// ---- Stat-kort ----

function renderStats(stats) {
  const t = stats.totals || {};
  const avg = t.avgQuizScorePct;
  const cards = [
              statCard('Besøk', t.visits ?? 0, 'visits', stats.ranges, 'eyes'),
    statCard('Økter', t.uniqueSessions ?? 0, 'sessions', stats.ranges, 'users'),
    statCard('Tilbakevendende', stats.returningSessions ?? 0, null, null, 'restart'),
    statCard('Quizer startet', t.quizzesStarted ?? 0, null, null, 'bolt'),
    statCard('Quizer fullført', t.quizzesCompleted ?? 0, 'quizzesCompleted', stats.ranges, 'trophy'),
    statCard('Matte fullført', t.mathCompleted ?? 0, 'mathCompleted', stats.ranges, 'math'),
    statCard('Feil', t.errors ?? 0, 'errors', stats.ranges, 'warning'),
    statCard('Snittscore', avg != null ? avg + ' %' : '–', null, null, 'target'),
    statCard('Hendelser', t.events ?? 0, null, null, 'layers'),
  ];
  return h('section', { class: 'admin-section' },
    h('h2', { text: 'Oversikt' }),
    h('div', { class: 'admin-stats' }, ...cards),
  );
}

function statCard(title, value, rangeKey, ranges, iconName) {
  let extra = null;
  if (rangeKey && ranges) {
    const today = ranges.idag || ranges.today || {};
    if (rangeKey in today && today[rangeKey] != null && Number(today[rangeKey]) > 0) {
      extra = { text: '+' + today[rangeKey], label: ' i dag' };
    }
  }
  return h('div', { class: 'card admin-stat' },
    h('div', { class: 'admin-stat-ico', html: icon(iconName || 'layers', 18) }),
    h('div', { class: 'admin-stat-body' },
      h('div', { class: 'admin-stat-num', text: String(value) }),
      h('div', { class: 'admin-stat-label', text: title }),
      extra ? h('div', { class: 'admin-stat-extra', text: extra.text + extra.label }) : null,
    ),
  );
}

// ---- Populær + enheter ----

function renderPopular(stats) {
  const list = (title, items, empty) => h('div', { class: 'admin-pop' },
    h('h3', { text: title }),
    items && items.length
      ? h('ul', { class: 'admin-pop-list' }, ...items.map((it) =>
          h('li', {},
            h('span', { class: 'admin-pop-name', text: it.label }),
            h('span', { class: 'admin-pop-bar' }, h('span', { class: 'admin-pop-fill', style: { width: pctOf(items, it) + '%' } })),
            h('span', { class: 'admin-pop-count', text: String(it.count) }),
          )))
      : h('p', { class: 'admin-empty-sm', text: empty }),
  );

  const breakdown = (title, items) => h('div', { class: 'admin-pop' },
    h('h3', { text: title }),
    items && items.length
      ? h('div', { class: 'admin-break' }, ...items.map((it) =>
          h('div', { class: 'admin-break-row' },
            h('span', { class: 'admin-break-name', text: String(it.label) }),
            h('div', { class: 'admin-break-bar' }, h('span', { style: { width: pctOf(items, it) + '%' } })),
            h('span', { class: 'admin-break-count', text: String(it.count) }),
          )))
      : h('p', { class: 'admin-empty-sm', text: 'Ingen data ennå.' }),
  );

  return h('section', { class: 'admin-section' },
    h('h2', { text: 'Populært' }),
    h('div', { class: 'admin-grid' },
      list('Sider', stats.popularPages || [], 'Ingen sidevisninger ennå.'),
      list('Fag', stats.popularSubjects || [], 'Ingen fag åpnet ennå.'),
      list('Quizer', stats.popularQuizzes || [], 'Ingen quizer startet ennå.'),
      h('div', { class: 'admin-pop' },
        h('h3', { text: 'Hendelsestyper' }),
        stats.byEventList && stats.byEventList.length
          ? h('div', { class: 'admin-break' }, ...stats.byEventList.map((it) =>
              h('div', { class: 'admin-break-row' },
                h('span', { class: 'admin-break-name', text: String(it.label) }),
                h('div', { class: 'admin-break-bar' }, h('span', { style: { width: pctOf(stats.byEventList, it) + '%' } })),
                h('span', { class: 'admin-break-count', text: String(it.count) }),
              )))
          : h('p', { class: 'admin-empty-sm', text: 'Ingen hendelser ennå.' }),
      ),
      h('div', { class: 'admin-pop' },
        h('h3', { text: 'Quiz-resultater' }),
        stats.quizPerformance && stats.quizPerformance.length
          ? h('ul', { class: 'admin-pop-list' }, ...stats.quizPerformance.map((q) =>
              h('li', {},
                h('span', { class: 'admin-pop-name', text: q.title }),
                h('span', { class: 'admin-pop-bar' }, h('span', { class: 'admin-pop-fill', style: { width: Math.max(2, Math.min(100, q.avgScorePct ?? 0)) + '%' } })),
                h('span', { class: 'admin-pop-count', text: q.attempts + ' forsøk' + (q.completed ? ' · ' + (q.avgScorePct != null ? q.avgScorePct + ' %' : '–') : ' (ikke fullført)') }),
              )))
          : h('p', { class: 'admin-empty-sm', text: 'Ingen fullførte quizer ennå.' }),
      ),
      breakdown('Enheter', stats.deviceCountList),
      breakdown('Nettlesere', stats.browserCountList),
      breakdown('Operativsystem', stats.osCountList),
      breakdown('Skjermstørrelse', stats.screenCountList),
    ),
  );
}

function pctOf(items, it) {
  const max = items.reduce((m, i) => Math.max(m, i.count), 1);
  return Math.max(2, Math.round((it.count / max) * 100));
}

// ---- Utvikling (trend + klokkeslett) ----

function fmtDayLocal(d) {
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function fmtDayShort(yyyymmdd) {
  const [y, m, d] = String(yyyymmdd).split('-');
  return (d || '') + '.' + (m || '');
}

function renderTrend(stats) {
  const days = stats.perDayList || [];
  const hours = stats.hourList || [];
  const maxV = Math.max(1, ...days.map((d) => d.visits));

  const dayChart = days.length
    ? h('div', { class: 'admin-trend-bars' }, ...days.map((d) => {
        const isToday = d.date === fmtDayLocal(new Date());
        return h('div', { class: 'admin-trend-col' + (isToday ? ' is-today' : ''), title: d.date + ' · ' + d.visits + ' visninger' },
          h('div', { class: 'admin-trend-bar-wrap' },
            h('div', { class: 'admin-trend-bar', style: { height: Math.max(3, Math.round((d.visits / maxV) * 100)) + '%' } })),
          h('div', { class: 'admin-trend-label', text: fmtDayShort(d.date) }),
        );
      }))
    : h('p', { class: 'admin-empty-sm', text: 'Ingen sidevisninger ennå.' });

  const hourMax = Math.max(1, ...hours.map((h) => h.visits));
  const hourStrip = hours.length
    ? h('div', { class: 'admin-hour-strip' }, ...hours.map((hh) =>
        h('div', { class: 'admin-hour-col' },
          h('div', { class: 'admin-hour-bar', style: { height: Math.max(3, Math.round((hh.visits / hourMax) * 28)) + 'px' } }),
          h('div', { class: 'admin-hour-label', text: String(hh.hour).padStart(2, '0') }),
        )))
    : null;

  return h('section', { class: 'admin-section' },
    h('div', { class: 'admin-feed-head' },
      h('h2', { text: 'Utvikling' }),
      h('span', { class: 'admin-feed-count', text: (days.length ? 'Siste ' + days.length + ' døgn' : '') + (stats.returningSessions ? ' · ' + stats.returningSessions + ' tilbakevendende' : '') }),
    ),
    h('div', { class: 'card admin-trend-card' },
      h('div', { class: 'admin-trend-title', text: 'Sidevisninger per dag' }),
      dayChart,
      hourStrip ? h('div', { class: 'admin-hour' },
        h('div', { class: 'admin-trend-title', text: 'Populære tidspunkt (klokkeslett, lokal tid)' }),
        hourStrip,
      ) : null,
    ),
  );
}

// ---- Besøkende (IP + geo) ----

// Landkode → flagg-emoji (ISO 3166-1 alpha-2).
function flagEmoji(code) {
  const cc = String(code || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (cc.length !== 2) return '🏳️';
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function geoOf(v) {
  return (v && v.geo) || {};
}

function renderCountryBars(stats) {
  const list = stats.countryList || [];
  const cities = stats.cityList || [];
  if (!list.length) {
    return h('p', { class: 'admin-empty-sm', text: 'Ingen land-data ennå – kommer når besøkende sender hendelser til serveren.' });
  }
  const max = Math.max(...list.map((c) => c.count));
  const bars = h('div', { class: 'admin-break' }, ...list.map((c) =>
    h('div', { class: 'admin-break-row' },
      h('span', { class: 'admin-break-name' }, flagEmoji(c.code) + ' ' + c.label),
      h('div', { class: 'admin-break-bar' }, h('span', { class: 'geo-bar', style: { width: Math.max(4, Math.round((c.count / max) * 100)) + '%' } })),
      h('span', { class: 'admin-break-count', text: String(c.count) }),
    )));
  const cityRows = cities.length
    ? h('div', { class: 'admin-break' }, ...cities.map((c) =>
        h('div', { class: 'admin-break-row' },
          h('span', { class: 'admin-break-name' }, flagEmoji(c.code) + ' ' + c.city),
          h('div', { class: 'admin-break-bar' }, h('span', { style: { width: pctOf(cities, c) + '%' } })),
          h('span', { class: 'admin-break-count', text: String(c.count) }),
        )))
    : null;
  return h('div', { class: 'admin-grid' },
    h('div', { class: 'admin-pop' }, h('h3', { text: 'Land' }), bars),
    cities.length ? h('div', { class: 'admin-pop' }, h('h3', { text: 'Byer' }), cityRows) : null,
  );
}

function renderVisitorRow(v, open) {
  const g = geoOf(v);
  const c = { dv: v.device, br: v.browser, os: v.os, sc: v.screen, ln: v.lang, tz: v.tz };
  const idx = open ? String.fromCodePoint(0x1f53c) : String.fromCodePoint(0x1f53a);

  const flag = g.countryCode
    ? flagEmoji(g.countryCode) + ' ' + (g.city ? g.city + ', ' : '') + (v.geo && v.geo.country ? v.geo.country : g.countryCode)
    : '🏳️ Ukjent';

  return h('div', { class: 'admin-vis-row' + (open ? ' is-open' : ''), onclick: () => { state.vismap = (state.vismap || {}); state.vismap[v.session] = !open; refresh(); } },
    h('div', { class: 'admin-vis-main' },
      h('div', { class: 'admin-vis-flag', text: flag }),
      h('div', { class: 'admin-vis-ip' },
        h('code', { text: v.ip || '–' }),
        v.test ? h('span', { class: 'admin-test-badge', text: 'TEST' }) : null,
      ),
      h('div', { class: 'admin-vis-device', text: [c.dv, c.br, c.os].filter(Boolean).join(' · ') || '–' }),
      h('div', { class: 'admin-vis-meta', text:
        [g.tz || c.tz, c.ln ? 'språk: ' + c.ln : '', c.sc ? 'skjerm ' + c.sc : '']
          .filter(Boolean).join(' · ') || '–' }),
      h('div', { class: 'admin-vis-stats', text: v.events + ' hendelser · ' + v.visits + ' visninger' + (v.errors ? ' · ' + v.errors + ' feil' : '') }),
      h('div', { class: 'admin-vis-seen' },
        h('div', { text: 'første: ' + fmtTime(v.firstSeen) }),
        h('div', { text: 'siste: ' + fmtTime(v.lastSeen) }),
      ),
      h('span', { class: 'admin-vis-chev', text: idx }),
    ),
    open ? renderVisitorDetail(v) : null,
  );
}

function renderVisitorDetail(v) {
  const g = geoOf(v);
  const rows = (label, obj, extra) => h('div', { class: 'admin-detail-group' },
    h('h4', { text: label }),
    h('dl', { class: 'admin-detail-list' }, ...Object.entries(obj).map(([k, val]) =>
      [h('dt', { text: k }), h('dd', { text: val == null || val === '' ? '–' : String(val) })])),
    extra || null,
  );
  return h('div', { class: 'admin-vis-detail' },
    rows('geo', {
      land: g.country ? (flagEmoji(g.countryCode) + ' ' + g.country) : (g.countryCode || '–'),
      region: g.region, by: g.city, breddegrad: g.lat, lengdegrad: g.lon, tidssone: g.tz, metro: g.metro,
    }),
    rows('enhet', {
      enhet: v.device, nettleser: v.browser, operativsystem: v.os, skjerm: v.screen,
      språk: v.lang, tidssone: v.tz,
    }),
    rows('henting', {
      ip: v.ip, økt: v.session, hendelser: v.events, visninger: v.visits, feil: v.errors,
      første_hendelse: new Date(v.firstSeen).toISOString(), siste_hendelse: new Date(v.lastSeen).toISOString(),
      siste_hendelsetype: v.lastEvent, siste_side: v.lastPath || '–',
      aktivt_fag: v.subject || '–', aktiv_quiz: v.quiz || '–', er_test: v.test,
    }),
  );
}

function renderVisitors(stats, visData) {
  const visitors = (visData && visData.visitors) || [];
  const ipMode = (visData && visData.mode === 'server')
    ? ((stats.geoCache && stats.geoCache.ipMode) || 'full')
    : 'lokal';
  const modeNote = visData && visData.mode === 'server'
    ? (ipMode === 'forkortet' ? 'IP-er lagres forkortet (siste oktett maskert).' : 'Full IP lagres – se LEONARDO_ANALYTICS_IP_MODE i serveren.')
    : 'Lokal modus: ingen server-side geo.';

  const head = h('div', { class: 'admin-feed-head' },
    h('h2', {}, 'Besøkende '),
    h('span', { class: 'admin-feed-count', text: String(visitors.length) + ' økter' }),
    h('span', { class: 'admin-vis-mode', text: modeNote }),
  );

  const body = visitors.length
    ? h('div', { class: 'admin-vis-list' }, ...visitors.map((v) => renderVisitorRow(v, !!(state.vismap && state.vismap[v.session]))))
    : h('div', { class: 'admin-empty' },
        h('p', { text: 'Ingen besøkende ennå. Når noen åpner siden, vises de her med land, by, IP og enhet.' }),
      );

  return h('section', { class: 'admin-section' },
    head,
    renderCountryBars(stats),
    body,
  );
}

// ---- Live-logg ----

function renderFeed(events, count) {
  const head = h('div', { class: 'admin-feed-head' },
    h('h2', {}, 'Live-logg '),
    h('span', { class: 'admin-feed-count', text: count ? count + ' treff' : 'Ingen treff' }),
    h('span', { class: 'admin-feed-live', text: state.live ? '● LIVE ' + POLL_MS() / 1000 + ' s' : '⏸ Pauset' }),
  );

  const feedEl = h('div', { class: 'admin-feed' });
  if (!events.length) {
    feedEl.appendChild(h('div', { class: 'admin-empty' },
      h('p', { text: 'Ingen hendelser matcher filtrene. Prøv å lage test-hendelser nedenfor, eller fjern filtre.' }),
    ));
  } else {
    for (const e of events) {
      const open = e.seq === state.detailSeq;
      const row = h('button', { class: 'admin-feed-row' + (open ? ' is-open' : ''), type: 'button', onclick: () => {
        state.detailSeq = open ? 0 : e.seq;
        refresh();
      } },
        h('span', { class: 'admin-feed-time', text: fmtTime(e.ts || e.recv) }),
        h('span', { class: 'admin-event-dot dot-' + styleOf(e.event) }),
        h('span', { class: 'admin-event-name', text: e.event }),
        e.test ? h('span', { class: 'admin-test-badge', text: 'TEST' }) : null,
        e.bot ? h('span', { class: 'admin-bot-badge', text: 'BOT' }) : null,
        e.local ? h('span', { class: 'admin-local-badge', text: 'lokal' }) : null,
        h('span', { class: 'admin-event-sum', text: summarize(e) }),
        h('span', { class: 'admin-event-meta', text: metaOf(e) }),
        h('span', { class: 'admin-event-chev', text: open ? '▾' : '▸' }),
      );
      if (open) {
        row.appendChild(detailBlock(e));
      }
      feedEl.appendChild(row);
    }
  }

  return h('section', { class: 'admin-section' },
    head,
    feedEl,
  );
}

function fmtTime(ts) {
  const d = new Date(ts || Date.now());
  const p = (n) => String(n).padStart(2, '0');
  return `${d.toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit' })} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function summarize(e) {
  const d = e.data || {};
  switch (e.event) {
    case 'PAGE_VIEW': case 'TEST_PAGE_VIEW': return d.path || d.uri || '/';
    case 'APP_LOADED': case 'TEST_EVENT': return d.mode ? 'modus: ' + d.mode : 'oppstart';
    case 'SUBJECT_OPENED': return d.subjectLabel || d.subjectSlug || '';
    case 'QUIZ_STARTED': case 'TEST_QUIZ_STARTED': case 'MATH_STARTED': case 'TEST_MATH_STARTED':
      return (d.quizTitle || '') + (d.difficulty ? ' · ' + d.difficulty : '') + (d.operation ? ' · ' + d.operation : '');
    case 'QUIZ_COMPLETED': case 'TEST_QUIZ_COMPLETED': case 'MATH_COMPLETED': case 'TEST_MATH_COMPLETED':
      return (d.quizTitle || '') + (Number.isFinite(d.score) ? ' · ' + d.score + '/' + d.total : '') + (d.fail ? ' · ' + d.fail + ' feil' : '');
    case 'QUIZ_QUESTION_ANSWERED': case 'TEST_QUIZ_QUESTION_ANSWERED':
    case 'MATH_QUESTION_ANSWERED': case 'TEST_MATH_QUESTION_ANSWERED':
      return (d.quizTitle || '') + (d.country ? ' · ' + d.country : '') + (d.correct ? ' · riktig' : ' · feil');
    case 'ERROR': case 'TEST_ERROR': return d.message || 'feil';
    case 'BUTTON_CLICKED': return d.label || d.href || '';
    default: return '';
  }
}

function metaOf(e) {
  const c = e.ctx || {};
  const parts = [];
  if (c.dv) parts.push(c.dv);
  if (c.os) parts.push(c.os);
  if (c.br) parts.push(c.br);
  const s = e.session ? e.session.slice(0, 8) : '';
  if (s) parts.push('#' + s);
  if (e.severity === 'error' || e.severity === 'warn') parts.push(e.severity);
  return parts.join(' · ');
}

function detailBlock(e) {
  const rows = (label, objOrVal) => {
    const val = typeof objOrVal === 'object' && objOrVal !== null ? objOrVal : { verdi: objOrVal };
    return Object.keys(val).length
      ? h('div', { class: 'admin-detail-group' },
          h('h4', { text: label }),
          h('dl', { class: 'admin-detail-list' },
            ...Object.entries(val).map(([k, v]) => [
              h('dt', { text: String(k) }),
              h('dd', { text: v == null ? '–' : String(v) }),
            ]),
          ),
        )
      : null;
  };

  const head = h('div', { class: 'admin-detail-head' },
    h('code', { text: JSON.stringify({ id: e.id || e.eid, seq: e.seq, event: e.event, ts: e.ts, recv: e.recv, session: e.session, test: !!e.test, severity: e.severity }) }),
  );

  return h('div', { class: 'admin-detail' }, head,
    rows('data', e.data),
    rows('ctx', e.ctx),
  );
}

// ---- Test-hendelser ----

function renderTestPanel() {
  const btn = (name, label, data) => h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => {
    trackEvent(name, data, { test: true });
    refresh();
  }, text: label });

  return h('section', { class: 'admin-section' },
    h('div', { class: 'card admin-test' },
      h('div', {},
        h('h2', { text: 'Send test-hendelser' }),
        h('p', { class: 'admin-empty-sm', style: 'color:var(--ink-2)' }, 'Lager hendelser merket TEST. De vises i loggen med badge, men teller ikke i statistikken.'),
      ),
      h('div', { class: 'admin-test-btns' },
        btn(TEST_NAMES.TEST_PAGE_VIEW, 'Sidevisning', { path: '#/admin' }),
        btn(TEST_NAMES.TEST_QUIZ_STARTED, 'Quiz start', { quizTitle: 'Testquiz', difficulty: 'medium' }),
        btn(TEST_NAMES.TEST_QUIZ_QUESTION_ANSWERED, 'Quiz svar', { quizTitle: 'Testquiz', correct: true, score: 1, total: 5 }),
        btn(TEST_NAMES.TEST_QUIZ_COMPLETED, 'Quiz fullført', { quizTitle: 'Testquiz', score: 4, total: 5 }),
        btn(TEST_NAMES.TEST_MATH_STARTED, 'Matte start', { quizTitle: 'Matteøving', operation: 'mul', difficulty: 'easy' }),
        btn(TEST_NAMES.TEST_MATH_COMPLETED, 'Matte fullført', { quizTitle: 'Matteøving', score: 8, total: 10 }),
        btn(TEST_NAMES.TEST_ERROR, 'Feil (test)', { message: 'Eksempel-feil som feilsøk', auto: true }),
      ),
    ),
  );
}

// ---- Innstillinger ----

function renderSettings() {
  const cfg = getConfig();
  const info = backendInfo();

  const keyInput = h('input', { class: 'text-input', type: 'password', placeholder: 'Admin-nøkkel (tom = ingen)', value: getAdminKey() });
  keyInput.addEventListener('change', () => saveAdminKey(keyInput.value));

  const configInput = h('input', { class: 'text-input', type: 'text', placeholder: '{ "backendUrl": "https://…" }', value: getConfigRaw() });
  configInput.addEventListener('change', () => { saveConfigRaw(configInput.value); location.reload(); });

  return h('section', { class: 'admin-section' },
    h('div', { class: 'card admin-settings' },
      h('h2', { text: 'Innstillinger' }),
      h('div', { class: 'admin-settings-grid' },
        h('label', { class: 'admin-settings-item' },
          h('span', { class: 'admin-settings-label', text: 'Modus' }),
          h('code', { text: info.mode === 'server' ? ('SERVER · ' + (info.base || 'same-opphav')) : 'LOKAL' }),
        ),
        h('label', { class: 'admin-settings-item' },
          h('span', { class: 'admin-settings-label', text: 'Admin-nøkkel (lesning)' }),
          keyInput,
        ),
        h('label', { class: 'admin-settings-item' },
          h('span', { class: 'admin-settings-label', text: 'Overstyr config (backendUrl osv.)' }),
          configInput,
        ),
      ),
      h('p', { class: 'admin-empty-sm', style: 'color:var(--ink-2);margin-top:var(--sp-3)' },
        'Statistikken og besøksoversikten viser KUN ekte besøkende – test- og bot-hendelser er holdt utenfor (se «Kun test»/«Alle» over). Hendelser som ikke leveres til serveren, beholdes i localStorage (tast inn config for å peke mot en server). I server-modus lagres besøkerens IP og grov geo (land/by) – se server-geo.js og LEONARDO_ANALYTICS_IP_MODE. Loggen inneholder aldri navn, e-post eller innloggingsinfo.'),
    ),
  );
}

function getAdminKey() {
  try { return localStorage.getItem(getConfig().adminKeyKey) || ''; } catch { return ''; }
}
function saveAdminKey(v) {
  try { localStorage.setItem(getConfig().adminKeyKey, v || ''); } catch { /* ignorer */ }
}
function getConfigRaw() {
  try { return localStorage.getItem(getConfig().configKey) || ''; } catch { return ''; }
}
function saveConfigRaw(v) {
  try { localStorage.setItem(getConfig().configKey, v || ''); } catch { /* ignorer */ }
}