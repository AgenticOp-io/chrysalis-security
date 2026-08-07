/**
 * Boring “real site” — HTML + static assets + JSON API in one process.
 * Beginning bar beyond toy demo-api alone.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT || 4095);
const host = process.env.HOST || '127.0.0.1';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);

  if (url.pathname === '/api/health' && req.method === 'GET') {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ok: true, service: 'real-site' }));
    return;
  }
  if (url.pathname === '/api/items' && req.method === 'GET') {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ items: [{ id: 1, name: 'widget' }] }));
    return;
  }
  if (url.pathname === '/api/backdoor' && req.method === 'GET') {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ pwned: true }));
    return;
  }

  if (/^\/assets\/[^/]+\.(js|css)$/i.test(url.pathname)) {
    const candidate = path.normalize(path.join(root, url.pathname.replace(/^\//, '')));
    if (!candidate.startsWith(root) || !fs.existsSync(candidate)) {
      const ext = path.extname(url.pathname).toLowerCase();
      res.setHeader('content-type', ext === '.css' ? 'text/css' : 'application/javascript');
      res.end(ext === '.css' ? '/* hashed */' : '/* hashed */');
      return;
    }
  }
  let rel = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = path.normalize(path.join(root, rel.replace(/^\//, '')));
  if (!file.startsWith(root)) {
    res.statusCode = 403;
    res.end('forbidden');
    return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.statusCode = 404;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'not_found' }));
    return;
  }
  const ext = path.extname(file).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
  };
  res.setHeader('content-type', types[ext] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

server.listen(port, host, () => {
  console.log(`real-site listening on http://${host}:${port}`);
});
