#!/usr/bin/env node
/**
 * Cinderpath control-plane Helix consume smoke.
 * Seeds DNA from the product CWL genome; proves cutover self-match.
 * Does NOT inspect WireGuard / tunnel destinations (tunnel_inspection: false).
 *
 * Env: CINDERPATH_ROOT — defaults to ../../../projects/cinderpath from this repo.
 * Gate: npm run cinderpath-control-plane-smoke → CINDERPATH_CONTROL_PLANE_OK | SKIP
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveCwlRoot,
  seedDnaFromCwlFile,
  stripBridgeEnvelope,
  compareCwlSurfaceToDna,
} from "../packages/cwl-bridge/index.mjs";
import { signDna, verifyDna, scoreRequest } from "../packages/dna-core/index.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SECURE_ROOT = path.resolve(HERE, "..");
const LAB_KEY = "helix-lab-cinderpath-key-v1";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function resolveCinderpathRoot() {
  if (process.env.CINDERPATH_ROOT) return path.resolve(process.env.CINDERPATH_ROOT);
  const candidates = [
    path.resolve(SECURE_ROOT, "../../../projects/cinderpath"),
    path.resolve(SECURE_ROOT, "../../projects/cinderpath"),
    path.resolve("C:/Users/david/projects/cinderpath"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "internal/webapp/cwl/cinderpath.cwl"))) return c;
  }
  return null;
}

const cpRoot = resolveCinderpathRoot();
if (!cpRoot) {
  console.log(
    "CINDERPATH_CONTROL_PLANE_SKIP (set CINDERPATH_ROOT to projects/cinderpath — genome not found)",
  );
  process.exit(0);
}

let cwlRoot;
try {
  cwlRoot = resolveCwlRoot();
} catch {
  console.log("CINDERPATH_CONTROL_PLANE_SKIP (chrysalis-cwl pillar missing)");
  process.exit(0);
}

const genome = path.join(cpRoot, "internal/webapp/cwl/cinderpath.cwl");
assert(fs.existsSync(genome), `missing genome ${genome}`);
assert(fs.existsSync(path.join(SECURE_ROOT, "docs/CINDERPATH.md")), "docs/CINDERPATH.md");

console.log("=== cinderpath: seed control-plane DNA from genome ===");
const seeded = await seedDnaFromCwlFile(genome, {
  app_id: "cinderpath-control-plane",
  mode: "draft",
  fixture: genome,
  cwlRoot,
});
assert(seeded.schema === "app-dna-v1", "schema");
assert((seeded.routes?.length ?? 0) >= 10, `expected many routes, got ${seeded.routes?.length}`);

const healthz = seeded.routes.find((r) => r.method === "GET" && r.path_template === "/healthz");
assert(healthz, "GET /healthz in seed");
const securityMeta = seeded.routes.find(
  (r) => r.method === "GET" && r.path_template === "/cwl-security",
);
assert(securityMeta, "GET /cwl-security in seed");
assert(securityMeta.content_class === "json", "cwl-security is json");

const connectHole = seeded.bridge?.annotations?.find(
  (a) => a.path_template === "/connect" && a.method === "POST",
);
assert(connectHole, "POST /connect annotation present (WireGuard mint stays hole in genome)");

console.log("=== cinderpath: strip → promote → cutover self-match ===");
let certified = {
  ...stripBridgeEnvelope(seeded),
  mode: "certified",
  created_at: new Date().toISOString(),
};
certified = signDna(certified, { secret: LAB_KEY, key_id: "lab" });
const verified = verifyDna(certified, { secret: LAB_KEY, key_id: "lab", require: true });
assert(verified.ok === true, `verify: ${JSON.stringify(verified)}`);

const cmp = compareCwlSurfaceToDna(seeded, certified);
assert(cmp.ok === true, `cutover: ${JSON.stringify(cmp.missing_in_dna)}`);
assert(cmp.cutover === "cwl_surface_subseteq_dna", "cutover label");

console.log("=== cinderpath: enforce known control-plane route ===");
const allow = scoreRequest(certified, {
  method: "GET",
  path: "/healthz",
  host: "default",
});
assert(allow.allow === true, `healthz allow: ${JSON.stringify(allow)}`);
const deny = scoreRequest(certified, {
  method: "GET",
  path: "/v1/backdoor-admin",
  host: "default",
});
assert(deny.allow === false, "unknown surface must deny");
assert(deny.hole?.code === "HX-ROUTE-UNKNOWN", `hole ${deny.hole?.code}`);

const outDir = path.join(SECURE_ROOT, "data", "cinderpath-control-plane-smoke");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "seeded.dna.json"), `${JSON.stringify(seeded, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "certified.dna.json"), `${JSON.stringify(certified, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      kind: "helix.cinderpath.control-plane-smoke",
      ok: true,
      cinderpathRoot: cpRoot.replace(/\\/g, "/"),
      cwlTip: "file: pin via chrysalis-cwl",
      routes: seeded.routes.length,
      tunnel_inspection: false,
      placement: "Mode A — Helix in front of cinderpath-web only",
    },
    null,
    2,
  ),
);
console.log("CINDERPATH_CONTROL_PLANE_OK");
