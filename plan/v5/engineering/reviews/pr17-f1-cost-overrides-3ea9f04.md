# PR #17 econ/f1-cost-overrides @ 3ea9f04 (base #15 f67a425)
5 commits (c75b6dc, bae4bdf, 11b000c, 4953fb7, 3ea9f04); 20 files. Read-only. Claude: 0 calls. /tmp copy with sibling product/.

## Verdict: APPROVE. Rulings are verified, the data is clean and sync is deterministic. This is an intended LIVE economy change, not flag-gated. Two minors.

## Runs
- tsc clean; check-economy-copy matches product/economy.f1-m4cols.csv; `sync-economy --check` up to date.
- Re-running sync gives byte-identical balance.json (deterministic, no-op).
- vitest 478 pass + 1 skipped. The only failing file is the golden import (pending #14). This matches the PR body's 478.
- build + check-release-build OK; check-globals (Chromium) PASS: only eggfarmExportTelemetry, refused boot [].

## Data and money
- **Data matches the product files:**
  - data/economy.csv sha 86f0e80e… = product/economy.f1-m4cols.csv.
  - data/economy.f1.csv sha 4ad1349a… = product/economy.f1.csv (row-20 w4 fix, decisions.md:271).
  - Shared columns changed vs base: only farm_cost, w4_tier_cost, yawn_at_pct and manage_prompt_threshold, matching the PR body's balance.json diff.
- **farm_cost** L0–L30 is an integer list and strictly increasing (…7024, 10185, 11076, 18201, 31050, 41918…). **w4_tier_cost** is non-decreasing, with tiers 5538/9100/20959/28294/51567.
- **Code:** farmCost() reads costTable and throws on a missing or non-integer level, with no fallback (formulas.ts). graderTierCostCents uses tiers[].cost (src/sim/workers.ts:31-36). Both are integer dollars ×100.
- **Rulings:**
  - Data switch: engineering/decisions.md:17 (HoE).
  - F1-GAP: decisions.md:157 (11076/18201, w4 5538/9100).
  - AC7 L18–22 at 30:00: decisions.md:47. L18 sanity ~19.8 ±10%: decisions.md:111.
  - Test re-baselines: decisions.md:272-276 (00:50, intended F1 shifts: p4 W4 4.5/W4b 5.25, acw1 PY, fixtures f9b0a447).
  - p4 Manage 6.88: decisions.md:290 (00:58).
  - yawn 50 / threshold 0.5: HoP 23:58, decisions.md:253.
- **PR #15 minors landed** in tests/cost-segments.test.ts:
  - The specific-diff assertion replaces toThrow(/farm/): the curve and the CSV differ only at [18, 19].
  - `f1.length === 31` is asserted.
  - economy.f1.csv is vendored and sha-pinned, and cross-checked against product/ when present. ECONOMY_F1_CSV is no longer needed.
- **pacing-targets.json** bounds (L18–22, target 20, at 1800 s; sanity 19.8 ±10%) equal decisions.md:47/:111.

## Saves / offline / parity / determinism
- **Saves:** no schema or version change and no stored cost. Existing saves just see new prices on the next purchase (Farm cheaper from L6, Grader tiers cheaper).
- **Offline earnings:** unaffected. offline.ts and save/ never call farmCost, and the eggs/s and offline columns are unchanged.
- **Flag-off parity:** NOT preserved, by design. F1 is the live shipping balance, not M4-flag-gated, so flag-off differs from main in costs and worker yawn/Manage thresholds. Approved by HoE; storage/sim goldens pinned to main a01faea will need re-pinning after #14.
- **Determinism:** data-only; pure lookups.

## Findings
- **MINOR: validateCostTable does not require strict increase** (formulas.ts, comment "copies the CSV verbatim"). A future CSV edit with a flat or decreasing farm_cost would ship silently, and cost-segments only checks economy.f1.csv's monotonicity, not data/economy.csv's. Add the strictly-increasing check to sync-economy verify, or to a test on data/economy.csv.
- **MINOR: the parity test compares only 17 early-game columns** ("fresh vs live sim"), because economy_sim.py worker columns still carry 40/0.4 (PR body; Economy ruling). Track a follow-up so the worker columns come back into parity once the sim CSV writer (5ad5a3a6, which now writes 50/0.5 per decisions.md:290) is the fixture source.
