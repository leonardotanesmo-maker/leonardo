// Leonardo – enkel statisk server med SPA-fallback.
// Kjør: npm run dev  (eller: node server.js)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    urlPath = '/';
  }
  if (urlPath === '/') urlPath = '/index.html';

  // Ingen cache under utvikling – sikrer at JS-endringer alltid blir hentet på nytt.
  const noCache = { 'Cache-Control': 'no-store' };

  let filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, noCache);
    res.end('Forbudt');
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
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...noCache });
            res.end('404 – siden finnes ikke');
            return;
          }
          res.writeHead(200, { 'Content-Type': MIME['.html'], ...noCache });
          res.end(fBuf);
        });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', ...noCache });
      res.end(buf);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Leonardo kjører på http://localhost:${PORT}`);
});