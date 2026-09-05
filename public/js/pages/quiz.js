// Leonardo – quizside (choice, flag og drill)
import { h } from '../dom.js';
import { icon } from '../icons.js';
import { crumbs, pageHead } from '../components.js';
import { quizById, subjectBySlug } from '../data.js';
import { quizRunner } from '../components/quizRunner.js';

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

  const runner = quizRunner(quiz, () => {});

  const el = h('div', { class: 'container page-pad' },
    crumbs(crumb),
    h('div', { class: 'quiz-intro', style: 'margin-bottom:var(--sp-5)' },
      h('div', { style: 'display:flex;align-items:center;gap:var(--sp-3)' },
        h('div', { class: 'subject-icon accent-' + (subject ? subject.accent : 'quiz'), html: icon(quiz.icon || 'bolt', 22) }),
        h('div', {},
          h('h1', { style: 'margin:0;font-size:var(--fs-xl)', text: quiz.title }),
          h('div', { style: 'color:var(--ink-3);font-size:var(--fs-sm)' }, quiz.description),
        ),
      ),
    ),
    stage,
  );

  return {
    title: quiz.title + ' – Leonardo',
    element: el,
    mount: () => {
      stage.appendChild(runner.el);
      return () => {};
    },
  };
}