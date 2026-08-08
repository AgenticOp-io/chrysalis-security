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
} from '../dna-core/index.mjs';

const HEALTHZ = '/__helix/healthz';
const RELOAD = '/__helix/reload';
const STATUS = '/__helix/status';
const PANEL = '/__helix';
const PANEL_SLASH = '/__helix/';
const SNAPSHOT = '/__helix/api/snapshot';
const PANEL_HTML_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'panel.html');

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

function parseJsonBody(raw, contentType) {
  if (!raw?.length) return undefined;
  if (contentClass(contentType) !== 'json') return undefined;
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    return undefined;
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
 *   dnaKey?: string,
 *   dnaKeyId?: string,
 *   requireSignedDna?: boolean,
 *   placement?: 'proxy'|'agent'|'bridge',
 *   tls?: { cert: string|Buffer, key: string|Buffer },
 *   maxBodyBytes?: number,
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
  const placement = opts.placement || 'proxy';
  const maxBodyBytes =
    opts.maxBodyBytes != null && Number(opts.maxBodyBytes) > 0 ? Number(opts.maxBodyBytes) : 0;
  const rootPanel =
    opts.rootPanel === true ||
    process.env.HELIX_ROOT_PANEL === '1' ||
    process.env.HELIX_ROOT_PANEL === 'true';

  function reloadDna() {
    dna = loadDna(opts.dnaPath, verifyOpts);
    return dna;
  }

  function dnaStatus() {
    return {
      ok: true,
      mode: opts.mode,
      placement,
      dna: Boolean(dna),
      dnaPath: opts.dnaPath || null,
      routes: Array.isArray(dna?.routes) ? dna.routes.length : 0,
      maxBodyBytes: maxBodyBytes || null,
    };
  }

  function servePanel(res) {
    try {
      const html = fs.readFileSync(PANEL_HTML_PATH, 'utf8');
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      });
      res.end(html);
    } catch (err) {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ hole: { code: 'HX-PANEL', reason: String(err.message || err) } }));
    }
  }

  function emitHole(phase, hole, meta) {
    const event = {
      at: new Date().toISOString(),
      kind: 'helix.hole',
      mode: opts.mode,
      placement,
      phase,
      hole,
      ...meta,
    };
    if (opts.mode === 'shadow') {
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
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(
        JSON.stringify({
          at: new Date().toISOString(),
          ...dnaStatus(),
          observations: obs,
          siem,
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

    const cl = Number(req.headers['content-length'] || 0);
    if (maxBodyBytes && cl > maxBodyBytes) {
      const hole = {
        code: 'HX-BODY-TOO-LARGE',
        reason: `Request Content-Length ${cl} exceeds HELIX_MAX_BODY_BYTES ${maxBodyBytes}`,
      };
      emitHole('request', hole, { method: req.method, path: pathOnly });
      if (opts.mode === 'shadow') {
        res.setHeader('x-helix-shadow-hole', hole.code);
      } else if (opts.mode === 'enforce') {
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
      if (opts.mode === 'shadow') {
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

    if (opts.mode === 'enforce' || opts.mode === 'shadow') {
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
        if (opts.mode === 'shadow') {
          res.setHeader('x-helix-shadow-hole', verdict.hole.code);
        } else {
          res.writeHead(403, {
            'content-type': 'application/json',
            'x-helix-hole': verdict.hole.code,
          });
          res.end(JSON.stringify({ hole: verdict.hole }));
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

          if (opts.mode === 'learn') {
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
            });
          }

          if ((opts.mode === 'enforce' || opts.mode === 'shadow') && req._helixRoute) {
            const rv = scoreResponse(req._helixRoute, {
              contentType: ct,
              body,
              status: pres.statusCode || 0,
            });
            if (!rv.allow) {
              emitHole('response', rv.hole, { method, path: pathOnly, host });
              if (opts.mode === 'shadow') {
                res.setHeader('x-helix-shadow-hole', rv.hole.code);
              } else {
                res.writeHead(403, {
                  'content-type': 'application/json',
                  'x-helix-hole': rv.hole.code,
                });
                res.end(JSON.stringify({ hole: rv.hole }));
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
};
