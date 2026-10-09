/**
 * Helix proxy — learn / shadow / enforce in front of an HTTP(S) upstream.
 * Trust nothing: unknown routes denied in enforce; no DNA => fail closed.
 */
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  scoreRequest,
  scoreResponse,
  pathTemplate,
  contentClass,
  responseKeyFingerprint,
  queryKeyFingerprint,
  verifyDna,
  signDna,
  reportDna,
  assessReadiness,
  loadSensitivityMap,
  loadCookiePurposeMap,
  cookiePurposesForRoute,
  severityForRoute,
  triageShadowLog,
  setCookieObservation,
  learnFromObservations,
  promoteDna,
} from '../dna-core/index.mjs';

const HEALTHZ = '/__helix/healthz';
const RELOAD = '/__helix/reload';
const STATUS = '/__helix/status';
const PANEL = '/__helix';
const PANEL_SLASH = '/__helix/';
const SNAPSHOT = '/__helix/api/snapshot';
const SEAL = '/__helix/api/seal';
const SET_MODE = '/__helix/api/mode';
const PANEL_HTML_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'panel.html');
const ATTACK_HTML_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'attack.html');
const ATTACK_PAGE = '/__helix/attack';
// The panel polls every few seconds, so it digests a bounded tail rather than a soak-sized log.
const SNAPSHOT_TRIAGE_LINES = 500;
const SNAPSHOT_TRIAGE_GROUPS = 8;

function readRecentNdjson(filePath, limit = 12) {
  if (!filePath || !fs.existsSync(filePath)) return { count: 0, recent: [] };
  const lines = fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const recent = [];
  for (let i = lines.length - 1; i >= 0 && recent.length < limit; i--) {
    try {
      recent.push(JSON.parse(lines[i]));
    } catch {
      /* skip bad line */
    }
  }
  return { count: lines.length, recent };
}
function appendNdjson(filePath, obj) {
  if (!filePath) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, JSON.stringify(obj) + '\n');
}

function loadDna(dnaPath, verifyOpts) {
  if (!dnaPath || !fs.existsSync(dnaPath)) return null;
  const dna = JSON.parse(fs.readFileSync(dnaPath, 'utf8'));
  if (verifyOpts) {
    const v = verifyDna(dna, verifyOpts);
    if (!v.ok) {
      const err = new Error(v.hole?.reason || 'DNA verify failed');
      err.hole = v.hole;
      throw err;
    }
  }
  return dna;
}

function requestHost(req) {
  const h = req.headers.host || 'default';
  return String(h).split(':')[0].toLowerCase();
}

