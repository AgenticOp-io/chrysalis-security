#!/usr/bin/env node
/**
 * Promote without downtime: enforce with DNA A → rewrite file → POST /__helix/reload → DNA B.
 * Token: RELOAD_SMOKE_OK
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { learnFromObservations } from '../packages/dna-core/index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data', 'reload-smoke');
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
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function req(port, method, urlPath) {
  return new Promise((resolve, reject) => {
    const r = http.request(
      { hostname: '127.0.0.1', port, path: urlPath, method, headers: { host: '127.0.0.1' } },
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
    r.end();
  });
}

const dnaA = learnFromObservations(
  [
    {
      method: 'GET',
      path: '/api/health',
      host: '127.0.0.1',
      status: 200,
      contentType: 'application/json',
      body: { ok: true, service: 'demo-api' },
    },
  ],
  { app_id: 'reload-a', mode: 'certified' },
);
const dnaB = learnFromObservations(
  [
    {
      method: 'GET',
      path: '/api/health',
      host: '127.0.0.1',
      status: 200,
      contentType: 'application/json',
      body: { ok: true, service: 'demo-api' },
    },
    {
      method: 'GET',
      path: '/api/items',
      host: '127.0.0.1',
      status: 200,
      contentType: 'application/json',
      body: { items: [] },
    },
  ],
  { app_id: 'reload-b', mode: 'certified' },
);

const certPath = path.join(dataDir, 'app.dna.json');
fs.writeFileSync(certPath, JSON.stringify(dnaA, null, 2));

const apiPort = 4188;
const helixPort = 4189;
start([path.join(root, 'fixtures/demo-api/server.mjs')], { PORT: String(apiPort), HOST: '127.0.0.1' });
await sleep(300);
start([path.join(root, 'packages/helix-proxy/server.mjs')], {
  PORT: String(helixPort),
  UPSTREAM: `http://127.0.0.1:${apiPort}`,
  MODE: 'enforce',
  DNA: certPath,
});
await sleep(400);

const health = await req(helixPort, 'GET', '/api/health');
assert(health.status === 200, 'health allow under DNA A');

const blocked = await req(helixPort, 'GET', '/api/items');
assert(blocked.status === 403, 'items unknown under DNA A');
assert(blocked.headers['x-helix-hole'] === 'HX-ROUTE-UNKNOWN', 'route unknown');

const st = await req(helixPort, 'GET', '/__helix/status');
assert(st.status === 200 && JSON.parse(st.body).routes === 1, 'status routes=1');

fs.writeFileSync(certPath, JSON.stringify(dnaB, null, 2));
const reloaded = await req(helixPort, 'POST', '/__helix/reload');
assert(reloaded.status === 200, `reload ${reloaded.status} ${reloaded.body}`);
const rj = JSON.parse(reloaded.body);
assert(rj.reloaded === true && rj.routes === 2, 'reload picked DNA B');

const items = await req(helixPort, 'GET', '/api/items');
assert(items.status === 200, 'items allow after reload');

for (const c of kids) {
  try {
    c.kill('SIGTERM');
  } catch {
    /* ignore */
  }
}

console.log('RELOAD_SMOKE_OK');
