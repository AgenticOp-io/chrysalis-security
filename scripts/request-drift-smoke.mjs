#!/usr/bin/env node
/**
 * Prove request JSON key DNA: learn POST shape → drifted keys → HX-REQUEST-SCHEMA-DRIFT.
 * Also proves /__helix/healthz and SIEM_LOG hole events.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { learnFromObservations, scoreRequest } from '../packages/dna-core/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data', 'request-drift-smoke');
fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

const kids = [];
function start(args, env) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  kids.push(child);
  return child;
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function req(port, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const r = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: {
          host: '127.0.0.1',
          ...(payload
            ? { 'content-type': 'application/json', 'content-length': String(payload.length) }
            : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            body: Buffer.concat(chunks).toString('utf8'),
            headers: res.headers,
          }),
        );
      },
    );
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}
async function waitPort(port) {
  for (let i = 0; i < 50; i++) {
    try {
      await req(port, 'GET', '/__helix/healthz');
      return;
    } catch {
      await sleep(100);
    }
  }
  throw new Error(`port ${port} not up`);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Unit: learn + score request drift
const dna = learnFromObservations(
  [
    {
      method: 'POST',
      path: '/api/items',
      host: '127.0.0.1',
      status: 200,
      contentType: 'application/json',
      body: { ok: true },
      requestContentType: 'application/json',
      requestBody: { name: 'a', qty: 1 },
    },
  ],
  { app_id: 'req-unit', mode: 'certified' },
);
assert(dna.routes[0].request_key_fingerprint === 'name,qty', 'learned request keys');
const bad = scoreRequest(dna, {
  method: 'POST',
  path: '/api/items',
  host: '127.0.0.1',
  contentType: 'application/json',
  body: { name: 'a', qty: 1, pwned: true },
});
assert(bad.allow === false && bad.hole.code === 'HX-REQUEST-SCHEMA-DRIFT', 'request drift scored');

const apiPort = 4195;
const helixPort = 4196;
const siemPath = path.join(dataDir, 'siem.ndjson');
const observePath = path.join(dataDir, 'observations.ndjson');
const certPath = path.join(dataDir, 'certified.dna.json');

start([path.join(root, 'fixtures/demo-api/server.mjs')], {
  PORT: String(apiPort),
  HOST: '127.0.0.1',
});
await sleep(300);

start([path.join(root, 'packages/helix-proxy/server.mjs')], {
  PORT: String(helixPort),
  UPSTREAM: `http://127.0.0.1:${apiPort}`,
  MODE: 'learn',
  OBSERVE: observePath,
  DNA: '',
});
await waitPort(helixPort);

const hz = await req(helixPort, 'GET', '/__helix/healthz');
assert(hz.status === 200 && JSON.parse(hz.body).ok === true, 'healthz');

await req(helixPort, 'POST', '/api/items', { name: 'a', qty: 1 });
await sleep(200);

const { learnFromObservations: learn } = await import('../packages/dna-core/index.mjs');
const lines = fs
  .readFileSync(observePath, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((l) => JSON.parse(l));
const certified = learn(lines, { app_id: 'req-drift', mode: 'certified' });
fs.writeFileSync(certPath, JSON.stringify(certified, null, 2));

for (const c of kids) {
  try {
    c.kill('SIGTERM');
  } catch {
    /* ignore */
  }
}
kids.length = 0;
await sleep(200);

start([path.join(root, 'fixtures/demo-api/server.mjs')], {
  PORT: String(apiPort),
  HOST: '127.0.0.1',
});
await sleep(200);
start([path.join(root, 'packages/helix-proxy/server.mjs')], {
  PORT: String(helixPort),
  UPSTREAM: `http://127.0.0.1:${apiPort}`,
  MODE: 'enforce',
  DNA: certPath,
  SIEM_LOG: siemPath,
});
await waitPort(helixPort);

const okPost = await req(helixPort, 'POST', '/api/items', { name: 'a', qty: 1 });
assert(okPost.status === 200, `stable post ${okPost.status}`);

const driftPost = await req(helixPort, 'POST', '/api/items', { name: 'a', qty: 1, exfil: true });
assert(driftPost.status === 403, `drift post ${driftPost.status}`);
const hole = JSON.parse(driftPost.body).hole;
assert(hole?.code === 'HX-REQUEST-SCHEMA-DRIFT', `hole ${hole?.code}`);

assert(fs.existsSync(siemPath), 'siem log written');
const siem = fs
  .readFileSync(siemPath, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((l) => JSON.parse(l));
assert(siem.some((e) => e.kind === 'helix.hole' && e.hole?.code === 'HX-REQUEST-SCHEMA-DRIFT'), 'siem event');

for (const c of kids) {
  try {
    c.kill('SIGTERM');
  } catch {
    /* ignore */
  }
}

console.log('REQUEST_DRIFT_SMOKE_OK');
