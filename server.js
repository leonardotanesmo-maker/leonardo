// Leonardo – enkel statisk server med SPA-fallback.
// Kjør: npm run dev  (eller: node server.js)
//
// Siden er statisk, men serveren har også et INNBYGD analyse/logg-API
// for det innebygde admin-dashbordet (#/admin):
//
//   GET  /api/health   – status
//   GET  /api/config   – offentlig konfigurasjon (krever ikke nøkkel)
//   POST /api/events   – motta hendelser (batch) fra klienten
//   GET  /api/events   – liste hendelser (hvis LEONARDO_ADMIN_KEY er satt: x-admin-key-krav)
//   GET  /api/stats    – aggregeringer (samme nøkkelkrav)
//   GET  /api/visitors – besøkende med IP + geo (samme nøkkelkrav)
//
// Les README / JARVIS_STATE.md (#./LIVE LOG / ANALYTICS SYSTEM) for detaljer.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { ensureAnalytics, ingestEvents, listEvents, aggregateStats, aggregateVisitors, adminKeyOk, analyticsStatus } from './server-analytics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 4173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

function json(res, status, obj, extraHeaders = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 512 * 1024) { reject(new Error('body for stor')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ---- /api/* ----
async function handleApi(req, res, urlPath) {
  const method = req.method;

  if (method === 'OPTIONS') {
    json(res, 204, {});
    return;
  }

  // Skriv-hendelser krever ingen nøkkel: vi lagrer aldri personlig info,
  // men begrenser med størrelse og dedup (se server-analytics.js).
  if (urlPath === '/api/events' && method === 'POST') {
    try {
      const raw = await readBody(req);
      let body;
      try { body = JSON.parse(raw.toString('utf8')); } catch { body = null; }
      const result = await ingestEvents(body, req);
      json(res, 200, { ok: true, ...result });
    } catch (err) {
      json(res, 400, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (urlPath === '/api/health' && method === 'GET') {
    json(res, 200, analyticsStatus());
    return;
  }

  if (urlPath === '/api/config' && method === 'GET') {
    const st = analyticsStatus();
    json(res, 200, {
      ok: true,
      adminKeyRequired: st.adminKeyRequired,
      ipCollection: st.geo.ipMode, // alltid lagrer IP (full eller forkortet)
      ipMode: st.geo.ipMode,
      geoLookup: st.geo.geoLookup,
      eventNames: [
        'PAGE_VIEW', 'APP_LOADED', 'SUBJECT_OPENED',
        'QUIZ_STARTED', 'QUIZ_QUESTION_ANSWERED', 'QUIZ_COMPLETED',
        'MATH_STARTED', 'MATH_QUESTION_ANSWERED', 'MATH_COMPLETED',
        'BUTTON_CLICKED', 'ERROR',
        'TEST_EVENT', 'TEST_PAGE_VIEW', 'TEST_QUIZ_STARTED', 'TEST_QUIZ_COMPLETED',
      ],
      now: Date.now(),
    });
    return;
  }

  // Lesing (dashbordet). Krever nøkkel hvis LEONARDO_ADMIN_KEY er satt.
  const adminOK = adminKeyOk(req);
  if (!adminOK) {
    json(res, 401, { ok: false, error: 'admin-nøkkel mangler' });
    return;
  }

  if (urlPath === '/api/events' && method === 'GET') {
    try {
      const url = new URL(req.url, 'http://localhost');
      const query = Object.fromEntries(url.searchParams.entries());
      const result = await listEvents(query);
      json(res, 200, { ok: true, ...result });
    } catch (err) {
      json(res, 500, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (urlPath === '/api/stats' && method === 'GET') {
    try {
      const stats = await aggregateStats();
      json(res, 200, stats);
    } catch (err) {
      json(res, 500, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (urlPath === '/api/visitors' && method === 'GET') {
    try {
      const result = await aggregateVisitors();
      json(res, 200, result);
    } catch (err) {
      json(res, 500, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  json(res, 404, { ok: false, error: 'api-rute ikke funnet' });
}

const server = http.createServer(async (req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    urlPath = '/';
  }

  if (urlPath === '/api' || urlPath.startsWith('/api/')) {
    await handleApi(req, res, urlPath);
    return;
  }

  if (urlPath === '/') urlPath = '/index.html';

  const noCache = { 'Cache-Control': 'no-cache' };

  // Cache-regler: uforanderlige assets (flagg, ikoner, kart) caches lenge,
  // kode/sider revalideres (no-cache) så endringer alltid hentes på nytt.
  const isImmutable = urlPath.startsWith('/assets/');
  const cacheControl = isImmutable
    ? { 'Cache-Control': 'public, max-age=604800, immutable' }
    : noCache;

  // Komprimer tekstbaserte svar med gzip (eller brotli når støttet).
  const encodings = String(req.headers['accept-encoding'] || '');
  const method = encodings.includes('br') ? 'br' : encodings.includes('gzip') ? 'gzip' : null;

  function sendRaw(code, buf, mime, extra) {
    if (!method || buf.length < 512) {
      res.writeHead(code, { 'Content-Type': mime, ...extra });
      res.end(buf);
      return;
    }
    const fn = method === 'br' ? zlib.brotliCompressSync : zlib.gzipSync;
    let compressed;
    try { compressed = fn(buf); } catch { compressed = null; }
    if (!compressed || compressed.length >= buf.length) {
      res.writeHead(code, { 'Content-Type': mime, ...extra });
      res.end(buf);
      return;
    }
    res.writeHead(code, {
      'Content-Type': mime,
      'Content-Encoding': method,
      'Vary': 'Accept-Encoding',
      ...extra,
    });
    res.end(compressed);
  }

  let filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    sendRaw(403, Buffer.from('Forbudt'), 'text/plain; charset=utf-8', noCache);
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    fs.readFile(filePath, (readErr, buf) => {
      if (readErr) {
        // SPA-fallback for hash-frie stier, for eksempel /geografi
        const fallback = path.join(ROOT, 'index.html');
        fs.readFile(fallback, (fErr, fBuf) => {
          if (fErr) {
            sendRaw(404, Buffer.from('404 – siden finnes ikke'), 'text/plain; charset=utf-8', noCache);
            return;
          }
          sendRaw(200, fBuf, MIME['.html'], cacheControl);
        });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      sendRaw(200, buf, MIME[ext] || 'application/octet-stream', cacheControl);
    });
  });
});

await ensureAnalytics();

server.listen(PORT, () => {
  console.log(`Leonardo kjører på http://localhost:${PORT}`);
  console.log(`Analytics-logg: ${analyticsStatus().dir}`);
});