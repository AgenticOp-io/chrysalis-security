/**
 * Helix DNA core — trust nothing until certified.
 * v0: method + host + path template; JSON key fingerprint only for json routes.
 * Static assets collapse by extension (double-star glob) so learn stays quiet on hashed bundles.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';

/** @typedef {{ method: string, path: string, host?: string, status?: number, contentType?: string, body?: unknown, requestContentType?: string, requestBody?: unknown, query?: string|Record<string, unknown>|null }} Observation */
/** @typedef {{ method: string, path_template: string, host: string, content_class: string, status_classes: number[], response_key_fingerprint: string|null, request_key_fingerprint?: string|null, query_key_fingerprint?: string|null }} DnaRoute */
/** @typedef {{ schema: 'app-dna-v1', app_id: string, created_at: string, mode: 'draft'|'certified', parent_hash: string|null, routes: DnaRoute[], holes: object[], signature?: { alg: string, key_id: string, value: string } }} AppDna */

/** File extensions treated as static assets (collapsed in DNA). */
export const STATIC_EXT_RE =
  /\.(js|mjs|cjs|css|map|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|eot|wasm)$/i;

export function pathTemplate(path) {
  const raw = String(path || '/').split('?')[0] || '/';
  const staticMatch = raw.match(STATIC_EXT_RE);
  if (staticMatch) {
    const ext = staticMatch[1].toLowerCase().replace('jpeg', 'jpg');
    return `/**/*.${ext === 'jpeg' ? 'jpg' : ext}`;
  }
  return raw
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/[0-9a-f]{16,}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
}

export function isStaticAssetPath(path) {
  return STATIC_EXT_RE.test(String(path || '/').split('?')[0] || '/');
}

export function contentClass(contentType) {
  const ct = String(contentType || '').toLowerCase();
  if (ct.includes('json')) return 'json';
  if (ct.includes('html')) return 'html';
  return 'other';
}

/**
 * Sorted JSON key paths (depth ≤ 2). Arrays/scalars are leaves (not descended).
 * Flat `{a,b}` → `a,b` (unchanged). Nested `{data:{x:1}}` → `data,data.x`.
 * @param {unknown} body
 * @param {{ maxDepth?: number }} [opts]
 * @returns {string|null}
 */
export function responseKeyFingerprint(body, opts = {}) {
  if (body == null) return null;
  if (typeof body !== 'object' || Array.isArray(body)) return 'scalar';
  const maxDepth = opts.maxDepth == null ? 2 : Number(opts.maxDepth);
  const paths = [];
  collectKeyPaths(body, '', 1, maxDepth, paths);
  return paths.sort().join(',');
}

/**
 * @param {Record<string, unknown>} obj
 * @param {string} prefix
 * @param {number} depth 1 = top-level
 * @param {number} maxDepth
 * @param {string[]} out
 */
function collectKeyPaths(obj, prefix, depth, maxDepth, out) {
  for (const k of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    out.push(path);
    if (depth >= maxDepth) continue;
    const v = obj[k];
    if (v != null && typeof v === 'object' && !Array.isArray(v)) {
      collectKeyPaths(v, path, depth + 1, maxDepth, out);
    }
  }
}

/**
 * Sorted unique query *names* (values ignored). From path `?a=1&b=`, search string, or object keys.
 * @param {string|Record<string, unknown>|URLSearchParams|null|undefined} input
 * @returns {string} comma-joined names (possibly empty)
 */
export function queryKeyFingerprint(input) {
  const names = new Set();
  if (input == null || input === '') return '';
  if (typeof input === 'object' && !(input instanceof URLSearchParams) && !Array.isArray(input)) {
    for (const k of Object.keys(input)) names.add(k);
    return [...names].sort().join(',');
  }
  if (input instanceof URLSearchParams) {
    for (const k of input.keys()) names.add(k);
    return [...names].sort().join(',');
  }
  let search = String(input);
  if (search.includes('?')) {
    search = search.slice(search.indexOf('?') + 1);
  } else if (search.startsWith('/')) {
    // Path without query string — no names
    return '';
  }
  if (search.includes('#')) search = search.slice(0, search.indexOf('#'));
  if (!search) return '';
  for (const part of search.split('&')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    const raw = eq === -1 ? part : part.slice(0, eq);
    try {
      const k = decodeURIComponent(raw.replace(/\+/g, ' '));
      if (k) names.add(k);
    } catch {
      if (raw) names.add(raw);
    }
  }
  return [...names].sort().join(',');
}

