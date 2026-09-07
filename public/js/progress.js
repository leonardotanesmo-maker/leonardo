// Leonardo – fremgang og personlige rekorder (localStorage)
//
// Alt lagres kun på eleven sin egen enhet – ingen data sendes til serveren.
// To lag: personlige rekorder (leonardo:pb:<scope>) og fullførte runder
// (leonardo:attempts) som brukes av «Din fremgang» på forsiden.

const PB_PREFIX = 'leonardo:pb:';
const KEY = 'leonardo:attempts';
const MAX = 60;

// Beste prosent for en gitt «scope» (quiz id + ev. regneart/verdensdel).
export function bestFor(scope) {
  try { return parseInt(localStorage.getItem(PB_PREFIX + scope), 10) || 0; } catch { return 0; }
}

// Nøkkel for personlig rekord – samme format som quizRunner bruker:
//   choice/flag/drill:  quizId
//   math:               quizId:regneart (mixed som standard)
//   map:                quizId:verdensdel
function pbScope(quiz, opts = {}) {
  if (quiz.type === 'math') return quiz.id + ':' + (opts.operation || 'mixed');
  if (quiz.type === 'map') return quiz.id + ':' + (opts.continent || '');
  return quiz.id;
}

// Registrerer en fullført runde, oppdaterer ev. personlig rekord og rapporterer
// om runden var en ny rekord. roundStats kan ha pct/correct/total.
export function recordAttempt(quiz, opts = {}, roundStats = {}) {
  const pct = roundStats.pct ?? 0;
  const scope = pbScope(quiz, opts);
  const prev = bestFor(scope);
  const isNew = pct > 0 && pct > prev;
  if (isNew) {
    try { localStorage.setItem(PB_PREFIX + scope, String(pct)); } catch { /* privat modus */ }
  }

  try {
    const list = getAttempts();
    const entry = {
      subjectSlug: quiz.subject || '',
      quizId: quiz.id,
      title: quiz.title || 'Quiz',
      type: quiz.type,
      difficulty: opts.difficulty || '',
      operation: opts.operation || '',
      continent: opts.continent || '',
      pct,
      correct: roundStats.correct ?? null,
      total: roundStats.total ?? null,
      at: Date.now(),
    };
    list.unshift(entry);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch { /* privat modus */ }

  return isNew;
}

export function getAttempts() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// Overordnet bilde av fremgangen, brukt av «Din fremgang»-seksjonen på forsiden.
export function progressSummary() {
  const list = getAttempts();
  if (!list.length) return null;

  // Beste resultat per unik quiz (oppgave med nivå som egen «kvittering»).
  const bestByKey = new Map();
  for (const a of list) {
    const key = a.quizId + '|' + a.difficulty + '|' + (a.operation || '') + '|' + (a.continent || '');
    const cur = bestByKey.get(key);
    if (!cur || a.pct > cur.pct) bestByKey.set(key, a);
  }
  const bestItems = [...bestByKey.values()].sort((a, b) => (b.pct - a.pct) || (b.at - a.at));

  return {
    played: list.length,
    unique: bestItems.length,
    subjects: new Set(list.map((a) => a.subjectSlug).filter(Boolean)).size,
    avg: Math.round(bestItems.reduce((s, b) => s + b.pct, 0) / Math.max(1, bestItems.length)),
    best: Math.max(...bestItems.map((b) => b.pct)),
    bestItems,
  };
}