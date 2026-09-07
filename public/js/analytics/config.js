// Leonardo – konfigurasjon for analyse/logg-modulen
//
// Endre standardverdier her, eller overstyr KUN på enheten din via
// localStorage-nøkkelen «leonardo:analytics:config» (JSON):
//   {"enabled":true,"backendUrl":"https://din-vertserver/api"}
//
// `backendUrl` brukes til å peke den statiske siden (GitHub Pages) mot en
// kjørende instans av server.js – da samles hendelser fra ekte besøkende.
// Hvis backendUrl er tom, prøver modulen samme-opphav (/api/health)
// automatisk, ellers havner den i LOKAL-modus (kun denne enheten).
export const ANALYTICS_CONFIG_DEFAULTS = {
  enabled: true,
  backendUrl: '',
  pollIntervalMs: 4000,
  maxLocalEvents: 400,
  captureClicks: true,
  captureErrors: true,
  sessionKey: 'leonardo:analytics:session',
  localEventsKey: 'leonardo:analytics:events',
  configKey: 'leonardo:analytics:config',
  adminKeyKey: 'leonardo:analytics:adminkey',
};

let cached = null;

export function getConfig() {
  if (cached) return cached;
  let override = {};
  try {
    const raw = localStorage.getItem(ANALYTICS_CONFIG_DEFAULTS.configKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') override = parsed;
    }
  } catch { /* privat modus etc. */ }
  cached = { ...ANALYTICS_CONFIG_DEFAULTS, ...override };
  return cached;
}

export function resetConfigCache() {
  cached = null;
}