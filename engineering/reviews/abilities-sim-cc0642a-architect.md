# Architect review · PR #112 abilities sim (fireAbility) · cc0642ae
**Date:** 2026-11-05 22:13 CET (Europe/Belgrade)  
**PR:** https://github.com/PrincipalLewis/egg-farm/pull/112 (Draft)  
**Head:** `cc0642ae4730335eb79f0d047145d6a9d5770b9e`  
**Base:** `rc/v5` `30df38c0a0bd5d48db96d0705abccc6db197d161`  
**Branch:** `feat/v5-abilities-sim`  
**Contracts:** fireAbility addendum 21:29 CET + **D-HOE-41 combo opts 22:11 CET**; spec v1.3.11; persist note `arch-abilities-fireAbility-combo-persist-20261105.md` (amended: **durS = PROPOSAL**)  
**Artifacts:** `artifacts/v5-abilities-cc0642a/` (bundle OK; `results/SHA256SUMS` verified)  
**Logs:** `scratch/architect/review112-cc0642a/` + `contract112-fireAbility/`  
**Scope:** Draft / no Ready / no merge. Sim API + effects only.

## Verdict: **CONDITIONAL APPROVE** — 0 Blocker / **1 Major** / 1 Minor / 1 nit

Sim API and effects match the written addendum (incl. HoE-accepted `refillAgoSimMs?` guards). **Major:** top-level `abilityDurS` not in `SESSION_ONLY_KEYS` (persist leak). **`AbilityState.durS` persist is PROPOSAL only** (Product+Saves) — not required to match a final shape this PR. Close Major (SESSION strip or fold) before Ready.

---

## Diff summary (30df38c..cc0642a)
9 files, +348/−8: new `src/sim/abilities.ts` (119), `tests/v5-abilities-sim.test.ts` (206); Rush/Shout→`SALE_EFFECTS`, Sweep→`LAY_EFFECTS`; Inspect via `inspectTierAdd`→`graderMult`; `ability_used.combo`; `abilitiesTick` last in `TIMER_SYSTEMS`; `abilityDurS?` on `GameState`.

---

## Written API checklist

| Requirement | Result | Evidence |
|---|---|---|
| `abilityEligibility` reason order asleep→unpaid→paused→lockout→cooldown | PASS | `abilities.ts` L43–54 |
| Unavailable `flag_off\|locked\|not_hired\|no_clock` → no blocked telemetry | PASS | L44–47; fire L66–68 |
| `fireAbility(…,{inSheet,viaAll,nowMs,refillAgoSimMs?})` | PASS | L27–31, L65; **D-HOE-41 ratified** |
| Success: `readyAt = nowMs + tc_ability_cd_s*1000` (epoch) | PASS | L75 |
| `wallReady` / E2 absent ⇒ ready | PASS | L53 `wallReady(...)` |
| Combo: inSheet && !viaAll && qualifies; duration `combo_boost_duration_s` else `ability_s` | PASS | L71–72; tests L91–112 (fixtures 10/45) |
| `comboQualifies` SG-3 inclusive sim ms; both flags | PASS | L57–59; test L93–94 |
| No prod literals 10/45 | PASS | only `tcNum`; tests inject (`tests/…` L91) |
| `activateAll` WORKERS MH→CH→Hawker→Grader; silent skips; via_all; never combo | PASS | L86–89; `WORKERS` order; viaAll:true |
| `ability_used.combo:boolean` | PASS | `events.ts` L39; fire L77–78 area |
| `abilitiesTick` focus countdown; early end asleep/unpaid/paused; readyAt kept | PASS | L97–113 |
| Sheet suspend = focus off until sheetCloseComplete (no sim pending) | PASS | header L7–9; tick focus-only |
| Rush MH-only / Shout all sales / Sweep lay / Inspect tierAdd | PASS | `effects.ts` L26–30; `inspectTierAdd` L118–119; `payout.ts` L12 |
| Suspended ⇒ ×1 | PASS | `saleEffectFactors` / `layFactor` / inspect early 0 |
| Flag abilities default 0; no save/UI | PASS | shipping flags; m5Persist untouched |

---

## Major

**M1 · `abilityDurS` unsstripped** — `src/sim/state.ts` L35–38; `SESSION_ONLY_KEYS` (`m5-fields.ts` L34) omits it.  
Any combo fire writes top-level `abilityDurS` into live state → **`m5Persist` will serialize it**. Rejected for ship.  
**Fix before Ready:** add to `SESSION_ONLY_KEYS` **or** stop writing top-level (live duration only via in-memory path Features chooses).  
**Not** the same as Product/Saves **`durS` proposal** — that shape is **pending agreement** and must not be treated as Architect-final.

## Minor

**m1 · Combo reload / E7** — documented gap: `endCalls` still `effect_s = tc_ability_s − min(activeS,tc_ability_s)`. Wrong for 45 s if combo ever persists `activeS>30`. **Owned by Product errata + Saves**; out of Features-only fix until `durS` proposal accepted. Do not block sim API on implementing unapproved persist shape.

## Nit

**n1 · `effects.ts` header** still lists “Frenzy” in SALE_EFFECTS prose; array on this base has streak+rush+shout only (Frenzy lands with golden stack). Pre-existing comment drift vs rc/v5 — fix when merging golden or edit comment.

---

## Artifacts / provenance

| Item | Status |
|---|---|
| Bundle | OK; requires `30df38c0`; tip `cc0642ae…` |
| `results/SHA256SUMS` | Verified OK (all listed files) |
| Author summary | tsc0, sync0, vitest **2056/1 skip**, slow **17/1 skip**, build0, globals0, verify-24h0 |
| verify-24h on tip | `sha=cc0642ae…`, result PASS; flagOff **f90d1678…**; m4On **a54c9cf9…** |
| Base verify | `30df38c0` same goldens; **trace24h identical** `9c47b11e…` (479731 events) — tip unchanged vs base |
| Stale pin note | summary “DIFFERS from 2c0d3ec3” = known stale script pin; **not** a tip-vs-base regression |
| Independent vitest | Pin-path LOCK was free for #108/#111; full 2056 **not** re-run this turn (qualify: author evidence + sums). Rule 21. |
| Hosted CI | Draft → **SKIPPED** |

---

## Pending / gates
1. Features: strip or eliminate top-level `abilityDurS` (**M1**).  
2. Product+Saves: decide on proposed `AbilityState.durS` (D-HOE-41 / persist note).  
3. Econ: land combo CSV columns.  
4. Hosted gate after Ready.  
5. **Stays Draft — no Ready / no merge.**

## Related
- D-HOE-41 addendum written into `arch-golden-slice2-contracts-20261105.md`.  
- #108/#111 M1 abilities keys **CLOSED** @ 90fb447 / 2261670 (separate note).
