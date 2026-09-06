# JARVIS_STATE.md – Leonardo (nettlæringsverksted, tidligere "Gruble.net")

Oppdatert: 6. september 2026 (6. økt – mye flere quizer, vanskelighetsgrader, mattesystem og randomisering). Skrevet av JARVIS for neste AI-økt og for menneskelige utviklere.

## Prosjekt
Nettutgave av et norsk læringsverksted – fag, quizer, gåter og interaktivt verdenskart – bygget helt
på nytt som en null-avhengighets statisk SPA + en liten Node-tjener. Grensesnittet er på norsk bokmål.

Siden het tidligere "Gruble.net" og er nå i sin helhet omdøpt til **Leonardo**: sidens egne produkt
(elevene Quizer + gåter), laget av eieren (elev, født 2012, ved Nidaros idretts ungdomsskole i Tiller).
Ordet "gruble"/"grubliser" finnes ikke lenger i kode eller synlig tekst.

- Hjem: `/home/leo/gruble` (vitensiden som serveres fra `public/`)
- Kjør: `cd /home/leo/gruble && node server.js` → http://localhost:4173
- Ingen runtime-npm-avhengigheter. Bare `devDependencies` i `scripts/` for dataoppdatering.

## Status
FUNKSJONELT FERDIG og verifisert. Alle kjerneruter og alle 8 quizer fungerer, sjekket med
headless Chrome (CDP). Ingen runtime-feil (0 unntak) på noen rute. Fikset i denne økten:

1. **Kritisk feil funnet og rettet: landpanelets backdrop ble hengende.** `.page-panel-backdrop`
   hadde `animation: fadeIn ... forwards` og `countryPanel.js` fjernet aldri den. Etter å ha
   åpnet/lukket landpanelet én gang ble backdrop-en liggende med `opacity:1` og `pointer-events:auto`
   over hele siden → hele siden var umulig å klikke (alle klikk traff backdrop-en). Hodet (z-index
   over 900) virket fortsatt, derfor ble det ikke oppdaget av det gamle testsettet. Rettet i
   `public/styles/components.css` + `public/js/components/countryPanel.js`:
   - Backdrop-en får nå klassen `is-open` bare mens panelet er åpent; CSS setter
     `pointer-events:none; opacity:0` som standard og `is-open` → `opacity:1; pointer-events:auto`.
   - Closed-panelet er også `visibility:hidden; pointer-events:none` når lukket (kommer ikke i
     tab-rekkefølge / a11y-treet), `visibility` overgangen åpner øyeblikkelig og lukker i takt med skyven.
2. Død kode fjernet i `pages/subject.js` (tomt if-oppsett med udøpt `quizIds`-sett – ingenting utført).
3. Testverktøy i `/tmp/grublebuild/` rettet (se Verifisering): chips-check brukte feil klasse
   (`.country-name` → faktisk `.cr-name`); layout-check hadde feil logikk (desktop/mobil-nav-sjekk var
   omvendt, spor-te-støtte på sider som ikke har `.hero`, og side-element-scaneren flagget
   off-canvas fikspanelet som "horisontal overflow" – filteret hopper nå over `.page-panel`-innhold).
4. `git init` i `/home/leo/gruble` (fra forrige økt). Ingen commits ennå – repoet er tomt og klart.
5. **Omdøping til "Leonardo" (denne økten).** All synlig "Gruble.net"-profil (header/footer/titler/
   meta/om-side/hero-tekst) er erstattet med Leonardo, og eiersiden er omskrevet til "laget av
   Leonardo, født 2012, elev ved Nidaros idretts ungdomsskole i Tiller". Fag-et "Grubliser" er blitt
   **Hjernetrim** (`slug: hjernetrim`, `accent: hjernetrim`) med quiz **"Klassiske gåter"**
   (`id: gater`). Kontaktkortet med den gamle eiers post/Bergen-opplysninger og e-post er fjernet
   (erstattet av "Laget av"-kort og skolens opplysninger). Søk, lagring, server, package.json og
   scripts er oppdatert (markert under Verifisering). Intern localStorage-nøkkel er nå `leonardo:recent`.
