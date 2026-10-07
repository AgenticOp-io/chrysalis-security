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
import { routeKey, contentClass } from '../dna-core/index.mjs';

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
 * Load `lookupFullstackHole` (CWL tip 1.0.37+) — parameterized reasons like
 * `cwl:unknown-proxy-param:region` resolve to their catalog entry.
 * Soft: returns null when the pillar/package is absent (D5).
 * @param {string} [cwlRoot]
 * @returns {Promise<((reason: string) => object|null)|null>}
 */
export async function loadCwlHoleLookup(cwlRoot) {
  const tryPaths = [];
  if (cwlRoot || process.env.CHRYSALIS_CWL_ROOT) {
    const root = resolveCwlRoot(cwlRoot);
    tryPaths.push(
      path.join(root, 'packages', 'cwl', 'lib', 'cwl-fullstack-holes.mjs'),
      path.join(root, 'scripts', 'hub-ingest', 'cwl-fullstack-holes.mjs'),
    );
  } else {
    for (const name of CWL_PKG_NAMES) {
      try {
        const pkgJson = requireFromHere.resolve(`${name}/package.json`);
        const pkgDir = path.dirname(pkgJson);
        tryPaths.push(path.join(pkgDir, 'lib', 'cwl-fullstack-holes.mjs'));
      } catch {
        /* try next */
      }
    }
    try {
      const root = resolveCwlRoot();
      tryPaths.push(
        path.join(root, 'packages', 'cwl', 'lib', 'cwl-fullstack-holes.mjs'),
        path.join(root, 'scripts', 'hub-ingest', 'cwl-fullstack-holes.mjs'),
      );
    } catch {
      /* pillar absent */
    }
  }
  for (const p of tryPaths) {
    if (!p || !fs.existsSync(p)) continue;
    try {
      const mod = await import(pathToFileUrl(p));
      if (typeof mod.lookupFullstackHole === 'function') return mod.lookupFullstackHole;
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * Catalog facts for one hole reason. Parameterized reasons (tip 1.0.37) resolve by prefix
 * when the entry opts in with `param`; everything else stays exact-match.
 * @param {string} reason
 * @param {((reason: string) => object|null)|null} [lookup]
 */
export function catalogHoleReason(reason, lookup = null) {
  if (!reason || typeof lookup !== 'function') {
    return { reason, catalogued: null };
  }
  const entry = lookup(reason);
  if (!entry) return { reason, catalogued: false };
  return {
    reason,
    catalogued: true,
    rfc: entry.rfc || null,
    summary: entry.summary || null,
    param: entry.param || null,
  };
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
 * Resolve a CWL module (import graph when the pillar exposes it, else single-file parse).
 * @param {string} cwlPath
 * @param {{ cwlRoot?: string }} [opts]
 */
export async function resolveCwlModuleForPath(cwlPath, opts = {}) {
  try {
    const root = resolveCwlRoot(opts.cwlRoot);
    const staged = path.join(root, 'packages', 'cwl', 'lib', 'cwl-module-graph.mjs');
    const hub = path.join(root, 'scripts', 'hub-ingest', 'cwl-module-graph.mjs');
    const gPath = fs.existsSync(staged) ? staged : hub;
    if (fs.existsSync(gPath)) {
      const { resolveCwlModuleFromPath } = await import(pathToFileUrl(gPath));
      return resolveCwlModuleFromPath(cwlPath);
    }
  } catch {
    /* fall through to single-file parse */
  }
  const { parseCwlModule } = await loadCwlParser(opts.cwlRoot);
  return parseCwlModule(fs.readFileSync(cwlPath, 'utf8'), path.basename(cwlPath));
}

/** Credential / session intent (CWL 1.0.33+, RFC-0032). Tip 1.0.47 may name auth.require's cookie. */
const CREDENTIAL_EFFECT_BASES = Object.freeze([
  'auth.verify',
  'auth.require',
  'session.mint',
  'session.revoke',
]);

/**
 * True when an effect tag is credential intent — bare `session.mint` or
 * `session.mint cookie sid` (tip 1.0.38) / with policy attrs (tip 1.0.43).
 * @param {unknown} effect
 */
export function isCredentialEffect(effect) {
  const s = String(effect || '');
  return CREDENTIAL_EFFECT_BASES.some((b) => s === b || s.startsWith(`${b} `) || s.startsWith(`${b} cookie `));
}

/**
 * Cookie **name** from `session.mint cookie <name>` / `session.revoke cookie <name>`.
 * Trailing policy attrs (tip 1.0.43) are ignored here. Never a value.
 * @param {unknown} effect
 * @returns {string|null}
 */
export function sessionCookieNameFromEffect(effect) {
  const m = String(effect || '').match(
    /^session\.(?:mint|revoke)\s+cookie\s+([A-Za-z_][A-Za-z0-9_-]*)(?:\s|$)/,
  );
  return m ? m[1] : null;
}

/**
 * Cookie **policy** attrs from a mint/revoke effect (tip 1.0.43). Flags and path only.
 * @param {unknown} effect
 * @returns {{ httponly?: boolean, secure?: boolean, path?: string, samesite?: string }|null}
 */
export function sessionCookieAttrsFromEffect(effect) {
  const m = String(effect || '').match(
    /^session\.(?:mint|revoke)\s+cookie\s+[A-Za-z_][A-Za-z0-9_-]*\s+(.+)$/,
  );
  if (!m) return null;
  const tokens = m[1].trim().split(/\s+/).filter(Boolean);
  /** @type {{ httponly?: boolean, secure?: boolean, path?: string, samesite?: string }} */
  const attrs = {};
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok === 'httponly') {
      attrs.httponly = true;
      continue;
    }
    if (tok === 'secure') {
      attrs.secure = true;
      continue;
    }
    if (tok === 'path') {
      const p = tokens[++i];
      if (!p || !/^\/[A-Za-z0-9_./-]*$/.test(p)) return null;
      attrs.path = p;
      continue;
    }
    if (tok === 'samesite') {
      const ss = tokens[++i];
      if (!ss || !/^(lax|strict|none)$/.test(ss)) return null;
      attrs.samesite = ss;
      continue;
    }
    return null;
  }
  return Object.keys(attrs).length ? attrs : null;
}

/**
 * Session cookie names declared on a route's credential effects (mint or revoke).
 * @param {string[]} effects
 * @returns {string[]}
 */
export function sessionCookieNamesFromEffects(effects) {
  const names = new Set();
  for (const e of effects || []) {
    const n = sessionCookieNameFromEffect(e);
    if (n) names.add(n);
  }
  return [...names];
}

/**
 * Genome cookie policy keyed by name (mint wins over revoke when both name the same cookie).
 * @param {string[]} effects
 * @returns {Record<string, { httponly?: boolean, secure?: boolean, path?: string, samesite?: string }>}
 */
export function sessionCookieAttrsFromEffects(effects) {
  /** @type {Record<string, { httponly?: boolean, secure?: boolean, path?: string, samesite?: string }>} */
  const out = {};
  for (const e of effects || []) {
    const name = sessionCookieNameFromEffect(e);
    const attrs = sessionCookieAttrsFromEffect(e);
    if (name && attrs) out[name] = attrs;
  }
  return out;
}

/**
 * CSRF cookie **name** from `csrf.verify cookie <name>` (tip 1.0.46). Never a token value.
 * @param {unknown} effect
 * @returns {string|null}
 */
export function csrfCookieNameFromEffect(effect) {
  const m = String(effect || '').match(/^csrf\.verify\s+cookie\s+([A-Za-z_][A-Za-z0-9_-]*)$/);
  return m ? m[1] : null;
}

/**
 * @param {unknown} effect
 */
export function isCsrfEffect(effect) {
  const s = String(effect || '');
  return s === 'csrf.verify' || s.startsWith('csrf.verify cookie ');
}

/**
 * @param {string[]} effects
 * @returns {string[]}
 */
export function csrfCookieNamesFromEffects(effects) {
  const names = new Set();
  for (const e of effects || []) {
    const n = csrfCookieNameFromEffect(e);
    if (n) names.add(n);
  }
  return [...names];
}

/**
 * Cookie **name** from `auth.require cookie <name>` (tip 1.0.47). Never a token value.
 * @param {unknown} effect
 * @returns {string|null}
 */
export function authRequireCookieNameFromEffect(effect) {
  const m = String(effect || '').match(/^auth\.require\s+cookie\s+([A-Za-z_][A-Za-z0-9_-]*)$/);
  return m ? m[1] : null;
}

/**
 * @param {string[]} effects
 * @returns {string[]}
 */
export function authRequireCookieNamesFromEffects(effects) {
  const names = new Set();
  for (const e of effects || []) {
    const n = authRequireCookieNameFromEffect(e);
    if (n) names.add(n);
  }
  return [...names];
}

/**
 * Cookie **name** from `session.read cookie <name>` / `session.write cookie <name>` (tip 1.0.54).
 * @param {unknown} effect
 * @returns {string|null}
 */
export function sessionAccessCookieNameFromEffect(effect) {
  const m = String(effect || '').match(/^session\.(?:read|write)\s+cookie\s+([A-Za-z_][A-Za-z0-9_-]*)$/);
  return m ? m[1] : null;
}

/**
 * Genome cookie policy flags the certificate does not honor (subset check — extra DNA flags are fine).
 * @param {{ httponly?: boolean, secure?: boolean, path?: string, samesite?: string }} genome
 * @param {{ httponly?: boolean, secure?: boolean, path?: string, samesite?: string }|undefined} learned
 * @returns {string[]}
 */
export function cookieAttrGaps(genome, learned) {
  /** @type {string[]} */
  const missing = [];
  if (!genome) return missing;
  if (genome.httponly && !learned?.httponly) missing.push('httponly');
  if (genome.secure && !learned?.secure) missing.push('secure');
  if (genome.path && genome.path !== learned?.path) missing.push(`path ${genome.path}`);
  if (genome.samesite && genome.samesite !== learned?.samesite) missing.push(`samesite ${genome.samesite}`);
  return missing;
}

/** Host-byte hole reasons (CWL 1.0.35) — bytes stay host-owned, media type is genome data. */
const HOST_BYTE_REASONS = Object.freeze(['hub-cwl:keypair-gen', 'hub-cwl:binary-render']);

function proxyParamNames(target) {
  return [...String(target).matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)]
    .map((m) => m[1])
    // `https://host:8080/...` — a port is not a path param
    .filter((n) => !/^\d/.test(n));
}

function layoutByName(mod, name) {
  if (!name) return null;
  return (mod?.layouts || []).find((l) => l?.name === name) || null;
}

function sameSiteDocumentPath(action) {
  const s = String(action || '');
  return s.startsWith('/') && !s.startsWith('//');
}

/**
 * Layout declarations that are page text (tips 1.0.63–1.0.67; tip 1.0.75 host honesty; tip 1.0.78 literal year).
 * Paths and class tokens only — no clock, user agent, CSS bytes, image bytes, or script bytes.
 * Year/device host passes stay host-owned; demo Hosting (`agenticop-cwl-demo`) is not Helix.
 * Tip 1.0.78 `year N;` is a document digit on the annotation — Helix does not read the clock.
 * CSS checkbox menu lives in chrome HTML + owned CSS; Helix does not inject drawer/device JS.
 * Tip 1.0.79 `stream websocket` / `job.enqueue` / island event names are document facts —
 * Helix does not invent WS frames, job queues, or client hydration.
 * Tip 1.0.80 marketing copy (verify dispose / no façades) is page text only —
 * Helix does not turn slogans into DNA routes or fill unproven claims.
 * Tip 1.0.81 RFC-0038 Nest / LiveView / Flutter / onion / raw-SQL residuals are
 * catalogued hole reasons on annotations — Helix does not invent those runtimes.
 * Tip 1.0.82 RFC-0039 DNA identity (`replaces` / `from peel` / `capability` /
 * `works without client`) are document facts on annotations — Helix does not
 * invent a capability browser, peel runtime, or progressive certificate engine.
 * Tip 1.0.83 RFC-0040 progressive asset integrity (`integrity` / `module` /
 * `crossorigin` on named `script` / `style`) are document facts — Helix does
 * not hash, verify SRI in a browser, or invent a JS/CSS runtime.
 * An off-site form is a hole flag. The foreign URL is not copied.
 * @param {object | null | undefined} layout
 * @returns {object | null}
 */
function layoutDocumentFacts(layout) {
  if (!layout) return null;
  /** @type {Record<string, unknown>} */
  const facts = {};
  if (layout.yearHost === true) facts.cwl_year_host = true;
  if (Number.isInteger(layout.yearLiteral)) facts.cwl_year = layout.yearLiteral;
  if (Array.isArray(layout.deviceHost?.values) && layout.deviceHost.values.length) {
    facts.cwl_device_classes = [...layout.deviceHost.values];
  }
  if (Number.isInteger(layout.deviceHost?.below)) facts.cwl_device_below = layout.deviceHost.below;
  if (layout.charset === 'utf-8') facts.cwl_charset = 'utf-8';
  if (layout.viewportDevice === true) facts.cwl_viewport_device = true;
  if (layout.drawer?.navId) {
    facts.cwl_drawer = {
      nav_id: layout.drawer.navId,
      toggle_class: layout.drawer.toggleClass,
      open_class: layout.drawer.openClass,
      ...(layout.drawer.panelId ? { panel_id: layout.drawer.panelId } : {}),
    };
  }
  if (Array.isArray(layout.links) && layout.links.length) {
    facts.cwl_nav_links = layout.links.map((row) => {
      const out = { id: row.id, href: row.href, label: row.label };
      if (row.className) out.class_name = row.className;
      if (row.group) out.group = row.group;
      if (row.target) out.target = row.target;
      if (row.rel) out.rel = row.rel;
      return out;
    });
  }
  const styles = (layout.styles || []).map(styleDocumentFact).filter(Boolean);
  if (styles.length) facts.cwl_styles = styles;
  if (Array.isArray(layout.images) && layout.images.length) {
    facts.cwl_images = layout.images.map((img) => ({ id: img.id, path: img.path }));
  }
  if (layout.hostFirebase?.target) {
    facts.cwl_host_firebase = {
      target: layout.hostFirebase.target,
      public_dir: layout.hostFirebase.publicDir,
      ...(layout.hostFirebase.errorDoc ? { error_doc: layout.hostFirebase.errorDoc } : {}),
    };
  }
  const scripts = (layout.scripts || []).map(scriptDocumentFact).filter(Boolean);
  if (scripts.length) facts.cwl_scripts = scripts;
  const assetHoles = (layout.holes || []).filter((h) => ASSET_INTEGRITY_HOLES.includes(h));
  if (assetHoles.length) facts.cwl_layout_holes = [...assetHoles];
  const forms = Array.isArray(layout.forms) ? layout.forms : [];
  const sameSite = forms.filter((f) => f && !f.refused && sameSiteDocumentPath(f.action));
  if (sameSite.length) {
    facts.cwl_forms = sameSite.map((f) => ({
      id: f.id,
      method: String(f.method || 'post').toUpperCase(),
      action: f.action,
      fields: (f.fields || []).map((field) => ({ name: field.name, type: field.type })),
      ...(f.submit ? { submit: f.submit } : {}),
    }));
  }
  if (forms.some((f) => f?.refused) || (layout.formHoles || []).includes('unsupported:offsite-form')) {
    facts.cwl_offsite_form = true;
  }
  return Object.keys(facts).length ? facts : null;
}

const ASSET_INTEGRITY_HOLES = Object.freeze([
  'cwl:bad-integrity',
  'cwl:bad-asset-url',
  'cwl:bad-asset-tail',
]);

/**
 * RFC-0040 style document fact (tip 1.0.83).
 * URL-only stays a string for prior tip pins; integrity / crossorigin deepen the object.
 * Helix never hashes or verifies SRI — host/CI supply the token.
 * @param {string | { href?: string, integrity?: string, crossorigin?: boolean } | null | undefined} entry
 * @returns {string | { href: string, integrity?: string, crossorigin?: boolean } | null}
 */
function styleDocumentFact(entry) {
  if (typeof entry === 'string' && entry) return entry;
  if (!entry || typeof entry !== 'object' || typeof entry.href !== 'string' || !entry.href) return null;
  const integrity = typeof entry.integrity === 'string' && entry.integrity ? entry.integrity : null;
  const crossorigin = entry.crossorigin === true;
  if (!integrity && !crossorigin) return entry.href;
  /** @type {{ href: string, integrity?: string, crossorigin?: boolean }} */
  const out = { href: entry.href };
  if (integrity) out.integrity = integrity;
  if (crossorigin) out.crossorigin = true;
  return out;
}

/**
 * RFC-0040 script document fact (tip 1.0.83).
 * URL-only stays a string; module / integrity / crossorigin deepen the object.
 * Helix does not invent a JS runtime or browser SRI check.
 * @param {string | { src?: string, module?: boolean, integrity?: string, crossorigin?: boolean } | null | undefined} entry
 * @returns {string | { src: string, module?: boolean, integrity?: string, crossorigin?: boolean } | null}
 */
function scriptDocumentFact(entry) {
  if (typeof entry === 'string' && entry) return entry;
  if (!entry || typeof entry !== 'object' || typeof entry.src !== 'string' || !entry.src) return null;
  const module = entry.module === true;
  const integrity = typeof entry.integrity === 'string' && entry.integrity ? entry.integrity : null;
  const crossorigin = entry.crossorigin === true;
  if (!module && !integrity && !crossorigin) return entry.src;
  /** @type {{ src: string, module?: boolean, integrity?: string, crossorigin?: boolean }} */
  const out = { src: entry.src };
  if (module) out.module = true;
  if (integrity) out.integrity = integrity;
  if (crossorigin) out.crossorigin = true;
  return out;
}

const META_REFUSED = Object.freeze([
  'cwl:meta-not-url',
  'cwl:meta-theme',
  'cwl:meta-og-type',
  'cwl:meta-twitter-card',
]);

const HEAD_REFUSED = Object.freeze([
  'cwl:alternate-not-url',
  'cwl:preconnect-not-url',
  'cwl:jsonld-not-json',
  'cwl:jsonld-closes-script',
]);

const DB_ENGINES = Object.freeze(['sqlite', 'postgres', 'mysql', 'mariadb', 'sqlserver', 'oracle']);

const CWL_CAPABILITIES = Object.freeze([
  'cookies',
  'network-same-origin',
  'network-cross-origin',
  'storage',
  'client',
]);

/**
 * RFC-0039 DNA identity (tip 1.0.82): replaces / peel / capability / works without client.
 * Document facts on bridge annotations only — never DNA route fields.
 * Helix does not invent a capability browser, peel runtime, or client certificate engine.
 * @param {object} route
 * @returns {object | null}
 */
function dnaIdentityDocumentFacts(route) {
  /** @type {Record<string, unknown>} */
  const facts = {};
  if (typeof route.replaces === 'string' && route.replaces) facts.cwl_replaces = route.replaces;
  if (
    route.peel &&
    typeof route.peel.stack === 'string' &&
    route.peel.stack &&
    typeof route.peel.at === 'string' &&
    route.peel.at
  ) {
    facts.cwl_from_peel = { stack: route.peel.stack, at: route.peel.at };
  }
  if (Array.isArray(route.capabilities) && route.capabilities.length) {
    const caps = route.capabilities.filter((c) => typeof c === 'string' && CWL_CAPABILITIES.includes(c));
    if (caps.length) facts.cwl_capabilities = [...caps];
  }
  if (route.worksWithoutClient === true) facts.cwl_works_without_client = true;
  return Object.keys(facts).length ? facts : null;
}

/**
 * Per-page document identity and social card (tips 1.0.69–1.0.71).
 * The parser already drops a non-URL canonical, a non-URL card image,
 * a non-URL alternate or preconnect, and JSON-LD that is not JSON or that closes the script.
 * An unknown icon is not copied. Apple touch is copied only when declared.
 * Helix records the hole name and does not copy the refused value.
 * @param {object} route
 * @param {object | null | undefined} layout
 * @returns {object | null}
 */
function pageDocumentFacts(route, layout) {
  /** @type {Record<string, unknown>} */
  const facts = {};
  if (typeof route.title === 'string' && route.title) facts.cwl_title = route.title;
  if (typeof route.description === 'string' && route.description) facts.cwl_description = route.description;
  if (typeof route.canonical === 'string' && route.canonical) facts.cwl_canonical = route.canonical;
  const card = route.metaCard;
  if (card) {
    /** @type {Record<string, unknown>} */
    const meta = {};
    if (card.robots) meta.robots = card.robots;
    if (card.author) meta.author = card.author;
    if (card.theme) meta.theme = card.theme;
    if (card.keywords) meta.keywords = card.keywords;
    if (card.og && Object.keys(card.og).length) meta.og = { ...card.og };
    if (card.twitter && Object.keys(card.twitter).length) meta.twitter = { ...card.twitter };
    if (Object.keys(meta).length) facts.cwl_meta = meta;
  }
  const imagePaths = new Map((layout?.images || []).map((img) => [img.id, img.path]));
  /** @type {object[]} */
  const icons = [];
  let unknownIcon = false;
  for (const icon of route.icons || []) {
    const iconPath = imagePaths.get(icon.id);
    if (!iconPath) {
      unknownIcon = true;
      continue;
    }
    /** @type {Record<string, unknown>} */
    const row = { id: icon.id, path: iconPath };
    if (icon.apple === true) row.apple = true;
    icons.push(row);
  }
  if (icons.length) facts.cwl_icons = icons;
  if (Array.isArray(route.alternates) && route.alternates.length) {
    facts.cwl_alternates = route.alternates.map((link) => ({
      type: link.type,
      href: link.href,
      title: link.title,
    }));
  }
  if (Array.isArray(route.preconnects) && route.preconnects.length) {
    facts.cwl_preconnects = route.preconnects.map((link) =>
      link.crossorigin ? { href: link.href, crossorigin: true } : { href: link.href },
    );
  }
  const pageStyles = (route.pageStyles || []).map(styleDocumentFact).filter(Boolean);
  if (pageStyles.length) facts.cwl_page_styles = pageStyles;
  if (Array.isArray(route.jsonlds) && route.jsonlds.length) {
    const jsonld = route.jsonlds.filter((value) => jsonLdDocumentOk(value));
    if (jsonld.length) facts.cwl_jsonld = jsonld;
  }
  const holes = route.attachmentHoles || [];
  if (holes.includes('cwl:canonical-not-url')) facts.cwl_canonical_refused = true;
  const refused = META_REFUSED.filter((hole) => holes.includes(hole));
  if (refused.length) facts.cwl_meta_refused = refused;
  const headRefused = [];
  if (unknownIcon) headRefused.push('cwl:unknown-icon');
  for (const hole of HEAD_REFUSED) {
    if (holes.includes(hole)) headRefused.push(hole);
  }
  if (headRefused.length) facts.cwl_head_refused = headRefused;
  return Object.keys(facts).length ? facts : null;
}

/**
 * JSON-LD is document text. A value that is not JSON, or that closes the script, is not copied.
 * @param {unknown} value
 */
function jsonLdDocumentOk(value) {
  if (typeof value !== 'string' || !value || value.includes('</script>')) return false;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Path and query names filled into HTML are that request (tip 1.0.72).
 * Helix records the names. It does not run the live document server.
 * @param {object} route
 * @returns {object | null}
 */
function requestDocumentFacts(route) {
  /** @type {Record<string, unknown>} */
  const facts = {};
  if (Array.isArray(route.handlerPathParams) && route.handlerPathParams.length) {
    facts.cwl_request_path = [...route.handlerPathParams];
  }
  if (Array.isArray(route.handlerQueryParams) && route.handlerQueryParams.length) {
    facts.cwl_request_query = [...route.handlerQueryParams];
  }
  return Object.keys(facts).length ? facts : null;
}

/**
 * Repeated rows and branches are document facts (tip 1.0.73).
 * A repeat names host data. A branch is comparison text.
 * Helix does not evaluate a media query and does not read a cookie value.
 * @param {object} route
 * @returns {object | null}
 */
function dynamicDocumentFacts(route) {
  /** @type {Record<string, unknown>} */
  const facts = {};
  if (Array.isArray(route.htmlRepeats) && route.htmlRepeats.length) {
    facts.cwl_repeats = route.htmlRepeats.map((rep) => {
      /** @type {Record<string, unknown>} */
      const row = { collection: rep.collection, item: rep.item };
      if (rep.when) row.when = rep.when;
      if (typeof rep.empty === 'string') row.empty = rep.empty;
      return row;
    });
  }
  if (Array.isArray(route.earlyGuards) && route.earlyGuards.length) {
    facts.cwl_branches = route.earlyGuards.map((guard) => {
      /** @type {Record<string, unknown>} */
      const row = { cond: guard.condExpr };
      if (Number.isInteger(guard.status)) row.status = guard.status;
      return row;
    });
  }
  return Object.keys(facts).length ? facts : null;
}

/**
 * A bound row value stays a parameter (tip 1.0.74). It is not SQL text.
 * @param {object | null | undefined} value
 */
function dbValueFact(value) {
  if (!value || typeof value !== 'object') return null;
  if (value.kind === 'literal') return { kind: 'literal', value: value.value };
  if (value.kind === 'binding') return { kind: 'parameter', source: value.source, name: value.name };
  if (value.kind === 'row') return { kind: 'row', collection: value.collection, field: value.field };
  return null;
}

/**
 * Named engine and bound row operations (tip 1.0.74).
 * An unknown engine is a hole and its name is not copied.
 * Helix does not open a database and does not execute SQL text.
 * @param {object} route
 * @param {object | null | undefined} mod
 * @returns {object | null}
 */
function dbDocumentFacts(route, mod) {
  /** @type {Record<string, unknown>} */
  const facts = {};
  const engine = typeof mod?.engine === 'string' ? mod.engine : null;
  if (engine && DB_ENGINES.includes(engine)) facts.cwl_db_engine = engine;
  if ((mod?.engineHoles || []).includes('cwl:unknown-db-engine')) facts.cwl_db_engine_refused = true;
  const refused = (route.attachmentHoles || []).filter(
    (hole) => hole === 'cwl:unknown-db-column' || hole === 'cwl:db-where-required' || hole.startsWith('cwl:db-'),
  );
  if (refused.length) facts.cwl_db_refused = refused;
  if (Array.isArray(route.dbOps) && route.dbOps.length) {
    facts.cwl_db_ops = route.dbOps.map((op) => ({
      op: op.op,
      table: op.table,
      ...(op.one ? { one: true } : {}),
      ...(op.column ? { column: op.column } : {}),
      ...(op.as ? { as: op.as } : {}),
      ...(op.into ? { into: { collection: op.into.collection, field: op.into.field } } : {}),
      where: (op.where || []).map((part) => ({
        column: part.column,
        cmp: part.cmp,
        value: dbValueFact(part.value),
      })),
      fields: (op.fields || []).map((field) => ({
        column: field.column,
        value: dbValueFact(field.value),
      })),
    }));
  }
  return Object.keys(facts).length ? facts : null;
}

/**
 * Genome facts CWL declares per route that the DNA seed does not carry as route fields:
 * declared upstream forward targets (RFC-0033 / 1.0.34+1.0.36) and host-byte media types
 * next to a hole (1.0.35). Read from the CWL module — Helix does not re-grammar them.
 *
 * @param {{ routes?: object[] }} mod — parsed CWL module
 * @returns {object[]} annotation fragments keyed by method + path_template
 */
export function genomeRouteAnnotations(mod) {
  const out = [];
  for (const r of mod?.routes || []) {
    const method = String(r.method || 'GET').toUpperCase();
    const fragment = { method, path_template: r.path };
    let carries = false;

    const body = r.body || null;
    if (body?.kind === 'proxy' && body.target) {
      const params = proxyParamNames(body.target);
      const declared = new Set(r.pathParams || []);
      fragment.cwl_upstream_target = body.target;
      if (params.length) {
        fragment.cwl_upstream_params = params;
        const unknown = params.filter((p) => !declared.has(p));
        if (unknown.length) fragment.cwl_upstream_unknown_params = unknown;
      }
      carries = true;
    }

    const holeReason = body?.kind === 'hole' ? body.reason : null;
    if (holeReason) {
      fragment.cwl_hole_reason = holeReason;
      if (HOST_BYTE_REASONS.includes(holeReason)) fragment.cwl_host_bytes = true;
      carries = true;
    }

    if (r.responseContentType) {
      fragment.cwl_content_type = r.responseContentType;
      fragment.cwl_declared_content_class = contentClass(r.responseContentType);
      carries = true;
    }

    const credential = (r.effects || []).filter((e) => isCredentialEffect(e));
    if (credential.length) {
      fragment.cwl_credential_effects = credential;
      const cookies = sessionCookieNamesFromEffects(credential);
      // Tip 1.0.38 — genome may name the cookie; never seed a value into DNA routes.
      if (cookies.length) fragment.cwl_session_cookies = cookies;
      const attrs = sessionCookieAttrsFromEffects(credential);
      // Tip 1.0.43 — policy flags only; still never a token value.
      if (Object.keys(attrs).length) fragment.cwl_session_cookie_attrs = attrs;
      const requireCookies = authRequireCookieNamesFromEffects(credential);
      // Tip 1.0.47 — genome may name the required session cookie; never a value.
      if (requireCookies.length) fragment.cwl_auth_require_cookies = requireCookies;
      carries = true;
    }

    const csrf = (r.effects || []).filter((e) => isCsrfEffect(e));
    if (csrf.length) {
      fragment.cwl_csrf_effects = csrf;
      const csrfCookies = csrfCookieNamesFromEffects(csrf);
      if (csrfCookies.length) fragment.cwl_csrf_cookies = csrfCookies;
      carries = true;
    }

    const accessCookies = [];
    for (const e of r.effects || []) {
      const n = sessionAccessCookieNameFromEffect(e);
      if (n) accessCookies.push(n);
    }
    if (accessCookies.length) {
      fragment.cwl_session_access_cookies = [...new Set(accessCookies)];
      carries = true;
    }
    if ((r.effects || []).some((e) => String(e) === 'cache.private')) {
      fragment.cwl_cache_private = true;
      carries = true;
    }
    if ((r.effects || []).some((e) => String(e) === 'cache.no-store')) {
      fragment.cwl_cache_no_store = true;
      carries = true;
    }
    if ((r.effects || []).some((e) => String(e) === 'cache.no-cache')) {
      fragment.cwl_cache_no_cache = true;
      carries = true;
    }
    if (r.redirect?.path && String(r.redirect.path).startsWith('/') && !String(r.redirect.path).startsWith('//')) {
      fragment.cwl_redirect = {
        path: r.redirect.path,
        status: r.redirect.status || 302,
      };
      carries = true;
    }
    if ((r.attachmentHoles || []).includes('unsupported:open-redirect')) {
      fragment.cwl_open_redirect = true;
      carries = true;
    }
    if (typeof r.navId === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(r.navId)) {
      fragment.cwl_nav_id = r.navId;
      carries = true;
    }
    const layoutFacts = layoutDocumentFacts(layoutByName(mod, r.layoutName));
    if (layoutFacts) {
      Object.assign(fragment, layoutFacts);
      carries = true;
    }
    const pageFacts = pageDocumentFacts(r, layoutByName(mod, r.layoutName));
    if (pageFacts) {
      Object.assign(fragment, pageFacts);
      carries = true;
    }
    const requestFacts = requestDocumentFacts(r);
    if (requestFacts) {
      Object.assign(fragment, requestFacts);
      carries = true;
    }
    const dynamicFacts = dynamicDocumentFacts(r);
    if (dynamicFacts) {
      Object.assign(fragment, dynamicFacts);
      carries = true;
    }
    const dbFacts = dbDocumentFacts(r, mod);
    if (dbFacts) {
      Object.assign(fragment, dbFacts);
      carries = true;
    }
    const identityFacts = dnaIdentityDocumentFacts(r);
    if (identityFacts) {
      Object.assign(fragment, identityFacts);
      carries = true;
    }

    const purposes = (r.handlerCookiePurposes || []).filter(
      (p) =>
        p?.name &&
        (p.purpose === 'session' || p.purpose === 'csrf' || p.purpose === 'preference') &&
        (p.purpose !== 'preference' || (Array.isArray(p.values) && p.values.length)),
    );
    if (purposes.length) {
      fragment.cwl_cookie_purposes = purposes.map((p) => ({
        name: p.name,
        purpose: p.purpose,
        values: p.purpose === 'preference' ? [...p.values] : undefined,
      }));
      carries = true;
    }
    if ((r.attachmentHoles || []).includes('unsupported:tracking-cookie')) {
      fragment.cwl_tracking_cookie = true;
      carries = true;
    }

    if (carries) out.push(fragment);
  }
  return out;
}

/**
 * Merge `genomeRouteAnnotations` into a seeded DNA bridge envelope (annotations only —
 * DNA routes stay dna-seed SoR, so strip/certify/enforce are unchanged).
 * @param {object} seeded
 * @param {{ routes?: object[] }} mod
 */
export function annotateSeedWithGenomeFacts(seeded, mod) {
  if (!seeded?.bridge || typeof seeded.bridge !== 'object') return seeded;
  const fragments = genomeRouteAnnotations(mod);
  if (!fragments.length) return seeded;

  const annotations = Array.isArray(seeded.bridge.annotations)
    ? [...seeded.bridge.annotations]
    : [];
  for (const f of fragments) {
    const idx = annotations.findIndex(
      (a) =>
        String(a?.method || '').toUpperCase() === f.method &&
        String(a?.path_template) === String(f.path_template),
    );
    if (idx >= 0) annotations[idx] = { ...annotations[idx], ...f };
    else annotations.push(f);
  }
  seeded.bridge.annotations = annotations;
  return seeded;
}

/**
 * Declared upstream forwards from the genome — operator egress input, not enforcement.
 * Helix scores inbound requests; it does not proxy or filter egress today.
 * @param {{ bridge?: { annotations?: object[] } }} seed
 * @param {{ app_id?: string, lookupHole?: ((reason: string) => object|null)|null }} [opts]
 */
export function buildUpstreamTargetsReport(seed, opts = {}) {
  const annotations = Array.isArray(seed?.bridge?.annotations) ? seed.bridge.annotations : [];
  const lookup = opts.lookupHole || null;
  const targets = [];
  const unresolved = [];
  for (const a of annotations) {
    if (a?.cwl_upstream_target) {
      let origin = null;
      try {
        origin = new URL(a.cwl_upstream_target).origin;
      } catch {
        origin = null;
      }
      targets.push({
        method: a.method,
        path_template: a.path_template,
        target: a.cwl_upstream_target,
        origin,
        params: a.cwl_upstream_params || [],
      });
    }
    // Rejected proxy params become holes (cwl:unknown-proxy-param:<name>). Tip 1.0.37
    // resolves those parameterized reasons to their catalog entry for operator copy.
    const reasons = [];
    if (a?.cwl_hole_reason?.startsWith('cwl:unknown-proxy-param:')) {
      reasons.push(a.cwl_hole_reason);
    } else if (Array.isArray(a?.cwl_upstream_unknown_params) && a.cwl_upstream_unknown_params.length) {
      for (const p of a.cwl_upstream_unknown_params) {
        reasons.push(`cwl:unknown-proxy-param:${p}`);
      }
    }
    for (const reason of reasons) {
      unresolved.push({
        method: a.method,
        path_template: a.path_template,
        ...catalogHoleReason(reason, lookup),
      });
    }
  }
  return {
    kind: 'chrysalis.helix.upstream-targets',
    schemaVersion: 1,
    app_id: seed?.app_id ?? opts.app_id ?? null,
    origins: [...new Set(targets.map((t) => t.origin).filter(Boolean))].sort(),
    targets,
    unresolved,
    note: 'Declared forwards from CWL (RFC-0033). Helix scores inbound DNA; egress filtering is not a Helix control.',
  };
}

/**
 * Ops severity overlay from the genome: which certified routes are credential surfaces
 * (RFC-0032 `auth.verify` / `session.mint` / `session.revoke`, plus `auth.require`).
 *
 * Written beside the certificate, never inside it — `app-dna-v1` stays identity only.
 * Hand-authored overlays are equally valid when there is no CWL (D5).
 * @param {{ app_id?: string, bridge?: { annotations?: object[] } }} seed
 */
export function buildSensitivityMap(seed) {
  const annotations = Array.isArray(seed?.bridge?.annotations) ? seed.bridge.annotations : [];
  const routes = annotations
    .filter((a) => Array.isArray(a?.cwl_credential_effects) && a.cwl_credential_effects.length)
    .map((a) => ({
      method: String(a.method || 'GET').toUpperCase(),
      path_template: a.path_template,
      host: a.host || 'default',
      severity: 'high',
      sensitivity: 'credential',
      effects: a.cwl_credential_effects,
    }));
  return {
    kind: 'chrysalis.helix.sensitivity-map',
    schemaVersion: 1,
    app_id: seed?.app_id ?? null,
    source: 'cwl-genome',
    routes,
    note: 'Ops overlay for hole severity. Not part of app-dna-v1 — enforce identity is unchanged.',
  };
}

/**
 * Cookie-purpose overlay (RFC-0034). Names and preference class lists only — never a token.
 * Absent overlay ⇒ Helix does not apply the purpose check (D5).
 * @param {{ bridge?: { annotations?: object[] } }} seed
 */
export function buildCookiePurposeMap(seed) {
  const annotations = Array.isArray(seed?.bridge?.annotations) ? seed.bridge.annotations : [];
  const routes = annotations
    .filter((a) => Array.isArray(a?.cwl_cookie_purposes) && a.cwl_cookie_purposes.length)
    .map((a) => ({
      method: String(a.method || 'GET').toUpperCase(),
      path_template: a.path_template,
      host: a.host || 'default',
      purposes: a.cwl_cookie_purposes,
    }));
  return {
    kind: 'chrysalis.helix.cookie-purpose-map',
    schemaVersion: 1,
    app_id: seed?.app_id ?? null,
    routes,
    note: 'Refuse Set-Cookie names outside session/csrf/preference, and preference values outside the class list. Not part of app-dna-v1.',
  };
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

  if (opts.genomeFacts !== false && seeded?.bridge) {
    try {
      const mod = await resolveCwlModuleForPath(cwlPath, { cwlRoot: opts.cwlRoot });
      annotateSeedWithGenomeFacts(seeded, mod);
    } catch {
      /* annotations are additive — a parse-path miss must not fail the seed */
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
  const mod = await resolveCwlModuleForPath(cwlPath, { cwlRoot: opts.cwlRoot });
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
 * When CWL declares request/query fingerprints (multipart union, etc.), honor them
 * against DNA when DNA also has the field (RFC-0022 deepen / tip 1.0.24+).
 * Bridge annotations (`cwl_stream`, multipart part names) are reported — not DNA routeKey.
 *
 * @param {{ routes?: object[], bridge?: object }} cwlDnaOrSeed
 * @param {{ routes?: object[] }} liveDna
 * @param {{ ignoreHost?: boolean, deployProfile?: object, strictFingerprints?: boolean }} [opts]
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
  // Authored cutover: when CWL declares a request fp and DNA has one, they must match.
  const strictFingerprints = opts.strictFingerprints !== false;

  const cwlRoutes = cwlDnaOrSeed?.routes || [];
  const liveRoutes = liveDna?.routes || [];
  const annotations = Array.isArray(cwlDnaOrSeed?.bridge?.annotations)
    ? cwlDnaOrSeed.bridge.annotations
    : [];

  const matched = [];
  const missing_in_dna = [];
  const extra_notes = [];
  /** @type {object[]} */
  const fingerprint_mismatches = [];
  /** @type {object[]} */
  const fingerprints_honored = [];
  /** @type {object[]} */
  const content_class_notes = [];

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

      if (c.request_key_fingerprint != null) {
        if (hit.request_key_fingerprint == null) {
          // Soft: live DNA may not have learned body/multipart names yet.
          content_class_notes.push({
            method,
            path_template: c.path_template,
            field: 'request_key_fingerprint',
            cwl: c.request_key_fingerprint,
            dna: null,
            note: 'cwl_declared_request_fp_absent_in_dna',
          });
        } else if (String(hit.request_key_fingerprint) !== String(c.request_key_fingerprint)) {
          fingerprint_mismatches.push({
            method,
            path_template: c.path_template,
            host: c.host || 'default',
            field: 'request_key_fingerprint',
            cwl: c.request_key_fingerprint,
            dna: hit.request_key_fingerprint,
            note: 'request_fp_mismatch',
          });
        } else {
          fingerprints_honored.push({
            method,
            path_template: c.path_template,
            field: 'request_key_fingerprint',
            value: c.request_key_fingerprint,
          });
        }
      }

      if (c.query_key_fingerprint != null && hit.query_key_fingerprint != null) {
        if (String(hit.query_key_fingerprint) !== String(c.query_key_fingerprint)) {
          fingerprint_mismatches.push({
            method,
            path_template: c.path_template,
            host: c.host || 'default',
            field: 'query_key_fingerprint',
            cwl: c.query_key_fingerprint,
            dna: hit.query_key_fingerprint,
            note: 'query_fp_mismatch',
          });
        } else {
          fingerprints_honored.push({
            method,
            path_template: c.path_template,
            field: 'query_key_fingerprint',
            value: c.query_key_fingerprint,
          });
        }
      }

      if (
        c.content_class != null &&
        hit.content_class != null &&
        String(c.content_class) !== String(hit.content_class)
      ) {
        // RFC-0022: content_class drift is DNA-owned after learn — note only.
        content_class_notes.push({
          method,
          path_template: c.path_template,
          cwl: c.content_class,
          dna: hit.content_class,
        });
      }
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

  const streamAnns = annotations.filter((a) => a && a.cwl_stream);
  const multipartAnns = annotations.filter(
    (a) =>
      a &&
      ((Array.isArray(a.cwl_multipart_fields) && a.cwl_multipart_fields.length) ||
        (Array.isArray(a.cwl_multipart_files) && a.cwl_multipart_files.length)),
  );
  const upstreamAnns = annotations.filter((a) => a && a.cwl_upstream_target);
  const hostByteAnns = annotations.filter((a) => a && a.cwl_host_bytes);
  const credentialAnns = annotations.filter(
    (a) => a && Array.isArray(a.cwl_credential_effects) && a.cwl_credential_effects.length,
  );
  const csrfAnns = annotations.filter(
    (a) => a && Array.isArray(a.cwl_csrf_effects) && a.cwl_csrf_effects.length,
  );

  // Declared media type (1.0.35) vs learned content_class — DNA stays owner after learn, so note only.
  for (const a of annotations) {
    if (!a?.cwl_declared_content_class) continue;
    const method = String(a.method || 'GET').toUpperCase();
    const hit = liveRoutes.find(
      (l) =>
        String(l.method || '').toUpperCase() === method &&
        (pathShape
          ? pathTemplateShapeEqual(a.path_template, l.path_template)
          : String(a.path_template) === String(l.path_template)),
    );
    if (!hit?.content_class) continue;
    if (String(hit.content_class) === String(a.cwl_declared_content_class)) {
      fingerprints_honored.push({
        method,
        path_template: a.path_template,
        field: 'content_type',
        value: a.cwl_content_type,
      });
    } else {
      content_class_notes.push({
        method,
        path_template: a.path_template,
        field: 'content_type',
        cwl: a.cwl_content_type,
        dna: hit.content_class,
        note: 'cwl_declared_media_type_vs_dna_content_class',
      });
    }
  }

  // RFC-0032: which routes mint a session. Tip 1.0.38 may also name the cookie.
  // Cross-check only — DNA routes stay traffic-owned; we never seed a cookie value.
  /** @type {object[]} */
  const session_mint_notes = [];
  for (const a of credentialAnns) {
    if (!a.cwl_credential_effects.some((e) => String(e).startsWith('session.mint'))) continue;
    const method = String(a.method || 'GET').toUpperCase();
    const hit = liveRoutes.find(
      (l) =>
        String(l.method || '').toUpperCase() === method &&
        (pathShape
          ? pathTemplateShapeEqual(a.path_template, l.path_template)
          : String(a.path_template) === String(l.path_template)),
    );
    if (!hit) continue;
    const genomeCookies = Array.isArray(a.cwl_session_cookies)
      ? a.cwl_session_cookies
      : sessionCookieNamesFromEffects(a.cwl_credential_effects);

    if (!Array.isArray(hit.set_cookie_names)) {
      session_mint_notes.push({
        method,
        path_template: a.path_template,
        note: 'dna_predates_response_surface',
        genome_cookies: genomeCookies.length ? genomeCookies : undefined,
        hint: genomeCookies.length
          ? `learn again — genome names cookie [${genomeCookies.join(',')}]`
          : 'learn again to certify which cookie this route mints',
      });
      continue;
    }

    if (hit.set_cookie_names.length === 0) {
      session_mint_notes.push({
        method,
        path_template: a.path_template,
        note: 'genome_mints_session_dna_sets_no_cookie',
        genome_cookies: genomeCookies.length ? genomeCookies : undefined,
        hint: 'learn window may have missed a successful login, or the genome is stale',
      });
      continue;
    }

    if (genomeCookies.length) {
      const missing = genomeCookies.filter((n) => !hit.set_cookie_names.includes(n));
      if (missing.length) {
        session_mint_notes.push({
          method,
          path_template: a.path_template,
          note: 'genome_cookie_not_in_dna',
          genome_cookies: genomeCookies,
          set_cookie_names: hit.set_cookie_names,
          missing,
          hint: 'certificate saw other cookies, or the genome name is wrong — name only, never invent a value',
        });
        continue;
      }
    }

    const genomeAttrs =
      a.cwl_session_cookie_attrs && typeof a.cwl_session_cookie_attrs === 'object'
        ? a.cwl_session_cookie_attrs
        : sessionCookieAttrsFromEffects(a.cwl_credential_effects);
    const attrNames = Object.keys(genomeAttrs);
    /** @type {object[]|undefined} */
    let attr_notes;
    if (attrNames.length) {
      if (!hit.set_cookie_attrs || typeof hit.set_cookie_attrs !== 'object') {
        attr_notes = attrNames.map((name) => ({
          name,
          note: 'dna_predates_cookie_attrs',
          genome: genomeAttrs[name],
          hint: 'learn again — genome declares httponly/secure/path/samesite, never a token value',
        }));
      } else {
        attr_notes = [];
        for (const name of attrNames) {
          const gaps = cookieAttrGaps(genomeAttrs[name], hit.set_cookie_attrs[name]);
          if (gaps.length) {
            attr_notes.push({
              name,
              note: 'genome_cookie_attrs_not_in_dna',
              missing: gaps,
              genome: genomeAttrs[name],
              dna: hit.set_cookie_attrs[name],
              hint: 'certificate flags differ from genome policy — flags only, never a value',
            });
          } else {
            attr_notes.push({
              name,
              note: 'cookie_attrs_honored',
              genome: genomeAttrs[name],
              dna: hit.set_cookie_attrs[name],
            });
          }
        }
      }
    }

    session_mint_notes.push({
      method,
      path_template: a.path_template,
      note: 'session_mint_honored',
      set_cookie_names: hit.set_cookie_names,
      genome_cookies: genomeCookies.length ? genomeCookies : undefined,
      genome_cookie_attrs: attrNames.length ? genomeAttrs : undefined,
      attr_notes: attr_notes?.length ? attr_notes : undefined,
    });
  }

  // Tip 1.0.46 — CSRF cookie **name** vs any cookie the certificate has seen.
  // The verify route often does not Set-Cookie; the form page does. Never a token value.
  /** @type {object[]} */
  const csrf_notes = [];
  const dnaCookieNames = new Set();
  let dnaHasCookieOpinion = false;
  for (const l of liveRoutes) {
    if (!Array.isArray(l.set_cookie_names)) continue;
    dnaHasCookieOpinion = true;
    for (const n of l.set_cookie_names) dnaCookieNames.add(n);
  }
  for (const a of csrfAnns) {
    const genomeCookies = Array.isArray(a.cwl_csrf_cookies)
      ? a.cwl_csrf_cookies
      : csrfCookieNamesFromEffects(a.cwl_csrf_effects);
    if (!genomeCookies.length) continue;
    const method = String(a.method || 'GET').toUpperCase();
    if (!dnaHasCookieOpinion) {
      csrf_notes.push({
        method,
        path_template: a.path_template,
        note: 'dna_predates_response_surface',
        genome_cookies: genomeCookies,
        hint: 'learn again — genome names the CSRF cookie, never the token',
      });
      continue;
    }
    const missing = genomeCookies.filter((n) => !dnaCookieNames.has(n));
    if (missing.length) {
      csrf_notes.push({
        method,
        path_template: a.path_template,
        note: 'csrf_cookie_not_in_dna',
        genome_cookies: genomeCookies,
        missing,
        hint: 'certificate never saw this CSRF cookie name — name only, never invent a value',
      });
    } else {
      csrf_notes.push({
        method,
        path_template: a.path_template,
        note: 'csrf_cookie_honored',
        genome_cookies: genomeCookies,
      });
    }
  }

  // Tip 1.0.47 — auth.require cookie **name** vs any cookie the certificate has seen.
  // The protected route usually does not Set-Cookie; login does. Never a token value.
  /** @type {object[]} */
  const auth_require_notes = [];
  for (const a of credentialAnns) {
    const genomeCookies = Array.isArray(a.cwl_auth_require_cookies)
      ? a.cwl_auth_require_cookies
      : authRequireCookieNamesFromEffects(a.cwl_credential_effects);
    if (!genomeCookies.length) continue;
    const method = String(a.method || 'GET').toUpperCase();
    if (!dnaHasCookieOpinion) {
      auth_require_notes.push({
        method,
        path_template: a.path_template,
        note: 'dna_predates_response_surface',
        genome_cookies: genomeCookies,
        hint: 'learn again — genome names the required session cookie, never the token',
      });
      continue;
    }
    const missing = genomeCookies.filter((n) => !dnaCookieNames.has(n));
    if (missing.length) {
      auth_require_notes.push({
        method,
        path_template: a.path_template,
        note: 'auth_require_cookie_not_in_dna',
        genome_cookies: genomeCookies,
        missing,
        hint: 'certificate never saw this required cookie name — name only, never invent a value',
      });
    } else {
      auth_require_notes.push({
        method,
        path_template: a.path_template,
        note: 'auth_require_cookie_honored',
        genome_cookies: genomeCookies,
      });
    }
  }

  const purposeAnns = annotations.filter(
    (a) => a && (Array.isArray(a.cwl_cookie_purposes) || a.cwl_tracking_cookie),
  );
  /** @type {object[]} */
  const cookie_purpose_notes = [];
  for (const a of purposeAnns) {
    const method = String(a.method || 'GET').toUpperCase();
    const purposes = Array.isArray(a.cwl_cookie_purposes) ? a.cwl_cookie_purposes : [];
    const allowed = new Set(purposes.map((p) => p.name));
    if (a.cwl_tracking_cookie) {
      cookie_purpose_notes.push({
        method,
        path_template: a.path_template,
        note: 'genome_tracking_cookie',
        hint: 'genome already refused this declaration (bare name or samesite none) — no tracking runtime',
      });
    }
    if (!purposes.length) continue;
    const hit = liveRoutes.find(
      (l) =>
        String(l.method || '').toUpperCase() === method &&
        (pathShape
          ? pathTemplateShapeEqual(a.path_template, l.path_template)
          : String(a.path_template) === String(l.path_template)),
    );
    if (!hit || !Array.isArray(hit.set_cookie_names)) {
      cookie_purpose_notes.push({
        method,
        path_template: a.path_template,
        note: 'dna_predates_response_surface',
        purposes,
        hint: 'learn again — purpose is name and class list only, never a token',
      });
      continue;
    }
    const extra = hit.set_cookie_names.filter((n) => !allowed.has(n));
    if (extra.length) {
      cookie_purpose_notes.push({
        method,
        path_template: a.path_template,
        note: 'cookie_name_not_a_purpose',
        extra,
        purposes,
        hint: 'certificate set a name that is not session, csrf, or an enumerated preference',
      });
    } else {
      cookie_purpose_notes.push({
        method,
        path_template: a.path_template,
        note: 'cookie_purpose_honored',
        purposes,
        set_cookie_names: hit.set_cookie_names,
      });
    }
  }

  const redirectAnns = annotations.filter((a) => a && (a.cwl_redirect || a.cwl_open_redirect));
  /** @type {object[]} */
  const redirect_notes = [];
  for (const a of redirectAnns) {
    const method = String(a.method || 'GET').toUpperCase();
    if (a.cwl_open_redirect) {
      redirect_notes.push({
        method,
        path_template: a.path_template,
        note: 'genome_open_redirect',
        hint: 'genome refused an off-site target — do not follow it, and do not copy the URL into DNA',
      });
    }
    if (!a.cwl_redirect) continue;
    const hit = liveRoutes.find(
      (l) =>
        String(l.method || '').toUpperCase() === method &&
        (pathShape
          ? pathTemplateShapeEqual(a.path_template, l.path_template)
          : String(a.path_template) === String(l.path_template)),
    );
    if (!hit || !Array.isArray(hit.redirect_targets)) {
      redirect_notes.push({
        method,
        path_template: a.path_template,
        note: 'dna_predates_response_surface',
        genome_path: a.cwl_redirect.path,
        status: a.cwl_redirect.status,
        hint: 'learn again — a genome redirect is a same-site path, certified as self',
      });
      continue;
    }
    const offSite = hit.redirect_targets.filter((t) => t && t !== 'self');
    if (offSite.length) {
      redirect_notes.push({
        method,
        path_template: a.path_template,
        note: 'genome_same_site_dna_off_site',
        genome_path: a.cwl_redirect.path,
        redirect_targets: hit.redirect_targets,
        hint: 'certificate saw an off-site redirect; the genome path stays same-site and is not followed',
      });
    } else {
      redirect_notes.push({
        method,
        path_template: a.path_template,
        note: 'genome_redirect_honored',
        genome_path: a.cwl_redirect.path,
        status: a.cwl_redirect.status,
        redirect_targets: hit.redirect_targets,
      });
    }
  }

  const identityOk = missing_in_dna.length === 0;
  const fpOk = !strictFingerprints || fingerprint_mismatches.length === 0;
  const ok = identityOk && fpOk;

  return {
    ok,
    matched,
    missing_in_dna,
    in_dna_not_cwl: extra_notes,
    ignore_host: ignoreHost,
    fingerprints_honored,
    fingerprint_mismatches,
    content_class_notes,
    session_mint_notes,
    csrf_notes,
    auth_require_notes,
    cookie_purpose_notes,
    redirect_notes,
    bridge_annotations: {
      cwl_stream: streamAnns,
      multipart: multipartAnns,
      upstream_proxy: upstreamAnns,
      host_bytes: hostByteAnns,
      credential: credentialAnns,
      csrf: csrfAnns,
    },
    deploy_profile: profile
      ? {
          schema: profile.schema,
          host: profile.host,
          path_shape_equality: pathShape,
        }
      : profileHost
        ? { host: profileHost }
        : null,
    cutover: ok
      ? 'cwl_surface_subseteq_dna'
      : identityOk
        ? 'cwl_fingerprint_not_honored'
        : 'cwl_surface_not_covered',
  };
}
