# Balance change log (Economy)
Newest first. Only changes to economy CSVs / economy rules are logged here; proposals are listed as PROPOSED.


## 2026-10-17 — R-AC7-W-ZERO-MARGIN logged (no economy buff)

- Measured with-workers variance bot on F1 m4cols 86f0e80e, 100 seeds: L@30 P5=20 (36×L20/64×L21); P5 time-to-L20=26.00 min (slack 239.9 s); worst time-to-L20=29.11 min (slack 53.6 s).
- farm_cost +5% drops a seed below L20; +10% drops P5 below L20. Soft guard proposed: P5 t20 ≤ 27:00 (X=180 s). Hard band unchanged (needs HoP).
- Full entry: `product/m4-risk-list.md` § R-AC7-W-ZERO-MARGIN. Raw: `scratch/ac7_zero_margin_*.json`.

## 2026-10-16 ~16:15 — w4_tier_cost L20 fix (mechanical)
- L20 w4_tier_cost 10707 → 9100 in economy.f1-m4cols.csv, economy.m4branch.csv and economy.m4-candidate.csv (LF, all numeric; backups scratch/bak-w4-1600/). L20 is still Tier 2, and every row repeats its tier's cost (T2 = 0.5 × L19 farm 18,201 = 9,100). 10707 was left over from before F1-GAP. The game reads the tier's first row, so balance.json doesn't change. Engineering patch: scratch/m4a-w4-L20.patch. With it, `npm test` on 4ba3c31 gives 470/470. Without it, the branch's check-economy-copy now fails on line 22.
- Gates on 4ba3c31: TR-5 default/60/workers/realistic/casual all PASS. M4A-38/39 PASS (per-row CSV costs). M4A-40 PASS with the best-payback highlight bot (sim/m4/m4a_gate40.py).

## 2026-10-16 ~15:40 — m4/m4a-tracks merge prep (HoP 15:29), not committed
- Worktree /tmp/m4a-wt (detached at 6f4c0a6 = branch head). data/economy.csv = economy.f1-m4cols.csv (LF; 46→110 cols). Patch: product/m4a-economy.patch. Staged product copy: product/economy.m4branch.csv. product/economy.csv untouched (main).
- Build/test: tsc PASS. `npm run check-economy-copy` FAIL (expected: product/economy.csv still main). sync-economy FAIL "could not fit farm costGrowth": the branch has no cost segments (Engineering ce7d59a is on f1/cost-segments) and no per-row taper. vitest: 32 failed / 417 passed (baseline 455/455).
- Python gates on the branch data: M4A-35 PASS (L21, 1.50 min; 60 min 2.75); with workers PASS (L23, 1.00); realistic PASS (60 min 2.00); M4A-36 PASS; M4A-37 PASS 30/30; M4A-38 PASS (85% switches, run 2); M4A-39 PASS (±4.2%, L20–21).

## 2026-10-16 ~15:05 — tr5_run.py --workers (tooling, no CSV change)
- `--workers` reuses sim/m4/m4_workers_prog.run: hires, Grader tiers, v0.3 abilities, and stop-at-completion. It implies the L20–24 band at 30:00 (HoP 14:58); `--workers-band` alone still works. Realism options: `--refill-delay S`, `--ability-jitter S`, `--ability-skip P`. Backup: /tmp/m4a-m1-bak/tr5_run.pre-workers.py.
- Results (30 seeds, both CSVs):
  - Default: PASS, L21, worst gap 1.50 min.
  - `--workers`: PASS, L23 (23–24), worst gap 1.00 min.
  - `--workers --refill-delay 60 --ability-jitter 60 --ability-skip 0.2`: PASS, L23, worst gap 1.00 min. Over 60 min the worst gap is 2.00 min, PASS.

## 2026-10-16 ~15:05 — Workers + Grader re-check of M3 (no CSV change)
- sim/m4/m4_workers_prog.py, run on both CSVs with 30 seeds. Every gap ≤ 3.0 min (worst 90 s with workers at F28–29; 165 s in the no-worker control). F30 is reached at 40.75 min with workers. Active/idle 1.53/1.58/1.62.
- Decision proposal: keep M3 ×0.90/×0.70 and keep the Grader T5 cost at 51,567. Flag: with workers, Farm @30:00 is L23 (the TR-5 band is defined without workers).

