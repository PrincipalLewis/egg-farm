# Architect review · PR #110 F5 pacing harness (review unit 1) · `62598c7` · 2026-11-05 22:45 CET (Europe/Belgrade)

**Requested exact:** `62598c7b0b21ef04b13dbc4ad1b8b04109de37a0`  
**Live headOid:** `62598c7b0b21ef04b13dbc4ad1b8b04109de37a0` — **MATCH (unchanged)**  
**Branch:** `feat/v5-f5-pacing`  
**PR baseOid:** `rc/v5` `30df38c0a0bd5d48db96d0705abccc6db197d161` — merge-base OK  
**Live `origin/rc/v5` tip:** `844f8e15…` (**advanced past PR base** — tip itself not advanced; restack before merge)  
**PR:** https://github.com/PrincipalLewis/egg-farm/pull/110 (**Draft**)  
**Scope (from PR + `engineering/f5-active-pacing.md` — not invented):** F5 **review unit 1** = source-only harness + G0/G1 *measurement hooks* on **flags 0**, off `30df38c0` only. Explicitly **not** full-stack G1 PASS. No `src/` / config / workflow / persist / income-ref / golden Game edits.  
**Contracts cited:** sizing F5 (`engineering/m5.0-sizing.md` L26): TS active-player harness; G0 never-tap byte-identical (AC7, AC-SC9 L0–9); G1 P95 ≤ 2.0 / worst ≤ 2.25 over 10-minute windows, seeds 0–99, F10/F18/F24. Manifest row 2 (bot-m5) / row 33 (F5 full-stack gate). O-3 double-model guard (D-HOE-20261030-08). Author self-limits: catch/pop/calls **await reviewed source APIs**; no invented `fireAbility`.  
**Artifacts:** `artifacts/v5-f5-62598c7/` — outer + results `SHA256SUMS` **OK**; bundle verifies requires `30df38c0`, contains `62598c7`.  
**Writes:** reviews + status only. **No Ready / merge / push / messages / implementation.** #100 = Generalist.

## Verdict (qualified)

| Layer | Verdict | Meaning |
|---|---|---|
| **G0 (this unit)** | **PASS** | Never-tap streak off/on isolation on shipping flags-0; 100 seeds; zero Collect; positive sales; full event+per-second+final hashes equal. **Not** full ship-stack G0/AC7. |
| **G1 (this unit)** | **DEPENDENCY-BLOCKED** (not Fail of hooks) | Fail-closed summarizer + 900 sampled 600 s windows meet numerical bounds on flags-0, but status is **always** `DEPENDENCY-BLOCKED`; coverage is checkpoint samples only; missing Wave A / golden / Broody / abilities APIs; no hold-for-Frenzy; not every rolling window. **Must not** be read as full-stack G1 PASS. |
| **PR / review unit 1 overall** | **PASS** · Minors below | Foundation harness lands as scoped. |

**Ready recommendation:** **CONDITIONAL YES for harness merge** after restack + hosted gate + HoQA — **not** clearance that manifest **row 33 F5 full-stack G0/G1** is closed.

---

## Diff / isolation
5 files, +307/−4: `engineering/f5-active-pacing.md`, `tests/bot-m5-active.{ts,test.ts,slow.test.ts}`, small `tests/bot-m5.ts` (`never` tap + optional `clock` + `runSource`).  
`git diff 30df38c0..62598c7 -- src/ config/ data/ .github/` → **empty**. Shipping `m4.flags.*` all **0** at tip.

---

## Foundation / module boundaries
- **Reuse:** `runSource` → existing `run()` with `M5X_STACKS.none` + `on: false` + `rc2: undefined` (O-3 safe) and injected `{ focus: true, nowMs: t*1000 }`. Legacy `run()` default omits clock → parity pins preserved (unit test: flags-off casual byte-identical).
- **`never` vs `idle`:** `never` = zero Collect including pre–Coop Hand; `idle` still collects before hire — matches design.
- **Measurement:** `activeWindow` clones start, `noBuy: true`, paired active vs port `idle` over 600 s; ratio = net coin deltas after wages. `summarizeActiveWindows` nearest-rank P95, per-profile/farm groups, no silent drop of null/NaN/missing; **always** returns `DEPENDENCY-BLOCKED`.
- **No invented APIs:** no catch reward sim, nest pop, or `fireAbility`; catchP retained as metadata only.

