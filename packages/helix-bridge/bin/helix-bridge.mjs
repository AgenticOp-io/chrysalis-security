#!/usr/bin/env node
/**
 * Helix Mode B bridge entry — userspace bump-in-path spike.
 *
 * Same DNA engine as helix-proxy/agent. Placement label is "bridge":
 * sit in the traffic path (lab: listen public → app on localhost) without
 * claiming NGFW VIP ownership. Full L2/vSwitch appliance comes later.
 *
 * Env mirrors helix-agent:
 *   LISTEN_HOST / LISTEN_PORT / APP_UPSTREAM / MODE / DNA / …
 *   SIEM_LOG / HELIX_DNA_KEY / HELIX_DNA_REQUIRE / HELIX_DNA_KEY_ID
 *   HELIX_TLS_CERT / HELIX_TLS_KEY
 */
import fs from 'node:fs';
import { createHelixProxy } from '../../helix-proxy/index.mjs';

const listenHost = process.env.LISTEN_HOST || '0.0.0.0';
const listenPort = Number(process.env.LISTEN_PORT || process.env.PORT || 4086);
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
    placement: 'bridge',
    tls,
  });
} catch (err) {
  console.error(err.hole ? JSON.stringify(err.hole) : String(err.message || err));
  process.exit(1);
}

server.listen(listenPort, listenHost, () => {
  console.log(
    `helix-bridge mode=${mode} listen=${listenHost}:${listenPort} tls=${tls ? 'on' : 'off'} app=${upstream} dna=${dnaPath || '(none)'} siem=${siemLogPath || '(off)'}`,
  );
  console.log('Mode B spike: userspace bump-in-path; NGFW keeps VIP/NAT; L2 appliance later.');
});
