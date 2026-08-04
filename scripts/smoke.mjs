#!/usr/bin/env node
/**
 * Local / GCE day-one smoke (no Docker required).
 * learn → promote → enforce backdoor 403 → shadow allows with header
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data', 'smoke');
fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

const observePath = path.join(dataDir, 'observations.ndjson');
const draftPath = path.join(dataDir, 'draft.dna.json');
const certPath = path.join(dataDir, 'certified.dna.json');
const shadowLog = path.join(dataDir, 'shadow.ndjson');

const kids = [];

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    kids.push(child);
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('exit', (code) => {
      if (code === 0) resolve({ out, err });
      else reject(new Error(`${cmd} ${args.join(' ')} exited ${code}\n${err || out}`));
    });
  });
}

function start(cmd, args, env = {}) {
  const child = spawn(cmd, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  kids.push(child);
  child.stderr.on('data', (d) => process.stderr.write(d));
  child.stdout.on('data', (d) => process.stdout.write(d));
  return child;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function get(port, urlPath, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path: urlPath, method: 'GET', headers: { host: '127.0.0.1', ...headers } },
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

async function waitPort(port, tries = 40) {
  for (let i = 0; i < tries; i++) {
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
process.on('SIGINT', () => { cleanup(); process.exit(130); });

async function main() {
  console.log('=== Helix smoke: start demo-api ===');
  start(process.execPath, ['fixtures/demo-api/server.mjs'], { PORT: '4090' });
  await waitPort(4090);

  console.log('=== learn mode ===');
  start(process.execPath, ['packages/helix-proxy/server.mjs'], {
    UPSTREAM: 'http://127.0.0.1:4090',
    MODE: 'learn',
    OBSERVE: observePath,
    PORT: '4080',
  });
  await sleep(300);
  await get(4080, '/api/health');
  await get(4080, '/api/items');
  await get(4080, '/api/health');
  await sleep(200);

  if (!fs.existsSync(observePath)) throw new Error('no observations written');
  console.log('observations ok');

  await run(process.execPath, [
    'packages/helix-cli/bin/helix.mjs', 'learn',
    '--in', observePath, '--out', draftPath, '--app-id', 'demo',
  ]);
  await run(process.execPath, [
    'packages/helix-cli/bin/helix.mjs', 'promote',
    '--in', draftPath, '--out', certPath,
  ]);

  // kill learn proxy (last helix child roughly — kill all helix by restarting clean)
  cleanup();
  kids.length = 0;
  await sleep(200);

  start(process.execPath, ['fixtures/demo-api/server.mjs'], { PORT: '4090' });
  await waitPort(4090);

  console.log('=== enforce mode ===');
  start(process.execPath, ['packages/helix-proxy/server.mjs'], {
    UPSTREAM: 'http://127.0.0.1:4090',
    MODE: 'enforce',
    DNA: certPath,
    PORT: '4081',
  });
  await sleep(300);

  const ok = await get(4081, '/api/health');
  if (ok.status !== 200) throw new Error(`health expected 200 got ${ok.status} ${ok.body}`);

  const blocked = await get(4081, '/api/backdoor');
  if (blocked.status !== 403) throw new Error(`backdoor expected 403 got ${blocked.status} ${blocked.body}`);
  if (!blocked.body.includes('HX-ROUTE-UNKNOWN')) throw new Error(`missing HX-ROUTE-UNKNOWN: ${blocked.body}`);
  console.log('enforce blocked backdoor ok');

  cleanup();
  kids.length = 0;
  await sleep(200);

  start(process.execPath, ['fixtures/demo-api/server.mjs'], { PORT: '4090' });
  await waitPort(4090);

  console.log('=== shadow mode ===');
  start(process.execPath, ['packages/helix-proxy/server.mjs'], {
    UPSTREAM: 'http://127.0.0.1:4090',
    MODE: 'shadow',
    DNA: certPath,
    SHADOW_LOG: shadowLog,
    PORT: '4082',
  });
  await sleep(300);

  const shadowed = await get(4082, '/api/backdoor');
  if (shadowed.status !== 200) throw new Error(`shadow should pass through, got ${shadowed.status}`);
  if (shadowed.headers['x-helix-shadow-hole'] !== 'HX-ROUTE-UNKNOWN') {
    throw new Error(`expected shadow header, got ${JSON.stringify(shadowed.headers)}`);
  }
  console.log('shadow logged backdoor ok');

  // diff fixture still works
  await run(process.execPath, [
    'packages/helix-cli/bin/helix.mjs', 'diff',
    '--a', 'certificates/demo-certified.json',
    '--b', 'certificates/demo-draft-backdoor.json',
  ]).then(
    () => { throw new Error('diff should exit 2'); },
    (err) => {
      if (!String(err.message).includes('exited 2')) throw err;
    },
  );
  console.log('diff detects backdoor ok');

  cleanup();
  console.log('\nSMOKE_OK');
}

main().catch((err) => {
  console.error('\nSMOKE_FAIL', err);
  cleanup();
  process.exit(1);
});
