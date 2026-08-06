#!/usr/bin/env node
/**
 * Helix proxy entry — env-driven for container / GCE.
 *
 *   UPSTREAM=http://127.0.0.1:4090
 *   MODE=learn|shadow|enforce
 *   DNA=/data/app.dna.json
 *   OBSERVE=/data/observations.ndjson
 *   SHADOW_LOG=/data/shadow.ndjson
 *   SIEM_LOG=/data/siem.ndjson     (hole events for SIEM/XDR)
 *   PORT=4080
 *   HELIX_DNA_KEY=… / HELIX_DNA_REQUIRE=1
 *   HELIX_TLS_CERT=… / HELIX_TLS_KEY=…   (optional terminate)
 *   PLACEMENT=proxy|bridge
 */
import fs from 'node:fs';
import { createHelixProxy } from './index.mjs';

const upstream = process.env.UPSTREAM || 'http://127.0.0.1:4090';
const mode = process.env.MODE || 'learn';
const dnaPath = process.env.DNA || '';
const observePath = process.env.OBSERVE || './data/observations.ndjson';
const shadowLogPath = process.env.SHADOW_LOG || './data/shadow.ndjson';
const siemLogPath = process.env.SIEM_LOG || process.env.HELIX_SIEM_LOG || '';
const port = Number(process.env.PORT || 4080);
const dnaKey = process.env.HELIX_DNA_KEY || '';
const dnaKeyId = process.env.HELIX_DNA_KEY_ID || '';
const requireSignedDna = process.env.HELIX_DNA_REQUIRE === '1' || process.env.HELIX_DNA_REQUIRE === 'true';
const placement = process.env.PLACEMENT || 'proxy';
const tlsCertPath = process.env.HELIX_TLS_CERT || '';
const tlsKeyPath = process.env.HELIX_TLS_KEY || '';

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
  tls = {
    cert: fs.readFileSync(tlsCertPath),
    key: fs.readFileSync(tlsKeyPath),
  };
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
    placement,
    tls,
  });
} catch (err) {
  console.error(err.hole ? JSON.stringify(err.hole) : String(err.message || err));
  process.exit(1);
}

server.listen(port, () => {
  console.log(
    `helix-proxy mode=${mode} placement=${placement} port=${port} tls=${tls ? 'on' : 'off'} upstream=${upstream} dna=${dnaPath || '(none)'} siem=${siemLogPath || '(off)'}`,
  );
});
