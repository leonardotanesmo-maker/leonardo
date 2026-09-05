// Leonardo – 404 / feilside
import { h } from '../dom.js';
import { icon } from '../icons.js';

export function notFound(msg) {
  const el = h('div', { class: 'container err-page' },
    h('div', { class: 'err-code', text: '404' }),
    h('h1', { text: 'Her er det tomt' }),
    h('p', { text: msg || 'Siden du leter etter finnes ikke, eller har flyttet på seg. Prøv å gå tilbake til startsiden eller finn faget du vil ha.' }),
    h('div', { style: 'display:flex;gap:var(--sp-3);justify-content:center;flex-wrap:wrap' },
      h('a', { class: 'btn btn-primary', href: '#/', html: icon('home', 16) + ' Til startsiden' }),
      h('a', { class: 'btn btn-ghost', href: '#/fag', html: icon('book', 16) + ' Velg fag' }),
    ),
  );
  return { title: 'Siden finnes ikke – Leonardo', element: el };
}