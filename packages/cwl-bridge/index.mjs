/**
 * CWL ↔ app-dna-v1 bridge (RFC-0022 / 0023).
 * Seed / profile / holes-report / path-shape SoR: `@agenticop-io/cwl/dna-seed` (CWL 1.0.3+; tip 1.0.21).
 * Helix owns strip / compare / dna_gaps fill / enforce — does not fork grammar.
 * @see engines/chrysalis-cwl/docs/language/CWL-RFC-0022-dna-surface-bridge.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  pathTemplateShapeEqual as cwlPathTemplateShapeEqual,
} from '@agenticop-io/cwl/dna-seed';
import { routeKey } from '../dna-core/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const requireFromHere = createRequire(import.meta.url);

/** Published GH Packages name, then local `file:` alias. */
const CWL_PKG_NAMES = ['@agenticop-io/cwl', '@chrysalis/cwl'];

function pathToFileUrl(p) {
  const resolved = path.resolve(p);
  const u = new URL('file:///');
  u.pathname = resolved.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/$1:');
  return u.href;
}

/**
 * Resolve chrysalis-cwl pillar root (fixtures).
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
    'chrysalis-cwl pillar not found — set CHRYSALIS_CWL_ROOT, keep engines/chrysalis-cwl sibling, or optional file: @chrysalis/cwl',
  );
}

/**
 * Load `@…/cwl/dna-seed` (1.0.3+) — single SoR for surface→DNA mapping.
 */
export async function loadCwlDnaSeed() {
  for (const name of CWL_PKG_NAMES) {
    try {
      return await import(`${name}/dna-seed`);
    } catch {
      /* try next */
    }
  }
  // Pillar checkout without package install (CI edge)
  try {
    const root = resolveCwlRoot();
    const staged = path.join(root, 'packages', 'cwl', 'lib', 'cwl-dna-seed.mjs');
    const hub = path.join(root, 'scripts', 'hub-ingest', 'cwl-dna-seed.mjs');
    const p = fs.existsSync(staged) ? staged : hub;
    if (fs.existsSync(p)) return import(pathToFileUrl(p));
  } catch {
    /* fall through */
  }
  throw new Error(
    'CWL dna-seed not found — npm i @agenticop-io/cwl@1.0.21 (or sibling file: pin with dna-seed export)',
  );
}

/**
 * Load parseCwlModule via package subpath else pillar.
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

/**
 * RFC-0022 path-shape equality — thin wrap of CWL dna-seed SoR (no local fork).
 * @param {unknown} a
 * @param {unknown} b
 */
export function pathTemplateShapeEqual(a, b) {
  return cwlPathTemplateShapeEqual(a, b);
}

/**
 * Drop bridge envelope for schema-valid / certify / sign.
 */
export function stripBridgeEnvelope(seed) {
  if (!seed || typeof seed !== 'object') return seed;
  const { bridge: _b, ...dna } = seed;
  return dna;
}

/**
 * Resolve deploy profile beside a CWL fixture or via explicit path / env.
 * @param {string} cwlPath
 * @param {string} [explicit]
 */
export function resolveDeployProfilePath(cwlPath, explicit) {
  if (explicit) return path.resolve(explicit);
  if (process.env.CHRYSALIS_DEPLOY_PROFILE) {
    return path.resolve(process.env.CHRYSALIS_DEPLOY_PROFILE);
  }
  const beside = path.join(path.dirname(path.resolve(cwlPath)), 'deploy-profile.json');
  if (fs.existsSync(beside)) return beside;
  return null;
}

/**
 * Load RFC-0023 profile via CWL dna-seed SoR (null if path missing).
 * @param {string} profilePath
 */
export async function loadDeployProfile(profilePath) {
  if (!profilePath || !fs.existsSync(profilePath)) return null;
  const seed = await loadCwlDnaSeed();
  return seed.loadDeployProfile(profilePath);
}

/**
 * Parse .cwl → draft DNA via CWL dna-seed (no Helix mapping fork).
 * @param {string} cwlPath
 * @param {object} [opts]
 */
export async function seedDnaFromCwlFile(cwlPath, opts = {}) {
  const seed = await loadCwlDnaSeed();
  const profilePath = resolveDeployProfilePath(cwlPath, opts.deployProfile);
  const profile = profilePath ? seed.loadDeployProfile(profilePath) : opts.profile || null;
  const host =
    opts.host ||
    (profile ? seed.resolveHostFromProfile(profile, opts.host) : 'default');

  const seeded = seed.seedDraftDnaFromCwlPath(cwlPath, {
    app_id: opts.app_id || profile?.app_id,
    host,
    created_at: opts.created_at,
    fixture: opts.fixture || cwlPath,
    profile: profile || undefined,
    profilePath: profilePath || undefined,
    includeHolesReport: opts.includeHolesReport === true,
    mode: opts.mode,
  });

  // Helix annotate path for ops (CWL already embeds deploy_profile when profile passed)
  if (profile && seeded?.bridge && typeof seeded.bridge === 'object' && profilePath) {
    seeded.bridge.deploy_profile = {
      ...(seeded.bridge.deploy_profile || {}),
      schema: profile.schema,
      path: profilePath,
      host: seeded.bridge.deploy_host || profile.host,
      rfc: '0023',
    };
    if (!String(seeded.bridge.rfc || '').includes('0023')) {
      seeded.bridge.rfc = '0022+0023';
    }
  }
  return seeded;
}

