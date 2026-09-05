// Leonardo – søkeside
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { crumbs, SUBJECT_ICON_COLORS } from '../components.js';
import { search, SUBJECTS } from '../data.js';

function groupLabel(kind) {
  return { subject: 'Fag', quiz: 'Quizer', country: 'Land' }[kind] || 'Treff';
}

export function renderSearch({ query }) {
  const q = (query.q || '').trim();
  const results = q ? search(q) : [];

  const group = (kind) => results.filter((r) => r.kind === kind);

  const renderBlock = (kind) => {
    const items = group(kind);
    if (!items.length) return null;
    return h('div', { class: 'result-block' },
      h('h3', { text: groupLabel(kind) + ' (' + items.length + ')' }),
      ...items.map((item) => {
        let href = '#/';
        let name = item.name;
        let sub = item.sub;
        let flag = null;
        if (item.kind === 'subject') href = '#/fag/' + item.id;
        else if (item.kind === 'quiz') href = '#/quiz/' + item.id;
        else if (item.kind === 'country') {
          href = '#/geografi/' + item.id;
          sub = (item.sub || '') + (item.flag ? '' : '');
        }
        return h('a', { class: 'result-item', href },
          item.flag
            ? h('img', { class: 'ri-flag', src: item.flag, alt: '', width: 80, height: 40, loading: 'lazy' })
            : h('div', { class: 'activity-icon accent-' + (item.accent || 'quiz'), html: icon(item.icon || 'bolt', 18) }),
          h('div', { class: 'ri-main' },
            h('div', { class: 'ri-name', text: name }),
            h('div', { class: 'ri-sub', text: sub }),
          ),
          h('span', { class: 'activity-go', html: icon('arrow', 14) }),
        );
      }),
    );
  };

  const el = h('div', { class: 'container page-pad' },
    crumbs([{ label: 'Hjem', href: '#/' }, { label: 'Søk' }]),
    h('div', { class: 'search-head' },
      h('h1', { text: q ? `Søk: «${q}»` : 'Søk' }),
      h('p', { style: 'color:var(--ink-2);margin-top:var(--sp-2)' }, q
        ? `Fant ${results.length} treff.`
        : 'Skriv inn noe du vil lære om – et fag, en quiz eller et land.'),
    ),
    q ? renderBlock('subject') : null,
    q ? renderBlock('quiz') : null,
    q ? renderBlock('country') : null,
    !q || !results.length
      ? h('div', { class: 'search-empty' },
          h('p', { text: q ? 'Fant ingen treff. Prøv en annen skrivemåte.' : 'Søk etter for eksempel «matematikk», «Paris» eller «plante».' }),
        )
      : null,
    h('div', { class: 'section' },
      h('h2', { text: 'Alle fag' }),
      h('div', { class: 'subject-grid', style: 'margin-top:var(--sp-4)' },
        ...SUBJECTS.map((s) => {
          const color = SUBJECT_ICON_COLORS[s.accent] || '#3a5bd9';
          return h('a', { class: 'card card-hover subject-card', href: '#/fag/' + s.slug },
            h('div', { class: 'subject-top' },
              h('span', { class: 'subject-icon', style: { background: color }, html: icon(s.icon, 24) }),
            ),
            h('h3', { text: s.name }),
            h('p', { text: s.tagline }),
          );
        }),
      ),
    ),
  );

  return { title: 'Søk – Leonardo', element: el };
}