# Architect review · PR #114 Saves endCalls `durS` · `e4117c4` · 2026-11-05 22:36 CET (Europe/Belgrade)

**Requested exact:** `e4117c4dfa7b9d9e6ecf8b5b28590936e3df0e58`  
**Live headOid:** `e4117c4dfa7b9d9e6ecf8b5b28590936e3df0e58` — **MATCH**  
**Branch:** `fix/saves-endcalls-durs`  
**Base (Features #112):** `2ec5b803e65bc6c16299202d581114e3cacdebdf` — merge-base == base (**OK**)  
**PR:** https://github.com/PrincipalLewis/egg-farm/pull/114 (**Draft**)  
**Spec / contracts:** abilities **v1.3.12** (`9d521aa8…`); D-HOE-41; `arch-abilities-fireAbility-combo-persist-20261105.md` §4; residual from `abilities-sim-2ec5b80-architect-addendum.md`  
**Scope:** `engineering/reviews` + status only. **No Ready / merge / push / messages.**

## Verdict: **APPROVE (Architect · Saves contract)** — #112 Saves residual **CLOSED** · Ready still needs **QA + hosted gates**

Closes the Architect-documented Saves integration gap that blocked #112 Ready. Independent gates on the exact tip: **tsc 0**, **vitest 146 files / 2066 passed / 1 skipped**. Hosted CI at tip is **SKIPPED** (Draft). **Do not mark Ready on static PASS alone.**

---

## Delta (`2ec5b80`..`e4117c4`)
1 commit · 2 files · +68/−5: `src/save/m5-fields.ts` (`endCalls`) + `tests/v5-f2-m5-fields.test.ts` (`[D-HOE-41][AC]` ×3).

| Claim | Result | Evidence |
|---|---|---|
| `granted` = finite `durS` > 0 else `tc_ability_s` | **PASS** | `endCalls`: `fin(durS) && durS > 0 ? durS : base`; `fin` = number ∧ finite ∧ ≥0 |
| Invalid `durS` (0 / neg / NaN / non-number) → base path | **PASS** | Same; AC loop `[0, -4, NaN, '45']` → `effect_s = tc.ability_s - 12` + strip |
| Cap when `combo_boost_duration_s` present: `max(base, combo)` | **PASS** | `cap = Number.isFinite(combo) ? Math.max(base, combo) : undefined`; then `granted = Math.min(granted, cap)` |
| `activeS` clamp `[0, granted]`; `effect_s = granted − clamped` | **PASS** | `granted - clamp(activeS, 0, granted)`; AC durS=45/activeS=40 → ≈5; activeS>granted → 0 |
| Clear **both** `activeS` + `durS`; `readyAt` stays; **no resume** | **PASS** | Destructure both into `rest`; idle leftover `durS` stripped w/ no event; input not mutated (load spreads) |
| No `SAVE_VERSION` bump | **PASS** | Still `SAVE_VERSION = 6`; AC asserts `SAVE_VERSION === 6` |
| Load + offline same path | **PASS** | Both call `endCalls`; AC exercises `m5Load` and `m5Offline` |
| Top-level `abilityDurS` still absent | **PASS** | No new leak; Features grep-clean tests still present on base |

---

## Contract pin (v1.3.12 / §4)

Matches Product-authorized shape and `AbilityState` in `src/sim/m5-state.ts` (granted at fire; cleared with `activeS` on load/offline). Aligns with sim `abilitiesTick` fallback (`durS` absent ⇒ `tc_ability_s`) while adding the Saves-only defensive combo cap when the tc key exists (shipping balance still lacks combo columns — fixtures-only; Econ residual unchanged).

**Prior #112 residual (addendum):** `effect_s` ignored `durS`; `durS` could remain after end; no clamp to granted — **all three closed** at this tip.

---

## Tests / gates (exact `e4117c4`)

| Gate | Status | Notes |
|---|---|---|
| `npx tsc --noEmit` | **0** (independent) | Linked `node_modules` from sibling WT; log `scratch/architect/review114-e4117c4/tsc.txt` |
| Focused `tests/v5-f2-m5-fields.test.ts` | **37/37** | Includes all three `[D-HOE-41][AC]` |
| Full `vitest run` | **146 files · 2066 passed · 1 skipped** | Independent under `.vitest-eng.lock` (~75s); author claim **verified** |
| Hosted `gate` / pacing / release-globals | **SKIPPED** | Draft PR — expected |
| verify-24h / artifacts bundle | **not attached on PR** | Author checklist unchecked; not blocking Architect contract PASS |

---

## Majors / minors

- **Majors:** **0**
- **Minors:** none blocking. Cap uses `Number.isFinite(combo)` without positivity; a non-positive finite combo collapses toward `base` via `Math.max` — acceptable for defensive Saves; prod keys still Econ-owned.
- **Out of scope residual:** combo CSV prod keys (D-HOE-41a) — Econ; Pause #115 stack; #113 F-2 restack.

---

## Ready / merge posture

- Closes Architect **Ready dependency** from `abilities-sim-2ec5b80` addendum (Saves `endCalls` / `durS`).
- **#112 / #114 Ready still requires:** HoQA verdict + hosted gate SUCCESS at a frozen tip (and any HoE checklist). **Architect does not mark Ready.**
- Stays **Draft** until QA + gates. No merge/push from this review.

## Logs
`scratch/architect/review114-e4117c4/` (checkout, diff, tsc, vitest-full, pr.json)

---

## Addendum · HoE formal Ready ask · 2026-11-05 22:37 CET (Europe/Belgrade)

**Tip reconfirm:** `e4117c4dfa7b9d9e6ecf8b5b28590936e3df0e58` still MATCH; baseOid `2ec5b803…` MATCH; Draft; hosted checks still **SKIPPED**.

### Stack review
| Layer | SHA / PR | Role |
|---|---|---|
| Features #112 | `2ec5b80` | AbilityState.durS at fire + tick clear; top-level abilityDurS removed |
| **Saves #114 (this)** | `e4117c4` · 1 commit | `endCalls` honors durS on **m5Load + m5Offline** |
| Pause #115 (downstream) | `409fa6a` base=`e4117c4` | Stacked Draft; **not** a Ready gate for #114/#112 |

Stack is linear and tree-clean for the Saves residual. Merging/Ready of #114 closes the Architect dependency that blocked #112 Ready; #115 stays independent Draft work.

### m5Offline (explicit)
- Production: `m5Offline` shallow-copies `abilities` then calls the same `endCalls` as `m5Load` (`m5-fields.ts` ~L106–109).
- Tests: `[D-HOE-41][AC] durS=45, activeS=40` asserts **both** `m5Load` and `m5Offline` emit `effect_s≈5` and clear both keys (with and without combo key). Legacy/invalid/over-granted ACs go through `m5Load` (same `endCalls`).

### Full-suite provenance (Architect independent — Saves evidence)
| Item | Value |
|---|---|
| Tip | `e4117c4` (checked out `review-114-e4117c4` in `wt-review-109-ca04b06`) |
| Command | `vitest run` under `.vitest-eng.lock` (rule 21; lock free) |
| Wall start | **2026-11-05 22:34:09 CET** (Europe/Belgrade) |
| Result | **146 files passed · 2066 passed · 1 skipped · exit 0** · ~75.33s |
| tsc | `tsc --noEmit` **exit 0** same tip |
| Log | `scratch/architect/review114-e4117c4/vitest-full.txt` (+ `tsc.txt`) |
| Author claim | 2066/1 + tsc0 — **verified**, not author-only |

**Qualify — need more Saves full-suite before Ready?** **No additional Architect suite.** Independent full vitest + tsc on the exact tip is sufficient Saves evidence for Architect Ready recommendation. Remaining Ready gates are process/CI/QA, not missing suite runs.

### Draft CI
All rollup checks at tip (**gate**, pacing-x1, release-globals, k10) = **SKIPPED** (Draft). Expected; **hosted gate SUCCESS after undraft is a Ready blocker**.

### Ready recommendation (no mutation performed)
**CONDITIONAL YES — recommend undraft / Ready only when blockers below clear.** Architect content: **APPROVE**. Does **not** itself flip Ready/Draft.

| ID | Blocker before Ready? | Detail |
|---|---|---|
| B1 | **YES** | Undraft + hosted **`gate` SUCCESS** at frozen `e4117c4` (Draft SKIPPED today) |
| B2 | **YES** | **HoQA** exact-head ACK / verdict |
| B3 | No (Architect) | Extra full vitest — already done independently |
| B4 | No (Architect) | New verify-24h — **not required** for this Saves-only +68/−5 tip (no sim/econ delta; #112 verify remains the stack sim baseline) |
| B5 | No | Pause #115 / combo CSV Econ — out of band for #114 Ready |

**#112 Ready path:** once #114 clears B1+B2 (or lands), Architect Saves residual from `abilities-sim-2ec5b80` addendum is closed; #112 may then proceed on its own HoQA/gate posture. This note does **not** mark either PR Ready.
