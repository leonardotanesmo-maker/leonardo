// Leonardo – oversikt over alle fag
import { h } from '../dom.js';
import { subjectCards, pageHead, crumbs } from '../components.js';
import { SUBJECTS } from '../data.js';

export function renderSubjects() {
  const el = h('div', { class: 'container page-pad' },
    crumbs([{ label: 'Hjem', href: '#/' }, { label: 'Fag' }]),
    pageHead({
      icon: 'layers',
      iconClass: 'quiz',
      title: 'Alle fag',
      lede: 'Velg et fag og kom i gang. Hvert fag har quizer og øvelser du kan ta når du vil.',
    }),
    h('div', { class: 'subject-grid' }, ...subjectCards(SUBJECTS)),
  );
  return { title: 'Fag – Leonardo', element: el };
}