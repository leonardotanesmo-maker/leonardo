// Leonardo – enkelt fag
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { pageHead, crumbs, activityCard, fact } from '../components.js';
import { SUBJECT_BY_SLUG } from '../../data/subjects.js';
import { QUIZ_BY_ID, quizzesForSubject } from '../../data/quizzes.js';
import { track } from '../store.js';
import { SUBJECT_ICON_COLORS } from '../components.js';

export function renderSubject({ params }) {
  const slug = params.slug;
  const s = SUBJECT_BY_SLUG[slug] || null;
  if (!s) {
    return {
      title: 'Fag ikke funnet – Leonardo',
      element: h('div', { class: 'container page-pad' },
        h('p', { text: 'Dette faget finnes ikke.' }),
        h('a', { class: 'btn btn-primary', href: '#/fag', text: 'Se alle fag' }),
      ),
    };
  }

  track('subject', s.slug, s.name);
  const color = SUBJECT_ICON_COLORS[s.accent] || '#3a5bd9';
  const quizzes = quizzesForSubject(slug);
  const activities = s.activities;

  const el = h('div', { class: 'container page-pad' },
    crumbs([{ label: 'Hjem', href: '#/' }, { label: 'Fag', href: '#/fag' }, { label: s.name }]),
    pageHead({
      icon: s.icon,
      iconClass: s.accent,
      title: s.name,
      lede: s.intro,
      actions: [
        h('a', { class: 'btn btn-primary', href: '#/quiz/' + (quizzes.length ? quizzes[0].id : ''), html: icon('bolt', 16) + ' Prøv en øvelse' }),
      ],
    }),

    h('section', { class: 'section', 'aria-label': 'Aktiviteter i ' + s.name },
      h('div', { class: 'section-head' },
        h('h2', { text: 'Aktiviteter' }),
        h('span', { class: 'section-sub', text: `${activities.length} stk · klare når du vil` }),
      ),
      h('div', { class: 'activity-list' }, ...activities.map((a) => activityCard(a, (id) => QUIZ_BY_ID[id] || null))),
    ),

    h('section', { class: 'section', 'aria-label': 'Læringsmål' },
      h('div', { class: 'section-head' },
        h('h2', { text: 'Læringsmål' }),
        h('span', { class: 'section-sub', text: 'Det du øver på i dette faget' }),
      ),
      h('div', { class: 'card', style: 'padding:var(--sp-5)' },
        h('ul', { class: 'check-list' }, ...s.goals.map((g) => h('li', {}, h('span', { class: 'ck', html: icon('check', 15) }), h('span', { text: g })))),
      ),
    ),

    h('section', { class: 'section', 'aria-label': 'Rask fakta' },
      h('div', { class: 'section-head' }, h('h2', { text: 'Rask fakta' })),
      h('div', { class: 'fact-grid' },
        fact('Antall aktiviteter', String(activities.length), 'layers'),
        fact('Antall quizer', String(quizzes.length), 'bolt'),
        fact('Fagområde', 'Skolefag', 'book'),
        fact('Nivå', 'Barneskole / ungdomsskole', 'users'),
      ),
    ),
  );

  return { title: s.name + ' – Leonardo', element: el };
}