export function routeKey(routeOrParts) {
  const host = routeOrParts.host || 'default';
  const method = String(routeOrParts.method || 'GET').toUpperCase();
  const path_template = routeOrParts.path_template || pathTemplate(routeOrParts.path || '/');
  return `${host} ${method} ${path_template}`;
}

/**
 * @param {Observation[]} observations
 * @param {{ app_id?: string, mode?: 'draft'|'certified' }} [opts]
 * @returns {AppDna}
 */
export function learnFromObservations(observations, opts = {}) {
  /** @type {Map<string, any>} */
  const byRoute = new Map();

  for (const obs of observations) {
    const method = String(obs.method || 'GET').toUpperCase();
    const host = String(obs.host || 'default').toLowerCase();
    const path_template = pathTemplate(obs.path);
    const klass = contentClass(obs.contentType);
    const key = `${host} ${method} ${path_template}`;
    let route = byRoute.get(key);
    if (!route) {
      route = {
        host,
        method,
        path_template,
        content_class: klass,
        status_classes: new Set(),
        response_key_fingerprint: klass === 'json' ? responseKeyFingerprint(obs.body) : null,
        request_key_fingerprint: null,
        query_names: new Set(),
      };
      byRoute.set(key, route);
    }
    if (obs.status != null) {
      route.status_classes.add(Math.floor(Number(obs.status) / 100) * 100);
    }
    if (klass === 'json') {
      route.content_class = 'json';
      const fp = responseKeyFingerprint(obs.body);
      if (fp != null) route.response_key_fingerprint = fp;
    }
    const reqKlass = contentClass(obs.requestContentType);
    if (reqKlass === 'json' && obs.requestBody != null) {
      const rfp = responseKeyFingerprint(obs.requestBody);
      if (rfp != null) route.request_key_fingerprint = rfp;
    }
    const qSrc = obs.query != null ? obs.query : obs.path;
    const qfp = queryKeyFingerprint(qSrc);
    if (qfp) {
      for (const n of qfp.split(',')) route.query_names.add(n);
    }
  }

  const routes = [...byRoute.values()]
    .map((r) => ({
      host: r.host,
      method: r.method,
      path_template: r.path_template,
      content_class: r.content_class,
      status_classes: [...r.status_classes].sort((a, b) => a - b),
      response_key_fingerprint: r.content_class === 'json' ? r.response_key_fingerprint : null,
      request_key_fingerprint: r.request_key_fingerprint || null,
      query_key_fingerprint: [...r.query_names].sort().join(','),
    }))
    .sort((a, b) => routeKey(a).localeCompare(routeKey(b)));

  return {
    schema: 'app-dna-v1',
    app_id: opts.app_id || 'demo',
    created_at: new Date().toISOString(),
    mode: opts.mode || 'draft',
    parent_hash: null,
    routes,
    holes: [],
  };
}

/**
 * @param {AppDna} a
 * @param {AppDna} b
 */
export function diffDna(a, b) {
  const key = (r) => routeKey(r);
  const aMap = new Map((a.routes || []).map((r) => [key(r), r]));
  const bMap = new Map((b.routes || []).map((r) => [key(r), r]));
  const added = [...bMap.keys()].filter((k) => !aMap.has(k));
  const removed = [...aMap.keys()].filter((k) => !bMap.has(k));
  const changed = [];
  for (const k of aMap.keys()) {
    if (!bMap.has(k)) continue;
    const left = aMap.get(k);
    const right = bMap.get(k);
    if ((left.response_key_fingerprint || null) !== (right.response_key_fingerprint || null)) {
      changed.push({
        route: k,
        field: 'response_key_fingerprint',
        from: left.response_key_fingerprint,
        to: right.response_key_fingerprint,
      });
    }
    if ((left.request_key_fingerprint || null) !== (right.request_key_fingerprint || null)) {
      changed.push({
        route: k,
        field: 'request_key_fingerprint',
        from: left.request_key_fingerprint,
        to: right.request_key_fingerprint,
      });
    }
    if ((left.query_key_fingerprint || null) !== (right.query_key_fingerprint || null)) {
      changed.push({
        route: k,
        field: 'query_key_fingerprint',
        from: left.query_key_fingerprint,
        to: right.query_key_fingerprint,
      });
    }
  }
  return {
    added,
    removed,
    changed,
    distance: added.length + removed.length + changed.length,
  };
}

