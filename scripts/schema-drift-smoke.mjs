#!/usr/bin/env node
/**
 * Prove enforce blocks JSON response key drift (HX-SCHEMA-DRIFT).
 * learn certified shape → upstream drifts keys → 403.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { scoreResponse } from '../packages/dna-core/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data', 'schema-drift-smoke');
fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

const observePath = path.join(dataDir, 'observations.ndjson');
const draftPath = path.join(dataDir, 'draft.dna.json');
const certPath = path.join(dataDir, 'certified.dna.json');
const kids = [];

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
}

process.on('exit', cleanup);

async function main() {
  console.log('=== schema-drift-smoke: unit scoreResponse ===');
  const unit = scoreResponse(
    {
      method: 'GET',
      path_template: '/api/items',
      host: '127.0.0.1',
      content_class: 'json',
      status_classes: [200],
      response_key_fingerprint: 'items',
    },
    { contentType: 'application/json', body: { items: [], pwned: true } },
  );
  if (unit.allow || unit.hole?.code !== 'HX-SCHEMA-DRIFT') {
    throw new Error(`unit scoreResponse expected HX-SCHEMA-DRIFT, got ${JSON.stringify(unit)}`);
  }

  console.log('=== learn stable /api/items shape ===');
  start(['fixtures/demo-api/server.mjs'], { PORT: '4092', HOST: '127.0.0.1' });
  await waitPort(4092);

  start(['packages/helix-proxy/server.mjs'], {
    UPSTREAM: 'http://127.0.0.1:4092',
    MODE: 'learn',
    OBSERVE: observePath,
    PORT: '4083',
  });
  await sleep(300);
  await get(4083, '/api/health');
  await get(4083, '/api/items');
  await sleep(200);

  await run(['packages/helix-cli/bin/helix.mjs', 'learn', '--in', observePath, '--out', draftPath, '--app-id', 'drift-demo']);
  await run(['packages/helix-cli/bin/helix.mjs', 'promote', '--in', draftPath, '--out', certPath]);

  const dna = JSON.parse(fs.readFileSync(certPath, 'utf8'));
  const items = dna.routes.find((r) => r.path_template === '/api/items');
  if (!items || items.response_key_fingerprint !== 'items') {
    throw new Error(`expected fingerprint items, got ${JSON.stringify(items)}`);
  }

  cleanup();
  kids.length = 0;
  await sleep(200);

  console.log('=== enforce against drifted upstream ===');
  start(['fixtures/demo-api/server.mjs'], { PORT: '4092', HOST: '127.0.0.1', DRIFT: '1' });
  await waitPort(4092);

  start(['packages/helix-proxy/server.mjs'], {
    UPSTREAM: 'http://127.0.0.1:4092',
    MODE: 'enforce',
    DNA: certPath,
    PORT: '4083',
  });
  await sleep(300);

  const health = await get(4083, '/api/health');
  if (health.status !== 200) throw new Error(`health expected 200 got ${health.status}`);

  const drifted = await get(4083, '/api/items');
  if (drifted.status !== 403) throw new Error(`drift expected 403 got ${drifted.status} ${drifted.body}`);
  if (!drifted.body.includes('HX-SCHEMA-DRIFT')) {
    throw new Error(`missing HX-SCHEMA-DRIFT: ${drifted.body}`);
  }
  if (drifted.headers['x-helix-hole'] !== 'HX-SCHEMA-DRIFT') {
    throw new Error(`expected x-helix-hole HX-SCHEMA-DRIFT, got ${drifted.headers['x-helix-hole']}`);
  }
  console.log('enforce blocked schema drift ok');

  cleanup();
  kids.length = 0;
  await sleep(200);

  console.log('=== shadow allows drift with header ===');
  start(['fixtures/demo-api/server.mjs'], { PORT: '4092', HOST: '127.0.0.1', DRIFT: '1' });
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
  if (shadowed.status !== 200) throw new Error(`shadow should pass, got ${shadowed.status}`);
  if (shadowed.headers['x-helix-shadow-hole'] !== 'HX-SCHEMA-DRIFT') {
    throw new Error(`expected shadow header HX-SCHEMA-DRIFT, got ${shadowed.headers['x-helix-shadow-hole']}`);
  }
  console.log('shadow logged schema drift ok');

  cleanup();
  console.log('\nSCHEMA_DRIFT_SMOKE_OK');
}

main().catch((err) => {
  console.error('\nSCHEMA_DRIFT_SMOKE_FAIL', err);
  cleanup();
  process.exit(1);
});
