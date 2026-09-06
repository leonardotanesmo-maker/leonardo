// Leonardo – header med navigasjon og søk
import { h, q, clear } from '../dom.js';
import { icon } from '../icons.js';

let searchModule = null;

async function getSearch() {
  // Søkeindeksen trenger all land- og quizdata (tung). Hentes først når
  // eleven faktisk begynner å skrive – så forsiden lastes raskt og lett.
  if (!searchModule) searchModule = await import('../data.js');
  return searchModule.search;
}

export function mountHeader(host) {
  const navItems = [
    { key: '', label: 'Hjem', href: '#/' },
    { key: 'fag', label: 'Fag', href: '#/fag' },
    { key: 'geografi', label: 'Geografi', href: '#/geografi' },
    { key: 'quiz', label: 'Quiz', href: '#/fag/quiz' },
    { key: 'duell', label: 'Duell', href: '#/duell' },
    { key: 'om', label: 'Om', href: '#/om' },
  ];

  const navLinks = navItems.map((n) =>
    h('a', { href: n.href, 'data-nav': n.key, text: n.label }),
  );

  const searchInput = h('input', {
    type: 'search',
    placeholder: 'Søk etter fag eller land',
    'aria-label': 'Søk på Leonardo',
    autocomplete: 'off',
  });

  const dropdown = h('div', { class: 'search-dropdown', role: 'listbox', 'aria-label': 'Søketreff' });

  const searchWrap = h('div', { class: 'header-search' },
    h('div', { class: 'search-input-wrap' },
      h('span', { class: 'icon', html: icon('search', 16) }),
      searchInput,
    ),
    dropdown,
  );

  // Forbedret søk: åpne dropdown ved input
  async function runSearch() {
    const term = searchInput.value.trim();
    clear(dropdown);
    if (!term) { dropdown.classList.remove('is-open'); return; }
    const search = await getSearch();
    const res = search(term, 7);
    if (!res.length) {
      dropdown.appendChild(h('div', { class: 's-empty', text: 'Ingen treff' }));
    } else {
      for (const r of res) {
        const href = r.kind === 'subject' ? '#/fag/' + r.id
          : r.kind === 'quiz' ? '#/quiz/' + r.id
          : '#/geografi/' + r.id;
        const sub = r.kind === 'country' ? 'Land · klikk for å se fakta' : r.sub;
        dropdown.appendChild(h('a', { class: 's-item', role: 'option', href, 'data-nav': '' },
          h('span', { class: 's-main' },
            h('div', { class: 's-label', text: r.name }),
            h('div', { class: 's-sub', text: sub }),
          ),
          h('span', { style: 'margin-left:auto;color:var(--primary);display:inline-flex', html: icon('arrow', 14) }),
        ));
      }
      dropdown.appendChild(h('a', { class: 's-more', href: '#/sok?q=' + encodeURIComponent(term), text: 'Vis alle treff' }));
    }
    dropdown.classList.add('is-open');
  }

  searchInput.addEventListener('input', () => {
    runSearch();
  });
  searchInput.addEventListener('focus', () => {
    if (searchInput.value) runSearch();
  });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const term = searchInput.value.trim();
      if (term) window.location.hash = '#/sok?q=' + encodeURIComponent(term);
      dropdown.classList.remove('is-open');
    }
    if (e.key === 'Escape') {
      dropdown.classList.remove('is-open');
    }
  });
  document.addEventListener('click', (e) => {
    if (!searchWrap.contains(e.target)) dropdown.classList.remove('is-open');
  });

  const burger = h('button', { class: 'icon-btn menu-btn', type: 'button', 'aria-label': 'Åpne meny', 'aria-expanded': 'false', 'aria-controls': 'mobile-nav', html: icon('menu', 20) });

  const mobileNav = h('nav', { class: 'mobile-nav', id: 'mobile-nav', 'aria-label': 'Mobilnavigasjon' },
    ...navItems.map((n) => h('a', { href: n.href, 'data-nav': n.key, text: n.label })),
  );

  const header = h('header', { class: 'header-inner' },
    h('a', { class: 'brand', href: '#/' },
      h('img', { class: 'brand-mark', src: 'assets/favicon.svg', alt: '', width: 34, height: 34 }),
      h('span', { class: 'brand-name', html: 'Leonardo' }),
    ),
    h('nav', { class: 'main-nav', 'aria-label': 'Hovednavigasjon' }, ...navLinks),
    h('div', { class: 'header-tools' },
      searchWrap,
      burger,
    ),
  );

  burger.addEventListener('click', () => {
    const open = mobileNav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
    burger.innerHTML = icon(open ? 'close' : 'menu', 20);
  });

  host.appendChild(header);
  host.appendChild(mobileNav);
}