/**
 * Request-time check: route in DNA? Optional query-name + JSON request-key fingerprints.
 * @param {AppDna|null|undefined} dna
 * @param {{ method?: string, path?: string, host?: string, contentType?: string, body?: unknown, query?: string|Record<string, unknown>|null }} req
 */
export function scoreRequest(dna, req) {
  if (!dna || !Array.isArray(dna.routes)) {
    return {
      allow: false,
      hole: { code: 'HX-NO-DNA', reason: 'No certified DNA loaded' },
    };
  }
  const method = String(req.method || 'GET').toUpperCase();
  const host = String(req.host || 'default').toLowerCase();
  const path_template = pathTemplate(req.path);
  let route = dna.routes.find(
    (r) => r.method === method && r.path_template === path_template && (r.host || 'default') === host,
  );
  if (!route) {
    route = dna.routes.find((r) => r.method === method && r.path_template === path_template);
    if (!route) {
      return {
        allow: false,
        hole: {
          code: 'HX-ROUTE-UNKNOWN',
          reason: `Route not in DNA: ${host} ${method} ${path_template}`,
        },
      };
    }
  }
  if (route.query_key_fingerprint != null) {
    const qSrc = req.query != null ? req.query : req.path;
    const qfp = queryKeyFingerprint(qSrc);
    if (qfp !== route.query_key_fingerprint) {
      return {
        allow: false,
        hole: {
          code: 'HX-QUERY-SCHEMA-DRIFT',
          reason: `Query names drifted on ${route.method} ${route.path_template}: got ${qfp || '(none)'}, expected ${route.query_key_fingerprint || '(none)'}`,
        },
        route,
      };
    }
  }
  if (route.request_key_fingerprint != null && route.request_key_fingerprint !== '') {
    const klass = contentClass(req.contentType);
    if (klass === 'json' || (req.body && typeof req.body === 'object')) {
      const fp = responseKeyFingerprint(req.body);
      if (fp == null || fp !== route.request_key_fingerprint) {
        return {
          allow: false,
          hole: {
            code: 'HX-REQUEST-SCHEMA-DRIFT',
            reason: `JSON request keys drifted on ${route.method} ${route.path_template}: got ${fp ?? '(none)'}, expected ${route.request_key_fingerprint}`,
          },
          route,
        };
      }
    }
  }
  return { allow: true, hole: null, route };
}

/**
 * Response-time check: status class, content class, JSON key fingerprint (fail-closed on certified json).
 * @param {DnaRoute} route
 * @param {{ contentType?: string, body?: unknown, status?: number }} res
 */
export function scoreResponse(route, res) {
  if (Array.isArray(route.status_classes) && route.status_classes.length > 0 && res.status != null) {
    const sc = Math.floor(Number(res.status) / 100) * 100;
    if (!route.status_classes.includes(sc)) {
      return {
        allow: false,
        hole: {
          code: 'HX-STATUS-DRIFT',
          reason: `Status class drifted on ${route.method} ${route.path_template}: got ${sc}, expected one of [${route.status_classes.join(',')}]`,
        },
      };
    }
  }

  const klass = contentClass(res.contentType);
  if (klass !== 'json' && route.content_class !== 'json') {
    return { allow: true, hole: null };
  }

  if (route.content_class === 'json') {
    if (klass !== 'json') {
      return {
        allow: false,
        hole: {
          code: 'HX-CONTENT-CLASS-DRIFT',
          reason: `Content class drifted on ${route.method} ${route.path_template}: got ${klass}, expected json`,
        },
      };
    }
    if (route.response_key_fingerprint != null) {
      const fp = responseKeyFingerprint(res.body);
      if (fp == null || fp !== route.response_key_fingerprint) {
        return {
          allow: false,
          hole: {
            code: 'HX-SCHEMA-DRIFT',
            reason: `JSON keys drifted on ${route.method} ${route.path_template}: got ${fp ?? '(none/unparseable)'}, expected ${route.response_key_fingerprint}`,
          },
        };
      }
    }
  }
  return { allow: true, hole: null };
}

