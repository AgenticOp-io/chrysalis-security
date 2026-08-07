#!/usr/bin/env node
/**
 * Helix agent — Mode A soft host intercept (D1 / D4).
 *
 * NGFW keeps pointing at this host. Helix binds the public service port;
 * the real app listens only on localhost. External + internal clients
 * hit the same host IP — no firewall NAT rewrite.
 *
 * Env:
 *   LISTEN_HOST=0.0.0.0
 *   LISTEN_PORT=80          (or 4080 in lab)
 *   APP_UPSTREAM=http://127.0.0.1:8080
 *   MODE=learn|shadow|enforce
 *   DNA=/data/app.dna.json
 *   OBSERVE=/data/observations.ndjson
 *   SHADOW_LOG=/data/shadow.ndjson
 *   SIEM_LOG=/data/siem.ndjson
 *   HELIX_DNA_KEY=… / HELIX_DNA_REQUIRE=1
 *   HELIX_TLS_CERT=… / HELIX_TLS_KEY=…
 *   HELIX_MAX_BODY_BYTES=…
 *
 * Same engine as helix-proxy; this entrypoint is the host-install story.
 */
import fs from 'node:fs';
import { createHelixProxy } from '../../helix-proxy/index.mjs';

const listenHost = process.env.LISTEN_HOST || '0.0.0.0';
const listenPort = Number(process.env.LISTEN_PORT || process.env.PORT || 4080);
const upstream = process.env.APP_UPSTREAM || process.env.UPSTREAM || 'http://127.0.0.1:4090';
const mode = process.env.MODE || 'learn';
const dnaPath = process.env.DNA || '';
const observePath = process.env.OBSERVE || './data/observations.ndjson';
const shadowLogPath = process.env.SHADOW_LOG || './data/shadow.ndjson';
const siemLogPath = process.env.SIEM_LOG || process.env.HELIX_SIEM_LOG || '';
const dnaKey = process.env.HELIX_DNA_KEY || '';
const dnaKeyId = process.env.HELIX_DNA_KEY_ID || '';
const requireSignedDna = process.env.HELIX_DNA_REQUIRE === '1' || process.env.HELIX_DNA_REQUIRE === 'true';
const tlsCertPath = process.env.HELIX_TLS_CERT || '';
const tlsKeyPath = process.env.HELIX_TLS_KEY || '';
const maxBodyBytes = Number(process.env.HELIX_MAX_BODY_BYTES || 0) || 0;

if (!['learn', 'shadow', 'enforce'].includes(mode)) {
  console.error(`Invalid MODE=${mode}`);
  process.exit(1);
}
if ((mode === 'shadow' || mode === 'enforce') && (!dnaPath || !fs.existsSync(dnaPath))) {
  console.error(`MODE=${mode} requires existing DNA file at DNA=…`);
  process.exit(1);
}

let tls;
if (tlsCertPath && tlsKeyPath) {
  tls = { cert: fs.readFileSync(tlsCertPath), key: fs.readFileSync(tlsKeyPath) };
} else if (tlsCertPath || tlsKeyPath) {
  console.error('HELIX_TLS_CERT and HELIX_TLS_KEY must both be set for TLS terminate');
  process.exit(1);
}

let server;
try {
  server = createHelixProxy({
    upstream,
    mode,
    dnaPath: dnaPath || undefined,
    observePath: mode === 'learn' ? observePath : undefined,
    shadowLogPath: mode === 'shadow' ? shadowLogPath : undefined,
    siemLogPath: siemLogPath || undefined,
    dnaKey: dnaKey || undefined,
    dnaKeyId: dnaKeyId || undefined,
    requireSignedDna,
    placement: 'agent',
    tls,
    maxBodyBytes: maxBodyBytes || undefined,
  });
} catch (err) {
  console.error(err.hole ? JSON.stringify(err.hole) : String(err.message || err));
  process.exit(1);
}

function onReloadSignal() {
  try {
    server.reloadDna();
    console.log('helix-agent DNA reloaded (SIGHUP/SIGUSR2)');
  } catch (err) {
    console.error('helix-agent DNA reload failed', err.hole || err.message || err);
  }
}
process.on('SIGHUP', onReloadSignal);
process.on('SIGUSR2', onReloadSignal);

server.listen(listenPort, listenHost, () => {
  console.log(
    `helix-agent mode=${mode} listen=${listenHost}:${listenPort} tls=${tls ? 'on' : 'off'} app=${upstream} dna=${dnaPath || '(none)'} siem=${siemLogPath || '(off)'} maxBody=${maxBodyBytes || '(off)'}`,
  );
  console.log('Mode A soft intercept: point app at localhost only; NGFW keeps this host IP.');
});