## 2026-10-16 ~15:00 — M3 cost taper (HoP approved 14:52, condition: strictly rising costs)
- **Files:** economy.f1-m4cols.csv, economy.m4-candidate.csv (LF, all numeric). Backups /tmp/m3-bak/. F1 tables (economy.f1/-gapfix/-choice.csv) unchanged: no egg_value_cost, and the cut is validated only for the v7 three-track model.
- **farm_cost:** L23 ×0.90 76395→68756; L24–29 ×0.70: 103134→72194, 139230→97461, 187961→131573, 253748→177624, 342560→239792, 462456→323719.
- **egg_value_cost:** L23 ×0.90 33871→30484; L24–29 ×0.70: 45048→31534, 59914→41940, 79686→55780, 105982→74187, 140957→98670, 187473→131231.
- Plain ×0.70 at L24 broke monotonicity (72194 < L23 76395; 31534 < 33871). L23 ×0.90 is the smallest taper that fixes it. The ×0.9/0.8/0.7 from L22 fails the gap check (3.50 min).
- **Checks:** both columns strictly rising L0–30. TR-5 60 min worst gap 2.75 min, 30/30. TR-5 30 min PASS (F18 20.75, L21, gap 1.50). M4A-37 casual 30/30 (median 34.67 min).
- Farm-only tapers compared (HoP 14:54): best Farm-only 3.25 min (L23 x0.9, L24-29 x0.65, 19/30) fails; both-track taper kept.
- **Open:** w4_tier_cost T5 (51567 = 0.5 × old L24 Farm) is unchanged; HoP to decide whether to keep the 0.5× link (would be 36097).

## 2026-10-16 ~15:00 — M4-A review fixes (HoP approved 14:45, decisions.md)
- **Files:** economy.f1-m4cols.csv, economy.m4-candidate.csv (kept in sync; LF; all numeric; 110 cols). Backups /tmp/m4a-m1-bak/.
- **M1:** `hens_ms{1,2,3}_mult` renamed `hens_ms{k}_coop_mult`; new `hens_ms{k}_offline_mult`. Values 1.25/1.5/2.0 at H10/20/30 unchanged. Meaning: × coop size and × offline eggs; lay rate no longer scaled.
- **Rules (spec, no CSV cells):** B1 migration V grandfathered over F+3; integer-cent half-up price compare; M2 accepted; stack text ×7.8.
- **Sims:** m4_active.py, farm/m4/m4_sim.py (coop × milestone, lay plain), tr5_run.py (`--minutes`, `--tune`, `--taps`, `--ac37`).
- **Checks:** TR-5 30 min PASS (F18 20.75, L21, gap 1.50); M4A-37 casual 0.5 tap/s 30/30 F18 ≤45 min PASS; active/idle 1.53/1.58/1.61.
- M3: see the taper entry above (applied).

## 2026-10-16 — economy.f1-m4cols.csv CRLF → LF (cells identical)

- 2026-10-16 14:58: NOTE: economy.f1.csv / f1-gapfix / f1-choice farm_cost L23-29 is superseded by economy.f1-m4cols.csv (M3, HoP 14:56). Do not merge the old numbers. Grader top tier stays at 51,567 (HoP: no re-link). See economy.f1.SUPERSEDED.md.

- 2026-10-16 14:58: Pacing band at 30:00 split (HoP decisions.md 14:58): no-worker runs Farm L18-22 (unchanged); runs WITH workers Farm L20-24. Basis: the workers model gives L23 with or without M3. M3 cut and Grader top tier 51,567 are final.
- Oct 16 23:15, Head of Product: economy-gate standard. Pacing gates judged on P95 with worst-seed guards of ≤2.25x and ≤4 min. Abilities locked. L40/L50 milestones x1.15. Workers required by L30 and expected by about L10-18. First-hire nudge at F3 owned by PM Workers.
- Oct 16 23:19, Head of Product: abilities locked, Focus +5% with 30 s cooldown; logged exception: 2x active/idle at P95 ≤2.15 for F22-24 only, worst ≤2.25, re-check against telemetry after playtest. L30+ uses F+5 caps from L40. Refill rc2 approved at 150 s / cap 2 / threshold 50%. First-hire nudge at F3 approved. L18-25 level-step check worst-seed guard ≤8 min.

