// Leonardo – forsiden
import { h, clear } from '../dom.js';
import { icon } from '../icons.js';
import { subjectCards, sectionHead, activityCard, SUBJECT_ICON_COLORS } from '../components.js';
import { SUBJECTS, POPULAR } from '../../data/subjects.js';
import { getRecent } from '../store.js';
import { progressSummary } from '../progress.js';
import { loadMapOn } from '../components/map.js';
import { openCountryPanel } from '../components/countryPanel.js';

function progressSection() {
  const s = progressSummary();
  if (!s) return null;

  const stat = (num, label, iconName) =>
    h('div', { class: 'prog-stat' },
      h('div', { class: 'prog-stat-icon', html: icon(iconName, 16) }),
      h('div', { class: 'prog-stat-num', text: String(num) }),
      h('div', { class: 'prog-stat-label', text: label }),
    );

  const bar = (a) => {
    const color = SUBJECT_ICON_COLORS[a.subjectSlug] || '#3a5bd9';
    return h('div', { class: 'prog-bar-row', style: { '--prog-accent': color } },
      h('div', { class: 'prog-bar-head' },
        h('span', { class: 'prog-bar-title', text: a.title }),
        h('span', { class: 'prog-bar-pct', text: a.pct + ' %' }),
      ),
      h('div', { class: 'prog-bar' }, h('span', { class: 'prog-bar-fill', style: { width: a.pct + '%' } })),
    );
  };

  const top = (s.bestItems || []).slice(0, 4);

  return h('div', { class: 'section' },
    sectionHead('Din fremgang', 'All øving lagres trygt på akkurat denne enheten', null),
    h('div', { class: 'card progress-panel' },
      h('div', { class: 'prog-stats' },
        stat(s.played, 'Fullførte øvelser', 'layers'),
        stat(s.subjects, 'Fag du har øvd i', 'book'),
        stat(s.best + ' %', 'Beste resultat', 'trophy'),
        stat(s.avg + ' %', 'Gjennomsnitt', 'trend'),
      ),
      top.length
        ? h('div', { class: 'prog-bars' }, h('div', { class: 'prog-bars-title', text: 'Dine beste øvelser' }), ...top.map(bar))
        : h('p', { class: 'prog-empty', text: 'Fullfør en quiz, så samler vi opp dine beste resultater her.' }),
    ),
  );
}

const mapStage = h('div', { class: 'map-stage hero-map-stage' });
const heroVisual = () => {
  return h('div', { class: 'hero-art', 'aria-hidden': 'false' },
    h('div', { class: 'hero-map-wrap' },
      mapStage,
      h('div', { class: 'hm-label' },
        h('span', { html: icon('map', 13) + ' Interaktivt verdenskart med alle verdens land' }),
        h('a', { href: '#/geografi', text: 'Åpne i fullskjerm →' }),
      ),
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
  const skelCard = () => h('div', { class: 'skel-card', 'aria-hidden': 'true' },
    h('div', { class: 'skel-avatar', html: '' }),
    h('div', { class: 'skel-lines' },
      h('div', { class: 'skel-bar', style: 'width:68%' }),
      h('div', { class: 'skel-bar', style: 'width:42%' }),
    ),
  );
  const popularHost = h('div', { class: 'activity-list is-loading', 'aria-busy': 'true' }, skelCard(), skelCard(), skelCard());
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

      progressSection(),

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

    await loadMapOn(mapStage, (iso2) => openCountryPanel(iso2, { onClose: () => {} }));
    return () => { clear(mapStage); };
  };

  return { title: 'Leonardo – lær, tenk og bli bedre', element: el, mount };
}