// Leonardo – grov enhets-/kontekst-kategorisering
//
// Kun GROVE kategorier samles inn (lesbar etikett, bredde-bøtte osv.).
// Ingen fingeravtrykk, ingen koordinater, ingen innloggingsinfo.

function detectDevice(ua, width, height, maxTouchPoints, isCoarse) {
  const isMobileUA = /Mobi|Android/i.test(ua);
  const narrow = Math.min(width, height) < 768 && (maxTouchPoints > 0 || isCoarse);
  if (narrow || isMobileUA) return 'Mobil';
  return 'Datamaskin';
}

function detectBrowser(ua) {
  const u = ua.toLowerCase();
  if (/edg\//.test(u)) return 'Edge';
  if (/opr\/|opera/.test(u)) return 'Opera';
  if (/samsungbrowser/.test(u)) return 'Samsung Internet';
  if (/chrome|crios/.test(u)) return 'Chrome';
  if (/firefox|fxios/.test(u)) return 'Firefox';
  if (/safari|iphone|ipad|macintosh/.test(u) && !/chrom/i.test(u)) return 'Safari';
  return 'Annen nettleser';
}

function detectOS(ua, platform) {
  const u = (ua + ' ' + platform).toLowerCase();
  if (/windows|win32|win64/.test(u)) return 'Windows';
  if (/mac os|macintosh|macppc/.test(u)) return 'macOS';
  if (/crios/.test(ua.toLowerCase())) return 'iOS';
  if (/iphone|ipad|ipod|ios/.test(u)) return 'iOS';
  if (/android/.test(u)) return 'Android';
  if (/linux|ubuntu|fedora|debian/.test(u)) return 'Linux';
  return 'Annet OS';
}

function screenBucket(width) {
  if (width < 480) return 'XS (<480)';
  if (width < 768) return 'S (480–767)';
  if (width < 1024) return 'M (768–1023)';
  if (width < 1440) return 'L (1024–1439)';
  return 'XL (≥1440)';
}

function referrerDomain() {
  try {
    const ref = document.referrer;
    if (!ref) return 'direkte';
    return new URL(ref).hostname.replace(/^www\./, '') || 'direkte';
  } catch {
    return 'direkte';
  }
}

function detectLanguage() {
  try {
    const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]).filter(Boolean);
    return langs.slice(0, 2).join(', ') || 'ukjent';
  } catch {
    return 'ukjent';
  }
}

function detectTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const off = -new Date().getTimezoneOffset() / 60;
    const offStr = (off >= 0 ? '+' : '−') + String(Math.abs(off)).padStart(2, '0') + ':00';
    return tz ? (tz + ' (' + offStr + ')') : offStr;
  } catch {
    return '';
  }
}

export function getContext() {
  const w = window;
  const width = w.innerWidth || w.screen && w.screen.width || 0;
  const height = w.innerHeight || w.screen && w.screen.height || 0;
  const ua = w.navigator ? w.navigator.userAgent || '' : '';
  const platform = w.navigator ? w.navigator.platform || '' : '';
  const maxTouch = w.navigator ? w.navigator.maxTouchPoints || 0 : 0;
  const coarse = w.matchMedia && w.matchMedia('(pointer: coarse)').matches;

  return {
    dv: detectDevice(ua, width, height, maxTouch, coarse),
    br: detectBrowser(ua),
    os: detectOS(ua, platform),
    sc: screenBucket(width),
    ref: referrerDomain(),
    ln: detectLanguage(),
    tz: detectTimezone(),
  };
}