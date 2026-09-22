#!/usr/bin/env node
/**
 * Platform cutover E2E: CWL gold → draft DNA → strip → promote(+HMAC) →
 * compareCwlSurfaceToDna → scoreRequest allow/deny in enforce.
 * Also proves RFC-0023 multi-host (host=api) + dna_gaps fill + enforce host identity.
 * Tokens: CUTOVER_MULTIHOST_OK · CUTOVER_SMOKE_OK
 * Requires sibling engines/chrysalis-cwl (or CHRYSALIS_CWL_ROOT) + @agenticop-io/cwl@1.0.21.
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
  buildUpstreamTargetsReport,
  loadCwlHoleLookup,
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

console.log('CUTOVER_SMOKE_OK');
