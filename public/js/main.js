// Leonardo – inngangspunkt
import { register, start } from './router.js';
import { mountHeader } from './components/header.js';
import { mountFooter } from './components/footer.js';
import { renderHome } from './pages/home.js';
import { renderSubjects } from './pages/subjects.js';
import { renderSubject } from './pages/subject.js';
import { renderGeography } from './pages/geography.js';
import { renderQuiz } from './pages/quiz.js';
import { renderSearch } from './pages/search.js';
import { renderAbout } from './pages/about.js';
import { closeCountryPanel } from './components/countryPanel.js';

register('/', renderHome);
register('/hjem', renderHome);
register('/fag', renderSubjects);
register('/fag/:slug', renderSubject);
register('/geografi', renderGeography);
register('/geografi/:iso2', renderGeography);
register('/quiz/:id', renderQuiz);
register('/quiz', () => renderSubject({ params: { slug: 'quiz' } }));
register('/sok', renderSearch);
register('/om', renderAbout);

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
  if (!isDeepGeography) closeCountryPanel();
});