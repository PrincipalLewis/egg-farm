# Architect review · PR #106 tapCoins · e5b3d02b3
**Date:** 2026-11-05 22:31 CET (Europe/Belgrade)  
**PR:** https://github.com/PrincipalLewis/egg-farm/pull/106  
**Head:** `e5b3d02b380e0dde1096d789d6a46301a2883f27` (**matches requested exact; not advanced**)  
**Base:** `feat/v5-income-ref` `91a01445362ada4aeaf7215d93f8cf7f79f90312` (stacked; ancestor OK)  
**Spec:** `m5-streak-tap-coins-spec.md` v1.3.2 §3.4 R14/R15/R17, §4.1b  
**Depends:** #105 income-ref **APPROVE** (`income-ref-91a0144-architect.md`)  
**Artifacts:** `artifacts/v5-tapcoins-e5b3d02/` (SHA256SUMS OK)  
**Logs:** `scratch/architect/review106-e5b3d02/`  
**Supersedes:** do **not** review `f7303c6` (stacked on broken `afa8038`).  
**Scope:** sim A1 only; exclude UI / telemetry / zero-pop. No Ready/merge/push this turn.

## Verdict: **APPROVE** — 0 Blocker / 0 Major / 0 Minor / 1 nit

Shared `creditTap` + integer/`BigInt` pay from on-read `refCents`. Independent focused vitest **22 tap + 27 income = 49/49**.

---

## Checklist

| Requirement | Result | Evidence |
|---|---|---|
| Stacked on corrected #105 only | **PASS** | merge-base ancestor `91a0144` |
| Pay on **credited** Collect only (R2/R3) | **PASS** | `actions.ts` collect → `creditTap` then `tapCoinsFor` |
| Formula `floor((refCents×tapBp+5000)/10000)` | **PASS** | `tap-coins.ts` L27–29; ST-AC2b |
| `refCents` on-read at tap (pre-tap state) | **PASS** | `tapCoinsFor(s,b)` before state replace |
| `BigInt` when `r*bp+5000 > MAX_SAFE` | **PASS** | `TAP_COINS_MATH.big`; ST-AC2c spy |
| Never feeds I_ref / no streak·Frenzy mult | **PASS** | coins only; tests L109–112, ST-AC8 |
| R15 pay 0 when refCents low | **PASS** | tests L98–106 |
| R17 Coop Hand asleep taps still pay | **PASS** | ST-AC15 |
| ST-AC16e MH asleep warm-up pay 0 | **PASS** | test L132+ |
| tapCoins alone (no streak): credit window, no s | **PASS** | ST-AC29; `creditTap` / `streakTick` |
| Flag 0 / unlock F&lt;8 | **PASS** | ST-AC1; `creditedTapsOn` |
| M5_TC_KEYS.tapCoins + validate share ≤4 dp | **PASS** | formulas + m5-rules |
| No UI/telemetry/zero-pop in this PR | **PASS** | sim+tests only |

---

## Diff (vs #105)
7 files, +213/−8: `tap-coins.ts`, `creditTap` shared with tapCoins, collect `bonus_cents`, events comment, config keys, `tests/v5-tap-coins.test.ts` (22).

## Nit
**n1 · `bonus_cents: 0` on credited zero-pay events** — sim OK (R15); UI must still suppress `+$0.00` (out of scope here).

---

## Artifacts / gates

| Item | Status |
|---|---|
| Author vitest | **2075 passed / 1 skipped** |
| Independent focused | **49/49** (tapCoins+income-ref) @ exact head |
| Hosted gate | **SUCCESS** |
| pacing-x1 aggregate | **FAILURE** (shards SUCCESS — same class as #105; pending) |
| k10 | KNOWN-RED FAILURE |
| release-globals | SKIPPED |

## Pending
- Merge order: #105 then #106.  
- pacing-x1 aggregate if merge-blocking.  
- UI zero-pop / telemetry later.  
- No Architect Ready/merge action this turn.
