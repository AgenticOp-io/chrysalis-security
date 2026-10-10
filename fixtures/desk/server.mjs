/**
 * Desk — operator console behind Helix (Mode A default upstream).
 *
 * Sites + tickets + session — not a storefront. HTML + JSON + hashed assets +
 * intentional backdoor. demo-api stays for smokes that pin a tiny JSON toy.
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

const SITES = [
  { id: 1, host: 'edge.lab', role: 'Mode A front door', mode: 'enforce', routes: 14 },
  { id: 2, host: 'api.lab', role: 'JSON API hop', mode: 'shadow', routes: 9 },
  { id: 3, host: 'panel.lab', role: 'Ops console', mode: 'learn', routes: 6 },
];

/** @type {Map<string, { email: string, at: string }>} */
const sessions = new Map();
/** @type {{ id: number, site: string, severity: string, note: string, at: string }[]} */
const tickets = [];
let ticketSeq = 1;

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
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
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
      sendJson(res, 200, {
        ok: true,
        service: 'desk',
        kind: 'ops-console',
        surfaces: ['html', 'json', 'session', 'sites', 'tickets'],
      });
      return;
    }

    // Sites inventory (protected front doors) — also aliased as /api/catalog|/api/items
    // so older lab DNA that learned those paths still maps during transition.
    if (
      (pathname === '/api/sites' || pathname === '/api/catalog' || pathname === '/api/items') &&
      method === 'GET'
    ) {
      sendJson(res, 200, { sites: SITES, count: SITES.length });
      return;
    }

    if ((pathname === '/api/tickets' || pathname === '/api/orders') && method === 'GET') {
      sendJson(res, 200, { tickets: tickets.slice(-20), count: tickets.length });
      return;
    }

    if ((pathname === '/api/tickets' || pathname === '/api/orders') && method === 'POST') {
      const raw = await readBody(req);
      let parsed = {};
      try {
        parsed = JSON.parse(raw || '{}');
      } catch {
        sendJson(res, 400, { error: 'bad_json' });
        return;
      }
      // Accept ops shape { site, severity, note } or legacy order shape { sku, qty }.
      const site = String(parsed.site || parsed.sku || '').trim();
      const severity = String(parsed.severity || (parsed.qty != null ? 'normal' : '')).trim() || 'normal';
      const note = String(parsed.note || (parsed.qty != null ? `qty ${parsed.qty}` : '')).trim();
      const hit = SITES.find((s) => s.host === site || s.host.startsWith(site));
      if (!site || !['low', 'normal', 'high'].includes(severity)) {
        sendJson(res, 400, { error: 'bad_ticket' });
        return;
      }
      const row = {
        id: ticketSeq++,
        site: hit?.host || site,
        severity,
        note: note || 'opened from desk',
        at: new Date().toISOString(),
      };
      tickets.push(row);
      sendJson(res, 200, { ok: true, ticket: row });
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

    if (pathname === '/api/backdoor' && method === 'GET') {
      sendJson(res, 200, {
        pwned: true,
        secret: 'exfil',
        note: 'not part of certified desk surface',
      });
      return;
    }

    let rel = pathname === '/' ? '/index.html' : pathname;
    if (rel.endsWith('/')) rel += 'index.html';
    // Old bookmark → new ops page
    if (rel === '/catalog.html') rel = '/sites.html';
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
