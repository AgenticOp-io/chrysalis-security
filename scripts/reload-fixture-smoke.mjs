#!/usr/bin/env node
/**
 * Fixture smoke: POST /__helix/reload after promote — DNA hot-apply without process restart.
 *
 * Path: fixture learn → promote (DNA A) → enforce (items deny) → promote (DNA B onto same path)
 *       → POST /__helix/reload (same PID) → items allow.
 * D5: DNA-only (no CWL required).
 *
 * Tokens: RELOAD_FIXTURE_DENY_OK · RELOAD_FIXTURE_HOT_OK · RELOAD_FIXTURE_OK
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const fx = path.join(root, 'fixtures', 'reload');
const dataDir = path.join(root, 'data', 'reload-fixture-smoke');
fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

const obsA = path.join(fx, 'observations-a.ndjson');
const obsB = path.join(fx, 'observations-b.ndjson');
const draftA = path.join(dataDir, 'draft-a.dna.json');
const draftB = path.join(dataDir, 'draft-b.dna.json');
const certPath = path.join(dataDir, 'certified.dna.json');
const SECRET = 'helix-reload-fixture-lab';

const apiPort = 4292;
const helixPort = 4293;
const kids = [];
const tokens = [];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function token(name) {
  tokens.push(name);
  console.log(name);
}

function start(args, env) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  kids.push(child);
  return child;
}

function helix(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, 'packages/helix-cli/bin/helix.mjs'), ...args], {
      cwd: root,
      env: {
        ...process.env,
        HELIX_DNA_KEY: SECRET,
        HELIX_DNA_KEY_ID: 'reload-fixture',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => {
      out += d;
    });
    child.stderr.on('data', (d) => {
      err += d;
    });
    child.on('exit', (code) => {
      if (code === 0) resolve({ out, err });
      else reject(new Error(`helix ${args.join(' ')} exited ${code}\n${err || out}`));
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function req(port, method, urlPath) {
  return new Promise((resolve, reject) => {
    const r = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: { host: '127.0.0.1' },
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
    r.end();
  });
}

async function waitHelix(port, tries = 50) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await req(port, 'GET', '/__helix/healthz');
      if (r.status === 200) return;
    } catch {
      /* retry */
    }
    await sleep(100);
  }
  throw new Error(`helix port ${port} not up`);
}

async function waitApi(port, tries = 50) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await req(port, 'GET', '/api/health');
      if (r.status === 200) return;
    } catch {
      /* retry */
    }
    await sleep(100);
  }
  throw new Error(`api port ${port} not up`);
}

function cleanup() {
  for (const k of kids) {
    try {
      k.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
  kids.length = 0;
}

process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(130);
});

async function main() {
  assert(fs.existsSync(obsA), 'fixture observations-a');
  assert(fs.existsSync(obsB), 'fixture observations-b');

  await helix(['learn', '--in', obsA, '--out', draftA, '--app-id', 'reload-fixture']);
  await helix(['promote', '--in', draftA, '--out', certPath]);
  assert(fs.existsSync(certPath), 'certified DNA A');

  start([path.join(root, 'fixtures/demo-api/server.mjs')], {
    PORT: String(apiPort),
    HOST: '127.0.0.1',
  });
  await waitApi(apiPort);

  const helixChild = start([path.join(root, 'packages/helix-proxy/server.mjs')], {
    PORT: String(helixPort),
    UPSTREAM: `http://127.0.0.1:${apiPort}`,
    MODE: 'enforce',
    DNA: certPath,
    HELIX_DNA_KEY: SECRET,
    HELIX_DNA_KEY_ID: 'reload-fixture',
  });
  await waitHelix(helixPort);
  const pidBefore = helixChild.pid;
  assert(pidBefore > 0, 'helix pid');

  const health = await req(helixPort, 'GET', '/api/health');
  assert(health.status === 200, `health under DNA A got ${health.status}`);

  const blocked = await req(helixPort, 'GET', '/api/items');
  assert(blocked.status === 403, `items deny under DNA A got ${blocked.status}`);
  assert(blocked.headers['x-helix-hole'] === 'HX-ROUTE-UNKNOWN', 'HX-ROUTE-UNKNOWN');

  const stA = await req(helixPort, 'GET', '/__helix/status');
  assert(stA.status === 200 && JSON.parse(stA.body).routes === 1, 'status routes=1 before promote');
  token('RELOAD_FIXTURE_DENY_OK');

  // Promote DNA B onto the same DNA= path while Helix keeps running (no restart).
  await helix(['learn', '--in', obsB, '--out', draftB, '--app-id', 'reload-fixture']);
  await helix(['promote', '--in', draftB, '--out', certPath, '--from', certPath]);

  const reloaded = await req(helixPort, 'POST', '/__helix/reload');
  assert(reloaded.status === 200, `reload ${reloaded.status} ${reloaded.body}`);
  const rj = JSON.parse(reloaded.body);
  assert(rj.reloaded === true && rj.routes === 2, `reload body ${reloaded.body}`);

  assert(helixChild.exitCode == null && !helixChild.killed, 'helix process must stay alive across reload');
  assert(helixChild.pid === pidBefore, 'same PID after reload');

  const items = await req(helixPort, 'GET', '/api/items');
  assert(items.status === 200, `items allow after reload got ${items.status}`);

  const stB = await req(helixPort, 'GET', '/__helix/status');
  assert(stB.status === 200 && JSON.parse(stB.body).routes === 2, 'status routes=2 after reload');
  token('RELOAD_FIXTURE_HOT_OK');

  cleanup();
  token('RELOAD_FIXTURE_OK');
  console.error(`reload-fixture tokens: ${tokens.join(' · ')}`);
}

main().catch((err) => {
  console.error('RELOAD_FIXTURE_FAIL', err);
  cleanup();
  process.exit(1);
});
