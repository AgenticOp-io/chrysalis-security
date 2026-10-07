#!/usr/bin/env node
/**
 * Platform cutover E2E: CWL gold → draft DNA → strip → promote(+HMAC) →
 * compareCwlSurfaceToDna → scoreRequest allow/deny in enforce.
 * Also proves RFC-0023 multi-host (host=api) + dna_gaps fill + enforce host identity.
 * Tokens: CUTOVER_MULTIHOST_OK · CUTOVER_SMOKE_OK
 * Requires sibling engines/chrysalis-cwl (or CHRYSALIS_CWL_ROOT) + @agenticop-io/cwl@1.0.21.
 */
import fs from 'node:fs';
import os from 'node:os';
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
  buildUpstreamTargetsReport,
  loadCwlHoleLookup,
} from '../packages/cwl-bridge/index.mjs';
import { scoreRequest, scoreResponse, signDna, verifyDna } from '../packages/dna-core/index.mjs';

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

// Gold seeds query_key_fingerprint "include" on /items/:id (CWL 1.0.21+)
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

console.log('=== cutover: gold 34 SSE/multipart/HEAD fingerprint honor ===');
const gold34Dir = path.join(cwlRoot, 'fixtures', 'language-gold', '34-dna-bridge-surfaces');
const gold34Cwl = path.join(gold34Dir, 'routes.cwl');
if (!fs.existsSync(gold34Cwl)) {
  console.log('CUTOVER_SURFACES_SKIP (missing 34-dna-bridge-surfaces)');
} else {
  const seeded34 = await seedDnaFromCwlFile(gold34Cwl, {
    app_id: 'cutover-surfaces',
    mode: 'draft',
    fixture: 'fixtures/language-gold/34-dna-bridge-surfaces/routes.cwl',
    cwlRoot,
  });
  assert(seeded34.bridge?.annotations?.length >= 3, '34 annotations present');
  const sseAnn = seeded34.bridge.annotations.find((a) => a.cwl_stream === 'sse');
  assert(sseAnn?.path_template === '/events', 'cwl_stream sse on /events');
  const mpAnn = seeded34.bridge.annotations.find(
    (a) => Array.isArray(a.cwl_multipart_fields) && a.cwl_multipart_fields.includes('title'),
  );
  assert(mpAnn?.cwl_multipart_files?.includes('avatar'), 'multipart file avatar');
  const upload = seeded34.routes.find(
    (r) => r.method === 'POST' && r.path_template === '/upload',
  );
  assert(upload?.request_key_fingerprint === 'avatar,title', 'multipart request fp');
  const events = seeded34.routes.find(
    (r) => r.method === 'GET' && r.path_template === '/events',
  );
  assert(events?.content_class === 'other', 'SSE content_class other');

  let certified34 = {
    ...stripBridgeEnvelope(seeded34),
    mode: 'certified',
    created_at: new Date().toISOString(),
  };
  certified34 = signDna(certified34, { secret: LAB_KEY, key_id: LAB_KEY_ID });
  const cmp34 = compareCwlSurfaceToDna(seeded34, certified34);
  assert(cmp34.ok === true, `34 cutover: ${JSON.stringify(cmp34.fingerprint_mismatches)}`);
  assert(cmp34.bridge_annotations?.cwl_stream?.some((a) => a.cwl_stream === 'sse'), 'stream anns');
  assert(cmp34.bridge_annotations?.multipart?.length >= 1, 'multipart anns');
  assert(
    cmp34.fingerprints_honored?.some((f) => f.field === 'request_key_fingerprint'),
    'request fp honored',
  );
  fs.writeFileSync(path.join(outDir, 'seeded-34.dna.json'), JSON.stringify(seeded34, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'certified-34.dna.json'), JSON.stringify(certified34, null, 2) + '\n');
  console.log('CUTOVER_SURFACES_OK');
}

console.log('=== cutover: tip 1.0.28 page golds (layout / cookie / page-island emit reverse) ===');
const tip28Golds = [
  { dir: '36-layout-chrome', minRoutes: 2 },
  { dir: '37-html-cookie-device', minRoutes: 1 },
  { dir: '38-html-page-island', minRoutes: 1 },
];
let tip28Ok = 0;
for (const g of tip28Golds) {
  const cwlPath = path.join(cwlRoot, 'fixtures', 'language-gold', g.dir, 'routes.cwl');
  if (!fs.existsSync(cwlPath)) {
    console.log(`CUTOVER_TIP28_SKIP (missing ${g.dir})`);
    continue;
  }
  const seeded = await seedDnaFromCwlFile(cwlPath, {
    app_id: `cutover-${g.dir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${g.dir}/routes.cwl`,
    cwlRoot,
  });
  assert((seeded.routes?.length ?? 0) >= g.minRoutes, `${g.dir} route count`);
  assert(
    seeded.routes.every((r) => r.content_class === 'html'),
    `${g.dir} page surfaces seed content_class html`,
  );
  const certified = stripBridgeEnvelope(seeded);
  const cmp = compareCwlSurfaceToDna(seeded, certified);
  assert(cmp.ok === true, `${g.dir} self-cutover: ${JSON.stringify(cmp.missing_in_dna)}`);
  tip28Ok += 1;
}
if (tip28Ok === tip28Golds.length) {
  console.log('CUTOVER_TIP_1_0_28_OK');
} else if (tip28Ok > 0) {
  console.log(`CUTOVER_TIP_1_0_28_PARTIAL (${tip28Ok}/${tip28Golds.length})`);
}

console.log('=== cutover: tip 1.0.37 golds 39-45 (repeats / credentials / forwards / host bytes) ===');
const tip37Golds = [
  { dir: '39-cinderpath-holes', minRoutes: 3 },
  { dir: '40-html-repeat', minRoutes: 1, allHtml: true },
  { dir: '41-html-repeat-fields', minRoutes: 1, allHtml: true },
  { dir: '42-auth-effects-v2', minRoutes: 2 },
  { dir: '43-proxy-upstream', minRoutes: 2 },
  { dir: '44-host-bytes-holes', minRoutes: 3 },
  { dir: '45-proxy-upstream-params', minRoutes: 3 },
];
const tip37Seen = new Map();
let tip37Ok = 0;
for (const g of tip37Golds) {
  const cwlPath = path.join(cwlRoot, 'fixtures', 'language-gold', g.dir, 'routes.cwl');
  if (!fs.existsSync(cwlPath)) {
    console.log(`CUTOVER_TIP37_SKIP (missing ${g.dir})`);
    continue;
  }
  const seeded = await seedDnaFromCwlFile(cwlPath, {
    app_id: `cutover-${g.dir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${g.dir}/routes.cwl`,
    cwlRoot,
  });
  assert((seeded.routes?.length ?? 0) >= g.minRoutes, `${g.dir} route count`);
  if (g.allHtml) {
    assert(
      seeded.routes.every((r) => r.content_class === 'html'),
      `${g.dir} repeat markup stays an HTML surface`,
    );
  }
  const certified = stripBridgeEnvelope(seeded);
  const cmp = compareCwlSurfaceToDna(seeded, certified);
  assert(cmp.ok === true, `${g.dir} self-cutover: ${JSON.stringify(cmp.missing_in_dna)}`);
  tip37Seen.set(g.dir, { seeded, cmp });
  tip37Ok += 1;
}

// 1.0.33 — login intent is genome data, not a hole
const auth = tip37Seen.get('42-auth-effects-v2');
if (auth) {
  const login = auth.cmp.bridge_annotations.credential.find(
    (a) => a.method === 'POST' && a.path_template === '/login',
  );
  assert(login, 'login carries credential effects');
  assert(login.cwl_credential_effects.includes('auth.verify'), 'auth.verify tag');
  assert(login.cwl_credential_effects.includes('session.mint'), 'session.mint tag');
  const logout = auth.cmp.bridge_annotations.credential.find(
    (a) => a.path_template === '/logout',
  );
  assert(logout?.cwl_credential_effects.includes('session.revoke'), 'session.revoke tag');

  // A seeded certificate has no response surface — the genome knows a session is minted,
  // never which cookie carries it. Cutover says so instead of inventing a name.
  const seededNote = auth.cmp.session_mint_notes.find((n) => n.path_template === '/login');
  assert(
    seededNote?.note === 'dna_predates_response_surface',
    `seed has no cookie opinion: ${JSON.stringify(seededNote)}`,
  );

  // Once the app has been learned, the two sources are cross-checked.
  const learned = stripBridgeEnvelope(auth.seeded);
  const loginRoute = learned.routes.find(
    (r) => r.method === 'POST' && r.path_template === '/login',
  );
  loginRoute.set_cookie_names = [];
  const silent = compareCwlSurfaceToDna(auth.seeded, learned);
  assert(
    silent.session_mint_notes.find((n) => n.path_template === '/login')?.note ===
      'genome_mints_session_dna_sets_no_cookie',
    'a session minter that sets no cookie is flagged',
  );
  loginRoute.set_cookie_names = ['sid'];
  const honored = compareCwlSurfaceToDna(auth.seeded, learned);
  const okNote = honored.session_mint_notes.find((n) => n.path_template === '/login');
  assert(okNote?.note === 'session_mint_honored', `honored: ${JSON.stringify(okNote)}`);
  assert(okNote.set_cookie_names.includes('sid'), 'the certificate names the cookie');
  assert(honored.ok === true, 'a note never fails the cutover — DNA owns observed behaviour');
}

// 1.0.34 / 1.0.36 — a forwarded route names its full upstream target
const proxy = tip37Seen.get('43-proxy-upstream');
if (proxy) {
  const fwd = proxy.cmp.bridge_annotations.upstream_proxy.find(
    (a) => a.path_template === '/api/tower-status',
  );
  assert(
    fwd?.cwl_upstream_target === 'https://backend-services.internal/tower-status',
    `upstream target: ${fwd?.cwl_upstream_target}`,
  );
  const egress = buildUpstreamTargetsReport(proxy.seeded);
  assert(
    egress.origins.includes('https://backend-services.internal'),
    `egress origins: ${JSON.stringify(egress.origins)}`,
  );
}

const proxyParams = tip37Seen.get('45-proxy-upstream-params');
if (proxyParams) {
  const withParams = proxyParams.cmp.bridge_annotations.upstream_proxy.find(
    (a) => a.path_template === '/api/site/:site/tower/:tower',
  );
  assert(
    withParams?.cwl_upstream_target ===
      'https://backend-services.internal/sites/:site/towers/:tower',
    'param target kept verbatim',
  );
  assert(
    withParams.cwl_upstream_params.join(',') === 'site,tower',
    `param names: ${withParams.cwl_upstream_params}`,
  );
  // `:region` is not a param of /api/pop/:id/health — CWL keeps it a hole, Helix must not guess
  const lookupHole = await loadCwlHoleLookup(cwlRoot);
  assert(typeof lookupHole === 'function', 'tip 1.0.37 hole lookup loads from the pillar');
  const egress = buildUpstreamTargetsReport(proxyParams.seeded, { lookupHole });
  const region = egress.unresolved.find((u) => u.reason === 'cwl:unknown-proxy-param:region');
  assert(region, `unresolved proxy param: ${JSON.stringify(egress.unresolved)}`);
  assert(region.catalogued === true, 'parameterized reason resolves to catalog entry');
  assert(
    /proxy upstream/.test(region.summary || ''),
    `catalog summary rides the report: ${region.summary}`,
  );
  assert(region.rfc === '0033', `rfc: ${region.rfc}`);
  assert(
    !egress.targets.some((t) => t.path_template === '/api/pop/:id/health'),
    'rejected proxy target never becomes an egress destination',
  );
}

// 1.0.35 — host-byte routes keep their media type next to the hole
const hostBytes = tip37Seen.get('44-host-bytes-holes');
if (hostBytes) {
  const qr = hostBytes.cmp.bridge_annotations.host_bytes.find(
    (a) => a.path_template === '/device/:id/qr',
  );
  assert(qr?.cwl_hole_reason === 'hub-cwl:binary-render', `qr reason: ${qr?.cwl_hole_reason}`);
  assert(qr.cwl_content_type === 'image/png', `qr media type: ${qr.cwl_content_type}`);
  const keypair = hostBytes.cmp.bridge_annotations.host_bytes.find(
    (a) => a.path_template === '/device/:id/keypair',
  );
  assert(keypair?.cwl_hole_reason === 'hub-cwl:keypair-gen', 'keypair reason');
  assert(keypair.cwl_declared_content_class === 'json', 'declared media type maps to DNA class');

  // Declared media type vs learned class is a note, never a silent DNA rewrite
  const learned = {
    ...stripBridgeEnvelope(hostBytes.seeded),
    routes: hostBytes.seeded.routes.map((r) =>
      r.path_template === '/device/:id/keypair' ? { ...r, content_class: 'html' } : r,
    ),
  };
  const drift = compareCwlSurfaceToDna(hostBytes.seeded, learned);
  assert(
    drift.content_class_notes.some(
      (n) => n.note === 'cwl_declared_media_type_vs_dna_content_class',
    ),
    'media type drift noted',
  );
  assert(drift.ok === true, 'media type drift stays a note, not a cutover failure');
}

if (tip37Ok === tip37Golds.length) {
  console.log('CUTOVER_TIP_1_0_37_OK');
} else if (tip37Ok > 0) {
  console.log(`CUTOVER_TIP_1_0_37_PARTIAL (${tip37Ok}/${tip37Golds.length})`);
}

