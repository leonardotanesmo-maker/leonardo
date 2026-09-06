// Leonardo – quizmotoren (valg-, flagg-, innskriving- og math-type)
//
// config:
//   { difficulty: 'easy'|'medium'|'hard' (standard 'medium'),
//     operation: 'add'|'sub'|'mul'|'div'|'mixed' (kun math) }
//
// Randomisering:
//   - Spørsmålene stokkes i rekkefølge
//   - Svaralternativer stokkes per spørsmål (riktig svar følger med)
//   - Hver runde får derfor sjelden samme quiz to ganger
import { h, q, qa, clear } from '../dom.js';
import { icon } from '../icons.js';
import { COUNTRIES, formatPopulation } from '../../data/countries.js';
import { countryByNumeric, countryByIso2 } from '../data.js';
import { loadMapOn } from './map.js';
import { generateMathQuiz } from '../../data/mathGenerator.js';
import { track } from '../store.js';

const LETTERS = ['A', 'B', 'C', 'D'];

export const DIFFICULTY_LABELS = { easy: 'Lett', medium: 'Middels', hard: 'Vanskelig' };
export const OPERATION_LABELS = {
  add: 'Pluss', sub: 'Minus', mul: 'Ganging', div: 'Deling', mixed: 'Blandet',
};

