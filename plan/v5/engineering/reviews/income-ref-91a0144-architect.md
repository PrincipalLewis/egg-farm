# Architect review · PR #105 income-ref · 91a014453
**Date:** 2026-11-05 22:30 CET (Europe/Belgrade)  
**PR:** https://github.com/PrincipalLewis/egg-farm/pull/105  
**Head:** `91a01445362ada4aeaf7215d93f8cf7f79f90312` (**matches requested exact; not advanced**)  
**Base (GitHub):** `rc/v5` `30df38c0…` · commit parent `518de304…`  
**Spec:** `product/collection/m5-streak-tap-coins-spec.md` v1.3.2 §4.1 / §4.1a / §4.1b  
**Artifacts:** `artifacts/v5-income-ref-91a0144/` (SHA256SUMS OK)  
**Logs:** `scratch/architect/review105-91a0144/`  
**Supersedes:** do **not** review `afa8038` / stacked `f7303c6` (HoE stopped; warmup bug).  
**Scope:** sim I_ref only; exclude UI / telemetry / zero-pop. No Ready/merge/push this turn.

## Verdict: **APPROVE** — 0 Blocker / 0 Major / 1 Minor / 1 nit

Corrected tip restores Game.frame ≥60 s warm-up at the **return** boundary; ST-AC16e zero-income asserts are live code. Architect ring / on-read `refCents` rulings held. Independent focused vitest **27/27** (flock).

---

## Rulings verified

| Ruling | Result | Evidence |
|---|---|---|
| **61-slot ring** = 60 completed 1 s buckets + open second | **PASS** | `ensure` length `W+1`; `ringSumCents` excludes open slot (`income-ref.ts` L37–46; test L41–43) |
| **`refCents` computed on read** (not per-tick cache field) | **PASS** | `refCents(s,b)` pure from state + live `issDollars` / ring (`L49–52`); no cached field |
| Visible `Game.frame` gap ≥60 s: catch-up then **reset I_ref** (not consume warm-up during catch-up) | **PASS** | `game.ts` L432–436 `resetIncomeRef` **after** advance; tests L166–177 exact 60s/10min + non-I_ref parity vs flag-off |
| Hidden offline ≥60 s resets via `m5Offline` | **PASS** | `m5-fields.ts` + tests L183–188 |
| Gap <60 s keeps ring/warm | **PASS** | test L179–181; L189–192 |
| ST-AC16e asleep/unpaid → I_ss=0 / refCents=0 **executable** (not commented) | **PASS** | test L83–88 `expect(…).toBe(0)` |
| BASE sales only in ring (suspended SALE_EFFECTS) | **PASS** | `sellTo` → `saleValueCents(…, suspended:true)` then `recordSale` |
| Hard handover at `refWarmS ≥ W`; no blend | **PASS** | `refCents` branch; ST-AC16d (c) |
| Integer half-up trailing / float warm edge | **PASS** | `trailingRefCents` / `warmRefCents`; ST-AC2b |
| Session-only; never saved; load = warm-up | **PASS** | `M5_SESSION_FIELDS` irefRingCents/refWarmS; m5Persist strip test |
| Flag `tapCoins` 0 parity | **PASS** | `incomeRefOn`; flag-off identity test; golden-flagoff artifact 7/7 |
| **Broody joins `incomeRefOn` later** | **PASS (deferred)** | documented L13/L25–26; only `tapCoins` now |
| **Inspect exclusion waits abilities** | **N/A here** | ring uses suspended sale path; Inspect not in SALE_EFFECTS yet — no premature exclusion invent |

---

## Diff (tip commit)
8 files, +286/−5: `income-ref.ts`, `game.ts` frame fix, `m5Offline`, `sellTo`/`timers`, `M5_TC_KEYS.tapCoins` + integer window validate, `tests/v5-income-ref.test.ts` (27).

## Minor
**m1 · Parent vs GitHub base:** tip’s parent is `518de30`; GitHub baseOid is `30df38c`. Diff `30df38c..91a0144` also shows reverse of later rc/v5 UI/zg churn. Hosted **gate SUCCESS** on this head — mergeable today; still watch when stacking further tips. Not a sim defect.

## Nit
**n1 · Spec §4.1b “once per sim tick”** vs implementation **on-read**: Architect-directed on-read is correct (same as PR design note §2); wording drift only.

---

## Artifacts / gates

| Item | Status |
|---|---|
| Author vitest | **2053 passed / 1 skipped** (`vitest-full.log`) |
| sync / tsc / build / check-globals / slow | **0** / 17+1 skip (`gates.tsv`) |
| flag-off goldens | 7/7 |
| Independent | **27/27** income-ref tests @ exact head (rule 21 flock) |
| Hosted gate | **SUCCESS** |
| Hosted pacing-x1 shards | SUCCESS ×3; aggregate job **FAILURE** (non-sim; note pending) |
| k10-breeds-offset | FAILURE (KNOWN-RED, non-required) |
| release-globals | SKIPPED |

## Pending
- pacing-x1 aggregate failure triage (if required before merge).  
- Broody extends `incomeRefOn`; Inspect exclusion with abilities stack.  
- No merge/Ready action by Architect this turn.