6. **Quiz-bugfiks: spørsmål 2+ tok ikke imot svar (denne økten).** I `public/js/components/quizRunner.js`
   gjorde `next()` `this.el.replaceWith(this.render())` UTEN å oppdatere `this.el`. Etter det første
   trykk på «Neste» pekte alle hendelser (markering av svar, tilbakemelding, «Neste»/«Se resultat») på
   den frakoblede Q1-DOM-en. Rettet ved å sette `const el = this.render(); this.el.replaceWith(el); this.el = el;`.
   Reprodusert med `quiz2.mjs` (Q2: ingen tilbakemelding/Neste-knapp) og låst med ny permanent
   regresjonstest `quiz-flow.mjs` → **10/10** (valg/drill/flagg Q1+Q2, full kjøring til resultatkort, restart).
7. **UI-pudding (denne økten): "ren, enkel, kul og skolevennlig".** CSS-styrt refresh i `public/styles/`:
   mykere palett + gradient-tokens, pill-knapper (primær med gradient og skygge), rundere kort med
   høyde-glipp på hover, fagkort med farget akcentstripe (`::before` med `--subject-accent`), quiz:
   tydeligere alternativ-knapper med nøkkelbokstav, bedre Riktig/Feil-tilbakemelding med sjekk/kryss-
   ikon (`quizRunner.js` bygger nå `fb-icon` + `fb-text`), høyere progresjonslinje, større drill-input,
   resultatkort med gradienttall, blå→lilla gradient-banner for "Sammenlign land", polerte
   om-side/brødsmule-/søk-/panel- og footer-stiler. Ingen DOM-endringer som bryter testselektorane –
   alle 29 ruter og all interaksjon er fortsatt grønn.
8. **Flaggquiz-bugfiks (denne økten): ett alternativ viste bilde i stedet for landsnavn.**
   I `ChoiceQuiz.renderQuestion()` ble alternativet med riktig svar tegnet som flaggbilde
   (`htmlFlag`) i stedet for landsnavnet – så ett svar viste bilde mens de andre viste navn.
   Fjernet `htmlFlag`-optionsgrenen; alle alternativer viser nå landsnavn, og flagget vises som
   spørsmålsbilde. Låst med ny sjekk i `quiz-flow.mjs` ("flag options are text") → 11/11.
9. **Quizer utvidet kraftig + vanskelighetsgrader + randomisering + mattesystem (denne økten).**
   - `data/quizzes.js` er omskrevet: fra 8 til **17 quizer**, hver av typene `choice` har
     `difficulties: { easy, medium, hard }`-pooler (Lett/Middels/Vanskelig, 8+ spørsmål per nivå,
     ~430 spørsmål totalt). Nye quizer: `verdensdeler`, `ordklasser`, `synonymer-antonymer`,
     `engelske-dyr`, `solsystemet`, `kroppen`, `norge-fakta`, `logiske-gater`. `flagg-verden` bruker
     `flagTiers` (befolkningsantall per nivå), `gangetabellen` er `drill`-type med nivåkonfigurasjon
     (`tables`/`bMin`/`bMax`), `matematikk` er ny `math`-type.
   - **Ny dynamisk mattegenerator** `data/mathGenerator.js`: oppgaver *genereres ferskt* per runde
     (`generateMathQuiz(operation, difficulty, count)`, `validateGenerated`) – regneartene
     `add/sub/mul/div/mixed` × `easy/medium/hard`. Riktig svar + 3 plausibelt feile alternativer,
     forklaringstekst per spørsmål.
   - `components/quizRunner.js` omskrevet: spørsmålsrekkefølge **og** svaralternativer stokkes per
     runde (riktig svar-indeks regnes om etter stokking), nivåpooler, flagg-tier, drill-nivåer,
     math-generering. Resultatkortet er utvidet: poeng, prosent, riktige/feil, **nivå + regneart**,
     tilbakemeldingstekst, «Prøv igjen» (bygger ny randomisert runde), «Faget» og «Andre quizer».
   - `pages/quiz.js` får **oppsettsflyt**: alle quizer starter med valg av vanskelighetsgrad;
     matematikk har to trinn – velg regneart (Pluss/Minus/Ganging/Deling/Blandet) → velg nivå.
   - `data/subjects.js` oppdatert med nye aktiviiveter (matematikk har nå «Matteoppgaver» +
     «Gangetabellen», «Quiz»-faget lister alle 17). Nye ikoner `plus/minus/times/divide`.
   - **Design-**pudding: ambient bakgrunnsglød, gradient-aksent på hero-overskriften, skarpere
     fontstabel, farget hover på kort, bedre primærknapp + fokusring, oppsettskort og responsive
     regler for små skjermer.
   - **Verifisering:** ny permanent logikk-test `node /tmp/opencode/quiz_test.mjs` (DOM-stub i Node)
     → alle grønne: svar-indeks konsistent etter stokking, unike alternativer (4 stk), randomisering
     gir ulike runder, flagg-nivåer bygger gyldige 4-alternativs-spørsmål, matte valideres for alle
     15 kombinasjoner, drill-produkter riktige. Chromium headless: alle ruter rene, ingen konsollfeil.
   - Fiks underveis: `kanِikke`-citeringsbug i `synonymer-antonymer` (syntaks), duplikate
     alternativer i `engelske-dyr` («bees») og `ordklasser` («Adjektiv»), og quiz-siden startet
     matte direkte i stedet for å vise oppsettskjermen (rettet – alltid oppsett først).

