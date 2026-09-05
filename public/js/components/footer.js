// Leonardo – footer
import { h } from '../dom.js';
import { SUBJECTS } from '../data.js';

export function mountFooter(host) {
  const footer = h('footer', { class: 'footer-inner' },
    h('div', {},
      h('div', { class: 'brand', style: 'font-size:var(--fs-lg)' },
        h('img', { class: 'brand-mark', src: 'assets/favicon.svg', alt: '', width: 34, height: 34 }),
        h('span', { class: 'brand-name', html: 'Leonardo' }),
      ),
      h('p', { style: 'margin-top:var(--sp-3)' },
        'Leonardo er et norsk læringsverksted med fag, quizer, gåter og et interaktivt verdenskart. Laget av Leonardo selv.'),
      h('p', { style: 'font-size:var(--fs-xs);color:var(--ink-3)' },
        'Født i 2012 · Elev ved Nidaros idretts ungdomsskole i Tiller.'),
    ),
    h('div', {},
      h('h4', { text: 'Fag' }),
      h('ul', {},
        ...SUBJECTS.slice(0, 6).map((s) => h('li', {}, h('a', { href: '#/fag/' + s.slug, text: s.name }))),
        h('li', {}, h('a', { href: '#/fag', text: 'Alle fag' })),
      ),
    ),
    h('div', {},
      h('h4', { text: 'Laget av' }),
      h('ul', {},
        h('li', {}, h('span', { text: 'Leonardo' })),
        h('li', {}, h('span', { text: 'Nidaros idretts ungdomsskole' })),
        h('li', {}, h('span', { text: 'Tiller, Trondheim' })),
      ),
    ),
  );

  const note = h('div', { class: 'footer-note' },
    'Leonardo · Læring, quizer og gåter · Laget for nysgjerrige elever.',
  );

  host.appendChild(footer);
  host.appendChild(note);
}