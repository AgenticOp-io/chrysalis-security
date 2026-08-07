#!/usr/bin/env node
/**
 * Nested JSON key fingerprint (depth ≤2): learn data.user → implant data.exfil → HX-SCHEMA-DRIFT.
 * Token: NESTED_DRIFT_SMOKE_OK
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { learnFromObservations, scoreResponse, responseKeyFingerprint } from '../packages/dna-core/index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data', 'nested-drift-smoke');
fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(responseKeyFingerprint({ a: 1, b: 2 }) === 'a,b', 'flat unchanged');
assert(
  responseKeyFingerprint({ data: { user: { id: 1 }, role: 'x' }, meta: true }) ===
    'data,data.role,data.user,meta',
  'depth-2 paths (no grandchild keys)',
);
assert(responseKeyFingerprint({ items: [{ id: 1 }] }) === 'items', 'arrays not descended');

const dna = learnFromObservations(
  [
    {
      method: 'GET',
      path: '/api/profile',
      host: '127.0.0.1',
      status: 200,
      contentType: 'application/json',
      body: { data: { user: { id: 1, name: 'a' }, role: 'user' }, ok: true },
    },
  ],
  { app_id: 'nested', mode: 'certified' },
);
const route = dna.routes[0];
assert(route.response_key_fingerprint === 'data,data.role,data.user,ok', 'learned nested');
assert(!route.response_key_fingerprint.includes('data.user.id'), 'depth cap');

const implant = scoreResponse(route, {
  status: 200,
  contentType: 'application/json',
  body: { data: { user: { id: 1, name: 'a' }, role: 'user', exfil: 'x' }, ok: true },
});
assert(implant.allow === false && implant.hole.code === 'HX-SCHEMA-DRIFT', 'nested implant');

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
function get(port, urlPath) {
  return new Promise((resolve, reject) => {
    const r = http.request(
      { hostname: '127.0.0.1', port, path: urlPath, method: 'GET', headers: { host: '127.0.0.1' } },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8'), headers: res.headers }),
        );
      },
    );
    r.on('error', reject);
    r.end();
  });
}

const apiPort = 4193;
const helixPort = 4194;
const observePath = path.join(dataDir, 'obs.ndjson');
const certPath = path.join(dataDir, 'certified.dna.json');

start([path.join(root, 'fixtures/demo-api/server.mjs')], { PORT: String(apiPort), HOST: '127.0.0.1' });
await sleep(300);
start([path.join(root, 'packages/helix-proxy/server.mjs')], {
  PORT: String(helixPort),
  UPSTREAM: `http://127.0.0.1:${apiPort}`,
  MODE: 'learn',
  OBSERVE: observePath,
});
await sleep(400);
await get(helixPort, '/api/profile');
await sleep(200);
for (const c of kids.splice(0)) {
  try {
    c.kill('SIGTERM');
  } catch {
    /* ignore */
  }
}
await sleep(200);

const lines = fs
  .readFileSync(observePath, 'utf8')
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l));
const learned = learnFromObservations(lines, { app_id: 'nested-smoke', mode: 'certified' });
fs.writeFileSync(certPath, JSON.stringify(learned, null, 2));
const profile = learned.routes.find((r) => r.path_template === '/api/profile');
assert(profile?.response_key_fingerprint?.includes('data.user'), 'proxy learned nested');

start([path.join(root, 'fixtures/demo-api/server.mjs')], {
  PORT: String(apiPort),
  HOST: '127.0.0.1',
  NESTED_DRIFT: '1',
});
await sleep(300);
start([path.join(root, 'packages/helix-proxy/server.mjs')], {
  PORT: String(helixPort),
  UPSTREAM: `http://127.0.0.1:${apiPort}`,
  MODE: 'enforce',
  DNA: certPath,
});
await sleep(400);

const blocked = await get(helixPort, '/api/profile');
assert(blocked.status === 403, `expected 403 got ${blocked.status} ${blocked.body}`);
assert(blocked.headers['x-helix-hole'] === 'HX-SCHEMA-DRIFT', 'hole header');

for (const c of kids) {
  try {
    c.kill('SIGTERM');
  } catch {
    /* ignore */
  }
}

console.log('NESTED_DRIFT_SMOKE_OK');
