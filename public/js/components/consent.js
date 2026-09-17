// Leonardo – samtykke til informasjonskapsler (GDPR-lignende, skolevennlig).
//
// Siden setter i praksis bare to typer informasjonskapsler:
//   1. Nødvendige/funksjonelle: leo_duel (økten din under duell), leo_samtykke
//      (din egen for å huske valget), og de lokale statistikk-innen lagring.
//      Disse virker uten ekstra samtykke.
//   2. Frivillige: hvis du godtar, lagres dine resultater i klassens
//      statistikk på serveren (sekvenserte, uten navn), slik at læreren din og
//      du kan se progresjon. Uten samtykke skjer all statistikk kun lokalt på
//      enheten din.
//
// Valget lagres i en informasjonskapsel (1 år) slik at det huskes, og
// styres fra nederkant av siden / #/personvern.

const KEY = 'leo_samtykke';

export function consentValue() {
  const c = document.cookie.split('; ').find((p) => p.startsWith(KEY + '='));
  if (c) return c.split('=')[1];
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function analyticsAllowed() {
  return consentValue() === 'granted';
}

export function setConsent(v) {
  const val = v === 'granted' ? 'granted' : 'essential';
  const year = 60 * 60 * 24 * 365;
  try {
    document.cookie = `${KEY}=${val}; Path=/; SameSite=Lax; Max-Age=${year}`;
  } catch { /* ignorer */ }
  try { localStorage.setItem(KEY, val); } catch { /* ignorer */ }
  window.__LEONARDO_TRACK__ = analyticsAllowed();
}

/** Banners som vises én gang på underside av skjermen. */
export function mountConsent(host = document.body) {
  if (host.querySelector('.consent-banner') || consentValue()) return;

  const banner = document.createElement('div');
  banner.className = 'consent-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-labelledby', 'consent-title');

  const text = document.createElement('div');
  text.className = 'consent-text';
  text.innerHTML =
    '<strong id="consent-title">Informasjonskapsler</strong>' +
    '<span>Leonardo bruker informasjonskapsler til duell-økten din og (frivillig) til klassestatistikken. ' +
    'Uten samtykke blir alt bare lagret på din enhet. <a href="#/personvern">Les mer</a>.</span>';

  const actions = document.createElement('div');
  actions.className = 'consent-actions';

  const ok = document.createElement('button');
  ok.className = 'btn btn-primary btn-sm';
  ok.type = 'button';
  ok.textContent = 'Ja takk – lagre resultatene';
  ok.addEventListener('click', () => { setConsent('granted'); trigger(); });

  const no = document.createElement('button');
  no.className = 'btn btn-ghost btn-sm';
  no.type = 'button';
  no.textContent = 'Kun nødvendige informasjonskapsler';
  no.addEventListener('click', () => { setConsent('essential'); trigger(); });

  actions.append(ok, no);
  banner.append(text, actions);
  host.appendChild(banner);

  // liten forsinkelse så siden først tegnes, deretter glider banneret inn
  requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('is-visible')));

  function trigger() {
    banner.classList.remove('is-visible');
    setTimeout(() => banner.remove(), 400);
    try { window.dispatchEvent(new CustomEvent('leonardo:consent')); } catch { /* ignorer */ }
  }
}