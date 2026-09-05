// Leonardo – bygger public/data/countries.js fra rådata i scripts/cache/.
// Kjøres av scripts/refresh-data.js (eller manuelt: node scripts/process-data.cjs).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CACHE = path.join(__dirname, 'cache');

const raw = JSON.parse(fs.readFileSync(path.join(CACHE, 'countries.json'), 'utf8'));
const wb = JSON.parse(fs.readFileSync(path.join(CACHE, 'wb_pop.json'), 'utf8'))[1];
const POP_BY_ISO3 = {};
for (const r of wb) {
  if (r.value != null && r.countryiso3code) POP_BY_ISO3[r.countryiso3code] = r.value;
}

function stripDiacritics(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const FLAGS_DIR = path.join(ROOT, 'public', 'assets', 'flags');
const out = [];
for (const c of raw) {
  if (!c.cca2 || !c.name || !c.name.common || !c.ccn3) continue;
  const capital = Array.isArray(c.capital) && c.capital.length ? c.capital[0] : (c.capital || '');
  const languages = c.languages ? Object.keys(c.languages).map((k) => c.languages[k]) : [];
  const currencies = c.currencies
    ? Object.keys(c.currencies).map((k) => {
        const cur = c.currencies[k];
        return cur && cur.name ? cur.name : k;
      })
    : [];
  const borders = Array.isArray(c.borders) ? c.borders : [];
  const region = c.region || '';
  const subregion = c.subregion || '';
  const continents = Array.isArray(c.continents) ? c.continents : (c.region ? [c.region] : []);
  const iso3 = c.cca3 || '';
  const population = c.ccn3 && POP_BY_ISO3[iso3] != null ? POP_BY_ISO3[iso3] : (c.population || 0);
  const hasFlagFile = fs.existsSync(path.join(FLAGS_DIR, `${c.cca2.toLowerCase()}.png`));

  out.push({
    id: c.cca2,
    iso3,
    ccn3: c.ccn3 || '',
    name: c.name.common,
    official: c.name.official || '',
    capital,
    region,
    subregion,
    continents,
    population,
    area: c.area || 0,
    flag: c.flag || '',
    flagFile: hasFlagFile ? `assets/flags/${c.cca2.toLowerCase()}.png` : '',
    languages,
    currencies,
    unMember: Boolean(c.unMember),
    independent: c.independent != null ? c.independent : true,
    landlocked: Boolean(c.landlocked),
    borders,
    latlng: Array.isArray(c.latlng) ? c.latlng.map((n) => +n) : [],
    search: stripDiacritics(c.name.common).toLowerCase(),
  });
}

const sorted = out.sort((a, b) => a.name.localeCompare(b.name));
const byName = {};
const byIso2 = {};
for (const r of sorted) {
  byName[r.name] = r;
  byIso2[r.id] = r;
  const norm = stripDiacritics(r.name).toLowerCase();
  if (r.name !== norm && !byName[norm]) byName[norm] = r;
}

function formatPopulation(n) {
  if (!n || isNaN(n)) return 'Ukjent';
  if (n >= 1e9) return (n / 1e9).toFixed(2).replace(/\.00$/, '') + ' milliarder';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + ' millioner';
  if (n >= 1e3) return Math.round(n / 1e3) + ' tusen';
  return String(n);
}

const forSite = sorted.map((r) => ({
  ...r,
  popLabel: formatPopulation(r.population),
  areaKm: r.area ? Math.round(r.area) : null,
}));

fs.writeFileSync(
  path.join(ROOT, 'public', 'data', 'countries.js'),
  `// Leonardo landdata
// Basert på mledoze/countries (CC0) og befolkningsdata fra Verdensbanken.
// Ikke rediger for hånd. Oppdater med: node scripts/refresh-data.js
export const COUNTRIES = ${JSON.stringify(forSite)};
export const COUNTRIES_BY_ISO2 = ${JSON.stringify(byIso2)};
export const COUNTRIES_BY_NAME = ${JSON.stringify(byName)};
export function formatPopulation(n) {
  if (!n || isNaN(n)) return 'Ukjent';
  if (n >= 1e9) return (n / 1e9).toFixed(2).replace(/\\.00$/, '') + ' milliarder';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\\.0$/, '') + ' millioner';
  if (n >= 1e3) return Math.round(n / 1e3) + ' tusen';
  return String(n);
}
`,
  'utf8',
);

const noFlag = forSite.filter((c) => !c.flagFile && c.population > 100000);
const withPop = forSite.filter((c) => c.population > 0);
console.log('countries.js skrevet:', forSite.length, 'land, med befolkning:', withPop.length, ', mangler flagg (pop>100k):', noFlag.length);
console.log('NOR:', JSON.stringify(forSite.find((c) => c.iso3 === 'NOR')));
console.log('FRA:', JSON.stringify(forSite.find((c) => c.iso3 === 'FRA')).slice(0, 300));