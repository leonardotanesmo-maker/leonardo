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
import { MAP_BBOX } from '../../data/mapBBox.js';
import { loadMapOn } from './map.js';
import { generateMathQuiz } from '../../data/mathGenerator.js';
import { track } from '../store.js';

const LETTERS = ['A', 'B', 'C', 'D'];

// Zoom-vinduer per verdensdel (i kartets brukerkoordinater, fra assets/map.svg).
// Håndjustert ut fra målte landgeometrier så landene blir store og lette å treffe.
// Vinduer dekker alle pool-landene selv om noen blir delvis beskåret (f.eks.
// Russland mot øst, Brasil mot sørøst). Merk av og til må disse kalibreres på nytt
// hvis assets/map.svg erstattes.
const MAP_ZOOMS = {
  Europe: { x0: 524, x1: 724, y0: 14, y1: 232 },
  Africa: { x0: 540, x1: 762, y0: 152, y1: 438 },
  Asia: { x0: 694, x1: 1044, y0: 92, y1: 342 },
  'North America': { x0: 104, x1: 588, y0: 8, y1: 282 },
  'South America': { x0: 330, x1: 470, y0: 238, y1: 462 },
  Oceania: { x0: 920, x1: 1140, y0: 295, y1: 482 },
};

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

// Deler en SVG-pa-banen `d` opp i delene sine (hver M gir én del) og regner
// ut bbox-en til hver del. Returnerer null hvis stien bruker andre kommandoer
// enn M/L/Z (da håndteres landet som én hel bbox).
function splitSubPathBBoxes(d) {
  if (!d || !/^M/.test(d)) return null;
  if (!/^[\d.,\-MLZ\s]+$/.test(d)) return null;
  const segs = d.split('M');
  const out = [];
  for (let i = 1; i < segs.length; i++) {
    const nums = (segs[i].replace(/[LZ]/g, ' ')).match(/-?\d*\.?\d+/g);
    if (!nums || nums.length < 4) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let k = 0; k + 1 < nums.length; k += 2) {
      const x = parseFloat(nums[k]);
      const y = parseFloat(nums[k + 1]);
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
    if (x1 >= x0 && y1 >= y0) out.push({ x0, y0, x1, y1 });
  }
  return out.length ? out : null;
}

// «Finn landet på kartet» – typen `map`.
// Du velger en verdensdel, så skal du klikke på riktig sted for hvert land i den
// verdensdelen. Landene du finner blir grønne og blir værende grønne. Når alle
// landene er funnet (hele verdensdelen er grønn), vinner du quizen.
// Verktøytips og landnavn er skrudd av (quiet), så det er formasjonen de gjetter på.
class MapQuiz extends BaseQuiz {
  build() {
    this.ready = false;
    this.won = false;
    this.fail = 0;
    this.hints = 10;
    this.found = new Set();
    this.pathByIso = {};
    this.continentPool = new Set();
    const contInfo = (this.quiz.continents || []).find((c) => c.key === this.opts.continent);
    this.continent = this.opts.continent || 'Europe';
    this.difficulty = contInfo ? contInfo.label : this.continent;
  }