/** @deprecated use scoreRequest + scoreResponse */
export function scoreObservation(dna, obs) {
  const req = scoreRequest(dna, obs);
  if (!req.allow) return req;
  return scoreResponse(req.route, obs);
}

/**
 * Canonical JSON for signing — omit signature block; deep-sorted keys.
 * @param {AppDna & { signature?: object }} dna
 */
export function dnaSigningPayload(dna) {
  const { signature: _sig, ...rest } = dna || {};
  return stableStringify(rest);
}

/**
 * SHA-256 of the signing payload (used as parent_hash lineage).
 * @param {AppDna} dna
 * @returns {string} hex digest
 */
export function hashDna(dna) {
  return crypto.createHash('sha256').update(dnaSigningPayload(dna)).digest('hex');
}

/**
 * Verify child.parent_hash === hashDna(parent).
 * @param {AppDna} child
 * @param {AppDna} parent
 */
export function verifyParentChain(child, parent) {
  if (!parent) {
    return {
      ok: false,
      hole: { code: 'HX-DNA-PARENT', reason: 'Parent DNA required for chain verify' },
    };
  }
  const expected = hashDna(parent);
  const got = child?.parent_hash;
  if (!got) {
    return {
      ok: false,
      hole: { code: 'HX-DNA-PARENT', reason: 'Child missing parent_hash' },
    };
  }
  if (String(got) !== expected) {
    return {
      ok: false,
      hole: {
        code: 'HX-DNA-PARENT',
        reason: 'parent_hash does not match parent certificate',
      },
    };
  }
  return { ok: true, parent_hash: expected };
}

/**
 * Promote a draft to certified DNA (optional lineage + sign).
 * @param {AppDna} draft
 * @param {{
 *   from?: AppDna|null,
 *   sign?: Parameters<typeof signDna>[1]|null,
 * }} [opts]
 * @returns {{ dna: AppDna, diff: ReturnType<typeof diffDna>|null }}
 */
export function promoteDna(draft, opts = {}) {
  const from = opts.from || null;
  /** @type {AppDna} */
  let dna = {
    ...draft,
    mode: 'certified',
    created_at: new Date().toISOString(),
    parent_hash: from ? hashDna(from) : draft.parent_hash ?? null,
  };
  delete dna.signature;

  const diff = from ? diffDna(from, { ...draft, mode: draft.mode || 'draft' }) : null;

  if (opts.sign) {
    dna = signDna(dna, opts.sign);
  }
  return { dna, diff };
}

/** Supported DNA signature algorithms. */
export const DNA_SIG_ALGS = Object.freeze(['hmac-sha256', 'ed25519']);

/** PKCS8 prefix for raw 32-byte Ed25519 seed → DER private key. */
const ED25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
/** SPKI prefix for raw 32-byte Ed25519 public key → DER. */
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

/**
 * Parse Ed25519 key material: PEM, DER, or raw 32-byte (hex / base64 / Buffer).
 * @param {string|Buffer|crypto.KeyObject} material
 * @param {'private'|'public'} kind
 * @returns {crypto.KeyObject}
 */
export function loadEd25519Key(material, kind = 'private') {
  if (material && typeof material === 'object' && typeof material.type === 'string' && material.asymmetricKeyType) {
    return material;
  }
  const raw = normalizeKeyBytes(material);
  if (!raw || !raw.length) throw new Error(`ed25519 ${kind} key material required`);

  const asPem = raw.toString('utf8');
  if (asPem.includes('BEGIN')) {
    return kind === 'public' ? crypto.createPublicKey(asPem) : crypto.createPrivateKey(asPem);
  }

  if (raw.length === 32) {
    if (kind === 'public') {
      return crypto.createPublicKey({
        key: Buffer.concat([ED25519_SPKI_PREFIX, raw]),
        format: 'der',
        type: 'spki',
      });
    }
    return crypto.createPrivateKey({
      key: Buffer.concat([ED25519_PKCS8_PREFIX, raw]),
      format: 'der',
      type: 'pkcs8',
    });
  }

  // Full DER (PKCS8 / SPKI)
  try {
    if (kind === 'public') {
      return crypto.createPublicKey({ key: raw, format: 'der', type: 'spki' });
    }
    return crypto.createPrivateKey({ key: raw, format: 'der', type: 'pkcs8' });
  } catch (err) {
    throw new Error(`Invalid ed25519 ${kind} key: ${err.message || err}`);
  }
}

