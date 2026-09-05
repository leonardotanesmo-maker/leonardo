// Leonardo – lettvekt hash-ruter

const routes = [];
let currentCleanup = null;

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart] = raw.split('?');
  const segments = pathPart.split('/').filter((s) => s !== '');
  const query = {};
  if (queryPart) {
    for (const pair of queryPart.split('&')) {
      if (!pair) continue;
      const [k, v] = pair.split('=');
      query[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' '));
    }
  }
  return { segments, path: '/' + segments.join('/'), query };
}

function matchRoute(segments) {
  for (const r of routes) {
    const m = r.match(segments);
    if (m) return { handler: r.handler, params: m };
  }
  return null;
}

export function register(pattern, handler) {
  routes.push({
    pattern,
    match: (segments) => {
      const p = pattern.replace(/^\//, '').split('/').filter((s) => s !== '');
      if (p.length !== segments.length) return null;
      const params = {};
      for (let i = 0; i < p.length; i++) {
        if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(segments[i]);
        else if (p[i] !== segments[i]) return null;
      }
      return params;
    },
    handler,
  });
}

export function currentPath() {
  return parseHash();
}

export function navigate(path) {
  const target = path.startsWith('#') ? path : '#' + path;
  if (location.hash === target) render();
  else location.hash = target;
}

function scrollToTop() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo({ top: 0, behavior: 'auto' });
}

export async function render() {
  const { segments, query } = parseHash();
  const view = document.getElementById('view');
  if (!view) return;

  const match = matchRoute(segments);
  let page;
  if (!match) {
    const { notFound } = await import('./pages/notfound.js');
    page = notFound();
  } else {
    try {
      page = await match.handler({ params: match.params, query, path: '/' + segments.join('/') });
    } catch (err) {
      console.error('Rute-feil:', err);
      const { notFound } = await import('./pages/notfound.js');
      page = notFound('Noe gikk galt under lasting av siden.');
    }
  }

  if (currentCleanup) {
    try { currentCleanup(); } catch { /* ignorer */ }
    currentCleanup = null;
  }

  view.classList.remove('view-enter');
  view.innerHTML = '';
  if (page.element) view.appendChild(page.element);
  void view.offsetWidth; // tving reflow for animasjon
  view.classList.add('view-enter');

  if (page.title) document.title = page.title;
  else document.title = 'Leonardo';
  document.getElementById('view').focus({ preventScroll: true });
  updateNav(document.getElementById('app-header'));
  scrollToTop();

  if (page.mount) {
    currentCleanup = await page.mount();
    if (typeof currentCleanup !== 'function') currentCleanup = null;
  }
}

export function start() {
  window.addEventListener('hashchange', render);
  document.addEventListener('DOMContentLoaded', () => {
    updateNav(document.getElementById('app-header'));
    render();
  });
}

function updateNav(header) {
  if (!header) return;
  const { path } = parseHash();
  const active = path.split('/')[1] || '';
  for (const a of header.querySelectorAll('a[data-nav]')) {
    const key = a.getAttribute('data-nav');
    const { path: p } = parseHash();
    const cur = p.split('/')[1] || '';
    if (key === cur) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}