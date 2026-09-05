// Leonardo – quizer og øvelser
// All quiz-innhold ligger her i strukturert form. Gi hvert spørsmål
// en forklaring som vises etter svar.
//
// typer:
//   choice – velg blant alternativer
//   flag   – "hvilket land har dette flagget?", genereres fra landdata
//   drill  – innskrivingsoppgave (gangetabellen)

export const QUIZZES = [
  {
    id: 'hovedsteder-europa',
    subject: 'geografi',
    title: 'Hovedsteder i Europa',
    description: 'Hvor godt kan du hovedstedene i Europa?',
    icon: 'pin',
    type: 'choice',
    questions: [
      { q: 'Hva er hovedstaden i Frankrike?', options: ['Paris', 'Lyon', 'Marseille', 'Nice'], answer: 0, explanation: 'Paris er hovedstaden i Frankrike.' },
      { q: 'Hva er hovedstaden i Tyskland?', options: ['Hamburg', 'München', 'Berlin', 'Frankfurt'], answer: 2, explanation: 'Berlin er Tysklands hovedstad.' },
      { q: 'Hva er hovedstaden i Italia?', options: ['Milano', 'Roma', 'Napoli', 'Venezia'], answer: 1, explanation: 'Roma er Italias hovedstad.' },
      { q: 'Hva er hovedstaden i Spania?', options: ['Barcelona', 'Valencia', 'Madrid', 'Sevilla'], answer: 2, explanation: 'Madrid er Spanias hovedstad.' },
      { q: 'Hva er hovedstaden i Storbritannia?', options: ['Manchester', 'London', 'Liverpool', 'Birmingham'], answer: 1, explanation: 'London er hovedstaden i Storbritannia.' },
      { q: 'Hva er hovedstaden i Norge?', options: ['Bergen', 'Trondheim', 'Oslo', 'Stavanger'], answer: 2, explanation: 'Oslo er Norges hovedstad.' },
      { q: 'Hva er hovedstaden i Sverige?', options: ['Göteborg', 'Stockholm', 'Malmö', 'Uppsala'], answer: 1, explanation: 'Stockholm er Sveriges hovedstad.' },
      { q: 'Hva er hovedstaden i Danmark?', options: ['Aarhus', 'Odense', 'København', 'Aalborg'], answer: 2, explanation: 'København er Danmarks hovedstad.' },
      { q: 'Hva er hovedstaden i Portugal?', options: ['Porto', 'Lisboa', 'Faro', 'Braga'], answer: 1, explanation: 'Lisboa er Portugals hovedstad.' },
      { q: 'Hva er hovedstaden i Østerrike?', options: ['Salzburg', 'Wien', 'Innsbruck', 'Graz'], answer: 1, explanation: 'Wien er Østerrikes hovedstad.' },
      { q: 'Hva er hovedstaden i Polen?', options: ['Kraków', 'Gdańsk', 'Warszawa', 'Łódź'], answer: 2, explanation: 'Warszawa er Polens hovedstad.' },
      { q: 'Hva er hovedstaden i Hellas?', options: ['Thessaloniki', 'Athen', 'Patras', 'Heraklion'], answer: 1, explanation: 'Athen er Hellas hovedstad.' },
      { q: 'Hva er hovedstaden i Nederland?', options: ['Rotterdam', 'Haag', 'Amsterdam', 'Utrecht'], answer: 2, explanation: 'Amsterdam er Nederlands hovedstad.' },
      { q: 'Hva er hovedstaden i Sveits?', options: ['Zürich', 'Genève', 'Bern', 'Basel'], answer: 2, explanation: 'Bern er hovedstaden i Sveits.' },
    ],
  },
  {
    id: 'hovedsteder-verden',
    subject: 'geografi',
    title: 'Hovedsteder i verden',
    description: 'Test hovedstedene i verdens store land.',
    icon: 'compass',
    type: 'choice',
    questions: [
      { q: 'Hva er hovedstaden i USA?', options: ['New York', 'Washington, D.C.', 'Los Angeles', 'Chicago'], answer: 1, explanation: 'Washington, D.C. er hovedstaden i USA.' },
      { q: 'Hva er hovedstaden i Brasil?', options: ['Rio de Janeiro', 'São Paulo', 'Brasília', 'Salvador'], answer: 2, explanation: 'Brasília er Brasils hovedstad.' },
      { q: 'Hva er hovedstaden i India?', options: ['Mumbai', 'New Delhi', 'Kolkata', 'Chennai'], answer: 1, explanation: 'New Delhi er Indias hovedstad.' },
      { q: 'Hva er hovedstaden i Kina?', options: ['Shanghai', 'Guangzhou', 'Beijing', 'Shenzhen'], answer: 2, explanation: 'Beijing er Kinas hovedstad.' },
      { q: 'Hva er hovedstaden i Japan?', options: ['Osaka', 'Tokyo', 'Kyoto', 'Hiroshima'], answer: 1, explanation: 'Tokyo er Japans hovedstad.' },
      { q: 'Hva er hovedstaden i Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], answer: 2, explanation: 'Canberra er Australias hovedstad.' },
      { q: 'Hva er hovedstaden i Canada?', options: ['Toronto', 'Ottawa', 'Vancouver', 'Montréal'], answer: 1, explanation: 'Ottawa er Canadas hovedstad.' },
      { q: 'Hva er hovedstaden i Egypt?', options: ['Alexandria', 'Giza', 'Kairo', 'Aswan'], answer: 2, explanation: 'Kairo er Egypts hovedstad.' },
      { q: 'Hva er hovedstaden i Mexico?', options: ['Guadalajara', 'Monterrey', 'Mexico by', 'Puebla'], answer: 2, explanation: 'Mexico by er Mexicos hovedstad.' },
      { q: 'Hva er hovedstaden i New Zealand?', options: ['Auckland', 'Wellington', 'Christchurch', 'Hamilton'], answer: 1, explanation: 'Wellington er New Zealands hovedstad.' },
      { q: 'Hva er hovedstaden i Kenya?', options: ['Mombasa', 'Kisumu', 'Nairobi', 'Nakuru'], answer: 2, explanation: 'Nairobi er Kenyas hovedstad.' },
      { q: 'Hva er hovedstaden i Argentina?', options: ['Córdoba', 'Rosario', 'Mendoza', 'Buenos Aires'], answer: 3, explanation: 'Buenos Aires er Argentinas hovedstad.' },
    ],
  },
  {
    id: 'flagg-verden',
    subject: 'geografi',
    title: 'Flagg fra hele verden',
    description: 'Kjenner du igjen flaggene? "Hvilket land har dette flagget?"',
    icon: 'flag',
    type: 'flag',
    min: 3,
    count: 10,
  },
  {
    id: 'gangetabellen',
    subject: 'matematikk',
    title: 'Gangetabellen',
    description: 'Øvgang i gangetabellen fra 2 til 10. Skriv svaret ditt.',
    icon: 'math',
    type: 'drill',
    tables: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    count: 10,
  },
  {
    id: 'planetene',
    subject: 'naturfag',
    title: 'Planetene i solsystemet',
    description: 'Hvor godt kjenner du verdensrommet?',
    icon: 'globe',
    type: 'choice',
    questions: [
      { q: 'Hvilken planet er nærmest sola?', options: ['Venus', 'Merkur', 'Jorden', 'Mars'], answer: 1, explanation: 'Merkur er innerst i solsystemet.' },
      { q: 'Hvilken planet kalles «den røde planeten»?', options: ['Jupiter', 'Venus', 'Mars', 'Saturn'], answer: 2, explanation: 'Mars har rødlig farge på grunn av jernoksid i støvet.' },
      { q: 'Hvilken planet er størst i solsystemet?', options: ['Saturn', 'Neptun', 'Jupiter', 'Uranus'], answer: 2, explanation: 'Jupiter er den største planeten.' },
      { q: 'Hvilken planet har de mest kjente ringene?', options: ['Saturn', 'Jupiter', 'Mars', 'Neptun'], answer: 0, explanation: 'Saturn har store og lyse ringer av is og stein.' },
      { q: 'Hvor mange planeter er det i solsystemet?', options: ['9', '10', '7', '8'], answer: 3, explanation: 'Det er åtte planeter i solsystemet vårt.' },
      { q: 'Hvilken planet er lengst fra sola?', options: ['Neptun', 'Uranus', 'Saturn', 'Pluto'], answer: 0, explanation: 'Neptun er den ytterste av planetene.' },
      { q: 'Venus kalles også «morgenstjernen» og …', options: ['kveldsstjernen', 'midnattssolen', 'nordstjernen', 'regnbuesjernen'], answer: 0, explanation: 'Venus kan skinne klart både om morgenen og om kvelden.' },
      { q: 'Jorden bruker omtrent ett år på å …', options: ['rotere rundt seg selv', 'gå rundt sola', 'gå rundt månen', 'skimre på himmelen'], answer: 1, explanation: 'Et år er tiden jorden bruker rundt sola.' },
    ],
  },
  {
    id: 'ord-og-betydning',
    subject: 'norsk',
    title: 'Ord og betydning',
    description: 'Synonymer, antonymer og ordklasser – kan du ordene dine?',
    icon: 'book',
    type: 'choice',
    questions: [
      { q: 'Hva kaller vi ord som betyr det samme, for eksempel «glad» og «lykkelig»?', options: ['Antonymer', 'Synonymer', 'Homonymer', 'Anagrammer'], answer: 1, explanation: 'Synonymer er ord med samme eller nesten samme betydning.' },
      { q: 'Hva kaller vi ord med motsatt betydning, som «stor» og «liten»?', options: ['Antonymer', 'Synonymer', 'Homonymer', 'Adverber'], answer: 0, explanation: 'Antonymer er ord med motsatt betydning.' },
      { q: 'Hvilket ord kan bety både en sittebenk utendørs og et sted du oppbevarer penger?', options: ['Bord', 'Benk', 'Bank', 'Stue'], answer: 2, explanation: '«Bank» kan være en benk i parken eller et pengeinstitutt.' },
      { q: 'Hva er flertallsformen av «bok»?', options: ['Bokser', 'Bøker', 'Boker', 'Bøkerne'], answer: 1, explanation: 'Én bok, flere bøker.' },
      { q: 'Hvilket av ordene er et substantiv (navneord)?', options: ['Løper', 'Rask', 'Sol', 'Under'], answer: 2, explanation: '«Sol» er et navneord – det er navnet på en ting.' },
      { q: 'Hvilket av ordene er et verb (gjerningsord)?', options: ['Bok', 'Løper', 'Grønn', 'For'], answer: 1, explanation: '«Løper» beskriver en handling.' },
      { q: 'Hvilket ord er et antonym (motsatt ord) for «varm»?', options: ['Lun', 'Kald', 'Våt', 'Mørk'], answer: 1, explanation: 'Det motsatte av varm er kald.' },
      { q: 'Hva kaller vi ordet som beskriver det noen gjør, for eksempel «synger»?', options: ['Verb', 'Navneord', 'Preposisjon', 'Stikkord'], answer: 0, explanation: 'Verb viser handling – å synge, å løpe, å tenke.' },
    ],
  },
  {
    id: 'engelsk-grunnord',
    subject: 'engelsk',
    title: 'Engelske grunnord',
    description: 'Noen av de viktigste engelske ordene, fram og tilbake til norsk.',
    icon: 'abc',
    type: 'choice',
    questions: [
      { q: 'Hva betyr «book» på norsk?', options: ['skole', 'bok', 'penn', 'papir'], answer: 1, explanation: '«Book» betyr bok.' },
      { q: 'Hva betyr «dog» på norsk?', options: ['katt', 'fugl', 'hund', 'fisk'], answer: 2, explanation: '«Dog» betyr hund.' },
      { q: 'Hva er «katt» på engelsk?', options: ['cat', 'dog', 'cow', 'bird'], answer: 0, explanation: '«Katt» er «cat» på engelsk.' },
      { q: 'Hva betyr «blue» på norsk?', options: ['grønn', 'gul', 'blå', 'rød'], answer: 2, explanation: '«Blue» betyr blå.' },
      { q: 'Hva er «skole» på engelsk?', options: ['school', 'church', 'shop', 'street'], answer: 0, explanation: '«Skole» er «school» på engelsk.' },
      { q: 'Hva betyr «morning» på norsk?', options: ['kveld', 'natt', 'middag', 'morgen'], answer: 3, explanation: '«Morning» betyr morgen.' },
      { q: 'Hva er «venn» på engelsk?', options: ['family', 'friend', 'neighbour', 'teacher'], answer: 1, explanation: '«Venn» er «friend» på engelsk.' },
      { q: 'Hva betyr «good night» på norsk?', options: ['god morgen', 'god kveld', 'god natt', 'ha det'], answer: 2, explanation: '«Good night» betyr god natt.' },
    ],
  },
  {
    id: 'gater',
    subject: 'hjernetrim',
    title: 'Klassiske gåter',
    description: 'Vri hodet. Klarer du alle gåtene?',
    icon: 'brain',
    type: 'choice',
    questions: [
      { q: 'Hva blir våtere jo mer det tørker?', options: ['Paraplyen', 'Håndkleet', 'Vinduet', 'Skoene'], answer: 1, explanation: 'Håndkleet tørker deg – og blir selv vått av å tørke.' },
      { q: 'Hva går opp og ned hele tiden, men beveger seg ikke?', options: ['Trappen', 'Heisen', 'Paraplyen', 'Klokka'], answer: 0, explanation: 'Trappen «går» opp og ned, men står likevel stille.' },
      { q: 'Hva er det jo flere du tar, jo mer blir det igjen?', options: ['En bøtte', 'Et hull', 'En maske', 'Et tau'], answer: 1, explanation: 'Jo mer du graver, jo større blir hullet.' },
      { q: 'Hvilket ord blir kortere når du legger til to bokstaver?', options: ['Bok', 'Sett', 'Kort', 'Ordet'], answer: 2, explanation: '«Kort» + «ere» blir «kortere» – og kortere er det motsatte av lengre.' },
      { q: 'Hva har fire bein om morgenen, to om dagen og tre om kvelden?', options: ['Hunden', 'Katten', 'Mennesket', 'Treet'], answer: 2, explanation: 'Gåten handler om livet: babyen krabber, den voksne går, og den eldre bruker stokk.' },
      { q: 'Hva har et øye, men kan ikke se?', options: ['En bok', 'En knapp', 'En nål', 'Et lys'], answer: 2, explanation: 'Nålen har et «øye» (hullet i nålen), men kan ikke se.' },
    ],
  },
];

export const QUIZ_BY_ID = Object.fromEntries(QUIZZES.map((q) => [q.id, q]));

export function quizzesForSubject(subjectSlug) {
  if (subjectSlug === 'quiz') return QUIZZES;
  return QUIZZES.filter((q) => q.subject === subjectSlug);
}