function wantsHtml(req) {
  const accept = String(req.headers.accept || '');
  // Browsers send text/html. API clients / curl default */* → keep JSON.
  return /text\/html/i.test(accept);
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Enforce hole response — HTML for browsers, JSON for API clients. */
function writeHole(res, req, status, hole) {
  const code = hole?.code || 'HX-HOLE';
  const reason = hole?.reason || 'Denied by Helix DNA';
  if (wantsHtml(req)) {
    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Blocked · Helix</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
font-family:system-ui,sans-serif;background:#0f1419;color:#e8eef4;padding:1.5rem}
.box{max-width:32rem;border:1px solid rgba(232,238,244,.15);border-radius:12px;padding:1.5rem;background:#1a2330}
h1{margin:0 0 .5rem;font-size:1.4rem;color:#e85d5d}code{font-family:ui-monospace,monospace}
p{color:#8b9aab;line-height:1.45}a{color:#3db89a}
</style></head><body><div class="box">
<h1>Blocked by Helix</h1>
<p>This request is outside the certified DNA certificate.</p>
<p><code>${escapeHtml(code)}</code><br/>${escapeHtml(reason)}</p>
<p><a href="/__helix/">Control panel</a> · <a href="/__helix/attack">Proof page</a></p>
</div></body></html>`;
    res.writeHead(status, {
      'content-type': 'text/html; charset=utf-8',
      'x-helix-hole': code,
      'cache-control': 'no-store',
    });
    res.end(html);
    return;
  }
  res.writeHead(status, {
    'content-type': 'application/json',
    'x-helix-hole': code,
  });
  res.end(JSON.stringify({ hole }));
}

function parseJsonBody(raw, contentType) {
  if (!raw?.length) return undefined;
  if (contentClass(contentType) !== 'json') return undefined;
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    return undefined;
  }
}

async function readJsonRequest(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    return {};
  }
}

/**
 * @param {{
 *   upstream: string,
 *   mode: 'learn'|'shadow'|'enforce',
 *   dnaPath?: string,
 *   observePath?: string,
 *   shadowLogPath?: string,
 *   siemLogPath?: string,
 *   sensitivityPath?: string,
 *   sensitivity?: { routes: object[] },
 *   dnaKey?: string,
 *   dnaKeyId?: string,
 *   requireSignedDna?: boolean,
 *   placement?: 'proxy'|'agent'|'bridge',
 *   tls?: { cert: string|Buffer, key: string|Buffer },
 *   maxBodyBytes?: number,
 *   modePersistPath?: string,
 *   autoSealAfter?: number,
 *   appId?: string,
 * }} opts
 */
export function createHelixProxy(opts) {
  const verifyOpts =
    opts.dnaKey || opts.requireSignedDna
      ? {
          secret: opts.dnaKey || undefined,
          key_id: opts.dnaKeyId,
          require: Boolean(opts.requireSignedDna),
        }
      : null;

  let dna = loadDna(opts.dnaPath, verifyOpts);
  let runtimeMode = opts.mode;
  // Ops overlay (optional): credential surfaces get louder holes. Absent ⇒ all holes normal.
  const sensitivity = opts.sensitivity || loadSensitivityMap(opts.sensitivityPath);
  const cookiePurposes = opts.cookiePurposes || loadCookiePurposeMap(opts.cookiePurposePath);
  const placement = opts.placement || 'proxy';
  const maxBodyBytes =
    opts.maxBodyBytes != null && Number(opts.maxBodyBytes) > 0 ? Number(opts.maxBodyBytes) : 0;
  const autoSealAfter =
    opts.autoSealAfter != null
      ? Number(opts.autoSealAfter)
      : Number(process.env.HELIX_AUTO_SEAL_AFTER || 0) || 0;
  const modePersistPath = opts.modePersistPath || process.env.HELIX_ENV_FILE || '';
  const rootPanel =
    opts.rootPanel === true ||
    process.env.HELIX_ROOT_PANEL === '1' ||
    process.env.HELIX_ROOT_PANEL === 'true';

  function reloadDna() {
    dna = loadDna(opts.dnaPath, verifyOpts);
    return dna;
  }

  function countNdjson(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return 0;
    return fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean).length;
  }

  function readAllObservations(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return [];
    const out = [];
    for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t) continue;
      try {
        out.push(JSON.parse(t));
      } catch {
        /* skip */
      }
    }
    return out;
  }

  function persistMode(mode) {
    if (!modePersistPath || !fs.existsSync(modePersistPath)) return;
    let text = fs.readFileSync(modePersistPath, 'utf8');
    if (/^\s*MODE\s*=/m.test(text)) {
      text = text.replace(/^\s*MODE\s*=\s*\S+/m, `MODE=${mode}`);
    } else {
      text = `${text.trimEnd()}\nMODE=${mode}\n`;
    }
    fs.writeFileSync(modePersistPath, text, 'utf8');
  }

  function setRuntimeMode(mode) {
    if (!['learn', 'shadow', 'enforce'].includes(mode)) {
      const err = new Error(`Invalid mode ${mode}`);
      err.hole = { code: 'HX-BAD-MODE', reason: err.message };
      throw err;
    }
    if ((mode === 'shadow' || mode === 'enforce') && !dna && !(opts.dnaPath && fs.existsSync(opts.dnaPath))) {
      const err = new Error('Seal DNA before leaving learn mode');
      err.hole = { code: 'HX-NO-DNA', reason: err.message };
      throw err;
    }
    if ((mode === 'shadow' || mode === 'enforce') && !dna) reloadDna();
    if ((mode === 'shadow' || mode === 'enforce') && !dna) {
      const err = new Error('No certified DNA on disk');
      err.hole = { code: 'HX-NO-DNA', reason: err.message };
      throw err;
    }
    runtimeMode = mode;
    persistMode(mode);
    return runtimeMode;
  }

  function sealFromObservations(switchTo) {
    if (!opts.observePath) {
      const err = new Error('No observation file configured');
      err.hole = { code: 'HX-NO-OBSERVE', reason: err.message };
      throw err;
    }
    if (!opts.dnaPath) {
      const err = new Error('No DNA path configured');
      err.hole = { code: 'HX-NO-DNA-PATH', reason: err.message };
      throw err;
    }
    const observations = readAllObservations(opts.observePath);
    if (observations.length < 1) {
      const err = new Error('No traffic learned yet — use the app through Helix first');
      err.hole = { code: 'HX-EMPTY-LEARN', reason: err.message };
      throw err;
    }
    const draft = learnFromObservations(observations, {
      app_id: opts.appId || process.env.HELIX_APP_ID || 'helix-app',
      mode: 'draft',
    });
    const from = opts.dnaPath && fs.existsSync(opts.dnaPath) ? loadDna(opts.dnaPath, null) : null;
    const sign = opts.dnaKey
      ? { secret: opts.dnaKey, key_id: opts.dnaKeyId || undefined, alg: 'hmac-sha256' }
      : null;
    const { dna: certified, diff } = promoteDna(draft, { from, sign });
    fs.mkdirSync(path.dirname(opts.dnaPath), { recursive: true });
    fs.writeFileSync(opts.dnaPath, JSON.stringify(certified, null, 2) + '\n', 'utf8');
    dna = certified;
    const mode = switchTo || 'shadow';
    if (mode !== 'learn') setRuntimeMode(mode);
    return {
      sealed: true,
      routes: Array.isArray(certified.routes) ? certified.routes.length : 0,
      observations: observations.length,
      mode: runtimeMode,
      dnaPath: opts.dnaPath,
      diff,
    };
  }

  function maybeAutoSeal() {
    if (autoSealAfter <= 0 || runtimeMode !== 'learn' || dna) return null;
    const n = countNdjson(opts.observePath);
    if (n < autoSealAfter) return null;
    try {
      return sealFromObservations('shadow');
    } catch {
      return null;
    }
  }

  function dnaStatus() {
    return {
      ok: true,
      mode: runtimeMode,
      placement,
      dna: Boolean(dna),
      dnaPath: opts.dnaPath || null,
      routes: Array.isArray(dna?.routes) ? dna.routes.length : 0,
      maxBodyBytes: maxBodyBytes || null,
      credentialSurfaces: Array.isArray(sensitivity?.routes) ? sensitivity.routes.length : 0,
      autoSealAfter: autoSealAfter || null,
      frontDoor: opts.upstream ? true : false,
    };
  }

  function serveHtmlFile(res, filePath, holeCode) {
    try {
      const html = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      });
      res.end(html);
    } catch (err) {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ hole: { code: holeCode, reason: String(err.message || err) } }));
    }
  }

  function servePanel(res) {
    serveHtmlFile(res, PANEL_HTML_PATH, 'HX-PANEL');
  }

  function serveAttackPage(res) {
    serveHtmlFile(res, ATTACK_HTML_PATH, 'HX-ATTACK-PAGE');
  }

  function emitHole(phase, hole, meta) {
    const sev = severityForRoute(sensitivity, {
      method: meta?.method,
      path: meta?.path,
      host: meta?.host,
    });
    const event = {
      at: new Date().toISOString(),
      kind: 'helix.hole',
      mode: runtimeMode,
      placement,
      phase,
      hole,
      severity: sev.severity,
      ...(sev.sensitivity ? { sensitivity: sev.sensitivity, sensitivity_effects: sev.effects } : {}),
      ...meta,
    };
    if (runtimeMode === 'shadow') {
      appendNdjson(opts.shadowLogPath, event);
    }
    appendNdjson(opts.siemLogPath, event);
  }

  const listener = async (req, res) => {
    const pathWithQuery = req.url || '/';
    const pathOnly = pathWithQuery.split('?')[0] || '/';

    // Ops — never DNA-gated (sidecar probes / promote without downtime)
    if (req.method === 'GET' && (pathOnly === PANEL || pathOnly === PANEL_SLASH || pathOnly === '/__helix/panel')) {
      servePanel(res);
      return;
    }
    if (req.method === 'GET' && pathOnly === ATTACK_PAGE) {
      serveAttackPage(res);
      return;
    }
    if (req.method === 'GET' && rootPanel && pathOnly === '/') {
      servePanel(res);
      return;
    }
    if (req.method === 'GET' && pathOnly === HEALTHZ) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(dnaStatus()));
      return;
    }
    if (req.method === 'GET' && pathOnly === STATUS) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(dnaStatus()));
      return;
    }
    if (req.method === 'GET' && pathOnly === SNAPSHOT) {
      const obs = readRecentNdjson(opts.observePath, 15);
      const siem = readRecentNdjson(opts.siemLogPath || opts.shadowLogPath, 15);
      // A soak floods the raw list — hashed bundles bury the one login hole that matters.
      // Group the recent tail into surfaces so the panel shows decisions, not lines.
      const holeTail = readRecentNdjson(opts.siemLogPath || opts.shadowLogPath, SNAPSHOT_TRIAGE_LINES);
      const digest = triageShadowLog(holeTail.recent, { dna, samples: 2 });
      const triage = {
        surfaces: digest.surfaces,
        high: digest.totals.high,
        by_class: digest.totals.by_class,
        next_step: digest.next_step,
        blockers: digest.blockers,
        scanned: holeTail.recent.length,
        of: holeTail.count,
        groups: digest.groups.slice(0, SNAPSHOT_TRIAGE_GROUPS),
      };
      const st = dnaStatus();
      let report = null;
      let ready = null;
      let next = null;
      if (dna) {
        report = reportDna(dna, {
          observations: obs.count,
          shadowHoles: siem.count,
        });
        ready = {
          shadow: assessReadiness('shadow', dna, { minRoutes: 1 }),
          enforce: assessReadiness('enforce', dna, {
            minRoutes: 1,
            shadowHoles: siem.count,
            maxShadowHoles: 0,
          }),
        };
      }
      if (st.mode === 'learn' && !st.dna) {
        next =
          obs.count >= 2
            ? {
                code: 'seal',
                hint: 'Click “Lock DNA” — Helix will start watching for unknown surface.',
              }
            : {
                code: 'keep_learning',
                hint: 'Use your app through this Helix address so it can learn normal traffic.',
              };
      } else if (st.mode === 'learn' && st.dna) {
        next = {
          code: 'watch',
          hint: 'DNA is ready — click “Start watching” (shadow) to alert without blocking.',
        };
      } else if (st.mode === 'shadow') {
        next = {
          code: 'soak_then_enforce',
          hint: 'When the hole list is boring, click “Start blocking” (enforce).',
        };
      } else if (st.mode === 'enforce') {
        next = {
          code: 'gated',
          hint: 'Blocking unknown surface. Try “Simulate attack” to prove it.',
        };
      }
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(
        JSON.stringify({
          at: new Date().toISOString(),
          ...st,
          observations: obs,
          siem,
          triage,
          report,
          ready,
          next,
        }),
      );
      return;
    }
    if (req.method === 'POST' && pathOnly === RELOAD) {
      try {
        reloadDna();
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ reloaded: true, ...dnaStatus() }));
      } catch (err) {
        const hole = err.hole || { code: 'HX-DNA-RELOAD', reason: String(err.message || err) };
        res.writeHead(500, { 'content-type': 'application/json', 'x-helix-hole': hole.code });
        res.end(JSON.stringify({ reloaded: false, hole }));
      }
      return;
    }
    if (req.method === 'POST' && pathOnly === SEAL) {
      try {
        const body = await readJsonRequest(req);
        const switchTo = body?.mode || 'shadow';
        const result = sealFromObservations(switchTo);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ...result, ...dnaStatus() }));
      } catch (err) {
        const hole = err.hole || { code: 'HX-SEAL', reason: String(err.message || err) };
        res.writeHead(400, { 'content-type': 'application/json', 'x-helix-hole': hole.code });
        res.end(JSON.stringify({ sealed: false, hole }));
      }
      return;
    }
    if (req.method === 'POST' && pathOnly === SET_MODE) {
      try {
        const body = await readJsonRequest(req);
        const mode = body?.mode;
        setRuntimeMode(mode);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ set: true, ...dnaStatus() }));
      } catch (err) {
        const hole = err.hole || { code: 'HX-SET-MODE', reason: String(err.message || err) };
        res.writeHead(400, { 'content-type': 'application/json', 'x-helix-hole': hole.code });
        res.end(JSON.stringify({ set: false, hole }));
      }
      return;
    }

    const cl = Number(req.headers['content-length'] || 0);
    if (maxBodyBytes && cl > maxBodyBytes) {
      const hole = {
        code: 'HX-BODY-TOO-LARGE',
        reason: `Request Content-Length ${cl} exceeds HELIX_MAX_BODY_BYTES ${maxBodyBytes}`,
      };
      emitHole('request', hole, { method: req.method, path: pathOnly });
      if (runtimeMode === 'shadow') {
        res.setHeader('x-helix-shadow-hole', hole.code);
      } else if (runtimeMode === 'enforce') {
        res.writeHead(413, { 'content-type': 'application/json', 'x-helix-hole': hole.code });
        res.end(JSON.stringify({ hole }));
        return;
      } else {
        // learn: still reject oversized bodies (DoS / DNA poison) — allow-while-secure does not mean unbounded
        res.writeHead(413, { 'content-type': 'application/json', 'x-helix-hole': hole.code });
        res.end(JSON.stringify({ hole }));
        return;
      }
    }

    const chunks = [];
    let size = 0;
    let oversize = false;
    for await (const c of req) {
      size += c.length;
      if (maxBodyBytes && size > maxBodyBytes) {
        oversize = true;
        break;
      }
      chunks.push(c);
    }
    if (oversize) {
      const hole = {
        code: 'HX-BODY-TOO-LARGE',
        reason: `Request body exceeds HELIX_MAX_BODY_BYTES ${maxBodyBytes}`,
      };
      emitHole('request', hole, { method: req.method || 'GET', path: pathOnly });
      req.resume?.();
      if (runtimeMode === 'shadow') {
        // drain already stopped; still pass empty? Better 413 in shadow too for body limit — D2 is DNA; body limit is ops protect
        res.writeHead(413, { 'content-type': 'application/json', 'x-helix-shadow-hole': hole.code });
        res.end(JSON.stringify({ hole }));
        return;
      }
      res.writeHead(413, { 'content-type': 'application/json', 'x-helix-hole': hole.code });
      res.end(JSON.stringify({ hole }));
      return;
    }

    const raw = Buffer.concat(chunks);
    const host = requestHost(req);
    const method = req.method || 'GET';
    const reqCt = String(req.headers['content-type'] || '');
    const requestBody = parseJsonBody(raw, reqCt);
    const queryFp = queryKeyFingerprint(pathWithQuery);

    if (runtimeMode === 'enforce' || runtimeMode === 'shadow') {
      dna = dna || reloadDna();
      const verdict = scoreRequest(dna, {
        method,
        path: pathOnly,
        host,
        contentType: reqCt,
        body: requestBody,
        query: pathWithQuery.includes('?') ? pathWithQuery.slice(pathWithQuery.indexOf('?')) : '',
      });
      if (!verdict.allow) {
        emitHole('request', verdict.hole, { method, path: pathOnly, host, query: queryFp });
        if (runtimeMode === 'shadow') {
          res.setHeader('x-helix-shadow-hole', verdict.hole.code);
        } else {
          writeHole(res, req, 403, verdict.hole);
          return;
        }
      }
      req._helixRoute = verdict.route || null;
    }

    let upstreamUrl;
    try {
      upstreamUrl = new URL(pathWithQuery, opts.upstream);
    } catch (err) {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ hole: { code: 'HX-BAD-UPSTREAM', reason: String(err.message || err) } }));
      return;
    }

    const lib = upstreamUrl.protocol === 'https:' ? https : http;
    const headers = { ...req.headers, host: upstreamUrl.host };
    delete headers['connection'];
    delete headers['transfer-encoding'];
    delete headers['content-length'];
    if (raw.length) headers['content-length'] = String(raw.length);

    const preq = lib.request(
      {
        protocol: upstreamUrl.protocol,
        hostname: upstreamUrl.hostname,
        port: upstreamUrl.port || (upstreamUrl.protocol === 'https:' ? 443 : 80),
        path: upstreamUrl.pathname + upstreamUrl.search,
        method,
        headers,
      },
      (pres) => {
        const resChunks = [];
        pres.on('data', (c) => resChunks.push(c));
        pres.on('end', () => {
          const buf = Buffer.concat(resChunks);
          const ct = String(pres.headers['content-type'] || '');
          const klass = contentClass(ct);
          let body;
          if (klass === 'json') {
            try {
              body = JSON.parse(buf.toString('utf8'));
            } catch {
              body = undefined;
            }
          }

          if (runtimeMode === 'learn') {
            appendNdjson(opts.observePath, {
              method,
              path: pathOnly,
              host,
              status: pres.statusCode || 0,
              contentType: ct,
              body: klass === 'json' ? body : undefined,
              requestContentType: reqCt || undefined,
              requestBody: requestBody,
              query: pathWithQuery.includes('?') ? pathWithQuery.slice(pathWithQuery.indexOf('?')) : '',
              // Name + policy flags only — a learned observation file must never carry a session token.
              setCookie: setCookieObservation(pres.headers['set-cookie']),
              location: pres.headers['location'] || undefined,
            });
            maybeAutoSeal();
          }

          if ((runtimeMode === 'enforce' || runtimeMode === 'shadow') && req._helixRoute) {
            const purposes = cookiePurposesForRoute(cookiePurposes, req._helixRoute);
            const scoredRoute = purposes
              ? { ...req._helixRoute, cookie_purposes: purposes }
              : req._helixRoute;
            const rv = scoreResponse(scoredRoute, {
              contentType: ct,
              body,
              status: pres.statusCode || 0,
              setCookie: pres.headers['set-cookie'],
              location: pres.headers['location'],
              host,
            });
            if (!rv.allow) {
              emitHole('response', rv.hole, { method, path: pathOnly, host });
              if (runtimeMode === 'shadow') {
                res.setHeader('x-helix-shadow-hole', rv.hole.code);
              } else {
                writeHole(res, req, 403, rv.hole);
                return;
              }
            }
          }

          const outHeaders = { ...pres.headers };
          delete outHeaders['transfer-encoding'];
          res.writeHead(pres.statusCode || 502, outHeaders);
          res.end(buf);
        });
      },
    );

    preq.on('error', (err) => {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ hole: { code: 'HX-UPSTREAM', reason: String(err.message || err) } }));
    });
    if (raw.length) preq.write(raw);
    preq.end();
  };

  /** @type {import('node:http').Server} */
  let server;
  if (opts.tls?.cert && opts.tls?.key) {
    server = https.createServer({ cert: opts.tls.cert, key: opts.tls.key }, listener);
  } else {
    server = http.createServer(listener);
  }

  server.reloadDna = reloadDna;
  return server;
}

export {
  pathTemplate,
  contentClass,
  responseKeyFingerprint,
  queryKeyFingerprint,
  signDna,
  verifyDna,
  HEALTHZ,
  RELOAD,
  STATUS,
  SEAL,
  SET_MODE,
};
