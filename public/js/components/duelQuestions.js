// Leonardo – felles spørsmålsrekke for duell.
// Verten bygger ÉN spørsmålsrekke (samme rekkefølge, samme alternativer) og
// sender den til begge spillerne, så ingen får en lettere runde.
import { COUNTRIES, formatPopulation } from '../../data/countries.js';
import { generateMathQuiz } from '../../data/mathGenerator.js';

const DIFF_LABELS = { easy: 'Lett', medium: 'Middels', hard: 'Vanskelig' };

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Stokk svaralternativene og oppdater riktig svar-indeks (samme logikk som quizRunner).
function shuffleOptions(qd) {
  const order = shuffle(qd.options.map((_, i) => i));
  const options = order.map((i) => qd.options[i]);
  return { ...qd, options, answer: order.indexOf(qd.answer) };
}

export function duelTitleFor(quiz, difficulty) {
  return `${quiz.title} · ${DIFF_LABELS[difficulty || 'medium'] || difficulty}`;
}

export function buildDuelQuestions(quiz, difficulty = 'medium') {
  if (quiz.type === 'flag') return buildFlagQuestions(quiz, difficulty);
  if (quiz.type === 'math') {
    return shuffle(generateMathQuiz('mixed', difficulty, quiz.count || 10));
  }
  if (quiz.type === 'drill') return buildDrill(quiz, difficulty);

  // Valk-spørsmål fra pool (som ChoiceQuiz i quizRunner)
  const d = quiz.difficulties || {};
  const pool = Array.isArray(d[difficulty]) ? d[difficulty]
    : Array.isArray(d.medium) ? d.medium
    : Array.isArray(d.easy) ? d.easy
    : quiz.questions || [];
  const count = Math.min(quiz.count || 10, pool.length);
  return shuffle(pool).slice(0, count).map(shuffleOptions);
}

// "Hvilket land har dette flagget?" – samme oppbygging som quizRunner.
function buildFlagQuestions(quiz, difficulty) {
  const tiers = quiz.flagTiers || {
    easy: { minPopulation: 50e6 },
    medium: { minPopulation: 12e6 },
    hard: { minPopulation: 2e6 },
  };
  const tier = tiers[difficulty] || tiers.medium;
  const minPop = tier.minPopulation || 2e6;
  const pool = COUNTRIES.filter((c) => c.flagFile && c.population > 0 && c.population >= minPop);
  if (!pool.length) return [];
  const minWrong = tier.min || 3;
  const count = Math.min(quiz.count || 10, pool.length, 12);
  const picked = shuffle(pool).slice(0, count);
  return picked.map((ref) => {
    const distractorPool = shuffle(pool.filter((c) => c.id !== ref.id));
    const wrong = distractorPool.slice(0, minWrong).map((c) => c.name);
    const options = shuffle([ref.name, ...wrong]);
    return {
      q: 'Hvilket land har dette flagget?',
      flag: ref.flagFile,
      flagAlt: 'Flagg for ' + ref.name,
      options,
      answer: options.indexOf(ref.name),
      explanation: `${ref.name} – hovedstaden er ${ref.capital || '–'}${ref.population ? `, og landet har ca. ${formatPopulation(ref.population)} innbyggere.` : ''}`,
    };
  });
}

// Innskrivingsoppgave (gangetabellen) – samme oppbygging som Drill i quizRunner.
function buildDrill(quiz, difficulty) {
  const cfg = (quiz.difficulties && quiz.difficulties[difficulty]) || {};
  const tables = cfg.tables || quiz.tables || [2, 3, 4, 5];
  const bMin = cfg.bMin != null ? cfg.bMin : 1;
  const bMax = cfg.bMax != null ? cfg.bMax : 10;
  const qs = [];
  for (let i = 0; i < (quiz.count || 10); i++) {
    const a = tables[Math.floor(Math.random() * tables.length)];
    const b = bMin + Math.floor(Math.random() * (bMax - bMin + 1));
    qs.push({ a, b, ans: a * b });
  }
  return qs;
}