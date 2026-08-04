/**
 * Helix DNA core — trust nothing until certified.
 * v0: method + host + path template; JSON key fingerprint only for json routes.
 * Static assets collapse by extension (double-star glob) so learn stays quiet on hashed bundles.
 */

/** @typedef {{ method: string, path: string, host?: string, status?: number, contentType?: string, body?: unknown }} Observation */
/** @typedef {{ method: string, path_template: string, host: string, content_class: string, status_classes: number[], response_key_fingerprint: string|null }} DnaRoute */
/** @typedef {{ schema: 'app-dna-v1', app_id: string, created_at: string, mode: 'draft'|'certified', parent_hash: string|null, routes: DnaRoute[], holes: object[] }} AppDna */

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

export function responseKeyFingerprint(body) {
  if (body == null) return null;
  if (typeof body !== 'object' || Array.isArray(body)) return 'scalar';
  return Object.keys(body).sort().join(',');
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
      };
      byRoute.set(key, route);
    }
    if (obs.status != null) {
      route.status_classes.add(Math.floor(Number(obs.status) / 100) * 100);
    }
    if (klass === 'json') {
      route.content_class = 'json';
      const fp = responseKeyFingerprint(obs.body);
      if (fp) route.response_key_fingerprint = fp;
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
  }
  return {
    added,
    removed,
    changed,
    distance: added.length + removed.length + changed.length,
  };
}

/**
 * Request-time check: is this route in DNA?
 * @param {AppDna|null|undefined} dna
 * @param {{ method?: string, path?: string, host?: string }} req
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
  const route = dna.routes.find(
    (r) => r.method === method && r.path_template === path_template && (r.host || 'default') === host,
  );
  if (!route) {
    const loose = dna.routes.find((r) => r.method === method && r.path_template === path_template);
    if (!loose) {
      return {
        allow: false,
        hole: {
          code: 'HX-ROUTE-UNKNOWN',
          reason: `Route not in DNA: ${host} ${method} ${path_template}`,
        },
      };
    }
    return { allow: true, hole: null, route: loose };
  }
  return { allow: true, hole: null, route };
}

/**
 * Response-time check: JSON key drift only (never HTML/static bodies).
 * @param {DnaRoute} route
 * @param {{ contentType?: string, body?: unknown }} res
 */
export function scoreResponse(route, res) {
  const klass = contentClass(res.contentType);
  if (klass !== 'json' && route.content_class !== 'json') {
    return { allow: true, hole: null };
  }
  if (route.content_class !== 'json' || !route.response_key_fingerprint) {
    return { allow: true, hole: null };
  }
  const fp = responseKeyFingerprint(res.body);
  if (fp && fp !== route.response_key_fingerprint) {
    return {
      allow: false,
      hole: {
        code: 'HX-SCHEMA-DRIFT',
        reason: `JSON keys drifted on ${route.method} ${route.path_template}: got ${fp}, expected ${route.response_key_fingerprint}`,
      },
    };
  }
  return { allow: true, hole: null };
}

/** @deprecated use scoreRequest + scoreResponse */
export function scoreObservation(dna, obs) {
  const req = scoreRequest(dna, obs);
  if (!req.allow) return req;
  return scoreResponse(req.route, obs);
}
