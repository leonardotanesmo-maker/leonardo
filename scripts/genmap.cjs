// Leonardo – bygger public/assets/map.svg fra world-atlas (scripts/cache/world-110m.json).
// Kjøres av scripts/refresh-data.js (eller manuelt: node scripts/genmap.cjs).
const fs = require('fs');
const path = require('path');
const { feature } = require('topojson-client');
const {
  geoPath, geoNaturalEarth1, geoGraticule10,
} = require('d3-geo');

const ROOT = path.join(__dirname, '..');
const topo = JSON.parse(fs.readFileSync(path.join(__dirname, 'cache', 'world-110m.json'), 'utf8'));
const countries = feature(topo, topo.objects.countries);
const land = feature(topo, topo.objects.land);

const width = 1200;
const height = 600;

const projection = geoNaturalEarth1()
  .fitExtent([[8, 8], [width - 8, height - 8]], { type: 'Sphere' });

const pathGen = geoPath(projection);
const antiMeridian = projection.rotate();

function makePath(f) {
  let d = pathGen(f);
  if (antiMeridian[0]) {
    const [lon] = projection.rotate();
    const clone = JSON.parse(JSON.stringify(f));
    const shift = (g) => {
      switch (g.type) {
        case 'Polygon':
          g.coordinates = g.coordinates.map((r) =>
            r.map((p) => [p[0] < 0 ? p[0] + 360 : p[0], p[1]]));
          break;
        case 'MultiPolygon':
          g.coordinates = g.coordinates.map((poly) =>
            poly.map((r) =>
              r.map((p) => [p[0] < 0 ? p[0] + 360 : p[0], p[1]])));
          break;
      }
    };
    shift(clone.geometry);
    projection.rotate([lon - 360, 0, 0]);
    const d2 = pathGen(clone);
    projection.rotate([lon, 0, 0]);
    if (d.replace(/^M/, 'M-').includes('M') && d2) {
      d = d2;
    }
  }
  return d;
}

let countriesSvg = '';
const withoutName = [];
for (const f of countries.features) {
  const id = String(f.id); // ISO numeric, may be missing
  const d = makePath(f);
  if (!d) continue;
  const name = (f.properties && f.properties.name) ? f.properties.name : '';
  if (!name) withoutName.push(f.id);
  countriesSvg += `  <path class="country" data-numeric="${id}" data-name="${name.replace(/"/g, '&quot;')}" d="${d}"></path>\n`;
}

const sphere = { type: 'Sphere' };
const graticuleD = pathGen(geoGraticule10()) || '';

const svg = `<svg
  id="world-map"
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${width} ${height}"
  role="application"
  aria-label="Interaktivt verdenskart. Velg et land for å se informasjon om det."
>
  <defs>
    <radialGradient id="globe" cx="50%" cy="40%" r="75%">
      <stop offset="0%" stop-color="#eef3fb"/>
      <stop offset="100%" stop-color="#dde7f5"/>
    </radialGradient>
  </defs>
  <path class="ocean" d="${pathGen(sphere)}"></path>
  <path class="graticule" d="${graticuleD}"></path>
  <g class="countries">
${countriesSvg}  </g>
</svg>`;

fs.writeFileSync(path.join(ROOT, 'public', 'assets', 'map.svg'), svg, 'utf8');
console.log('map.svg skrevet, land-paths:', countries.features.length, ', uten navn:', withoutName.length);