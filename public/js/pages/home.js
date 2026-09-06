// Leonardo – forsiden
import { h, clear } from '../dom.js';
import { icon } from '../icons.js';
import { subjectCards, sectionHead, activityCard } from '../components.js';
import { SUBJECTS, POPULAR } from '../../data/subjects.js';
import { getRecent } from '../store.js';

function heroVisual() {
  return h('div', { class: 'hero-mini-map', 'aria-hidden': 'true' },
    h('svg', { viewBox: '0 0 480 300', role: 'presentation' },
      h('defs', { html: `<linearGradient id="hm-ocean" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#dfe9fb"/><stop offset="1" stop-color="#c3d6f4"/>
        </linearGradient>` }),
      h('circle', { cx: '240', cy: '150', r: '138', fill: 'url(#hm-ocean)' }),
      h('rect', { x: '238', y: '12', width: '4', height: '276', fill: 'rgba(255,255,255,.85)' }),
      h('rect', { x: '102', y: '148', width: '276', height: '4', fill: 'rgba(255,255,255,.85)' }),
      h('ellipse', { cx: '240', cy: '150', rx: '138', ry: '44', fill: 'none', stroke: 'rgba(255,255,255,.7)', 'stroke-width': '2' }),
      h('ellipse', { cx: '240', cy: '150', rx: '44', ry: '138', fill: 'none', stroke: 'rgba(255,255,255,.7)', 'stroke-width': '2' }),
      h('path', { d: 'M118 96c30-34 92-30 118 6-38 4-64 34-62 70-42-10-62-46-56-76z', fill: '#9dbcdf' }),
      h('path', { d: 'M262 216c40 8 86-8 96-44 20 34 6 78-34 92-28-8-52-28-62-48z', fill: '#9dbcdf' }),
      h('path', { d: 'M96 214c22-18 56-12 68 6-18 20-48 26-68 8z', fill: '#9dbcdf' }),
      h('circle', { cx: '162', cy: '188', r: '6', fill: '#3a5bd9', stroke: '#fff', 'stroke-width': '2' }),
      h('circle', { cx: '320', cy: '104', r: '6', fill: '#3a5bd9', stroke: '#fff', 'stroke-width': '2' }),
    ),
    h('div', { class: 'hm-label' },
      h('span', { html: icon('map', 13) + ' Interaktivt verdenskart med alle verdens land' }),
      h('a', { href: '#/geografi', text: 'Utforsk →' }),
    ),
  );
}

function step(num, iconHtml, title, text) {
  return h('div', { class: 'step' },
    h('div', { class: 'step-num', text: String(num) }),
    h('h3', { html: iconHtml + ' ' + title }),
    h('p', { text }),
  );
}

function recentCountryCard(c, cc) {
  return h('a', { class: 'card card-hover activity-card', href: '#/geografi/' + c.id },
    cc && cc.flagFile
      ? h('img', { class: 'cr-flag', src: cc.flagFile, alt: '', width: 46, height: 23 })
      : h('div', { class: 'activity-icon accent-geografi', html: icon('pin', 20) }),
    h('div', { class: 'activity-body' },
      h('h4', { text: c.name }),
      h('div', { class: 'activity-meta', text: 'Utforsk landet på kartet' }),
    ),
    h('span', { class: 'activity-go', html: 'Åpne kartet' + icon('arrow', 15) }),
  );
}

