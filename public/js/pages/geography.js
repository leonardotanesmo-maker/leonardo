// Leonardo – geografisiden med interaktivt verdenskart
import { h, q, qa, clear } from '../dom.js';
import { icon } from '../icons.js';
import { pageHead, crumbs } from '../components.js';
import { COUNTRIES, countryByNumeric } from '../data.js';
import { loadMapOn, isCoarsePointer } from '../components/map.js';
import { openCountryPanel } from '../components/countryPanel.js';
import { formatPopulation } from '../../data/countries.js';

const REGIONS = [
  { key: 'alle', label: 'Alle' },
  { key: 'Europe', label: 'Europa' },
  { key: 'Africa', label: 'Afrika' },
  { key: 'Asia', label: 'Asia' },
  { key: 'North America', label: 'Nord-Amerika' },
  { key: 'South America', label: 'Sør-Amerika' },
  { key: 'Oceania', label: 'Oseania' },
];

const HAY_BY_NUMERIC = {};
for (const c of COUNTRIES) {
  HAY_BY_NUMERIC[c.ccn3] = (c.name + ' ' + (c.official || '') + ' ' + (c.capital || '') + ' ' + c.search)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function nf(s) { return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }

export function renderGeography({ params }) {
  const iso2Param = (params.iso2 || '').toUpperCase();
  let currentRegion = 'alle';
  let term = '';

  const stage = h('div', { class: 'map-stage' });
  const mapWrap = h('div', { class: 'map-wrap' }, stage);

  const searchField = h('div', { class: 'field' },
    h('span', { class: 'field-icon', html: icon('search', 16) }),
    h('input', {
      type: 'search',
      placeholder: 'Søk etter land eller hovedstad …',
      'aria-label': 'Søk etter land eller hovedstad',
      autocomplete: 'off',
    }),
  );

  const resultCount = h('span', { class: 'map-count-txt' });

  const chipsRow = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filtrer etter verdensdel' },
    ...REGIONS.map((r, i) =>
      h('button', { class: 'chip' + (i === 0 ? ' is-active' : ''), type: 'button', text: r.label, 'data-key': r.key,
        onclick: (e) => selectRegion(String(e.currentTarget.getAttribute('data-key'))) }),
    ),
  );

  const listBox = h('div', { class: 'country-list-wrap' });

  const el = h('div', { class: 'container page-pad' },
    crumbs([{ label: 'Hjem', href: '#/' }, { label: 'Fag', href: '#/fag' }, { label: 'Geografi' }]),
    pageHead({
      icon: 'globe',
      iconClass: 'geografi',
      title: 'Geografi – verdenskartet',
      lede: 'Lær deg land, hovedsteder og flagg. Se fakta om hvert land, og klikk for å lære mer om befolkning, språk og naboland.',
    }),

    h('div', { class: 'map-toolbar' },
      searchField,
      h('div', { class: 'map-tools-side' },
        resultCount,
        h('button', { class: 'btn btn-ghost', type: 'button', html: icon('sparkles', 15) + ' Tilfeldig land', onclick: () => openRandom() }),
      ),
    ),
    chipsRow,
    mapWrap,
    h('div', { class: 'map-foot' },
      h('span', { class: 'map-legend-hint', html: '<span class="map-hint-key"></span> ' + (isCoarsePointer()
        ? 'trykk på et land for å se informasjon om det'
        : 'flytt musen over et land for å se informasjon om det') }),
      h('span', { class: 'map-data-note', text: 'Kart: Natural Earth · Data: Verdensbanken, mledoze/countries' }),
    ),

    h('div', { class: 'map-countries' },
      h('div', { class: 'section-head' },
        h('h2', { text: 'Alle land' }),
        h('span', { class: 'section-sub' }),
      ),
      listBox,
    ),
  );

  function handleSelect(iso2) {
    openCountryPanel(iso2, { onClose: () => {} });
  }

  function regionKeyOfCountry(c) {
    const sub = c.subregion || '';
    if ((c.continents && c.continents[0] === 'Americas') || c.region === 'Americas') {
      return sub === 'South America' ? 'South America' : 'North America';
    }
    return (c.continents && c.continents[0]) || c.region || '';
  }

  function selectRegion(key) {
    currentRegion = key;
    for (const chip of qa('.chip', chipsRow)) {
      chip.classList.toggle('is-active', chip.getAttribute('data-key') === key);
    }
    apply();
  }

  function apply() {
    refreshMapFilters();
    renderList();
  }

  function refreshMapFilters() {
    const svgEl = q('svg#world-map', stage);
    if (!svgEl) return;
    for (const p of qa('.country', svgEl)) {
      const c = countryByNumeric(p.getAttribute('data-numeric'));
      if (!c) continue;
      const inRegion = currentRegion === 'alle' || regionKeyOfCountry(c) === currentRegion;
      const hay = HAY_BY_NUMERIC[c.ccn3] || '';
      const matchesTerm = !term || hay.includes(term);
      const show = inRegion && matchesTerm;
      p.classList.toggle('is-dim', !show);
      p.setAttribute('aria-hidden', show ? 'false' : 'true');
    }
  }

  function renderList() {
    clear(listBox);
    const regionKey = currentRegion;
    const list = COUNTRIES
      .filter((c) => regionKey === 'alle' || regionKeyOfCountry(c) === regionKey)
      .filter((c) => {
        if (!term) return true;
        return (HAY_BY_NUMERIC[c.ccn3] || '').includes(term);
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    resultCount.textContent = `${list.length} av ${COUNTRIES.length} land`;

    if (!list.length) {
      listBox.appendChild(h('p', { class: 'map-empty', text: 'Fant ingen land på dette filteret. Prøv en annen verdensdel eller fjern søket.' }));
      return;
    }

    const grid = h('div', { class: 'country-list' }, ...list.map((c) =>
      h('button', { class: 'country-row', type: 'button', onclick: () => handleSelect(c.id) },
        c.flagFile
          ? h('img', { class: 'cr-flag', src: c.flagFile, alt: '', width: 92, height: 46, loading: 'lazy' })
          : h('span', { class: 'cr-flag cr-flag-emoji', text: c.flag }),
        h('span', { class: 'cr-main' },
          h('span', { class: 'cr-name', text: c.name }),
          h('span', { class: 'cr-cap', text: (c.capital ? c.capital + ' · ' : '') + formatPopulation(c.population) }),
        ),
      ),
    ));
    listBox.appendChild(grid);
  }

  function openRandom() {
    const valid = COUNTRIES.filter((c) => c.flagFile && c.population > 0);
    const pick = valid[Math.floor(Math.random() * valid.length)];
    if (pick) handleSelect(pick.id);
  }

  q('input', searchField).addEventListener('input', () => {
    term = nf(q('input', searchField).value);
    apply();
  });

  const mount = async () => {
    await loadMapOn(stage, handleSelect);
    apply();
    if (iso2Param) handleSelect(iso2Param);
    return () => {
      const svgEl = q('svg#world-map', stage);
      if (svgEl) svgEl.remove();
    };
  };

  return { title: 'Geografi – Leonardo', element: el, mount };
}