console.log('=== cutover: tip 1.0.38–1.0.39 (session cookie name / repeat if) ===');
const tip39Golds = [
  { dir: '46-session-cookie-name', minRoutes: 2 },
  { dir: '47-html-repeat-if', minRoutes: 1, allHtml: true },
];
const tip39Seen = new Map();
let tip39Ok = 0;
for (const g of tip39Golds) {
  const cwlPath = path.join(cwlRoot, 'fixtures', 'language-gold', g.dir, 'routes.cwl');
  if (!fs.existsSync(cwlPath)) {
    console.log(`CUTOVER_TIP39_SKIP (missing ${g.dir})`);
    continue;
  }
  const seeded = await seedDnaFromCwlFile(cwlPath, {
    app_id: `cutover-${g.dir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${g.dir}/routes.cwl`,
    cwlRoot,
  });
  assert((seeded.routes?.length ?? 0) >= g.minRoutes, `${g.dir} route count`);
  if (g.allHtml) {
    assert(
      seeded.routes.every((r) => r.content_class === 'html'),
      `${g.dir} filtered repeat stays an HTML surface`,
    );
  }
  const certified = stripBridgeEnvelope(seeded);
  const cmp = compareCwlSurfaceToDna(seeded, certified);
  assert(cmp.ok === true, `${g.dir} self-cutover: ${JSON.stringify(cmp.missing_in_dna)}`);
  tip39Seen.set(g.dir, { seeded, cmp });
  tip39Ok += 1;
}

// 1.0.38 — genome may name the session cookie; cutover honors name-only against DNA
const named = tip39Seen.get('46-session-cookie-name');
if (named) {
  const login = named.cmp.bridge_annotations.credential.find(
    (a) => a.method === 'POST' && a.path_template === '/login',
  );
  assert(login, 'named-cookie login carries credential effects');
  assert(
    login.cwl_credential_effects.includes('session.mint cookie sid'),
    `mint with name: ${JSON.stringify(login.cwl_credential_effects)}`,
  );
  assert(
    login.cwl_session_cookies?.includes('sid'),
    `annotation carries cookie name: ${JSON.stringify(login.cwl_session_cookies)}`,
  );
  assert(
    named.seeded.routes.every((r) => !Array.isArray(r.set_cookie_names)),
    'seeded DNA routes do not invent set_cookie_names from the genome',
  );

  const seededNote = named.cmp.session_mint_notes.find((n) => n.path_template === '/login');
  assert(
    seededNote?.note === 'dna_predates_response_surface',
    `seed still has no cookie opinion: ${JSON.stringify(seededNote)}`,
  );
  assert(seededNote.genome_cookies?.includes('sid'), 'note remembers the genome name');

  const learned = stripBridgeEnvelope(named.seeded);
  const loginRoute = learned.routes.find(
    (r) => r.method === 'POST' && r.path_template === '/login',
  );
  loginRoute.set_cookie_names = ['sid'];
  const honored = compareCwlSurfaceToDna(named.seeded, learned);
  const okNote = honored.session_mint_notes.find((n) => n.path_template === '/login');
  assert(okNote?.note === 'session_mint_honored', `named cookie honored: ${JSON.stringify(okNote)}`);
  assert(okNote.genome_cookies.includes('sid'), 'genome name rides the honor note');

  loginRoute.set_cookie_names = ['other'];
  const mismatch = compareCwlSurfaceToDna(named.seeded, learned);
  const bad = mismatch.session_mint_notes.find((n) => n.path_template === '/login');
  assert(bad?.note === 'genome_cookie_not_in_dna', `name mismatch: ${JSON.stringify(bad)}`);
  assert(bad.missing.includes('sid'), 'missing names the genome cookie');
  assert(mismatch.ok === true, 'cookie name mismatch is a note, not a cutover failure');

  const logout = named.cmp.bridge_annotations.credential.find((a) => a.path_template === '/logout');
  assert(
    logout?.cwl_credential_effects.includes('session.revoke cookie sid'),
    'revoke carries the same cookie name',
  );
}

// 1.0.39 — repeat if is page DNA; Secure only needs self-cutover (done above)
const repeatIf = tip39Seen.get('47-html-repeat-if');
if (repeatIf) {
  assert(
    repeatIf.seeded.routes.some((r) => r.path_template === '/sessions'),
    'filtered repeat page is a DNA surface',
  );
}

if (tip39Ok === tip39Golds.length) {
  console.log('CUTOVER_TIP_1_0_39_OK');
} else if (tip39Ok > 0) {
  console.log(`CUTOVER_TIP_1_0_39_PARTIAL (${tip39Ok}/${tip39Golds.length})`);
}

console.log('=== cutover: tip 1.0.40–1.0.46 (repeats / cookie attrs / CSRF name) ===');
const tip46Golds = [
  { dir: '48-html-repeat-else', minRoutes: 1, allHtml: true },
  { dir: '49-html-repeat-nested', minRoutes: 1, allHtml: true },
  { dir: '50-html-repeat-nested-filter', minRoutes: 1, allHtml: true },
  { dir: '51-session-cookie-attrs', minRoutes: 2 },
  { dir: '52-cors-allow-origin', minRoutes: 2 },
  { dir: '53-rate-limit-rpm', minRoutes: 2 },
  { dir: '54-csrf-verify-cookie', minRoutes: 2 },
];
const tip46Seen = new Map();
let tip46Ok = 0;
for (const g of tip46Golds) {
  const cwlPath = path.join(cwlRoot, 'fixtures', 'language-gold', g.dir, 'routes.cwl');
  if (!fs.existsSync(cwlPath)) {
    console.log(`CUTOVER_TIP46_SKIP (missing ${g.dir})`);
    continue;
  }
  const seeded = await seedDnaFromCwlFile(cwlPath, {
    app_id: `cutover-${g.dir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${g.dir}/routes.cwl`,
    cwlRoot,
  });
  assert((seeded.routes?.length ?? 0) >= g.minRoutes, `${g.dir} route count`);
  if (g.allHtml) {
    assert(
      seeded.routes.every((r) => r.content_class === 'html'),
      `${g.dir} page DNA stays HTML`,
    );
  }
  assert(
    seeded.routes.every((r) => !Array.isArray(r.set_cookie_names)),
    `${g.dir} seed does not invent set_cookie_names`,
  );
  assert(
    seeded.routes.every((r) => r.set_cookie_attrs == null || Object.keys(r.set_cookie_attrs).length === 0),
    `${g.dir} seed does not invent cookie attrs`,
  );
  const certified = stripBridgeEnvelope(seeded);
  const cmp = compareCwlSurfaceToDna(seeded, certified);
  assert(cmp.ok === true, `${g.dir} self-cutover: ${JSON.stringify(cmp.missing_in_dna)}`);
  tip46Seen.set(g.dir, { seeded, cmp });
  tip46Ok += 1;
}

// 1.0.40–1.0.42 / 1.0.44–1.0.45 — pin-only page or middleware DNA; no new Secure surface
const repeatElse = tip46Seen.get('48-html-repeat-else');
if (repeatElse) {
  assert(
    repeatElse.seeded.routes.some((r) => r.path_template === '/sessions'),
    'empty-collection repeat page is a DNA surface',
  );
}
const nested = tip46Seen.get('49-html-repeat-nested');
if (nested) {
  assert(
    nested.seeded.routes.some((r) => r.path_template === '/regions'),
    'nested repeat page is a DNA surface',
  );
}

// 1.0.43 — genome policy attrs vs live Set-Cookie flags (never a token value)
const attrGold = tip46Seen.get('51-session-cookie-attrs');
if (attrGold) {
  const login = attrGold.cmp.bridge_annotations.credential.find(
    (a) => a.method === 'POST' && a.path_template === '/login',
  );
  assert(login, 'attr login carries credential effects');
  assert(
    login.cwl_credential_effects.some((e) => String(e).startsWith('session.mint cookie sid')),
    `mint with attrs: ${JSON.stringify(login.cwl_credential_effects)}`,
  );
  assert(login.cwl_session_cookies?.includes('sid'), 'name still extracted when attrs follow');
  assert(
    login.cwl_session_cookie_attrs?.sid?.httponly === true &&
      login.cwl_session_cookie_attrs.sid.secure === true &&
      login.cwl_session_cookie_attrs.sid.path === '/' &&
      login.cwl_session_cookie_attrs.sid.samesite === 'lax',
    `attrs on annotation: ${JSON.stringify(login.cwl_session_cookie_attrs)}`,
  );

  const learned = stripBridgeEnvelope(attrGold.seeded);
  const loginRoute = learned.routes.find((r) => r.method === 'POST' && r.path_template === '/login');
  loginRoute.set_cookie_names = ['sid'];
  loginRoute.set_cookie_attrs = {
    sid: { httponly: true, secure: true, path: '/', samesite: 'lax' },
  };
  const honored = compareCwlSurfaceToDna(attrGold.seeded, learned);
  const okNote = honored.session_mint_notes.find((n) => n.path_template === '/login');
  assert(okNote?.note === 'session_mint_honored', `named+attrs honored: ${JSON.stringify(okNote)}`);
  assert(
    okNote.attr_notes?.some((n) => n.note === 'cookie_attrs_honored' && n.name === 'sid'),
    `attr honor: ${JSON.stringify(okNote.attr_notes)}`,
  );

  loginRoute.set_cookie_attrs = { sid: { path: '/' } };
  const mismatch = compareCwlSurfaceToDna(attrGold.seeded, learned);
  const bad = mismatch.session_mint_notes.find((n) => n.path_template === '/login');
  assert(
    bad?.attr_notes?.some((n) => n.note === 'genome_cookie_attrs_not_in_dna' && n.missing.includes('httponly')),
    `attr mismatch: ${JSON.stringify(bad?.attr_notes)}`,
  );
  assert(mismatch.ok === true, 'attr mismatch is a note, not a cutover failure');
}

// 1.0.46 — CSRF cookie name vs any cookie the certificate has seen
const csrfGold = tip46Seen.get('54-csrf-verify-cookie');
if (csrfGold) {
  const form = csrfGold.cmp.bridge_annotations.csrf.find(
    (a) => a.method === 'POST' && a.path_template === '/form',
  );
  assert(form?.cwl_csrf_effects?.includes('csrf.verify cookie csrf'), 'named csrf effect');
  assert(form.cwl_csrf_cookies?.includes('csrf'), `csrf name: ${JSON.stringify(form.cwl_csrf_cookies)}`);
  const bare = csrfGold.cmp.bridge_annotations.csrf.find((a) => a.path_template === '/form-default');
  assert(bare?.cwl_csrf_effects?.includes('csrf.verify'), 'bare csrf.verify stays unnamed');
  assert(!bare.cwl_csrf_cookies?.length, 'bare verify does not invent a cookie name');

  const learned = stripBridgeEnvelope(csrfGold.seeded);
  // CSRF cookie is usually set on a GET form page, not the POST that verifies it.
  const getForm = learned.routes.find((r) => r.path_template === '/form') || learned.routes[0];
  getForm.set_cookie_names = ['csrf'];
  const honored = compareCwlSurfaceToDna(csrfGold.seeded, learned);
  const okNote = honored.csrf_notes.find((n) => n.path_template === '/form');
  assert(okNote?.note === 'csrf_cookie_honored', `csrf honored: ${JSON.stringify(okNote)}`);

  getForm.set_cookie_names = ['other'];
  const mismatch = compareCwlSurfaceToDna(csrfGold.seeded, learned);
  const bad = mismatch.csrf_notes.find((n) => n.path_template === '/form');
  assert(bad?.note === 'csrf_cookie_not_in_dna', `csrf mismatch: ${JSON.stringify(bad)}`);
  assert(bad.missing.includes('csrf'), 'missing names the genome CSRF cookie');
  assert(mismatch.ok === true, 'CSRF name mismatch is a note, not a cutover failure');
}

if (tip46Ok === tip46Golds.length) {
  console.log('CUTOVER_TIP_1_0_46_OK');
} else if (tip46Ok > 0) {
  console.log(`CUTOVER_TIP_1_0_46_PARTIAL (${tip46Ok}/${tip46Golds.length})`);
}

console.log('=== cutover: tip 1.0.47–1.0.51 (auth.require cookie / db / mail / cors methods / cache) ===');
const tip51Golds = [
  { dir: '55-auth-require-cookie', minRoutes: 2 },
  { dir: '56-db-table-name', minRoutes: 3 },
  { dir: '57-mail-send-template', minRoutes: 2 },
  { dir: '58-cors-allow-methods', minRoutes: 3 },
  { dir: '59-cache-max-age', minRoutes: 2 },
];
const tip51Seen = new Map();
let tip51Ok = 0;
for (const g of tip51Golds) {
  const cwlPath = path.join(cwlRoot, 'fixtures', 'language-gold', g.dir, 'routes.cwl');
  if (!fs.existsSync(cwlPath)) {
    console.log(`CUTOVER_TIP51_SKIP (missing ${g.dir})`);
    continue;
  }
  const seeded = await seedDnaFromCwlFile(cwlPath, {
    app_id: `cutover-${g.dir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${g.dir}/routes.cwl`,
    cwlRoot,
  });
  assert((seeded.routes?.length ?? 0) >= g.minRoutes, `${g.dir} route count`);
  assert(
    seeded.routes.every((r) => !Array.isArray(r.set_cookie_names)),
    `${g.dir} seed does not invent set_cookie_names`,
  );
  const certified = stripBridgeEnvelope(seeded);
  const cmp = compareCwlSurfaceToDna(seeded, certified);
  assert(cmp.ok === true, `${g.dir} self-cutover: ${JSON.stringify(cmp.missing_in_dna)}`);
  tip51Seen.set(g.dir, { seeded, cmp });
  tip51Ok += 1;
}

// 1.0.47 — genome names the required session cookie; presence vs any DNA cookie
const requireGold = tip51Seen.get('55-auth-require-cookie');
if (requireGold) {
  const me = requireGold.cmp.bridge_annotations.credential.find(
    (a) => a.method === 'GET' && a.path_template === '/me',
  );
  assert(me?.cwl_credential_effects?.includes('auth.require cookie sid'), 'named auth.require');
  assert(me.cwl_auth_require_cookies?.includes('sid'), `require name: ${JSON.stringify(me.cwl_auth_require_cookies)}`);
  const admin = requireGold.cmp.bridge_annotations.credential.find((a) => a.path_template === '/admin');
  assert(admin?.cwl_credential_effects?.includes('auth.require'), 'bare auth.require stays unnamed');
  assert(!admin.cwl_auth_require_cookies?.length, 'bare require does not invent a cookie name');

  const learned = stripBridgeEnvelope(requireGold.seeded);
  const loginish = learned.routes.find((r) => r.path_template === '/admin') || learned.routes[0];
  loginish.set_cookie_names = ['sid'];
  const honored = compareCwlSurfaceToDna(requireGold.seeded, learned);
  const okNote = honored.auth_require_notes.find((n) => n.path_template === '/me');
  assert(okNote?.note === 'auth_require_cookie_honored', `auth.require honored: ${JSON.stringify(okNote)}`);

  loginish.set_cookie_names = ['other'];
  const mismatch = compareCwlSurfaceToDna(requireGold.seeded, learned);
  const bad = mismatch.auth_require_notes.find((n) => n.path_template === '/me');
  assert(bad?.note === 'auth_require_cookie_not_in_dna', `auth.require mismatch: ${JSON.stringify(bad)}`);
  assert(bad.missing.includes('sid'), 'missing names the genome required cookie');
  assert(mismatch.ok === true, 'auth.require name mismatch is a note, not a cutover failure');
}

