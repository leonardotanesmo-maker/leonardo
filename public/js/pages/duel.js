// Leonardo – duell: møte en klassekamerat ansikt til ansikt over nettet.
//
// Valg av fag, quiz og vanskelighetsgrad skjer hos den som lager en duell
// (verten). Motstanderen skriver inn duellkoden og blir med – dere får de
// samme spørsmålene, og den med flest riktige svar vinner. Ved likt antall
// riktige vinner den som var raskest.
import { h, q, qa, clear, esc } from '../dom.js';
import { icon } from '../icons.js';
import { crumbs } from '../components.js';
import { SUBJECTS, QUIZZES, subjectBySlug } from '../data.js';
import { buildDuelQuestions } from '../components/duelQuestions.js';
import { DuelNet, makeCode } from '../components/duelNet.js';

const DIFFS = [
  { key: 'easy', icon: 'sparkles', desc: 'Enkle spørsmål som bygger grunnmuren.' },
  { key: 'medium', icon: 'target', desc: 'Litt vanskeligere – du må tenke deg om.' },
  { key: 'hard', icon: 'bolt', desc: 'Skikkelig krevende. Klarer du alle?' },
];
const DIFF_LABELS = { easy: 'Lett', medium: 'Middels', hard: 'Vanskelig' };
const LETTERS = ['A', 'B', 'C', 'D'];
const ELIGIBLE_QUIZZES = QUIZZES.filter((qz) => qz.type !== 'map');

function eligibleSubjects() {
  return SUBJECTS.filter((s) => s.slug !== 'quiz' && s.activities.some((a) => {
    if (a.kind !== 'quiz') return false;
    const qz = QUIZZES.find((z) => z.id === a.id);
    return qz && qz.type !== 'map';
  }));
}