/**
 * @returns {{ privateKey: crypto.KeyObject, publicKey: crypto.KeyObject, privatePem: string, publicPem: string }}
 */
export function generateEd25519KeyPair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  return {
    privateKey,
    publicKey,
    privatePem: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    publicPem: publicKey.export({ type: 'spki', format: 'pem' }),
  };
}

function normalizeKeyBytes(material) {
  if (material == null) return null;
  if (Buffer.isBuffer(material)) return material;
  const s = String(material).trim();
  if (!s) return null;
  if (s.includes('BEGIN')) return Buffer.from(s, 'utf8');
  // hex (64 chars = 32 bytes raw; longer = DER)
  if (/^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0) {
    return Buffer.from(s, 'hex');
  }
  // base64
  try {
    const b = Buffer.from(s, 'base64');
    if (b.length === 32 || b.length === 48 || b.length === 44) return b;
  } catch {
    /* fall through */
  }
  return Buffer.from(s, 'utf8');
}

function resolveSignAlg(opts) {
  const alg = String(opts?.alg || 'hmac-sha256').toLowerCase();
  if (!DNA_SIG_ALGS.includes(alg)) {
    throw new Error(`Unsupported signature alg: ${alg}`);
  }
  return alg;
}

/**
 * Sign a certified DNA certificate (HMAC-SHA256 or Ed25519).
 * @param {AppDna} dna
 * @param {{
 *   alg?: 'hmac-sha256'|'ed25519',
 *   secret?: string|Buffer,
 *   privateKey?: string|Buffer|crypto.KeyObject,
 *   key?: string|Buffer,
 *   key_id?: string,
 * }} opts
 */
export function signDna(dna, opts) {
  const alg = resolveSignAlg(opts || {});
  const keyId = opts.key_id || 'default';
  const body = { ...dna, mode: dna.mode || 'certified' };
  delete body.signature;
  const payload = stableStringify(body);

  if (alg === 'ed25519') {
    const material = opts.privateKey ?? opts.key ?? opts.secret;
    if (!material) throw new Error('signDna ed25519 requires privateKey (or key/secret)');
    const priv = loadEd25519Key(material, 'private');
    const value = crypto.sign(null, Buffer.from(payload, 'utf8'), priv).toString('hex');
    return {
      ...body,
      signature: { alg: 'ed25519', key_id: keyId, value },
    };
  }

  const secret = opts.secret ?? opts.key;
  if (!secret) throw new Error('signDna requires secret');
  const value = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return {
    ...body,
    signature: {
      alg: 'hmac-sha256',
      key_id: keyId,
      value,
    },
  };
}

/**
 * Verify DNA signature. Unsigned DNA returns { ok: true, unsigned: true }.
 * HMAC uses `secret`; Ed25519 uses `publicKey` (or privateKey / secret as PEM/raw).
 * @param {AppDna & { signature?: { alg?: string, key_id?: string, value?: string } }} dna
 * @param {{
 *   secret?: string|Buffer,
 *   publicKey?: string|Buffer|crypto.KeyObject,
 *   privateKey?: string|Buffer|crypto.KeyObject,
 *   key?: string|Buffer,
 *   key_id?: string,
 *   require?: boolean,
 * }} opts
 */
