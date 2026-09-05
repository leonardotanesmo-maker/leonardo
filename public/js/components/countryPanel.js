// Leonardo – panel med utførlig info om et land
import { h, q } from '../dom.js';
import { icon } from '../icons.js';
import { countryByIso2, continentLabelOf, neighborNames } from '../data.js';
import { track } from '../store.js';

let panelEl = null;
let backdrop = null;
let lastFocus = null;
let onCloseCb = null;

function ensureShell() {
  if (panelEl && document.body.contains(panelEl)) return;
  backdrop = h('div', { class: 'page-panel-backdrop', 'aria-hidden': 'true' });
  panelEl = h('aside', { class: 'page-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Landfakta' },
    h('div', { class: 'panel-top' },
      h('div', {},
        h('div', { class: 'panel-title', id: 'panel-title' }),
        h('div', { class: 'panel-sub', id: 'panel-sub' }),
      ),
      h('button', { class: 'panel-close', 'aria-label': 'Lukk panel', type: 'button', html: icon('close', 20) }),
    ),
    h('div', { class: 'panel-body', id: 'panel-body' }),
  );
  backdrop.addEventListener('click', () => closeCountryPanel());
  document.body.appendChild(backdrop);
  document.body.appendChild(panelEl);

  panelEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCountryPanel();
  });
  q('.panel-close', panelEl).addEventListener('click', () => closeCountryPanel());
}

export function openCountryPanel(iso2, opts = {}) {
  const c = countryByIso2(iso2);
  if (!c) return null;
  ensureShell();
  lastFocus = document.activeElement;
  onCloseCb = opts.onClose || null;

  track('country', c.id, c.name);

  const regionName = continentLabelOf(c);
  q('#panel-title', panelEl).textContent = c.name;
  q('#panel-sub', panelEl).textContent = c.official || regionName;

  const body = q('#panel-body', panelEl);
  body.innerHTML = '';

  const rows = [];
  rows.push([icon('pin', 16) + 'Hovedstad', esc(c.capital) || '–']);
  rows.push([icon('users', 16) + 'Befolkning', c.population ? c.population.toLocaleString('nb-NO') + ' innbyggere' : 'Ukjent']);
  rows.push([icon('ruler', 16) + 'Areal', c.area ? c.area.toLocaleString('nb-NO') + ' km²' : '–']);
  rows.push([icon('globe', 16) + 'Verdensdel', regionName]);
  if (c.subregion && c.subregion !== c.region) rows.push([icon('map', 16) + 'Område', c.subregion]);
  if (c.languages && c.languages.length) rows.push([icon('abc', 16) + 'Språk', c.languages.join(', ')]);
  if (c.currencies && c.currencies.length) rows.push([icon('math', 16) + 'Valuta', c.currencies.join(', ')]);

  const facts = h('div', { class: 'panel-facts' }, ...rows.map(([k, v]) =>
    h('div', { class: 'fact' },
      h('div', { class: 'fact-label', html: k }),
      h('div', { class: 'fact-value', text: v }),
    )));

  const neighbors = neighborNames(c.borders);
  const badges = [];
  if (c.unMember) badges.push(span('FN-medlem'));
  if (c.landlocked) badges.push(span('Inneland, uten kyst'));
  if (!c.independent && c.status !== 'officially-assigned') badges.push(span('Territorium/avhengig område'));

  const extras = h('div', { class: 'panel-extra' },
    badges.length ? h('div', { class: 'badge-row' }, ...badges) : null,
    neighbors.length ? h('div', { class: 'panel-block' },
      h('div', { class: 'panel-block-label' }, `Naboland (${neighbors.length})`),
      h('div', { class: 'badge-row' }, ...neighbors.map((n) => span(n.name))),
    ) : null,
    h('div', { class: 'panel-block' },
      h('div', { class: 'panel-block-label' }, 'Hvor ligger landet?'),
      h('p', { class: 'panel-note' }, blurb(c)),
    ),
  );

  body.appendChild(h('img', { class: 'panel-flag', src: c.flagFile || '', alt: 'Flagg for ' + c.name, width: 300, height: 150, loading: 'eager' }));
  body.appendChild(facts);
  body.appendChild(extras);
  body.appendChild(h('button', { class: 'btn btn-soft', type: 'button', html: icon('arrow', 16) + ' Tilbake til kartet', onclick: () => closeCountryPanel() }));

  requestAnimationFrame(() => {
    panelEl.classList.add('is-open');
    backdrop.classList.add('is-open');
  });
  const close = q('.panel-close', panelEl);
  if (close && close.focus) close.focus();
  document.addEventListener('focusin', trapFocus);
  return c;
}

function trapFocus(e) {
  if (panelEl && !panelEl.contains(e.target) && e.target !== backdrop) {
    const close = q('.panel-close', panelEl);
    if (close) close.focus();
  }
}

function span(text) {
  return h('span', { class: 'badge', text });
}

function blurb(c) {
  const regionName = continentLabelOf(c);
  const parts = [c.name];
  if (c.subregion) parts.push('ligger i ' + c.subregion);
  else parts.push('ligger i ' + regionName);
  if (c.capital) parts.push('med hovedstad ' + c.capital);
  if (c.landlocked) parts.push('uten kystlinje');
  return parts.join(', ') + '.';
}

export function closeCountryPanel() {
  if (!panelEl || !document.body.contains(panelEl)) return;
  panelEl.classList.remove('is-open');
  backdrop.classList.remove('is-open');
  document.removeEventListener('focusin', trapFocus);
  if (onCloseCb) { const cb = onCloseCb; onCloseCb = null; cb(); }
  setTimeout(() => {
    if (lastFocus && document.contains(lastFocus) && lastFocus.focus) lastFocus.focus();
  }, 160);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function isPanelOpen() {
  return !!(panelEl && document.body.contains(panelEl) && panelEl.classList.contains('is-open'));
}

// Hent land som paneldata (hjelp for tester)
export function getCountryForPanel(iso2) { return countryByIso2(iso2); }