export function renderDuel({ params }) {
  const autoCode = params && params.kode ? decodeURIComponent(params.kode).toUpperCase().trim() : null;

  const stage = h('div');
  const el = h('div', { class: 'container page-pad' },
    crumbs([{ label: 'Hjem', href: '#/' }, { label: 'Duell' }]),
    h('div', { class: 'duel-hero' },
      h('span', { class: 'eyebrow', html: icon('users', 13) + ' To spillere · èn skjerm hver' }),
      h('h1', { html: 'Utfordrer en klassekamerat til <span class="grad-text">duell</span>' }),
      h('p', { text: 'Lag en duell og få en kode. Klassokameraten din skriver inn koden og er med med en gang – dere svarer på de samme spørsmålene, og den med flest riktige vinner.' }),
    ),
    stage,
  );

  const M = {
    net: null,
    role: null,
    code: null,
    cfg: null,
    questions: null,
    phase: 'idle',
    index: 0,
    answered: 0,
    score: 0,
    timeMs: 0,
    t0: 0,
    done: false,
    matchStarted: false,
    goSent: false,
    myReady: false,
    myAgain: false,
    partnerReady: false,
    partnerDone: false,
    partnerScore: 0,
    partnerAnswered: 0,
    partnerTimeMs: 0,
    partnerAgain: false,
  };

  function teardown() {
    if (M.net) { M.net.destroy(); M.net = null; }
  }

  function setPhase(p) { M.phase = p; }

  function renderTo(inner) {
    clear(stage);
    stage.appendChild(inner);
  }

  function setCfg(cfg) {
    M.cfg = cfg;
    M.questions = cfg.questions;
  }

  // -------- landing --------
  function renderLanding() {
    M.phase = 'landing';
    const maze = h('div', { class: 'duel-actions' },
      h('button', { class: 'duel-action-card', type: 'button', onclick: renderSubjectPick },
        h('span', { class: 'duel-action-icon', html: icon('plus', 26) }),
        h('span', { class: 'duel-action-title', text: 'Opprett en duell' }),
        h('span', { class: 'duel-action-desc', text: 'Velg fag, quiz og vanskelighetsgrad – så får du en kode.' }),
      ),
      h('button', { class: 'duel-action-card', type: 'button', onclick: renderJoin },
        h('span', { class: 'duel-action-icon', html: icon('arrow', 26) }),
        h('span', { class: 'duel-action-title', text: 'Bli med med kode' }),
        h('span', { class: 'duel-action-desc', text: 'Har du fått en kode? Skriv den inn og bli med motstanderen.' }),
      ),
    );

    const how = h('div', { class: 'duel-how' },
      h('div', { class: 'setup-head' }, h('h2', { text: 'Slik fungerer det' }),
        h('p', { text: 'Duellen går direkte mellom de to maskinene – det trengs ingen konto eller innlogging.' })),
      h('div', { class: 'duel-steps' },
        h('div', { class: 'duel-step' }, h('span', { class: 'duel-step-num', text: '1' }), h('span', { text: 'Opprett en duell og få en kode' })),
        h('div', { class: 'duel-step' }, h('span', { class: 'duel-step-num', text: '2' }), h('span', { text: 'Klassekameraten skriver inn koden' })),
        h('div', { class: 'duel-step' }, h('span', { class: 'duel-step-num', text: '3' }), h('span', { text: 'Dere svarer på samme spørsmål – flest riktige vinner!' })),
      ),
    );

    renderTo(h('div', {}, maze, how));
  }

  // -------- opprett: fag → quiz → vanskelighetsgrad --------
  function renderSubjectPick() {
    M.phase = 'pick-subject';
    const grid = h('div', { class: 'setup-grid duel-subject-grid', style: 'grid-template-columns:repeat(3,minmax(0,1fr))' },
      ...eligibleSubjects().map((s) => h('button', { class: 'setup-card', type: 'button', onclick: () => renderQuizPick(s) },
        h('span', { class: 'setup-icon', html: icon(s.icon, 26) }),
        h('span', { class: 'setup-label', text: s.name }),
        h('span', { class: 'setup-desc', text: s.tagline }),
      )),
    );
    renderTo(h('div', {}, setupShell('1 · Velg fag', 'Hva skal dere konkurrere i?', grid)));
  }

  function renderQuizPick(sub) {
    M.phase = 'pick-quiz';
    const qzs = ELIGIBLE_QUIZZES.filter((z) => z.subject === sub.slug);
    const grid = h('div', { class: 'setup-grid', style: 'grid-template-columns:repeat(2,minmax(0,1fr))' },
      ...qzs.map((qz) => h('button', { class: 'setup-card', type: 'button', onclick: () => renderDifficultyPick(qz) },
        h('span', { class: 'setup-icon', html: icon(qz.icon || 'bolt', 24) }),
        h('span', { class: 'setup-label', text: qz.title }),
        h('span', { class: 'setup-desc', text: qz.description }),
      )),
    );
    renderTo(h('div', {}, setupShell('2 · Velg quiz', 'Velg hvilke oppgaver duellen skal bestå av.', grid, renderSubjectPick, '1 · Velg fag')));
  }

  function renderDifficultyPick(qz) {
    M.phase = 'pick-difficulty';
    const cards = h('div', { class: 'setup-grid', style: 'grid-template-columns:repeat(3,minmax(0,1fr))' },
      ...DIFFS.map((d) => h('button', { class: 'setup-card diff-card diff-' + d.key, type: 'button', onclick: () => startHost(qz, d.key) },
        h('span', { class: 'setup-icon', html: icon(d.icon, 26) }),
        h('span', { class: 'setup-label', text: DIFF_LABELS[d.key] }),
        h('span', { class: 'setup-desc', text: d.desc }),
      )),
    );
    renderTo(h('div', {}, setupShell('3 · Velg vanskelighetsgrad', 'Så velger vi hvor vanskelig oppgavene skal bli for dere begge.', cards, () => renderQuizPick(subjectsOf(qz)), '2 · Velg quiz')));
  }

  function subjectsOf(qz) {
    return subjectBySlug(qz.subject);
  }

  function setupShell(title, desc, content, onBack, backLabel) {
    return h('div', { class: 'setup-shell card' },
      h('div', { class: 'setup-head' },
        h('h2', { text: title }),
        h('p', { text: desc }),
        onBack ? h('button', { class: 'btn btn-ghost btn-sm', type: 'button', html: icon('arrow', 14) + ' Tilbake', onclick: onBack }) : null,
      ),
      content,
    );
  }

  // -------- verten lager lobby --------
  async function startHost(qz, difficulty) {
    const cfg = {
      quizId: qz.id,
      title: qz.title,
      icon: qz.icon || 'bolt',
      subject: qz.subject,
      difficulty,
      total: 0,
      questions: buildDuelQuestions(qz, difficulty),
    };
    if (!cfg.questions || !cfg.questions.length) {
      renderTo(h('div', { class: 'card setup-shell' }, h('p', { text: 'Kunne ikke lage spørsmål til denne quizen. Prøv en annen.' })));
      return;
    }
    cfg.total = cfg.questions.length;
    setCfg(cfg);

    M.role = 'host';
    setPhase('lobby-host');
    M.code = makeCode();
    renderHostLobby('Kobler til duell-tjenesten …', false, false);
    resetMatchState();

    const net = new DuelNet({ role: 'host', onData: hostOnData, onPeerClose: () => onPeerLeft() });
    M.net = net;
    try {
      await net.connect(M.code);
      M.code = net.code;
      net.send({ t: 'cfg', cfg: M.cfg });
      M.partnerReady = false;
      renderHostLobby('Motstanderen er med. Trykk start når dere er klare!', true, false);
    } catch (err) {
      renderHostLobby(err.message || 'Kunne ikke opprette duellen.', false, true);
    }
  }

  function renderHostLobby(statusText, connected, failed) {
    const codeRow = h('div', { class: 'duel-code-wrap' },
      h('span', { class: 'duel-code-label', text: 'Duellkode' }),
      h('div', { class: 'duel-code', 'aria-label': 'Duellkoden er ' + M.code }, M.code),
      h('div', { class: 'duel-code-hint', text: 'Klassekameraten din skriver inn denne koden under «Bli med med kode».' }),
    );

    const status = h('p', { class: failed ? 'duel-err' : 'duel-status', text: statusText });

    const startBtn = h('button', { class: 'btn btn-primary btn-lg', type: 'button', disabled: !connected || failed, text: 'Start duellen', onclick: hostStart });

    renderTo(h('div', { class: 'duel-lobby card' },
      h('div', { class: 'duel-lobby-head' },
        h('span', { class: 'setup-icon', html: icon(M.cfg.icon, 24) }),
        h('div', {},
          h('h2', { text: 'Duellen din' }),
          h('p', { text: duelInfo(M.cfg) }),
        ),
      ),
      codeRow,
      status,
      h('div', { class: 'duel-lobby-actions' },
        startBtn,
        h('button', { class: 'btn btn-ghost', type: 'button', text: 'Avbryt', onclick: () => { teardown(); renderLanding(); } }),
      ),
    ));
  }

  function hostStart() {
    M.myReady = true;
    M.net.send({ t: 'ready' });
    if (M.partnerReady && !M.goSent) {
      M.net.send({ t: 'go' });
      M.goSent = true;
      startMatch();
    } else {
      renderToLobbyText('Du er klar. Venter på at motstanderen blir klar …');
      M.phase = 'lobby-wait';
    }
  }

  function hostOnData(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'ready') {
      M.partnerReady = true;
      if (M.myReady && !M.goSent) {
        M.net.send({ t: 'go' });
        M.goSent = true;
        startMatch();
      }
    } else if (msg.t === 'prog') {
      updatePartner(msg);
    } else if (msg.t === 'again') {
      M.partnerAgain = true;
      maybeRematch();
    }
  }

  // -------- bli med: skriv kode --------
  function renderJoin() {
    M.phase = 'join';
    const input = h('input', { class: 'text-input duel-code-input', type: 'text', autocomplete: 'off', placeholder: 'F.eks. K7Q2X', 'aria-label': 'Skriv inn duellkoden', maxlength: '8' });
    const err = h('div', { class: 'duel-err', 'aria-live': 'polite' });

    function normalize() { return (input.value || '').toUpperCase().replace(/\s/g, ''); }
    function tryJoin() {
      const code = normalize();
      if (!code) { err.textContent = 'Skriv inn koden du fikk fra motstanderen.'; return; }
      err.textContent = '';
      renderJoinLobby(code);
    }
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryJoin(); });
    input.addEventListener('input', () => { if (normalize().length) err.textContent = ''; });

    renderTo(h('div', { class: 'card setup-shell duel-join' },
      h('div', { class: 'setup-head' },
        h('h2', { text: 'Bli med med kode' }),
        h('p', { text: 'Fikk du en duellkode fra en klassekamerat? Skriv den inn her og bli med i kampen.' }),
      ),
      input,
      h('div', { class: 'duel-lobby-actions' },
        h('button', { class: 'btn btn-primary btn-lg', type: 'button', html: icon('arrow', 18) + ' Bli med', onclick: tryJoin }),
        h('button', { class: 'btn btn-ghost', type: 'button', text: 'Tilbake', onclick: renderLanding }),
      ),
      err,
    ));
  }

  function renderJoinLobby(code) {
    setPhase('join-connecting');
    renderTo(h('div', { class: 'duel-lobby card' },
      h('h2', { text: 'Kobler til duellen …' }),
      h('p', { class: 'duel-status', text: `Kode ${code} · Venter på at motstanderen godtar koblingen.` }),
      h('button', { class: 'btn btn-ghost', type: 'button', text: 'Avbryt', onclick: () => { teardown(); renderJoin(); } }),
    ));

    M.role = 'guest';
    M.code = code;
    const net = new DuelNet({ role: 'guest', onData: guestOnData, onPeerClose: () => onPeerLeft() });
    M.net = net;
    net.connect(code).catch((err) => {
      renderJoinError(err.message || 'Kunne ikke finne duellen med den koden.');
    });
  }

  function renderJoinError(message) {
    setPhase('join-error');
    renderTo(h('div', { class: 'duel-lobby card' },
      h('h2', { text: 'Kunne ikke bli med' }),
      h('p', { class: 'duel-err', text: message }),
      h('div', { class: 'duel-lobby-actions' },
        h('button', { class: 'btn btn-primary', type: 'button', text: 'Prøv igjen', onclick: renderJoin }),
        h('button', { class: 'btn btn-ghost', type: 'button', text: 'Til duellstart', onclick: renderLanding }),
      ),
    ));
  }

  function guestOnData(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'cfg') {
      setCfg(msg.cfg);
      setPhase('join-confirm');
      renderJoinConfirm();
    } else if (msg.t === 'go') {
      startMatch();
    } else if (msg.t === 'prog') {
      updatePartner(msg);
    } else if (msg.t === 'again') {
      M.partnerAgain = true;
      maybeRematch();
    }
  }

  function renderJoinConfirm() {
    const btnReady = h('button', { class: 'btn btn-primary btn-lg', type: 'button', text: 'Klar – start duellen', onclick: () => {
      M.myReady = true;
      M.net.send({ t: 'ready' });
      M.phase = 'join-waiting-start';
      renderToLobbyText('Du er klar. Venter på at motstanderen starter …');
    } });

    renderTo(h('div', { class: 'duel-lobby card' },
      h('div', { class: 'duel-lobby-head' },
        h('span', { class: 'setup-icon', html: icon(M.cfg.icon || 'bolt', 24) }),
        h('div', {},
          h('h2', { text: 'Du har blitt utfordret!' }),
          h('p', { text: duelInfo(M.cfg) }),
        ),
      ),
      h('p', { class: 'duel-status', text: 'Når begge har trykket klar, starter duellen automatisk.' }),
      h('div', { class: 'duel-lobby-actions' },
        btnReady,
        h('button', { class: 'btn btn-ghost', type: 'button', text: 'Forlat duellen', onclick: () => { teardown(); renderLanding(); } }),
      ),
    ));
  }

  function renderToLobbyText(text) {
    renderTo(h('div', { class: 'duel-lobby card' },
      h('h2', { text: 'Duellen din' }),
      h('p', { class: 'duel-status', text }),
      h('button', { class: 'btn btn-ghost', type: 'button', text: 'Avbryt', onclick: () => { teardown(); renderLanding(); } }),
    ));
  }

  function duelInfo(cfg) {
    const subj = subjectBySlug(cfg.subject);
    return `${cfg.title} (${DIFF_LABELS[cfg.difficulty] || cfg.difficulty}) · ${cfg.total} spørsmål${subj ? ' · ' + subj.name : ''}`;
  }

  // -------- selve duellen --------
  function resetMatchState() {
    M.index = 0;
    M.answered = 0;
    M.score = 0;
    M.timeMs = 0;
    M.t0 = 0;
    M.done = false;
    M.matchStarted = false;
    M.goSent = false;
    M.myReady = false;
    M.myAgain = false;
    M.partnerDone = false;
    M.partnerScore = 0;
    M.partnerAnswered = 0;
    M.partnerTimeMs = 0;
    M.partnerAgain = false;
  }

  function startMatch() {
    resetMatchState();
    M.matchStarted = true;
    M.t0 = performance.now();
    setPhase('match');
    renderMatch();
  }

  function renderMatch() {
    const qd = M.questions[M.index];
    if (!qd) { endLocalMatch(); return; }

    const vs = h('div', { class: 'duel-vs' },
      duoPill('Du', M.score, M.answered, M.questions.length),
      h('span', { class: 'duel-vs-middle', html: icon('bolt', 16) }),
      duoPill('Motstander', M.partnerScore, M.partnerAnswered, M.questions.length),
    );

    const progress = h('div', { class: 'quiz-progress' },
      h('span', { text: `Spørsmål ${M.index + 1} av ${M.questions.length}` }),
      h('div', { class: 'quiz-track' }, h('div', { class: 'quiz-fill', style: { width: Math.round((M.index / M.questions.length) * 100) + '%' } })),
      h('span', { text: M.score + ' p' }),
    );

    const isDrill = qd.a != null && qd.ans != null;
    const body = isDrill ? drillBody(qd) : choiceBody(qd);

    renderTo(h('div', { class: 'duel-match' },
      vs,
      h('div', { class: 'quiz-shell' }, h('div', { class: 'quiz-top' }, progress), body),
    ));

    if (isDrill) {
      requestAnimationFrame(() => { const inp = q('.drill-input', stage); if (inp) inp.focus(); });
    }
  }

  function duoPill(label, score, answered, total) {
    const pct = total ? Math.round(Math.min(answered, total) / total * 100) : 0;
    return h('div', { class: 'duel-pill' },
      h('span', { class: 'duel-pill-label', text: label }),
      h('span', { class: 'duel-pill-pts', text: String(score) }),
      h('div', { class: 'quiz-track' }, h('div', { class: 'duel-fill', style: { width: pct + '%' } })),
      h('span', { class: 'duel-pill-sub', text: Math.min(answered, total) + ' / ' + total }),
    );
  }

  function choiceBody(qd) {
    const list = h('ul', { class: 'opt-list' }, ...qd.options.map((o, i) =>
      h('li', {},
        h('button', { class: 'opt', type: 'button', 'data-i': String(i), onclick: () => answerChoice(i) },
          h('span', { class: 'opt-key', text: LETTERS[i] }),
          h('span', { text: o }),
        ),
      ),
    ));
    return h('div', { class: 'quiz-q' },
      h('h2', { text: qd.q }),
      qd.flag ? h('div', { style: 'text-align:center' }, h('img', { class: 'quiz-flag-img', src: qd.flag, alt: qd.flagAlt || 'Flagg', width: 200, height: 100 })) : null,
      list,
      h('div', { class: 'quiz-feedback', role: 'status' }),
      h('div', { class: 'quiz-actions' }),
    );
  }

  function drillBody(qd) {
    return h('div', { class: 'quiz-q drill-body' },
      h('h2', { text: 'Hvor mye er dette?' }),
      h('div', { class: 'drill-row', 'aria-label': `${qd.a} ganger ${qd.b}` },
        h('span', { class: 'drill-op', text: String(qd.a) }),
        h('span', { class: 'drill-op', 'aria-hidden': 'true', text: '×' }),
        h('span', { class: 'drill-op', text: String(qd.b) }),
        h('span', { class: 'drill-op', 'aria-hidden': 'true', text: '=' }),
        h('input', { class: 'text-input drill-input', type: 'text', inputmode: 'numeric', autocomplete: 'off', 'aria-label': 'Svaret ditt' }),
      ),
      h('div', { class: 'drill-msg', role: 'status', text: '\u00A0' }),
      h('div', { class: 'quiz-actions' }, h('button', { class: 'btn btn-primary', type: 'button', html: 'Svar' + icon('arrow', 15), onclick: () => answerDrill() })),
    );
  }

  function answerChoice(i) {
    const qd = M.questions[M.index];
    const btns = qa('.opt', stage);
    for (const b of btns) {
      b.disabled = true;
      const idx = Number(b.getAttribute('data-i'));
      if (idx === qd.answer) b.classList.add('is-correct');
      else if (idx === i) b.classList.add('is-wrong');
    }
    const fb = q('.quiz-feedback', stage);
    const correct = i === qd.answer;
    fb.classList.add(correct ? 'is-good' : 'is-bad');
    fb.innerHTML = `<span class="fb-icon">${icon(correct ? 'check' : 'close', 18)}</span><div class="fb-text"><strong>${correct ? 'Riktig!' : 'Feil svar.'}</strong><div class="explain">${esc(qd.explanation || '')}</div></div>`;
    afterAnswer(correct);
  }

  function answerDrill() {
    const qd = M.questions[M.index];
    const inp = q('.drill-input', stage);
    const msg = q('.drill-msg', stage);
    if (!inp) return;
    const val = String(inp.value || '').replace(/[^\p{L}\p{N} ]/gu, '').trim();
    const num = Number(val);
    const correct = Number.isFinite(num) && num === qd.ans;
    inp.disabled = true;
    msg.textContent = correct
      ? `Riktig! ${qd.a} × ${qd.b} = ${qd.ans}`
      : `Ikke helt riktig. ${qd.a} × ${qd.b} = ${qd.ans}`;
    msg.style.color = correct ? 'var(--ok)' : 'var(--err)';
    afterAnswer(correct);
  }

  function afterAnswer(correct) {
    M.answered = Math.min(M.answered + 1, M.questions.length);
    if (correct) M.score++;
    const actions = q('.quiz-actions', stage);
    const last = M.index === M.questions.length - 1;
    actions.appendChild(h('button', { class: 'btn btn-primary', type: 'button', html: (last ? 'Se resultat' : 'Neste') + icon('arrow', 15), onclick: () => next() }));
    sendProgress();
  }

  function next() {
    M.index++;
    if (M.index >= M.questions.length) {
      M.done = true;
      M.timeMs = performance.now() - M.t0;
      sendProgress();
      setPhase('waiting');
      if (M.partnerDone) renderFinal();
      else renderWaitingPartner();
    } else {
      renderMatch();
    }
  }

  function sendProgress() {
    if (!M.net) return;
    M.net.send({
      t: 'prog',
      score: M.score,
      answered: M.answered,
      done: M.done,
      timeMs: M.done ? M.timeMs : performance.now() - M.t0,
    });
  }

  function updatePartner(msg) {
    M.partnerScore = msg.score;
    M.partnerAnswered = msg.answered;
    if (msg.done) M.partnerTimeMs = msg.timeMs;
    const becameDone = msg.done && !M.partnerDone;
    M.partnerDone = M.partnerDone || Boolean(msg.done);
    if (M.phase === 'match') renderVS();
    else if (M.phase === 'waiting' && !M.partnerDone) {
      const st = q('.duel-status', stage);
      if (st && M.questions) st.textContent = `Du er ferdig! Venter på at motstanderen blir ferdig … (${M.partnerAnswered} / ${M.questions.length})`;
    }
    if ((M.phase === 'waiting' || M.phase === 'result') && M.done && M.partnerDone) renderFinal();
    if (becameDone && M.done && M.phase === 'waiting') renderFinal();
  }

  function renderVS() {
    const host = q('.duel-vs', stage);
    if (host && M.questions) {
      clear(host);
      host.append(
        duoPill('Du', M.score, M.answered, M.questions.length),
        h('span', { class: 'duel-vs-middle', html: icon('bolt', 16) }),
        duoPill('Motstander', M.partnerScore, M.partnerAnswered, M.questions.length),
      );
    }
  }

  function endLocalMatch() {
    M.done = true;
    M.timeMs = performance.now() - M.t0;
    setPhase('waiting');
    if (M.partnerDone) renderFinal();
    else renderWaitingPartner();
  }

  function renderWaitingPartner() {
    renderTo(h('div', { class: 'duel-lobby card' },
      h('div', { class: 'result-icon', html: icon('clock', 38) }),
      h('div', { class: 'result-heading', text: 'Du er ferdig!' }),
      h('p', { class: 'duel-status', text: `Venter på at motstanderen blir ferdig … (${M.partnerAnswered} / ${M.questions.length})` }),
    ));
  }

  function renderFinal() {
    setPhase('result');
    const pT = M.partnerTimeMs || Infinity;
    const myWin = M.score > M.partnerScore || (M.score === M.partnerScore && M.timeMs < pT);
    const draw = M.score === M.partnerScore && pT === Infinity;
    const heading = myWin ? 'Du vant!' : draw ? 'Uavgjort!' : 'Du tapte.';
    const iconName = myWin ? 'trophy' : draw ? 'target' : 'sparkles';
    const sub = myWin
      ? 'Flott jobbet! Du klarte flest riktige svar (eller raskest tid).'
      : draw
      ? 'Dere var helt jevne. Prøv igjen for å avgjøre det!'
      : 'Motstanderen vant denne gangen. Ny duell – kanskje du tar revansj!';

    renderTo(h('div', { class: 'duel-lobby card duel-result' },
      h('div', { class: 'result-icon', html: icon(iconName, 44) }),
      h('div', { class: 'result-heading', text: heading }),
      h('p', { class: 'result-sub', text: sub }),
      h('div', { class: 'duel-final-scores' },
        finalScorePill('Du', M.score, M.timeMs),
        finalScorePill('Motstander', M.partnerScore, M.partnerTimeMs),
      ),
      h('div', { class: 'duel-lobby-actions' },
        h('button', { class: 'btn btn-primary', type: 'button', html: icon('restart', 16) + ' Spill igjen', onclick: requestRematch }),
        h('button', { class: 'btn btn-ghost', type: 'button', text: 'Til duellstart', onclick: () => { teardown(); renderLanding(); } }),
      ),
      h('p', { class: 'duel-rematch-status', 'aria-live': 'polite', text: '' }),
    ));
  }

  function finalScorePill(label, score, timeMs) {
    return h('div', { class: 'duel-final-pill' },
      h('span', { class: 'duel-pill-label', text: label }),
      h('span', { class: 'duel-final-score', html: `${score}<small>p</small>` }),
      h('span', { class: 'duel-final-time', text: timeMs ? fmtTime(timeMs) : '–' }),
    );
  }

  function requestRematch() {
    if (M.myAgain || M.phase !== 'result') return;
    M.myAgain = true;
    M.net.send({ t: 'again' });
    maybeRematch();
  }

  function maybeRematch() {
    if (M.myAgain && M.partnerAgain) {
      M.myAgain = false;
      M.partnerAgain = false;
      M.partnerReady = false;
      M.goSent = false;
      if (M.role === 'host') {
        M.net.send({ t: 'go' });
        startMatch();
      } else {
        renderToLobbyText('Dere er enige! Start …');
        // startet via 'go' fra verten
      }
    } else {
      // vis/oppdater ventestatus
      const p = q('.duel-rematch-status', stage);
      if (p) p.textContent = M.partnerAgain ? 'Motstanderen vil også ha revansj!' : 'Venter på motstanderen …';
      const btn = q('.duel-result .btn-primary', stage);
      if (btn) btn.disabled = M.myAgain;
    }
  }

  function onPeerLeft() {
    const lobbyPhases = ['lobby-host', 'join-connecting', 'join-confirm', 'join-waiting-start', 'lobby-wait'];
    const inMatch = M.phase === 'match' || M.phase === 'waiting';
    if (!lobbyPhases.includes(M.phase) && !inMatch) return;
    renderTo(h('div', { class: 'duel-lobby card' },
      h('div', { class: 'result-icon', html: icon('close', 40) }),
      h('div', { class: 'result-heading', text: 'Motstanderen forlot duellen' }),
      h('p', { class: 'result-sub', text: 'Duellen er avsluttet. Du kan opprette en ny duell eller bli med på en annen.' }),
      h('div', { class: 'duel-lobby-actions' },
        h('button', { class: 'btn btn-primary', type: 'button', text: 'Til duellstart', onclick: () => { teardown(); renderLanding(); } }),
      ),
    ));
  }

  function fmtTime(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  }

  const mount = () => () => { teardown(); };

  if (autoCode) renderJoinLobby(autoCode);
  else renderLanding();

  return { title: 'Duell – Leonardo', element: el, mount };
}