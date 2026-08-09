/**
 * CWL ↔ app-dna-v1 bridge (RFC-0022).
 * Consumes chrysalis-cwl parser — does not fork CWL grammar.
 * @see engines/chrysalis-cwl/docs/language/CWL-RFC-0022-dna-surface-bridge.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { routeKey, responseKeyFingerprint } from '../dna-core/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const requireFromHere = createRequire(import.meta.url);

/** Published GH Packages name, then local `file:` alias. */
const CWL_PKG_NAMES = ['@agenticop-io/cwl', '@chrysalis/cwl'];

/**
 * Resolve chrysalis-cwl pillar root (fixtures + hub-ingest seed).
 * Registry package alone is not enough for golds — sibling / CHRYSALIS_CWL_ROOT / file: pin.
 * @param {string} [override]
 */
export function resolveCwlRoot(override) {
  if (override) return path.resolve(override);
  if (process.env.CHRYSALIS_CWL_ROOT) return path.resolve(process.env.CHRYSALIS_CWL_ROOT);

  for (const name of CWL_PKG_NAMES) {
    try {
      const pkgJson = requireFromHere.resolve(`${name}/package.json`);
      const pkgDir = path.dirname(pkgJson);
      // file: packages/cwl → pillar; registry node_modules path usually is not a pillar
      const fromPin = path.resolve(pkgDir, '../..');
      if (
        fs.existsSync(path.join(fromPin, 'LANGUAGE_VERSION.md')) ||
        fs.existsSync(path.join(fromPin, 'scripts', 'hub-ingest', 'cwl-parser.mjs'))
      ) {
        return fromPin;
      }
    } catch {
      /* try next */
    }
  }

  const sibling = path.resolve(HERE, '../../../chrysalis-cwl');
  if (
    fs.existsSync(path.join(sibling, 'LANGUAGE_VERSION.md')) ||
    fs.existsSync(path.join(sibling, 'scripts', 'hub-ingest', 'cwl-parser.mjs'))
  ) {
    return sibling;
  }
  throw new Error(
    'chrysalis-cwl pillar not found — set CHRYSALIS_CWL_ROOT, keep engines/chrysalis-cwl sibling, or optional file: @chrysalis/cwl (registry @agenticop-io/cwl@1.0.0 is language surface only)',
  );
}

/**
 * Load parseCwlModule via published/package subpath (1.0+) else pillar staged/hub path.
 * @param {string} [cwlRoot]
 */
export async function loadCwlParser(cwlRoot) {
  if (!cwlRoot && !process.env.CHRYSALIS_CWL_ROOT) {
    for (const name of CWL_PKG_NAMES) {
      try {
        return await import(`${name}/parser`);
      } catch {
        /* try next */
      }
    }
  }
  const root = resolveCwlRoot(cwlRoot);
  const staged = path.join(root, 'packages', 'cwl', 'lib', 'cwl-parser.mjs');
  const hub = path.join(root, 'scripts', 'hub-ingest', 'cwl-parser.mjs');
  const parserPath = fs.existsSync(staged) ? staged : hub;
  if (!fs.existsSync(parserPath)) {
    throw new Error(`CWL parser not found under ${root}`);
  }
  return import(pathToFileUrl(parserPath));
}

/**
 * Language version from pinned package (or LANGUAGE_VERSION.md).
 * @param {string} [cwlRoot]
 */
