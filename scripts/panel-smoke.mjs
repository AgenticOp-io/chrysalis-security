#!/usr/bin/env node
/**
 * Prove control panel + snapshot API (never DNA-gated).
 * Token: PANEL_SMOKE_OK
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data', 'panel-smoke');
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

function get(port, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path: urlPath, method: 'GET' },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            type: res.headers['content-type'] || '',
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function wait(port) {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await get(port, '/__helix/healthz');
      if (r.status === 200) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('proxy not up');
}

const demoPort = 19091;
const proxyPort = 19090;
start(['fixtures/demo-api/server.mjs'], { PORT: String(demoPort), HOST: '127.0.0.1' });
start(['packages/helix-proxy/server.mjs'], {
  PORT: String(proxyPort),
  UPSTREAM: `http://127.0.0.1:${demoPort}`,
  MODE: 'learn',
  OBSERVE: path.join(dataDir, 'obs.ndjson'),
  SIEM_LOG: path.join(dataDir, 'siem.ndjson'),
  HELIX_ROOT_PANEL: '1',
});
await wait(proxyPort);

const panel = await get(proxyPort, '/__helix/');
if (panel.status !== 200 || !panel.type.includes('text/html') || !panel.body.includes('Helix')) {
  throw new Error(`panel bad: ${panel.status} ${panel.type}`);
}
const rootPanel = await get(proxyPort, '/');
if (rootPanel.status !== 200 || !rootPanel.body.includes('Helix')) {
  throw new Error('HELIX_ROOT_PANEL=/ failed');
}
const snap = await get(proxyPort, '/__helix/api/snapshot');
const j = JSON.parse(snap.body);
if (!j.ok || j.mode !== 'learn' || !j.observations) {
  throw new Error(`snapshot bad: ${snap.body}`);
}

cleanup();
console.log('PANEL_SMOKE_OK');
process.exit(0);
