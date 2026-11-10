# PR #38 review: Market Hand min wait @ fe33db2, base main 8e6d53e
Claude Code Reviewer (read-only), 2026-10-17 ~10:00 UTC+2. Zero Claude calls. Detached worktree. PR comment read via read-only GitHub MCP.

## Verdict: PASS (no blocking or major findings; 3 minor, 2 nits)
## Golden re-pin audit f90d1678 → 9089892a: CONFIRMED, fully explained by min wait
- In a scratch copy, setting `workers.market_hand.min_wait_s = 0` in balance.json reproduces **f90d1678 exactly** with the PR's code, and storage pins pass. The tick change is only `if (!servable(c, b)) continue;` and validateBalance allows 0, so the rule disabled = main.
- Event-stream diff of the golden scripted run (mw 0 vs mw 2, same code):
  - Events 0-171 are identical.
  - The first divergence is at tick 411, event 172. mw=0 has a Market Hand `sell` to customer id 8 with waitedS 0.9 s (< 2 s); mw=2 skips it, and the next event is the player's collect.
  - The divergence starts at the first Market Hand serve of a customer under 2 s, as required.
- Storage pins (PINS) are unchanged and pass. There is no save-shape change: there is no new state field, and waitedS already existed.
- Superseded pin e7dad040 (c05c83a, unpaid hold) is documented in the golden comment for the audit trail.

## Verified
- **Determinism.** Wait time is sim time: `waitedS += dt` at tick.ts:29, before workerActions at :50 in the same step. There is no wall clock.
  - `advance` always runs fixed 1/tickHz steps, for normal frames (game.ts:148) and for hidden-tab catch-up (game.ts:164). Offline grant (applyOffline) never runs workers, so it is unaffected (no extra or missed sales).
  - Boundary: 20 × 0.1 = 2.0000000000000004 is servable and 19 ticks is not, so the 1e-9 tolerance covers float accumulation.
  - The frame size doesn't matter: 60 s at 16 ms frames vs 250 ms frames gives identical coins and basket.
- **Patience.** customer_patience_s = 30 is far above 2, so no customer can leave before becoming servable. No starvation: unservable customers are skipped with `continue` and served on a later turn.
- **Ordering.** Queue order, oldest first. Skipping a young customer doesn't block older ones.
- **Wages unchanged vs main.** The diff touches only the serve loop; the wage/cdS code is untouched, so a turn with nobody servable still pays (HoP MK-59 ruling).
- **Vendored sims.** economy_sim.py 0ee6433c and seller_variance_sim.py 20c289da each drop only the `hold_until_servable` wage-hold clause (1 line). The serve loop still skips `t - arrival < defer`, with defer = market_hand_min_wait_s via spec_from_csv.
  - SOURCE, SHA256SUMS and README agree. check-vendor-pins passes. The tamper-test regexes are moved to the 0ee6433c prefix.
  - TS/Python parity tests (11 seller-variance, incl. full action traces seeds 1-5) pass.
  - Fixtures regenerated with `python3 -B` are byte-identical to the PR's (clean status).
- **CSV and sync.** The CSV is unchanged: market_hand_min_wait_s = 2 was already a column at 6dca24cd. balance.json gains `market_hand.min_wait_s: 2`. sync --check passes. sync now drops a stale min_wait_s if the column disappears (scripts/sync-economy.ts:111).
- **s2-3a.** No UI/src/ui change (no UI string). The test now follows MK-21 exactly as worded in product/market/s2-3a-proposal.md:38 and feature-spec.md:68: Farm L10-14, Market Hand Working, ≥ 500 eggs, 60 s, ≥ 40%.
- **AC7.** L@30 without workers P5/P95 20/20, with workers 20/21 (= main and the PR comment).
  - Worst-seed: variance L18-25 P95 361.0 s (≤ 390), worst 378.3 s (≤ 480). Fixed 270 s (≤ 360). t20 P95 1670 s (warn 1740).

## Gates @ fe33db2
- tsc: OK. sync --check: OK.
- vitest full x2: 604/604, 604/604.
- golden: 2/2 (9089892a + storage pins).
- test:slow: vendor pins OK + 14/14.
- build and build:html: release checks OK.
- git status: clean after everything.
- check-globals, PORT unset: PASS (only eggfarmExportTelemetry).
- rc0 Chromium: 212/212.
- --strict: exit 1, with 2 ERRORs: vendored economy_sim.py 0ee6433c vs product/sim 10f29a4a, and seller_variance_sim.py 20c289da vs product 68a64c59.

## Merge conflicts (preview, merge-tree)
- vs #37 (85e5bb1): CONFLICT in vendor/economy-sim/SHA256SUMS, SOURCE (the economy.f1-m4cols.csv row 6dca24cd→9980ec22 next to the sim rows) and engineering/status.md.
  - Resolution: take #37's 9980ec22 CSV row plus #38's two sim rows.
  - Then re-pin the golden? No: #37 is data-only and the sim ignores the column. Re-run the full gates after the merge-forward.
  - Also README lines and the economy.test map need the 9980ec22 entry (auto-merges from #37).
- vs #31 (d75d41f) and #5 (a56b3a2): no textual conflict. #31 also touches tick.ts / golden, so re-run the golden after the merge-forward. Its pin must still be 9089892a only if #31 is flag-off-neutral.

## Findings
- **m1 (minor, provenance):** SOURCE claims sim/economy_sim.py 0ee6433c and seller_variance_sim.py 20c289da come from product/sim/, but product/sim still holds 10f29a4a / 68a64c59 (--strict red). Economy must promote both files, or SOURCE should name the actual source (scratch path) until then. The vendored bytes can't be traced to product today.
- **m2 (minor):** the PR comment quotes "workers t20 P95 1682.8 s (Economy 1683)". My TS run prints t20 P95 1670 s, identical to main at #36. Clarify which bot produced 1682.8 (Python?). Either value is under the 1740 warn threshold.
- **m3 (minor, scope):** decisions.md:331/336 (HoP 08:21) approves `market_hand_hold_s = 5` / `last_chance 1.0 s` AND keeps min_wait_s = 2. This PR implements only min wait. That's fine, but the hold rule (MK-57) is still unimplemented; track it so MK-59a isn't judged against this build as if the hold existed.
- **n1 (nit):** tests/s2-3a.test.ts dropped the old multi-seed (1, 2, 3, 99) visibility loop and the "before < 25%" check. It now runs seed 7 only, across 3 levels. That matches MK-21, but it gives less seed coverage.
- **n2 (nit):** tick.ts:96 `servable` comment cites "HoE ruling" and "HoP MK-59". MK-59 is the hold-rule bar, and the wage ruling is decisions.md:336. Cite the line.

## Correction to my #36/#37 notes
check-economy-copy --strict does NOT stop at the first ERROR (here it printed 2). In #36/#37 product/economy.csv was presumably already promoted and simply didn't drift. Please disregard the "stops at first ERROR" remark in those reviews.
