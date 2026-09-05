// Leonardo – dataoppdatering
// Last ned rådata (mledoze/countries, Verdensbanken, world-atlas) og
// generer public/data/countries.js + public/assets/map.svg.
// Kjøres med: node scripts/refresh-data.js
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'scripts', 'cache');

const SOURCES = {
  'countries.json': 'https://raw.githubusercontent.com/mledoze/countries/master/dist/countries.json',
  'wb_pop.json': 'https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?date=2025&format=json&per_page=500',
  'world-110m.json': 'https://unpkg.com/world-atlas@2.0.2/countries-110m.json',
};

async function download(name, url, retries = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'leonardo-refresh-data (http://localhost:4173)' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(join(CACHE, name), buf, 'utf8');
      console.log(`  nedlastet ${name} (${(buf.length / 1024).toFixed(0)} kB)`);
      return;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  throw new Error(`Kunne ikke laste ${name}: ${lastErr.message}`);
}

async function main() {
  await mkdir(CACHE, { recursive: true });
  console.log('Laster ned rådata …');
  for (const [name, url] of Object.entries(SOURCES)) {
    await download(name, url);
  }

  console.log('Genererer public/data/countries.js …');
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'process-data.cjs')], { stdio: 'inherit', cwd: ROOT });

  console.log('Genererer public/assets/map.svg …');
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'genmap.cjs')], { stdio: 'inherit', cwd: ROOT });

  console.log('Ferdig. Restart serveren for å hente nye filer.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});