  render() {
    this.panel = h('div', { class: 'quiz-hud' });
    this.mapStage = h('div', { class: 'map-stage map-stage-quiz' },
      h('div', { class: 'map-loading', html: icon('globe', 22) + ' Laster verdenskartet …' }),
    );
    this.shell = h('div', { class: 'quiz-shell quiz-shell-map' }, this.panel, this.mapStage);
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
      this.mapStage.appendChild(h('div', { class: 'quiz-map-overlay is-center' },
        h('div', { class: 'card result-card quiz-map-win' },
          h('div', { class: 'result-icon', html: icon('close', 44) }),
          h('div', { class: 'result-heading', text: 'Kunne ikke laste kartet' }),
          h('div', { class: 'result-sub', text: 'Last siden på nytt og prøv igjen.' }),
          h('div', { class: 'result-actions' },
            h('a', { class: 'btn btn-primary', href: '#/fag/quiz', text: 'Tilbake til quizer' }),
          ),
        ),
      ));
      return;
    }
    this.buildPool(paths);
    this.pending = this.questions.slice();
    this.advance();
    if (!this.zoomEl) {
      this.zoomEl = h('div', { class: 'map-zoom' },
        h('button', { class: 'map-zoom-btn', type: 'button', 'aria-label': 'Zoom inn', title: 'Zoom inn', html: icon('plus', 18), onclick: () => this.zoom(0.72) }),
        h('button', { class: 'map-zoom-btn', type: 'button', 'aria-label': 'Zoom ut', title: 'Zoom ut', html: icon('minus', 18), onclick: () => this.zoom(1.4) }),
        h('button', { class: 'map-zoom-btn', type: 'button', 'aria-label': 'Vis hele verdensdelen', title: 'Vis hele verdensdelen', html: icon('home', 18), onclick: () => this.applyContinentZoom() }),
      );
      this.mapStage.appendChild(this.zoomEl);
    }
  }

  buildPool(paths) {
    this.pathByIso = {};
    for (const p of paths) {
      const c = countryByNumeric(p.getAttribute('data-numeric'));
      if (c) this.pathByIso[c.id] = p;
    }
    const frame = MAP_ZOOMS[this.continent];
    let pool = COUNTRIES.filter((c) =>
      c && c.flagFile && c.population > 0 && this.pathByIso[c.id] &&
      this.regionKeyOfCountry(c) === this.continent,
    );
    // Hopp over land som ligger helt utenfor zoom-vinduet (kan ikke besvares).
    // Bruker statisk målte geometrier (MAP_BBOX) i stedet for getBBox, som gir
    // null-bokser mens kartet er løsrevet fra dokumentet.
    if (frame) {
      pool = pool.filter((c) => {
        const b = MAP_BBOX[c.id];
        if (!b) return true;
        return b[0] < frame.x1 && b[2] > frame.x0 && b[1] < frame.y1 && b[3] > frame.y0;
      });
    }
    this.continentPool = new Set(pool.map((c) => c.id));
    for (const id of Object.keys(this.pathByIso)) {
      const p = this.pathByIso[id];
      const show = this.continentPool.has(id);
      p.classList.toggle('is-dim', !show);
      p.setAttribute('aria-hidden', show ? 'false' : 'true');
      p.classList.remove('is-correct', 'is-wrong', 'is-highlight');
      if (p._wrongTimer) { clearTimeout(p._wrongTimer); p._wrongTimer = null; }
      p.style.fill = '';
      const svgEl = this.mapStage ? q('svg#world-map', this.mapStage) : null;
      if (svgEl) {
        qa('.country-flag', svgEl).forEach((f) => { if (f.parentElement) f.remove(); });
        const defs = q('defs', svgEl);
        if (defs) qa('clipPath[id^="flagclip-"]', defs).forEach((cp) => { if (cp.parentElement) cp.remove(); });
      }
    }
    this.questions = shuffle(pool).map((c) => ({ id: c.id, name: c.name, c }));
    this.total = this.questions.length;
    this.applyContinentZoom();
  }

  // Zoom kartet inn på kontinentet så landene blir store og lette å treffe.
  applyContinentZoom() {
    if (MAP_ZOOMS[this.continent]) this.setViewBox(MAP_ZOOMS[this.continent]);
  }

  setViewBox(z) {
    const svgEl = this.mapStage ? q('svg#world-map', this.mapStage) : null;
    if (!svgEl) return;
    svgEl.setAttribute('viewBox', `${z.x0} ${z.y0} ${z.x1 - z.x0} ${z.y1 - z.y0}`);
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

  // Hent neste land (i tilfeldig rekkefølge). Er alle funnet, vant du quizen.
  advance() {
    this.clearHint();
    if (this._fbTimer) { clearTimeout(this._fbTimer); this._fbTimer = null; }
    this.current = this.pending.pop() || null;
    if (!this.current) {
      this.won = true;
      this.shell.classList.add('is-done');
      this.setViewBox({ x0: 0, y0: 0, x1: 1200, y1: 600 });
      this.goToResult();
      return;
    }
    this.renderPanelPlay();
  }

  renderPanelPlay() {
    this.removeOverlay();
    if (this.fbHost && this.fbHost.parentElement) this.fbHost.remove();
    clear(this.panel);
    const foundN = this.found.size;
    const pct = this.total ? Math.round((foundN / this.total) * 100) : 0;
    this.fbHost = h('div', { class: 'quiz-feedback quiz-fb-float', role: 'status' });
    this.mapStage.appendChild(this.fbHost);
    this.panel.append(
      h('div', { class: 'map-hud' },
        h('div', { class: 'map-hud-top' },
          h('span', { class: 'map-eyebrow' }, h('span', { class: 'ey-dot' }), this.difficulty.toUpperCase()),
          h('div', { class: 'map-counts' },
            h('span', { class: 'map-counter is-ok', title: 'Riktige svar' },
              h('span', { class: 'cnt-dot' }), ' Riktige ', h('b', { text: String(foundN) })),
            h('span', { class: 'map-counter is-bad', title: 'Feil svar' },
              h('span', { class: 'cnt-dot' }), ' Feil ', h('b', { text: String(this.fail) })),
            h('button', { class: 'map-hint-btn', type: 'button', title: 'Vis et stort sirkel-hint rundt hvor landet ligger (varer i 5 sekunder)', onclick: () => this.useHint() },
              h('span', { class: 'hint-ico', html: icon('target', 15) }),
              h('span', { class: 'hint-label', text: 'Tips' }),
              h('b', { class: 'hint-count', text: String(this.hints) })),
          ),
        ),
        h('h2', { class: 'quiz-q-text' }, 'Finn: ', h('span', { class: 'q-name', text: this.current.name })),
        h('div', { class: 'map-progress' },
          h('span', { class: 'map-found', text: `${foundN} / ${this.total}` }),
          h('div', { class: 'quiz-track' }, h('div', { class: 'quiz-fill', style: { width: pct + '%' } })),
        ),
      ),
    );
    // Forklaring vises bare i starten av runden, så hele skjermen går til kartet.
    if (foundN === 0 && this.fail === 0) {
      this.panel.append(h('p', { class: 'quiz-map-hint', text: this.hintText() }));
    }
  }

  removeOverlay() {
    if (!this.mapStage) return;
    const host = q('.quiz-map-overlay', this.mapStage);
    if (host && host.parentElement) host.remove();
  }

  hintText() {
    return `Kartet er zoomet inn på ${this.difficulty}. Landformene er den eneste ledetråden – klikk på landet som vises. Sitter du fast, bruk «Tips» for å se et stort sirkel-hint rundt der landet (sånn cirka) ligger.`;
  }

  updateCounters() {
    const okN = q('.map-counter.is-ok b', this.panel);
    const badN = q('.map-counter.is-bad b', this.panel);
    const found = q('.map-found', this.panel);
    const fill = q('.quiz-fill', this.panel);
    const foundN = this.found.size;
    if (okN) okN.textContent = String(foundN);
    if (badN) badN.textContent = String(this.fail);
    if (found) found.textContent = `${foundN} / ${this.total}`;
    if (fill) fill.style.width = (this.total ? Math.round((foundN / this.total) * 100) : 0) + '%';
  }

  updateHintBtn() {
    const btn = q('.map-hint-btn', this.panel);
    if (!btn) return;
    btn.classList.toggle('is-out', this.hints <= 0);
    btn.disabled = this.hints <= 0;
    const c = q('.hint-count', btn);
    if (c) c.textContent = String(this.hints);
  }

  // Tipset tegner et stort sirkel-hint rundt (omtrentlig) hvor landet ligger.
  // Det viser ikke den nøyaktige plasseringen – bare «sånn cirka i dette området».
  useHint() {
    if (!this.ready || this.won || !this.current || this.hints <= 0) return;
    const svgEl = this.mapStage ? q('svg#world-map', this.mapStage) : null;
    if (!svgEl) return;
    this.clearHint();
    this.hints -= 1;
    this.updateHintBtn();

    const bb = MAP_BBOX[this.current.id];
    const cx = bb ? (bb[0] + bb[2]) / 2 : 960;
    const cy = bb ? (bb[1] + bb[3]) / 2 : 300;
    // R er minst 26, og ellers stor nok til å romme landet (pluss litt luft).
    let r = bb ? (Math.max(bb[2] - bb[0], bb[3] - bb[1]) / 2) * 1.35 : 34;
    r = Math.max(26, Math.min(r, 190));

    // Sirkelen legges til som SVG-streng (h() lager HTML-elementer som ikke tegnes i SVG).
    svgEl.insertAdjacentHTML('beforeend',
      `<circle class="map-hint-ring" cx="${cx}" cy="${cy}" r="${r}" aria-hidden="true"></circle>`);

    if (this._hintTimer) clearTimeout(this._hintTimer);
    this._hintTimer = setTimeout(() => {
      this._hintTimer = null;
      const c = q('.map-hint-ring', svgEl);
      if (c && c.parentElement) c.remove();
    }, 5000);
  }

  clearHint() {
    if (this._hintTimer) { clearTimeout(this._hintTimer); this._hintTimer = null; }
    if (!this.mapStage) return;
    const c = q('.map-hint-ring', this.mapStage);
    if (c && c.parentElement) c.remove();
  }

  // Fyller landet med flagget sitt, klippet inn i landets egen fasong.
  markFound() {
    const svgEl = this.mapStage ? q('svg#world-map', this.mapStage) : null;
    const c = this.current && this.current.c;
    const id = this.current && this.current.id;
    if (!svgEl || !c || !c.flagFile) return;
    const pathEl = this.pathByIso[id];
    if (!pathEl || q('.country-flag[data-iso="' + id + '"]', svgEl)) return;
    // Landets faktiske avgrensning. Delte land (f.eks. Frankrike fastland +
    // oversjøiske territorier i samme sti) deles i underpunkter, og vi velger
    // den største synlige delen – ellers ville flagget blitt strukket over hele
    // bbox-en og bare én stripe blitt synlig.
    const dAttr = pathEl.getAttribute ? pathEl.getAttribute('d') : null;
    const subs = dAttr ? splitSubPathBBoxes(dAttr) : null;
    const svb = svgEl.getAttribute('viewBox');
    const sv = svb ? svb.split(' ').map(Number) : null;
    const vx0 = sv && sv[2] > 0 ? sv[0] : -Infinity;
    const vy0 = sv && sv[3] > 0 ? sv[1] : -Infinity;
    const vx1 = sv && sv[2] > 0 ? sv[0] + sv[2] : Infinity;
    const vy1 = sv && sv[3] > 0 ? sv[1] + sv[3] : Infinity;
    let x0, y0, x1, y1;
    if (subs && subs.length) {
      let bestArea = -1;
      for (const b of subs) {
        const cx0 = Math.max(b.x0, vx0); const cy0 = Math.max(b.y0, vy0);
        const cx1 = Math.min(b.x1, vx1); const cy1 = Math.min(b.y1, vy1);
        if (!(cx1 > cx0) || !(cy1 > cy0)) continue;
        const area = (cx1 - cx0) * (cy1 - cy0);
        if (area > bestArea) {
          bestArea = area;
          x0 = cx0; y0 = cy0; x1 = cx1; y1 = cy1;
        }
      }
    }
    if (x0 === undefined) {
      const live = pathEl.getBBox ? pathEl.getBBox() : null;
      if (live && live.width > 1 && live.height > 1) {
        x0 = live.x; y0 = live.y;
        x1 = live.x + live.width; y1 = live.y + live.height;
      } else {
        const bb = MAP_BBOX[id];
        if (!bb) return;
        [x0, y0, x1, y1] = bb;
      }
      x0 = Math.max(x0, vx0); y0 = Math.max(y0, vy0);
      x1 = Math.min(x1, vx1); y1 = Math.min(y1, vy1);
    }
    const w = x1 - x0;
    const h = y1 - y0;
    if (!(w > 0) || !(h > 0)) return;
    if (!svgEl.getAttribute('xmlns:xlink')) svgEl.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    pathEl.setAttribute('id', 'fp-' + id);
    const clipId = 'flagclip-' + id;
    if (!q('#' + clipId, svgEl)) {
      let defs = q('defs', svgEl);
      if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svgEl.insertBefore(defs, svgEl.firstChild);
      }
      defs.insertAdjacentHTML('beforeend',
        `<clipPath id="${clipId}"><use href="#fp-${id}" xlink:href="#fp-${id}"></use></clipPath>`);
    }
    svgEl.insertAdjacentHTML('beforeend',
      `<image class="country-flag" data-iso="${id}" href="${c.flagFile}" xlink:href="${c.flagFile}" x="${x0}" y="${y0}" width="${w}" height="${h}" preserveAspectRatio="none" clip-path="url(#${clipId})" aria-hidden="true"></image>`);
  }

  // Zoom inn/ut rundt midten av det som vises, uten å gå utenfor verdenskartet.
  zoom(factor) {
    const svgEl = this.mapStage ? q('svg#world-map', this.mapStage) : null;
    if (!svgEl) return;
    const vb = (svgEl.getAttribute('viewBox') || '').split(' ').map(Number);
    if (vb.length !== 4 || vb.some((n) => !Number.isFinite(n))) return;
    const [vx, vy, vw, vh] = vb;
    const cx = vx + vw / 2;
    const cy = vy + vh / 2;
    let nw = Math.min(vw * factor, 1200);
    let nh = Math.min(vh * factor, 600);
    nw = Math.max(nw, 40);
    nh = Math.max(nh, 40);
    const nx = Math.max(0, Math.min(cx - nw / 2, 1200 - nw));
    const ny = Math.max(0, Math.min(cy - nh / 2, 600 - nh));
    svgEl.setAttribute('viewBox', `${nx} ${ny} ${nw} ${nh}`);
  }

  guess(id, el) {
    if (!this.ready || this.won || !this.current) return;
    if (this._fbTimer) { clearTimeout(this._fbTimer); this._fbTimer = null; }
    const clicked = countryByIso2(id);
    if (!clicked) return;
    if (!this.continentPool.has(id)) {
      this.fbHost.classList.remove('is-good', 'is-bad');
      this.fbHost.innerHTML = `<span class="fb-chip">${icon('target', 16)}</span><div class="fb-text">Klikk innenfor ${this.difficulty} – ${clicked.name} ligger utenfor.</div>`;
      return;
    }
    if (this.found.has(id)) {
      this.fbHost.classList.remove('is-good', 'is-bad');
      this.fbHost.innerHTML = `<span class="fb-chip">${icon('check', 16)}</span><div class="fb-text"><strong>Allerede funnet.</strong><div class="explain">${clicked.name} er ferdig. Finn ${this.current.name}.</div></div>`;
      return;
    }
    if (id === this.current.id) {
      this.found.add(id);
      el.classList.remove('is-wrong');
      el.classList.add('is-correct');
      this.markFound();
      this.fbHost.classList.add('is-good');
      const praise = ['Riktig!', 'Flott!', 'Der ja!', 'Midt i blinken!', 'Kjempebra!', 'Nesten som en globus-professor!'];
      this.fbHost.innerHTML = `<span class="fb-chip">${icon('check', 16)}</span><div class="fb-text"><strong>${praise[Math.floor(Math.random() * praise.length)]}</strong><div class="explain">${this.current.name} ligger her.${this.current.c.capital ? ' Hovedstaden er ' + this.current.c.capital + '.' : ''}</div></div>`;
      this.updateCounters();
      if (this._advanceTimer) clearTimeout(this._advanceTimer);
      this._advanceTimer = setTimeout(() => { this._advanceTimer = null; this.advance(); }, 900);
    } else {
      this.fail++;
      el.classList.remove('is-correct');
      el.classList.add('is-wrong');
      if (el._wrongTimer) clearTimeout(el._wrongTimer);
      el._wrongTimer = setTimeout(() => {
        el._wrongTimer = null;
        if (el.classList) el.classList.remove('is-wrong');
      }, 2000);
      this.fbHost.classList.add('is-bad');
      this.fbHost.innerHTML = `<span class="fb-chip">${icon('close', 16)}</span><div class="fb-text"><strong>Feil svar.</strong><div class="explain">Du klikket på ${clicked.name}. ${this.current.name} ligger et annet sted – prøv igjen.</div></div>`;
      this._fbTimer = setTimeout(() => {
        this._fbTimer = null;
        this.hideFeedback();
      }, 3000);
      this.updateCounters();
    }
  }

  hideFeedback() {
    if (!this.fbHost || !this.fbHost.parentElement) return;
    this.fbHost.classList.remove('is-good', 'is-bad');
    this.fbHost.innerHTML = '';
  }

  goToResult() {
    this.removeOverlay();
    if (this.fbHost && this.fbHost.parentElement) this.fbHost.remove();
    clear(this.panel);
    const total = this.total || this.found.size;
    const fail = this.fail;
    const acc = total + fail ? Math.round((total / (total + fail)) * 100) : 100;
    const praise = acc >= 100 ? 'Perfekt! Hvert eneste land satt på første forsøk.'
      : acc >= 90 ? 'Kjempebra! Nesten ikke et feiltrykk.'
      : acc >= 70 ? 'Godt jobbet – du vet godt hvor ting ligger.'
      : acc >= 50 ? 'Du er på vei. Prøv igjen for færre feil!'
      : 'Øv litt til som lokalkjent – så sitter det mye bedre.';
    const card = h('div', { class: 'card result-card quiz-map-win' },
      h('div', { class: 'map-win-badge' },
        h('div', { class: 'result-icon', html: icon('trophy', 30) }),
        h('p', { class: 'map-win-eyebrow', text: 'GJENNOMFØRT' }),
      ),
      h('div', { class: 'result-heading', text: `Du fant alle ${total} landene${this.difficulty ? ' i ' + this.difficulty : ''}!` }),
      this.ring(acc),
      h('div', { class: 'result-sub', text: praise }),
      h('div', { class: 'result-stats' },
        h('div', { class: 'rs-item is-good' }, h('div', { class: 'rs-icon', html: icon('check', 16) }), h('div', {}, h('div', { class: 'rs-num', text: String(total) }), h('div', { class: 'rs-label', text: 'Riktige' }))),
        h('div', { class: 'rs-item is-bad' }, h('div', { class: 'rs-icon', html: icon('close', 16) }), h('div', {}, h('div', { class: 'rs-num', text: String(fail) }), h('div', { class: 'rs-label', text: 'Feil' }))),
        h('div', { class: 'rs-item is-meta' }, h('div', { class: 'rs-icon', html: icon('flag', 16) }), h('div', {}, h('div', { class: 'rs-num', text: String(total + fail) }), h('div', { class: 'rs-label', text: 'Klikk totalt' }))),
      ),
      h('div', { class: 'result-actions' },
        h('button', { class: 'btn btn-primary', type: 'button', html: icon('play', 16) + ' Spill igjen', onclick: () => this.restart() }),
        h('a', { class: 'btn btn-ghost', href: '#/fag/' + this.quiz.subject, html: icon('book', 16) + ' Faget' }),
        h('a', { class: 'btn btn-ghost', href: '#/fag/quiz', html: icon('bolt', 16) + ' Andre quizer' }),
      ),
    );
    this.mapStage.appendChild(h('div', { class: 'quiz-map-overlay is-center' }, card));
  }

  // Prosentring som drar seg rundt når vinnskjermen vises.
  ring(acc) {
    const R = 42;
    const CIRC = (2 * Math.PI * R).toFixed(2);
    const host = h('span', { class: 'quiz-win-ring-wrap' });
    host.innerHTML = `<svg class="quiz-win-ring" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#3a5bd9"/>
          <stop offset="0.55" stop-color="#5b4ad1"/>
          <stop offset="1" stop-color="#7b5cd6"/>
        </linearGradient>
      </defs>
      <circle class="rr-track" cx="50" cy="50" r="${R}"/>
      <circle class="rr-val" cx="50" cy="50" r="${R}" transform="rotate(-90 50 50)"/>
      <text class="rr-num" x="50" y="50" text-anchor="middle">${acc}<tspan class="rr-unit">%</tspan></text>
    </svg>`;
    const val = host.querySelector('.rr-val');
    val.style.strokeDasharray = CIRC;
    val.style.strokeDashoffset = CIRC;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      val.style.strokeDashoffset = (CIRC * (1 - acc / 100)).toFixed(2);
    }));
    return host;
  }

  restart() {
    if (this._advanceTimer) clearTimeout(this._advanceTimer);
    if (this._wrongTimer) clearTimeout(this._wrongTimer);
    this.won = false;
    this.fail = 0;
    this.hints = 10;
    this.found = new Set();
    this.clearHint();
    this.shell.classList.remove('is-done');
    this.buildPool(qa('.country', this.mapStage));
    this.pending = this.questions.slice();
    this.advance();
    if (this.shell.scrollIntoView) this.shell.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}