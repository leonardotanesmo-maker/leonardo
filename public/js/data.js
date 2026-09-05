// Leonardo – datahjelpere og søkeindeks

import { COUNTRIES, COUNTRIES_BY_ISO2, COUNTRIES_BY_NAME } from '../data/countries.js';
import { SUBJECTS, SUBJECT_BY_SLUG } from '../data/subjects.js';
import { QUIZZES, QUIZ_BY_ID } from '../data/quizzes.js';

export { COUNTRIES, COUNTRIES_BY_ISO2, COUNTRIES_BY_NAME };
export { SUBJECTS, SUBJECT_BY_SLUG };
export { QUIZZES, QUIZ_BY_ID };

const BY_NUMERIC = {};
for (const c of COUNTRIES) if (c.ccn3) BY_NUMERIC[c.ccn3] = c;

export function countryByNumeric(num) {
  return BY_NUMERIC[String(num)] || null;
}

export function countryByIso2(iso2) {
  return COUNTRIES_BY_ISO2[(iso2 || '').toUpperCase()] || null;
}

export function countryByAny(q) {
  const key = (q || '').trim();
  if (!key) return null;
  const upper = key.toUpperCase();
  return countryByIso2(upper) || COUNTRIES_BY_NAME[key] || null;
}

const NEIGHBOR_INDEX = {};
for (const c of COUNTRIES) NEIGHBOR_INDEX[c.iso3] = c;

export function neighborNames(bordersIso3) {
  if (!Array.isArray(bordersIso3)) return [];
  return bordersIso3
    .map((iso3) => NEIGHBOR_INDEX[iso3])
    .filter(Boolean)
    .map((c) => c.name)
    .sort((a, b) => a.localeCompare(b));
}

export function continentLabelOf(c, lang = 'nb') {
  const map = {
    Africa: 'Afrika',
    Antarctica: 'Antarktis',
    Asia: 'Asia',
    Europe: 'Europa',
    'North America': 'Nord-Amerika',
    Oceania: 'Oseania',
    'South America': 'Sør-Amerika',
  };
  const key = c.continents && c.continents.length ? c.continents[0] : c.region;
  return map[key] || key || '–';
}

export function regionKeyOf(c) {
  const key = c.continents && c.continents.length ? c.continents[0] : c.region;
  return key || '';
}

// Søkeindeks
function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.,'’"()]/g, '').trim();
}

export function buildSearchIndex() {
  const items = [];
  for (const s of SUBJECTS) {
    items.push({ kind: 'subject', id: s.slug, name: s.name, sub: 'Fag', icon: s.icon, accent: s.accent, tokens: normalize(`${s.name} ${s.tagline} ${s.intro}`) });
  }
  for (const q of QUIZZES) {
    const subject = SUBJECT_BY_SLUG[q.subject];
    items.push({ kind: 'quiz', id: q.id, name: q.title, sub: `Quiz · ${subject ? subject.name : 'Aktivitet'}`, icon: q.icon, accent: subject ? subject.accent : 'quiz', tokens: normalize(`${q.title} ${q.description}`) });
  }
  for (const c of COUNTRIES) {
    items.push({ kind: 'country', id: c.id, name: c.name, sub: `Land · ${continentLabelOf(c)}`, icon: 'pin', accent: 'geografi', flag: c.flagFile, tokens: normalize(`${c.name} ${c.official} ${c.capital} ${normalize(c.search)}`) });
  }
  return items;
}

export function search(query, limit = 30) {
  const q = normalize(query);
  if (!q) return [];
  const scored = buildSearchIndex()
    .map((item) => {
      if (item.tokens === q) return { item, score: 0 };
      const idx = item.tokens.indexOf(q);
      if (idx === 0) return { item, score: 1 };
      if (idx > 0) return { item, score: 2 };
      if (item.tokens.includes(q)) return { item, score: 3 };
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map((x) => x.item);
  return scored;
}

export function quizById(id) { return QUIZ_BY_ID[id] || null; }
export function subjectBySlug(slug) { return SUBJECT_BY_SLUG[slug] || null; }