// Leonardo – inngangspunkt
// Ruter lastes inn "lat" (bare når siden trengs), så forsiden starter med et
// minimum av kode. De tunge land- og quizdataene kommer først på side 2+.
import { register, start } from './router.js';
import { mountHeader } from './components/header.js';
import { mountFooter } from './components/footer.js';

function lazy(path, fn) {
  return async (ctx) => {
    const mod = await import(path);
    return mod[fn](ctx);
  };
}

register('/', lazy('./pages/home.js', 'renderHome'));
register('/hjem', lazy('./pages/home.js', 'renderHome'));
register('/fag', lazy('./pages/subjects.js', 'renderSubjects'));
register('/fag/:slug', lazy('./pages/subject.js', 'renderSubject'));
register('/geografi', lazy('./pages/geography.js', 'renderGeography'));
register('/geografi/:iso2', lazy('./pages/geography.js', 'renderGeography'));
register('/quiz/:id', lazy('./pages/quiz.js', 'renderQuiz'));
register('/quiz', () => lazy('./pages/subject.js', 'renderSubject')({ params: { slug: 'quiz' } }));
register('/sok', lazy('./pages/search.js', 'renderSearch'));
register('/om', lazy('./pages/about.js', 'renderAbout'));
register('/duell', lazy('./pages/duel.js', 'renderDuel'));
register('/duell/:kode', lazy('./pages/duel.js', 'renderDuel'));

const headerHost = document.getElementById('app-header');
const footerHost = document.getElementById('app-footer');
mountHeader(headerHost);
mountFooter(footerHost);

start();

// Lukk landpanelet når brukeren går til en annen side.
// Dype lenker (#/geografi/NO) får panelet servert av geografisiden selv.
window.addEventListener('hashchange', () => {
  const hash = location.hash.replace(/^#/, '') || '/';
  const isDeepGeography = /^\/geografi\/[^/]+$/.test(hash);
  if (isDeepGeography) return;
  import('./components/countryPanel.js').then((m) => m.closeCountryPanel());
});