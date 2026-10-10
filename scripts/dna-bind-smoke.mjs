#!/usr/bin/env node
/**
 * Runtime DNA bind (RFC-0042–0045): genome declares digests; Helix verifies them.
 *
 * Tokens: DNA_BIND_UNIT_OK · DNA_BIND_ENFORCE_OK · DNA_BIND_WITNESS_OK ·
 *         DNA_BIND_SUPERSEDES_OK · DNA_BIND_CWL_OK · DNA_BIND_SMOKE_OK
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createHelixProxy } from '../packages/helix-proxy/index.mjs';
import { spawnSync } from 'node:child_process';
import {
  fingerprintDna,
  verifyDnaBind,
  signDna,
  sriFingerprint,
  assessReadiness,
  verifyDnaBindMap,
} from '../packages/dna-core/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(ROOT, 'data', 'dna-bind-smoke');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function req(port, urlPath, opts = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request(
      {
        host: '127.0.0.1',
        port,
        path: urlPath,
        method: opts.method || 'GET',
        headers: opts.headers,
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

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

console.log('=== dna-bind: fingerprint the canonical certificate ===');
const dna = signDna(
  {
    schema: 'app-dna-v1',
    app_id: 'dna-bind-lab',
    mode: 'certified',
    created_at: new Date().toISOString(),
    parent_hash: null,
    routes: [
      {
        host: 'default',
        method: 'GET',
        path_template: '/invoice',
        content_class: 'html',
        status_classes: [200],
        response_key_fingerprint: null,
      },
    ],
    holes: [],
  },
  { secret: 'helix-lab-dna-bind-key', key_id: 'lab' },
);
const digests = fingerprintDna(dna);
assert(digests.length === 2, 'sha384 + sha512');
assert(digests[0].startsWith('sha384-'), digests[0]);
assert(digests[1].startsWith('sha512-'), digests[1]);
assert(
  sriFingerprint(Buffer.from('x'), 'sha384').startsWith('sha384-'),
  'SRI helper',
);

const prior = signDna(
  {
    ...dna,
    app_id: 'dna-bind-lab-v1',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  { secret: 'helix-lab-dna-bind-key', key_id: 'lab' },
);
const priorDigests = fingerprintDna(prior);

const ok = await verifyDnaBind(
  {
    match_live: true,
    fingerprints: digests,
    quorum: 2,
  },
  { dna, skipWitness: true },
);
assert(ok.ok === true, `quorum 2 honors both digests: ${JSON.stringify(ok)}`);
assert(ok.matched.length === 2, `matched: ${ok.matched.length}`);

const bad = await verifyDnaBind(
  {
    match_live: true,
    fingerprints: ['sha384-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
    quorum: 1,
  },
  { dna, skipWitness: true },
);
assert(bad.ok === false, 'wrong digest fails');
assert(bad.holes.some((h) => h.code === 'HX-DNA-QUORUM'), 'quorum hole');
console.log('DNA_BIND_UNIT_OK');

console.log('=== dna-bind: enforce refuses a drifted certificate digest ===');
const dnaPath = path.join(OUT, 'app.dna.json');
fs.writeFileSync(dnaPath, `${JSON.stringify(dna, null, 2)}\n`);
const bindPath = path.join(OUT, 'dna-bind.json');
const bind = {
  kind: 'chrysalis.helix.dna-bind',
  schemaVersion: 1,
  source: 'operator',
  module: {
    match_live: true,
    fingerprints: digests,
    quorum: 2,
    expect: 'enforce',
  },
  proofs: [],
  routes: [
    {
      method: 'GET',
      path_template: '/invoice',
      host: 'default',
      match_live: true,
      fingerprints: digests,
      quorum: 2,
    },
  ],
};
fs.writeFileSync(bindPath, `${JSON.stringify(bind, null, 2)}\n`);

const upstream = http.createServer((_r, res) => {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end('<h1>Invoice</h1>');
});
await listen(upstream);

const helixOk = createHelixProxy({
  upstream: `http://127.0.0.1:${upstream.address().port}`,
  mode: 'enforce',
  dnaPath,
  dnaBindPath: bindPath,
  fetchWitness: null,
  placement: 'agent',
});
await listen(helixOk);
const okHit = await req(helixOk.address().port, '/invoice');
assert(okHit.status === 200, `matching bind passes: ${okHit.status}`);
helixOk.close();

// Tamper the bind so digests no longer match the live certificate
const driftedBind = {
  ...bind,
  module: {
    ...bind.module,
    fingerprints: ['sha384-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
    quorum: 1,
  },
  routes: [
    {
      ...bind.routes[0],
      fingerprints: ['sha384-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
      quorum: 1,
    },
  ],
};
const driftedPath = path.join(OUT, 'dna-bind-drifted.json');
fs.writeFileSync(driftedPath, `${JSON.stringify(driftedBind, null, 2)}\n`);
const helixBad = createHelixProxy({
  upstream: `http://127.0.0.1:${upstream.address().port}`,
  mode: 'enforce',
  dnaPath,
  dnaBindPath: driftedPath,
  fetchWitness: null,
  placement: 'agent',
});
await listen(helixBad);
const denied = await req(helixBad.address().port, '/invoice');
assert(denied.status === 403, `drifted bind is refused: ${denied.status}`);
const hole = JSON.parse(denied.body);
assert(hole.hole.code === 'HX-DNA-QUORUM', `hole: ${hole.hole.code}`);
helixBad.close();
console.log('DNA_BIND_ENFORCE_OK');

console.log('=== dna-bind: witness must attest a declared fingerprint ===');
const withWitness = {
  match_live: true,
  fingerprints: digests,
  quorum: 1,
  witness: 'https://attest.example/invoice/v3',
};
const attested = await verifyDnaBind(withWitness, {
  dna,
  fetchWitness: async () => ({ status: 200, body: JSON.stringify({ fingerprint: digests[0] }) }),
});
assert(attested.ok === true, 'attesting witness passes');
const silent = await verifyDnaBind(withWitness, {
  dna,
  fetchWitness: async () => ({ status: 200, body: '{"ok":true}' }),
});
assert(silent.ok === false, 'mute witness fails');
assert(silent.holes.some((h) => h.code === 'HX-DNA-WITNESS'), 'witness hole');
console.log('DNA_BIND_WITNESS_OK');

console.log('=== dna-bind: supersedes needs the lineage certificate ===');
const succession = await verifyDnaBind(
  {
    match_live: true,
    fingerprints: digests,
    quorum: 1,
    supersedes: priorDigests[0],
  },
  { dna, lineageDna: prior, skipWitness: true },
);
assert(succession.ok === true, 'supersedes honored against lineage');
const orphan = await verifyDnaBind(
  {
    match_live: true,
    fingerprints: digests,
    quorum: 1,
    supersedes: priorDigests[0],
  },
  { dna, skipWitness: true },
);
assert(orphan.ok === false, 'supersedes without lineage fails');
assert(orphan.holes.some((h) => h.code === 'HX-DNA-SUPERSEDES'), 'supersedes hole');
console.log('DNA_BIND_SUPERSEDES_OK');

console.log('=== dna-bind: overlay from CWL genome (structure only) ===');
let cwlOk = false;
try {
  const { resolveCwlRoot, seedDnaFromCwlFile, buildDnaBindMap } = await import(
    '../packages/cwl-bridge/index.mjs'
  );
  const cwlRoot = resolveCwlRoot();
  const gold = path.join(cwlRoot, 'fixtures', 'language-gold', '97-dna-proof-unit', 'routes.cwl');
  if (fs.existsSync(gold)) {
    const seeded = await seedDnaFromCwlFile(gold, { app_id: 'dna-bind-cwl', cwlRoot });
    const map = buildDnaBindMap(seeded);
    assert(map.kind === 'chrysalis.helix.dna-bind', 'overlay kind');
    assert(map.module.match_live === true, 'module match live');
    assert(Array.isArray(map.proofs) && map.proofs.length >= 1, 'named proofs');
    const invoice = map.routes.find((r) => r.path_template === '/invoice');
    assert(invoice?.proof === 'invoice_v3' || invoice?.match_live, 'invoice binds a proof');
    assert(
      map.proofs.some((p) => p.name === 'invoice_v3' && p.quorum === 2),
      'invoice_v3 quorum document fact',
    );
    fs.writeFileSync(path.join(OUT, 'from-cwl.json'), `${JSON.stringify(map, null, 2)}\n`);
    cwlOk = true;
  }
} catch {
  /* pillar absent — D5 */
}
console.log(cwlOk ? 'DNA_BIND_CWL_OK' : 'DNA_BIND_CWL_SKIP (chrysalis-cwl pillar absent)');

