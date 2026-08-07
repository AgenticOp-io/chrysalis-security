#!/usr/bin/env node
/**
 * Beginning bar: HTML+static+JSON behind Helix learn→promote→enforce.
 * Token: REAL_SITE_SMOKE_OK
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data', 'real-site-smoke');
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

const apiPort = 4095;
const helixPort = 4096;
const observePath = path.join(dataDir, 'obs.ndjson');
const draftPath = path.join(dataDir, 'draft.dna.json');
const certPath = path.join(dataDir, 'certified.dna.json');

start([path.join(root, 'fixtures/real-site/server.mjs')], { PORT: String(apiPort), HOST: '127.0.0.1' });
await sleep(300);
start([path.join(root, 'packages/helix-proxy/server.mjs')], {
  PORT: String(helixPort),
  UPSTREAM: `http://127.0.0.1:${apiPort}`,
  MODE: 'learn',
  OBSERVE: observePath,
});
await sleep(400);

for (const p of ['/', '/assets/site.css', '/assets/app.aaaa1111.js', '/api/health', '/api/items']) {
  const r = await get(helixPort, p);
  assert(r.status === 200, `${p} learn ${r.status}`);
}
await sleep(200);
for (const c of kids.splice(0)) {
  try {
    c.kill('SIGTERM');
  } catch {
    /* ignore */
  }
}
await sleep(200);

await run([
  path.join(root, 'packages/helix-cli/bin/helix.mjs'),
  'learn',
  '--in',
  observePath,
  '--out',
  draftPath,
  '--app-id',
  'real-site',
]);
await run([
  path.join(root, 'packages/helix-cli/bin/helix.mjs'),
  'promote',
  '--in',
  draftPath,
  '--out',
  certPath,
]);

const dna = JSON.parse(fs.readFileSync(certPath, 'utf8'));
assert(dna.routes.some((r) => r.path_template === '/'), 'html route');
assert(dna.routes.some((r) => r.path_template === '/**/*.js'), 'js collapse');
assert(dna.routes.some((r) => r.path_template === '/api/items'), 'api route');

start([path.join(root, 'fixtures/real-site/server.mjs')], { PORT: String(apiPort), HOST: '127.0.0.1' });
await sleep(300);
start([path.join(root, 'packages/helix-proxy/server.mjs')], {
  PORT: String(helixPort),
  UPSTREAM: `http://127.0.0.1:${apiPort}`,
  MODE: 'enforce',
  DNA: certPath,
});
await sleep(400);

assert((await get(helixPort, '/')).status === 200, 'html enforce');
assert((await get(helixPort, '/api/health')).status === 200, 'api enforce');
assert((await get(helixPort, '/assets/app.bbbb2222.js')).status === 200, 'hashed js collapse');
const bad = await get(helixPort, '/api/backdoor');
assert(bad.status === 403 && bad.headers['x-helix-hole'] === 'HX-ROUTE-UNKNOWN', 'backdoor blocked');

await run([path.join(root, 'packages/helix-cli/bin/helix.mjs'), 'ready', '--in', certPath, '--target', 'shadow']);

for (const c of kids) {
  try {
    c.kill('SIGTERM');
  } catch {
    /* ignore */
  }
}

console.log('REAL_SITE_SMOKE_OK');
