// Leonardo – interaktivt verdenskart
import { h, q, qa } from '../dom.js';
import { icon } from '../icons.js';
import { countryByNumeric, continentLabelOf } from '../data.js';
import { formatPopulation } from '../../data/countries.js';

let svg = null;
let tooltip = null;
let onSelectCb = null;
let coarse = false;
let highlighted = null;

export function isCoarsePointer() {
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
}

export function mapElement() {
  return h('div', { class: 'map-wrap' },
    h('div', { class: 'map-loading', html: icon('globe', 24) + ' Laster verdenskartet …' }),
    h('div', { class: 'map-tooltip', role: 'tooltip' }),
  );
}

// opts:
//   quiet: true  – viser ingen navne-verktøytips (brukes av «Finn landet på kartet»,
//                  der navnet på hover ville være en ledetråd)
//   ariaLabel: (c) => string – egen aria-label per land
export async function loadMapOn(stage, onSelect, opts = {}) {
  onSelectCb = onSelect;
  coarse = isCoarsePointer();
  try {
    const resp = await fetch('assets/map.svg', { cache: 'no-store' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const text = await resp.text();
    stage.innerHTML = text;
    svg = q('svg#world-map', stage);
    tooltip = q('.map-tooltip', stage);
    if (!tooltip && !opts.quiet) {
      tooltip = h('div', { class: 'map-tooltip', role: 'tooltip' });
      stage.appendChild(tooltip);
    } else if (tooltip && opts.quiet) {
      tooltip.remove();
      tooltip = null;
    }
    bind(opts);
  } catch (err) {
    stage.innerHTML = `<p class="map-loading" role="alert">Kunne ikke laste kartet (${err.message}). Last siden på nytt og prøv igjen.</p>`;
  }
}

function bind(opts = {}) {
  const countries = qa('.country', svg);
  for (const p of countries) {
    p.setAttribute('tabindex', '0');
    p.setAttribute('role', 'button');
    p.addEventListener('pointerenter', onEnter);
    p.addEventListener('pointermove', onMove);
    p.addEventListener('pointerleave', onLeave);
    p.addEventListener('click', onClick);
    p.addEventListener('keydown', onKey);
    const c = countryByNumeric(p.getAttribute('data-numeric'));
    if (c) {
      const label = opts.ariaLabel ? opts.ariaLabel(c) : `${c.name}. Vis informasjon om landet. Enter eller mellomrom for å åpne.`;
      p.setAttribute('aria-label', label);
    }
  }
  svg.addEventListener('touchstart', () => { coarse = true; }, { passive: true });
}

function countryFor(el) {
  return countryByNumeric(el.getAttribute('data-numeric'));
}

function onEnter(e) {
  if (coarse) return;
  const c = countryFor(e.currentTarget);
  if (!c) return;
  highlight(e.currentTarget);
  showTooltip(c, e);
}

function onMove(e) {
  if (!tooltip || !tooltip.classList.contains('is-show')) return;
  moveTooltip(e);
}

function onLeave() {
  unhighlight();
  hideTooltip();
}

function onClick(e) {
  e.preventDefault();
  const el = e.currentTarget;
  const c = countryFor(el);
  if (!c) return;
  if (onSelectCb) onSelectCb(c.id, el);
  else window.location.hash = '#/geografi/' + c.id;
}

function onKey(e) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onClick(e);
  }
}

function highlight(el) {
  unhighlight();
  highlighted = el;
  el.classList.add('is-highlight');
  el.setAttribute('aria-expanded', 'true');
}

function unhighlight() {
  if (highlighted) {
    highlighted.classList.remove('is-highlight');
    highlighted.setAttribute('aria-expanded', 'false');
    highlighted = null;
  }
}

// ---- Verktøytips ----
function showTooltip(c, e) {
  if (!tooltip) return;
  const flag = c.flagFile
    ? `<img class="tt-flag" src="${c.flagFile}" alt="" width="112" height="56" loading="lazy">`
    : `<div class="tt-flag tt-flag-emoji">${c.flag}</div>`;
  tooltip.innerHTML = `
    ${flag}
    <div class="tt-name">${c.name}</div>
    <div class="tt-cap">Hovedstad: ${c.capital || '–'}</div>
    <div class="tt-row"><span>Befolkning</span><b>${formatPopulation(c.population)}</b></div>
    <div class="tt-row"><span>Verdensdel</span><b>${continentLabelOf(c)}</b></div>
  `;
  tooltip.classList.add('is-show');
  moveTooltip(e);
}

function moveTooltip(e) {
  const wrap = tooltip.closest('.map-wrap');
  if (!wrap) return;
  const r = wrap.getBoundingClientRect();
  const pw = tooltip.offsetWidth;
  const ph = tooltip.offsetHeight;

  let x = e.clientX - r.left + 16;
  let y = e.clientY - r.top - ph - 12;
  if (y < 0) y = e.clientY - r.top + 20; // vis under markøren hvis det ikke er plass over
  if (x + pw > r.width - 8) x = e.clientX - r.left - pw - 16;
  if (x < 8) x = 8;
  tooltip.style.left = Math.round(Math.max(0, Math.min(x, r.width - pw - 8))) + 'px';
  tooltip.style.top = Math.round(Math.max(0, y)) + 'px';
}

function hideTooltip() {
  if (tooltip) tooltip.classList.remove('is-show');
}

export function applyRegionFilter(regionKey) {
  if (!svg) return;
  const countries = qa('.country', svg);
  for (const p of countries) {
    const c = countryFor(p);
    if (!c) continue;
    const key = (c.continents && c.continents[0]) || c.region || '';
    const show = regionKey === 'alle' || key === regionKey;
    p.classList.toggle('is-dim', !show);
    p.setAttribute('aria-hidden', show ? 'false' : 'true');
    if (!show && p.classList.contains('is-highlight')) unhighlight();
  }
}

export function highlightCountry(iso2) {
  if (!svg) return;
  const upp = (iso2 || '').toUpperCase();
  for (const p of qa('.country', svg)) {
    const c = countryFor(p);
    if (c && c.id === upp) {
      highlight(p);
      const box = p.getBBox();
      const svgBox = svg.getBoundingClientRect();
      const scale = svgBox.width / svg.viewBox.baseVal.width;
      const cx = (box.x + box.width / 2) * scale + svgBox.left;
      const cy = (box.y + box.height / 2) * scale + svgBox.top;
      const tip = tooltip;
      if (tip) {
        tip.classList.add('is-show');
        tip.innerHTML = `
          ${c.flagFile ? `<img class="tt-flag" src="${c.flagFile}" alt="" width="112" height="56" loading="lazy">` : ''}
          <div class="tt-name">${c.name}</div>
          <div class="tt-cap">Hovedstad: ${c.capital || '–'}</div>
        `;
        const r = svgBox;
        moveTo(cx, cy, tip, r);
      }
      return;
    }
  }
}

function moveTo(x, y, tip, r) {
  const pw = (tip && tip.offsetWidth) || 224;
  let left = x + 14;
  let top = y - 20;
  if (left + pw > r.right) left = x - pw - 14;
  tip.style.left = Math.round(Math.max(8, left - r.left)) + 'px';
  tip.style.top = Math.round(Math.max(8, top - r.top)) + 'px';
}

export function resetMap() {
  hideTooltip();
  unhighlight();
}