#!/usr/bin/env node
/**
 * Soak triage: a shadow log is lines, but an operator decides about surfaces.
 *
 * The log here is produced by a real shadow-mode Helix in front of a real upstream — no
 * hand-written hole fixtures, because the point is that grouping survives what traffic
 * actually looks like (hashed bundles, id paths, one drifted login).
 *
 * Tokens: TRIAGE_GROUP_OK · TRIAGE_CLASS_OK · TRIAGE_WINDOW_OK · TRIAGE_CLI_OK · TRIAGE_SMOKE_OK
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHelixProxy } from '../packages/helix-proxy/index.mjs';
import { triageShadowLog, triageShadowLogFile, signDna } from '../packages/dna-core/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(ROOT, 'data', 'triage-smoke');
const CLI = path.join(ROOT, 'packages', 'helix-cli', 'bin', 'helix.mjs');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function req(port, urlPath, opts = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request(
      { host: '127.0.0.1', port, path: urlPath, method: opts.method || 'GET', headers: opts.headers },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }),
        );
      },
    );
    r.on('error', reject);
    if (opts.body) r.write(opts.body);
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

// --- Certificate: what this app was certified to be
const dna = signDna(
  {
    schema: 'app-dna-v1',
    app_id: 'triage-lab',
    mode: 'certified',
    created_at: new Date().toISOString(),
    routes: [
      {
        host: 'default',
        method: 'GET',
        path_template: '/api/items',
        content_class: 'json',
        status_classes: [200],
        response_key_fingerprint: 'items',
      },
      {
        host: 'default',
        method: 'POST',
        path_template: '/login',
        content_class: 'json',
        status_classes: [200],
        response_key_fingerprint: 'ok',
        request_key_fingerprint: 'password,username',
      },
    ],
  },
  { secret: 'helix-lab-triage-key', key_id: 'lab' },
);
const dnaPath = path.join(OUT, 'app.dna.json');
fs.writeFileSync(dnaPath, `${JSON.stringify(dna, null, 2)}\n`);

const overlay = {
  kind: 'chrysalis.helix.sensitivity-map',
  schemaVersion: 1,
  app_id: 'triage-lab',
  source: 'operator',
  routes: [
    {
      method: 'POST',
      path_template: '/login',
      host: 'default',
      severity: 'high',
      sensitivity: 'credential',
      effects: ['auth.verify'],
    },
  ],
};
const overlayPath = path.join(OUT, 'sensitivity.json');
fs.writeFileSync(overlayPath, `${JSON.stringify(overlay, null, 2)}\n`);

console.log('=== triage: soak a shadow log with real traffic ===');
const upstream = http.createServer((r, res) => {
  const p = (r.url || '/').split('?')[0];
  if (p.endsWith('.js')) {
    res.writeHead(200, { 'content-type': 'application/javascript' });
    res.end('console.log(1)');
    return;
  }
  if (p === '/api/items') {
    // The app grew a key nobody certified → drift at a certified surface
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ items: [], debug_token: 'x' }));
    return;
  }
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
});
await listen(upstream);

const shadowLog = path.join(OUT, 'shadow.ndjson');
const helix = createHelixProxy({
  upstream: `http://127.0.0.1:${upstream.address().port}`,
  mode: 'shadow',
  dnaPath,
  shadowLogPath: shadowLog,
  sensitivityPath: overlayPath,
  placement: 'agent',
});
await listen(helix);
const port = helix.address().port;

// A week of a real soak in miniature: bundle churn, id paths, one probe, one drift, one login.
for (const bundle of ['/assets/app.a1b2c3.js', '/assets/app.d4e5f6.js', '/assets/vendor.998877.js']) {
  await req(port, bundle);
}
for (const id of [1, 2, 3, 4]) {
  await req(port, `/api/orders/${id}`);
}
await req(port, '/api/backdoor');
await req(port, '/api/items'); // certified route, drifted response
await req(port, '/api/items', { method: 'POST' }); // certified path, uncertified method
await req(port, '/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ username: 'a', password: 'b', totp_bypass: true }),
});

await new Promise((r) => setTimeout(r, 60));
helix.close();
upstream.close();

const raw = fs.readFileSync(shadowLog, 'utf8').split(/\r?\n/).filter(Boolean);
const triaged = triageShadowLog(raw, { dna });

assert(triaged.events === raw.length, `every hole counted: ${triaged.events} vs ${raw.length}`);
assert(triaged.events > triaged.surfaces, 'lines collapse into fewer surfaces');

const bundles = triaged.groups.find((g) => g.path_template === '/**/*.js');
assert(bundles, 'hashed bundles collapse to one surface');
assert(bundles.count === 3, `three bundle hits, one surface: ${bundles.count}`);
assert(bundles.samples.length === 3, 'samples keep the real paths for the operator');

