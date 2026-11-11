# Architect review · PR #113 F-2 telemetry ring/export · `560b4d4` · 2026-11-05 22:39 CET (Europe/Belgrade)

**Requested exact:** `560b4d437f06df1e399d3f91c7af850b2b1e2bb5`  
**Live headOid:** `560b4d437f06df1e399d3f91c7af850b2b1e2bb5` — **MATCH (unchanged)**  
**Branch:** `fix/saves-telemetry-ring-export`  
**Base / parent:** `rc/v5` `844f8e15774daeb1c0a855cb69b1fabd2f0ab820` (#103 merge) — **OK**  
**F-1 ancestor:** `0674e144…` present  
**PR:** https://github.com/PrincipalLewis/egg-farm/pull/113 (**Draft**)  
**Scope (from PR + D-HOE-20261105-39 — not invented):** F-2 only — stored ring `{v, events}`, v-less → `legacy:true`, export/snapshot `schema_version`. Not #103 merge work; RC-cut blocker before Wed 11 Nov freeze.  
**Contracts:** errata rev 13 V-0 L42–43 (`a0e8f6d7`); D-HOE-20261030-19 F-6; D-HOE-20261105-39 F-2; G8-12 / G8-13; ship-set L23 (telemetry always-on, no flag).  
**Out of scope:** FieldSpec `obj` (F-3); #114 endCalls; #100 merge-forward; sim/econ.  
**Scope rule:** reviews + status only. **No Ready / merge / push / messages / implementation.**

## Verdict: **PASS** · Minors: **0 blocking** · Ready recommendation: **CONDITIONAL YES**

Closes D-HOE-39 F-2 / V-0 ring+export residual on the #103 merge tip. Independent focused suite **7 files / 102 passed**; **tsc 0**. Hosted Draft checks **SKIPPED**. Ready blocked only on undraft+hosted gate + HoQA (process), not Architect content.

---

## Stack integrity
| Layer | SHA | Role |
|---|---|---|
| rc/v5 + #103 | `844f8e15` | schema 0.6.2 + WORKER_MOODS + bbv2 validate gate |
| **#113 (this)** | `560b4d4` · 1 commit | F-2 ring persist + export header |
| Downstream | Pause #115 / abilities stacks | Orthogonal; not on this base |

Single-commit FF of parent. Diff vs `844f8e15`: 6 files, +102/−9 — `telemetry.ts` + ring-export tests + 4 reader fixes (`.events` / `schema_version` key). **No** `schema.ts` / `save.ts` / `balance.json` / sim edits.

---

## Claim matrix

| Claim | Result | Evidence |
|---|---|---|
| Flush stores `{v: TELEMETRY_SCHEMA_VERSION, events}` | **PASS** | `flush` → `JSON.stringify({ v, events: this.buf })`; AC G8-12 |
| `TELEMETRY_SCHEMA_VERSION === '0.6.2'` from schema import | **PASS** | import + test |
| Bare array / v-less `{events}` → keep all, tag `legacy:true` | **PASS** | `readRing` + `tagLegacy`; G8-13/T-AC9 ACs |
| Versioned ring loads unchanged (no force-tag); T-AC9 still fails untagged OLD | **PASS** | AC; `validateEvent` skips only `legacy===true` (schema L259–262, landed in #103) |
| Bad `events` / corrupt JSON → empty buffer | **PASS** | AC |
| `exportJSON` / `snapshotJSON` carry `schema_version` | **PASS** | `exportDoc`; G8-12 + export-global key list |
| `SAVE_VERSION` stays 6; `balance.telemetry` unchanged | **PASS** | no diff; AC equality incl. bbv2 block |
| F-3 FieldSpec `obj` untouched | **PASS** | no `schema.ts` delta |
| Readers updated for `{v,events}` | **PASS** | telemetry / m3 / zg annotate / export-global |
| Fixtures with bare-array telemetry still load | **PASS** | `readRing` tags on load; no fixture rewrite required |

---

## Architecture notes

### Flag-0 / always-on boundary
Telemetry **has no m4 flag** (ship-set L23). Ring shape change is orthogonal to feature flags; constructor/flush behavior identical for flag-off RC configs. Separate KV key `eggfarm.telemetry` — **no save migration**, SAVE_VERSION 6 — matches V-0 / D-HOE-19.

### Persist / sim / telemetry fit
- **Persist (game save):** untouched. Reset-progress still keeps telemetry key (M3-AC7).
- **Sim:** no GameState / abilities / income paths in delta.
- **Telemetry:** write path now versioned; load path backward-compatible; new events after load are untagged; flush rewrites whole ring as `{v,events}` (legacy tags preserved on prior events — AC asserts).

### Spec pins
Errata V-0: `{v,events}` + export `schema_version` + pre-0.6.2 `legacy:true` + T-AC9 non-legacy only. Implementation matches. `v == null` (not strict `!== '0.6.2'`) — future/other `v` loads without re-tag; consistent with “no v” wording; **not a Fail**.

### Regressions
Reader tests that parsed bare arrays now use `.events`. Regex `matchAll` tests on raw KV strings remain valid (event JSON still embedded). Independent focused run green.

---

## Gates / QA evidence

| Gate | Status |
|---|---|
| `tsc --noEmit` | **0** (independent, this tip) |
| Focused vitest (author list) | **7 files / 102 passed** independent @ 22:39 CET under `.vitest-eng.lock` + `nice -n 10` (plain pool; `maxForks=1` CLI conflicted with tinypool in this env — result matches author 102) |
| Full suite | **Not re-run** — F-2 tip is telemetry-ring only; focused AC suite is the contract gate. (Prior #114 full 2066/1 was on a different tip; not required again here.) |
| Hosted gate / pacing / release-globals | **SKIPPED** (Draft) |
| verify-24h | Unchecked on PR — **not required** for this KV-ring tip (no sim/econ) |
| HoQA on `560b4d4` | **Not yet seen** in status/reviews — Ready blocker |

Logs: `scratch/architect/review113-560b4d4/` (worktree `/workspace/wt-review-113-560b4d4`).

---

## Minors
**0 blocking.** Non-blocking observation: non-object elements inside a legacy array are not tagged (spread guard); corrupt rings already empty-out.

---

## Ready recommendation (no mutation)
**CONDITIONAL YES** — Architect **PASS**; recommend undraft/Ready only when:

| ID | Blocker? | Detail |
|---|---|---|
| B1 | **YES** | Undraft + hosted **`gate` SUCCESS** at frozen `560b4d4` |
| B2 | **YES** | **HoQA** exact-head ACK |
| B3 | No | Extra Architect full suite / verify-24h for this tip |

RC-cut: landing #113 before Wed 11 Nov freeze satisfies D-HOE-39 F-2. F-3 (FieldSpec obj) remains separate before G-8 per HoE notes — not this PR.
