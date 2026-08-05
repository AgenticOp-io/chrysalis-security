#!/usr/bin/env node
/**
 * Signed DNA: promote --key → verify → enforce with HELIX_DNA_KEY;
 * tampered DNA / wrong key fail closed.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { signDna, verifyDna, generateEd25519KeyPair } from '../packages/dna-core/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data', 'sign-smoke');
fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

const observePath = path.join(dataDir, 'observations.ndjson');
const draftPath = path.join(dataDir, 'draft.dna.json');
const certPath = path.join(dataDir, 'certified.dna.json');
const badPath = path.join(dataDir, 'tampered.dna.json');
const SECRET = 'helix-lab-sign-key-v1';
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

function run(args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stderr.on('data', (d) => { out += d; });
    child.stdout.on('data', (d) => { out += d; });
    child.on('exit', (code) => (code === 0 ? resolve(out) : reject(new Error(out || `exit ${code}`))));
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
  console.log('=== sign-smoke: unit sign/verify ===');
  const sample = {
    schema: 'app-dna-v1',
    app_id: 'sign-unit',
    created_at: '2026-08-04T00:00:00.000Z',
    mode: 'certified',
    parent_hash: null,
    routes: [],
    holes: [],
  };
  const signed = signDna(sample, { secret: SECRET, key_id: 'lab' });
  const ok = verifyDna(signed, { secret: SECRET, key_id: 'lab' });
  if (!ok.ok) throw new Error(`unit verify failed ${JSON.stringify(ok)}`);
  const bad = verifyDna(signed, { secret: 'wrong' });
  if (bad.ok || bad.hole?.code !== 'HX-DNA-BAD-SIG') {
    throw new Error(`expected HX-DNA-BAD-SIG got ${JSON.stringify(bad)}`);
  }

  console.log('=== learn + promote --key ===');
  start(['fixtures/demo-api/server.mjs'], { PORT: '4093', HOST: '127.0.0.1' });
  await waitPort(4093);
  start(['packages/helix-proxy/server.mjs'], {
    UPSTREAM: 'http://127.0.0.1:4093',
    MODE: 'learn',
    OBSERVE: observePath,
    PORT: '4086',
  });
  await waitPort(4086);
  await get(4086, '/api/health');
  await get(4086, '/api/items');
  await sleep(200);

  await run(['packages/helix-cli/bin/helix.mjs', 'learn', '--in', observePath, '--out', draftPath, '--app-id', 'sign-demo']);
  await run([
    'packages/helix-cli/bin/helix.mjs', 'promote',
    '--in', draftPath, '--out', certPath,
    '--key', SECRET, '--key-id', 'lab',
  ]);
  await run([
    'packages/helix-cli/bin/helix.mjs', 'verify',
    '--in', certPath, '--key', SECRET, '--key-id', 'lab', '--require',
  ]);

  const cert = JSON.parse(fs.readFileSync(certPath, 'utf8'));
  if (!cert.signature?.value) throw new Error('missing signature after promote');

  cleanup();
  kids.length = 0;
  await sleep(200);

  console.log('=== enforce with good key ===');
  start(['fixtures/demo-api/server.mjs'], { PORT: '4093', HOST: '127.0.0.1' });
  await waitPort(4093);
  start(['packages/helix-proxy/server.mjs'], {
    UPSTREAM: 'http://127.0.0.1:4093',
    MODE: 'enforce',
    DNA: certPath,
    PORT: '4086',
    HELIX_DNA_KEY: SECRET,
    HELIX_DNA_KEY_ID: 'lab',
    HELIX_DNA_REQUIRE: '1',
  });
  await waitPort(4086);
  const health = await get(4086, '/api/health');
  if (health.status !== 200) throw new Error(`health ${health.status}`);
  const blocked = await get(4086, '/api/backdoor');
  if (blocked.status !== 403) throw new Error(`backdoor ${blocked.status}`);

  cleanup();
  kids.length = 0;
  await sleep(200);

  console.log('=== tampered DNA fails to start with key ===');
  const tampered = JSON.parse(fs.readFileSync(certPath, 'utf8'));
  tampered.routes.push({
    host: '127.0.0.1',
    method: 'GET',
    path_template: '/api/pwn',
    content_class: 'json',
    status_classes: [200],
    response_key_fingerprint: 'pwned',
  });
  fs.writeFileSync(badPath, JSON.stringify(tampered, null, 2));
  await run(
    ['packages/helix-cli/bin/helix.mjs', 'verify', '--in', badPath, '--key', SECRET, '--require'],
  ).then(
    () => { throw new Error('tampered verify should fail'); },
    () => {},
  );

  start(['fixtures/demo-api/server.mjs'], { PORT: '4093', HOST: '127.0.0.1' });
  await waitPort(4093);
  const badProxy = start(['packages/helix-proxy/server.mjs'], {
    UPSTREAM: 'http://127.0.0.1:4093',
    MODE: 'enforce',
    DNA: badPath,
    PORT: '4087',
    HELIX_DNA_KEY: SECRET,
    HELIX_DNA_REQUIRE: '1',
  });
  await sleep(500);
  let refused = false;
  try {
    await get(4087, '/api/health');
  } catch {
    refused = true;
  }
  if (!refused && badProxy.exitCode === null) {
    // process may still be up serving 403-only — either exit or refuse is OK if verify threw at boot
    const alive = badProxy.exitCode === null;
    if (alive) {
      // createHelixProxy throws → process exits 1; if still alive, fail
      throw new Error('tampered DNA proxy should have exited on bad signature');
    }
  }
  console.log('tampered DNA rejected ok');

  cleanup();
  kids.length = 0;
  await sleep(200);

  console.log('=== ed25519 unit sign/verify ===');
  const pair = generateEd25519KeyPair();
  const edSample = {
    schema: 'app-dna-v1',
    app_id: 'ed25519-unit',
    created_at: '2026-08-04T00:00:00.000Z',
    mode: 'certified',
    parent_hash: null,
    routes: [],
    holes: [],
  };
  const edSigned = signDna(edSample, {
    alg: 'ed25519',
    privateKey: pair.privatePem,
    key_id: 'ed-lab',
  });
  if (edSigned.signature?.alg !== 'ed25519') {
    throw new Error(`expected ed25519 alg got ${edSigned.signature?.alg}`);
  }
  const edOk = verifyDna(edSigned, { publicKey: pair.publicPem, key_id: 'ed-lab' });
  if (!edOk.ok) throw new Error(`ed25519 verify failed ${JSON.stringify(edOk)}`);
  const edBad = verifyDna(edSigned, {
    publicKey: generateEd25519KeyPair().publicPem,
  });
  if (edBad.ok || edBad.hole?.code !== 'HX-DNA-BAD-SIG') {
    throw new Error(`expected HX-DNA-BAD-SIG got ${JSON.stringify(edBad)}`);
  }

  const privPath = path.join(dataDir, 'ed25519-priv.pem');
  const pubPath = path.join(dataDir, 'ed25519-pub.pem');
  const edCertPath = path.join(dataDir, 'ed25519-certified.dna.json');
  fs.writeFileSync(privPath, pair.privatePem);
  fs.writeFileSync(pubPath, pair.publicPem);

  console.log('=== ed25519 promote + verify CLI ===');
  // Reuse HMAC-learned draft if present; else minimal draft
  let draftForEd = draftPath;
  if (!fs.existsSync(draftPath)) {
    draftForEd = path.join(dataDir, 'ed-draft.dna.json');
    fs.writeFileSync(
      draftForEd,
      JSON.stringify({ ...edSample, mode: 'draft', app_id: 'ed25519-cli' }, null, 2),
    );
  }
  await run([
    'packages/helix-cli/bin/helix.mjs', 'promote',
    '--in', draftForEd, '--out', edCertPath,
    '--alg', 'ed25519', '--key-file', privPath, '--key-id', 'ed-lab',
  ]);
  await run([
    'packages/helix-cli/bin/helix.mjs', 'verify',
    '--in', edCertPath, '--alg', 'ed25519', '--key-file', pubPath, '--key-id', 'ed-lab', '--require',
  ]);
  const edCert = JSON.parse(fs.readFileSync(edCertPath, 'utf8'));
  if (edCert.signature?.alg !== 'ed25519' || !edCert.signature?.value) {
    throw new Error('missing ed25519 signature after promote');
  }

  // HMAC path still works (regression)
  const hmacStill = signDna(edSample, { secret: SECRET, key_id: 'lab' });
  const hmacOk = verifyDna(hmacStill, { secret: SECRET });
  if (!hmacOk.ok || hmacStill.signature.alg !== 'hmac-sha256') {
    throw new Error('hmac regression after ed25519');
  }

  console.log('\nED25519_SMOKE_OK');
  console.log('SIGN_SMOKE_OK');
}

main().catch((err) => {
  console.error('\nSIGN_SMOKE_FAIL', err);
  cleanup();
  process.exit(1);
});
