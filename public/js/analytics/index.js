// Leonardo – offentlig API for analyse/logg-modulen
//
// Importeres én gang fra main.js. Setter opp backend-søk, global
// overvåking og leverer hendelser. Eksponerer også et lite debug-vindu
// på window.__LEONARDO_ANALYTICS__.

import { getConfig, resetConfigCache } from './config.js';
import { trackEvent, EVENT_NAMES, TEST_NAMES, mode, backendInfo, resolveBackend, flushNow, getSessionId } from './core.js';
import { initMonitor, onRouteChanged } from './monitor.js';

export { trackEvent, EVENT_NAMES, TEST_NAMES, mode, backendInfo, onRouteChanged, getSessionId };

let started = false;
let retryTimer = null;

export function initAnalytics() {
  if (started) return;
  started = true;

  const cfg = getConfig();
  if (!cfg.enabled) {
    // Avslått via config: oppfør deg som en vanlig statisk side.
    exposeDebug();
    return;
  }

  // Finn backend (same-opphav eller konfigurert backendUrl). Dette er
  // raskt og skjer uten å blokkere første sidevisning.
  resolveBackend().then((b) => {
    // APP_LOADED sendes når vi vet modusen (server eller lokal).
    trackEvent(EVENT_NAMES.APP_LOADED, { mode: mode(), ttl: new Date().toISOString(), auto: true });
    if (!b && !retryTimer) {
      // Kjører du server.js i utvikling etter at siden ble lastet?
      // Prøv én gang til om 8 sekunder for å finne den.
      retryTimer = setTimeout(() => {
        retryTimer = null;
        resolveBackend().then(() => {
          if (mode() === 'server') {
            trackEvent(EVENT_NAMES.APP_LOADED, { mode: 'server', auto: true });
          }
        }).catch(() => {});
      }, 8000);
    }
  }).catch(() => {});

  initMonitor();

  // Sørg for å tømme køen før siden lukkes/navigerer.
  const onHide = () => { try { flushNow(); } catch { /* ignorer */ } };
  window.addEventListener('pagehide', onHide);
  window.addEventListener('beforeunload', onHide);

  exposeDebug();
}

function exposeDebug() {
  try {
    window.__LEONARDO_ANALYTICS__ = {
      track: (event, data) => trackEvent(event, data),
      mode,
      backendInfo,
      getSessionId,
      EVENT_NAMES,
      flushNow,
    };
  } catch { /* ikke i Node/test-miljø */ }
}

// Kan kalles på nytt hvis localStorage-config endres (brukes av dashbordet).
export function reconfigureAnalytics() {
  resetConfigCache();
  started = false;
  initAnalytics();
}