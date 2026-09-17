// Leonardo – om-siden
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { crumbs, sectionHead, subjectCards } from '../components.js';
import { SUBJECTS } from '../../data/subjects.js';

export function renderAbout() {
  const el = h('div', { class: 'container page-pad' },
    crumbs([{ label: 'Hjem', href: '#/' }, { label: 'Om Leonardo' }]),
    h('h1', { text: 'Om Leonardo' }),
    h('div', { class: 'about-grid' },
      h('div', {},
        h('p', { text: 'Leonardo ble født i 2012 og går på Nidaros idretts ungdomsskole i Tiller. Dette nettstedet er laget av Leonardo – med fag, quizer, gåter og et interaktivt verdenskart.' }),
        h('p', { text: 'Tanken bak siden er å tilby oppgaver som krever få forberedelser, er lette å forstå, morsomme å bruke og gir god læringseffekt.' }),
        h('p', { text: 'Akkurat som en muskel blir sterkere med trening, blir hjernen skarpere med tenking. Så bøy hjernens «biceps» – tenk, prøv, lær!' }),
      ),
      h('div', {},
        h('div', { class: 'card', style: 'padding:var(--sp-5)' },
          h('h3', { text: 'Laget av Leonardo' }),
          h('ul', { class: 'contact-list' },
            contactItem('sparkles', 'Leonardo – født i 2012', null),
            contactItem('book', 'Nidaros idretts ungdomsskole', null),
            contactItem('pin', 'Tiller, Trondheim', null),
          ),
        ),
        h('div', { class: 'card', style: 'padding:var(--sp-5);margin-top:var(--sp-4)' },
          h('h3', { text: 'Kilder og data' }),
          h('p', { text: 'Siden bruker åpne, pålitelige datakilder for innholdet i kartet og quizene:' }),
          h('ul', { class: 'contact-list' },
            h('li', { text: 'Befolkningstall: Verdensbanken' }),
            h('li', { text: 'Landfakta: mledoze/countries (CC0)' }),
            h('li', { text: 'Kartgeometri: Natural Earth via world-atlas' }),
            h('li', { text: 'Flagg: flagcdn.com' }),
          ),
        ),
      ),
    ),
    h('div', { class: 'section' },
      sectionHead('Fagene på Leonardo', 'Velg noe du vil lære', '#/fag', 'Alle fag'),
      h('div', { class: 'subject-grid' }, ...subjectCards(SUBJECTS)),
    ),
    h('div', { class: 'section' },
      sectionHead('Personvern', 'Hvordan Leonardo behandler data'),
      h('div', { class: 'card', style: 'padding:var(--sp-5)' },
        h('p', { text: 'Leonardo samler ikke inn navn, e-postadresser, telefonnumre, passord, hjemmeadresser, GPS-posisjoner eller innloggingsinfo.' }),
        h('p', { style: 'margin-top:var(--sp-3)' }, 'Når siden kjøres fra en Leonardo-server, kan den lagre hendelser (hvilke quizer som spilles, et tilfeldig øktnummer, enhetskategorier, IP-adresse og grovt land/by) for å se hvordan siden brukes – synlig i admin-dashbordet (#/admin). Ingen data brukes til reklame, og besøker-IP kan maskeres på serveren (LEONARDO_ANALYTICS_IP_MODE). Hendelsene knyttes ikke til navn eller e-post.'),
        h('p', { style: 'margin-top:var(--sp-3)' }, 'Åpner du siden som en ren statisk side (GitHub Pages) uten tilkoblet server, skjer all lagring kun i nettleseren din (localStorage) på din egen enhet.'),
      ),
    ),
  );

  return { title: 'Om Leonardo', element: el };
}

function contactItem(iconName, value, href) {
  return h('li', {},
    h('span', { style: 'color:var(--primary);display:inline-flex', html: icon(iconName, 16) }),
    href ? h('a', { href, text: value }) : h('span', { text: value }),
  );
}