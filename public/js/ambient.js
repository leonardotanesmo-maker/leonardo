// Leonardo – levende bakgrunnslag (aurora, lyssirkler og perspektiv-gitter)
// Injiserer ett rent dekorativt lag bak hele siden. Krever ikke nettverk,
// sparer arbeid ved å respektere prefers-reduced-motion (da injiseres ingenting).

const reduced = matchMedia('(prefers-reduced-motion: reduce)');

export function mountAmbient(root = document.body) {
  if (reduced.matches) return;
  if (root.querySelector('.ambient')) return;

  const ambient = document.createElement('div');
  ambient.className = 'ambient';
  ambient.setAttribute('aria-hidden', 'true');

  const orbs = [
    ['orb-a', 520, 540],
    ['orb-b', 460, 620],
    ['orb-c', 380, 480],
    ['orb-d', 300, 420],
  ];
  for (const [cls, w, h] of orbs) {
    const span = document.createElement('span');
    span.className = 'ambient-orb ' + cls;
    span.style.setProperty('--w', w + 'px');
    span.style.setProperty('--h', h + 'px');
    ambient.appendChild(span);
  }

  const aurora = document.createElement('span');
  aurora.className = 'ambient-aurora';
  ambient.appendChild(aurora);

  const grid = document.createElement('span');
  grid.className = 'ambient-grid';
  ambient.appendChild(grid);

  const dots = document.createElement('span');
  dots.className = 'ambient-dots';
  ambient.appendChild(dots);

  root.prepend(ambient);
}

// Koble til endring av innstillingen (skru av dersom brukeren slår på redusert bevegelse)
reduced.addEventListener?.('change', (e) => {
  const el = document.querySelector('.ambient');
  if (!el) return;
  if (e.matches) {
    el.classList.add('is-static');
  } else {
    el.classList.remove('is-static');
  }
});