export function renderHome() {
  const recent = getRecent();

  // Disse fylles i mount(), etter at de tunge land-/quizdataene har lastet.
  // Da maler forsiden seg nesten med en gang, og skolen får raskere side.
  const popularHost = h('div', { class: 'activity-list is-loading' });
  const recentHost = h('div', { class: 'activity-list' });

  const recentActivity = recent.length
    ? h('div', { class: 'section' },
        sectionHead('Siste aktivitet', 'Du var i gang med dette', null),
        recentHost,
      )
    : null;

  const spotlight = h('div', { class: 'spot-banner' },
    h('div', {},
      h('span', { class: 'badge badge-accent', html: icon('map', 12) + ' Geografi' }),
      h('h2', { style: 'margin-top:var(--sp-3)', text: 'Lær verdens land med kartet' }),
      h('p', { text: 'Flytt musen over et land og se fakta med en gang. Klikk for å lære mer om hovedstad, befolkning, flagg og naboland. Det enkleste kartet å lære geografi fra.' }),
      h('div', { style: 'display:flex;gap:var(--sp-3);flex-wrap:wrap;margin-top:var(--sp-4)' },
        h('a', { class: 'btn btn-lg', href: '#/geografi', html: icon('map', 18) + ' Åpne kartet' }),
        h('a', { class: 'btn btn-lg', style: 'background:transparent;color:#fff;border:1px solid rgba(255,255,255,.5)', href: '#/quiz/flagg-verden', html: icon('flag', 18) + ' Flaggquiz' }),
      ),
    ),
  );

  const el = h('div', {},
    h('div', { class: 'container' },
      h('div', { class: 'hero' },
        h('div', { class: 'hero-inner' },
          h('div', {},
            h('span', { class: 'eyebrow', html: icon('sparkles', 13) + ' Norsk læringsverksted for skolen' }),
            h('h1', { html: 'Lær, tenk og <span class="grad-text">bli bedre</span>' }),
            h('p', { class: 'hero-sub', text: 'Leonardo er læringsoppgaver, quizer og gåter for elever og nysgjerrige. Velg et fag, prøv en quiz eller utforsk verdenskartet.' }),
            h('div', { class: 'hero-actions' },
              h('a', { class: 'btn btn-primary btn-lg', href: '#/fag', html: icon('book', 18) + ' Velg fag' }),
              h('a', { class: 'btn btn-ghost btn-lg', href: '#/geografi', html: icon('globe', 18) + ' Utforsk kartet' }),
            ),
          ),
          heroVisual(),
        ),
      ),

      h('div', { class: 'section' },
        sectionHead('Velg fag', 'Alt du trenger til skolen og hjernetrim', '#/fag', 'Alle fag'),
        h('div', { class: 'subject-grid' }, ...subjectCards(SUBJECTS)),
      ),

      spotlight,

      h('div', { class: 'section' },
        sectionHead('Populært på Leonardo', 'Oppgavene mange starter med', '#/fag/quiz', 'Alle quizer'),
        popularHost,
      ),

      recentActivity,

      h('div', { class: 'section' },
        sectionHead('Slik fungerer det', 'Tre enkle steg', null),
        h('div', { class: 'steps' },
          step(1, icon('book', 18), 'Velg et fag', 'Fra geografi til matematikk – velg det du vil lære.'),
          step(2, icon('bolt', 18), 'Løs oppgaver', 'Svar på quizer, løs gåter og utforsk kartet.'),
          step(3, icon('check', 18), 'Se at det hjelper', 'Prøv igjen og følg med på at det svarer bedre for hver gang.'),
        ),
      ),
    ),
  );

  const mount = async () => {
    const { quizById, countryByIso2 } = await import('../data.js');

    const popular = POPULAR.map((p) => activityCard(p.kind === 'map' ? p : { kind: 'quiz', id: p.id }, quizById));
    clear(popularHost);
    for (const card of popular) popularHost.appendChild(card);

    if (recent.length) {
      const cards = recent.map((r) => {
        if (r.kind === 'country') return recentCountryCard(r, countryByIso2(r.id));
        if (r.kind === 'quiz') return activityCard({ kind: 'quiz', id: r.id }, quizById);
        if (r.kind === 'subject') {
          return h('a', { class: 'card card-hover activity-card', href: '#/fag/' + r.id },
            h('div', { class: 'activity-icon accent-quiz', html: icon('book', 20) }),
            h('div', { class: 'activity-body' },
              h('h4', { text: r.name }),
              h('div', { class: 'activity-meta', text: 'Fag' }),
            ),
            h('span', { class: 'activity-go', html: 'Åpne' + icon('arrow', 15) }),
          );
        }
        return null;
      }).filter(Boolean);
      clear(recentHost);
      for (const card of cards) recentHost.appendChild(card);
    }

    return () => {};
  };

  return { title: 'Leonardo – lær, tenk og bli bedre', element: el, mount };
}