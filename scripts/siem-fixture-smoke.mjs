#!/usr/bin/env node
/**
 * SIEM_LOG fixture smoke — generic file/log sink only (no vendor connectors).
 *
 * Proves shadow + enforce holes append NDJSON to a fixture SIEM_LOG path.
 * D5: DNA-only (no CWL required). Helix is not a SIEM (D3).
 *
 * Tokens: SIEM_FIXTURE_SHADOW_OK · SIEM_FIXTURE_ENFORCE_OK · SIEM_FIXTURE_OK
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data', 'siem-fixture-smoke');
fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

const observePath = path.join(dataDir, 'observations.ndjson');
const draftPath = path.join(dataDir, 'draft.dna.json');
const certPath = path.join(dataDir, 'certified.dna.json');
const shadowSiem = path.join(dataDir, 'siem-shadow.ndjson');
const enforceSiem = path.join(dataDir, 'siem-enforce.ndjson');

const apiPort = 4290;
const helixPort = 4291;
const kids = [];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function token(name) {
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

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      env: process.env,
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
      else reject(new Error(`${args.join(' ')} exited ${code}\n${err || out}`));
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function get(port, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method: 'GET',
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
    req.on('error', reject);
    req.end();
  });
}

async function waitHelix(port, tries = 50) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await get(port, '/__helix/healthz');
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
      const r = await get(port, '/api/health');
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

function readNdjson(filePath) {
  assert(fs.existsSync(filePath), `missing SIEM_LOG ${filePath}`);
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(130);
});

async function main() {
  start([path.join(root, 'fixtures/demo-api/server.mjs')], {
    PORT: String(apiPort),
    HOST: '127.0.0.1',
  });
  await waitApi(apiPort);

  start([path.join(root, 'packages/helix-proxy/server.mjs')], {
    PORT: String(helixPort),
    UPSTREAM: `http://127.0.0.1:${apiPort}`,
    MODE: 'learn',
    OBSERVE: observePath,
    DNA: '',
  });
  await waitHelix(helixPort);

  await get(helixPort, '/api/health');
  await get(helixPort, '/api/items');
  await sleep(200);
  assert(fs.existsSync(observePath), 'observations written');

  await run([
    path.join(root, 'packages/helix-cli/bin/helix.mjs'),
    'learn',
    '--in',
    observePath,
    '--out',
    draftPath,
    '--app-id',
    'siem-fixture',
  ]);
  await run([
    path.join(root, 'packages/helix-cli/bin/helix.mjs'),
    'promote',
    '--in',
    draftPath,
    '--out',
    certPath,
  ]);
  assert(fs.existsSync(certPath), 'certified DNA');

  cleanup();
  await sleep(200);

  // --- shadow: hole alerts, traffic passes, SIEM_LOG appends ---
  start([path.join(root, 'fixtures/demo-api/server.mjs')], {
    PORT: String(apiPort),
    HOST: '127.0.0.1',
  });
  await waitApi(apiPort);
  start([path.join(root, 'packages/helix-proxy/server.mjs')], {
    PORT: String(helixPort),
    UPSTREAM: `http://127.0.0.1:${apiPort}`,
    MODE: 'shadow',
    DNA: certPath,
    SIEM_LOG: shadowSiem,
  });
  await waitHelix(helixPort);

  const shadowed = await get(helixPort, '/api/backdoor');
  assert(shadowed.status === 200, `shadow pass-through got ${shadowed.status}`);
  assert(
    shadowed.headers['x-helix-shadow-hole'] === 'HX-ROUTE-UNKNOWN',
    `shadow header ${shadowed.headers['x-helix-shadow-hole']}`,
  );
  await sleep(150);

  const shadowEvents = readNdjson(shadowSiem);
  assert(
    shadowEvents.some(
      (e) =>
        e.kind === 'helix.hole' &&
        e.mode === 'shadow' &&
        e.hole?.code === 'HX-ROUTE-UNKNOWN' &&
        e.path === '/api/backdoor',
    ),
    'shadow hole missing from SIEM_LOG',
  );
  token('SIEM_FIXTURE_SHADOW_OK');

  cleanup();
  await sleep(200);

  // --- enforce: deny + SIEM_LOG append ---
  start([path.join(root, 'fixtures/demo-api/server.mjs')], {
    PORT: String(apiPort),
    HOST: '127.0.0.1',
  });
  await waitApi(apiPort);
  start([path.join(root, 'packages/helix-proxy/server.mjs')], {
    PORT: String(helixPort),
    UPSTREAM: `http://127.0.0.1:${apiPort}`,
    MODE: 'enforce',
    DNA: certPath,
    SIEM_LOG: enforceSiem,
  });
  await waitHelix(helixPort);

  const ok = await get(helixPort, '/api/health');
  assert(ok.status === 200, `stable health ${ok.status}`);

  const blocked = await get(helixPort, '/api/backdoor');
  assert(blocked.status === 403, `enforce deny got ${blocked.status}`);
  const hole = JSON.parse(blocked.body).hole;
  assert(hole?.code === 'HX-ROUTE-UNKNOWN', `hole ${hole?.code}`);
  await sleep(150);

  const enforceEvents = readNdjson(enforceSiem);
  assert(
    enforceEvents.some(
      (e) =>
        e.kind === 'helix.hole' &&
        e.mode === 'enforce' &&
        e.hole?.code === 'HX-ROUTE-UNKNOWN' &&
        e.path === '/api/backdoor',
    ),
    'enforce hole missing from SIEM_LOG',
  );
  token('SIEM_FIXTURE_ENFORCE_OK');

  cleanup();
  token('SIEM_FIXTURE_OK');
}

main().catch((err) => {
  console.error('SIEM_FIXTURE_FAIL', err);
  cleanup();
  process.exit(1);
});
