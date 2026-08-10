#!/usr/bin/env node
/**
 * Rosetta path Step 4 — Live match (traffic DNA ↔ CWL surface).
 * Composite: cwl-bridge-smoke + cutover-smoke.
 * Gate: npm run live-match-smoke → LIVE_MATCH_OK
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function runNodeScript(rel) {
  const script = join(ROOT, rel);
  const r = spawnSync(process.execPath, [script], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
    timeout: 180_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  return { status: r.status, out };
}

const checks = [];

checks.push({
  id: "docs-live-match",
  ok: existsSync(join(ROOT, "docs/LIVE-MATCH.md")),
  detail: "docs/LIVE-MATCH.md",
});

const bridge = runNodeScript("scripts/cwl-bridge-smoke.mjs");
checks.push({
  id: "cwl-bridge-smoke",
  ok: bridge.status === 0 && /CWL_BRIDGE_SMOKE_OK/.test(bridge.out),
  detail: /CWL_BRIDGE_SMOKE_OK/.test(bridge.out)
    ? "CWL_BRIDGE_SMOKE_OK"
    : bridge.out.slice(-400),
});

const cutover = runNodeScript("scripts/cutover-smoke.mjs");
checks.push({
  id: "cutover-smoke",
  ok: cutover.status === 0 && /CUTOVER_SMOKE_OK/.test(cutover.out),
  detail: /CUTOVER_SMOKE_OK/.test(cutover.out)
    ? "CUTOVER_SMOKE_OK"
    : cutover.out.slice(-400),
});

const failed = checks.filter((c) => !c.ok);
const ok = failed.length === 0;
const report = {
  kind: "chrysalis.helix.live-match-smoke",
  schemaVersion: 1,
  ok,
  pathStep: 4,
  pathLabel: "Live match — traffic DNA ↔ CWL surface",
  token: ok ? "LIVE_MATCH_OK" : "LIVE_MATCH_FAIL",
  checks,
  failed: failed.map((c) => c.id),
  generatedAt: new Date().toISOString(),
};

console.log(JSON.stringify(report, null, 2));
console.log(report.token);
if (!ok) process.exit(1);