export async function readCwlLanguageVersion(cwlRoot) {
  for (const name of CWL_PKG_NAMES) {
    try {
      const mod = await import(name);
      return mod.languageVersion?.() || mod.VERSION;
    } catch {
      /* try next */
    }
  }
  const root = resolveCwlRoot(cwlRoot);
  const md = fs.readFileSync(path.join(root, 'LANGUAGE_VERSION.md'), 'utf8');
  const m = md.match(/\|\s*\*\*Version\*\*\s*\|\s*`([^`]+)`/);
  return m ? m[1] : null;
}

/**
 * Which npm package name resolved for the language surface.
 */
export function resolveCwlPackageName() {
  for (const name of CWL_PKG_NAMES) {
    try {
      requireFromHere.resolve(`${name}/package.json`);
      return name;
    } catch {
      /* try next */
    }
  }
  return null;
}

function pathToFileUrl(p) {
  const resolved = path.resolve(p);
  const u = new URL('file:///');
  u.pathname = resolved.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/$1:');
  return u.href;
}

/**
 * Segment-shape equality: `:param` aligns with `:id` or any named param; statics exact.
 * @param {string} a
 * @param {string} b
 */
export function pathTemplateShapeEqual(a, b) {
  const left = String(a || '/');
  const right = String(b || '/');
  if (left === right) return true;
  const seg = (p) => {
    const parts = String(p).split('/');
    if (parts[0] === '') parts.shift();
    return parts;
  };
  const sa = seg(left);
  const sb = seg(right);
  if (sa.length !== sb.length) return false;
  for (let i = 0; i < sa.length; i++) {
    const x = sa[i];
    const y = sb[i];
    if (x.startsWith(':') && y.startsWith(':')) continue;
    if (x !== y) return false;
  }
  return true;
}

/**
 * @param {object} body — CWL handler body AST
 * @param {"api"|"page"} surfaceKind
 */
export function contentClassFromCwlBody(body, surfaceKind) {
  if (surfaceKind === 'page') return 'html';
  if (!body || typeof body !== 'object') return 'other';
  if (body.kind === 'html' || body.kind === 'ui') return 'html';
  if (body.kind === 'object') return 'json';
  if (body.kind === 'literal' && body.value && typeof body.value === 'object' && !Array.isArray(body.value)) {
    return 'json';
  }
  return 'other';
}

/**
 * @param {object} body
 */
export function fingerprintFromCwlBody(body) {
  if (!body || typeof body !== 'object') return null;
  if (body.kind === 'object' && Array.isArray(body.entries)) {
    return body.entries.map((e) => e.key).sort().join(',');
  }
  if (body.kind === 'literal' && body.value && typeof body.value === 'object' && !Array.isArray(body.value)) {
    return responseKeyFingerprint(body.value);
  }
  return null;
}

/**
 * Map parsed CWL module → draft DNA + bridge envelope (RFC-0022).
 * Bridge stays outside certified certificate body (schema additionalProperties: false).
 *
 * @param {{ moduleName?: string, file?: string, routes?: object[] }} parsed
 * @param {{
 *   app_id?: string,
 *   host?: string,
 *   created_at?: string,
 *   mode?: 'draft'|'certified',
 *   fixture?: string,
 *   rfc?: string,
 * }} [opts]
 */
export function cwlSurfaceToDraftDna(parsed, opts = {}) {
  const host = opts.host || 'default';
  const routes = [];
  const annotations = [];

  for (const r of parsed.routes || []) {
    const method = String(r.method || 'GET').toUpperCase();
    const path_template = String(r.path || '/');
    const surfaceKind = r.surfaceKind === 'page' ? 'page' : 'api';
    const content_class = contentClassFromCwlBody(r.body, surfaceKind);
    const fp =
      content_class === 'json' ? fingerprintFromCwlBody(r.body) : null;
    let status_classes = [];
    if (r.responseStatus != null) {
      status_classes = [Math.floor(Number(r.responseStatus) / 100) * 100];
    }

    routes.push({
      host,
      method,
      path_template,
      content_class,
      status_classes,
      response_key_fingerprint: content_class === 'json' ? fp : null,
    });

    const effects = Array.isArray(r.effects) ? [...r.effects] : [];
    annotations.push({
      method,
      path_template,
      cwl_surface: surfaceKind === 'page' ? 'page' : 'route',
      cwl_effects: effects,
    });
  }

  routes.sort((a, b) => routeKey(a).localeCompare(routeKey(b)));
  annotations.sort((a, b) =>
    `${a.method} ${a.path_template}`.localeCompare(`${b.method} ${b.path_template}`),
  );

  return {
    schema: 'app-dna-v1',
    app_id: opts.app_id || parsed.moduleName || 'cwl-seed',
    created_at: opts.created_at || new Date().toISOString(),
    mode: opts.mode || 'draft',
    parent_hash: null,
    routes,
    holes: [],
    bridge: {
      kind: 'cwl-surface-seed',
      module: parsed.moduleName || 'main',
      fixture: opts.fixture || parsed.file || null,
      rfc: opts.rfc || '0022',
      identity_key: '`${host} ${METHOD} ${path_template}`',
      annotations,
    },
  };
}

/**
 * Drop bridge envelope for schema-valid / certify / sign.
 * @param {object} seed
 */
export function stripBridgeEnvelope(seed) {
  if (!seed || typeof seed !== 'object') return seed;
  const { bridge: _b, ...dna } = seed;
  return dna;
}

/**
 * Load RFC-0023 deploy profile (cwl-deploy-profile-v1) if present.
 * @param {string} profilePath
 * @returns {object|null}
 */
export function loadDeployProfile(profilePath) {
  if (!profilePath || !fs.existsSync(profilePath)) return null;
  const p = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  if (p?.schema !== 'cwl-deploy-profile-v1') {
    throw new Error(`Expected schema cwl-deploy-profile-v1, got ${p?.schema}`);
  }
  return p;
}

/**
 * Resolve deploy profile beside a CWL fixture or via explicit path / CHRYSALIS_DEPLOY_PROFILE.
 * @param {string} cwlPath
 * @param {string} [explicit]
 */
export function resolveDeployProfilePath(cwlPath, explicit) {
  if (explicit) return path.resolve(explicit);
  if (process.env.CHRYSALIS_DEPLOY_PROFILE) return path.resolve(process.env.CHRYSALIS_DEPLOY_PROFILE);
  const beside = path.join(path.dirname(path.resolve(cwlPath)), 'deploy-profile.json');
  if (fs.existsSync(beside)) return beside;
  return null;
}

/**
 * Parse a .cwl file via chrysalis-cwl and seed draft DNA.
 * Prefers the language-pillar seeder (`cwl-dna-seed.mjs`) when present — no mapping fork.
 * Applies RFC-0023 deploy profile for host/app_id when found.
 * @param {string} cwlPath
 * @param {object} [opts]
 */
export async function seedDnaFromCwlFile(cwlPath, opts = {}) {
  const root = resolveCwlRoot(opts.cwlRoot);
  const profilePath = resolveDeployProfilePath(cwlPath, opts.deployProfile);
  const profile = profilePath ? loadDeployProfile(profilePath) : null;
  const merged = {
    ...opts,
    app_id: opts.app_id || profile?.app_id,
    host: opts.host || profile?.host || 'default',
    deployProfilePath: profilePath,
  };

  const seedMod = path.join(root, 'scripts', 'hub-ingest', 'cwl-dna-seed.mjs');
  let seeded;
  if (fs.existsSync(seedMod)) {
    const { seedDraftDnaFromCwlPath } = await import(pathToFileUrl(seedMod));
    seeded = seedDraftDnaFromCwlPath(cwlPath, {
      app_id: merged.app_id,
      host: merged.host,
      created_at: opts.created_at,
      fixture: opts.fixture,
    });
  } else {
    const { parseCwlModule } = await loadCwlParser(opts.cwlRoot);
    const abs = path.resolve(cwlPath);
    const source = fs.readFileSync(abs, 'utf8');
    const parsed = parseCwlModule(source, path.basename(abs));
    seeded = cwlSurfaceToDraftDna(parsed, {
      ...merged,
      fixture: opts.fixture || abs,
    });
  }

  if (profile && seeded?.bridge && typeof seeded.bridge === 'object') {
    seeded.bridge.deploy_profile = {
      schema: profile.schema,
      path: profilePath,
      host: profile.host,
      rfc: '0023',
    };
    if (profile.rfc) seeded.bridge.rfc = `0022+0023`;
  }
  return seeded;
}

/**
 * Identity compare: does every CWL surface route appear in DNA (shape match)?
 * Host: if CWL host is "default" or opts.ignoreHost, match on method+path only.
 *
 * @param {{ routes?: object[] }} cwlDnaOrSeed — from cwlSurfaceToDraftDna
 * @param {{ routes?: object[] }} liveDna
 * @param {{ ignoreHost?: boolean }} [opts]
 */
export function compareCwlSurfaceToDna(cwlDnaOrSeed, liveDna, opts = {}) {
  const profile = opts.deployProfile || null;
  const pathShape = profile?.path_shape_equality !== false;
  const ignoreHost =
    opts.ignoreHost !== undefined
      ? opts.ignoreHost !== false
      : true; // authoring-time CWL default; profile.host is for seed, not strict host match
  const cwlRoutes = cwlDnaOrSeed?.routes || [];
  const liveRoutes = liveDna?.routes || [];

  const matched = [];
  const missing_in_dna = [];
  const extra_notes = [];

  for (const c of cwlRoutes) {
    const method = String(c.method || 'GET').toUpperCase();
    const hit = liveRoutes.find((l) => {
      if (String(l.method || '').toUpperCase() !== method) return false;
      const pathOk = pathShape
        ? pathTemplateShapeEqual(c.path_template, l.path_template)
        : String(c.path_template) === String(l.path_template);
      if (!pathOk) return false;
      if (ignoreHost) return true;
      return String(l.host || 'default') === String(c.host || 'default');
    });
    if (hit) {
      matched.push({
        cwl: `${method} ${c.path_template}`,
        dna: routeKey(hit),
      });
    } else {
      missing_in_dna.push({
        method,
        path_template: c.path_template,
        host: c.host || 'default',
      });
    }
  }

  // Optional: DNA routes with no CWL counterpart (not a cutover fail by default)
  for (const l of liveRoutes) {
    const method = String(l.method || 'GET').toUpperCase();
    const hit = cwlRoutes.find((c) => {
      if (String(c.method || '').toUpperCase() !== method) return false;
      return pathShape
        ? pathTemplateShapeEqual(c.path_template, l.path_template)
        : String(c.path_template) === String(l.path_template);
    });
    if (!hit) {
      extra_notes.push({
        method,
        path_template: l.path_template,
        host: l.host || 'default',
        note: 'in DNA, not in CWL surface',
      });
    }
  }

  return {
    ok: missing_in_dna.length === 0,
    matched,
    missing_in_dna,
    in_dna_not_cwl: extra_notes,
    deploy_profile: profile
      ? { schema: profile.schema, host: profile.host, path_shape_equality: pathShape }
      : null,
    cutover: missing_in_dna.length === 0
      ? 'cwl_surface_subseteq_dna'
      : 'cwl_surface_not_covered',
  };
}
