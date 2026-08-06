#!/usr/bin/env node
/**
 * Out-of-box compose gate (BEGINNING / D5 — no CWL).
 * Default: validate `docker compose config`.
 * HELIX_COMPOSE_FULL=1 → up/build + /api/health (slower).
 * Token: COMPOSE_SMOKE_OK | COMPOSE_SMOKE_SKIP
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const composeFile = path.join(ROOT, 'docker-compose.yml');
const full = process.env.HELIX_COMPOSE_FULL === '1' || process.env.HELIX_COMPOSE_FULL === 'true';

function dockerOk() {
  const r = spawnSync('docker', ['version'], { encoding: 'utf8', timeout: 15_000 });
  return r.status === 0;
}

function compose(args, timeout = 120_000) {
  return spawnSync('docker', ['compose', '-f', composeFile, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
    env: process.env,
  });
}

if (!fs.existsSync(composeFile)) {
  console.log('COMPOSE_SMOKE_SKIP (docker-compose.yml missing)');
  process.exit(0);
}

if (!dockerOk()) {
  console.log('COMPOSE_SMOKE_SKIP (docker not available)');
  process.exit(0);
}

console.log('=== compose config ===');
let r = compose(['config', '-q'], 30_000);
if (r.status !== 0) {
  console.error(r.stderr || r.stdout || 'compose config failed');
  process.exit(r.status ?? 1);
}

if (!full) {
  console.log('COMPOSE_SMOKE_OK (config; set HELIX_COMPOSE_FULL=1 for up/health)');
  process.exit(0);
}

console.log('=== compose up --build ===');
r = compose(['up', '-d', '--build'], 300_000);
if (r.status !== 0) {
  console.error(r.stderr || r.stdout || 'compose up failed');
  compose(['down', '-v'], 60_000);
  process.exit(r.status ?? 1);
}

try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    const ping = spawnSync(
      process.execPath,
      [
        '-e',
        `fetch('http://127.0.0.1:4080/api/health').then(x=>{console.log(x.status);process.exit(0)}).catch(()=>process.exit(1))`,
      ],
      { encoding: 'utf8', timeout: 4000 },
    );
    if (ping.status === 0 && String(ping.stdout).trim() === '200') {
      ready = true;
      break;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
  if (!ready) throw new Error('helix /api/health not ready');
  console.log('COMPOSE_SMOKE_OK');
} catch (e) {
  console.error(String(e.message || e));
  process.exit(1);
} finally {
  compose(['down', '-v'], 60_000);
}
