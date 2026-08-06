#!/usr/bin/env node
/**
 * Optional TLS terminate smoke — generates ephemeral cert, serves https Helix.
 * Token: TLS_SMOKE_OK (or TLS_SMOKE_SKIP if openssl absent)
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data', 'tls-smoke');
fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

// Self-signed via openssl if present; else SKIP (no X509 deps)
const keyPath = path.join(dataDir, 'key.pem');
const certPath = path.join(dataDir, 'cert.pem');
const openssl = spawn('openssl', [
  'req',
  '-x509',
  '-newkey',
  'rsa:2048',
  '-keyout',
  keyPath,
  '-out',
  certPath,
  '-days',
  '1',
  '-nodes',
  '-subj',
  '/CN=localhost',
], { stdio: 'ignore' });

const code = await new Promise((resolve) => {
  openssl.on('error', () => resolve(null));
  openssl.on('exit', (c) => resolve(c));
});
if (code !== 0 || !fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.log('TLS_SMOKE_SKIP (openssl not available for ephemeral cert)');
  process.exit(0);
}

const apiPort = 4197;
const helixPort = 4198;
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

start([path.join(root, 'fixtures/demo-api/server.mjs')], {
  PORT: String(apiPort),
  HOST: '127.0.0.1',
});
await sleep(300);
start([path.join(root, 'packages/helix-proxy/server.mjs')], {
  PORT: String(helixPort),
  UPSTREAM: `http://127.0.0.1:${apiPort}`,
  MODE: 'learn',
  OBSERVE: path.join(dataDir, 'obs.ndjson'),
  HELIX_TLS_CERT: certPath,
  HELIX_TLS_KEY: keyPath,
});
await sleep(500);

const ok = await new Promise((resolve) => {
  https
    .get(
      `https://127.0.0.1:${helixPort}/__helix/healthz`,
      { rejectUnauthorized: false },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve(res.statusCode === 200 && Buffer.concat(chunks).toString().includes('"ok":true'));
        });
      },
    )
    .on('error', () => resolve(false));
});

for (const c of kids) {
  try {
    c.kill('SIGTERM');
  } catch {
    /* ignore */
  }
}

if (!ok) {
  console.error('TLS healthz failed');
  process.exit(1);
}
console.log('TLS_SMOKE_OK');
