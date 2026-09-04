#!/usr/bin/env node
/**
 * Schema-drift fixture deepen: unit scoreResponse + fixture learn→promote→
 * enforce allow / extra-key deny / missing-key deny / shadow header.
 *
 * Fixture: fixtures/schema-drift/observations.ndjson
 * Tokens: SCHEMA_DRIFT_UNIT_* · SCHEMA_DRIFT_FIXTURE_LEARN_OK · SCHEMA_DRIFT_ENFORCE_* ·
 *         SCHEMA_DRIFT_SHADOW_OK · SCHEMA_DRIFT_SMOKE_OK
 * Pack: test:dna · gce-smoke (wired)
 * D5: DNA-only (no CWL required).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { scoreResponse } from '../packages/dna-core/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const fxObs = path.join(root, 'fixtures', 'schema-drift', 'observations.ndjson');
const dataDir = path.join(root, 'data', 'schema-drift-smoke');
fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

const draftPath = path.join(dataDir, 'draft.dna.json');
const certPath = path.join(dataDir, 'certified.dna.json');
const kids = [];
const tokens = [];

function token(name) {
  tokens.push(name);
  console.log(name);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function start(args, env) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  kids.push(child);
  child.stdout.on('data', (d) => process.stdout.write(d));
  child.stderr.on('data', (d) => process.stderr.write(d));
  return child;
}

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => { err += d; });
    child.stdout.on('data', (d) => { err += d; });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(err || `exit ${code}`))));
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function get(port, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path: urlPath, method: 'GET', headers: { host: '127.0.0.1' } },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function waitPort(port) {
  for (let i = 0; i < 50; i++) {
    try {
      await get(port, '/api/health');
      return;
    } catch {
      await sleep(100);
    }
  }
  throw new Error(`port ${port} not up`);
}

function cleanup() {
  for (const k of kids) {
    try { k.kill('SIGTERM'); } catch { /* ignore */ }
  }
  kids.length = 0;
}

process.on('exit', cleanup);

const itemsRoute = {
  method: 'GET',
  path_template: '/api/items',
  host: '127.0.0.1',
  content_class: 'json',
  status_classes: [200],
  response_key_fingerprint: 'items',
};