// Forhindrer prototype-pollution-relaterte problemer i bygd regex
function clean(s) {
  return String(s || '').replace(/[^\p{L}\p{N} ]/gu, '').trim();
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Stokk svaralternativene og oppdater riktig svar-indeks
function shuffleOptions(qd) {
  const order = shuffle(qd.options.map((_, i) => i));
  const options = order.map((i) => qd.options[i]);
  return { ...qd, options, answer: order.indexOf(qd.answer) };
}

export function quizRunner(quiz, onDone, opts = {}) {
  track('quiz', quiz.id, quiz.title);
  if (quiz.type === 'drill') return new Drill(quiz, onDone, opts);
  if (quiz.type === 'map') return new MapQuiz(quiz, onDone, opts);
  return new ChoiceQuiz(quiz, onDone, opts);
}

class BaseQuiz {
  constructor(quiz, onDone, opts = {}) {
    this.quiz = quiz;
    this.onDone = onDone;
    this.opts = opts;
    this.difficulty = opts.difficulty || 'medium';
    this.index = 0;
    this.score = 0;
    this.questions = [];
    this.build();
    this.el = this.render();
  }

  build() { throw new Error('build() må overstyres'); }

  render() {
    const qd = this.questions[this.index];
    if (!qd) return this.renderResult();
    return this.renderQuestion(qd);
  }

  next() {
    this.index++;
    const el = this.render();
    this.el.replaceWith(el);
    this.el = el;
  }

  renderProgress() {
    const pct = Math.round((this.index / this.questions.length) * 100);
    return h('div', { class: 'quiz-progress' },
      h('span', { text: `Spørsmål ${this.index + 1} av ${this.questions.length}` }),
      h('div', { class: 'quiz-track' }, h('div', { class: 'quiz-fill', style: { width: pct + '%' } })),
      h('span', { text: this.score + ' p' }),
    );
  }

  renderResult() {
    const total = this.questions.length;
    const correct = this.score;
    const wrong = Math.max(0, total - correct);
    const pct = total ? Math.round((correct / total) * 100) : 0;

    const praise = pct === 100 ? 'Perfekt! Øver du noe mer, er du umulig å slå.'
      : pct >= 80 ? 'Kjempebra! Du er godt i gang.'
      : pct >= 60 ? 'Godt jobbet! Litt til, så sitter det.'
      : pct >= 40 ? 'Du er på vei. Øv litt til – det hjelper.'
      : 'God start. Prøv igjen og bygg kunnskapen steg for steg.';

    const metaParts = [DIFFICULTY_LABELS[this.difficulty] || this.difficulty];
    if (this.quiz.type === 'math' && this.opts.operation) {
      metaParts.unshift(OPERATION_LABELS[this.opts.operation] || this.opts.operation);
    }
    const meta = metaParts.join(' · ');

    const pctColor = pct >= 80 ? 'var(--ok)' : pct >= 50 ? 'var(--accent)' : 'var(--err)';

    return h('div', { class: 'card result-card' },
      h('div', { class: 'result-icon', html: icon(pct === 100 ? 'trophy' : pct >= 60 ? 'target' : 'sparkles', 44) }),
      h('div', { class: 'result-heading', text: pct === 100 ? 'Alt riktig!' : 'Resultatet ditt' }),
      h('div', { class: 'result-score', style: { color: pctColor }, html: `${this.score}<small> / ${total}</small>` }),
      h('div', { class: 'result-pct', html: `${pct} % riktige svar` }),
      h('div', { class: 'result-sub', text: praise }),
      h('div', { class: 'result-stats' },
        h('div', { class: 'rs-item is-good' }, h('div', { class: 'rs-icon', html: icon('check', 16) }), h('div', {}, h('div', { class: 'rs-num', text: String(correct) }), h('div', { class: 'rs-label', text: 'Riktige' }))),
        h('div', { class: 'rs-item is-bad' }, h('div', { class: 'rs-icon', html: icon('close', 16) }), h('div', {}, h('div', { class: 'rs-num', text: String(wrong) }), h('div', { class: 'rs-label', text: 'Feil' }))),
        h('div', { class: 'rs-item is-meta' }, h('div', { class: 'rs-icon', html: icon('layers', 16) }), h('div', {}, h('div', { class: 'rs-num', text: meta }), h('div', { class: 'rs-label', text: 'Nivå' }))),
      ),
      h('div', { class: 'result-actions' },
        h('button', { class: 'btn btn-primary', type: 'button', html: icon('play', 16) + ' Prøv igjen', onclick: () => this.restart() }),
        h('a', { class: 'btn btn-ghost', href: '#/fag/' + this.quiz.subject, html: icon('book', 16) + ' Faget' }),
        h('a', { class: 'btn btn-ghost', href: '#/fag/quiz', html: icon('bolt', 16) + ' Andre quizer' }),
      ),
    );
  }

  // Kalt av siden etter at runnerens element er satt inn i DOM.
  // Kun typer som trenger noe ekstra (f.eks. å hente kartet) bruker dette.
  mount() {}

  restart() {
    this.index = 0;
    this.score = 0;
    this.questions = [];
    this.build();
    const el = this.render();
    if (this.el.parentElement) this.el.replaceWith(el);
    this.el = el;
  }
}

class ChoiceQuiz extends BaseQuiz {
  build() {
    const quiz = this.quiz;
    if (quiz.type === 'flag') {
      this.questions = this.buildFlagQuestions();
    } else if (quiz.type === 'math') {
      this.questions = generateMathQuiz(
        this.opts.operation || 'mixed',
        this.difficulty,
        quiz.count || 10,
      );
      this.questions = shuffle(this.questions);
    } else {
      // Valk-spørsmål fra pool
      const pool = this.poolForDifficulty();
      const count = Math.min(quiz.count || 10, pool.length);
      this.questions = shuffle(pool).slice(0, count).map(shuffleOptions);
    }
  }

  poolForDifficulty() {
    const d = this.quiz.difficulties || {};
    if (Array.isArray(d[this.difficulty])) return d[this.difficulty];
    if (Array.isArray(d.medium)) return d.medium;
    if (Array.isArray(d.easy)) return d.easy;
    return this.quiz.questions || [];
  }

  buildFlagQuestions() {
    const quiz = this.quiz;
    const tiers = this.quiz.flagTiers || {
      easy: { minPopulation: 50e6 },
      medium: { minPopulation: 12e6 },
      hard: { minPopulation: 2e6 },
    };
    const tier = tiers[this.difficulty] || tiers.medium;
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

  renderQuestion(qd) {
    const hasFlag = !!qd.flag;
    const list = h('ul', { class: 'opt-list' }, ...qd.options.map((o, i) => {
      return h('li', {},
        h('button', { class: 'opt', type: 'button', 'data-i': String(i), onclick: (e) => this.answer(e, i) },
          h('span', { class: 'opt-key', text: LETTERS[i] }),
          h('span', { text: o }),
        ),
      );
    }));

    return h('div', { class: 'quiz-shell' },
      h('div', { class: 'quiz-top' }, this.renderProgress()),
      h('div', { class: 'quiz-q' },
        h('h2', { text: qd.q }),
        hasFlag ? h('div', { style: 'text-align:center' }, h('img', { class: 'quiz-flag-img', src: qd.flag, alt: qd.flagAlt || 'Flagg', width: 200, height: 100 })) : null,
        list,
        h('div', { class: 'quiz-feedback', role: 'status' }),
        h('div', { class: 'quiz-actions' }),
      ),
    );
  }

  answer(e, i) {
    const qd = this.questions[this.index];
    const btns = qa('.opt-list .opt', this.el);
    for (const b of btns) {
      b.disabled = true;
      const idx = Number(b.getAttribute('data-i'));
      if (idx === qd.answer) b.classList.add('is-correct');
      else if (idx === i) b.classList.add('is-wrong');
    }
    const correct = i === qd.answer;
    if (correct) this.score++;
    const fb = q('.quiz-feedback', this.el);
    fb.classList.add(correct ? 'is-good' : 'is-bad');
    fb.innerHTML = `<span class="fb-icon">${icon(correct ? 'check' : 'close', 18)}</span><div class="fb-text"><strong>${correct ? 'Riktig!' : 'Feil svar.'}</strong><div class="explain">${qd.explanation || ''}</div></div>`;

    const actions = q('.quiz-actions', this.el);
    const btn = h('button', { class: 'btn btn-primary', type: 'button', html: (this.index === this.questions.length - 1 ? 'Se resultat' : 'Neste') + icon('arrow', 15), onclick: () => this.next() });
    actions.appendChild(btn);
    if (btn.focus) btn.focus();
  }
}

class Drill extends BaseQuiz {
  build() {
    const quiz = this.quiz;
    const cfg = (quiz.difficulties && quiz.difficulties[this.difficulty]) || {};
    const tables = cfg.tables || quiz.tables || [2, 3, 4, 5];
    const bMin = cfg.bMin != null ? cfg.bMin : 1;
    const bMax = cfg.bMax != null ? cfg.bMax : 10;
    const qs = [];
    for (let i = 0; i < (quiz.count || 10); i++) {
      const a = tables[Math.floor(Math.random() * tables.length)];
      const b = bMin + Math.floor(Math.random() * (bMax - bMin + 1));
      qs.push({ a, b, ans: a * b });
    }
    this.questions = qs;
  }

  renderQuestion(qd) {
    return h('div', { class: 'quiz-shell' },
      h('div', { class: 'quiz-top' }, this.renderProgress()),
      h('div', { class: 'quiz-q' },
        h('h2', { text: 'Hvor mye er dette?' }),
        h('div', { class: 'drill-row', 'aria-label': `${qd.a} ganger ${qd.b}` },
          h('span', { class: 'drill-op', text: String(qd.a) }),
          h('span', { class: 'drill-op', 'aria-hidden': 'true', text: '×' }),
          h('span', { class: 'drill-op', text: String(qd.b) }),
          h('span', { class: 'drill-op', 'aria-hidden': 'true', text: '=' }),
          h('input', { class: 'text-input drill-input', type: 'text', inputmode: 'numeric', autocomplete: 'off', 'aria-label': 'Svaret ditt', value: '' }),
        ),
        h('div', { class: 'drill-msg', role: 'status', text: '\u00A0' }),
        h('div', { class: 'quiz-actions' },
          h('button', { class: 'btn btn-primary', type: 'button', html: 'Svar' + icon('arrow', 15), onclick: (e) => this.answer(e) }),
        ),
      ),
    );
  }

  mountInput() {
    const inp = q('.drill-input', this.el);
    if (inp) {
      inp.focus();
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); this.answer(e); }
      });
    }
  }

  answer() {
    const qd = this.questions[this.index];
    const inp = q('.drill-input', this.el);
    const val = clean(inp.value);
    const msg = q('.drill-msg', this.el);
    const actions = q('.quiz-actions', this.el);
    const num = Number(val);

    let correct = num === qd.ans;
    if (!Number.isFinite(num)) correct = false;

    inp.disabled = true;
    if (correct) this.score++;
    msg.textContent = correct
      ? `Riktig! ${qd.a} × ${qd.b} = ${qd.ans}`
      : `Ikke helt riktig. ${qd.a} × ${qd.b} = ${qd.ans}`;
    msg.style.color = correct ? 'var(--ok)' : 'var(--err)';

    clearEl(actions);
    actions.appendChild(h('button', { class: 'btn btn-primary', type: 'button', html: (this.index === this.questions.length - 1 ? 'Se resultat' : 'Neste') + icon('arrow', 15), onclick: () => this.next() }));
  }

  render() {
    const el = super.render();
    if (this.questions[this.index]) requestAnimationFrame(() => this.mountInput());
    return el;
  }
}

