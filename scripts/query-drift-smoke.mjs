#!/usr/bin/env node
/**
 * Prove query name fingerprint: learn page → surprise debug → HX-QUERY-SCHEMA-DRIFT.
 * Also proves proxy SIEM path for query holes.
 * Token: QUERY_DRIFT_SMOKE_OK
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { learnFromObservations, scoreRequest, queryKeyFingerprint } from '../packages/dna-core/index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data', 'query-drift-smoke');
fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(queryKeyFingerprint('/api/x?b=2&a=1') === 'a,b', 'sorted names');
assert(queryKeyFingerprint('/api/x') === '', 'no query');
assert(queryKeyFingerprint('?debug=1') === 'debug', 'search only');

const dna = learnFromObservations(
  [
    {
      method: 'GET',
      path: '/api/items',
      host: '127.0.0.1',
      status: 200,
      contentType: 'application/json',
      body: { items: [] },
      query: '?page=1',
    },
  ],
  { app_id: 'q', mode: 'certified' },
);
assert(dna.routes[0].query_key_fingerprint === 'page', 'learned page');

const good = scoreRequest(dna, { method: 'GET', path: '/api/items', host: '127.0.0.1', query: '?page=2' });
assert(good.allow === true, 'same names allow');

const bad = scoreRequest(dna, {
  method: 'GET',
  path: '/api/items',
  host: '127.0.0.1',
  query: '?page=1&debug=1',
});
assert(bad.allow === false && bad.hole.code === 'HX-QUERY-SCHEMA-DRIFT', 'query drift');

const none = scoreRequest(dna, { method: 'GET', path: '/api/items', host: '127.0.0.1', query: '' });
assert(none.allow === false && none.hole.code === 'HX-QUERY-SCHEMA-DRIFT', 'missing learned names');

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

const apiPort = 4195;
const helixPort = 4196;
const observePath = path.join(dataDir, 'obs.ndjson');
const certPath = path.join(dataDir, 'certified.dna.json');
const siemPath = path.join(dataDir, 'siem.ndjson');

start([path.join(root, 'fixtures/demo-api/server.mjs')], { PORT: String(apiPort), HOST: '127.0.0.1' });
await sleep(300);
start([path.join(root, 'packages/helix-proxy/server.mjs')], {
  PORT: String(helixPort),
  UPSTREAM: `http://127.0.0.1:${apiPort}`,
  MODE: 'learn',
  OBSERVE: observePath,
});
await sleep(400);
await req(helixPort, 'GET', '/api/items?page=1');
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
const learned = learnFromObservations(lines, { app_id: 'query-smoke', mode: 'certified' });
fs.writeFileSync(certPath, JSON.stringify(learned, null, 2));
assert(learned.routes.find((r) => r.path_template === '/api/items')?.query_key_fingerprint === 'page', 'proxy learned page');

start([path.join(root, 'fixtures/demo-api/server.mjs')], { PORT: String(apiPort), HOST: '127.0.0.1' });
await sleep(300);
start([path.join(root, 'packages/helix-proxy/server.mjs')], {
  PORT: String(helixPort),
  UPSTREAM: `http://127.0.0.1:${apiPort}`,
  MODE: 'enforce',
  DNA: certPath,
  SIEM_LOG: siemPath,
});
await sleep(400);

const blocked = await req(helixPort, 'GET', '/api/items?page=1&debug=1');
assert(blocked.status === 403, `expected 403 got ${blocked.status}`);
assert(blocked.headers['x-helix-hole'] === 'HX-QUERY-SCHEMA-DRIFT', 'hole header');
const siem = fs
  .readFileSync(siemPath, 'utf8')
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l));
assert(
  siem.some((e) => e.hole?.code === 'HX-QUERY-SCHEMA-DRIFT'),
  'siem query hole',
);

const allowed = await req(helixPort, 'GET', '/api/items?page=9');
assert(allowed.status === 200, 'same query names allow');

for (const c of kids) {
  try {
    c.kill('SIGTERM');
  } catch {
    /* ignore */
  }
}

console.log('QUERY_DRIFT_SMOKE_OK');
