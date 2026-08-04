#!/usr/bin/env node
/**
 * Mini "real site": HTML page + hashed JS/CSS + JSON API.
 * Bound to localhost for Mode A / Helix upstream.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');
const port = Number(process.env.PORT || 4091);
const host = process.env.HOST || '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${host}:${port}`);
  if (url.pathname === '/api/health' && req.method === 'GET') {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ok: true, site: 'static-site' }));
    return;
  }
  if (url.pathname === '/api/backdoor' && req.method === 'GET') {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ pwned: true }));
    return;
  }

  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  // demo hashed bundles
  if (filePath === '/assets/app.js') filePath = '/assets/app.7f3a9c.js';
  const abs = path.normalize(path.join(publicDir, filePath));
  if (!abs.startsWith(publicDir)) {
    res.statusCode = 403;
    res.end('forbidden');
    return;
  }
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
    res.statusCode = 404;
    res.end('not found');
    return;
  }
  const ext = path.extname(abs).toLowerCase();
  res.setHeader('content-type', TYPES[ext] || 'application/octet-stream');
  fs.createReadStream(abs).pipe(res);
});

server.listen(port, host, () => {
  console.log(`static-site listening on http://${host}:${port}`);
});
