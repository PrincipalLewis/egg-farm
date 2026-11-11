V5-HOP-1 (D-HOP-2026-10-29-01, addendum 19:50 CET; D-HOP-2026-10-29-08 sets tc_streak_cap at 0.28). Vadim gave the go to push and open this PR on Oct 30 at 10:35 CET.

base: rc/v5 @ a923206b80f2c301341d100d9eaa34554e948fb9
head: econ/m51-farm-cost-r27-29 @ 2d15dacdb45884bf1aabce48ea20e7571fb69d66

## Commits
1. **fb7803f: M5.0 shipping CSV 8dc90e2b.**
   - data/economy.csv goes from 125 to 152 columns: 29 tc_* columns added, guard_heartbeat_s and guard_stale_s dropped (no reader in src/ or scripts/).
   - tc_streak_cap 0.4 → 0.28 and w2_asleep_collect_share 0.20 → 0.15 on all 31 rows.
   - balance.json is regenerated with sync-economy, and seller_variance.json is regenerated (only its CSV sha label changes).
2. **bb3f633: M5.1 F27-29 dead zone (o1a).**
   - Exactly three cells change: farm_cost L27/L28/L29 177624/239792/323719 → 160000/175000/190000.
   - The CSV is a8c4e268 (= scratch/f27-verify/csv/o1a.csv). Source: farm/f27-29-deadzone-proposal.md v0.3 (da7b120a).
3. **90c8d4c, 72419a6, 33e775e: merges of rc/v5** (5e38d91, d52f35b, a923206).
   - src/config/balance.json conflicts: I took rc/v5's version and re-ran `npm run sync-economy`, so the m4.flags block is intact.
   - Net balance.json diff against rc/v5: costTable r27-29, m4.tc.streak_cap 0.4 → 0.28, and the added m4.tc keys. Nothing else.
4. **2d15dac: test-only change to #91's tests/v5-m5load-pause-sanitize.test.ts, case F-5.** See the AC trace below. Saves QA needs to re-trace this before merge.

- vendor/economy-sim/economy.f1-m4cols.csv equals data/economy.csv, and SHA256SUMS and SOURCE are updated.
- The new CSV sha is allowlisted (economy.test.ts f1, cost-segments, the AC7 band, the worst-seed guards).
- data/economy.f1.csv is untouched (4ad1349a).

## F-5 test change (2d15dac): AC trace
Before, the F-5 case built its "keys missing" balance from the live `balance`. On rc/v5 the live balance lacks tc.pause_unlock_farm and tc.pause_call_lockout_s, so the test passed there. This PR ships both keys (CSV 8dc90e2b: 10 and 45), so the case stopped throwing and the test failed (1 of 10). The fix strips the two keys from m4.tc in that case only. The test's intent and its assertions are unchanged.

| AC / ref | What is checked | Before | After |
|---|---|---|---|
| CCR-F4 F-5: validateBalance requires the Pause tc keys while flags.pause=1 | `validateBalance(on)` throws `/tc\.pause_(unlock_farm\|call_lockout_s) is required while flags\.pause is on/` | `on` = live balance + pause=1 (keys missing only on rc/v5) | `on` = live balance + pause=1 with both keys removed from m4.tc (missing on every CSV) |
| F-5: PZ (pause on, keys present) loads | `validateBalance(PZ)` does not throw | unchanged | unchanged |
| F-5: shipping balance loads | `validateBalance(b)` does not throw | unchanged | unchanged; now also proves the shipped keys are valid |
| E9/AC-P1, B5, E2/E2b, E12/AC-P2, AC-P13 (the other 9 cases) | m5Load sanitise, flag-off byte-identical | untouched | untouched; 10/10 pass |

## Evidence: artifacts/v5-hop1-2d15dac/results/
The manifest is SHA256SUMS (98 files). sha256 of SHA256SUMS: 416aedb4c4f0878959e5e2bfa9b2b9423a10a35e62aeee4009b13b6c669e8985.

**Gate 1, CI set at 2d15dac: PASS** (ci-set.md; logs in scratch/m51-pr/merge-a923206-fix/)
- sync-economy --check, tsc, check-vendor-pins.
- npm test with 2 workers: 129 files, 1760 passed, 1 skipped.
- test:slow: 16 passed, 1 skipped.
- build, check-globals and build:html (build id m4.1+2d15dac).
- `npm run verify -- --hours 1`: PASS (trace 169457016d1c).

**Gate 2, `qa/m3-scripts/ac7-active-idle-gate.py 30`: PASS 5/5**

| F | P95 | Worst | Limit (P95 / worst) |
|---|---|---|---|
| F10 | 1.528 | 1.586 | 2.00 / 2.25 |
| F18 | 1.590 | 1.637 | 2.00 / 2.25 |
| F22 | 1.633 | 1.672 | 2.15 / 2.25 |
| F23 | 1.633 | 1.670 | 2.15 / 2.25 |
| F24 | 1.641 | 1.675 | 2.15 / 2.25 |

- **CSV read:** the script hard-codes product/economy.f1.csv (4ad1349a), not 8dc90e2b. Supplementary runs on patched copies with a8c4e268 and 8dc90e2b gave results identical to the record (diffs in raw/).
- **Coverage:** the script stops at F24 and hard-codes a 0.30 streak cap, so it cannot see the r27-29 or 0.28 changes. Gate 3 covers those.

**Gate 3, economy_sim pacing vs economy.md §13.2a ±20%: needs a HoP ruling** (pacing.md)
- **Control:** the 8dc90e2b control run reproduces the predictions.
- **Pass:** all 18 blocking window-ratio rows (worst seed 1.936 against 2.25), worker L10 P95 11.05/11.37 against 12.1, the step-ratio delta gates, and pause rows (a)-(g) (worst +1.35%).
- **Out of band, all favourable:** 9 blocking dead-zone rows (L894-896) are below the band, at ×0.45 to ×0.83. Cutting farm_cost at r27-29 removes the late dead zone. The P95 ≤ 180 s row passes everywhere.
- **One absolute clause fails** (L895, frenzy-holder casual worst): 140 s against 129 s for the no-mechanics run on the same seeds. Both figures are well under 180 s.
- **HoP needs to choose:** sign off a re-prediction of the dead-zone rows on a8c4e268, or rule that favourable drift doesn't block.
- **Not run:** L903-905 (the sales-stopped chip and the AC7 flag-off rows). They need pacing-x1-stack, which runs on the RC SHA. L904 needs a re-baseline, because r27-29 differ from c7bb783f.

## Before merge
- Saves QA re-traces the F-5 change in 2d15dac.
- HoP rules on the Gate 3 dead-zone rows.
- The full gate set for o1a on QA's TS bot (HoQA).
- check-economy-copy --strict flags drift from product/economy.csv (c7bb783f) until product/ is promoted.

Cut rule: if the RC gates fail, revert commit 2 (the farm_cost rows).