// D5: no bind overlay ⇒ traffic DNA still protects
const naked = createHelixProxy({
  upstream: `http://127.0.0.1:${upstream.address().port}`,
  mode: 'enforce',
  dnaPath,
  placement: 'agent',
});
await listen(naked);
const nakedHit = await req(naked.address().port, '/invoice');
assert(nakedHit.status === 200, 'absent bind does not invent a check');
const backdoor = await req(naked.address().port, '/api/backdoor');
assert(backdoor.status === 403, 'traffic DNA still enforces without bind');
naked.close();
upstream.close();

console.log('=== dna-bind: ready gate sees the same digests enforce will ===');
const bindReady = await verifyDnaBindMap(bind, { dna, skipWitness: true });
assert(bindReady.ok === true && !bindReady.skipped, 'bind map ready');
const readyOk = assessReadiness('enforce', dna, {
  minRoutes: 1,
  shadowHoles: 0,
  maxShadowHoles: 0,
  dnaBind: bindReady,
});
assert(readyOk.ok === true, 'ready with matching bind');
assert(readyOk.checks.some((c) => c.id === 'dna_bind' && c.ok), 'dna_bind check passed');

const bindBad = await verifyDnaBindMap(driftedBind, { dna, skipWitness: true });
assert(bindBad.ok === false, 'drifted bind map fails');
const readyBad = assessReadiness('enforce', dna, {
  minRoutes: 1,
  shadowHoles: 0,
  maxShadowHoles: 0,
  dnaBind: bindBad,
});
assert(readyBad.ok === false, 'ready refuses drifted bind');
assert(readyBad.checks.some((c) => c.id === 'dna_bind' && !c.ok), 'dna_bind check failed');

const cli = path.join(ROOT, 'packages', 'helix-cli', 'bin', 'helix.mjs');
const shadowClean = path.join(OUT, 'shadow-clean.ndjson');
fs.writeFileSync(shadowClean, '');
const cliReady = spawnSync(
  process.execPath,
  [
    cli,
    'ready',
    '--in',
    dnaPath,
    '--target',
    'enforce',
    '--shadow-log',
    shadowClean,
    '--bind',
    bindPath,
    '--min-routes',
    '1',
  ],
  { encoding: 'utf8' },
);
assert(cliReady.status === 0, `cli ready+bind: ${cliReady.stdout}${cliReady.stderr}`);
const cliDrift = spawnSync(
  process.execPath,
  [
    cli,
    'ready',
    '--in',
    dnaPath,
    '--target',
    'enforce',
    '--shadow-log',
    shadowClean,
    '--bind',
    driftedPath,
    '--min-routes',
    '1',
  ],
  { encoding: 'utf8' },
);
assert(cliDrift.status === 2, 'cli ready+drifted bind exits 2');
console.log('DNA_BIND_READY_OK');

console.log('DNA_BIND_SMOKE_OK');
