// Leonardo – dynamisk matematikkoppgavegenerator
// Genererer regneoppgaver med valgt operasjon og vanskelighetsgrad.
// Sørger for at alle oppgaver er matematisk riktige og har gyldige svaralternativer.

// --- Hjelpefunksjoner ---

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Generer distraktorer (feil svar) som er fornuftige og distinkte
function makeDistractors(correct, count = 3, range = 0.4) {
  const out = new Set();
  const spread = Math.max(3, Math.round(Math.abs(correct) * range));

  // Forsøk å finne gyldige distraktorer
  for (let attempt = 0; attempt < 80 && out.size < count; attempt++) {
    const variant = correct + randInt(-spread, spread);
    if (variant !== correct && variant !== 0 && !out.has(variant)) {
      out.add(variant);
    }
  }

  // Hvis vi ikke fikk nok, fyll inn med enkle varianter
  let offset = 1;
  while (out.size < count) {
    const v = correct + offset;
    if (v !== correct && v !== 0 && !out.has(v)) out.add(v);
    offset++;
  }

  return shuffle([...out]);
}

// Lag svaralternativer og stokk rekkefølgen
function makeOptions(correct, distractors) {
  const all = shuffle([correct, ...distractors]);
  return {
    options: all,
    answerIndex: all.indexOf(correct),
  };
}

function formatNumber(n) {
  return String(n);
}

// --- Addisjon ---

function genAddition(difficulty) {
  let a, b, range;
  switch (difficulty) {
    case 'easy':
      // Tall opp til 20, sum alltid under 20
      a = randInt(1, 9);
      b = randInt(1, 9);
      return {
        a, b, op: '+', display: 'plus',
        answer: a + b,
        explanation: `${a} + ${b} = ${a + b}`,
      };
    case 'medium':
      // To-sifrede tall
      a = randInt(12, 48);
      b = randInt(12, 48);
      return {
        a, b, op: '+', display: 'plus',
        answer: a + b,
        explanation: `${a} + ${b} = ${a + b}`,
      };
    case 'hard':
      // Større tall med tier-overgang
      a = randInt(48, 99);
      b = randInt(27, 87);
      return {
        a, b, op: '+', display: 'plus',
        answer: a + b,
        explanation: `${a} + ${b} = ${a + b}`,
      };
  }
}

// --- Subtraksjon ---

function genSubtraction(difficulty) {
  let a, b;
  switch (difficulty) {
    case 'easy':
      // Svar alltid positivt, små tall
      a = randInt(5, 20);
      b = randInt(1, a - 1);
      return {
        a, b, op: '−', display: 'minus',
        answer: a - b,
        explanation: `${a} − ${b} = ${a - b}`,
      };
    case 'medium':
      a = randInt(25, 70);
      b = randInt(10, a - 5);
      return {
        a, b, op: '−', display: 'minus',
        answer: a - b,
        explanation: `${a} − ${b} = ${a - b}`,
      };
    case 'hard':
      a = randInt(80, 150);
      b = randInt(35, a - 15);
      return {
        a, b, op: '−', display: 'minus',
        answer: a - b,
        explanation: `${a} − ${b} = ${a - b}`,
      };
  }
}

// --- Multiplikasjon ---

function genMultiplication(difficulty) {
  let a, b;
  switch (difficulty) {
    case 'easy':
      // Gangetabellen 2–5
      a = randInt(2, 5);
      b = randInt(2, 10);
      return {
        a, b, op: '×', display: 'times',
        answer: a * b,
        explanation: `${a} × ${b} = ${a * b}`,
      };
    case 'medium':
      // Gangetabellen 5–10
      a = randInt(5, 10);
      b = randInt(4, 12);
      return {
        a, b, op: '×', display: 'times',
        answer: a * b,
        explanation: `${a} × ${b} = ${a * b}`,
      };
    case 'hard':
      // To-sifret × en-sifret eller to-sifret × to-sifret
      const useTwoDigit = Math.random() < 0.5;
      if (useTwoDigit) {
        a = randInt(11, 19);
        b = randInt(11, 15);
        const lower = Math.min(a, b);
        const higher = Math.max(a, b);
        return {
          a: higher, b: lower, op: '×', display: 'times',
          answer: higher * lower,
          explanation: `${higher} × ${lower} = ${higher * lower}`,
        };
      } else {
        a = randInt(12, 19);
        b = randInt(5, 9);
        return {
          a, b, op: '×', display: 'times',
          answer: a * b,
          explanation: `${a} × ${b} = ${a * b}`,
        };
      }
  }
}