if (tip51Ok === tip51Golds.length) {
  console.log('CUTOVER_TIP_1_0_51_OK');
} else if (tip51Ok > 0) {
  console.log(`CUTOVER_TIP_1_0_51_PARTIAL (${tip51Ok}/${tip51Golds.length})`);
}

console.log('=== cutover: tip 1.0.52–1.0.53 (io host / cors credentials — pin only) ===');
const tip53Golds = [
  { dir: '60-io-host', minRoutes: 2 },
  { dir: '61-cors-allow-credentials', minRoutes: 3 },
];
let tip53Ok = 0;
for (const g of tip53Golds) {
  const cwlPath = path.join(cwlRoot, 'fixtures', 'language-gold', g.dir, 'routes.cwl');
  if (!fs.existsSync(cwlPath)) {
    console.log(`CUTOVER_TIP53_SKIP (missing ${g.dir})`);
    continue;
  }
  const seeded = await seedDnaFromCwlFile(cwlPath, {
    app_id: `cutover-${g.dir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${g.dir}/routes.cwl`,
    cwlRoot,
  });
  assert((seeded.routes?.length ?? 0) >= g.minRoutes, `${g.dir} route count`);
  assert(
    seeded.routes.every((r) => !Array.isArray(r.set_cookie_names)),
    `${g.dir} seed does not invent set_cookie_names`,
  );
  // Logical host / credentials flag stay genome intent — not DNA host identity or a CORS engine.
  assert(
    seeded.routes.every((r) => String(r.host || 'default') === 'default'),
    `${g.dir} io host does not rewrite DNA host`,
  );
  const certified = stripBridgeEnvelope(seeded);
  const cmp = compareCwlSurfaceToDna(seeded, certified);
  assert(cmp.ok === true, `${g.dir} self-cutover: ${JSON.stringify(cmp.missing_in_dna)}`);
  tip53Ok += 1;
}

if (tip53Ok === tip53Golds.length) {
  console.log('CUTOVER_TIP_1_0_53_OK');
} else if (tip53Ok > 0) {
  console.log(`CUTOVER_TIP_1_0_53_PARTIAL (${tip53Ok}/${tip53Golds.length})`);
}

console.log('=== cutover: tip 1.0.54–1.0.56 (session access / cache.private / cookie purpose) ===');
const tip56Golds = [
  { dir: '62-session-access-cookie', minRoutes: 3 },
  { dir: '63-cache-private', minRoutes: 2 },
  { dir: '64-cookie-purpose', minRoutes: 3 },
];
const tip56Seen = new Map();
let tip56Ok = 0;
for (const g of tip56Golds) {
  const cwlPath = path.join(cwlRoot, 'fixtures', 'language-gold', g.dir, 'routes.cwl');
  if (!fs.existsSync(cwlPath)) {
    console.log(`CUTOVER_TIP56_SKIP (missing ${g.dir})`);
    continue;
  }
  const seeded = await seedDnaFromCwlFile(cwlPath, {
    app_id: `cutover-${g.dir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${g.dir}/routes.cwl`,
    cwlRoot,
  });
  assert((seeded.routes?.length ?? 0) >= g.minRoutes, `${g.dir} route count`);
  assert(
    seeded.routes.every((r) => !Array.isArray(r.set_cookie_names) && !r.cookie_purposes),
    `${g.dir} seed does not invent cookie names or purposes into DNA`,
  );
  const certified = stripBridgeEnvelope(seeded);
  const cmp = compareCwlSurfaceToDna(seeded, certified);
  assert(cmp.ok === true, `${g.dir} self-cutover: ${JSON.stringify(cmp.missing_in_dna)}`);
  tip56Seen.set(g.dir, { seeded, cmp });
  tip56Ok += 1;
}

const access = tip56Seen.get('62-session-access-cookie');
if (access) {
  const me = access.cmp.bridge_annotations;
  const ann = (access.seeded.bridge?.annotations || []).find((a) => a.path_template === '/me');
  assert(ann?.cwl_session_access_cookies?.includes('sid'), `session.read name: ${JSON.stringify(ann)}`);
  const anon = (access.seeded.bridge?.annotations || []).find((a) => a.path_template === '/anon');
  assert(!anon?.cwl_session_access_cookies?.length, 'bare session.read does not invent a cookie name');
  assert(me, 'access gold compared');
}

const priv = tip56Seen.get('63-cache-private');
if (priv) {
  const account = (priv.seeded.bridge?.annotations || []).find((a) => a.path_template === '/account');
  assert(account?.cwl_cache_private === true, 'cache.private is genome intent');
  const shared = (priv.seeded.bridge?.annotations || []).find((a) => a.path_template === '/public');
  assert(!shared?.cwl_cache_private, 'bare max-age is not private');
}

const purpose = tip56Seen.get('64-cookie-purpose');
if (purpose) {
  const home = (purpose.seeded.bridge?.annotations || []).find((a) => a.path_template === '/');
  const pref = home?.cwl_cookie_purposes?.find((p) => p.name === 'theme');
  assert(pref?.purpose === 'preference' && pref.values?.includes('light') && pref.values?.includes('dark'), `theme class: ${JSON.stringify(home?.cwl_cookie_purposes)}`);
  const me = (purpose.seeded.bridge?.annotations || []).find((a) => a.path_template === '/me');
  assert(me?.cwl_cookie_purposes?.some((p) => p.name === 'sid' && p.purpose === 'session'), 'sid is session purpose');
  const ad = (purpose.seeded.bridge?.annotations || []).find((a) => a.path_template === '/ad');
  assert(ad?.cwl_tracking_cookie === true, 'bare cookie is a tracking hole');
  const login = (purpose.seeded.bridge?.annotations || []).find((a) => a.path_template === '/login');
  assert(login?.cwl_tracking_cookie === true, 'samesite none is a tracking hole');
  assert(
    !JSON.stringify(purpose.seeded.routes).includes('s3cr3t'),
    'seeded DNA has no token',
  );

  const learned = stripBridgeEnvelope(purpose.seeded);
  const homeRoute = learned.routes.find((r) => r.path_template === '/');
  homeRoute.set_cookie_names = ['theme'];
  const honored = compareCwlSurfaceToDna(purpose.seeded, learned);
  assert(
    honored.cookie_purpose_notes.some((n) => n.path_template === '/' && n.note === 'cookie_purpose_honored'),
    `purpose honor: ${JSON.stringify(honored.cookie_purpose_notes)}`,
  );
  homeRoute.set_cookie_names = ['_ga'];
  const bad = compareCwlSurfaceToDna(purpose.seeded, learned);
  assert(
    bad.cookie_purpose_notes.some((n) => n.path_template === '/' && n.note === 'cookie_name_not_a_purpose' && n.extra.includes('_ga')),
    `purpose mismatch: ${JSON.stringify(bad.cookie_purpose_notes)}`,
  );
  assert(bad.ok === true, 'purpose mismatch is a note, not a cutover failure');

  const live = scoreResponse(
    { method: 'GET', path_template: '/', content_class: 'html', cookie_purposes: home.cwl_cookie_purposes },
    { contentType: 'text/html', status: 200, setCookie: 'theme=light; Path=/' },
  );
  assert(live.allow === true, `preference class allows light: ${JSON.stringify(live)}`);
  const drift = scoreResponse(
    { method: 'GET', path_template: '/', content_class: 'html', cookie_purposes: home.cwl_cookie_purposes },
    { contentType: 'text/html', status: 200, setCookie: 'theme=user-47af; Path=/' },
  );
  assert(drift.allow === false && drift.hole?.code === 'HX-COOKIE-PURPOSE', `class miss: ${JSON.stringify(drift)}`);
  assert(!JSON.stringify(drift).includes('user-47af'), 'rejected preference value is not recorded');
  const tracker = scoreResponse(
    { method: 'GET', path_template: '/', content_class: 'html', cookie_purposes: home.cwl_cookie_purposes },
    { contentType: 'text/html', status: 200, setCookie: '_ga=GA1.2.secret; Path=/' },
  );
  assert(tracker.allow === false && tracker.hole?.code === 'HX-COOKIE-PURPOSE', `tracker: ${JSON.stringify(tracker)}`);
  assert(!JSON.stringify(tracker).includes('GA1.2.secret'), 'tracking token is not recorded');
}

if (tip56Ok === tip56Golds.length) {
  console.log('CUTOVER_TIP_1_0_56_OK');
} else if (tip56Ok > 0) {
  console.log(`CUTOVER_TIP_1_0_56_PARTIAL (${tip56Ok}/${tip56Golds.length})`);
}

console.log('=== cutover: tip 1.0.57–1.0.61 (same-site redirect / cache / document shell) ===');
const tip61Golds = [
  { dir: '65-redirect-same-origin', minRoutes: 3 },
  { dir: '66-cache-no-store', minRoutes: 3 },
  { dir: '67-cache-no-cache', minRoutes: 3 },
  { dir: '68-site-document', minRoutes: 1, allHtml: true },
  { dir: '69-site-shell', minRoutes: 2, allHtml: true },
];
const tip61Seen = new Map();
let tip61Ok = 0;
for (const g of tip61Golds) {
  const cwlPath = path.join(cwlRoot, 'fixtures', 'language-gold', g.dir, 'routes.cwl');
  if (!fs.existsSync(cwlPath)) {
    console.log(`CUTOVER_TIP61_SKIP (missing ${g.dir})`);
    continue;
  }
  const seeded = await seedDnaFromCwlFile(cwlPath, {
    app_id: `cutover-${g.dir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${g.dir}/routes.cwl`,
    cwlRoot,
  });
  assert((seeded.routes?.length ?? 0) >= g.minRoutes, `${g.dir} route count`);
  if (g.allHtml) {
    assert(
      seeded.routes.every((r) => r.content_class === 'html'),
      `${g.dir} document shell stays page HTML`,
    );
  }
  assert(
    seeded.routes.every((r) => !Array.isArray(r.redirect_targets)),
    `${g.dir} seed does not invent redirect targets`,
  );
  assert(
    !JSON.stringify(seeded.routes).includes('evil.example'),
    `${g.dir} DNA routes do not copy an off-site target`,
  );
  const certified = stripBridgeEnvelope(seeded);
  const cmp = compareCwlSurfaceToDna(seeded, certified);
  assert(cmp.ok === true, `${g.dir} self-cutover: ${JSON.stringify(cmp.missing_in_dna)}`);
  tip61Seen.set(g.dir, { seeded, cmp });
  tip61Ok += 1;
}

const redir = tip61Seen.get('65-redirect-same-origin');
if (redir) {
  const login = (redir.seeded.bridge?.annotations || []).find((a) => a.path_template === '/login');
  assert(login?.cwl_redirect?.path === '/account' && login.cwl_redirect.status === 302, `same-site redirect: ${JSON.stringify(login?.cwl_redirect)}`);
  const moved = (redir.seeded.bridge?.annotations || []).find((a) => a.path_template === '/moved');
  assert(moved?.cwl_redirect?.path === '/home' && moved.cwl_redirect.status === 301, `301 path: ${JSON.stringify(moved?.cwl_redirect)}`);
  const out = (redir.seeded.bridge?.annotations || []).find((a) => a.path_template === '/out');
  assert(out?.cwl_open_redirect === true, 'off-site redirect is a genome hole');
  assert(!out?.cwl_redirect, 'off-site target is not a redirect to follow');

  const learned = stripBridgeEnvelope(redir.seeded);
  const loginRoute = learned.routes.find((r) => r.path_template === '/login');
  loginRoute.redirect_targets = ['self'];
  const honored = compareCwlSurfaceToDna(redir.seeded, learned);
  assert(
    honored.redirect_notes.some((n) => n.path_template === '/login' && n.note === 'genome_redirect_honored'),
    `redirect honor: ${JSON.stringify(honored.redirect_notes)}`,
  );
  loginRoute.redirect_targets = ['evil.example'];
  const bad = compareCwlSurfaceToDna(redir.seeded, learned);
  assert(
    bad.redirect_notes.some((n) => n.path_template === '/login' && n.note === 'genome_same_site_dna_off_site'),
    `off-site dna: ${JSON.stringify(bad.redirect_notes)}`,
  );
  assert(bad.ok === true, 'off-site disagreement is a note, not a cutover failure');
  assert(
    bad.redirect_notes.some((n) => n.path_template === '/out' && n.note === 'genome_open_redirect'),
    'open-redirect stays a note',
  );
}

const noStore = tip61Seen.get('66-cache-no-store');
if (noStore) {
  const account = (noStore.seeded.bridge?.annotations || []).find((a) => a.path_template === '/account');
  assert(account?.cwl_cache_no_store === true && account?.cwl_cache_private === true, 'no-store composes with private');
  const asset = (noStore.seeded.bridge?.annotations || []).find((a) => a.path_template === '/asset');
  assert(!asset?.cwl_cache_no_store, 'max-age is not no-store');
}

const noCache = tip61Seen.get('67-cache-no-cache');
if (noCache) {
  const feed = (noCache.seeded.bridge?.annotations || []).find((a) => a.path_template === '/feed');
  assert(feed?.cwl_cache_no_cache === true, 'no-cache is genome intent');
  const dash = (noCache.seeded.bridge?.annotations || []).find((a) => a.path_template === '/dashboard');
  assert(dash?.cwl_cache_no_cache === true && dash?.cwl_cache_private === true, 'no-cache composes with private');
}

