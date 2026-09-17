#!/usr/bin/env node
/**
 * Response surface DNA — which routes mint cookies, and where they send the browser.
 *
 * Route + schema DNA already refuses a surface the app never had. It does not notice a
 * certified page that quietly starts minting a session cookie, or a login that starts
 * redirecting somewhere else. Both are "not the certified app" without any new request
 * shape, so they are certified here as names and hostnames — never values.
 *
 * Tokens: RESPONSE_SURFACE_UNIT_OK · RESPONSE_SURFACE_LEARN_OK · RESPONSE_SURFACE_COOKIE_OK
 *         · RESPONSE_SURFACE_REDIRECT_OK · RESPONSE_SURFACE_LEGACY_OK · RESPONSE_SURFACE_SMOKE_OK
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createHelixProxy } from '../packages/helix-proxy/index.mjs';
import {
  setCookieNames,
  redirectTarget,
  learnFromObservations,
  scoreResponse,
  signDna,
} from '../packages/dna-core/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(ROOT, 'data', 'response-surface-smoke');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function req(port, urlPath, opts = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request(
      {
        host: '127.0.0.1',
        port,
        path: urlPath,
        method: opts.method || 'GET',
        headers: opts.headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      },
    );
    r.on('error', reject);
    if (opts.body) r.write(opts.body);
    r.end();
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

console.log('=== response surface: names and targets, never values ===');
assert(
  JSON.stringify(setCookieNames(['sid=abc123; HttpOnly; Path=/', 'theme=dark'])) ===
    JSON.stringify(['sid', 'theme']),
  'cookie names parsed from real Set-Cookie headers',
);
assert(
  !JSON.stringify(setCookieNames('sid=s3cr3t-token; HttpOnly')).includes('s3cr3t'),
  'the secret never leaves the header',
);
assert(setCookieNames(undefined).length === 0, 'no cookies is an empty list, not a throw');
assert(
  JSON.stringify(setCookieNames(['a=1', 'a=2'])) === JSON.stringify(['a']),
  'names dedupe',
);

assert(redirectTarget('/dashboard', 'app.example') === 'self', 'relative redirect is self');
assert(
  redirectTarget('https://app.example/dashboard', 'app.example') === 'self',
  'same host is self',
);
assert(
  redirectTarget('https://evil.example/harvest', 'app.example') === 'evil.example',
  'off-host redirect keeps the hostname',
);
assert(redirectTarget('', 'app.example') === null, 'no Location, no target');
assert(redirectTarget('http://', 'app.example') === 'unparseable', 'garbage is named, not ignored');
console.log('RESPONSE_SURFACE_UNIT_OK');

console.log('=== response surface: learn what the app really does ===');
// The stub app: /login mints a session and bounces to the dashboard; /faq is a plain page.
let backdoorCookie = false;
let stolenRedirect = false;
const app = http.createServer((r, res) => {
  const p = (r.url || '/').split('?')[0];
  if (p === '/login') {
    if (stolenRedirect) {
      res.writeHead(302, { location: 'https://evil.example/harvest' });
      res.end();
      return;
    }
    res.writeHead(302, {
      'set-cookie': 'sid=s3cr3t-session-value; HttpOnly; Path=/',
      location: '/dashboard',
    });
    res.end();
    return;
  }
  if (p === '/faq') {
    const headers = { 'content-type': 'text/html' };
    if (backdoorCookie) headers['set-cookie'] = 'admin_session=1; Path=/';
    res.writeHead(200, headers);
    res.end('<h1>FAQ</h1>');
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end('<h1>Dashboard</h1>');
});
await listen(app);
const appPort = app.address().port;

const observePath = path.join(OUT, 'observations.ndjson');
const learner = createHelixProxy({
  upstream: `http://127.0.0.1:${appPort}`,
  mode: 'learn',
  observePath,
  placement: 'agent',
});
await listen(learner);
const learnPort = learner.address().port;

await req(learnPort, '/login', { method: 'POST' });
await req(learnPort, '/faq');
await req(learnPort, '/dashboard');
await new Promise((r) => setTimeout(r, 50));
learner.close();

const observed = fs
  .readFileSync(observePath, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((l) => JSON.parse(l));
assert(
  !fs.readFileSync(observePath, 'utf8').includes('s3cr3t-session-value'),
  'the observation log never records a session value',
);

const draft = learnFromObservations(observed, { app_id: 'response-surface', mode: 'draft' });
const login = draft.routes.find((r) => r.path_template === '/login');
assert(login, 'login learned');
assert(
  JSON.stringify(login.set_cookie_names) === JSON.stringify(['sid']),
  `login mints sid: ${JSON.stringify(login.set_cookie_names)}`,
);
assert(
  JSON.stringify(login.redirect_targets) === JSON.stringify(['self']),
  `login bounces in-app: ${JSON.stringify(login.redirect_targets)}`,
);
const faq = draft.routes.find((r) => r.path_template === '/faq');
assert(faq.set_cookie_names.length === 0, 'a page that mints nothing says so explicitly');
assert(faq.redirect_targets.length === 0, 'and redirects nowhere');
assert(
  !JSON.stringify(draft).includes('s3cr3t-session-value'),
  'the certificate carries names, never secrets',
);
console.log('RESPONSE_SURFACE_LEARN_OK');

const dna = signDna(
  { ...draft, mode: 'certified', created_at: new Date().toISOString() },
  { secret: 'helix-lab-response-key', key_id: 'lab' },
);
const dnaPath = path.join(OUT, 'app.dna.json');
fs.writeFileSync(dnaPath, `${JSON.stringify(dna, null, 2)}\n`);

console.log('=== response surface: enforce ===');
const siemLog = path.join(OUT, 'siem.ndjson');
const guard = createHelixProxy({
  upstream: `http://127.0.0.1:${appPort}`,
  mode: 'enforce',
  dnaPath,
  siemLogPath: siemLog,
  placement: 'agent',
});
await listen(guard);
const guardPort = guard.address().port;

// Certified behaviour still passes — cookies and redirects are allowed, just not new ones.
const okLogin = await req(guardPort, '/login', { method: 'POST' });
assert(okLogin.status === 302, `certified login still works: ${okLogin.status}`);
assert(okLogin.headers['set-cookie'], 'and still sets its session cookie');
const okFaq = await req(guardPort, '/faq');
assert(okFaq.status === 200, `certified page still works: ${okFaq.status}`);

// The app grows a session minter on a brochure page: same route, same schema, new power.
backdoorCookie = true;
const drifted = await req(guardPort, '/faq');
assert(drifted.status === 403, `uncertified cookie is refused: ${drifted.status}`);
const cookieHole = JSON.parse(drifted.body);
assert(cookieHole.hole.code === 'HX-COOKIE-DRIFT', `hole code: ${cookieHole.hole.code}`);
assert(cookieHole.hole.reason.includes('admin_session'), 'the hole names the cookie');
assert(!drifted.headers['set-cookie'], 'and the browser never receives it');
backdoorCookie = false;
console.log('RESPONSE_SURFACE_COOKIE_OK');

// The login keeps its shape but starts sending the browser somewhere else.
stolenRedirect = true;
const stolen = await req(guardPort, '/login', { method: 'POST' });
assert(stolen.status === 403, `uncertified redirect is refused: ${stolen.status}`);
const redirectHole = JSON.parse(stolen.body);
assert(redirectHole.hole.code === 'HX-REDIRECT-DRIFT', `hole code: ${redirectHole.hole.code}`);
assert(redirectHole.hole.reason.includes('evil.example'), 'the hole names the destination');
assert(!stolen.headers.location, 'the browser is never handed the redirect');
stolenRedirect = false;
guard.close();

const events = fs
  .readFileSync(siemLog, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((l) => JSON.parse(l));
assert(events.length === 2, `both holes reached the SIEM: ${events.length}`);
assert(
  events.every((e) => !JSON.stringify(e).includes('s3cr3t-session-value')),
  'hole events carry no secrets either',
);
console.log('RESPONSE_SURFACE_REDIRECT_OK');

console.log('=== response surface: certificates written before this slice ===');
// A DNA promoted by an older Helix has no opinion about cookies. Absent ≠ "none allowed":
// silently refusing traffic on upgrade would be exactly the surprise we refuse to ship.
const legacyRoute = {
  host: 'default',
  method: 'GET',
  path_template: '/faq',
  content_class: 'html',
  status_classes: [200],
  response_key_fingerprint: null,
};
const legacy = scoreResponse(legacyRoute, {
  contentType: 'text/html',
  status: 200,
  setCookie: ['admin_session=1'],
  location: 'https://evil.example/',
  host: 'app.example',
});
assert(legacy.allow === true, 'legacy DNA keeps passing until it is re-learned');

// Re-learned, the same route has an opinion.
const certified = { ...legacyRoute, set_cookie_names: [], redirect_targets: [] };
const now = scoreResponse(certified, {
  contentType: 'text/html',
  status: 200,
  setCookie: ['admin_session=1'],
  host: 'app.example',
});
assert(now.allow === false && now.hole.code === 'HX-COOKIE-DRIFT', 'and refuses the new cookie');
console.log('RESPONSE_SURFACE_LEGACY_OK');

app.close();
console.log('RESPONSE_SURFACE_SMOKE_OK');
