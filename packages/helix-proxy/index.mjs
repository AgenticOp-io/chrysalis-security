/**
 * Helix proxy — learn / shadow / enforce in front of an HTTP upstream.
 * Trust nothing: unknown routes denied in enforce; no DNA => fail closed.
 */
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { scoreRequest, scoreResponse, pathTemplate, contentClass, responseKeyFingerprint } from '../dna-core/index.mjs';

function appendNdjson(filePath, obj) {
  if (!filePath) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, JSON.stringify(obj) + '\n');
}

function loadDna(dnaPath) {
  if (!dnaPath || !fs.existsSync(dnaPath)) return null;
  return JSON.parse(fs.readFileSync(dnaPath, 'utf8'));
}

function requestHost(req) {
  const h = req.headers.host || 'default';
  return String(h).split(':')[0].toLowerCase();
}

/**
 * @param {{
 *   upstream: string,
 *   mode: 'learn'|'shadow'|'enforce',
 *   dnaPath?: string,
 *   observePath?: string,
 *   shadowLogPath?: string,
 * }} opts
 */
export function createHelixProxy(opts) {
  let dna = loadDna(opts.dnaPath);

  function reloadDna() {
    dna = loadDna(opts.dnaPath);
    return dna;
  }

  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks);
    const host = requestHost(req);
    const method = req.method || 'GET';
    const pathWithQuery = req.url || '/';
    const pathOnly = pathWithQuery.split('?')[0] || '/';

    if (opts.mode === 'enforce' || opts.mode === 'shadow') {
      dna = dna || reloadDna();
      const verdict = scoreRequest(dna, { method, path: pathOnly, host });
      if (!verdict.allow) {
        if (opts.mode === 'shadow') {
          res.setHeader('x-helix-shadow-hole', verdict.hole.code);
          appendNdjson(opts.shadowLogPath, {
            at: new Date().toISOString(),
            phase: 'request',
            hole: verdict.hole,
            method,
            path: pathOnly,
            host,
          });
        } else {
          res.writeHead(403, { 'content-type': 'application/json', 'x-helix-hole': verdict.hole.code });
          res.end(JSON.stringify({ hole: verdict.hole }));
          return;
        }
      }
      // stash route for response check
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
    // Avoid broken hop-by-hop
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
            });
          }

          if ((opts.mode === 'enforce' || opts.mode === 'shadow') && req._helixRoute) {
            const rv = scoreResponse(req._helixRoute, { contentType: ct, body });
            if (!rv.allow) {
              if (opts.mode === 'shadow') {
                res.setHeader('x-helix-shadow-hole', rv.hole.code);
                appendNdjson(opts.shadowLogPath, {
                  at: new Date().toISOString(),
                  phase: 'response',
                  hole: rv.hole,
                  method,
                  path: pathOnly,
                  host,
                });
              } else {
                res.writeHead(403, { 'content-type': 'application/json', 'x-helix-hole': rv.hole.code });
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
  });

  server.reloadDna = reloadDna;
  return server;
}

export { pathTemplate, contentClass, responseKeyFingerprint };
