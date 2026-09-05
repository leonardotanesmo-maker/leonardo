// Leonardo – quizmotoren (valg-, flagg- og innskrivingstype)
import { h, q, qa } from '../dom.js';
import { icon } from '../icons.js';
import { COUNTRIES, formatPopulation } from '../../data/countries.js';
import { track } from '../store.js';

const LETTERS = ['A', 'B', 'C', 'D'];

// Forhindrer prototype-pollution-relaterte problemer i bygd regex
function clean(s) {
  return String(s || '').replace(/[^\p{L}\p{N} ]/gu, '').trim();
}

export function quizRunner(quiz, onDone) {
  track('quiz', quiz.id, quiz.title);

  if (quiz.type === 'drill') return new Drill(quiz, onDone);
  return new ChoiceQuiz(quiz, onDone);
}

class BaseQuiz {
  constructor(quiz, onDone) {
    this.quiz = quiz;
    this.onDone = onDone;
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
    const pct = Math.round((this.score / total) * 100);
    const praise = pct === 100 ? 'Perfekt!' : pct >= 80 ? 'Kjempebra!' : pct >= 60 ? 'Godt jobbet!' : 'Øv litt til – du klarer det!';
    return h('div', { class: 'card result-card' },
      h('div', { class: 'result-icon', html: icon(pct === 100 ? 'trophy' : 'target', 40) }),
      h('div', { class: 'result-score', html: `${this.score}<small> / ${total}</small>` }),
      h('div', { class: 'result-sub', text: praise }),
      h('div', { class: 'result-sub', text: `Du svarte riktig på ${pct} % av spørsmålene.` }),
      h('div', { class: 'result-actions' },
        h('button', { class: 'btn btn-primary', type: 'button', html: icon('play', 16) + ' Prøv igjen', onclick: () => restart(this) }),
        h('a', { class: 'btn btn-ghost', href: '#/fag/' + this.quiz.subject, text: 'Til faget' }),
      ),
    );
  }
}

function restart(instance) {
  instance.index = 0;
  instance.score = 0;
  instance.questions = [];
  instance.build();
  const parent = instance.el.parentElement;
  const el = instance.render();
  instance.el.replaceWith(el);
  instance.el = el;
}

class ChoiceQuiz extends BaseQuiz {
  build() {
    if (this.quiz.type === 'flag') {
      const picked = shuffle(COUNTRIES.filter((c) => c.flagFile && c.population > 0)).slice(0, Math.min(this.quiz.count || 10, 12));
      this.questions = picked.map((ref) => {
        const wrong = shuffle(COUNTRIES.filter((c) => c.id !== ref.id && c.flagFile)).slice(0, 3).map((c) => c.name);
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
    } else {
      this.questions = this.quiz.questions.map((qq) => ({ ...qq }));
    }
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
    // deaktiver alle svar
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
    const tables = this.quiz.tables || [2, 3, 4, 5];
    const qs = [];
    for (let i = 0; i < (this.quiz.count || 10); i++) {
      const a = tables[Math.floor(Math.random() * tables.length)];
      const b = 1 + Math.floor(Math.random() * 10);
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
    // godta "4*3"-stil? nei – kun rene tall
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

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}