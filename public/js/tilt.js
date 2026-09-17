// Leonardo – subtil 3D-tilt på kort
// Holder deg innenfor rolige vinkler og bruker requestAnimationFrame for å
// unngå rykker. Respekterer prefers-reduced-motion og slår seg av på pekere
// som ikke er presise (touch).

import { qa } from './dom.js';

const MAX_TILT = 11;  // grader
const MAX_RAISE = 18; // piksler

let raf = 0;
const cards = new Set();

export function initTilt(root = document) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (matchMedia('(pointer: coarse)').matches) return;

  const els = qa('.subject-card,.activity-card,.duel-action-card,.fact', root);
  for (const el of els) {
    if (cards.has(el)) continue;
    cards.add(el);
    el.classList.add('is-tiltable');
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
  }
}

function onMove(e) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width;
  const py = (e.clientY - r.top) / r.height;
  const rx = (0.5 - py) * MAX_TILT;
  const ry = (px - 0.5) * MAX_TILT;
  el.dataset.tx = String(rx);
  el.dataset.ty = String(ry);
  el.style.setProperty('--gx', String(px * 100) + '%');
  el.style.setProperty('--gy', String(py * 100) + '%');
  if (!raf) raf = requestAnimationFrame(frame);
}

function onLeave(e) {
  const el = e.currentTarget;
  delete el.dataset.tx;
  delete el.dataset.ty;
  el.style.removeProperty('--gx');
  el.style.removeProperty('--gy');
  el.style.transform = '';
  el.classList.remove('is-tilting');
  if (!raf) raf = requestAnimationFrame(frame);
}

function frame() {
  raf = 0;
  for (const el of cards) {
    if (el.dataset.tx === undefined && el.dataset.ty === undefined) continue;
    const rx = parseFloat(el.dataset.tx) || 0;
    const ry = parseFloat(el.dataset.ty) || 0;
    el.classList.add('is-tilting');
    el.style.transform = `translateY(-${MAX_RAISE}px) perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  }
}
