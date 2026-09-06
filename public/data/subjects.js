// Leonardo – fag og aktiviteter
// All data ligger her, ikke spredt i komponentene. Legg til nye fag
// ved å utvide denne listen.

export const SUBJECTS = [
  {
    slug: 'geografi',
    name: 'Geografi',
    accent: 'geografi',
    icon: 'globe',
    tagline: 'Lær land, hovedsteder og flagg.',
    intro:
      'Utforsk verdenskartet, klikk på land og lær deg hovedsteder, befolkning, flagg og verdensdeler. Her blir kartet ditt verktøy.',
    activities: [
      { kind: 'map', id: 'worldmap', title: 'Verdenskartet', desc: 'Klikk på et land for å lære mer om det.' },
      { kind: 'quiz', id: 'finn-pa-kartet' },
      { kind: 'quiz', id: 'hovedsteder-europa' },
      { kind: 'quiz', id: 'hovedsteder-verden' },
      { kind: 'quiz', id: 'flagg-verden' },
      { kind: 'quiz', id: 'verdensdeler' },
    ],
    goals: [
      'Kunne plassere land og verdensdeler på kartet',
      'Kunne hovedstedene til de viktigste landene',
      'Kjenne igjen flagg fra hele verden',
      'Kjenne igjen landformene og finne land på kartet',
      'Forstå forskjellen på kontinent og land',
    ],
  },
  {
    slug: 'matematikk',
    name: 'Matematikk',
    accent: 'matematikk',
    icon: 'math',
    tagline: 'Øv på tall og regning.',
    intro:
      'Velg regneart og vanskelighetsgrad, og få ferske oppgaver hver gang. Øv litt hver dag – det merker du fort.',
    activities: [
      { kind: 'quiz', id: 'matematikk' },
      { kind: 'quiz', id: 'gangetabellen' },
    ],
    goals: [
      'Regne med pluss, minus, ganging og deling',
      'Øve inn gangetabellen fra 2 til 10',
      'Regne raskt og sikkert i hodet',
      'Forstå sammenhengen mellom ganging og gjentatt addisjon',
    ],
  },
  {
    slug: 'norsk',
    name: 'Norsk',
    accent: 'norsk',
    icon: 'book',
    tagline: 'Ord, betydning og rettskriving.',
    intro:
      'Lek med ordene. Her lærer du om synonymer, antonymer, ordklasser og ord som kan bety flere ting.',
    activities: [
      { kind: 'quiz', id: 'ord-og-betydning' },
      { kind: 'quiz', id: 'ordklasser' },
      { kind: 'quiz', id: 'synonymer-antonymer' },
    ],
    goals: [
      'Kunne synonymer og antonymer',
      'Kjenne igjen ord med flere betydninger',
      'Skille substantiv, verb, adjektiv og andre ordklasser',
    ],
  },
  {
    slug: 'engelsk',
    name: 'Engelsk',
    accent: 'engelsk',
    icon: 'abc',
    tagline: 'Øv på engelske grunnord.',
    intro:
      'Mange engelske ord ligner på norske. Øv på de viktigste grunnordene og bli tryggere på engelsk.',
    activities: [
      { kind: 'quiz', id: 'engelsk-grunnord' },
      { kind: 'quiz', id: 'engelske-dyr' },
    ],
    goals: [
      'Kunne vanlige engelske hverdagsord',
      'Kunne dyrenavn på engelsk',
      'Forstå enkle engelske setninger',
      'Bygge vokabular for skole og fritid',
    ],
  },
  {
    slug: 'naturfag',
    name: 'Naturfag',
    accent: 'naturfag',
    icon: 'sprout',
    tagline: 'Oppdag naturen og verdensrommet.',
    intro:
      'Fra planter og dyr til planeter og stjerner. Test kunnskapen din om kroppen, solsystemet og naturen rundt oss.',
    activities: [
      { kind: 'quiz', id: 'planetene' },
      { kind: 'quiz', id: 'solsystemet' },
      { kind: 'quiz', id: 'kroppen' },
    ],
    goals: [
      'Kunne planetene i solsystemet',
      'Forstå jordens plass i verdensrommet',
      'Lære om kroppens organer og hvordan de virker',
      'Se sammenhenger i naturen',
    ],
  },
  {
    slug: 'samfunnsfag',
    name: 'Samfunnsfag',
    accent: 'samfunnsfag',
    icon: 'landmark',
    tagline: 'Lær om Norge, Europa og verden.',
    intro:
      'Hvordan henger verden sammen? Lær deg hovedsteder, land, fylker og kulturer til høyre og til venstre for Norge.',
    activities: [
      { kind: 'quiz', id: 'norge-fakta' },
      { kind: 'quiz', id: 'hovedsteder-europa' },
      { kind: 'quiz', id: 'hovedsteder-verden' },
      { kind: 'map', id: 'worldmap', title: 'Verdenskartet', desc: 'Utforsk land og hovedsteder på kartet.' },
    ],
    goals: [
      'Kunne hovedstedene i Europa',
      'Kjenne til norske fylker, byer og fjell',
      'Kjenne til ulike kulturer og land',
      'Forstå hvor Norge ligger i verden',
    ],
  },
  {
    slug: 'hjernetrim',
    name: 'Hjernetrim',
    accent: 'hjernetrim',
    icon: 'brain',
    tagline: 'Vri hodet og tenk.',
    intro:
      'Akkurat som muskelen blir hjernen sterkere av trening. Her får du gåter som får deg til å tenke.',
    activities: [
      { kind: 'quiz', id: 'gater' },
      { kind: 'quiz', id: 'logiske-gater' },
    ],
    goals: [
      'Trene logisk tenkning',
      'Forstå språklige gåter',
      'Løse oppgaver med kreativitet',
    ],
  },
  {
    slug: 'quiz',
    name: 'Quiz',
    accent: 'quiz',
    icon: 'bolt',
    tagline: 'Alle quizer på ett sted.',
    intro:
      'Samling av alle quizer og øvelser på Leonardo. Finn en du vil prøve, eller ta alle sammen.',
    activities: [
      { kind: 'quiz', id: 'finn-pa-kartet' },
      { kind: 'quiz', id: 'hovedsteder-europa' },
      { kind: 'quiz', id: 'hovedsteder-verden' },
      { kind: 'quiz', id: 'flagg-verden' },
      { kind: 'quiz', id: 'verdensdeler' },
      { kind: 'quiz', id: 'matematikk' },
      { kind: 'quiz', id: 'gangetabellen' },
      { kind: 'quiz', id: 'planetene' },
      { kind: 'quiz', id: 'solsystemet' },
      { kind: 'quiz', id: 'kroppen' },
      { kind: 'quiz', id: 'ord-og-betydning' },
      { kind: 'quiz', id: 'ordklasser' },
      { kind: 'quiz', id: 'synonymer-antonymer' },
      { kind: 'quiz', id: 'engelsk-grunnord' },
      { kind: 'quiz', id: 'engelske-dyr' },
      { kind: 'quiz', id: 'norge-fakta' },
      { kind: 'quiz', id: 'gater' },
      { kind: 'quiz', id: 'logiske-gater' },
    ],
    goals: [
      'Teste kunnskapen din i alle fag',
      'Øve på det du er usikker på',
      'Få resultat og se fremgang',
    ],
  },
];

export const SUBJECT_BY_SLUG = Object.fromEntries(SUBJECTS.map((s) => [s.slug, s]));

export const POPULAR = [
  { kind: 'map', id: 'worldmap' },
  { kind: 'quiz', id: 'matematikk' },
  { kind: 'quiz', id: 'finn-pa-kartet' },
  { kind: 'quiz', id: 'flagg-verden' },
];