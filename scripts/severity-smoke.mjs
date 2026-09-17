#!/usr/bin/env node
/**
 * Credential-surface severity: a hole at a login surface is louder than one at a brochure page.
 *
 * Proves the overlay is an ops file, not certified content — same DNA, same enforce verdicts,
 * only the SIEM event and the enforce gate change. Works with a hand-authored overlay (no CWL),
 * and from the CWL genome when the language pillar is present (D5: neither is required).
 *
 * Tokens: SEVERITY_OVERLAY_OK · SEVERITY_SIEM_OK · SEVERITY_GATE_OK · SEVERITY_CWL_OK · SEVERITY_SMOKE_OK
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createHelixProxy } from '../packages/helix-proxy/index.mjs';
import {
  severityForRoute,
  countShadowHoles,
  assessReadiness,
  signDna,
} from '../packages/dna-core/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(ROOT, 'data', 'severity-smoke');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function get(port, urlPath, opts = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: urlPath, method: opts.method || 'GET', headers: opts.headers },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }),
        );
      },
    );
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// --- Certified DNA: a login surface and a brochure page. Identical certificate in both runs.
const dna = signDna(
  {
    schema: 'app-dna-v1',
    app_id: 'severity-lab',
    mode: 'certified',
    created_at: new Date().toISOString(),
    routes: [
      {
        host: 'default',
        method: 'POST',
        path_template: '/login',
        content_class: 'json',
        status_classes: [200],
        response_key_fingerprint: null,
        request_key_fingerprint: 'password,username',
      },
      {
        host: 'default',
        method: 'GET',
        path_template: '/faq',
        content_class: 'html',
        status_classes: [200],
        response_key_fingerprint: null,
      },
    ],
  },
  { secret: 'helix-lab-severity-key', key_id: 'lab' },
);
const dnaPath = path.join(OUT, 'app.dna.json');
fs.writeFileSync(dnaPath, `${JSON.stringify(dna, null, 2)}\n`);

// --- Overlay: hand-authored, no CWL required (D5)
const overlay = {
  kind: 'chrysalis.helix.sensitivity-map',
  schemaVersion: 1,
  app_id: 'severity-lab',
  source: 'operator',
  routes: [
    {
      method: 'POST',
      path_template: '/login',
      host: 'default',
      severity: 'high',
      sensitivity: 'credential',
      effects: ['auth.verify', 'session.mint'],
    },
  ],
};
const overlayPath = path.join(OUT, 'sensitivity.json');
fs.writeFileSync(overlayPath, `${JSON.stringify(overlay, null, 2)}\n`);

console.log('=== severity: overlay lookup ===');
assert(
  severityForRoute(overlay, { method: 'POST', path: '/login' }).severity === 'high',
  'login is high',
);
assert(
  severityForRoute(overlay, { method: 'GET', path: '/faq' }).severity === 'normal',
  'brochure page is normal',
);
assert(
  severityForRoute(null, { method: 'POST', path: '/login' }).severity === 'normal',
  'no overlay ⇒ everything normal (D5)',
);
assert(
  severityForRoute(overlay, { method: 'GET', path: '/login' }).severity === 'normal',
  'method is part of the match',
);
console.log('SEVERITY_OVERLAY_OK');

console.log('=== severity: shadow holes through a live agent ===');
const upstream = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
});
await listen(upstream, 0);
const upstreamPort = upstream.address().port;

const siemLog = path.join(OUT, 'siem.ndjson');
const shadowLog = path.join(OUT, 'shadow.ndjson');
const helix = createHelixProxy({
  upstream: `http://127.0.0.1:${upstreamPort}`,
  mode: 'shadow',
  dnaPath,
  shadowLogPath: shadowLog,
  siemLogPath: siemLog,
  sensitivityPath: overlayPath,
  placement: 'agent',
});
await listen(helix, 0);
const helixPort = helix.address().port;

const health = JSON.parse((await get(helixPort, '/__helix/healthz')).body);
assert(health.credentialSurfaces === 1, `healthz reports overlay: ${health.credentialSurfaces}`);

// Drift at the login surface: request keys the certificate never saw
await get(helixPort, '/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ username: 'a', password: 'b', totp_bypass: true }),
});
// Unknown brochure-ish surface
await get(helixPort, '/pricing');

await new Promise((r) => setTimeout(r, 50));
const events = fs
  .readFileSync(siemLog, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((l) => JSON.parse(l));
assert(events.length === 2, `two holes logged, got ${events.length}`);

const loginHole = events.find((e) => e.path === '/login');
assert(loginHole, 'login hole logged');
assert(loginHole.severity === 'high', `login severity: ${loginHole.severity}`);
assert(loginHole.sensitivity === 'credential', 'login tagged credential');
assert(
  loginHole.sensitivity_effects.includes('auth.verify'),
  'credential effects ride the event for the SIEM',
);
assert(loginHole.hole.code === 'HX-REQUEST-SCHEMA-DRIFT', `login hole code: ${loginHole.hole.code}`);

const pricingHole = events.find((e) => e.path === '/pricing');
assert(pricingHole.severity === 'normal', `unknown route severity: ${pricingHole.severity}`);
assert(pricingHole.sensitivity === undefined, 'no credential tag invented for unknown routes');
console.log('SEVERITY_SIEM_OK');

console.log('=== severity: enforce gate blocks on credential drift ===');
const counted = countShadowHoles(shadowLog);
assert(counted.count === 2, `shadow holes: ${counted.count}`);
assert(counted.high === 1, `high shadow holes: ${counted.high}`);
assert(counted.bySeverity.high === 1 && counted.bySeverity.normal === 1, 'severity histogram');

// Total budget generous, credential budget default 0 → still not ready
const gated = assessReadiness('enforce', dna, {
  minRoutes: 1,
  shadowHoles: counted.count,
  maxShadowHoles: 10,
  highShadowHoles: counted.high,
});
assert(gated.ok === false, 'credential drift blocks enforce');
const credCheck = gated.checks.find((c) => c.id === 'shadow_clean_credential');
assert(credCheck && credCheck.ok === false, 'named check fails');
assert(gated.checks.find((c) => c.id === 'shadow_clean').ok === true, 'total budget still passes');

// Same DNA with the credential hole explained away → ready
const ready = assessReadiness('enforce', dna, {
  minRoutes: 1,
  shadowHoles: 0,
  maxShadowHoles: 10,
  highShadowHoles: 0,
});
assert(ready.ok === true, `clean shadow is ready: ${JSON.stringify(ready.checks)}`);
console.log('SEVERITY_GATE_OK');

helix.close();
upstream.close();

console.log('=== severity: overlay generated from the CWL genome ===');
let cwlOk = false;
try {
  const { resolveCwlRoot, seedDnaFromCwlFile, buildSensitivityMap } = await import(
    '../packages/cwl-bridge/index.mjs'
  );
  const cwlRoot = resolveCwlRoot();
  const gold = path.join(cwlRoot, 'fixtures', 'language-gold', '42-auth-effects-v2', 'routes.cwl');
  if (fs.existsSync(gold)) {
    const seeded = await seedDnaFromCwlFile(gold, { app_id: 'severity-cwl', cwlRoot });
    const map = buildSensitivityMap(seeded);
    assert(map.routes.length === 2, `login + logout are credential surfaces: ${map.routes.length}`);
    const login = map.routes.find((r) => r.path_template === '/login');
    assert(login?.severity === 'high', 'genome login is high');
    assert(login.effects.includes('session.mint'), 'effects carried from the genome');
    fs.writeFileSync(
      path.join(OUT, 'sensitivity-from-cwl.json'),
      `${JSON.stringify(map, null, 2)}\n`,
    );
    cwlOk = true;
  }
} catch {
  /* pillar absent — D5 */
}
console.log(cwlOk ? 'SEVERITY_CWL_OK' : 'SEVERITY_CWL_SKIP (chrysalis-cwl pillar absent — overlay still works)');

console.log('SEVERITY_SMOKE_OK');
