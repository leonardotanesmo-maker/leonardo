// Leonardo – automatisk overvåking (feil, klikk, sidevisninger)
//
// Lytter på:
//   – HTMLElementer som feiler (globalThis.onerror / unhandledrejection)
//   – Clicks på knapper og klikkbare elementer (BUTTON_CLICKED)
//   – Hash-navigasjon -> flush event-køen og send PAGE_VIEW for ruten
//
// Automatiske hendelser merkes med data.auto = true slik at de kan skilles
// fra eksplisitt instrumenterte hendelser om nødvendig.

import { trackEvent, EVENT_NAMES, flushNow } from './core.js';

function labelFor(target) {
  if (!target) return '';
  return String(target.getAttribute && (target.getAttribute('aria-label') || target.getAttribute('data-ft') || target.textContent || ''))
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}

function installClickMonitor() {
  document.addEventListener('click', (ev) => {
    const el = ev.target && ev.target.closest ? ev.target.closest('button, [role="button"], a') : null;
    if (!el) return;
    const href = el.tagName === 'A' ? el.getAttribute('href') : '';
    if (href === '#/admin') return; // ikke spor dashbordet som «innholdsbesøk»
    trackEvent(EVENT_NAMES.BUTTON_CLICKED, {
      label: labelFor(el),
      href: href && href !== '#' ? href.split('#')[0].slice(0, 80) : '',
      page: window.location.hash || '/',
      auto: true,
    });
  }, { passive: true });
}

let lastRoute = null;

function trackRouteChange() {
  const route = window.location.hash || '#/';
  if (route === lastRoute) return;
  lastRoute = route;
  trackEvent(EVENT_NAMES.PAGE_VIEW, { path: route, auto: true });
}

function installErrorMonitor() {
  window.addEventListener('error', (ev) => {
    const msg = String(ev.message || 'ukjent feil').slice(0, 200);
    const src = ev.filename ? String(ev.filename).split('/').pop().slice(0, 80) : '';
    trackEvent(EVENT_NAMES.ERROR, {
      message: msg,
      src,
      line: typeof ev.lineno === 'number' ? ev.lineno : 0,
      uri: (window.location.hash || '/').slice(0, 60),
      auto: true,
    });
  });

  window.addEventListener('unhandledrejection', (ev) => {
    let msg = 'ukjent avvisning';
    try { msg = String((ev.reason && ev.reason.message) || ev.reason || 'ukjent').slice(0, 200); } catch { /* ignorer */ }
    trackEvent(EVENT_NAMES.ERROR, { message: msg, uri: (window.location.hash || '/').slice(0, 60), auto: true });
  });
}

export function initMonitor() {
  const cfg = null; // leses fra getConfig i trackEvent
  try {
    installClickMonitor();
    installErrorMonitor();
    trackRouteChange();
  } catch { /* overvåking skal aldri knekke siden */ }
}

// Ekstern trigger: routen endret seg (kalles fra router.js via onRender-hook).
export function onRouteChanged() {
  try {
    flushNow().then(() => trackRouteChange()).catch(() => {});
  } catch {
    trackRouteChange();
  }
}