export function verifyDna(dna, opts = {}) {
  const sig = dna?.signature;
  if (!sig || !sig.value) {
    if (opts.require) {
      return {
        ok: false,
        hole: { code: 'HX-DNA-UNSIGNED', reason: 'Certified DNA requires signature' },
      };
    }
    return { ok: true, unsigned: true };
  }

  const alg = String(sig.alg || 'hmac-sha256').toLowerCase();
  if (!DNA_SIG_ALGS.includes(alg)) {
    return {
      ok: false,
      hole: { code: 'HX-DNA-ALG', reason: `Unsupported signature alg: ${sig.alg}` },
    };
  }

  if (opts.key_id && sig.key_id && opts.key_id !== sig.key_id) {
    return {
      ok: false,
      hole: {
        code: 'HX-DNA-KEY-ID',
        reason: `key_id mismatch: got ${sig.key_id}, expected ${opts.key_id}`,
      },
    };
  }

  const { signature: _s, ...rest } = dna;
  const payload = stableStringify(rest);

  if (alg === 'ed25519') {
    const material = opts.publicKey ?? opts.privateKey ?? opts.key ?? opts.secret;
    if (!material) {
      return {
        ok: false,
        hole: { code: 'HX-DNA-KEY-MISSING', reason: 'DNA is signed but no public key provided' },
      };
    }
    let pub;
    try {
      if (opts.publicKey) {
        pub = loadEd25519Key(opts.publicKey, 'public');
      } else if (opts.privateKey) {
        pub = crypto.createPublicKey(loadEd25519Key(opts.privateKey, 'private'));
      } else {
        // Auto: PEM public, PEM private, or raw 32-byte public
        const text = Buffer.isBuffer(material) ? material.toString('utf8') : String(material);
        if (text.includes('BEGIN PUBLIC KEY')) {
          pub = loadEd25519Key(material, 'public');
        } else if (text.includes('BEGIN PRIVATE KEY')) {
          pub = crypto.createPublicKey(loadEd25519Key(material, 'private'));
        } else {
          const bytes = normalizeKeyBytes(material);
          if (bytes && bytes.length === 32) {
            pub = loadEd25519Key(bytes, 'public');
          } else {
            try {
              pub = loadEd25519Key(material, 'public');
            } catch {
              pub = crypto.createPublicKey(loadEd25519Key(material, 'private'));
            }
          }
        }
      }
    } catch (err) {
      return {
        ok: false,
        hole: {
          code: 'HX-DNA-KEY-MISSING',
          reason: `Invalid ed25519 key: ${err.message || err}`,
        },
      };
    }
    let sigBuf;
    try {
      sigBuf = Buffer.from(String(sig.value), 'hex');
    } catch {
      sigBuf = Buffer.alloc(0);
    }
    if (sigBuf.length !== 64) {
      return {
        ok: false,
        hole: { code: 'HX-DNA-BAD-SIG', reason: 'DNA signature verification failed' },
      };
    }
    const ok = crypto.verify(null, Buffer.from(payload, 'utf8'), pub, sigBuf);
    if (!ok) {
      return {
        ok: false,
        hole: { code: 'HX-DNA-BAD-SIG', reason: 'DNA signature verification failed' },
      };
    }
    return { ok: true, unsigned: false, key_id: sig.key_id || 'default', alg: 'ed25519' };
  }

  // hmac-sha256
  const secret = opts.secret ?? opts.key;
  if (!secret) {
    return {
      ok: false,
      hole: { code: 'HX-DNA-KEY-MISSING', reason: 'DNA is signed but no secret provided' },
    };
  }
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(String(sig.value), 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return {
      ok: false,
      hole: { code: 'HX-DNA-BAD-SIG', reason: 'DNA signature verification failed' },
    };
  }
  return { ok: true, unsigned: false, key_id: sig.key_id || 'default', alg: 'hmac-sha256' };
}

/**
 * Operator coverage report from DNA (and optional observation count).
 * @param {AppDna|null|undefined} dna
 * @param {{ observations?: number, shadowHoles?: number }} [extra]
 */
export function reportDna(dna, extra = {}) {
  const routes = Array.isArray(dna?.routes) ? dna.routes : [];
  const byClass = { json: 0, html: 0, other: 0 };
  let withRequestFp = 0;
  let withQueryFp = 0;
  let withResponseFp = 0;
  for (const r of routes) {
    const c = r.content_class || 'other';
    byClass[c] = (byClass[c] || 0) + 1;
    if (r.response_key_fingerprint) withResponseFp += 1;
    if (r.request_key_fingerprint) withRequestFp += 1;
    if (r.query_key_fingerprint != null && r.query_key_fingerprint !== '') withQueryFp += 1;
  }
  const signed = Boolean(dna?.signature?.value);
  const mode = dna?.mode || null;
  let next = 'learn';
  if (routes.length === 0) next = 'learn';
  else if (mode !== 'certified') next = 'promote';
  else next = 'shadow';

  return {
    kind: 'helix.report',
    app_id: dna?.app_id || null,
    mode,
    signed,
    routes: routes.length,
    by_content_class: byClass,
    fingerprints: {
      response: withResponseFp,
      request: withRequestFp,
      query_named: withQueryFp,
    },
    observations: extra.observations ?? null,
    shadow_holes: extra.shadowHoles ?? null,
    next_step: next,
    product_bar:
      routes.length >= 3 && mode === 'certified'
        ? 'ready_for_shadow'
        : routes.length >= 1
          ? 'thin_dna_continue_learn_or_promote'
          : 'no_dna_keep_learning',
  };
}

