// Leonardo – quizside med oppsett (vanskelighetsgrad + regneart for matte)
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { crumbs } from '../components.js';
import { quizById, subjectBySlug } from '../data.js';
import { quizRunner, DIFFICULTY_LABELS } from '../components/quizRunner.js';

const DIFFICULTIES = [
  { key: 'easy', icon: 'sparkles', desc: 'Enkle spørsmål som bygger grunnmuren.' },
  { key: 'medium', icon: 'target', desc: 'Litt vanskeligere – du må tenke deg om.' },
  { key: 'hard', icon: 'bolt', desc: 'Skikkelig krevende. Klarer du alle?' },
];

const OPERATIONS = [
  { key: 'add', label: 'Pluss', icon: 'plus', sym: '+', desc: 'Legg sammen tall', color: 'var(--c-matematikk)' },
  { key: 'sub', label: 'Minus', icon: 'minus', sym: '−', desc: 'Trekk fra tall', color: 'var(--c-norsk)' },
  { key: 'mul', label: 'Ganging', icon: 'times', sym: '×', desc: 'Multipliser tall', color: 'var(--c-naturfag)' },
  { key: 'div', label: 'Deling', icon: 'divide', sym: '÷', desc: 'Del tall', color: 'var(--c-hjernetrim)' },
  { key: 'mixed', label: 'Blandet', icon: 'layers', sym: '±', desc: 'Alle regnearter blandes', color: 'var(--c-engelsk)' },
];

const CONTINENT_COLORS = {
  Europe: 'var(--c-geografi)',
  Africa: 'var(--c-naturfag)',
  Asia: 'var(--c-matematikk)',
  'North America': 'var(--c-hjernetrim)',
  'South America': 'var(--c-norsk)',
  Oceania: 'var(--c-engelsk)',
};

function quizIsMath(quiz) {
  return quiz.type === 'math';
}

function quizIsMap(quiz) {
  return quiz.type === 'map';
}

export function renderQuiz({ params }) {
  const id = params.id;
  const quiz = quizById(id);
  if (!quiz) {
    return {
      title: 'Quiz ikke funnet – Leonardo',
      element: h('div', { class: 'container page-pad' },
        h('h1', { text: 'Fant ikke quizen' }),
        h('p', { text: 'Quizzen du leter etter finnes ikke.' }),
        h('a', { class: 'btn btn-primary', href: '#/fag/quiz', text: 'Se alle quizer' }),
      ),
    };
  }

  const subject = subjectBySlug(quiz.subject);
  const crumb = subject
    ? [{ label: 'Hjem', href: '#/' }, { label: 'Fag', href: '#/fag' }, { label: subject.name, href: '#/fag/' + subject.slug }, { label: quiz.title }]
    : [{ label: 'Hjem', href: '#/' }, { label: 'Quizer', href: '#/fag/quiz' }, { label: quiz.title }];

  const stage = h('div');
  const setupHost = h('div');

  const el = h('div', { class: 'container page-pad' },
    crumbs(crumb),
    h('div', { class: 'quiz-intro' },
      h('div', { class: 'quiz-intro-row' },
        h('div', { class: 'subject-icon accent-' + (subject ? subject.accent : 'quiz'), html: icon(quiz.icon || 'bolt', 22) }),
        h('div', { class: 'quiz-intro-txt' },
          h('h1', { text: quiz.title }),
          h('div', { class: 'quiz-intro-desc' }, quiz.description),
        ),
      ),
    ),
    setupHost,
    stage,
  );

  function startQuiz(config) {
    setupHost.innerHTML = '';
    stage.innerHTML = '';
    const runner = quizRunner(quiz, () => {}, config);
    stage.appendChild(runner.el);
    if (typeof runner.mount === 'function') runner.mount();
  }

  function renderSetup() {
    stage.innerHTML = '';
    if (quiz.type === 'math') renderOperationStep();
    else if (quiz.type === 'map') renderContinentStep();
    else renderDifficultyStep();
  }

  function renderContinentStep() {
    const conts = quiz.continents || [];
    const cards = h('div', { class: 'setup-grid', style: 'grid-template-columns:repeat(3,minmax(0,1fr))' }, ...conts.map((c) =>
      h('button', { class: 'setup-card math-op-card', type: 'button', style: { '--op-color': CONTINENT_COLORS[c.key] || 'var(--accent)' }, onclick: () => startQuiz({ continent: c.key }) },
        h('span', { class: 'setup-icon', html: icon('globe', 26) }),
        h('span', { class: 'setup-label', text: c.label }),
        h('span', { class: 'setup-desc', text: 'Finn alle landene – hele verdensdelen blir grønn' }),
      ),
    ));

    renderSetupShell('Velg verdensdel', 'Du skal finne hvert eneste land i verdensdelen. Riktige klikk blir grønne, og gale klikk teller som feil. Vinn ved å gjøre hele verdensdelen grønn!', cards);
  }

  function renderOperationStep() {
    const allowed = quiz.operations || ['add', 'sub', 'mul', 'div', 'mixed'];
    const ops = OPERATIONS.filter((o) => allowed.includes(o.key));

    const cards = h('div', { class: 'setup-grid' }, ...ops.map((op) =>
      h('button', { class: 'setup-card math-op-card', type: 'button', style: { '--op-color': op.color }, onclick: () => renderDifficultyStep(op.key) },
        h('span', { class: 'math-op-sym', html: op.sym }),
        h('span', { class: 'setup-label', text: op.label }),
        h('span', { class: 'setup-desc', text: op.desc }),
      ),
    ));

    renderSetupShell('1 · Velg regneart', 'Hva vil du øve på?', cards);
  }

  function renderDifficultyStep(operation) {
    const cards = h('div', { class: 'setup-grid', style: 'grid-template-columns:repeat(3,minmax(0,1fr))' }, ...DIFFICULTIES.map((d) =>
      h('button', { class: 'setup-card diff-card diff-' + d.key, type: 'button', onclick: () => startQuiz({ difficulty: d.key, operation: operation }) },
        h('span', { class: 'setup-icon', html: icon(d.icon, 26) }),
        h('span', { class: 'setup-label', text: DIFFICULTY_LABELS[d.key] }),
        h('span', { class: 'setup-desc', text: d.desc }),
      ),
    ));

    const titleText = quiz.type === 'math'
      ? '2 · Velg vanskelighetsgrad'
      : 'Velg vanskelighetsgrad';
    const onBack = quiz.type === 'math' ? renderOperationStep : null;
    renderSetupShell(titleText, quiz.type === 'math' ? 'Så velger vi hvor vanskelig oppgavene skal bli.' : 'Oppgavene og rekkefølgen stokkes for hver runde.', cards, onBack);
  }

  function renderSetupShell(title, desc, content, onBack) {
    setupHost.innerHTML = '';
    const shell = h('div', { class: 'setup-shell card' },
      h('div', { class: 'setup-head' },
        h('h2', { text: title }),
        h('p', { text: desc }),
        onBack
          ? h('button', { class: 'btn btn-ghost btn-sm', type: 'button', html: icon('arrow', 14) + ' Tilbake', onclick: onBack })
          : null,
      ),
      content,
    );
    setupHost.appendChild(shell);
  }

  const mount = () => {
    renderSetup();
    return () => {};
  };

  return {
    title: quiz.title + ' – Leonardo',
    element: el,
    mount,
  };
}