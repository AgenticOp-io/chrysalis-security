# AGENTS.md — Helix

Read [`docs/PROCESS.md`](./docs/PROCESS.md) and [`docs/CANON.md`](./docs/CANON.md).

**Authority / git:** See `AgenticOps/docs/AGENT_AUTHORITY.md` and `AgenticOps/docs/SUBAGENT_PUSH_PROTOCOL.md`.

| Action | Agent may |
|--------|-----------|
| **Commit** | Yes — land finished work (do not leave large slices dirty) |
| **Push** | Only to `candidate/*` (or a non-main branch the user named) |
| **Push `main`/`master`** | **Never** — agents have no authority |

After every candidate push: report **remote + branch + SHA**.

Security fork only. Trust nothing outside certified DNA. Keep it simple. GCE proves.

**CWL:** Helix protects with traffic DNA out of the box (**D5**). CWL is still **THE language of the web** for Chrysalis — when you bridge DNA↔CWL, follow `engines/chrysalis-cwl`. Do not fork language rules into Helix. UT↔Helix spine: CWL `npm run smoke:ut-spine` (not Convert). See [`docs/PILLARS.md`](./docs/PILLARS.md).

**Prove (Secure):** `npm run cutover-smoke` → `CUTOVER_SMOKE_OK` · `.\scripts\gce-sync.ps1 -WithCwl` → bridge + cutover + `GCE_SYNC_OK`.
