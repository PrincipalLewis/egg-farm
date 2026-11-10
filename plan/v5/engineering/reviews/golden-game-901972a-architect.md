# Architect review · PR #111 golden Game (FINAL A) · 901972a2
**Date:** 2026-11-05 22:05 CET (Europe/Belgrade)  
**PR:** https://github.com/PrincipalLewis/egg-farm/pull/111 (Draft)  
**Head:** `901972a2f50435677740a6b1f5e3a31dc6e3a070`  
**Base:** `fix/saves-golden-m5persist` `98d2cbe93ac3a0994079587f41e1a0865051d705`  
**Branch:** `feat/v5-golden-game`  
**Ancestors verified:** `a6d44c2`, `dfaffa6e`, `98d2cbe`, `9add0b6` (all merge-base ancestors)  
**Contract:** arch-golden-slice2-contracts ADDENDUM A/B (REVISED) + Architect refuseNewer FINAL  
**Reviewer:** Architect · `/workspace/wt-review-109-ca04b06` @ exact head  
**Artifacts:** `artifacts/v5-golden-game-901972a/` (SHA256SUMS OK; bundle requires 98d2cbe/ca04b06/b0d7e85/06bf3cf)  
**Logs:** `scratch/architect/review111-901972a/`  
**Scope:** Draft / no Ready / no merge. Coherent integration with #108+#109; not a re-litigation of Saves B.

## Verdict: **FAIL (integration)** — 0 new Game Blocker / **1 Major inherited** / 0 Minor

Game FINAL A, refuseNewer, and m5Persist-untouched claims **PASS** on static review + author evidence. Stack **cannot** be Ready while ancestor tip `dfaffa6` still carries **#108 M1** (`M5_TC_KEYS.abilities` deleted). Fix on #108 (or identical restore on this tip) → Architect re-review.

---

## Integration map
| Ancestor | Role | Status at 901972a |
|---|---|---|
| `9add0b6` | Features A (Unload + T4–T6) | Present |
| `ca04b06`→`98d2cbe` | Saves B + M1 debugBackdateSave | Base; m5Persist body identical |
| `a6d44c2` / `dfaffa6` | GE-AC26 + spawn slice2 | Present; **carries #108 M1** |
| `66b409b` | refuseNewer tests | Same **tree** as 901972a (`939b9b9a…`) |

Tree identity: `901972a^{tree} == 66b409b^{tree}` — full-lane artifact under `results/gates-66b409b-same-tree/` applies byte-for-byte to this tip (author disclosed; Architect accepts).

---

## Checklist (requested)

| Claim | Result | Evidence |
|---|---|---|
| `goldenUnload(s, b, ev, reason)` everywhere | **PASS** | Def `golden.ts` L145; `game.ts` goldenEnd L343; `m5Offline` L116; spawn+game tests updated to `(s,b,ev,reason)` |
| refuseNewer: no mutation / RNG / write | **PASS** | `refuseNewer` L320–325: sets flags, drops mirror, **no** goldenEnd/save; `endSession` early-outs on `inactive`; tests `v5-golden-game.test.ts` L111–128 (hidden+visible); artifact `refuseNewer-mutation.txt`: forcing takeover path **fails both** tests |
| m5Persist untouched (Saves B) | **PASS** | `m5Persist` function body **byte-identical** vs `98d2cbe`. Sole `m5-fields.ts` delta vs base = m5Offline arg-order adapt to A (`offline` after `ev`) |
| endSession compose A | **PASS** | streakPeak → goldenEnd(reload) → session_end → save → flush (`game.ts` L326–330) |
| Layout recheck (R15) | **PASS** | `spawnDue(..., layout)` / `spawnGolden(..., layout?)` — contracts: “Recheck on layout change and every 500 ms”; not an invented spawn API |
| collectible_id Game-only | **PASS** | `game.ts` emit wrapper; sim events unchanged |
| Flag golden 0 / SAVE_VERSION 6 | **PASS** | shipping flags; B unchanged |

---

## Major inherited (blocks Ready)

**M1 · from #108 `dfaffa6` · `M5_TC_KEYS.abilities` missing** (`formulas.ts` L145–150)  
Same defect as `engineering/reviews/golden-spawn-dfaffa6-architect.md`: `abilities: ['ability_s','ability_cd_s']` swallowed into golden comment. Present on this tip. Restore before any Ready on #108 or #111.

---

## Artifacts / gates (inspected, not re-run)

| Item | Status |
|---|---|
| Bundle verify | OK (reqs 98d2cbe, ca04b06, b0d7e85, 06bf3cf) |
| Targeted vitest on 901972a | Author **87/87** (`results/vitest-targeted.log`) |
| Full lane on tree-twin 66b409b | Author **2148 passed / 1 skipped**; slow 17/1 skip; tsc/sync/build/check-globals 0 |
| verify-24h | `verify.json` SHA **66b409b**, result **PASS**; flagOff **f90d1678…9544**; m4On **a54c9cf9…fda5**; trace24h **9c47b11e…** identical to base (`trace-comparison.txt`) |
| Independent local vitest | **LOCK PENDING** (rule 21) |
| Hosted CI | Draft → all required **SKIPPED** |

Provenance note: full 2148 + verify-24h are on **66b409b** with identical tree to 901972a; targeted 87 is on exact 901972a. Acceptable; do not claim a separate full-lane SHA for 901972a itself.

---

## Pending QA / gates
1. Close **#108 M1** (abilities keys) → re-review #108 then re-check this tip (or merge fix forward).  
2. Hosted gate after Ready (today SKIPPED).  
3. Local exact-head when `.vitest-eng.lock` free.  
4. **Stays Draft — no Ready / no merge.**

## Non-scope
- Re-approving Saves B mechanics (already APPROVE @ 98d2cbe).  
- fireAbility / Pause / abilities feature work.  
- #104 F1 gates.