- Oct 16 23:30, Head of Product: level-step ratio only counts when the previous level took >=1 min, at every level range; absolute guards unchanged. L18-29 step ratio is warn-only (hard gate from L30). TR-5 on economy.f1-m4cols.csv recorded as PASS.

- Oct 16 23:36, Head of Product (via PM Workers): w2_asleep_collect_share=0.15, nudge_coopfull_share=0.50, nudge_coopfull_window_s=300 added to economy.f1-m4cols.csv and economy.m4-candidate.csv.
- Oct 16 23:36: nudge_coopfull_min_farm=7 added to both files.

- Oct 16 23:37, Head of Product: L30+ gap fix (a). Add Hens and Egg value rows L51-55 and keep the F+5 cap rule. Gate: the gap between purchases must be <=4 min at P95 (ideally <=3), with the other gates unchanged. The L50 target is not trimmed, and contracts and abilities do not count as purchases. The +$1 cost steps are accepted for now and flagged as polish (the UI must never show a near-zero increase). The load clamp goes from 30 to 55. hv_extra_cost_farm_share is priced as a share of the current Farm cost, so the buy gate needs the current Farm level (L30-17).
- Oct 16 23:38: Head of Product confirmed all four approved, against economy.f1-m4cols.csv sha256 053b2ba5ad71:
  - w2_asleep_collect_share=0.15.
  - nudge_coopfull_share=0.50 (strictly more than 50%).
  - nudge_coopfull_window_s=300 (active play only).
  - nudge_coopfull_min_farm=7.
  "Once per session" and "never when a hand is hired" are behaviour rules for the spec, not CSV values.
- Oct 16 23:40: Revision 70009738d2d1 supersedes 053b2ba5ad71. Changes: w2_asleep_collect_share 0.15 to 0.20, and new column leave_attended_window_s=30 (MK-33a; the leave penalty is charged only if the player sold by hand in the last 30 s or the Market Hand is awake). PM Workers relayed these as Head of Product-approved, tied to MK-33a shipping in the same build; I have asked Head of Product to confirm. m4-candidate is d09a8495. Backup: scratch/csv-bak-2340/.
- Oct 16 23:41: Head of Product confirmed revision 70009738d2d1 as APPROVED and the new TR-5 baseline, replacing 053b2ba5ad71. MK-33a and leave_attended_window_s=30 are approved. w2_asleep_collect_share=0.20 holds only if MK-33a ships in the same build; if it slips, the share reverts to 0.15.
- Oct 16 23:45, Head of Product: L30+ candidate APPROVED, economy.l30plus-candidate.csv sha256 77a68a613189 (56 rows, Farm max 50, Hens/Egg value max 55, clamp 55). It goes to l30plus-spec v0.2. A polish pass starts as a separate candidate; the approved file is the fallback, and no gate may regress.
- Oct 16 23:58, Head of Product: APPROVED yawn_at_pct=50 and manage_prompt_threshold=0.5 (was 0.4), matching refill_threshold_pct=50, so the yawn, the Manage prompt and the refill all appear at the same moment. The yawn change had been missing an explicit approval. economy.md PT1-P4 is updated. economy.f1-m4cols.csv revision 86f0e80e3593 supersedes 70009738d2d1.
- 2026-10-17 00:1x Economy: **economy.l30plus-candidate.csv corrected revision 3e3d61fdc869** (HoP-approved values, no gate change on 100 seeds): rows L0–29 = f1-m4cols 86f0e80e3593 verbatim; manage_prompt_threshold 0.5 on all rows; collection_cost L30–55 = floor(10×1.6^L); + farm_max_level=50, hv_extra_second_markup=0.10. Backups: scratch/l30-polish/.
- 2026-10-17 00:1x Economy: **economy.l30plus-polish.csv b59c4e0db7e7 — shipping candidate (HoP 00:04)**. Only farm/hens/egg_value_cost L30–55 differ from 3e3d61fd: no +$1 steps (all ≥ +2%), casual+workers ratio worst 2.20, workers gap P95 3.25. L35 54.5 = noted variance (≤55).
- Oct 17 00:04, Head of Product:
  1) economy.l30plus-candidate.csv 3e3d61fdc869 approved as the L30+ baseline and fallback, replacing 77a68a61.
  2) economy.l30plus-polish.csv b59c4e0d approved as the shipping candidate. L35 at 54.5 min is a NOTED VARIANCE (L35 <=55) within the approved median +/-20% level-time tolerance, not a gate change. Full 4-scenario gate (100 seeds) recorded 2026-10-17: workers L35 54.5 / L40 66.8 / L50 100.8 step 1.88/1.88 gap 3.25 active/idle ≤1.80 PASS; casual+workers L35 58.0 / L40 71.0 / L50 105.0 step 2.00/2.20 gap 3.67 PASS; L30-19 nudge_f25_noworker P95/worst 20 s PASS. late_curve.py sha f0e3f1180ab0.
  3) L30-19 requires a dedicated no-worker hire nudge at F25+, separate from the coop-full tip; PM Farm Upgrades and PM Workers will spec it. The F25 affordability probe (P95 20 s) satisfies the affordability half. Head of QA: the sim must model it as a named event.