if (tip61Ok === tip61Golds.length) {
  console.log('CUTOVER_TIP_1_0_61_OK');
} else if (tip61Ok > 0) {
  console.log(`CUTOVER_TIP_1_0_61_PARTIAL (${tip61Ok}/${tip61Golds.length})`);
}

console.log('=== cutover: tip 1.0.62 (shared nav id is document text) ===');
{
  const dir = '70-site-nav-id';
  const cwlPath = path.join(cwlRoot, 'fixtures', 'language-gold', dir, 'routes.cwl');
  assert(fs.existsSync(cwlPath), `missing ${dir}`);
  const seeded = await seedDnaFromCwlFile(cwlPath, {
    app_id: `cutover-${dir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${dir}/routes.cwl`,
    cwlRoot,
  });
  assert((seeded.routes?.length ?? 0) >= 3, `${dir} route count`);
  assert(
    seeded.routes.every((r) => r.content_class === 'html'),
    `${dir} nav id stays page HTML`,
  );
  assert(
    seeded.routes.every((r) => !/ao-layout\.js/.test(String(r.path_template || ''))),
    `${dir} menu script is not a DNA route`,
  );
  assert(
    seeded.routes.every((r) => r.navId == null && r.cwl_nav_id == null),
    `${dir} nav id is not a certified route field`,
  );
  const certified = stripBridgeEnvelope(seeded);
  const cmp = compareCwlSurfaceToDna(seeded, certified);
  assert(cmp.ok === true, `${dir} self-cutover: ${JSON.stringify(cmp.missing_in_dna)}`);
  const anns = seeded.bridge?.annotations || [];
  const paper = anns.find((a) => a.path_template === '/paper-cwl.html');
  const about = anns.find((a) => a.path_template === '/whitepaper.html');
  const home = anns.find((a) => a.path_template === '/');
  assert(paper?.cwl_nav_id === 'docs', `paper nav id: ${JSON.stringify(paper?.cwl_nav_id)}`);
  assert(about?.cwl_nav_id === 'about', `about nav id: ${JSON.stringify(about?.cwl_nav_id)}`);
  assert(home?.cwl_nav_id == null, 'absent nav keeps the page name; Helix does not invent an id');
  console.log('CUTOVER_TIP_1_0_62_OK');
}

console.log('=== cutover: tip 1.0.63–1.0.67 (document facts; assets stay host files) ===');
const tip67Golds = [
  { dir: '71-site-year', minRoutes: 2 },
  { dir: '72-site-nav-links', minRoutes: 4 },
  { dir: '73-site-shell-behavior', minRoutes: 3 },
  { dir: '74-site-assets', minRoutes: 2 },
  { dir: '75-site-page', minRoutes: 2 },
];
const tip67Seen = new Map();
let tip67Ok = 0;
for (const g of tip67Golds) {
  const cwlPath = path.join(cwlRoot, 'fixtures', 'language-gold', g.dir, 'routes.cwl');
  assert(fs.existsSync(cwlPath), `missing ${g.dir}`);
  const seeded = await seedDnaFromCwlFile(cwlPath, {
    app_id: `cutover-${g.dir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${g.dir}/routes.cwl`,
    cwlRoot,
  });
  assert((seeded.routes?.length ?? 0) >= g.minRoutes, `${g.dir} route count`);
  assert(
    seeded.routes.every((r) => r.content_class === 'html'),
    `${g.dir} stays page HTML`,
  );
  assert(
    seeded.routes.every(
      (r) =>
        r.cwl_year_host == null &&
        r.cwl_styles == null &&
        r.cwl_scripts == null &&
        r.cwl_forms == null &&
        r.cwl_host_firebase == null,
    ),
    `${g.dir} document facts are not DNA route fields`,
  );
  assert(
    seeded.routes.every((r) => !/\.(css|svg|js)$/.test(String(r.path_template || ''))),
    `${g.dir} host files are not DNA routes`,
  );
  assert(!JSON.stringify(seeded).includes('evil.example'), `${g.dir} off-site form URL is not copied`);
  assert(!JSON.stringify(seeded.routes).includes('User-Agent'), `${g.dir} user agent is not genome`);
  const certified = stripBridgeEnvelope(seeded);
  const cmp = compareCwlSurfaceToDna(seeded, certified);
  assert(cmp.ok === true, `${g.dir} self-cutover: ${JSON.stringify(cmp.missing_in_dna)}`);
  tip67Seen.set(g.dir, seeded);
  tip67Ok += 1;
}

const year = tip67Seen.get('71-site-year');
if (year) {
  const home = (year.bridge?.annotations || []).find((a) => a.path_template === '/');
  assert(home?.cwl_year_host === true, 'year token is a document fact');
  assert(!JSON.stringify(home).match(/\b20\d{2}\b/), 'Helix does not write a calendar year');
}

const links = tip67Seen.get('72-site-nav-links');
if (links) {
  const home = (links.bridge?.annotations || []).find((a) => a.path_template === '/');
  const ids = (home?.cwl_nav_links || []).map((row) => row.id);
  assert(ids.includes('home') && ids.includes('docs') && ids.includes('contact'), `nav list: ${ids.join(',')}`);
}

const shell = tip67Seen.get('73-site-shell-behavior');
if (shell) {
  const home = (shell.bridge?.annotations || []).find((a) => a.path_template === '/');
  assert(
    JSON.stringify(home?.cwl_device_classes) === JSON.stringify(['mobile', 'desktop']),
    `device classes: ${JSON.stringify(home?.cwl_device_classes)}`,
  );
  assert(home?.cwl_drawer?.nav_id === 'ao-site-nav', 'drawer is the declared toggle');
  const groups = new Set((home?.cwl_nav_links || []).map((row) => row.group));
  assert(groups.has('primary') && groups.has('practice'), `link groups: ${[...groups].join(',')}`);
}

const assets = tip67Seen.get('74-site-assets');
if (assets) {
  const home = (assets.bridge?.annotations || []).find((a) => a.path_template === '/');
  assert(JSON.stringify(home?.cwl_styles) === JSON.stringify(['/agenticops.css']), 'stylesheet URL only');
  assert(home?.cwl_images?.[0]?.id === 'logo' && home.cwl_images[0].path === '/logo.svg', 'image path only');
  assert(home?.cwl_host_firebase?.target === 'agenticops', 'firebase root is a document fact');
  assert(!JSON.stringify(home).includes('ao-layout.js'), 'menu script stays outside the genome');
}

const page = tip67Seen.get('75-site-page');
if (page) {
  const home = (page.bridge?.annotations || []).find((a) => a.path_template === '/');
  const bare = (page.bridge?.annotations || []).find((a) => a.path_template === '/bare');
  assert(JSON.stringify(home?.cwl_scripts) === JSON.stringify(['/site.js']), 'script URL only');
  assert(home?.cwl_forms?.[0]?.action === '/contact' && home.cwl_forms[0].method === 'POST', 'same-site form');
  assert(bare?.cwl_offsite_form === true, 'off-site form action is a hole');
  assert(!home?.cwl_offsite_form, 'home form stays same-site');
}

const sitePath = path.join(cwlRoot, 'fixtures', 'sites', 'agenticop-io', 'site.cwl');
assert(fs.existsSync(sitePath), 'missing agenticop site genome');
const siteSeed = await seedDnaFromCwlFile(sitePath, {
  app_id: 'cutover-agenticop-site',
  mode: 'draft',
  fixture: 'fixtures/sites/agenticop-io/site.cwl',
  cwlRoot,
});
const sitePaths = new Set((siteSeed.routes || []).map((r) => r.path_template));
assert(sitePaths.size >= 26, `site genome pages: ${sitePaths.size}`);
assert(
  (siteSeed.routes || []).every((r) => r.content_class === 'html'),
  'site genome stays page HTML',
);
assert(
  [...sitePaths].every((p) => !/\.(css|svg|js)$/.test(String(p))),
  'site genome host files are not DNA routes',
);
assert(!JSON.stringify(siteSeed.routes).includes('ao-layout.js'), 'site genome does not certify ao-layout.js');
const siteHome = (siteSeed.bridge?.annotations || []).find((a) => a.path_template === '/');
// Tip 1.0.78: live site genome uses literal year + CSS checkbox menu (no year/device/drawer host).
assert(siteHome?.cwl_year === 2026, 'site genome literal year is a document fact');
assert(siteHome?.cwl_year_host == null, 'site genome dropped year host');
assert((siteHome?.cwl_styles || []).includes('/agenticops.css'), 'site genome stylesheet URL');
assert((siteHome?.cwl_styles || []).includes('/fonts.css'), 'site genome owned fonts stylesheet');
assert(siteHome?.cwl_images?.some((img) => img.path === '/logo.svg'), 'site genome image path');
assert(siteHome?.cwl_device_below == null && siteHome?.cwl_drawer == null, 'site genome dropped device/drawer host');
assert(siteHome?.cwl_charset === 'utf-8' && siteHome?.cwl_viewport_device === true, 'site genome charset and viewport meta');
assert(siteHome?.cwl_canonical === 'https://agenticop.io/', 'site genome canonical');
assert(
  String(siteHome?.cwl_meta?.og?.image || '').startsWith('https://'),
  'site genome card image is a URL',
);
assert(!JSON.stringify(siteSeed).includes('matchMedia'), 'site genome does not evaluate a media query');
const siteCertified = stripBridgeEnvelope(siteSeed);
const siteCmp = compareCwlSurfaceToDna(siteSeed, siteCertified);
assert(siteCmp.ok === true, `site genome self-cutover: ${JSON.stringify(siteCmp.missing_in_dna)}`);

if (tip67Ok === tip67Golds.length) {
  console.log('CUTOVER_TIP_1_0_67_OK');
} else if (tip67Ok > 0) {
  console.log(`CUTOVER_TIP_1_0_67_PARTIAL (${tip67Ok}/${tip67Golds.length})`);
}

console.log('=== cutover: tip 1.0.68–1.0.70 (viewport cut / document identity / social card) ===');
const tip70Golds = [
  { dir: '76-site-device-below', minRoutes: 2 },
  { dir: '77-site-document', minRoutes: 2 },
  { dir: '78-site-social', minRoutes: 2 },
];
const tip70Seen = new Map();
let tip70Ok = 0;
for (const g of tip70Golds) {
  const cwlPath = path.join(cwlRoot, 'fixtures', 'language-gold', g.dir, 'routes.cwl');
  assert(fs.existsSync(cwlPath), `missing ${g.dir}`);
  const seeded = await seedDnaFromCwlFile(cwlPath, {
    app_id: `cutover-${g.dir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${g.dir}/routes.cwl`,
    cwlRoot,
  });
  assert((seeded.routes?.length ?? 0) >= g.minRoutes, `${g.dir} route count`);
  assert(seeded.routes.every((r) => r.content_class === 'html'), `${g.dir} stays page HTML`);
  assert(
    seeded.routes.every(
      (r) => r.cwl_title == null && r.cwl_meta == null && r.cwl_device_below == null && r.cwl_canonical == null,
    ),
    `${g.dir} document facts are not DNA route fields`,
  );
  assert(!JSON.stringify(seeded).includes('matchMedia'), `${g.dir} does not evaluate a media query`);
  assert(!JSON.stringify(seeded).includes('javascript:'), `${g.dir} refused URL is not copied`);
  const certified = stripBridgeEnvelope(seeded);
  const cmp = compareCwlSurfaceToDna(seeded, certified);
  assert(cmp.ok === true, `${g.dir} self-cutover: ${JSON.stringify(cmp.missing_in_dna)}`);
  tip70Seen.set(g.dir, seeded);
  tip70Ok += 1;
}

const below = tip70Seen.get('76-site-device-below');
if (below) {
  const home = (below.bridge?.annotations || []).find((a) => a.path_template === '/');
  assert(home?.cwl_device_below === 820, `below: ${home?.cwl_device_below}`);
  assert(
    JSON.stringify(home?.cwl_device_classes) === JSON.stringify(['mobile', 'desktop']),
    'device classes stay the declared tokens',
  );
}

const identity = tip70Seen.get('77-site-document');
if (identity) {
  const home = (identity.bridge?.annotations || []).find((a) => a.path_template === '/');
  const bare = (identity.bridge?.annotations || []).find((a) => a.path_template === '/bare');
  assert(home?.cwl_charset === 'utf-8' && home?.cwl_viewport_device === true, 'charset and viewport meta');
  assert(home?.cwl_title === 'Proof · AgenticOps', `title: ${home?.cwl_title}`);
  assert(home?.cwl_description === 'Recorded traffic decides.', 'description');
  assert(home?.cwl_canonical === 'https://agenticop.io/proof.html', 'canonical URL');
  assert(bare?.cwl_canonical_refused === true && bare?.cwl_canonical == null, 'non-URL canonical is a hole');
}

const social = tip70Seen.get('78-site-social');
if (social) {
  const home = (social.bridge?.annotations || []).find((a) => a.path_template === '/');
  const bare = (social.bridge?.annotations || []).find((a) => a.path_template === '/bare');
  assert(home?.cwl_meta?.robots === 'index, follow', 'robots');
  assert(home?.cwl_meta?.author === 'AgenticOps', 'author');
  assert(home?.cwl_meta?.theme === '#020208', 'theme color');
  assert(home?.cwl_meta?.og?.image === 'https://agenticop.io/logo.svg', 'og image URL');
  assert(home?.cwl_meta?.twitter?.card === 'summary_large_image', 'twitter card');
  assert(
    bare?.cwl_meta_refused?.includes('cwl:meta-theme') &&
      bare?.cwl_meta_refused?.includes('cwl:meta-not-url') &&
      bare?.cwl_meta_refused?.includes('cwl:meta-twitter-card'),
    `refused card: ${JSON.stringify(bare?.cwl_meta_refused)}`,
  );
  assert(bare?.cwl_meta?.theme == null && bare?.cwl_meta?.og?.image == null, 'refused card values are not stored');
  assert(!JSON.stringify(social).includes('tracker'), 'refused twitter card is not copied');
}

