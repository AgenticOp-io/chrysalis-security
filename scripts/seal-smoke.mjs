/**
 * Prove panel Lock DNA (seal) + runtime mode switch — no CLI promote.
 * Token: SEAL_SMOKE_OK
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data', 'seal-smoke');
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
function cleanup() {
  for (const k of kids) {
    try {
      k.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
}
process.on('exit', cleanup);

function request(port, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: body ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } : {},
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      },
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function wait(port) {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await request(port, 'GET', '/__helix/healthz');
      if (r.status === 200) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('proxy not up');
}

const demoPort = 19101;
const proxyPort = 19100;
const dnaPath = path.join(dataDir, 'app.dna.json');
const observePath = path.join(dataDir, 'obs.ndjson');

start(['fixtures/demo-api/server.mjs'], { PORT: String(demoPort), HOST: '127.0.0.1' });
start(['packages/helix-proxy/server.mjs'], {
  PORT: String(proxyPort),
  UPSTREAM: `http://127.0.0.1:${demoPort}`,
  MODE: 'learn',
  DNA: dnaPath,
  OBSERVE: observePath,
  SHADOW_LOG: path.join(dataDir, 'shadow.ndjson'),
  SIEM_LOG: path.join(dataDir, 'siem.ndjson'),
  HELIX_ROOT_PANEL: '1',
});

await wait(proxyPort);
await request(proxyPort, 'GET', '/api/health');
await request(proxyPort, 'GET', '/api/items');

const seal = await request(proxyPort, 'POST', '/__helix/api/seal', JSON.stringify({ mode: 'shadow' }));
if (seal.status !== 200) {
  console.error('seal failed', seal);
  process.exit(1);
}
const sealed = JSON.parse(seal.body);
if (!sealed.sealed || sealed.mode !== 'shadow' || !(sealed.routes >= 1)) {
  console.error('bad seal body', sealed);
  process.exit(1);
}
console.log('SEAL_SMOKE_SEAL_OK');

const backdoorShadow = await request(proxyPort, 'GET', '/api/backdoor');
if (backdoorShadow.status === 403) {
  console.error('shadow should not 403 backdoor');
  process.exit(1);
}
console.log('SEAL_SMOKE_SHADOW_OK');

const mode = await request(proxyPort, 'POST', '/__helix/api/mode', JSON.stringify({ mode: 'enforce' }));
if (mode.status !== 200) {
  console.error('mode enforce failed', mode);
  process.exit(1);
}
const blocked = await request(proxyPort, 'GET', '/api/backdoor');
if (blocked.status !== 403) {
  console.error('enforce should 403 backdoor', blocked);
  process.exit(1);
}
console.log('SEAL_SMOKE_ENFORCE_OK');
console.log('SEAL_SMOKE_OK');
cleanup();
process.exit(0);
