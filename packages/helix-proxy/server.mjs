#!/usr/bin/env node
/**
 * Helix proxy entry — env-driven for container / GCE.
 *
 *   UPSTREAM=http://127.0.0.1:4090
 *   MODE=learn|shadow|enforce
 *   DNA=/data/app.dna.json
 *   OBSERVE=/data/observations.ndjson
 *   SHADOW_LOG=/data/shadow.ndjson
 *   PORT=4080
 *   APP_ID=demo
 */
import fs from 'node:fs';
import { createHelixProxy } from './index.mjs';

const upstream = process.env.UPSTREAM || 'http://127.0.0.1:4090';
const mode = process.env.MODE || 'learn';
const dnaPath = process.env.DNA || '';
const observePath = process.env.OBSERVE || './data/observations.ndjson';
const shadowLogPath = process.env.SHADOW_LOG || './data/shadow.ndjson';
const port = Number(process.env.PORT || 4080);

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

server.listen(port, () => {
  console.log(`helix-proxy mode=${mode} port=${port} upstream=${upstream} dna=${dnaPath || '(none)'}`);
});