## Kjør rutenettet
Ruter (hash-router):
`#/` og `#/hjem` – forside · `#/fag` – alle fag · `#/fag/:slug` – enkeltfag ·
`#/geografi` – interaktivt verdenskart · `#/geografi/:iso2` – dyplenke til landpanel ·
`#/quiz` og `#/quiz/:id` – quizer (valg, flagg, drill) · `#/sok` – søkeside · `#/om` – om siden.

## Struktur (public/)
- `index.html` – skjellett, laster `js/main.js`
- `styles/` – `base.css`, `components.css`, `layout.css`, `responsive.css`, `map.css` m.fl.
- `js/main.js` – routerregistrering og oppstart
- `js/router.js` – hash-routing, `data-nav`-attributt på navigasjonslenker
- `js/dom.js` – `h()` (setter bl.a. `data-*`-attributter), `q`/`qa`, `esc` osv.
- `js/icons.js` – SVG-ikoner (`icon(name, size)`)
- `js/components.js` – delekomponenter (`pageHead`, `crumbs`, `activityCard` osv.)
- `js/store.js` – localStorage-basert "siste aktivitet"
- `js/components/` – `header.js` (søkedropdown + mobilmeny), `footer.js`, `map.js`
  (kartladning, hover-tooltip, dimming/søk), `quizRunner.js` (valg-/flagg-/drill-quiz),
  `countryPanel.js` (landpanel)
- `js/pages/` – `home`, `subjects`, `subject`, `geography`, `quiz`, `search`, `about`, `notfound`
- `js/data.js` – indeksert landdata, fag, quizer; `search()`
- `data/` – genererte moduler (`countries.js` med `COUNTRIES`, `COUNTRIES_BY_ISO2`,
  `COUNTRIES_BY_NAME`, `formatPopulation`; `subjects.js`; `quizzes.js`; `mathGenerator.js`)
- `assets/map.svg` – 177 land-path-er (`class="country"`, `data-numeric`, `data-name`)
- `assets/flags/` – 250 flagg som PNG (`<iso2>.png`, inkl. `xk.png`)

## Data (ikke dikte opp!)
- `data/countries.js` er generert fra mledoze/countries + Verdensbankens befolkningstall,
  og `assets/map.svg` fra world-atlas (110m). Landnavnene er på ENGELSK fordi
  mledoze-versjonen vi bruker mangler `translations.nor` – ikke fabrikker norske navn.
- 249 land i datasettet (name- og iso2-nøklede maps). Alle `flagFile`-referanser finnes på disk.
- Kosovo er IKKE et land i datasettet (det finnes bare som nabolandskode `UNK`), men
  `assets/flags/xk.png` ligger klar hvis Kosovo noen gang legges til.
- Oppdater data: `npm run refresh-data` (= `node scripts/refresh-data.js`).
  Lastes ned til `scripts/cache/`, genereres av `scripts/process-data.cjs` og
  `scripts/genmap.cjs`. Krever `npm install` (devDependencies: `d3-geo`, `topojson-client`).
- `server.js` sender `Cache-Control: no-store` (viktig under utvikling; ellers cacher
  nettleseren moduler og gir forvirrende "gamle" feil).