### Clock / persist / telemetry fit
- Clock: deterministic relative ms via `StepClock`; no `Date.now` in runner path for F5.
- Persist / `m5Persist` / save schema: **untouched**.
- Telemetry: **untouched** (harness is tests-only).

### Flag-0 behavior
Default shipping flags 0. G0 toggles only `streak` for off/on equality. AC-SC9 toggles only `abilities` (inert on this base). `record.balance.flagsOn === []` asserted in slow suite. O-3 still loud-fails model+src dual-on (existing bot-m5 tests green).

### Spec deltas vs full F5 sizing L26
Sizing F5 asks bots that tap, **catch**, **pop nest**, **fire calls**, and G1 over **every** 10-minute window. This unit documents those as **open acceptance gaps** and implements the **source-only foundation + sampled metrics**. That is correct for "review unit 1" / G0-first; it does **not** close row 33.

---

## Claim matrix

| Claim | Result | Evidence |
|---|---|---|
| Head unchanged at `62598c7` | **PASS** | gh + `origin/feat/v5-f5-pacing` |
| No prod/config/workflow delta | **PASS** | empty prod diff |
| Legacy bot-m5 parity / O-3 preserved | **PASS** | independent `bot-m5.test.ts` 24/24 |
| `runSource` + `never` + focused clock | **PASS** | unit tests; streak decay 0.28→0.13 |
| G0 never-tap streak off/on (seeds 0–99) | **PASS (scoped)** | artifact `g0-never-tap.json` 100 rows; slow claim; SUMS OK |
| AC-SC9 L0–9 inert abilities baseline | **PASS (scoped)** | `ac-sc9-l0-9.json` 100 rows; re-run after abilities |
| 900 checkpoint windows; P95/worst bounds | **PASS (sampled, flags-0)** | `source-windows.json` / summary; p95≈1.0025, worst≈1.025 @ seed 95; failures=[] |
| Metrics never claim full G1 | **PASS** | `status: DEPENDENCY-BLOCKED` always |
| Full-stack G1 / catch/pop/calls / hold-for-Frenzy | **OPEN / blocked** | documented dependencies |

---

## Minors

| ID | Note |
|---|---|
| **m1** | PR base `30df38c0` while live `rc/v5` is `844f8e15` (#103 etc.). **Restack** before Ready/merge; do not merge stale base. |
| **m2** | Manifest row 33 / sizing F5 "full-stack" remain **open**; treat this tip as harness foundation only in status boards. |

No Majors for the scoped unit.

---

## Gates / QA / provenance

| Gate | Status |
|---|---|
| Artifact `SHA256SUMS` (outer + results) | **OK** (verified this turn) |
| Bundle | **OK** (requires `30df38c0`, tip `62598c7`) |
| Author `gates.tsv` | sync/tsc/vitest-full/golden-flagoff/build/check-globals/build-html/test-slow all **exit 0** |
| Author unit/slow | 2045/1 + 19/1 + golden 7 — accepted with SUMS; full suite **not** re-run here |
| Independent Architect | **tsc 0**; `bot-m5-active` + `bot-m5` **35/35** under flock + nice 10 @ 22:43 CET |
| Hosted CI | **SKIPPED** (Draft) |
| Slow 900-window re-run | **Not repeated** (434 s author evidence + SUMS OK; avoid redundant) |

Logs: `scratch/architect/review110-62598c7/` · WT `/workspace/wt-review-110-62598c7`

---

## Remaining gates (not closed by #110)
1. Restack onto current `rc/v5` (≥ `844f8e15`) + Wave A merges as needed for source APIs.  
2. Integrate reviewed income-ref/tapCoins, golden catch, Broody pop, `fireAbility` — **no overlays**.  
3. Re-run G0 / AC7 / AC-SC9 on final enabled stack.  
4. Continuous/every-window G1 + hold-for-Frenzy + Economy cross-check + flags-on X1 rebuild (O-3).  
5. HoQA exact-head + hosted gate SUCCESS after undraft.

## Ready recommendation (no mutation)
**CONDITIONAL YES — harness / G0 foundation only.** Undraft/Ready for *this unit* only after **m1 restack** + **hosted gate SUCCESS** + **HoQA ACK**.  
**Do not** mark Ready as closing **F5 full-stack G0/G1** (row 33) or claim G1 PASS. Merge clearance is HoE/HoQA’s; Architect does not mutate the PR.