if (tip70Ok === tip70Golds.length) {
  console.log('CUTOVER_TIP_1_0_70_OK');
} else if (tip70Ok > 0) {
  console.log(`CUTOVER_TIP_1_0_70_PARTIAL (${tip70Ok}/${tip70Golds.length})`);
}

console.log('=== cutover: tip 1.0.71–1.0.74 (head rest / live document / dynamic HTML / database) ===');
const tip74Golds = [
  { dir: '79-site-head-rest', minRoutes: 2 },
  { dir: '80-live-document', minRoutes: 3 },
  { dir: '81-dynamic-site', minRoutes: 3 },
  { dir: '82-database', minRoutes: 8 },
];
const tip74Seen = new Map();
let tip74Ok = 0;
for (const g of tip74Golds) {
  const cwlPath = path.join(cwlRoot, 'fixtures', 'language-gold', g.dir, 'routes.cwl');
  assert(fs.existsSync(cwlPath), `missing ${g.dir}`);
  const seeded = await seedDnaFromCwlFile(cwlPath, {
    app_id: `cutover-${g.dir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${g.dir}/routes.cwl`,
    cwlRoot,
  });
  assert((seeded.routes?.length ?? 0) >= g.minRoutes, `${g.dir} route count`);
  assert(seeded.routes.every((r) => r.content_class === 'html'), `${g.dir} stays page HTML`);
  assert(
    seeded.routes.every(
      (r) =>
        r.cwl_icons == null &&
        r.cwl_jsonld == null &&
        r.cwl_request_path == null &&
        r.cwl_request_query == null &&
        r.cwl_repeats == null &&
        r.cwl_branches == null &&
        r.cwl_db_engine == null &&
        r.cwl_db_ops == null,
    ),
    `${g.dir} document facts are not DNA route fields`,
  );
  const dumped = JSON.stringify(seeded);
  assert(!dumped.includes('matchMedia'), `${g.dir} does not evaluate a media query`);
  assert(!dumped.includes('javascript:'), `${g.dir} refused URL is not copied`);
  assert(!dumped.includes('</script>'), `${g.dir} JSON-LD that closes the script is not copied`);
  assert(!/\bSELECT\b/.test(dumped) && !dumped.includes('DROP TABLE'), `${g.dir} does not execute SQL text`);
  const certified = stripBridgeEnvelope(seeded);
  const cmp = compareCwlSurfaceToDna(seeded, certified);
  assert(cmp.ok === true, `${g.dir} self-cutover: ${JSON.stringify(cmp.missing_in_dna)}`);
  tip74Seen.set(g.dir, seeded);
  tip74Ok += 1;
}

const headRest = tip74Seen.get('79-site-head-rest');
if (headRest) {
  const home = (headRest.bridge?.annotations || []).find((a) => a.path_template === '/');
  const bare = (headRest.bridge?.annotations || []).find((a) => a.path_template === '/bare');
  assert(home?.cwl_meta?.keywords === 'CWL, WebIR', 'keywords are a document fact');
  assert(home?.cwl_icons?.[0]?.id === 'logo' && home.cwl_icons[0].path === '/logo.svg', 'known icon is copied');
  assert(home?.cwl_icons?.[0]?.apple === true, 'apple touch is copied only when declared');
  assert(home?.cwl_preconnects?.[0]?.href === 'https://fonts.googleapis.com' && home.cwl_preconnects[0].crossorigin === true, 'preconnect URL');
  assert(home?.cwl_alternates?.[0]?.href === 'https://agenticop.io/llms.txt', 'alternate URL');
  assert(
    home?.cwl_page_styles?.[0] === 'https://fonts.googleapis.com/css2?family=Inter&display=swap',
    'page style URL',
  );
  assert(JSON.parse(home?.cwl_jsonld?.[0] || 'null')?.['@context'] === 'https://schema.org', 'JSON-LD text is copied');
  assert(bare?.cwl_icons == null, 'unknown icon is not copied');
  assert(
    bare?.cwl_head_refused?.includes('cwl:unknown-icon') &&
      bare?.cwl_head_refused?.includes('cwl:preconnect-not-url') &&
      bare?.cwl_head_refused?.includes('cwl:alternate-not-url') &&
      bare?.cwl_head_refused?.includes('cwl:jsonld-not-json') &&
      bare?.cwl_head_refused?.includes('cwl:jsonld-closes-script'),
    `refused head: ${JSON.stringify(bare?.cwl_head_refused)}`,
  );
  assert(bare?.cwl_preconnects?.every((link) => String(link.href).startsWith('https://')), 'non-URL preconnect is not copied');
  assert(bare?.cwl_alternates?.every((link) => String(link.href).startsWith('https://')), 'non-URL alternate is not copied');
  assert(
    (bare?.cwl_jsonld || []).every((value) => {
      try {
        JSON.parse(value);
        return !value.includes('</script>');
      } catch {
        return false;
      }
    }),
    'JSON-LD that is not JSON is not copied',
  );
  assert(!bare?.cwl_icons?.some((icon) => icon.apple), 'apple touch is absent when it is not declared');
}

const liveDoc = tip74Seen.get('80-live-document');
if (liveDoc) {
  const hello = (liveDoc.bridge?.annotations || []).find((a) => a.path_template === '/hello');
  const doc = (liveDoc.bridge?.annotations || []).find((a) => a.path_template === '/docs/:slug');
  assert(JSON.stringify(hello?.cwl_request_query) === JSON.stringify(['name']), 'query filled into HTML is that request');
  assert(JSON.stringify(doc?.cwl_request_path) === JSON.stringify(['slug']), 'path filled into HTML is that request');
  assert(hello?.cwl_request_path == null && doc?.cwl_request_query == null, 'only the declared request names are copied');
}

const dynamicSite = tip74Seen.get('81-dynamic-site');
if (dynamicSite) {
  const board = (dynamicSite.bridge?.annotations || []).find((a) => a.path_template === '/board');
  const note = (dynamicSite.bridge?.annotations || []).find((a) => a.path_template === '/notes/:id');
  assert(board?.cwl_repeats?.[0]?.collection === 'notes' && board.cwl_repeats[0].when === 'note.open', 'repeated row is host data');
  assert(board?.cwl_repeats?.[0]?.empty === '<li>No notes</li>', 'empty host data stays document text');
  assert(board?.cwl_repeats?.[1]?.collection === 'note.tags', 'nested row is host data');
  assert(board?.cwl_branches?.[0]?.cond === 'view == "closed"' && board.cwl_branches[0].status === 503, 'branch compares the request');
  assert(note?.cwl_branches?.[0]?.cond === '!note' && note.cwl_branches[0].status === 404, 'branch compares host data');
  assert(JSON.stringify(note?.cwl_request_path) === JSON.stringify(['id']), 'note path is that request');
  const branchText = JSON.stringify(dynamicSite.bridge?.annotations || []);
  assert(!branchText.includes('matchMedia') && !branchText.includes('cookie'), 'a branch is not a media query and not a cookie value');
}

const database = tip74Seen.get('82-database');
if (database) {
  const board = (database.bridge?.annotations || []).find((a) => a.path_template === '/board' && a.method === 'GET');
  const create = (database.bridge?.annotations || []).find((a) => a.path_template === '/notes' && a.method === 'POST');
  const bad = (database.bridge?.annotations || []).find((a) => a.path_template === '/bad');
  const nowhere = (database.bridge?.annotations || []).find((a) => a.path_template === '/nowhere');
  assert(board?.cwl_db_engine === 'sqlite', `engine: ${board?.cwl_db_engine}`);
  assert(
    ['sqlite', 'postgres', 'mysql', 'mariadb', 'sqlserver', 'oracle'].includes(board?.cwl_db_engine),
    'engine is a named document fact',
  );
  const title = (create?.cwl_db_ops || []).find((op) => op.op === 'insert')?.fields?.find((field) => field.column === 'title');
  assert(title?.value?.kind === 'parameter' && title.value.name === 'title', 'a row value is a parameter');
  assert(bad?.cwl_db_refused?.includes('cwl:unknown-db-column') && bad?.cwl_db_ops == null, 'unknown column is a hole and does not run');
  assert(
    nowhere?.cwl_db_refused?.includes('cwl:db-where-required') && nowhere?.cwl_db_ops == null,
    'update without where is a hole and does not run',
  );
  assert(!JSON.stringify(database).includes('DROP'), 'SQL text is not stored');
}

const unknownEnginePath = path.join(os.tmpdir(), `helix-unknown-engine-${process.pid}.cwl`);
fs.writeFileSync(
  unknownEnginePath,
  'module m;\nengine mongo;\n@page GET "/"\npage p {\n  effects: none;\n  return html "<p>no</p>";\n}\n',
);
try {
  const unknown = await seedDnaFromCwlFile(unknownEnginePath, {
    app_id: 'cutover-unknown-engine',
    mode: 'draft',
    fixture: 'unknown-engine.cwl',
    cwlRoot,
  });
  const home = (unknown.bridge?.annotations || []).find((a) => a.path_template === '/');
  assert(home?.cwl_db_engine == null && home?.cwl_db_engine_refused === true, 'an unknown engine is a hole');
  assert(!JSON.stringify(unknown).includes('mongo'), 'an unknown engine name is not copied');
  assert(home?.cwl_db_ops == null, 'an unknown engine does not run');
} finally {
  fs.rmSync(unknownEnginePath, { force: true });
}

if (tip74Ok === tip74Golds.length) {
  console.log('CUTOVER_TIP_1_0_74_OK');
} else if (tip74Ok > 0) {
  console.log(`CUTOVER_TIP_1_0_74_PARTIAL (${tip74Ok}/${tip74Golds.length})`);
}

console.log('=== cutover: tip 1.0.75 (host site emit — year/device host honesty; demo Hosting is not Helix) ===');
{
  const dir = '83-host-site-emit';
  const cwlPath = path.join(cwlRoot, 'fixtures', 'language-gold', dir, 'routes.cwl');
  assert(fs.existsSync(cwlPath), `missing ${dir}`);
  const seeded = await seedDnaFromCwlFile(cwlPath, {
    app_id: `cutover-${dir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${dir}/routes.cwl`,
    cwlRoot,
  });
  assert((seeded.routes?.length ?? 0) >= 3, `${dir} route count`);
  assert(seeded.routes.every((r) => r.content_class === 'html'), `${dir} stays page HTML`);
  assert(
    seeded.routes.every(
      (r) =>
        r.cwl_year_host == null &&
        r.cwl_device_classes == null &&
        r.cwl_device_below == null &&
        r.cwl_styles == null &&
        r.cwl_images == null &&
        r.cwl_host_firebase == null,
    ),
    `${dir} host document facts are not DNA route fields`,
  );
  assert(
    seeded.routes.every((r) => !/\.(css|svg|js)$/.test(String(r.path_template || ''))),
    `${dir} host files are not DNA routes`,
  );
  assert(!JSON.stringify(seeded).includes('matchMedia'), `${dir} does not evaluate a media query`);
  assert(!JSON.stringify(seeded).includes('User-Agent'), `${dir} user agent is not genome`);
  const home = (seeded.bridge?.annotations || []).find((a) => a.path_template === '/');
  assert(home?.cwl_year_host === true, 'year host is a document fact');
  assert(!JSON.stringify(home).match(/\b20\d{2}\b/), 'Helix does not fill the host calendar year');
  assert(
    JSON.stringify(home?.cwl_device_classes) === JSON.stringify(['mobile', 'desktop']),
    `device classes: ${JSON.stringify(home?.cwl_device_classes)}`,
  );
  assert(home?.cwl_device_below === 820, `device below: ${home?.cwl_device_below}`);
  assert(JSON.stringify(home?.cwl_styles) === JSON.stringify(['/agenticops.css']), 'stylesheet URL only');
  assert(home?.cwl_images?.[0]?.id === 'logo' && home.cwl_images[0].path === '/logo.svg', 'image path only');
  assert(home?.cwl_host_firebase?.target === 'agenticop-cwl-demo', 'demo Hosting target is a document fact');
  assert(
    home?.cwl_host_firebase?.target !== 'agenticops' &&
      home?.cwl_host_firebase?.target !== 'agenticop-io',
    'demo Hosting is not live agenticops',
  );
  assert(!JSON.stringify(seeded).includes('firebase deploy'), 'Helix does not deploy Hosting');
  assert(!JSON.stringify(seeded).includes('Cloud Function'), 'host site emit is not a Cloud Function');
  const certified = stripBridgeEnvelope(seeded);
  const cmp = compareCwlSurfaceToDna(seeded, certified);
  assert(cmp.ok === true, `${dir} self-cutover: ${JSON.stringify(cmp.missing_in_dna)}`);
  console.log('CUTOVER_TIP_1_0_75_OK');
}