## Verifisering
Interaktivt CDP-testsett i `/tmp/grublebuild/` mot CDP på port 9222 (chromium headless,
`--remote-debugging-port=9222 --user-data-dir=/tmp/grublebuild/chrome-prof-fresh about:blank`):
- `node test-interactive.mjs` → forvent `== 28/28 passed ==` (25 originale + 3 nye
  backdrop-regresjonssjekker: backdrop inert etter lukking, panelet vekk fra tab-rekkefølge,
  sideinnholdet klikkbart etter lukking).
- `node layout-check.mjs` → `== 22/22 passed ==`, wide-element-scan tom.
- `node chips-check.mjs` → Nord-Amerika 42 rader, Sør-Amerika 14 rader, Europa 52.
- `node panel-check.mjs` → panel `[0,390,390]` på 390px, `fits:true`, desktop-nav OK.
- `node sweep-all.mjs` → `29/29` ruter/quizzer, 0 runtime-unntak (oppdatert for nye slug-er:
  `/fag/hjernetrim` og `/quiz/gater` i testlista).
- `node brand-check.mjs` (denne økten) → alle ruter viser merke "Leonardo", ingen synlig
  "gruble/grubliser"-tekst i DOM, riktige sidetitler.
- `node quiz-flow.mjs` (denne økten, permanent) → **11/11**: multi-spørsmålsflyt valg/drill/flagg
  (Q1+Q2-regresjon), flagg-alternativer er landsnavn (ingen bilder), full kjøring og restart.
- `node /tmp/opencode/quiz_test.mjs` (6. økt, Node-logikk med DOM-stub, permanent) → alle grønne;
  dekker randomisering (svar-indeks omregnet etter stokking), unike alternativer,
  flagg-tier-/drill-/math-oppbygging og at gjentatte runder ikke er like.
- Skjermbilder (PNG) i `/tmp/grublebuild/shots/` er regenerert mot dagens build (etter UI-pudding).
- Merk: kjør aldri to harness-scripts mot samme CDP-port samtidig – de deler én side-target og
  navigasjon/klikk krasjer inn i hverandre. Kjør dem sekvensielt.

## Kjente forhold / neste steg
1. Kosovo/Serbia: avklart – Kosovo er ikke i datasettet; `xk.png` ligger klar. Hvis Kosovo legges til
   senere, må border-koden `UNK`/iso2-koden `XK` kobles til `xk.png`.
2. Tilgjengelighet er OK (Esc lukker panelet, fokustrap, panelet ut av tab-rekkefølge når lukket,
   kart-landene er tastaturnavigerbare med Enter/mellomrom). Kan utvides med full pil-tast-navigasjon
   på kartet hvis ønskelig.
3. Repoet er publisert på GitHub (`leonardotanesmo-maker/leonardo`, se «Distribusjon») med
   git-identitet `leonardotanesmo-maker` / `leonardotanesmo-maker@users.noreply.github.com`.
4. Merkenavnet er valgt til **«Leonardo»** (siden er laget av ham). Skal navnet eller taglinja endres,
   går det raskt: søk etter «Leonardo» i `public/` + `package.json` + `server.js` og bytt tekstene.
5. (6. økt) Quizer i `data/quizzes.js` understøtter nå `difficulties`-pooler, `flagTiers` og
   `type: 'math'`/`'drill'`. Gamle statiske `questions`-felt finnes ikke lenger for aktive quizer –
   ny kode må lese `difficulties[level]` og stokke med `shuffleOptions` (ikke anta at
   `options[answer]` er uforandret). Spørsmålsrommet per nivå er godt utvidet, så gjentatte
   runder gir reelt nye spørsmål. Neste mulige steg: per-spørsmål-gjennomgang på resultatkortet,
   beste-poeng-per-quiz i localStorage, og en quiz-let «velg tilfeldig spørsmål»-modus.

## Viktige fallgruver (headless-testing)
- Ikke bruk `pkill -f <pattern>` som matcher egen kommandolinje – den dreper skallet.
  Kill Chrome med `for p in $(pgrep -x chromium); do kill "$p"; done`.
