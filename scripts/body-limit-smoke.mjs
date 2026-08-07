#!/usr/bin/env node
/**
 * HELIX_MAX_BODY_BYTES → 413 HX-BODY-TOO-LARGE (even in learn — ops protect).
 * Token: BODY_LIMIT_SMOKE_OK
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data', 'body-limit-smoke');
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
function post(port, urlPath, body) {
  return new Promise((resolve, reject) => {
    const buf = Buffer.from(body);
    const r = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method: 'POST',
        headers: {
          host: '127.0.0.1',
          'content-type': 'application/json',
          'content-length': buf.length,
        },
      },
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
    r.write(buf);
    r.end();
  });
}

const apiPort = 4186;
const helixPort = 4187;
start([path.join(root, 'fixtures/demo-api/server.mjs')], { PORT: String(apiPort), HOST: '127.0.0.1' });
await sleep(300);
start([path.join(root, 'packages/helix-proxy/server.mjs')], {
  PORT: String(helixPort),
  UPSTREAM: `http://127.0.0.1:${apiPort}`,
  MODE: 'learn',
  OBSERVE: path.join(dataDir, 'obs.ndjson'),
  HELIX_MAX_BODY_BYTES: '64',
});
await sleep(400);

const small = await post(helixPort, '/api/items', JSON.stringify({ name: 'a' }));
assert(small.status === 200, `small ok got ${small.status}`);

const big = await post(helixPort, '/api/items', JSON.stringify({ name: 'x'.repeat(200) }));
assert(big.status === 413, `expected 413 got ${big.status} ${big.body}`);
assert(big.headers['x-helix-hole'] === 'HX-BODY-TOO-LARGE', 'hole header');
assert(big.body.includes('HX-BODY-TOO-LARGE'), 'hole body');

for (const c of kids) {
  try {
    c.kill('SIGTERM');
  } catch {
    /* ignore */
  }
}

console.log('BODY_LIMIT_SMOKE_OK');
