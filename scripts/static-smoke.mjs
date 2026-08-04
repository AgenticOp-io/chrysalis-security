#!/usr/bin/env node
/**
 * Learn a mini real site (HTML+CSS+JS+API) through Helix;
 * prove static collapse allows a new hashed JS path;
 * prove /api/backdoor still blocked.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { learnFromObservations, pathTemplate } from '../packages/dna-core/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data', 'static-smoke');
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
  console.log('=== static-smoke: mini real site ===');
  start(['fixtures/static-site/server.mjs'], { PORT: '4091', HOST: '127.0.0.1' });
  await waitPort(4091);

  start(['packages/helix-agent/bin/helix-agent.mjs'], {
    LISTEN_HOST: '0.0.0.0',
    LISTEN_PORT: '4085',
    APP_UPSTREAM: 'http://127.0.0.1:4091',
    MODE: 'learn',
    OBSERVE: observePath,
  });
  await sleep(400);

  await get(4085, '/');
  await get(4085, '/assets/site.css');
  await get(4085, '/assets/app.7f3a9c.js');
  await get(4085, '/api/health');

  await run(['packages/helix-cli/bin/helix.mjs', 'learn', '--in', observePath, '--out', draftPath, '--app-id', 'static-site']);
  await run(['packages/helix-cli/bin/helix.mjs', 'promote', '--in', draftPath, '--out', certPath]);

  const dna = JSON.parse(fs.readFileSync(certPath, 'utf8'));
  const js = dna.routes.filter((r) => r.path_template === '/**/*.js');
  if (js.length !== 1) throw new Error(`expected one collapsed js route, got ${js.length}`);
  if (pathTemplate('/assets/app.OTHER.js') !== '/**/*.js') throw new Error('collapse broken');

  cleanup();
  kids.length = 0;
  await sleep(200);

  start(['fixtures/static-site/server.mjs'], { PORT: '4091', HOST: '127.0.0.1' });
  await waitPort(4091);
  start(['packages/helix-agent/bin/helix-agent.mjs'], {
    LISTEN_HOST: '0.0.0.0',
    LISTEN_PORT: '4085',
    APP_UPSTREAM: 'http://127.0.0.1:4091',
    MODE: 'enforce',
    DNA: certPath,
  });
  await sleep(400);

  const page = await get(4085, '/');
  if (page.status !== 200) throw new Error(`index ${page.status}`);

  // New hash — never learned as that exact path — must still pass via /**/*.js
  // Site maps /assets/app.js → app.7f3a9c.js; hit a path that only exists as collapse
  const css = await get(4085, '/assets/site.css');
  if (css.status !== 200) throw new Error(`css ${css.status}`);

  // Create a second js file on the fly and request it through helix
  const extraJs = path.join(root, 'fixtures/static-site/public/assets/app.deadbeef.js');
  fs.writeFileSync(extraJs, 'console.log("other-hash");\n');
  try {
    const other = await get(4085, '/assets/app.deadbeef.js');
    if (other.status !== 200) throw new Error(`collapsed js expected 200 got ${other.status}`);
  } finally {
    fs.unlinkSync(extraJs);
  }

  const blocked = await get(4085, '/api/backdoor');
  if (blocked.status !== 403 || !blocked.body.includes('HX-ROUTE-UNKNOWN')) {
    throw new Error(`backdoor not blocked: ${blocked.status} ${blocked.body}`);
  }

  cleanup();
  console.log('\nSTATIC_SMOKE_OK');
}

main().catch((err) => {
  console.error('\nSTATIC_SMOKE_FAIL', err);
  cleanup();
  process.exit(1);
});
