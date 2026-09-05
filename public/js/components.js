// Leonardo – gjenbrukbare UI-komponenter

import { h } from './dom.js';
import { icon } from './icons.js';
import { SUBJECTS } from './data.js';

export const SUBJECT_ICON_COLORS = {
  geografi: '#3a5bd9',
  matematikk: '#b3522e',
  norsk: '#8a4fc0',
  engelsk: '#0f8a8a',
  naturfag: '#2e8b57',
  samfunnsfag: '#b8860b',
  hjernetrim: '#c05586',
  quiz: '#3b6eeb',
};

export function subjectCards(list = SUBJECTS) {
  return list.map((s) => subjectCard(s));
}

export function subjectCard(s) {
  const color = SUBJECT_ICON_COLORS[s.accent] || '#3a5bd9';
  return h('a', {
    class: 'card card-hover subject-card',
    href: '#/fag/' + s.slug,
    style: { '--subject-accent': color },
  },
    h('div', { class: 'subject-top' },
      h('span', { class: 'subject-icon', style: { background: color }, html: icon(s.icon, 24) }),
      h('span', { class: 'subject-count', html: icon('layers', 14) + ' ' + s.activities.length + ' aktiviteter' }),
    ),
    h('h3', { text: s.name }),
    h('p', { text: s.tagline }),
  );
}

export function activityCard(act, quizById) {
  let title = act.title;
  let desc = act.desc || '';
  let href = '#';
  let iconName = 'play';
  let accent = 'quiz';

  if (act.kind === 'quiz') {
    const q = quizById ? quizById(act.id) : null;
    title = q ? q.title : (act.title || 'Aktivitet');
    desc = q ? q.description : '';
    iconName = q ? q.icon || 'bolt' : 'bolt';
    href = '#/quiz/' + act.id;
  } else if (act.kind === 'map') {
    title = act.title || 'Verdenskartet';
    desc = act.desc || 'Utforsk land og lær deg geografi.';
    iconName = 'map';
    href = '#/geografi';
    accent = 'geografi';
  }

  return h('a', { class: 'card card-hover activity-card', href },
    h('div', { class: 'activity-icon accent-' + (accent || 'quiz'), html: icon(iconName, 20) }),
    h('div', { class: 'activity-body' },
      h('h4', { text: title }),
      h('div', { class: 'activity-meta', text: act.kind === 'map' ? 'Kart · Selvstendig utforsking' : 'Quiz · Kort øvelse' }),
      desc ? h('div', { class: 'activity-desc', text: desc }) : null,
    ),
    h('span', { class: 'activity-go', html: 'Start' + icon('arrow', 15) }),
  );
}

export function crumbs(items) {
  return h('nav', { class: 'crumbs', 'aria-label': 'Brødsmulesti' }, ...flatten(items.map((it, i) => {
    const nodes = [];
    if (i > 0) nodes.push(h('span', { class: 'sep', text: '/' }));
    if (it.href) nodes.push(h('a', { href: it.href, text: it.label }));
    else nodes.push(h('span', { 'aria-current': 'page', text: it.label }));
    return nodes;
  })));
}

function flatten(arr) {
  return arr.reduce((acc, x) => acc.concat(Array.isArray(x) ? x : [x]), []);
}

export function sectionHead(title, sub, linkHref, linkLabel) {
  return h('div', { class: 'section-head' },
    h('h2', { text: title }),
    sub ? h('span', { class: 'section-sub', text: sub }) : null,
    linkHref ? h('a', { class: 'section-link', href: linkHref, text: linkLabel || 'Se alt' }) : null,
  );
}

export function fact(label, value, iconName) {
  return h('div', { class: 'fact' },
    h('div', { class: 'fact-label', html: (iconName ? icon(iconName, 14) + ' ' : '') + label }),
    h('div', { class: 'fact-value', html: value != null ? String(value) : '–' }),
  );
}

export function pageHead({ icon: iconName, iconClass, title, lede, actions = [] }) {
  return h('div', { class: 'page-head' },
    h('div', { class: 'page-icon accent-' + (iconClass || 'quiz'), html: icon(iconName, 28) }),
    h('div', { class: 'page-title-box' },
      h('h1', { text: title }),
      lede ? h('p', { class: 'page-lede', text: lede }) : null,
    ),
    actions.length ? h('div', { class: 'page-actions' }, ...actions) : null,
  );
}