/**
 * Gate before flipping modes. Exit semantics for CLI: ok → 0, not ready → 2.
 * @param {'shadow'|'enforce'} target
 * @param {AppDna|null|undefined} dna
 * @param {{ minRoutes?: number, requireSigned?: boolean, shadowHoles?: number, maxShadowHoles?: number }} [opts]
 */
export function assessReadiness(target, dna, opts = {}) {
  const minRoutes = opts.minRoutes != null ? Number(opts.minRoutes) : target === 'enforce' ? 3 : 1;
  const requireSigned = Boolean(opts.requireSigned);
  const maxShadowHoles = opts.maxShadowHoles != null ? Number(opts.maxShadowHoles) : Infinity;
  const shadowHoles = opts.shadowHoles != null ? Number(opts.shadowHoles) : null;
  const checks = [];
  const fail = (id, reason) => {
    checks.push({ id, ok: false, reason });
  };
  const pass = (id, detail) => {
    checks.push({ id, ok: true, detail });
  };

  if (!dna || !Array.isArray(dna.routes)) {
    fail('dna_present', 'No DNA loaded');
  } else {
    pass('dna_present', `${dna.routes.length} routes`);
    if (dna.mode !== 'certified') fail('certified', `mode=${dna.mode}`);
    else pass('certified', 'certified');
    if (dna.routes.length < minRoutes) {
      fail('min_routes', `have ${dna.routes.length}, need >= ${minRoutes}`);
    } else {
      pass('min_routes', `${dna.routes.length} >= ${minRoutes}`);
    }
    if (requireSigned) {
      if (!dna.signature?.value) fail('signed', 'HELIX_DNA_REQUIRE / --require-signed but DNA unsigned');
      else pass('signed', dna.signature.alg || 'signed');
    } else {
      pass('signed', dna.signature?.value ? dna.signature.alg : 'optional_unsigned_ok');
    }
  }

  if (target === 'enforce' && shadowHoles != null) {
    if (shadowHoles > maxShadowHoles) {
      fail('shadow_clean', `${shadowHoles} shadow holes > max ${maxShadowHoles}`);
    } else {
      pass('shadow_clean', `${shadowHoles} <= ${maxShadowHoles}`);
    }
  }

  const ok = checks.every((c) => c.ok);
  return {
    kind: 'helix.ready',
    target,
    ok,
    checks,
    advice: ok
      ? target === 'shadow'
        ? 'Set MODE=shadow; watch SIEM_LOG / SHADOW_LOG; then helix ready --target enforce'
        : 'Set MODE=enforce; keep DNA signed if required; POST /__helix/reload after promote'
      : 'Stay in learn/shadow until checks pass — see docs/MODES.md and docs/PRODUCT.md',
  };
}

/**
 * Count helix.hole events from NDJSON text, lines, or objects.
 * @param {string|string[]|object[]} input
 */
export function countShadowHoleEvents(input) {
  let lines = [];
  if (typeof input === 'string') {
    lines = input
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  } else if (Array.isArray(input)) {
    lines = input;
  }
  const byCode = {};
  let count = 0;
  for (const row of lines) {
    let obj = row;
    if (typeof row === 'string') {
      try {
        obj = JSON.parse(row);
      } catch {
        continue;
      }
    }
    if (!obj || typeof obj !== 'object') continue;
    if (obj.kind === 'helix.hole' || obj.hole?.code) {
      count += 1;
      const code = obj.hole?.code || 'UNKNOWN';
      byCode[code] = (byCode[code] || 0) + 1;
    }
  }
  return { count, byCode, missing: false };
}

/**
 * Count helix.hole events in a shadow/SIEM NDJSON file.
 * @param {string} filePath
 */
export function countShadowHoles(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return { count: 0, byCode: {}, missing: true };
  }
  return countShadowHoleEvents(fs.readFileSync(filePath, 'utf8'));
}

function stableStringify(obj) {
  return JSON.stringify(sortKeysDeep(obj));
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) {
      out[k] = sortKeysDeep(value[k]);
    }
    return out;
  }
  return value;
}