const orders = triaged.groups.find((g) => g.path_template === '/api/orders/:id');
assert(orders && orders.count === 4, `id paths collapse: ${orders?.count}`);
console.log('TRIAGE_GROUP_OK');

console.log('=== triage: classes an operator acts on differently ===');
assert(orders.class === 'new_surface', `unknown surface: ${orders.class}`);
assert(orders.in_dna === false, 'grouping knows it is not certified');

const drift = triaged.groups.find(
  (g) => g.path_template === '/api/items' && g.code === 'HX-SCHEMA-DRIFT',
);
assert(drift, 'certified route drift is its own group');
assert(drift.class === 'certified_surface_drift', `drift class: ${drift.class}`);
assert(drift.in_dna === true, 'drift is on a route we certified');

const wrongMethod = triaged.groups.find(
  (g) => g.method === 'POST' && g.path_template === '/api/items',
);
assert(
  wrongMethod?.class === 'new_method_on_known_path',
  `POST at a GET surface is not the same as a new path: ${wrongMethod?.class}`,
);

const login = triaged.groups.find((g) => g.path_template === '/login');
assert(login.severity === 'high', `login drift stays high: ${login.severity}`);
assert(login.sensitivity === 'credential', 'credential tag survives grouping');
assert(triaged.groups[0] === login, 'high severity sorts first — nobody scrolls for it');
assert(triaged.blockers.length === 1, `one blocker: ${JSON.stringify(triaged.blockers)}`);
assert(triaged.next_step === 'investigate_credential_drift', `next: ${triaged.next_step}`);

// No DNA supplied: still groups, but claims nothing about what is certified
const blind = triageShadowLog(raw);
assert(blind.surfaces === triaged.surfaces, 'grouping does not need the certificate');
assert(
  blind.groups.every((g) => g.in_dna === null),
  'without DNA, in_dna is unknown rather than false',
);
console.log('TRIAGE_CLASS_OK');

console.log('=== triage: soak windows ===');
const stamps = raw.map((l) => JSON.parse(l).at).sort();
const late = triageShadowLog(raw, { dna, since: stamps[stamps.length - 1] });
assert(late.events < triaged.events, 'since drops earlier holes');
assert(late.outside_window === triaged.events - late.events, 'dropped lines are reported, not lost');
const none = triageShadowLog(raw, { dna, since: '2099-01-01T00:00:00.000Z' });
assert(none.events === 0 && none.surfaces === 0, 'empty window is empty, not an error');
assert(none.next_step === 'enforce', 'a clean window says enforce');

const missing = triageShadowLogFile(path.join(OUT, 'nope.ndjson'));
assert(missing.missing === true, 'missing log is reported honestly');

// Access lines and junk share the file with holes in real SIEM sinks
const mixed = triageShadowLog(
  [...raw, JSON.stringify({ kind: 'access', path: '/api/items', status: 200 }), 'not json'],
  { dna },
);
assert(mixed.events === triaged.events, 'non-hole lines are not counted as holes');
assert(mixed.skipped === 2, `skipped lines are reported: ${mixed.skipped}`);
console.log('TRIAGE_WINDOW_OK');

console.log('=== triage: CLI gate ===');
const cli = spawnSync(
  process.execPath,
  [CLI, 'triage', '--shadow-log', shadowLog, '--in', dnaPath, '--out', path.join(OUT, 'triage.json')],
  { encoding: 'utf8' },
);
assert(cli.status === 2, `credential drift exits 2 like ready: ${cli.status}`);
assert(/surfaces/.test(cli.stdout), 'operator sees a surface count');
const written = JSON.parse(fs.readFileSync(path.join(OUT, 'triage.json'), 'utf8'));
assert(written.kind === 'helix.triage', 'machine-readable report written');
assert(written.groups.length === triaged.surfaces, 'CLI and library agree');

const clean = spawnSync(
  process.execPath,
  [CLI, 'triage', '--shadow-log', shadowLog, '--in', dnaPath, '--since', '2099-01-01T00:00:00.000Z'],
  { encoding: 'utf8' },
);
assert(clean.status === 0, `clean window exits 0: ${clean.status}`);

const absent = spawnSync(process.execPath, [CLI, 'triage', '--shadow-log', path.join(OUT, 'nope.ndjson')], {
  encoding: 'utf8',
});
assert(absent.status === 1, `missing log is an error, not a green: ${absent.status}`);
console.log('TRIAGE_CLI_OK');

console.log('TRIAGE_SMOKE_OK');