function clearEl(el) { while (el.firstChild) el.removeChild(el.firstChild); }

// «Finn landet på kartet» – typen `map`.
// Spilleren får et lands navn og skal klikke på riktig sted på verdenskartet.
// Verktøytips og landnavn er skrudd av (quiet), så det er formasjonen de gjetter på.
class MapQuiz extends BaseQuiz {
  build() {
    this.ready = false;
    this.locked = false;
    this.pathByIso = {};
    this.continentPool = new Set();
    const contInfo = (this.quiz.continents || []).find((c) => c.key === this.opts.continent);
    this.continent = this.opts.continent || 'Europe';
    this.difficulty = contInfo ? contInfo.label : this.continent;
  }

  render() {
    this.topHost = h('div', { class: 'quiz-top' });
    this.qHost = h('h2', { class: 'quiz-q-text', text: 'Forbereder kartet …' });
    const hint = h('p', { class: 'quiz-map-hint', text: 'Hold musen over kartet for å se landformene. Klikk på landet du tror er riktig.' });
    this.mapStage = h('div', { class: 'map-stage map-stage-quiz' },
      h('div', { class: 'map-loading', html: icon('globe', 22) + ' Laster verdenskartet …' }),
    );
    this.fbHost = h('div', { class: 'quiz-feedback', role: 'status' });
    this.actHost = h('div', { class: 'quiz-actions' });
    this.qWrap = h('div', { class: 'quiz-q quiz-q-map' },
      this.qHost,
      hint,
      this.mapStage,
      this.fbHost,
      this.actHost,
    );
    this.shell = h('div', { class: 'quiz-shell quiz-shell-map' }, this.topHost, this.qWrap);
    return this.shell;
  }