- Oct 17 00:12, Head of Product (relayed by PM Farm Upgrades; Head of Product's written ruling): EX-1 re-approved for release with the casual+workers L30-40 step ratio at P95 <=2.25 and worst <=2.25. QA measured 2.20/2.20, so polish b59c4e0d is cleared. The polish2 work is stopped. Post-launch telemetry will re-judge it.
- Oct 17 00:28, Head of Product:
  - L30+ extra-level price = max(row cost, hv_extra_cost_farm_share x current farm_cost x (1+0.1 x (extra-1))), replacing the 'replace' rule. This closes the buy-ahead exploit (polish 7/44 below row, now 0/44). No CSV change.
  - Shipping candidate is economy.l30plus-polish.csv b59c4e0d.
  - Workers step ratio is exactly 2.00 with max(): passes at <=2.0, but ZERO MARGIN.
  - 3e3d61fd is RETIRED as the release fallback (fails EX-1 at 2.40). If b59c4e0d+max regresses, hold the L30+ release rather than ship the old file.
  - QA's official gate run is 100 seeds, not 30.
  - Pinned sim late_curve.py now defaults to max() (HV_MAX_ROW=0 restores the old rule).
  - Pinned late_curve.py sha256 ab928dc96d1c (was f0e3f118; backup at scratch/l30-max/).
- Oct 17 00:35, Head of Product:
  - ac7-l18-25 runs WITH workers. No CSV change and no L23 cut. TR-5 stays the no-worker L18-25 check (PASS).
  - Build ce7d59a used formula costs (costGrowth 1.35, empty segments) instead of the approved CSV: filed as an Engineering bug. The CSV is the source of truth.
  - L30+ release gate on b59c4e0d + ab928dc96d1c at 100 seeds: PASS, 0 hard fails (qa/m3-recheck/l30plus-gate-2026-10-16.md).
- Oct 17 00:37: fixed product/economy.f1.csv (e4847fe4 to 4ad1349a) row L20 w4_tier_cost from 10707 to 9100 (Grader tier 2 repeats L19), reported by Features. The approved m4cols (86f0e80e), m4-candidate and polish (b59c4e0d) already had 9100. Data fix only, no design change.
- Oct 17 00:50: Rulings on the F1 build test failures (econ/f1-cost-overrides bae4bdf): all are intended F1 shifts with new expected values, no regressions.
  - economy_sim.py updated to F1 per-level costs (sha 1178d8c6). Parity fixtures regenerated (f9b0a447).
  - 'L18 in 24-36 min' retired per decisions.md:47. The sim gives 19.75 min; optional sanity band 17.8-21.7.
  - p4: W4 4.5, W4b 5.25.
  - acw1 PY: {pass10 100, medF10 10.33, medF18 21.33}.
- Oct 17 00:55: Head of QA F-1 (deterministic seller15).
  - Variance bot proposed: product/sim/seller-variance-proposal.md (sha 17877b41).
  - AC7 passes at 100 seeds; with workers it sits on the L20 lower edge.
  - Target and whether the fix blocks verification are pending Head of Product.
  - Head of QA supports this as the post-rc1 standard (TR-AC7-TAIL). Not needed for rc1.
  - Variance RNG is pinned per seed; var=None stays as the regression fixture.
  - KNOWN ZERO-MARGIN: with-workers AC7 P5 and worst seed sit at L20, the lower edge of L20-24.
- Oct 17 00:58, Head of Product: F-1 variance bot (17877b41) APPROVED as written.
  - At least 50 distinct L18 times per 100 seeds.
  - L18 P95 3-15% above P50.
  - AC7 judged at P5/P95 with the variance bot; the fixed bot is a regression fixture only.
  - Band edges are inclusive (with-workers L20 passes, zero margin).
  - AC7 counts as VERIFIED only once the TS bot port lands. Doesn't block rc1 or tonight's ac7-l18-25 re-run; required before any later release that changes pacing numbers.
- Oct 17 00:58: p4 Manage per 15 min expected value updated 5.62 to 6.88 (±10%), an intended shift: yawn 50 / threshold 0.5 +1.125, F1 costs +0.125. economy_sim.py sha 5ad5a3a6 (CSV writer now yawn 50 / 0.5).
- Oct 17 01:00: PM Workers retired manage_all_min_workers (3): the Refill bar shows from 1 tired or asleep worker (fix c231c02). Mark it deprecated or remove it in the next CSV revision; no revision just for this.
- Oct 17 01:15: pacing.test L10 band: keep both bounds. Fastest seed >=8 min (fast tail) plus P95 seed <=12 min (slow tail), per the approved 8-12 band.
- Oct 17 01:20: PR #19 (3155bbd) variance TS port validated. Parity is within 1% on F1, and the tolerances (1e-12 / 2%) are accepted. Before AC7 counts as VERIFIED: a runM2 exact old-bot check, plus switching pacing.test AC7 to the variance bot after F1.
  - runM2 old-bot check accepted as per-seed tolerance (efd7d94): same levels, equal L@30, reach times within 15 s, at most 2 distinct L18 times. Exact match isn't possible because the game's demand RNG differs from Python's (already on main); no RNG port needed. The Architect owns the post-#17 AC7 switch.
- Oct 17 01:32: economy_sim.py sha eddf945d. CURRENT reverted to pre-F1 (P1Q, M2_P4 40/0.4) because the shared live sim broke main's 'fixture fresh' test. F1 is config 'f1' (F1 costs + yawn 50/0.5; the CSV writer supports it). Verified: --config current output is identical to main:data/economy.csv. F1 branches (#17/#18) use --config f1 / m.F1; flip CURRENT to F1 when #17 merges. Lesson: the product/ sim is read live by every branch, so never change a default it serves before the merge.
- Oct 17 01:40: QA ac7-l18-25 re-run on F1 3ea9f04 (qa/m3-recheck/ac7-l18-25-f1-3ea9f04.md): with workers PASS (L21 on all 30 seeds, max wait 4.5 min). No-workers 10.25 min is informational only per HoP 00:35; TR-5 is the no-worker gate.
- Oct 17 02:05, Head of Product:
  - L18-25 gate under the variance bot: P95 of each seed's slowest level <=390 s, worst seed <=480 s. The fixed bot stays a regression fixture at <=360 s. No CSV change. PR #23 drops expected-fail.
  - R-AC7-W-ZERO-MARGIN: soft CI warning plus a 100-seed sweep before merge for any change of 3% or more, approved. No buff for P5 >=21. Correction sent to HoP: the warning metric is the P95 of time-to-L20 (slow tail), warn above 1740 s; the approved 'P5 <=27:00' wording described the fast tail.
  - AC7 is NOT verified on main 57d964d5. It counts as verified only after the variance bot re-runs green on the PR #17 economy (f1-m4cols). Economy runs it after #17 lands and reports to HoP and HoQA.
- Oct 17 02:07: R-AC7-W-ZERO-MARGIN corrected. Slow-tail slack is 130 s (P95 time-to-L20 1670 s), not 240 s. The warning is P95 t20 > 1740 s (HoP confirmed).
- Oct 17 02:42: PM Workers reversed: manage_all_min_workers=3 kept (un-deprecated). It now gates only bulk Refill-all (3+ hired); below 3 hired the bar refills only the lowest worker. Bar shows from 1 worker. No CSV change; rc1 model intact.
- Oct 17 04:11: product/economy.csv was b294762e, the same content as main 57d964d5 but with CRLF line endings. Normalized it to LF, byte-identical to economy.p1q.csv / main data/economy.csv (57d964d5). No number change. Backup in scratch/economy.csv.crlf-bak-0411.
- Oct 17 07:30: #17 merged (HoE: main 3f2ac38). Promoted economy.f1-m4cols.csv byte-for-byte to product/economy.csv (57d964d5 to 86f0e80e). check-economy-copy --product --strict against 3f2ac38: EXIT 0 (data/economy.csv plus 4 vendored files match). Backup in scratch/economy.csv.bak-0730.
- Oct 17 07:40: Strict check on main 97a57c1 (#32 re-land of #17): EXIT 0. Sim F1-default flip (CURRENT=F1, M2_CURRENT=M2_F1) staged in scratch/sim-f1-flip/economy_sim.py, sha 10f29a4a, and sent to Features for a single vendor PR. product/sim stays at eddf945d until it merges.
- Oct 17 07:50: #33 merged (main 2311741). product/sim/economy_sim.py = 10f29a4a (CURRENT=F1, M2_CURRENT=M2_F1). Strict on main: EXIT 0. #34 (seller_variance 68a64c59) pending.
- Oct 17 08:15: AC7 variance re-run on main acaceee (F1 86f0e80e, variance sim 68a64c59, 100 seeds; scratch/ac7-f1/ac7_f1_acaceee.json). AC7 bands PASS: L@30 P5/P95 no workers 20/20, workers 20/21. L10 fastest 8.54 min, P95 10.28. Variance targets PASS (97/90 distinct L18 times; P95 6.8 and 6.3 pct over P50). Workers t20 P95 1670 s, under the 1740 warning. L18-25 gate with workers: P95 slowest 376 s PASS, worst 493 s FAIL (limit 480): seeds 57 (493 s) and 1 (483 s), both on L21. Fixed bot 270 s PASS. AC7 not yet VERIFIED; HoP choosing between an L21 trim and accepting.
- Oct 17 08:25: Modelled the L21 fix (100 seeds, variance bot, row 21 only). -3% (41918 to 40660): workers slowest L18-25 P95 361 s / worst 376 s, PASS. -5% gives the same result. -8%: worst 401 s. AC7 unchanged in all three. Proposed -3% to HoP; awaiting approval. Script: scratch/ac7-f1/trim.py.
- Oct 17 08:40 [SUPERSEDED 08:50: HoP's approved number is -3%; -1% was void and never shipped]: HoP approved option (a), smallest L21 cut with >=20 s margin. Result: -1%. L21 farm_cost 41918 to 41498, and Grader tier-3 w4_tier_cost 20959 to 20749 (floor 0.5 x farm_cost, required by sync-economy). -0.5% fails (483 s). 100-seed sweep on the edited CSV: workers slowest L18-25 P95 361 / worst 386 s (94 s margin); AC7 L@30 P5/P95 no workers 20/20, workers 20/21 (max 21); L10 fastest 8.54, P95 10.28; workers t20 P95 1670 s. Staged in scratch/l21-trim/ and sent to Features for a data/economy.csv PR.
- Oct 17 08:50: HoP final: L21 trim -3%. farm_cost 41918 to 40660, w4_tier_cost 20959 to 20330 (floor 0.5x). Strictly rising L20 31050 < L21 40660 < L22 56589; L20-to-L21 step +31% (>=2%). 100-seed sweep (f1-m4cols 6dca24cd; scratch/l21-trim/sweep_l21_40660.json): workers slowest L18-25 P95 361 / worst 376 s; AC7 L@30 P5/P95 no workers 20/20, workers 20/21; L10 fastest 8.54, P95 10.28; workers t20 P95 1670 s. No-workers t20 P95 1737 s is 3 s under the 1740 line, recorded as near-edge in the m4 risk list. Sent to Features for the PR.
- Oct 17 08:20: Coop start 10 eggs (PM Collection): TTFU unchanged (10.3/19.1/25.2/45.6 s), PASS; pacing unchanged (L10 0.1-0.2 min faster). Market Hand hold threshold (PM Market, MK-56..59, wage unchanged): sale size, income and fixed-run served % PASS; cost per egg +8 to +19% FAIL; progression served % -0.74 pts marginal. HoP must pick between accepting the higher cost and a cheaper hold. Recommend keeping min_wait_s=2. Scripts in scratch/ttfu-coop10 and scratch/mh-hold.
- Oct 17 08:22: MK-59 re-run (HoP bar: last_chance 1.0 s, min_wait 2): PASS. Wage/min unchanged; income -0.17% to 0.00%; worst progression served % L20 -0.48 pts (bar -0.5, margin within noise); F2 median sale 3 to 9 eggs. Cost per egg +4 to +14% (info only). The served gains from 0.1 s mostly disappear (fixed -0.02 to +0.19 pts). Pacing unchanged. Data: scratch/mh-hold/t2_lc1.json.
- Oct 17 08:41: #36 merged (main 8e6d53e). Promoted 6dca24cd to product/economy.csv and economy.f1-m4cols.csv (plus f1 and m4-candidate). Strict EXIT 0. AC7 VERIFIED: L@30 20/20 and 20/21; L10 8.54/10.28; L18-25 workers P95 361 s, worst 376 s, fixed 270 s; t20 P95 1670 s. Reported to HoE, HoP and HoQA.
- Oct 17 08:45: start_coop_eggs=10 CSV prepared, scratch/coop10/economy.f1-m4cols.csv sha 9980ec22 (6dca24cd plus one constant column). Sent to Features (column-only PR), HoE, UI and PM Collection. Sim impact was checked earlier: none. On merge: promote to product/economy.csv and f1-m4cols, then run strict.
- Oct 17 09:00: L30+ EX-1 fix proposed: C2 (scratch/l21-retune, sha 1536be49) = -3% L21 trim plus L35 hens_cost 92100 to 82890 and egg_value_cost 166588 to 149929. L30+ gate PASS (EX-1 worst 2.20 vs 2.25, was 2.40); AC7 unchanged (Python reference). C1, which keeps main's L30 row, FAILS. C2 uses the L30+ pack's L30 row. Waiting on HoP's sign-off and a Saves QA TS run. Sent to HoP, HoE and HoQA.
- Oct 17 09:02: HoP APPROVED C2 (1536be49) with conditions: the L30 row is replaced only atomically with the L30+ pack in the same PR; Saves QA checks that L29/L30 saves load and price correctly; C1 rejected; EX-1 worst 2.20 accepted, tracked in the risk list (R-L30-EX1-THIN-MARGIN); official only after Saves QA's TS-bot run (AC7 plus the full L30+ gate, 100 seeds, TS suite extended to accept C2). Order: Saves QA, then the Features PR, then HoP signs the final numbers.
- Oct 17 09:04: Sim aligned to HoP's no-wage-pause ruling: scratch/sim-wage-hold economy_sim 0ee6433c and seller_variance 20c289da. AC7 on 6dca24cd unchanged except workers t20 P95 1670 to 1683 s (<1740). L30+ is unaffected (late_curve already pays the wage). Sent to Features for vendoring with the min-wait PR; on merge, copy into product/sim and run strict.
- Oct 17 09:31: Saves QA verified C2 on the TS bot (PASS). Prepared C2+coop10 a957b072 (56 rows) and the game CSV 50dfdab0 = 9980ec22 with three L30 cells (farm 330194, hens 74005, ev 133856), because the full C2 fails sync-economy demandLoFactor. Told HoE #37 is clear from the economy side (gate = C2, column unread). The L30+ PR lands after #37 and needs HoP's final sign-off.
- Oct 17 09:55: MON boost modelling (scratch/mon-boost): no boost size green on all gates at max use. Early pacing is OK up to x1.10 (L10 floor fails from x1.20); L30+ step gate fails from x1.05 and isn't monotonic. Recommended capping at x1.10 and having HoP revisit the L30+ step-gate definition (20 s quantisation, judged on the worst seed). Sent to HoP. Next: the L3 Market Hand sale-size question.
- Oct 17 09:59: MK-56/57 columns ready: scratch/mk56-cols/economy.csv 64a62d5a (a957b072 + hold_s 5 + last_chance 1.0), svs_mh 8f7bfb2c. AC7 and L30+ PASS, identical with the hold on or off. MK-59 served % FAILS on the final setup: L17 -0.93 pts (bar -0.5, noisy at 100 seeds). Features is holding the PR; asked PM Market and HoP to rule on QA's 400-seed paired run.
- 2026-10-19 02:30: M4-on retune T3 (D-CEO-20261019-04, D-HOP-2026-10-19-05). hens_cost and egg_value_cost on L0-L11 retuned; multipliers untouched. product/economy.csv and economy.f1-m4cols.csv go from 6dca24cd to b48be8a4. Handed to the Architect; the repo PR is pending. Results: scratch/m4-retune/REPORT.md, round 3.

## 2026-10-24 ~17:00 — M5.0 economy rulings D-HOP-2026-10-24-16 (DECIDED, NOT APPLIED; product/economy.csv stays c7bb783f)
Source: product/research/v2-slices/economy.md §10–13. Draft: scratch/v2-econ/economy.m50-draft.csv sha256 8dc90e2b…996b (152 cols, 31 rows). Diff: scratch/v2-econ/m50-draft.diff. HoP: approved in principle, not to be applied to product/economy.csv yet.
- Sweep F20+ = **A, lay ×1.15** (`tc_ability_w2_mode` 0; no `tc_ability_w2_price_mult` column). Closes HoE B2, no extra Eng. (D-HOP-16 (1))
- M5.0 gate basis: the window gate (M4-AC24, P95 ≤ 2.0 / worst ≤ 2.25) plus L0–30. The L30+ step gate is re-checked after the L30+ reshape with the same-seeds +0.10 rule. Known risk: the M5.0 stack adds +0.23 to +0.97 to the T3 L30+ step P95 (scratch). (D-HOP-16 (2))
- `tc_pause_call_lockout_s` = **45** (new column; the spec draft said 30). M5-G5-P pattern (b) worst seed: +2.5% at 30, +1.6% at 45. (D-HOP-16 (3))
- M5-G5-P full-coop pause outlier (+2.5%, one seed at F10 optimal; mean −0.2%) accepted as documented variance. The gate definition is unchanged; revisit if it persists on the harness of record. (D-HOP-16 (4))
- Broody columns named `tc_broody_income_share` 0.05, `tc_broody_cap_s` 150, `tc_broody_ready_share` 0.5, `tc_broody_unlock_worker` 2, `tc_broody_max_on_screen` 1, so sync-economy maps them. (D-HOP-16 (5))
- `w2_asleep_collect_share` **0.20 → 0.15** on L0–30 (0.20 was tied to MK-33a, which isn't built; `decisions.md:177`). Effective value in M5.0 = 0 (no reader). (D-HOP-16 (6))
- Also in the draft, approved in principle: `tc_streak_cap` 0.40 → 0.28, plus 20 M5.0 constant columns, including `tc_spawn_grace_ms` 250 (golden egg R19, PM Collection; added 16:55, no pacing effect), plus 9 UI-only columns from sales-stopped-spec v1.3.2 §6 (`tc_stall_min_show_s` dropped per D-HOP-2026-10-24-20): `tc_stall_hold_s` 8, `tc_stall_hold_nomh_s` 20, `tc_stall_hold_paused_s` 20, `tc_stall_rearm_s` 5, `tc_stall_tap_guard_ms` 500, `tc_fatigue_cue_min_share` 0.15, `tc_fatigue_cue_hold_s` 5, `tc_fatigue_cue_clear_share` 0.12, `tc_fatigue_cue_clear_hold_s` 2 (added 16:57, no sim; SS-21 trace gate applies). 29 new columns in total. `guard_heartbeat_s` / `guard_stale_s` NOT added: D-HOP-25 dropped them from the lineage and no M5 spec cites them (D-HOP-2026-10-24-22). See the diff. Not applied.
