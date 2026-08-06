#!/usr/bin/env node
/**
 * Prove status_classes + content_class + fail-closed JSON scoring.
 * Tokens: STATUS_SMOKE_OK
 */
import { learnFromObservations, scoreResponse } from '../packages/dna-core/index.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const dna = learnFromObservations(
  [
    {
      method: 'GET',
      path: '/api/health',
      host: 'h',
      status: 200,
      contentType: 'application/json',
      body: { ok: true },
    },
  ],
  { app_id: 'status', mode: 'certified' },
);
const route = dna.routes[0];
assert(route.status_classes.includes(200), 'learned 200 class');
assert(route.content_class === 'json', 'learned json');

const ok = scoreResponse(route, {
  status: 200,
  contentType: 'application/json',
  body: { ok: true },
});
assert(ok.allow === true, 'stable allow');

const statusDrift = scoreResponse(route, {
  status: 500,
  contentType: 'application/json',
  body: { ok: true },
});
assert(statusDrift.allow === false && statusDrift.hole.code === 'HX-STATUS-DRIFT', 'status drift');

const classDrift = scoreResponse(route, {
  status: 200,
  contentType: 'text/html',
  body: '<html></html>',
});
assert(classDrift.allow === false && classDrift.hole.code === 'HX-CONTENT-CLASS-DRIFT', 'content class');

const unparseable = scoreResponse(route, {
  status: 200,
  contentType: 'application/json',
  body: undefined,
});
assert(unparseable.allow === false && unparseable.hole.code === 'HX-SCHEMA-DRIFT', 'fail-closed missing json');

const emptyObj = scoreResponse(route, {
  status: 200,
  contentType: 'application/json',
  body: {},
});
assert(emptyObj.allow === false && emptyObj.hole.code === 'HX-SCHEMA-DRIFT', 'empty keys fail-closed');

console.log('STATUS_SMOKE_OK');