console.log('=== cutover: tip 1.0.76 (site 100% — host effects and off-site fonts are not Helix) ===');
{
  const dir = '84-site-100-contract';
  const cwlPath = path.join(cwlRoot, 'fixtures', 'language-gold', dir, 'routes.cwl');
  assert(fs.existsSync(cwlPath), `missing ${dir}`);
  const seeded = await seedDnaFromCwlFile(cwlPath, {
    app_id: `cutover-${dir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${dir}/routes.cwl`,
    cwlRoot,
  });
  assert((seeded.routes?.length ?? 0) >= 2, `${dir} route count`);
  assert(seeded.routes.every((r) => r.content_class === 'html'), `${dir} stays page HTML`);
  assert(
    seeded.routes.every(
      (r) =>
        r.cwl_year_host == null &&
        r.cwl_device_classes == null &&
        r.cwl_device_below == null &&
        r.cwl_drawer == null &&
        r.cwl_styles == null &&
        r.cwl_images == null &&
        r.cwl_host_firebase == null,
    ),
    `${dir} host effects are not DNA route fields`,
  );
  assert(!JSON.stringify(seeded).includes('matchMedia'), `${dir} Helix does not evaluate a media query`);
  assert(!JSON.stringify(seeded).includes('User-Agent'), `${dir} user agent is not genome`);
  assert(!JSON.stringify(seeded).includes('firebase deploy'), `${dir} Helix does not deploy Hosting`);
  const home = (seeded.bridge?.annotations || []).find((a) => a.path_template === '/');
  assert(home?.cwl_year_host === true, 'year host effect is a document fact');
  assert(!JSON.stringify(home).match(/\b20\d{2}\b/), 'Helix does not fill the host calendar year');
  assert(
    JSON.stringify(home?.cwl_device_classes) === JSON.stringify(['mobile', 'desktop']),
    `device classes: ${JSON.stringify(home?.cwl_device_classes)}`,
  );
  assert(home?.cwl_device_below === 820, `device below: ${home?.cwl_device_below}`);
  assert(home?.cwl_drawer?.nav_id === 'ao-site-nav', 'drawer host effect is a document fact');
  assert(JSON.stringify(home?.cwl_styles) === JSON.stringify(['/agenticops.css']), 'owned stylesheet URL only');
  assert(home?.cwl_images?.[0]?.path === '/logo.svg', 'owned image path only');
  assert(home?.cwl_host_firebase?.target === 'agenticop-cwl-demo', 'demo Hosting stays a document fact');
  const certified = stripBridgeEnvelope(seeded);
  const cmp = compareCwlSurfaceToDna(seeded, certified);
  assert(cmp.ok === true, `${dir} self-cutover: ${JSON.stringify(cmp.missing_in_dna)}`);

  const sitePath = path.join(cwlRoot, 'fixtures', 'sites', 'agenticop-io', 'site.cwl');
  assert(fs.existsSync(sitePath), 'missing agenticop site genome');
  const siteSeed = await seedDnaFromCwlFile(sitePath, {
    app_id: 'cutover-agenticop-site-100',
    mode: 'draft',
    fixture: 'fixtures/sites/agenticop-io/site.cwl',
    cwlRoot,
  });
  const siteHome = (siteSeed.bridge?.annotations || []).find((a) => a.path_template === '/');
  // Tip 1.0.78 moved the live site genome off year/device/drawer host effects.
  // Gold 84 still proves tip 1.0.76 host effects on its own module.
  assert(siteHome?.cwl_year === 2026, 'site genome literal year (tip 1.0.78)');
  assert(siteHome?.cwl_year_host == null, 'site genome no longer uses year host');
  assert(siteHome?.cwl_drawer == null, 'site genome CSS checkbox menu is not Helix drawer');
  assert(siteHome?.cwl_device_below == null, 'site genome no longer uses device host');
  assert(!JSON.stringify(siteSeed).includes('matchMedia'), 'site genome Helix does not evaluate media queries');
  assert(!JSON.stringify(siteSeed).includes('ao-layout.js'), 'dead menu script stays outside the genome');
  const siteCertified = stripBridgeEnvelope(siteSeed);
  const siteCmp = compareCwlSurfaceToDna(siteSeed, siteCertified);
  assert(siteCmp.ok === true, `site 100 self-cutover: ${JSON.stringify(siteCmp.missing_in_dna)}`);
  console.log('CUTOVER_TIP_1_0_76_OK');
}

console.log('=== cutover: tip 1.0.77 (owned fonts — /fonts.css and face bytes are document facts, not Helix) ===');
{
  const dir = '85-site-owned-fonts';
  const cwlPath = path.join(cwlRoot, 'fixtures', 'language-gold', dir, 'routes.cwl');
  assert(fs.existsSync(cwlPath), `missing ${dir}`);
  const seeded = await seedDnaFromCwlFile(cwlPath, {
    app_id: `cutover-${dir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${dir}/routes.cwl`,
    cwlRoot,
  });
  assert((seeded.routes?.length ?? 0) >= 2, `${dir} route count`);
  assert(seeded.routes.every((r) => r.content_class === 'html'), `${dir} stays page HTML`);
  assert(
    seeded.routes.every(
      (r) =>
        r.cwl_year_host == null &&
        r.cwl_device_classes == null &&
        r.cwl_device_below == null &&
        r.cwl_drawer == null &&
        r.cwl_styles == null &&
        r.cwl_images == null &&
        r.cwl_host_firebase == null,
    ),
    `${dir} host asset facts are not DNA route fields`,
  );
  assert(
    seeded.routes.every((r) => !/\.(css|woff2|svg|js)$/.test(String(r.path_template || ''))),
    `${dir} font CSS and face bytes are not DNA routes`,
  );
  assert(!JSON.stringify(seeded).includes('matchMedia'), `${dir} Helix does not evaluate a media query`);
  assert(!JSON.stringify(seeded).includes('User-Agent'), `${dir} user agent is not genome`);
  assert(!JSON.stringify(seeded).includes('firebase deploy'), `${dir} Helix does not deploy Hosting`);
  assert(!JSON.stringify(seeded).includes('fonts.googleapis.com'), `${dir} no Google Fonts CDN`);
  assert(!JSON.stringify(seeded).includes('fonts.gstatic.com'), `${dir} no gstatic font CDN`);
  const home = (seeded.bridge?.annotations || []).find((a) => a.path_template === '/');
  assert(home?.cwl_year_host === true, 'year host effect is a document fact');
  assert(!JSON.stringify(home).match(/\b20\d{2}\b/), 'Helix does not fill the host calendar year');
  assert(
    JSON.stringify(home?.cwl_device_classes) === JSON.stringify(['mobile', 'desktop']),
    `device classes: ${JSON.stringify(home?.cwl_device_classes)}`,
  );
  assert(home?.cwl_device_below === 820, `device below: ${home?.cwl_device_below}`);
  assert(home?.cwl_drawer?.nav_id === 'ao-site-nav', 'drawer host effect is a document fact');
  assert(
    JSON.stringify(home?.cwl_styles) === JSON.stringify(['/fonts.css', '/agenticops.css']),
    `owned font stylesheet is a document fact: ${JSON.stringify(home?.cwl_styles)}`,
  );
  assert(home?.cwl_images?.[0]?.path === '/logo.svg', 'owned image path only');
  assert(home?.cwl_host_firebase?.target === 'agenticop-cwl-demo', 'demo Hosting stays a document fact');
  const certified = stripBridgeEnvelope(seeded);
  const cmp = compareCwlSurfaceToDna(seeded, certified);
  assert(cmp.ok === true, `${dir} self-cutover: ${JSON.stringify(cmp.missing_in_dna)}`);

  const sitePath = path.join(cwlRoot, 'fixtures', 'sites', 'agenticop-io', 'site.cwl');
  assert(fs.existsSync(sitePath), 'missing agenticop site genome');
  const siteSeed = await seedDnaFromCwlFile(sitePath, {
    app_id: 'cutover-agenticop-owned-fonts',
    mode: 'draft',
    fixture: 'fixtures/sites/agenticop-io/site.cwl',
    cwlRoot,
  });
  const siteHome = (siteSeed.bridge?.annotations || []).find((a) => a.path_template === '/');
  // Tip 1.0.78: site genome still owns /fonts.css; year/device/drawer host effects are gone.
  assert(siteHome?.cwl_year === 2026, 'site genome literal year (tip 1.0.78)');
  assert(siteHome?.cwl_year_host == null, 'site genome no longer uses year host');
  assert(siteHome?.cwl_drawer == null, 'site genome CSS checkbox menu is not Helix drawer');
  assert(siteHome?.cwl_device_below == null, 'site genome no longer uses device host');
  const siteStyles = siteHome?.cwl_styles || [];
  assert(siteStyles.includes('/fonts.css'), `owned /fonts.css document fact: ${siteStyles.join(',')}`);
  assert(siteStyles.includes('/agenticops.css'), 'owned site stylesheet still a document fact');
  assert(
    !JSON.stringify(siteSeed).includes('fonts.googleapis.com') &&
      !JSON.stringify(siteSeed).includes('fonts.gstatic.com'),
    'site genome dropped Google Fonts CDN',
  );
  assert(
    siteSeed.routes.every((r) => !/\.woff2$/.test(String(r.path_template || ''))),
    'font face bytes are not DNA routes',
  );
  assert(!JSON.stringify(siteSeed.routes).includes('fonts.css'), 'font CSS bytes are not DNA routes');
  assert(!JSON.stringify(siteSeed).includes('matchMedia'), 'site genome Helix does not evaluate media queries');
  assert(!JSON.stringify(siteSeed).includes('firebase deploy'), 'live Hosting deploy stays outside Helix');
  assert(!JSON.stringify(siteSeed).includes('ao-layout.js'), 'dead menu script stays outside the genome');
  const siteCertified = stripBridgeEnvelope(siteSeed);
  const siteCmp = compareCwlSurfaceToDna(siteSeed, siteCertified);
  assert(siteCmp.ok === true, `owned fonts self-cutover: ${JSON.stringify(siteCmp.missing_in_dna)}`);
  console.log('CUTOVER_TIP_1_0_77_OK');
}

