// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · server.js  (clean v3)
//  Простой статический HTTP-сервер на Node.js. Запускается из корня проекта
//  и обслуживает всю папку целиком — что позволяет my_game/main.js импортить
//  фреймворк через '../hermes_ecs/src/index.js'.
//
//  Запуск:
//    node server.js
//  Открыть в браузере:
//    http://localhost:8080/my_game/      ← твоя игра
//
//  Не требует никаких npm-зависимостей — только встроенный модуль http.
// ─────────────────────────────────────────────────────────────────────────────

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.mp3':  'audio/mpeg',
  '.wav':  'audio/wav',
  '.ogg':  'audio/ogg',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
};

function resolveFilePath(urlPath) {
  let decoded = decodeURIComponent(urlPath);
  // Дефолтный маршрут: корень → my_game/
  if (decoded === '/' || decoded === '') decoded = '/my_game/index.html';
  if (decoded.endsWith('/')) decoded += 'index.html';
  // Защита от path traversal.
  const resolved = path.normalize(path.join(ROOT, decoded));
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  const filePath = resolveFilePath(urlPath);

  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${urlPath}`);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  HermesECS dev server запущен:');
  console.log('');
  console.log('  →  http://localhost:' + PORT + '/my_game/');
  console.log('');
  console.log('  Обслуживается корень: ' + ROOT);
  console.log('  (my_game/main.js импортит ../hermes_ecs/src/index.js через /hermes_ecs/...)');
  console.log('');
  console.log('  Нажмите Ctrl+C, чтобы остановить.');
  console.log('');
});
