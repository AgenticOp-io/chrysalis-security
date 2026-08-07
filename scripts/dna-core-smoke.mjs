#!/usr/bin/env node
/**
 * Unit checks for dna-core (static collapse + score).
 */
import {
  pathTemplate,
  learnFromObservations,
  scoreRequest,
  scoreResponse,
  isStaticAssetPath,
  signDna,
  verifyDna,
  queryKeyFingerprint,
  responseKeyFingerprint,
} from '../packages/dna-core/index.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(pathTemplate('/api/items/42') === '/api/items/:id', 'numeric id');
assert(pathTemplate('/assets/app.7f3a9c.js') === '/**/*.js', 'js collapse');
assert(pathTemplate('/static/css/main.css') === '/**/*.css', 'css collapse');
assert(pathTemplate('/img/logo.PNG') === '/**/*.png', 'png collapse case');
assert(isStaticAssetPath('/x/y/z.webp') === true, 'webp static');
assert(isStaticAssetPath('/api/health') === false, 'api not static');

const dna = learnFromObservations(
  [
    { method: 'GET', path: '/api/health', host: '127.0.0.1', status: 200, contentType: 'application/json', body: { ok: true } },
    { method: 'GET', path: '/assets/app.aaa.js', host: '127.0.0.1', status: 200, contentType: 'application/javascript' },
    { method: 'GET', path: '/assets/app.bbb.js', host: '127.0.0.1', status: 200, contentType: 'application/javascript' },
    { method: 'GET', path: '/assets/site.css', host: '127.0.0.1', status: 200, contentType: 'text/css' },
  ],
  { app_id: 'unit', mode: 'certified' },
);

const jsRoutes = dna.routes.filter((r) => r.path_template === '/**/*.js');
assert(jsRoutes.length === 1, 'two js files collapse to one DNA route');

const okJs = scoreRequest(dna, { method: 'GET', path: '/cdn/chunk.zzz.js', host: '127.0.0.1' });
assert(okJs.allow === true, 'new hashed js allowed via collapse');

const bad = scoreRequest(dna, { method: 'GET', path: '/api/backdoor', host: '127.0.0.1' });
assert(bad.allow === false && bad.hole.code === 'HX-ROUTE-UNKNOWN', 'unknown api blocked');

const jsonRoute = {
  method: 'GET',
  path_template: '/api/health',
  host: '127.0.0.1',
  content_class: 'json',
  status_classes: [200],
  response_key_fingerprint: 'ok,service',
};
const drift = scoreResponse(jsonRoute, {
  contentType: 'application/json',
  body: { ok: true, service: 'x', pwned: true },
});
assert(drift.allow === false && drift.hole.code === 'HX-SCHEMA-DRIFT', 'schema drift scored');
const stable = scoreResponse(jsonRoute, {
  contentType: 'application/json',
  body: { service: 'x', ok: true },
});
assert(stable.allow === true, 'stable keys allow');

assert(responseKeyFingerprint({ wrap: { a: 1, b: 2 } }) === 'wrap,wrap.a,wrap.b', 'nested depth-2');

const signed = signDna(
  { schema: 'app-dna-v1', app_id: 'u', created_at: 't', mode: 'certified', parent_hash: null, routes: [], holes: [] },
  { secret: 'k', key_id: 't' },
);
assert(verifyDna(signed, { secret: 'k' }).ok === true, 'sign verify');
assert(verifyDna(signed, { secret: 'x' }).ok === false, 'bad key');

const reqDna = learnFromObservations(
  [
    {
      method: 'POST',
      path: '/api/x',
      host: 'h',
      status: 200,
      contentType: 'application/json',
      body: { ok: true },
      requestContentType: 'application/json',
      requestBody: { a: 1, b: 2 },
    },
  ],
  { app_id: 'r', mode: 'certified' },
);
assert(reqDna.routes[0].request_key_fingerprint === 'a,b', 'request keys learned');
const reqDrift = scoreRequest(reqDna, {
  method: 'POST',
  path: '/api/x',
  host: 'h',
  contentType: 'application/json',
  body: { a: 1, b: 2, c: 3 },
});
assert(reqDrift.allow === false && reqDrift.hole.code === 'HX-REQUEST-SCHEMA-DRIFT', 'request drift');

assert(queryKeyFingerprint('/x?z=1&a=2') === 'a,z', 'query names');
const qDna = learnFromObservations(
  [
    {
      method: 'GET',
      path: '/api/y',
      host: 'h',
      status: 200,
      contentType: 'application/json',
      body: { ok: true },
      query: '?id=1',
    },
  ],
  { app_id: 'q', mode: 'certified' },
);
assert(qDna.routes[0].query_key_fingerprint === 'id', 'query learned');
const qDrift = scoreRequest(qDna, { method: 'GET', path: '/api/y', host: 'h', query: '?id=1&debug=1' });
assert(qDrift.allow === false && qDrift.hole.code === 'HX-QUERY-SCHEMA-DRIFT', 'query drift');

console.log('DNA_CORE_OK');