// --- Divisjon (med heltallssvar) ---

function genDivision(difficulty) {
  let quotient, divisor;
  switch (difficulty) {
    case 'easy':
      // Klein gangetabell – divisjon med liten divisor
      divisor = randInt(2, 5);
      quotient = randInt(2, 9);
      return {
        a: quotient * divisor, b: divisor, op: '÷', display: 'divide',
        answer: quotient,
        explanation: `${quotient * divisor} ÷ ${divisor} = ${quotient}`,
      };
    case 'medium':
      divisor = randInt(3, 9);
      quotient = randInt(5, 12);
      return {
        a: quotient * divisor, b: divisor, op: '÷', display: 'divide',
        answer: quotient,
        explanation: `${quotient * divisor} ÷ ${divisor} = ${quotient}`,
      };
    case 'hard':
      divisor = randInt(4, 12);
      quotient = randInt(9, 18);
      // Litt større tall ved å multiplisere med en faktor
      const factor = randInt(2, 3);
      const realQ = quotient * factor;
      const realD = divisor;
      return {
        a: realQ * realD, b: realD, op: '÷', display: 'divide',
        answer: realQ,
        explanation: `${realQ * realD} ÷ ${realD} = ${realQ}`,
      };
  }
}

const OP_GENERATORS = {
  'add': genAddition,
  'sub': genSubtraction,
  'mul': genMultiplication,
  'div': genDivision,
};

const OP_LABELS = {
  'add': 'pluss',
  'sub': 'minus',
  'mul': 'ganging',
  'div': 'deling',
};

const DIFFICULTY_LABELS = {
  'easy': 'Lett',
  'medium': 'Middels',
  'hard': 'Vanskelig',
};

// --- Hovedgenerator ---

/**
 * Genererer en matematikkquiz med valgt operasjon og vanskelighetsgrad.
 *
 * @param {string} operation - 'add' | 'sub' | 'mul' | 'div' | 'mixed'
 * @param {string} difficulty - 'easy' | 'medium' | 'hard'
 * @param {number} count - antall spørsmål (standard 10)
 * @returns {Array} - liste med spørsmålsobjekter
 */
export function generateMathQuiz(operation, difficulty, count = 10) {
  const ops = operation === 'mixed'
    ? ['add', 'sub', 'mul', 'div']
    : [operation];

  const questions = [];
  for (let i = 0; i < count; i++) {
    const op = pick(ops);
    const gen = OP_GENERATORS[op];
    const q = gen(difficulty);

    // Generer 3 distraktorer som ikke overlapper med riktig svar
    if (op === 'add' || op === 'sub') {
      const distractors = makeDistractors(q.answer, 3, 0.4);
      const { options, answerIndex } = makeOptions(q.answer, distractors);
      questions.push({
        q: `${q.a} ${q.op} ${q.b} = ?`,
        options,
        answer: answerIndex,
        explanation: q.explanation,
        operation: q.display,
        difficulty,
      });
    } else if (op === 'mul') {
      const distractors = makeDistractors(q.answer, 3, 0.5);
      const { options, answerIndex } = makeOptions(q.answer, distractors);
      questions.push({
        q: `${q.a} × ${q.b} = ?`,
        options,
        answer: answerIndex,
        explanation: q.explanation,
        operation: 'times',
        difficulty,
      });
    } else if (op === 'div') {
      const distractors = makeDistractors(q.answer, 3, 0.5);
      const { options, answerIndex } = makeOptions(q.answer, distractors);
      questions.push({
        q: `${q.a} ÷ ${q.b} = ?`,
        options,
        answer: answerIndex,
        explanation: q.explanation,
        operation: 'divide',
        difficulty,
      });
    }
  }
  return questions;
}

// Fake funksjon for testformål – sjekker at generator ikke feiler
export function validateGenerated(questions) {
  for (const q of questions) {
    if (!q.options || q.options.length !== 4) return false;
    if (q.answer < 0 || q.answer >= q.options.length) return false;
    const correct = Number(q.options[q.answer]);
    if (!Number.isFinite(correct)) return false;
  }
  return true;
}

export { OP_LABELS, DIFFICULTY_LABELS };
