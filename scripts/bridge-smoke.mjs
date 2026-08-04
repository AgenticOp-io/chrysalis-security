#!/usr/bin/env node
/**
 * Mode B bridge spike: app on localhost, helix-bridge on public listen,
 * learn → promote → enforce (same DNA path as Mode A, placement=bridge).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data', 'bridge-smoke');
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
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
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
  console.log('=== bridge-smoke: Mode B userspace spike ===');
  start(['fixtures/demo-api/server.mjs'], { PORT: '4094', HOST: '127.0.0.1' });
  await waitPort(4094);

  start(['packages/helix-bridge/bin/helix-bridge.mjs'], {
    LISTEN_HOST: '0.0.0.0',
    LISTEN_PORT: '4088',
    APP_UPSTREAM: 'http://127.0.0.1:4094',
    MODE: 'learn',
    OBSERVE: observePath,
  });
  await sleep(400);
  await get(4088, '/api/health');
  await get(4088, '/api/items');
  await sleep(200);

  await run(['packages/helix-cli/bin/helix.mjs', 'learn', '--in', observePath, '--out', draftPath, '--app-id', 'bridge-demo']);
  await run(['packages/helix-cli/bin/helix.mjs', 'promote', '--in', draftPath, '--out', certPath]);

  cleanup();
  kids.length = 0;
  await sleep(200);

  start(['fixtures/demo-api/server.mjs'], { PORT: '4094', HOST: '127.0.0.1' });
  await waitPort(4094);
  start(['packages/helix-bridge/bin/helix-bridge.mjs'], {
    LISTEN_HOST: '0.0.0.0',
    LISTEN_PORT: '4088',
    APP_UPSTREAM: 'http://127.0.0.1:4094',
    MODE: 'enforce',
    DNA: certPath,
  });
  await sleep(400);

  const ok = await get(4088, '/api/health');
  if (ok.status !== 200) throw new Error(`health ${ok.status}`);
  const blocked = await get(4088, '/api/backdoor');
  if (blocked.status !== 403 || !blocked.body.includes('HX-ROUTE-UNKNOWN')) {
    throw new Error(`backdoor ${blocked.status} ${blocked.body}`);
  }

  cleanup();
  console.log('\nBRIDGE_SMOKE_OK');
}

main().catch((err) => {
  console.error('\nBRIDGE_SMOKE_FAIL', err);
  cleanup();
  process.exit(1);
});