async function main() {
  assert(fs.existsSync(fxObs), `missing fixture ${fxObs}`);

  console.log('=== schema-drift-smoke: unit scoreResponse ===');
  const extra = scoreResponse(itemsRoute, {
    contentType: 'application/json',
    body: { items: [], pwned: true },
  });
  assert(!extra.allow && extra.hole?.code === 'HX-SCHEMA-DRIFT', `extra: ${JSON.stringify(extra)}`);
  token('SCHEMA_DRIFT_UNIT_EXTRA_OK');

  const missing = scoreResponse(itemsRoute, {
    contentType: 'application/json',
    body: {},
  });
  assert(!missing.allow && missing.hole?.code === 'HX-SCHEMA-DRIFT', `missing: ${JSON.stringify(missing)}`);
  token('SCHEMA_DRIFT_UNIT_MISSING_OK');

  const failClosed = scoreResponse(itemsRoute, {
    contentType: 'application/json',
    body: null,
  });
  assert(
    !failClosed.allow && failClosed.hole?.code === 'HX-SCHEMA-DRIFT',
    `fail-closed: ${JSON.stringify(failClosed)}`,
  );
  token('SCHEMA_DRIFT_UNIT_FAILCLOSED_OK');

  const allow = scoreResponse(itemsRoute, {
    contentType: 'application/json',
    body: { items: [{ id: 1 }] },
  });
  assert(allow.allow === true && !allow.hole, `allow: ${JSON.stringify(allow)}`);
  token('SCHEMA_DRIFT_UNIT_ALLOW_OK');

  console.log('=== fixture learn → promote ===');
  await run([
    'packages/helix-cli/bin/helix.mjs',
    'learn',
    '--in',
    fxObs,
    '--out',
    draftPath,
    '--app-id',
    'schema-drift-fixture',
  ]);
  await run(['packages/helix-cli/bin/helix.mjs', 'promote', '--in', draftPath, '--out', certPath]);

  const dna = JSON.parse(fs.readFileSync(certPath, 'utf8'));
  const items = dna.routes.find((r) => r.path_template === '/api/items');
  assert(items?.response_key_fingerprint === 'items', `fingerprint items, got ${JSON.stringify(items)}`);
  const health = dna.routes.find((r) => r.path_template === '/api/health');
  assert(
    health?.response_key_fingerprint === 'ok,service',
    `health fingerprint, got ${JSON.stringify(health)}`,
  );
  token('SCHEMA_DRIFT_FIXTURE_LEARN_OK');

  console.log('=== enforce allow (stable upstream) ===');
  start(['fixtures/demo-api/server.mjs'], { PORT: '4092', HOST: '127.0.0.1' });
  await waitPort(4092);
  start(['packages/helix-proxy/server.mjs'], {
    UPSTREAM: 'http://127.0.0.1:4092',
    MODE: 'enforce',
    DNA: certPath,
    PORT: '4083',
  });
  await sleep(300);

  const healthOk = await get(4083, '/api/health');
  assert(healthOk.status === 200, `health expected 200 got ${healthOk.status}`);
  const itemsOk = await get(4083, '/api/items');
  assert(itemsOk.status === 200, `items allow expected 200 got ${itemsOk.status} ${itemsOk.body}`);
  token('SCHEMA_DRIFT_ENFORCE_ALLOW_OK');

  cleanup();
  await sleep(200);

  console.log('=== enforce extra-key drift ===');
  start(['fixtures/demo-api/server.mjs'], { PORT: '4092', HOST: '127.0.0.1', DRIFT: 'extra' });
  await waitPort(4092);
  start(['packages/helix-proxy/server.mjs'], {
    UPSTREAM: 'http://127.0.0.1:4092',
    MODE: 'enforce',
    DNA: certPath,
    PORT: '4083',
  });
  await sleep(300);

  const drifted = await get(4083, '/api/items');
  assert(drifted.status === 403, `extra expected 403 got ${drifted.status} ${drifted.body}`);
  assert(drifted.body.includes('HX-SCHEMA-DRIFT'), `missing HX-SCHEMA-DRIFT: ${drifted.body}`);
  assert(
    drifted.headers['x-helix-hole'] === 'HX-SCHEMA-DRIFT',
    `expected x-helix-hole HX-SCHEMA-DRIFT, got ${drifted.headers['x-helix-hole']}`,
  );
  token('SCHEMA_DRIFT_ENFORCE_EXTRA_OK');

  cleanup();
  await sleep(200);

  console.log('=== enforce missing-key drift ===');
  start(['fixtures/demo-api/server.mjs'], { PORT: '4092', HOST: '127.0.0.1', DRIFT: 'missing' });
  await waitPort(4092);
  start(['packages/helix-proxy/server.mjs'], {
    UPSTREAM: 'http://127.0.0.1:4092',
    MODE: 'enforce',
    DNA: certPath,
    PORT: '4083',
  });
  await sleep(300);

  const missingLive = await get(4083, '/api/items');
  assert(missingLive.status === 403, `missing expected 403 got ${missingLive.status} ${missingLive.body}`);
  assert(missingLive.body.includes('HX-SCHEMA-DRIFT'), `missing hole text: ${missingLive.body}`);
  assert(
    missingLive.headers['x-helix-hole'] === 'HX-SCHEMA-DRIFT',
    `expected x-helix-hole HX-SCHEMA-DRIFT, got ${missingLive.headers['x-helix-hole']}`,
  );
  token('SCHEMA_DRIFT_ENFORCE_MISSING_OK');

  cleanup();
  await sleep(200);

  console.log('=== shadow allows drift with header ===');
  start(['fixtures/demo-api/server.mjs'], { PORT: '4092', HOST: '127.0.0.1', DRIFT: 'extra' });
  await waitPort(4092);
  start(['packages/helix-proxy/server.mjs'], {
    UPSTREAM: 'http://127.0.0.1:4092',
    MODE: 'shadow',
    DNA: certPath,
    SHADOW_LOG: path.join(dataDir, 'shadow.ndjson'),
    PORT: '4084',
  });
  await sleep(300);

  const shadowed = await get(4084, '/api/items');
  assert(shadowed.status === 200, `shadow should pass, got ${shadowed.status}`);
  assert(
    shadowed.headers['x-helix-shadow-hole'] === 'HX-SCHEMA-DRIFT',
    `expected shadow header HX-SCHEMA-DRIFT, got ${shadowed.headers['x-helix-shadow-hole']}`,
  );
  token('SCHEMA_DRIFT_SHADOW_OK');

  cleanup();
  token('SCHEMA_DRIFT_SMOKE_OK');
  console.log(`\npack tokens: ${tokens.join(' · ')}`);
}

main().catch((err) => {
  console.error('\nSCHEMA_DRIFT_SMOKE_FAIL', err);
  cleanup();
  process.exit(1);
});
