// Leonardo – personvern- og informasjonskapsel-side (#/personvern)
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { crumbs } from '../components.js';
import { consentValue, setConsent } from '../components/consent.js';

export function renderPrivacy() {
  const state = consentValue();
  const granted = state === 'granted';

  const choiceRow = h('div', { class: 'card privacy-choice', style: 'padding:var(--sp-5)' },
    h('div', { class: 'privacy-choice-row' },
      h('div', { style: 'font-weight:800;margin-bottom:var(--sp-2)' }, 'Ditt valg akkurat nå'),
      h('p', { style: 'color:var(--ink-2);max-width:52ch' }, granted
        ? 'Du har godtatt at resultatene dine lagres i klassestatistikken på enheten som kjører Leonardo-serveren.'
        : 'Du har valgt å kun bruke nødvendige informasjonskapsler. Resultatene dine blir bare lagret lokalt på hele enheten din.'),
    ),
    h('div', { class: 'consent-actions', style: 'justify-content:flex-start' },
      h('button', { class: 'btn btn-primary btn-sm', type: 'button', text: granted ? 'Trekk tilbake samtykke' : 'Godta alle informasjonskapsler',
        onclick: () => { setConsent(granted ? 'essential' : 'granted'); location.reload(); } }),
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: granted ? 'Kun nødvendige' : 'Trekk tilbake',
        onclick: () => { setConsent('essential'); location.reload(); } }),
    ),
  );

  const el = h('div', { class: 'container page-pad' },
    crumbs([{ label: 'Hjem', href: '#/' }, { label: 'Personvern' }]),
    h('h1', { text: 'Personvern og informasjonskapsler' }),
    h('div', { class: 'about-grid' },
      h('div', {},
        h('div', { class: 'card', style: 'padding:var(--sp-5)' },
          h('h3', { text: 'Hva vi samler inn' }),
          h('p', { text: 'Leonardo samler ikke inn navn, e-postadresser, telefonnumre, passord, hjemmeadresser, GPS-posisjoner eller kredittkort. Du trenger ikke lage bruker eller logge inn.' }),
          h('p', { style: 'margin-top:var(--sp-3)' }, 'Når siden kjøres fra en Leonardo-server, kan den lagre hendelser om hvordan siden brukes: hvilke quizer som spilles, poengsummer, et tilfeldig øktnummer, enhetskategori, IP-adresse (kan maskeres) og et grovt sted. Dette vises i admin-dashbordet og brukes til å se progresjon i klassen. Ingen data brukes til reklame, og ingenting knyttes til navn eller e-post.'),
          h('p', { style: 'margin-top:var(--sp-3)' }, 'For duellene videresender serveren kun det duell-hendelse ber om: hvem du er (vert eller gjest), duellkoden og selve spillemeldingene. Vi hoster duell-tjenesten selv – den bruker ingen eksterne tjenester.'),
        ),
        h('div', { class: 'card', style: 'padding:var(--sp-5);margin-top:var(--sp-4)' },
          h('h3', { text: 'Hvilke informasjonskapsler bruker vi?' }),
          h('ul', { class: 'contact-list privacy-cookies' },
            h('li', {},
              h('strong', { text: 'leo_samtykke' }), ' – din egen for å huske valget ditt (1 år). Nødvendig.'),
            h('li', {},
              h('strong', { text: 'leo_duel' }), ' – øktidentifikatoren din under en duell (1 måned). Nødvendig og funksjonell.'),
            h('li', {},
              h('strong', { text: 'Lokale analyser (localStorage)' }), ' – hvis du ikke godtar samtykke, skjer all statistikk bare her, på selve enheten din.'),
            h('li', {},
              h('strong', { text: 'Lagret statistikk' }), ' – hvis du godtar, lagres resultatene dine i klassestatistikken på serveren, uten navn.'),
          ),
        ),
        h('div', { class: 'card', style: 'padding:var(--sp-5);margin-top:var(--sp-4)' },
          h('h3', { text: 'Om "lokalt nett" og duell' }),
          h('p', { text: 'Dueller fungerer best når begge spillere er koblet til samme server (for eksempel samme skole-WiFi eller hjemmenett). Da bruker vi en innebygd WebSocket-tjeneste – hele duellen går gjennom den serveren dere allerede er koblet til, og vi trenger ingen eksterne tjenester. Det gjør at duellen virker også selv om skolenetverket stenger for direkte enhet-til-enhet-koblinger.' }),
          h('p', { style: 'margin-top:var(--sp-3)' }, 'Når siden ligger på en statisk host uten server (for eksempel GitHub Pages), kobler duellen seg i stedet til en liten Leonardo-relé-server (samme type innebygde tjeneste, hostet av oss). Da virker duellen både på samme nett og på tvers av nett, uansett hvilket nett spillerne er på.' ),
          h('p', { style: 'margin-top:var(--sp-3)' }, 'Hvis ingen server er tilgjengelig i det hele tatt, prøver Leonardo å koble spillerne direkte (WebRTC). Da kan offentlige hjelpe-tjenester (STUN) og en åpen TURN-formidler bli brukt for å finne hverandre; selve duellinnholdet er bare quiz-svar og poeng, ingenting personlig.'),
        ),
      ),
      h('div', {},
        choiceRow,
        h('div', { class: 'card', style: 'padding:var(--sp-5);margin-top:var(--sp-4)' },
          h('h3', { html: icon('book', 18) + ' Lover og regler' }),
          h('ul', { class: 'contact-list' },
            h('li', { text: 'Folkeopplysning, ikke personundersøkelse: ingen data brukes til kommersielle formål.' }),
            h('li', { text: 'Lav alder er i fokus – derfor ingen kontoer, ingen passord og ingen annonser.' }),
            h('li', { text: 'Du kan når som helst trekke tilbake samtykket på denne siden.' }),
          ),
        ),
        h('div', { class: 'card', style: 'padding:var(--sp-5);margin-top:var(--sp-4)' },
          h('h3', { text: 'Slett data' }),
          h('p', { text: 'For å slette lokale data (quizresultater, statistikk, valg): tøm nettleserens data for dette nettstedet eller bruk innstillingene til admin-dashbordet. Serverlagret statistikk kan settes opp til å slettes automatisk av læreren din.' }),
        ),
      ),
    ),
  );

  return { title: 'Personvern – Leonardo', element: el };
}