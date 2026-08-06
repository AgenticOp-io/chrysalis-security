/**
 * Helix proxy — learn / shadow / enforce in front of an HTTP(S) upstream.
 * Trust nothing: unknown routes denied in enforce; no DNA => fail closed.
 */
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
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

  function reloadDna() {
    dna = loadDna(opts.dnaPath, verifyOpts);
    return dna;
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

    // Ops health — never DNA-gated (sidecar probes)
    if (req.method === 'GET' && pathOnly === HEALTHZ) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          mode: opts.mode,
          placement,
          dna: Boolean(dna || (opts.dnaPath && fs.existsSync(opts.dnaPath))),
        }),
      );
      return;
    }

    const chunks = [];
    for await (const c of req) chunks.push(c);
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
};