- Scroll er asynkron pga. `scroll-behavior: smooth`. I headless-testene brukes
  `Emulation.setDeviceMetricsOverride` (1280×2600) for å unngå å måtte scrolle.
- `Page.navigate` til en URL som bare skiller seg i hash utfører IKKE full reload – DOM (inkl. et
  åpnet landpanel) overlever. Full reload gjøres med `Page.reload`.
- `.page-panel` er `position:fixed` + `translateX(105%)` når lukket – den gir aldri ekte horisontal
  scroll, men dukker opp i getBoundingClientRect-skanning. Ignorer off-canvas fikselementer i
  overflow-sjekker.
- `cdp.mjs` har ingen `close()`. Scripts som kaller `c.close()` avsluttes med `TypeError: c.close is
  not a function` på teardown – helt ufarlig; bruk `process.exit(0)` for ren avslutning.

## Distribusjon (deploy, gratis og alltid oppe)
- **Status:** LIVE på GitHub Pages: https://leonardotanesmo-maker.github.io/leonardo/ (200, alle ruter
  inkl. hash-ruter fungerer). Gratis `.is-a.dev`-domene under behandling.
- Repo: https://github.com/leonardotanesmo-maker/leonardo (offentlig, branch `main`). Git-remote:
  `https://github.com/leonardotanesmo-maker/leonardo.git`.
- Deploy: GitHub Actions-workflow `.github/workflows/pages.yml` (checkout@v4, configure-pages@v5,
  upload-pages-artifact@v3 med `path: public`, deploy-pages@v4). Pages satt med `build_type: workflow`
  – må stå som Actions, ikke "legacy /docs", ellers feiler politikk (`/public` er ikke lovlig verdi).
  `public/.nojekyll` er lagt til. Static-only-verifisert (`python3 -m http.server` på `public/`).
- Push-mot Github (angir scope): `git -c credential.helper="!f() { echo username=x-access-token; echo
  password=$TOKEN; }; f" push https://github.com/leonardotanesmo-maker/leonardo.git main`
  (Bearer in http.extraHeader alene gir "could not read Username"). Å pushe `.github/workflows/`
  krever OAuth-scope `workflow` ut over `repo`.
- **Gratis domene:** `leonardo.is-a.dev` er allerede tatt (eies av «LeonardoVS30»). Søkte derfor om
  `leonardo-tanesmo.is-a.dev` via is-a.dev-registeret: PR https://github.com/is-a-dev/register/pull/51020
  (fork `leonardotanesmo-maker/register`, fil `domains/leonardo-tanesmo.json` med
  `owner.username` = `leonardotanesmo-maker`, `owner.email` = `leonardotanesmo@gmail.com`, og
  `records.CNAME` = `leonardotanesmo-maker.github.io`). Alle bot-sjekker grønne (Tests/Label/Template).
- Merk: en første PR (#51018) ble nektet fordi boten lukket den et par sekunder FØR det fiksede
  skjemaet landet – gjenåpning ga 422, så ny PR #51020 ble opprettet fra samme branch. is-a.dev sine
  tester avviser også `@users.noreply.github.com`-eposter («Owner email should not be a GitHub
  no-reply email»).
- is-a.dev PR-skjema: kroppen MÅ følge `.github/PULL_REQUEST_TEMPLATE.md` nøyaktig (checkboxer med
  kommentar-markører, lenke til eksisterende side mellom WEBSITE_PREVIEW_START/END, formål mellom
  WEBSITE_PURPOSE_START/END) – ellers feiler Template-sjekken.
- Etter at PR-en er merget: sett Pages custom domain `leonardo-tanesmo.is-a.dev` (CNAME via API og
  `public/CNAME`), verifiser DNS, oppdater rutene, og gi brukeren ny URL.
- **Sikkerhet:** Brukeren sendte passord i chatten tidligere – brukt AVVIST; gjør rede for at de skal
  endre Gmail/GitHub-passord + skru på 2FA. GitHub-autentisering gjøres med OAuth device flow
  (client_id `178c6fc778ccc68e1d6a`) – brukeren må klikke Autoriser. Token kopiert til
  `/tmp/opencode/gh-token` (chmod 600, husk å slette) kun for å fullføre deploy-wiringen; deretter
  bør OAuth-granten revokes i GitHub Settings → Applications (GitHub CLI).