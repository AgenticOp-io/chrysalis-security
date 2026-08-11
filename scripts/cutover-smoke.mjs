#!/usr/bin/env node
/**
 * Platform cutover E2E: CWL gold → draft DNA → strip → promote(+HMAC) →
 * compareCwlSurfaceToDna → scoreRequest allow/deny in enforce.
 * Also proves RFC-0023 multi-host (host=api) + dna_gaps fill + enforce host identity.
 * Tokens: CUTOVER_MULTIHOST_OK · CUTOVER_SMOKE_OK
 * Requires sibling engines/chrysalis-cwl (or CHRYSALIS_CWL_ROOT) + @agenticop-io/cwl@1.0.20.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveCwlRoot,
  seedDnaFromCwlFile,
  stripBridgeEnvelope,
  compareCwlSurfaceToDna,
  loadDeployProfile,
  resolveDeployProfilePath,
  buildHolesBridgeReport,
} from '../packages/cwl-bridge/index.mjs';
import { scoreRequest, signDna, verifyDna } from '../packages/dna-core/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const LAB_KEY = 'helix-lab-cutover-key-v1';
const LAB_KEY_ID = 'lab';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

let cwlRoot;
try {
  cwlRoot = resolveCwlRoot();
} catch {
  console.log(
    'CUTOVER_SMOKE_SKIP (chrysalis-cwl not found — set CHRYSALIS_CWL_ROOT or sync language pillar)',
  );
  process.exit(0);
}

const goldDir = path.join(cwlRoot, 'fixtures', 'language-gold', '24-dna-bridge');
const goldCwl = path.join(goldDir, 'routes.cwl');
const profileApiPath = path.join(goldDir, 'deploy-profile-api.json');
if (!fs.existsSync(goldCwl)) {
  console.log(`CUTOVER_SMOKE_SKIP (missing CWL gold: ${goldCwl})`);
  process.exit(0);
}
const outDir = path.join(ROOT, 'data', 'cutover-smoke');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

console.log('=== cutover: seed draft DNA from CWL gold (default host) ===');
const profilePath = resolveDeployProfilePath(goldCwl);
const deployProfile = profilePath ? await loadDeployProfile(profilePath) : null;
if (deployProfile) {
  console.log(`=== cutover: RFC-0023 deploy profile ${profilePath} host=${deployProfile.host} ===`);
}
const seeded = await seedDnaFromCwlFile(goldCwl, {
  app_id: 'cutover-smoke',
  mode: 'draft',
  fixture: 'fixtures/language-gold/24-dna-bridge/routes.cwl',
  cwlRoot,
  deployProfile: profilePath || undefined,
});
assert(seeded.schema === 'app-dna-v1', 'schema');
assert(seeded.mode === 'draft', 'mode draft');
assert(seeded.bridge?.kind === 'cwl-surface-seed', 'bridge envelope present');
assert(seeded.routes.length >= 1, 'seeded routes');
if (deployProfile) {
  assert(
    seeded.bridge?.deploy_profile?.schema === 'cwl-deploy-profile-v1' ||
      seeded.bridge?.deploy_profile?.rfc === '0023',
    'profile annotated',
  );
}
fs.writeFileSync(path.join(outDir, 'seeded.dna.json'), JSON.stringify(seeded, null, 2) + '\n');

console.log('=== cutover: strip bridge envelope ===');
const stripped = stripBridgeEnvelope(seeded);
assert(!('bridge' in stripped), 'bridge removed');
fs.writeFileSync(path.join(outDir, 'stripped.dna.json'), JSON.stringify(stripped, null, 2) + '\n');

console.log('=== cutover: promote + HMAC sign (lab key) ===');
let certified = {
  ...stripped,
  mode: 'certified',
  created_at: new Date().toISOString(),
};
certified = signDna(certified, { secret: LAB_KEY, key_id: LAB_KEY_ID });
assert(certified.mode === 'certified', 'certified mode');
assert(certified.signature?.alg === 'hmac-sha256', 'hmac signature');
const verified = verifyDna(certified, { secret: LAB_KEY, key_id: LAB_KEY_ID, require: true });
assert(verified.ok === true, `verify: ${JSON.stringify(verified)}`);
fs.writeFileSync(path.join(outDir, 'certified.dna.json'), JSON.stringify(certified, null, 2) + '\n');

console.log('=== cutover: compareCwlSurfaceToDna (default) ===');
const cmp = compareCwlSurfaceToDna(seeded, certified, { deployProfile });
assert(cmp.ok === true, `cutover compare failed: ${JSON.stringify(cmp.missing_in_dna)}`);
assert(cmp.cutover === 'cwl_surface_subseteq_dna', 'cutover label');

console.log('=== cutover: enforce via scoreRequest ===');
const known = scoreRequest(certified, { method: 'GET', path: '/api/health', host: 'default' });
assert(known.allow === true, `known /api/health should allow: ${JSON.stringify(known)}`);

// Gold seeds query_key_fingerprint "include" on /items/:id (CWL 1.0.20+)
const knownParam = scoreRequest(certified, {
  method: 'GET',
  path: '/items/42',
  host: 'default',
  query: { include: '1' },
});
assert(knownParam.allow === true, `known /items/:id should allow: ${JSON.stringify(knownParam)}`);

const loginOk = scoreRequest(certified, {
  method: 'POST',
  path: '/login',
  host: 'default',
  body: { username: 'a', password: 'b' },
});
assert(loginOk.allow === true, `known POST /login should allow: ${JSON.stringify(loginOk)}`);

const unknown = scoreRequest(certified, { method: 'GET', path: '/api/backdoor', host: 'default' });
assert(unknown.allow === false, 'unknown route must deny');
assert(unknown.hole?.code === 'HX-ROUTE-UNKNOWN', `expected HX-ROUTE-UNKNOWN got ${unknown.hole?.code}`);

if (!fs.existsSync(profileApiPath)) {
  console.log(`CUTOVER_MULTIHOST_SKIP (missing RFC-0023 profile: ${profileApiPath})`);
  console.log('CUTOVER_SMOKE_OK');
  process.exit(0);
}

console.log('=== cutover: RFC-0023 multi-host seed host=api ===');
const profileApi = await loadDeployProfile(profileApiPath);
assert(profileApi.host === 'api', 'api profile host must be non-default');
assert(profileApi.host !== 'default', 'multi-host profile rejects default host');
const seededApi = await seedDnaFromCwlFile(goldCwl, {
  app_id: 'cutover-smoke-api',
  mode: 'draft',
  created_at: '2026-08-04T00:00:00.000Z',
  fixture: 'fixtures/language-gold/24-dna-bridge/routes.cwl',
  cwlRoot,
  deployProfile: profileApiPath,
});
assert(seededApi.routes.every((r) => r.host === 'api'), 'all routes host=api from deploy profile');
assert(
  seededApi.bridge?.deploy_profile?.host === 'api' || seededApi.bridge?.deploy_host === 'api',
  'bridge annotates deploy host=api',
);
const cmpApi = compareCwlSurfaceToDna(seededApi, seededApi, { deployProfile: profileApi });
assert(cmpApi.ok === true, 'api self-compare');
assert(cmpApi.ignore_host === false, 'multi-host must require host identity');
const cmpCross = compareCwlSurfaceToDna(seededApi, certified, { deployProfile: profileApi });
assert(cmpCross.ok === false, 'api surface must not match default-host DNA');
assert(cmpCross.missing_in_dna.length >= 1, 'reports host gaps');
fs.writeFileSync(path.join(outDir, 'seeded-api.dna.json'), JSON.stringify(seededApi, null, 2) + '\n');

console.log('=== cutover: multi-host promote + enforce host=api ===');
let certifiedApi = {
  ...stripBridgeEnvelope(seededApi),
  mode: 'certified',
  created_at: new Date().toISOString(),
};
certifiedApi = signDna(certifiedApi, { secret: LAB_KEY, key_id: LAB_KEY_ID });
fs.writeFileSync(path.join(outDir, 'certified-api.dna.json'), JSON.stringify(certifiedApi, null, 2) + '\n');

const apiKnown = scoreRequest(certifiedApi, { method: 'GET', path: '/api/health', host: 'api' });
assert(apiKnown.allow === true, `host=api known route must allow: ${JSON.stringify(apiKnown)}`);
const wrongHost = scoreRequest(certifiedApi, { method: 'GET', path: '/api/health', host: 'default' });
assert(wrongHost.allow === false, 'host=default must deny against api DNA');
assert(wrongHost.hole?.code === 'HX-ROUTE-UNKNOWN', `wrong host hole: ${wrongHost.hole?.code}`);
const apiUnknown = scoreRequest(certifiedApi, { method: 'GET', path: '/api/backdoor', host: 'api' });
assert(apiUnknown.allow === false, 'unknown on api host must deny');

console.log('=== cutover: dna_gaps fill (Secure-owned) ===');
const holes = await buildHolesBridgeReport(goldCwl, {
  cwlRoot,
  compare: cmpCross,
  fixture: 'fixtures/language-gold/24-dna-bridge/routes.cwl',
});
assert(holes.kind === 'chrysalis.cwl.holes-bridge-report', 'holes report kind');
assert(Array.isArray(holes.dna_gaps), 'dna_gaps array');
assert(holes.dna_gaps.length === cmpCross.missing_in_dna.length, 'dna_gaps filled');
assert(holes.filled_by === 'helix', 'filled_by helix');
assert(
  holes.dna_gaps.every((g) => g.host === 'api'),
  'dna_gaps carry non-default host=api',
);
fs.writeFileSync(path.join(outDir, 'holes-bridge.json'), JSON.stringify(holes, null, 2) + '\n');

console.log('CUTOVER_MULTIHOST_OK');
console.log('CUTOVER_SMOKE_OK');