console.log('=== cutover: tip 1.0.78 (literal year + CSS checkbox menu are document facts, not Helix) ===');
{
  const dir = '86-site-complete';
  const cwlPath = path.join(cwlRoot, 'fixtures', 'language-gold', dir, 'routes.cwl');
  assert(fs.existsSync(cwlPath), `missing ${dir}`);
  const goldSrc = fs.readFileSync(cwlPath, 'utf8');
  assert(/\byear\s+2026\s*;/.test(goldSrc), `${dir} declares literal year 2026`);
  assert(/type=["']checkbox["']/.test(goldSrc) && /ao-nav-open/.test(goldSrc), `${dir} checkbox menu is document HTML`);
  assert(!/\byear\s+host\s*;/.test(goldSrc), `${dir} does not use year host`);
  assert(!/\bdevice\s+host\b/.test(goldSrc), `${dir} does not use device host`);
  assert(!/(?:^|\n)\s*drawer\b/.test(goldSrc), `${dir} does not declare drawer`);
  assert(!/(?:src|href)=["'][^"']*ao-layout\.js/.test(goldSrc), `${dir} does not reference ao-layout.js`);
  const seeded = await seedDnaFromCwlFile(cwlPath, {
    app_id: `cutover-${dir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${dir}/routes.cwl`,
    cwlRoot,
  });
  assert((seeded.routes?.length ?? 0) >= 2, `${dir} route count`);
  assert(seeded.routes.every((r) => r.content_class === 'html'), `${dir} stays page HTML`);
  assert(
    seeded.routes.every(
      (r) =>
        r.cwl_year == null &&
        r.cwl_year_host == null &&
        r.cwl_device_classes == null &&
        r.cwl_device_below == null &&
        r.cwl_drawer == null &&
        r.cwl_styles == null &&
        r.cwl_images == null &&
        r.cwl_host_firebase == null,
    ),
    `${dir} document facts are not DNA route fields`,
  );
  assert(
    seeded.routes.every((r) => !/\.(css|woff2|svg|js)$/.test(String(r.path_template || ''))),
    `${dir} CSS/font/script bytes are not DNA routes`,
  );
  assert(!JSON.stringify(seeded).includes('matchMedia'), `${dir} Helix does not evaluate a media query`);
  assert(!JSON.stringify(seeded).includes('User-Agent'), `${dir} user agent is not genome`);
  assert(!JSON.stringify(seeded).includes('firebase deploy'), `${dir} Helix does not deploy Hosting`);
  assert(!JSON.stringify(seeded).includes('ao-layout.js'), `${dir} menu script stays outside DNA`);
  const home = (seeded.bridge?.annotations || []).find((a) => a.path_template === '/');
  assert(home?.cwl_year === 2026, `literal year is a document fact: ${home?.cwl_year}`);
  assert(home?.cwl_year_host == null, 'complete site does not use year host');
  assert(home?.cwl_drawer == null, 'CSS checkbox menu is document HTML, not Helix drawer');
  assert(home?.cwl_device_classes == null && home?.cwl_device_below == null, 'device host stays off complete site');
  assert(
    JSON.stringify(home?.cwl_styles) === JSON.stringify(['/fonts.css', '/agenticops.css']),
    `owned stylesheets are document facts: ${JSON.stringify(home?.cwl_styles)}`,
  );
  assert(home?.cwl_images?.[0]?.path === '/logo.svg', 'owned image path only');
  assert(home?.cwl_host_firebase?.target === 'agenticop-cwl-demo', 'demo Hosting stays a document fact');
  const certified = stripBridgeEnvelope(seeded);
  const cmp = compareCwlSurfaceToDna(seeded, certified);
  assert(cmp.ok === true, `${dir} self-cutover: ${JSON.stringify(cmp.missing_in_dna)}`);

  const sitePath = path.join(cwlRoot, 'fixtures', 'sites', 'agenticop-io', 'site.cwl');
  assert(fs.existsSync(sitePath), 'missing agenticop site genome');
  const siteSrc = fs.readFileSync(sitePath, 'utf8');
  assert(/\byear\s+2026\s*;/.test(siteSrc), 'site genome declares literal year 2026');
  assert(/type=["']checkbox["']/.test(siteSrc) && /ao-nav-open/.test(siteSrc), 'site checkbox menu is document HTML');
  assert(!/\byear\s+host\s*;/.test(siteSrc), 'site genome dropped year host');
  assert(!/\bdevice\s+host\b/.test(siteSrc), 'site genome dropped device host');
  assert(!/(?:^|\n)\s*drawer\b/.test(siteSrc), 'site genome dropped drawer declaration');
  assert(!/(?:src|href)=["'][^"']*ao-layout\.js/.test(siteSrc), 'site genome does not reference ao-layout.js');
  const siteSeed = await seedDnaFromCwlFile(sitePath, {
    app_id: 'cutover-agenticop-site-complete',
    mode: 'draft',
    fixture: 'fixtures/sites/agenticop-io/site.cwl',
    cwlRoot,
  });
  const siteHome = (siteSeed.bridge?.annotations || []).find((a) => a.path_template === '/');
  assert(siteHome?.cwl_year === 2026, `site literal year document fact: ${siteHome?.cwl_year}`);
  assert(siteHome?.cwl_year_host == null, 'site genome does not use year host');
  assert(siteHome?.cwl_drawer == null, 'site CSS checkbox menu is not Helix drawer');
  assert(siteHome?.cwl_device_classes == null && siteHome?.cwl_device_below == null, 'site genome has no device host');
  const siteStyles = siteHome?.cwl_styles || [];
  assert(siteStyles.includes('/fonts.css'), `owned /fonts.css document fact: ${siteStyles.join(',')}`);
  assert(siteStyles.includes('/agenticops.css'), 'owned site stylesheet still a document fact');
  assert(
    !JSON.stringify(siteSeed).includes('fonts.googleapis.com') &&
      !JSON.stringify(siteSeed).includes('fonts.gstatic.com'),
    'site genome keeps fonts off CDN',
  );
  assert(!JSON.stringify(siteSeed).includes('matchMedia'), 'site genome Helix does not evaluate media queries');
  assert(!JSON.stringify(siteSeed).includes('firebase deploy'), 'live Hosting deploy stays outside Helix');
  assert(!JSON.stringify(siteSeed).includes('ao-layout.js'), 'dead menu script stays outside the genome');
  const siteCertified = stripBridgeEnvelope(siteSeed);
  const siteCmp = compareCwlSurfaceToDna(siteSeed, siteCertified);
  assert(siteCmp.ok === true, `site complete self-cutover: ${JSON.stringify(siteCmp.missing_in_dna)}`);
  console.log('CUTOVER_TIP_1_0_78_OK');
}

console.log('=== cutover: tip 1.0.79 (stream websocket + job.enqueue + UI events are document facts, not Helix) ===');
{
  // Gold 87 — declared duplex stream; residual hole stays; no WS frame invent.
  const wsDir = '87-stream-websocket';
  const wsPath = path.join(cwlRoot, 'fixtures', 'language-gold', wsDir, 'routes.cwl');
  assert(fs.existsSync(wsPath), `missing ${wsDir}`);
  const wsSrc = fs.readFileSync(wsPath, 'utf8');
  assert(/stream\s+websocket\s*;/.test(wsSrc), `${wsDir} declares stream websocket`);
  assert(/hole\s+unsupported:websocket\s*;/.test(wsSrc), `${wsDir} keeps residual unsupported:websocket`);
  const wsSeeded = await seedDnaFromCwlFile(wsPath, {
    app_id: `cutover-${wsDir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${wsDir}/routes.cwl`,
    cwlRoot,
  });
  assert((wsSeeded.routes?.length ?? 0) >= 2, `${wsDir} route count`);
  const wsAnn = (wsSeeded.bridge?.annotations || []).find((a) => a.path_template === '/ws');
  assert(wsAnn?.cwl_stream === 'websocket', `cwl_stream websocket document fact: ${wsAnn?.cwl_stream}`);
  const residualAnn = (wsSeeded.bridge?.annotations || []).find((a) => a.path_template === '/residual');
  assert(
    residualAnn?.cwl_hole_reason === 'unsupported:websocket',
    `residual hole stays: ${residualAnn?.cwl_hole_reason}`,
  );
  assert(!residualAnn?.cwl_stream, 'residual hole is not a declared websocket stream');
  const wsRoute = wsSeeded.routes.find((r) => r.path_template === '/ws');
  assert(wsRoute?.content_class === 'other', 'websocket route content_class other (like SSE)');
  assert(
    wsSeeded.routes.every((r) => r.cwl_stream == null),
    `${wsDir} cwl_stream is annotation-only, not a DNA route field`,
  );
  assert(!JSON.stringify(wsSeeded).includes('WebSocket('), `${wsDir} Helix does not invent a browser WS client`);
  assert(!JSON.stringify(wsSeeded).includes('LiveView'), `${wsDir} Helix does not invent LiveView`);
  const wsCertified = stripBridgeEnvelope(wsSeeded);
  const wsCmp = compareCwlSurfaceToDna(wsSeeded, wsCertified);
  assert(wsCmp.ok === true, `${wsDir} self-cutover: ${JSON.stringify(wsCmp.missing_in_dna)}`);
  assert(
    wsCmp.bridge_annotations?.cwl_stream?.some((a) => a.cwl_stream === 'websocket'),
    'cutover reports websocket stream annotation',
  );

  // Gold 88 — job.enqueue is effect intent; Helix does not own a queue.
  const jobDir = '88-job-enqueue';
  const jobPath = path.join(cwlRoot, 'fixtures', 'language-gold', jobDir, 'routes.cwl');
  assert(fs.existsSync(jobPath), `missing ${jobDir}`);
  const jobSrc = fs.readFileSync(jobPath, 'utf8');
  assert(/job\.enqueue\s+name\s+nightly_digest\s*;/.test(jobSrc), `${jobDir} declares named job.enqueue`);
  assert(/effects:\s*job\.enqueue\s*,/.test(jobSrc), `${jobDir} declares bare job.enqueue`);
  const jobSeeded = await seedDnaFromCwlFile(jobPath, {
    app_id: `cutover-${jobDir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${jobDir}/routes.cwl`,
    cwlRoot,
  });
  assert((jobSeeded.routes?.length ?? 0) >= 2, `${jobDir} route count`);
  const digest = (jobSeeded.bridge?.annotations || []).find((a) => a.path_template === '/digest');
  assert(
    digest?.cwl_effects?.includes('job.enqueue name nightly_digest'),
    `named job.enqueue document fact: ${JSON.stringify(digest?.cwl_effects)}`,
  );
  const fanout = (jobSeeded.bridge?.annotations || []).find((a) => a.path_template === '/fanout');
  assert(
    fanout?.cwl_effects?.includes('job.enqueue') && fanout?.cwl_effects?.includes('rate.limit'),
    `bare job.enqueue + rate.limit: ${JSON.stringify(fanout?.cwl_effects)}`,
  );
  assert(
    jobSeeded.routes.every((r) => !Array.isArray(r.cwl_effects)),
    `${jobDir} job.enqueue is annotation intent, not a DNA route field`,
  );
  assert(!JSON.stringify(jobSeeded).includes('redis'), `${jobDir} Helix does not invent a queue engine`);
  assert(!JSON.stringify(jobSeeded).includes('BullMQ'), `${jobDir} Helix does not invent a worker runtime`);
  const jobCertified = stripBridgeEnvelope(jobSeeded);
  const jobCmp = compareCwlSurfaceToDna(jobSeeded, jobCertified);
  assert(jobCmp.ok === true, `${jobDir} self-cutover: ${JSON.stringify(jobCmp.missing_in_dna)}`);

  // Gold 89 — broader island events are page DNA; no hydration invent.
  const uiDir = '89-ui-event-contracts';
  const uiPath = path.join(cwlRoot, 'fixtures', 'language-gold', uiDir, 'routes.cwl');
  assert(fs.existsSync(uiPath), `missing ${uiDir}`);
  const uiSrc = fs.readFileSync(uiPath, 'utf8');
  assert(/\bon\s+input\s*\{/.test(uiSrc), `${uiDir} declares on input`);
  assert(/\bon\s+focus\s*\{/.test(uiSrc), `${uiDir} declares on focus`);
  assert(/\bon\s+blur\s*\{/.test(uiSrc), `${uiDir} declares on blur`);
  assert(/\bon\s+keydown\s*\{/.test(uiSrc), `${uiDir} declares on keydown`);
  assert(/\bon\s+click\s*\{/.test(uiSrc), `${uiDir} keeps on click`);
  const uiSeeded = await seedDnaFromCwlFile(uiPath, {
    app_id: `cutover-${uiDir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${uiDir}/routes.cwl`,
    cwlRoot,
  });
  assert((uiSeeded.routes?.length ?? 0) >= 1, `${uiDir} route count`);
  assert(uiSeeded.routes.every((r) => r.content_class === 'html'), `${uiDir} stays page HTML`);
  const editor = (uiSeeded.bridge?.annotations || []).find((a) => a.path_template === '/editor');
  assert(editor?.cwl_surface === 'page', 'island events live on a page surface');
  assert(
    uiSeeded.routes.every((r) => r.cwl_surface == null),
    `${uiDir} page/island facts are not DNA route fields`,
  );
  assert(!JSON.stringify(uiSeeded).includes('addEventListener'), `${uiDir} Helix does not invent client listeners`);
  assert(!JSON.stringify(uiSeeded).includes('hydrat'), `${uiDir} Helix does not invent hydration`);
  assert(!JSON.stringify(uiSeeded).includes('react'), `${uiDir} Helix does not invent a client framework`);
  const uiCertified = stripBridgeEnvelope(uiSeeded);
  const uiCmp = compareCwlSurfaceToDna(uiSeeded, uiCertified);
  assert(uiCmp.ok === true, `${uiDir} self-cutover: ${JSON.stringify(uiCmp.missing_in_dna)}`);

  console.log('CUTOVER_TIP_1_0_79_OK');
}

console.log('=== cutover: tip 1.0.80 (verify dispose messaging is document text, not Helix) ===');
{
  const sitePath = path.join(cwlRoot, 'fixtures', 'sites', 'agenticop-io', 'site.cwl');
  assert(fs.existsSync(sitePath), 'missing agenticop site genome');
  const siteSrc = fs.readFileSync(sitePath, 'utf8');
  assert(/tip\s+1\.0\.80/.test(siteSrc) || /1\.0\.80/.test(siteSrc), 'site genome pins tip 1.0.80');
  assert(/verify\s+dispose/i.test(siteSrc), 'site genome leads with verify dispose');
  assert(/No fa[çc]ades/i.test(siteSrc) || /no fa[çc]ades/i.test(siteSrc), 'site genome states no façades');
  assert(!/honest\s+holes/i.test(siteSrc), 'site genome dropped honest-holes slogans');
  const siteSeed = await seedDnaFromCwlFile(sitePath, {
    app_id: 'cutover-agenticop-verify-dispose',
    mode: 'draft',
    fixture: 'fixtures/sites/agenticop-io/site.cwl',
    cwlRoot,
  });
  assert((siteSeed.routes?.length ?? 0) >= 2, 'site genome route count');
  assert(
    siteSeed.routes.every((r) => r.content_class === 'html' || r.content_class === 'other'),
    'site genome routes stay page/other DNA classes',
  );
  const siteHome = (siteSeed.bridge?.annotations || []).find((a) => a.path_template === '/');
  assert(siteHome?.cwl_year === 2026, `literal year remains a document fact: ${siteHome?.cwl_year}`);
  assert(siteHome?.cwl_year_host == null, 'verify-dispose tip does not restore year host');
  assert(siteHome?.cwl_drawer == null, 'verify-dispose tip does not invent Helix drawer');
  const siteStyles = siteHome?.cwl_styles || [];
  assert(siteStyles.includes('/fonts.css'), 'owned /fonts.css still a document fact');
  assert(siteStyles.includes('/agenticops.css'), 'owned site stylesheet still a document fact');
  // Messaging copy must not become DNA route fields or invented protect surface.
  assert(
    siteSeed.routes.every(
      (r) =>
        r.cwl_year == null &&
        r.cwl_styles == null &&
        r.cwl_description == null &&
        r.verify_dispose == null &&
        r.honest_holes == null,
    ),
    'marketing messaging stays annotation/page text, not DNA route fields',
  );
  const seededJson = JSON.stringify(siteSeed);
  assert(!seededJson.includes('honest holes'), 'seed does not reintroduce honest-holes slogans');
  assert(!seededJson.includes('firebase deploy'), 'live Hosting deploy stays outside Helix');
  assert(!seededJson.includes('ao-layout.js'), 'menu script stays outside DNA');
  assert(!seededJson.includes('matchMedia'), 'Helix does not evaluate media queries');
  const siteCertified = stripBridgeEnvelope(siteSeed);
  const siteCmp = compareCwlSurfaceToDna(siteSeed, siteCertified);
  assert(siteCmp.ok === true, `verify-dispose self-cutover: ${JSON.stringify(siteCmp.missing_in_dna)}`);
  console.log('CUTOVER_TIP_1_0_80_OK');
}

console.log('=== cutover: tip 1.0.81 (RFC-0038 framework residuals are holes, not Helix invent) ===');
{
  const frDir = '90-framework-residuals';
  const frPath = path.join(cwlRoot, 'fixtures', 'language-gold', frDir, 'routes.cwl');
  assert(fs.existsSync(frPath), `missing ${frDir}`);
  const frSrc = fs.readFileSync(frPath, 'utf8');
  assert(/hole\s+unsupported:nest-di\s*;/.test(frSrc), `${frDir} catalogues nest-di`);
  assert(/hole\s+unsupported:liveview\s*;/.test(frSrc), `${frDir} catalogues liveview`);
  assert(/hole\s+unsupported:flutter\s*;/.test(frSrc), `${frDir} catalogues flutter`);
  assert(/hole\s+unsupported:middleware-onion\s*;/.test(frSrc), `${frDir} catalogues middleware-onion`);
  assert(/hole\s+unsupported:raw-sql\s*;/.test(frSrc), `${frDir} catalogues raw-sql`);
  assert(/hole\s+unsupported:opaque-script\s*;/.test(frSrc), `${frDir} keeps opaque-script proof`);
  const frSeeded = await seedDnaFromCwlFile(frPath, {
    app_id: `cutover-${frDir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${frDir}/routes.cwl`,
    cwlRoot,
  });
  assert((frSeeded.routes?.length ?? 0) === 6, `${frDir} route count`);
  assert(
    frSeeded.routes.every((r) => r.content_class === 'other'),
    `${frDir} tip seed stays DNA route identity (other), not invented page façades`,
  );
  const expectedHoles = {
    '/nest': 'unsupported:nest-di',
    '/live': 'unsupported:liveview',
    '/flutter': 'unsupported:flutter',
    '/onion': 'unsupported:middleware-onion',
    '/sql': 'unsupported:raw-sql',
    '/script': 'unsupported:opaque-script',
  };
  for (const [pathTemplate, reason] of Object.entries(expectedHoles)) {
    const ann = (frSeeded.bridge?.annotations || []).find((a) => a.path_template === pathTemplate);
    assert(ann?.cwl_hole_reason === reason, `${pathTemplate} hole document fact: ${ann?.cwl_hole_reason}`);
  }
  assert(
    frSeeded.routes.every((r) => r.cwl_hole_reason == null),
    `${frDir} hole reasons stay annotation facts, not DNA route fields`,
  );
  const seededJson = JSON.stringify(frSeeded);
  assert(!/NestFactory|@Injectable|Module\(/.test(seededJson), `${frDir} Helix does not invent Nest DI`);
  assert(!/LiveView|Phoenix\.LiveView/.test(seededJson), `${frDir} Helix does not invent LiveView`);
  assert(!/Flutter|dart:ui|Widget\(/.test(seededJson), `${frDir} Helix does not invent Flutter`);
  assert(!/express\.Router|koa-compose|middleware\.use/.test(seededJson), `${frDir} Helix does not invent onion middleware`);
  assert(!/SELECT\s+\*|CREATE TABLE|sqlite3\.Database/.test(seededJson), `${frDir} Helix does not invent raw SQL engines`);
  const frCertified = stripBridgeEnvelope(frSeeded);
  const frCmp = compareCwlSurfaceToDna(frSeeded, frCertified);
  assert(frCmp.ok === true, `${frDir} self-cutover: ${JSON.stringify(frCmp.missing_in_dna)}`);
  console.log('CUTOVER_TIP_1_0_81_OK');
}

console.log('=== cutover: tip 1.0.82 (RFC-0039 DNA identity is document facts, not Helix invent) ===');
{
  const idDir = '91-dna-identity';
  const idPath = path.join(cwlRoot, 'fixtures', 'language-gold', idDir, 'routes.cwl');
  assert(fs.existsSync(idPath), `missing ${idDir}`);
  const idSrc = fs.readFileSync(idPath, 'utf8');
  assert(/replaces\s+"https:\/\/legacy\.example\/invoice\.php"\s*;/.test(idSrc), `${idDir} declares replaces`);
  assert(/from\s+peel\s+"php"\s+at\s+"legacy\/invoice\.php"\s*;/.test(idSrc), `${idDir} declares from peel`);
  assert(/capability\s+cookies\s*;/.test(idSrc), `${idDir} declares capability cookies`);
  assert(/works\s+without\s+client\s*;/.test(idSrc), `${idDir} declares works without client`);
  assert(/hole\s+cwl:replaces-not-url\s*;/.test(idSrc), `${idDir} catalogues replaces-not-url`);
  assert(/hole\s+cwl:peel-not-identity\s*;/.test(idSrc), `${idDir} catalogues peel-not-identity`);
  assert(/hole\s+cwl:unknown-capability\s*;/.test(idSrc), `${idDir} catalogues unknown-capability`);
  const idSeeded = await seedDnaFromCwlFile(idPath, {
    app_id: `cutover-${idDir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${idDir}/routes.cwl`,
    cwlRoot,
  });
  assert((idSeeded.routes?.length ?? 0) === 5, `${idDir} route count`);
  const invoice = (idSeeded.bridge?.annotations || []).find((a) => a.path_template === '/invoice');
  assert(invoice?.cwl_replaces === 'https://legacy.example/invoice.php', `${idDir} replaces document fact`);
  assert(
    invoice?.cwl_from_peel?.stack === 'php' && invoice?.cwl_from_peel?.at === 'legacy/invoice.php',
    `${idDir} from peel document fact`,
  );
  assert(
    Array.isArray(invoice?.cwl_capabilities) &&
      invoice.cwl_capabilities.includes('cookies') &&
      invoice.cwl_capabilities.includes('network-same-origin'),
    `${idDir} capability document facts`,
  );
  assert(invoice?.cwl_works_without_client === true, `${idDir} works without client document fact`);
  const api = (idSeeded.bridge?.annotations || []).find((a) => a.path_template === '/api/invoice');
  assert(api?.cwl_replaces === '/legacy/api/invoice', `${idDir} api replaces document fact`);
  assert(
    api?.cwl_from_peel?.stack === 'express' && api?.cwl_from_peel?.at === 'routes/invoice.js',
    `${idDir} api from peel document fact`,
  );
  assert(
    Array.isArray(api?.cwl_capabilities) && api.cwl_capabilities.includes('network-same-origin'),
    `${idDir} api capability document fact`,
  );
  assert(api?.cwl_works_without_client == null, `${idDir} api has no progressive certificate`);
  const expectedHoles = {
    '/refuse-replace': 'cwl:replaces-not-url',
    '/refuse-peel': 'cwl:peel-not-identity',
    '/refuse-cap': 'cwl:unknown-capability',
  };
  for (const [pathTemplate, reason] of Object.entries(expectedHoles)) {
    const ann = (idSeeded.bridge?.annotations || []).find((a) => a.path_template === pathTemplate);
    assert(ann?.cwl_hole_reason === reason, `${pathTemplate} hole document fact: ${ann?.cwl_hole_reason}`);
  }
  assert(
    idSeeded.routes.every(
      (r) =>
        r.cwl_replaces == null &&
        r.cwl_from_peel == null &&
        r.cwl_capabilities == null &&
        r.cwl_works_without_client == null &&
        r.cwl_hole_reason == null,
    ),
    `${idDir} identity facts stay annotations, not DNA route fields`,
  );
  const seededJson = JSON.stringify(idSeeded);
  assert(!/Permissions-Policy|Feature-Policy|navigator\.permissions/.test(seededJson), `${idDir} Helix does not invent capability browser`);
  assert(!/php-fpm|express\(\)|createServer|migration engine/.test(seededJson), `${idDir} Helix does not invent peel runtimes`);
  assert(!/serviceWorker|hydrat|island runtime/.test(seededJson), `${idDir} Helix does not invent client certificate engine`);
  const idCertified = stripBridgeEnvelope(idSeeded);
  const idCmp = compareCwlSurfaceToDna(idSeeded, idCertified);
  assert(idCmp.ok === true, `${idDir} self-cutover: ${JSON.stringify(idCmp.missing_in_dna)}`);
  console.log('CUTOVER_TIP_1_0_82_OK');
}

console.log('=== cutover: tip 1.0.83 (RFC-0040 asset integrity is document facts, not Helix invent) ===');
{
  const aiDir = '92-asset-integrity';
  const aiPath = path.join(cwlRoot, 'fixtures', 'language-gold', aiDir, 'routes.cwl');
  assert(fs.existsSync(aiPath), `missing ${aiDir}`);
  const aiSrc = fs.readFileSync(aiPath, 'utf8');
  assert(/style\s+"\/app\.css"\s+integrity\s+"sha384-/.test(aiSrc), `${aiDir} declares style integrity`);
  assert(/script\s+"\/site\.js"\s+integrity\s+"sha384-/.test(aiSrc), `${aiDir} declares script integrity`);
  assert(/script\s+"\/editor\.mjs"\s+module\s+integrity\s+"sha384-/.test(aiSrc), `${aiDir} declares module script`);
  assert(/style\s+"\/page\.css"\s+integrity\s+"sha256-/.test(aiSrc), `${aiDir} declares page style integrity`);
  assert(/hole\s+cwl:bad-integrity\s*;/.test(aiSrc), `${aiDir} catalogues bad-integrity`);
  assert(/hole\s+cwl:bad-asset-url\s*;/.test(aiSrc), `${aiDir} catalogues bad-asset-url`);
  assert(/hole\s+cwl:bad-asset-tail\s*;/.test(aiSrc), `${aiDir} catalogues bad-asset-tail`);
  const aiSeeded = await seedDnaFromCwlFile(aiPath, {
    app_id: `cutover-${aiDir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${aiDir}/routes.cwl`,
    cwlRoot,
  });
  assert((aiSeeded.routes?.length ?? 0) === 3, `${aiDir} route count`);
  const editor = (aiSeeded.bridge?.annotations || []).find((a) => a.path_template === '/editor');
  assert(
    Array.isArray(editor?.cwl_styles) &&
      editor.cwl_styles[0]?.href === '/app.css' &&
      typeof editor.cwl_styles[0]?.integrity === 'string' &&
      editor.cwl_styles[0]?.crossorigin === true,
    `${aiDir} layout style integrity document fact`,
  );
  assert(
    Array.isArray(editor?.cwl_scripts) &&
      editor.cwl_scripts.some(
        (s) => s?.src === '/site.js' && typeof s.integrity === 'string' && s.crossorigin === true,
      ) &&
      editor.cwl_scripts.some(
        (s) => s?.src === '/editor.mjs' && s.module === true && typeof s.integrity === 'string',
      ),
    `${aiDir} layout script integrity / module document facts`,
  );
  assert(
    Array.isArray(editor?.cwl_page_styles) &&
      editor.cwl_page_styles[0]?.href === '/page.css' &&
      typeof editor.cwl_page_styles[0]?.integrity === 'string',
    `${aiDir} page style integrity document fact`,
  );
  const refuse = (aiSeeded.bridge?.annotations || []).find((a) => a.path_template === '/refuse');
  assert(
    Array.isArray(refuse?.cwl_layout_holes) &&
      refuse.cwl_layout_holes.includes('cwl:bad-integrity') &&
      refuse.cwl_layout_holes.includes('cwl:bad-asset-url') &&
      refuse.cwl_layout_holes.includes('cwl:bad-asset-tail'),
    `${aiDir} refuse layout holes are document facts`,
  );
  assert(
    aiSeeded.routes.every(
      (r) =>
        r.cwl_styles == null &&
        r.cwl_scripts == null &&
        r.cwl_page_styles == null &&
        r.cwl_layout_holes == null &&
        r.integrity == null,
    ),
    `${aiDir} asset integrity facts stay annotations, not DNA route fields`,
  );
  const seededJson = JSON.stringify(aiSeeded);
  assert(!/Subresource Integrity|sri-check|crypto\.subtle\.digest/.test(seededJson), `${aiDir} Helix does not invent SRI verifier`);
  assert(!/new Function\(|eval\(|vm\.runIn/.test(seededJson), `${aiDir} Helix does not invent JS runtime`);
  assert(!/NestFactory|LiveView|Flutter|dart:ui/.test(seededJson), `${aiDir} Helix does not invent Nest/LiveView/Flutter`);
  const aiCertified = stripBridgeEnvelope(aiSeeded);
  const aiCmp = compareCwlSurfaceToDna(aiSeeded, aiCertified);
  assert(aiCmp.ok === true, `${aiDir} self-cutover: ${JSON.stringify(aiCmp.missing_in_dna)}`);
  console.log('CUTOVER_TIP_1_0_83_OK');
}

console.log('=== cutover: tip 1.0.84 (RFC-0041 page form multipart is document facts, not Helix invent) ===');
{
  const pfDir = '93-page-form-multipart';
  const pfPath = path.join(cwlRoot, 'fixtures', 'language-gold', pfDir, 'routes.cwl');
  assert(fs.existsSync(pfPath), `missing ${pfDir}`);
  const pfSrc = fs.readFileSync(pfPath, 'utf8');
  assert(/form\s+upload\s+method\s+post\s+action\s+"\/upload"\s+enctype\s+multipart\s*;/.test(pfSrc), `${pfDir} declares enctype multipart`);
  assert(/field\s+resume\s+"file"\s*;/.test(pfSrc), `${pfDir} declares file field`);
  assert(/hole\s+cwl:file-needs-multipart\s*;/.test(pfSrc), `${pfDir} catalogues file-needs-multipart`);
  assert(/hole\s+cwl:multipart-not-get\s*;/.test(pfSrc), `${pfDir} catalogues multipart-not-get`);
  const pfSeeded = await seedDnaFromCwlFile(pfPath, {
    app_id: `cutover-${pfDir}`,
    mode: 'draft',
    fixture: `fixtures/language-gold/${pfDir}/routes.cwl`,
    cwlRoot,
  });
  assert((pfSeeded.routes?.length ?? 0) === 3, `${pfDir} route count`);
  const uploadPage = (pfSeeded.bridge?.annotations || []).find((a) => a.path_template === '/upload' && a.method === 'GET');
  assert(
    Array.isArray(uploadPage?.cwl_forms) &&
      uploadPage.cwl_forms[0]?.action === '/upload' &&
      uploadPage.cwl_forms[0]?.method === 'POST' &&
      uploadPage.cwl_forms[0]?.enctype === 'multipart' &&
      Array.isArray(uploadPage.cwl_forms[0]?.fields) &&
      uploadPage.cwl_forms[0].fields.some((f) => f?.name === 'resume' && f?.type === 'file') &&
      uploadPage.cwl_forms[0].fields.some((f) => f?.name === 'note' && f?.type === 'text'),
    `${pfDir} page form multipart / file field document facts`,
  );
  const refuse = (pfSeeded.bridge?.annotations || []).find((a) => a.path_template === '/refuse');
  assert(
    Array.isArray(refuse?.cwl_layout_holes) &&
      refuse.cwl_layout_holes.includes('cwl:file-needs-multipart') &&
      refuse.cwl_layout_holes.includes('cwl:multipart-not-get'),
    `${pfDir} refuse form multipart holes are document facts`,
  );
  assert(
    pfSeeded.routes.every(
      (r) =>
        r.cwl_forms == null &&
        r.enctype == null &&
        r.cwl_layout_holes == null,
    ),
    `${pfDir} page form multipart facts stay annotations, not DNA route fields`,
  );
  const seededJson = JSON.stringify(pfSeeded);
  assert(!/multer|busboy|formidable|multipart middleware|upload middleware/.test(seededJson), `${pfDir} Helix does not invent upload middleware`);
  assert(!/virus.?scan|S3\.putObject|storage\.bucket/.test(seededJson), `${pfDir} Helix does not invent transfer\/storage`);
  assert(!/NestFactory|LiveView|Flutter|dart:ui/.test(seededJson), `${pfDir} Helix does not invent Nest/LiveView/Flutter`);
  const pfCertified = stripBridgeEnvelope(pfSeeded);
  const pfCmp = compareCwlSurfaceToDna(pfSeeded, pfCertified);
  assert(pfCmp.ok === true, `${pfDir} self-cutover: ${JSON.stringify(pfCmp.missing_in_dna)}`);
  console.log('CUTOVER_TIP_1_0_84_OK');
}

console.log('CUTOVER_SMOKE_OK');