  async mount() {
    await loadMapOn(this.mapStage, (id, el) => this.guess(id, el), {
      quiet: true,
      ariaLabel: (c) => `${c.name}. Velg dette landet som svar.`,
    });
    this.afterMapReady();
  }

  afterMapReady() {
    const paths = qa('.country', this.mapStage);
    this.ready = true;
    if (!paths.length) {
      this.qHost.textContent = 'Kunne ikke laste kartet';
      this.fbHost.classList.add('is-bad');
      this.fbHost.innerHTML = `<span class="fb-icon">${icon('close', 18)}</span><div class="fb-text"><strong>Noe gikk galt.</strong><div class="explain">Kartet kunne ikke lastes. Last siden på nytt og prøv igjen.</div></div>`;
      this.actHost.appendChild(h('a', { class: 'btn btn-primary', href: '#/fag/quiz', html: 'Tilbake til quizer' + icon('arrow', 15) }));
      return;
    }
    this.buildPool(paths);
    this.index = 0;
    this.renderQuestion();
  }

  buildPool(paths) {
    this.pathByIso = {};
    for (const p of paths) {
      const c = countryByNumeric(p.getAttribute('data-numeric'));
      if (c) this.pathByIso[c.id] = p;
    }
    const pool = COUNTRIES.filter((c) =>
      c && c.flagFile && c.population > 0 &&
      this.pathByIso[c.id] &&
      this.regionKeyOfCountry(c) === this.continent,
    );
    this.continentPool = new Set(pool.map((c) => c.id));
    for (const id of Object.keys(this.pathByIso)) {
      const p = this.pathByIso[id];
      const show = this.continentPool.has(id);
      p.classList.toggle('is-dim', !show);
      p.setAttribute('aria-hidden', show ? 'false' : 'true');
    }
    const count = Math.min(this.quiz.count || 10, pool.length);
    this.questions = shuffle(pool).slice(0, count).map((c) => ({ id: c.id, name: c.name, c }));
  }

