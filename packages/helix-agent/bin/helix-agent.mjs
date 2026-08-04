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

if (!['learn', 'shadow', 'enforce'].includes(mode)) {
  console.error(`Invalid MODE=${mode}`);
  process.exit(1);
}
if ((mode === 'shadow' || mode === 'enforce') && (!dnaPath || !fs.existsSync(dnaPath))) {
  console.error(`MODE=${mode} requires existing DNA file at DNA=…`);
  process.exit(1);
}

const server = createHelixProxy({
  upstream,
  mode,
  dnaPath: dnaPath || undefined,
  observePath: mode === 'learn' ? observePath : undefined,
  shadowLogPath: mode === 'shadow' ? shadowLogPath : undefined,
});

server.listen(listenPort, listenHost, () => {
  console.log(
    `helix-agent mode=${mode} listen=${listenHost}:${listenPort} app=${upstream} dna=${dnaPath || '(none)'}`,
  );
  console.log('Mode A soft intercept: point app at localhost only; NGFW keeps this host IP.');
});
