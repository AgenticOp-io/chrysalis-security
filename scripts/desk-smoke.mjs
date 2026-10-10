#!/usr/bin/env node
/**
 * Desk behind Helix — HTML + catalog + orders + session → learn → promote → enforce.
 * Tokens: DESK_UP_OK · DESK_LEARN_OK · DESK_ENFORCE_OK · DESK_SMOKE_OK
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data', 'desk-smoke');
fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const kids = [];
function start(args, env) {
  const c = spawn(process.execPath, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  kids.push(c);
  return c;
}
function cleanup() {
  for (const k of kids) {
    try {
      k.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
}
process.on('exit', cleanup);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function req(port, urlPath, opts = {}) {
  return new Promise((resolve, reject) => {
    const body = opts.body ? Buffer.from(opts.body) : null;
    const r = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method: opts.method || 'GET',
        headers: {
          host: '127.0.0.1',
          ...(opts.headers || {}),
          ...(body ? { 'content-type': 'application/json', 'content-length': body.length } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      },
    );
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function wait(port, pathOnly = '/api/health') {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await req(port, pathOnly);
      if (r.status === 200) return;
    } catch {
      /* retry */
    }
    await sleep(100);
  }
  throw new Error(`not up on ${port}${pathOnly}`);
}

function run(args) {
  return new Promise((resolve, reject) => {
    const c = spawn(process.execPath, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    c.stdout.on('data', (d) => {
      out += d;
    });
    c.stderr.on('data', (d) => {
      out += d;
    });
    c.on('exit', (code) => (code === 0 ? resolve(out) : reject(new Error(out || `exit ${code}`))));
  });
}

const deskPort = 19095;
const helixPort = 19096;
const observePath = path.join(dataDir, 'obs.ndjson');
const draftPath = path.join(dataDir, 'draft.dna.json');
const certPath = path.join(dataDir, 'certified.dna.json');
const shadowPath = path.join(dataDir, 'shadow.ndjson');

start([path.join(root, 'fixtures/desk/server.mjs')], {
  PORT: String(deskPort),
  HOST: '127.0.0.1',
});
await wait(deskPort);
console.log('DESK_UP_OK');

start([path.join(root, 'packages/helix-proxy/server.mjs')], {
  PORT: String(helixPort),
  UPSTREAM: `http://127.0.0.1:${deskPort}`,
  MODE: 'learn',
  OBSERVE: observePath,
  SHADOW_LOG: shadowPath,
  SIEM_LOG: path.join(dataDir, 'siem.ndjson'),
});
await wait(helixPort, '/__helix/healthz');

const learnPaths = [
  '/',
  '/catalog.html',
  '/account.html',
  '/assets/desk.css',
  '/assets/desk.a1b2c3d4.js',
  '/api/health',
  '/api/catalog',
  '/api/items',
  '/api/orders',
];
for (const p of learnPaths) {
  const r = await req(helixPort, p);
  assert(r.status === 200, `learn GET ${p} → ${r.status}`);
}
const order = await req(helixPort, '/api/orders', {
  method: 'POST',
  body: JSON.stringify({ sku: 'HX-LAB', qty: 2 }),
});
assert(order.status === 200 && order.body.includes('"ok":true'), 'learn POST order');
const session = await req(helixPort, '/api/session', {
  method: 'POST',
  body: JSON.stringify({ email: 'ops@agenticop.io' }),
});
assert(session.status === 200 && String(session.headers['set-cookie'] || '').includes('sid='), 'learn session cookie');
const cookie = String(session.headers['set-cookie'] || '')
  .split(';')[0]
  .trim();
const me = await req(helixPort, '/api/me', { headers: { cookie } });
assert(me.status === 200 && me.body.includes('ops@agenticop.io'), 'learn /api/me');
console.log('DESK_LEARN_OK');

await run([
  path.join(root, 'packages/helix-cli/bin/helix.mjs'),
  'learn',
  '--in',
  observePath,
  '--out',
  draftPath,
  '--app-id',
  'desk',
]);
await run([
  path.join(root, 'packages/helix-cli/bin/helix.mjs'),
  'promote',
  '--in',
  draftPath,
  '--out',
  certPath,
]);

cleanup();
await sleep(400);

start([path.join(root, 'fixtures/desk/server.mjs')], {
  PORT: String(deskPort),
  HOST: '127.0.0.1',
});
await wait(deskPort);
fs.writeFileSync(shadowPath, '');
start([path.join(root, 'packages/helix-proxy/server.mjs')], {
  PORT: String(helixPort),
  UPSTREAM: `http://127.0.0.1:${deskPort}`,
  MODE: 'enforce',
  DNA: certPath,
  SHADOW_LOG: shadowPath,
});
await wait(helixPort, '/__helix/healthz');
const hz = JSON.parse((await req(helixPort, '/__helix/healthz')).body);
assert(hz.dna === true && hz.mode === 'enforce', `enforce healthz dna/mode: ${JSON.stringify(hz)}`);

const home = await req(helixPort, '/');
assert(home.status === 200 && home.body.includes('Desk'), `enforce home ${home.status}`);
const cat = await req(helixPort, '/api/catalog');
assert(
  cat.status === 200 && cat.body.includes('HX-EDGE'),
  `enforce catalog ${cat.status} ${cat.body.slice(0, 200)}`,
);
const blocked = await req(helixPort, '/api/backdoor');
assert(
  blocked.status === 403 && blocked.body.includes('HX-ROUTE-UNKNOWN'),
  `enforce backdoor ${blocked.status} ${blocked.body.slice(0, 200)}`,
);
console.log('DESK_ENFORCE_OK');

cleanup();
console.log('DESK_SMOKE_OK');