  regionKeyOfCountry(c) {
    const sub = (c.subregion || '').trim();
    const region = (c.region || '').trim();
    const cont = (c.continents && c.continents[0]) || '';
    if (cont === 'Americas' || region === 'Americas') {
      return sub === 'South America' ? 'South America' : 'North America';
    }
    return cont || region || '';
  }

  renderQuestion() {
    const qd = this.questions[this.index];
    if (!qd) { this.goToResult(); return; }
    this.locked = false;
    this.shell.classList.remove('is-locked');
    clear(this.topHost);
    this.topHost.appendChild(this.renderProgress());
    this.qHost.textContent = `Hvor ligger ${qd.name}?`;
    this.fbHost.classList.remove('is-good', 'is-bad');
    clear(this.fbHost);
    clear(this.actHost);
    for (const p of qa('.country', this.mapStage)) {
      p.classList.remove('is-correct', 'is-wrong', 'is-highlight');
    }
  }

  guess(id, el) {
    if (this.locked || !this.ready || !this.questions.length) return;
    const qd = this.questions[this.index];
    const clicked = countryByIso2(id);
    if (!clicked || !this.continentPool.has(id)) return;
    this.locked = true;
    this.shell.classList.add('is-locked');
    for (const p of qa('.country.is-highlight', this.mapStage)) p.classList.remove('is-highlight');
    if (id === qd.id) {
      this.score++;
      el.classList.add('is-correct');
      this.fbHost.classList.add('is-good');
      this.fbHost.innerHTML = `<span class="fb-icon">${icon('check', 18)}</span><div class="fb-text"><strong>Riktig!</strong><div class="explain">${qd.c.name} ligger her.${qd.c.capital ? ' Hovedstaden er ' + qd.c.capital + '.' : ''}</div></div>`;
    } else {
      el.classList.add('is-wrong');
      const correctPath = this.pathByIso[qd.id];
      if (correctPath) correctPath.classList.add('is-correct');
      this.fbHost.classList.add('is-bad');
      this.fbHost.innerHTML = `<span class="fb-icon">${icon('close', 18)}</span><div class="fb-text"><strong>Feil svar.</strong><div class="explain">${qd.c.name} ligger her – du klikket på ${clicked.name}.</div></div>`;
    }
    this.actHost.appendChild(h('button', { class: 'btn btn-primary', type: 'button', html: (this.index === this.questions.length - 1 ? 'Se resultat' : 'Neste') + icon('arrow', 15), onclick: () => this.next() }));
  }

  next() {
    this.index++;
    const qd = this.questions[this.index];
    if (!qd) { this.goToResult(); return; }
    this.renderQuestion();
  }

  goToResult() {
    const res = this.renderResult();
    if (this.el.parentElement) this.el.replaceWith(res);
    this.el = res;
  }

  restart() {
    this.score = 0;
    this.index = 0;
    this.buildPool(qa('.country', this.mapStage));
    if (this.el.parentElement) this.el.replaceWith(this.shell);
    this.el = this.shell;
    this.renderQuestion();
    if (this.el.scrollIntoView) this.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}