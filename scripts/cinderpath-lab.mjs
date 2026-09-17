#!/usr/bin/env node
/**
 * Cinderpath Mode A lab — run the placement story instead of only documenting it.
 *
 *   Helix (enforce) :PORT  →  stub control plane on 127.0.0.1
 *
 * The upstream is a STUB that answers the shapes the Cinderpath genome certifies. It is not
 * cinderpath-web and it is not a VPN: no WireGuard, no tunnel, no destination inspection.
 * What this proves is placement + enforcement on the HTTP control plane.
 *
 * Env: CINDERPATH_ROOT (genome), CINDERPATH_LAB_PORT, CINDERPATH_LAB_UPSTREAM_PORT
 * Token: CINDERPATH_LAB_OK | CINDERPATH_LAB_SKIP
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import {
  resolveCwlRoot,
  seedDnaFromCwlFile,
  stripBridgeEnvelope,
  buildSensitivityMap,
} from '../packages/cwl-bridge/index.mjs';
import { signDna } from '../packages/dna-core/index.mjs';
import { createHelixProxy } from '../packages/helix-proxy/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(ROOT, 'data', 'cinderpath-lab');
const LAB_KEY = 'helix-lab-cinderpath-key-v1';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function resolveGenome() {
  const roots = [
    process.env.CINDERPATH_ROOT,
    path.resolve(ROOT, '../../../projects/cinderpath'),
    'C:/Users/david/projects/cinderpath',
  ].filter(Boolean);
  for (const r of roots) {
    const g = path.join(path.resolve(r), 'internal/webapp/cwl/cinderpath.cwl');
    if (fs.existsSync(g)) return g;
  }
  return null;
}

const genome = resolveGenome();
if (!genome) {
  console.log('CINDERPATH_LAB_SKIP (set CINDERPATH_ROOT — genome not found)');
  process.exit(0);
}
try {
  resolveCwlRoot();
} catch {
  console.log('CINDERPATH_LAB_SKIP (chrysalis-cwl pillar missing)');
  process.exit(0);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

console.log('=== cinderpath lab: seed + certify control-plane DNA ===');
const seeded = await seedDnaFromCwlFile(genome, {
  app_id: 'cinderpath-control-plane',
  mode: 'draft',
  fixture: genome,
});
const certified = signDna(
  { ...stripBridgeEnvelope(seeded), mode: 'certified', created_at: new Date().toISOString() },
  { secret: LAB_KEY, key_id: 'lab' },
);
const dnaPath = path.join(OUT, 'app.dna.json');
fs.writeFileSync(dnaPath, `${JSON.stringify(certified, null, 2)}\n`);

const sensitivity = buildSensitivityMap(seeded);
const sensitivityPath = path.join(OUT, 'sensitivity.json');
fs.writeFileSync(sensitivityPath, `${JSON.stringify(sensitivity, null, 2)}\n`);
console.log(
  `certified ${certified.routes.length} routes · ${sensitivity.routes.length} credential surfaces`,
);

// --- Stub control plane: answers exactly the shapes the certificate carries.
const annotations = seeded.bridge?.annotations ?? [];
function annotationFor(method, template) {
  return annotations.find(
    (a) => String(a.method).toUpperCase() === method && a.path_template === template,
  );
}
function bodyForFingerprint(fp) {
  const out = {};
  for (const k of String(fp || '').split(',').filter(Boolean)) out[k] = true;
  return out;
}

const upstream = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  const method = (req.method || 'GET').toUpperCase();
  const route = certified.routes.find(
    (r) => r.method === method && r.path_template === urlPath,
  );
  if (!route) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'stub has no such surface' }));
    return;
  }
  const ann = annotationFor(method, route.path_template);
  if (route.content_class === 'json') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(bodyForFingerprint(route.response_key_fingerprint)));
    return;
  }
  if (route.content_class === 'html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<!DOCTYPE html><title>cinderpath stub</title><p>stub page</p>');
    return;
  }
  // Host-owned bytes (QR / conf): the genome declares the media type, the host makes the bytes.
  res.writeHead(200, { 'content-type': ann?.cwl_content_type || 'application/octet-stream' });
  res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
});

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

function request(port, urlPath, opts = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
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
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

await listen(upstream, Number(process.env.CINDERPATH_LAB_UPSTREAM_PORT || 0));
const upstreamPort = upstream.address().port;

const siemLog = path.join(OUT, 'siem.ndjson');
const helix = createHelixProxy({
  upstream: `http://127.0.0.1:${upstreamPort}`,
  mode: 'enforce',
  dnaPath,
  siemLogPath: siemLog,
  sensitivityPath,
  dnaKey: LAB_KEY,
  dnaKeyId: 'lab',
  requireSignedDna: true,
  placement: 'agent',
});
await listen(helix, Number(process.env.CINDERPATH_LAB_PORT || 0));
const helixPort = helix.address().port;
console.log(`=== cinderpath lab: Helix enforce :${helixPort} → stub :${upstreamPort} ===`);

try {
  const health = JSON.parse((await request(helixPort, '/__helix/healthz')).body);
  assert(health.mode === 'enforce', 'agent in enforce');
  assert(health.credentialSurfaces >= 1, 'overlay loaded');

  console.log('--- certified control-plane surfaces pass');
  const healthz = await request(helixPort, '/healthz');
  assert(healthz.status === 200, `GET /healthz → ${healthz.status}`);

  const qr = await request(helixPort, '/connect/qr.png');
  assert(qr.status === 200, `GET /connect/qr.png → ${qr.status}`);
  assert(
    String(qr.headers['content-type']).startsWith('image/png'),
    `host bytes keep their media type: ${qr.headers['content-type']}`,
  );

  console.log('--- uncertified surface fails closed');
  const backdoor = await request(helixPort, '/admin/backdoor');
  assert(backdoor.status === 403, `GET /admin/backdoor → ${backdoor.status}`);
  assert(backdoor.headers['x-helix-hole'] === 'HX-ROUTE-UNKNOWN', 'unknown route hole');

  console.log('--- credential-surface drift is denied and logged loud');
  const loginRoute = certified.routes.find(
    (r) => r.method === 'POST' && r.path_template === '/login',
  );
  assert(loginRoute, 'genome certifies POST /login');
  const drifted = { ...bodyForFingerprint(loginRoute.request_key_fingerprint), totp_bypass: true };
  const login = await request(helixPort, '/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(drifted),
  });
  assert(login.status === 403, `drifted POST /login → ${login.status}`);

  await new Promise((r) => setTimeout(r, 50));
  const events = fs
    .readFileSync(siemLog, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const loginHole = events.find((e) => e.path === '/login');
  assert(loginHole, 'login hole reached the SIEM sink');
  assert(loginHole.severity === 'high', `login hole severity: ${loginHole.severity}`);
  assert(loginHole.sensitivity === 'credential', 'tagged as a credential surface');
  const backdoorHole = events.find((e) => e.path === '/admin/backdoor');
  assert(backdoorHole.severity === 'normal', 'unknown surface stays normal severity');

  console.log(
    JSON.stringify(
      {
        kind: 'helix.cinderpath.lab',
        ok: true,
        genome,
        helix: `http://127.0.0.1:${helixPort}`,
        upstream: `http://127.0.0.1:${upstreamPort} (stub, not cinderpath-web)`,
        certified_routes: certified.routes.length,
        credential_surfaces: sensitivity.routes.length,
        holes: events.map((e) => ({ path: e.path, code: e.hole.code, severity: e.severity })),
        wireguard: 'untouched — no tunnel, no destination inspection',
        tunnel_inspection: false,
      },
      null,
      2,
    ),
  );
  console.log('CINDERPATH_LAB_OK');
} finally {
  helix.close();
  upstream.close();
}
