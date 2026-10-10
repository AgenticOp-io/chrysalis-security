/**
 * Desk — real multi-surface app behind Helix (Mode A default upstream).
 *
 * HTML storefront + JSON APIs + session cookie + hashed assets + intentional backdoor.
 * Replaces thin demo-api as the Windows / first-run protect target. demo-api stays for
 * unit smokes that pin its tiny surface.
 *
 *   PORT=4090 HOST=127.0.0.1 node fixtures/desk/server.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const port = Number(process.env.PORT || 4090);
const host = process.env.HOST || '127.0.0.1';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');

const CATALOG = [
  { id: 1, sku: 'HX-EDGE', name: 'Edge relay', price: 49 },
  { id: 2, sku: 'HX-CORE', name: 'Core certificate pack', price: 120 },
  { id: 3, sku: 'HX-LAB', name: 'Lab soak kit', price: 0 },
];

/** @type {Map<string, { email: string, at: string }>} */
const sessions = new Map();
/** @type {{ id: number, sku: string, qty: number, at: string }[]} */
const orders = [];
let orderSeq = 1;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseCookies(header) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 1) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function sendJson(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...extraHeaders,
  });
  res.end(payload);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
  };
  res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${host}:${port}`);
  const method = (req.method || 'GET').toUpperCase();
  const pathname = url.pathname;

  try {
    if (pathname === '/api/health' && method === 'GET') {
      sendJson(res, 200, { ok: true, service: 'desk', surfaces: ['html', 'json', 'session'] });
      return;
    }

    if ((pathname === '/api/catalog' || pathname === '/api/items') && method === 'GET') {
      const sku = url.searchParams.get('sku');
      const items = sku ? CATALOG.filter((c) => c.sku === sku) : CATALOG;
      sendJson(res, 200, { items, count: items.length });
      return;
    }

    if (pathname === '/api/orders' && method === 'GET') {
      sendJson(res, 200, { orders: orders.slice(-20), count: orders.length });
      return;
    }

    if (pathname === '/api/orders' && method === 'POST') {
      const raw = await readBody(req);
      let parsed = {};
      try {
        parsed = JSON.parse(raw || '{}');
      } catch {
        sendJson(res, 400, { error: 'bad_json' });
        return;
      }
      const sku = String(parsed.sku || '');
      const qty = Number(parsed.qty || 0);
      const hit = CATALOG.find((c) => c.sku === sku);
      if (!hit || !Number.isInteger(qty) || qty < 1 || qty > 99) {
        sendJson(res, 400, { error: 'bad_order' });
        return;
      }
      const row = { id: orderSeq++, sku, qty, at: new Date().toISOString() };
      orders.push(row);
      sendJson(res, 200, { ok: true, order: row });
      return;
    }

    if (pathname === '/api/session' && method === 'POST') {
      const raw = await readBody(req);
      let parsed = {};
      try {
        parsed = JSON.parse(raw || '{}');
      } catch {
        sendJson(res, 400, { error: 'bad_json' });
        return;
      }
      const email = String(parsed.email || '').trim().toLowerCase();
      if (!email.includes('@')) {
        sendJson(res, 400, { error: 'bad_email' });
        return;
      }
      const sid = crypto.randomBytes(16).toString('hex');
      sessions.set(sid, { email, at: new Date().toISOString() });
      sendJson(res, 200, { ok: true, email }, {
        'set-cookie': `sid=${encodeURIComponent(sid)}; Path=/; HttpOnly; SameSite=Lax`,
      });
      return;
    }

    if (pathname === '/api/session' && method === 'DELETE') {
      const cookies = parseCookies(req.headers.cookie);
      if (cookies.sid) sessions.delete(cookies.sid);
      sendJson(res, 200, { ok: true }, {
        'set-cookie': 'sid=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
      });
      return;
    }

    if (pathname === '/api/me' && method === 'GET') {
      const cookies = parseCookies(req.headers.cookie);
      const sess = cookies.sid ? sessions.get(cookies.sid) : null;
      if (!sess) {
        sendJson(res, 401, { error: 'unauthenticated' });
        return;
      }
      sendJson(res, 200, { ok: true, email: sess.email, role: 'operator' });
      return;
    }

    // Intentional unauthorized surface — Helix must block after DNA lock.
    if (pathname === '/api/backdoor' && method === 'GET') {
      sendJson(res, 200, { pwned: true, secret: 'exfil', note: 'not part of certified desk surface' });
      return;
    }

    // Static / HTML
    let rel = pathname === '/' ? '/index.html' : pathname;
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.normalize(path.join(root, rel.replace(/^\//, '')));
    if (!file.startsWith(root)) {
      res.writeHead(403, { 'content-type': 'text/plain' });
      res.end('forbidden');
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      sendFile(res, file);
      return;
    }

    sendJson(res, 404, { error: 'not_found' });
  } catch (err) {
    sendJson(res, 500, { error: 'desk_error', reason: String(err?.message || err) });
  }
});

server.listen(port, host, () => {
  console.log(`desk listening on http://${host}:${port}`);
});
