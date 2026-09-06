// Leonardo – bygger én samlet stylesheet (styles/site.css) fra kildene i
// styles/. Kjøring: npm run build:css
// Gjør du endringer i en av *_filene, kjør build:css før du leverer.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(DIR, '..', 'public', 'styles');
const OUT = path.join(SRC, 'site.css');

const FILES = [
  'tokens.css',
  'base.css',
  'layout.css',
  'components.css',
  'map.css',
  'pages.css',
  'responsive.css',
  'duel.css',
];

let out = '/* Leonardo – samlet stil (autogenerert av scripts/build-css.mjs) */\n/* Kjør "npm run build:css" etter endringer i styles/*.css */\n';
for (const f of FILES) {
  const p = path.join(SRC, f);
  let txt = '';
  try {
    txt = await readFile(p, 'utf8');
  } catch {
    await writeFile(p, '', 'utf8'); // tom fil hvis den ikke finnes enda
  }
  out += `\n/* ==== ${f} ==== */\n${txt}\n`;
}

await writeFile(OUT, out, 'utf8');
console.log('site.css generert:', out.length, 'bytes');