/**
 * Fill `dna_gaps` on a CWL holes bridge report (Secure-owned; never merge into DNA holes[]).
 * @param {object} holesReport — from cwlHolesBridgeReport
 * @param {{ missing_in_dna?: object[] }} compareReport — from compareCwlSurfaceToDna
 */
export function fillDnaGapsInHolesReport(holesReport, compareReport) {
  const gaps = (compareReport?.missing_in_dna || []).map((m) => ({
    method: m.method,
    path_template: m.path_template,
    host: m.host || 'default',
    note: 'cwl_surface_missing_in_dna',
  }));
  return {
    ...holesReport,
    dna_gaps: gaps,
    filled_by: 'helix',
  };
}

/**
 * Build holes bridge report (CWL holes) + optional DNA gaps from cutover compare.
 * @param {string} cwlPath
 * @param {{ deployProfile?: string, compare?: object, fixture?: string }} [opts]
 */
export async function buildHolesBridgeReport(cwlPath, opts = {}) {
  const seed = await loadCwlDnaSeed();
  const { parseCwlModule } = await loadCwlParser(opts.cwlRoot);
  // Prefer package seed module graph when available via seedDraft path's resolve —
  // for holes report, parse the single file; multi-file golds use pillar resolve in seed.
  let mod;
  try {
    const root = resolveCwlRoot(opts.cwlRoot);
    const graph = path.join(root, 'packages', 'cwl', 'lib', 'cwl-module-graph.mjs');
    const hubGraph = path.join(root, 'scripts', 'hub-ingest', 'cwl-module-graph.mjs');
    const gPath = fs.existsSync(graph) ? graph : hubGraph;
    if (fs.existsSync(gPath)) {
      const { resolveCwlModuleFromPath } = await import(pathToFileUrl(gPath));
      mod = resolveCwlModuleFromPath(cwlPath);
    }
  } catch {
    /* fall through */
  }
  if (!mod) {
    const source = fs.readFileSync(cwlPath, 'utf8');
    mod = parseCwlModule(source, path.basename(cwlPath));
  }
  let report = seed.cwlHolesBridgeReport(mod, {
    fixture: opts.fixture || cwlPath,
  });
  if (opts.compare) {
    report = fillDnaGapsInHolesReport(report, opts.compare);
  }
  return report;
}

/**
 * Identity compare: every CWL surface route appears in DNA (shape match).
 * When deploy profile host is non-`default`, host is part of identity (RFC-0023).
 *
 * @param {{ routes?: object[] }} cwlDnaOrSeed
 * @param {{ routes?: object[] }} liveDna
 * @param {{ ignoreHost?: boolean, deployProfile?: object }} [opts]
 */
export function compareCwlSurfaceToDna(cwlDnaOrSeed, liveDna, opts = {}) {
  const profile = opts.deployProfile || null;
  const pathShape = profile?.path_shape_equality !== false;
  const profileHost = profile?.host || cwlDnaOrSeed?.bridge?.deploy_host || null;
  const seededHosts = new Set(
    (cwlDnaOrSeed?.routes || []).map((r) => String(r.host || 'default')),
  );
  const multiHost =
    (profileHost && profileHost !== 'default') ||
    [...seededHosts].some((h) => h !== 'default');
  const ignoreHost =
    opts.ignoreHost !== undefined ? opts.ignoreHost !== false : !multiHost;

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
        cwl: `${c.host || 'default'} ${method} ${c.path_template}`,
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

  for (const l of liveRoutes) {
    const method = String(l.method || 'GET').toUpperCase();
    const hit = cwlRoutes.find((c) => {
      if (String(c.method || '').toUpperCase() !== method) return false;
      const pathOk = pathShape
        ? pathTemplateShapeEqual(c.path_template, l.path_template)
        : String(c.path_template) === String(l.path_template);
      if (!pathOk) return false;
      if (ignoreHost) return true;
      return String(l.host || 'default') === String(c.host || 'default');
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
    ignore_host: ignoreHost,
    deploy_profile: profile
      ? {
          schema: profile.schema,
          host: profile.host,
          path_shape_equality: pathShape,
        }
      : profileHost
        ? { host: profileHost }
        : null,
    cutover: missing_in_dna.length === 0
      ? 'cwl_surface_subseteq_dna'
      : 'cwl_surface_not_covered',
  };
}
