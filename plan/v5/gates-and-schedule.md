# Gates and schedule

## Top open gaps (TBD) at the time of writing

Updated Fri 13 Nov 2026.

1. **Sim-complete sha: still TBD.** It is the first `rc/v5` tip where every flag's sim has landed. Do not treat a partial tip as sim-complete.
   - **Merged into `rc/v5` since 2026-11-12** (merge shas from `gh`): #125 `006bdd72` (2026-11-12 21:55 CET), #128 `be77b1c0` (2026-11-12 23:04 CET), #123 `d84976b8` (2026-11-12 23:38 CET), #119 `0755a284` (2026-11-13 00:03 CET), #132/#140 `5552556b` (2026-11-13 00:30 CET; #140 is the re-land of #132 onto `rc/v5`; #132 itself merged to #119's branch as `6dc56a55` at 2026-11-13 00:29 CET), #142 `b83ce852` (2026-11-13 02:09 CET; also the current `rc/v5` tip).
   - **Still needed** (flag table §sim-complete): #133 (refill + autoRefill), #134 (broody), clockWage sim, #127, #100.
2. **RC date:** not a calendar date. The RC is **dated after the sim-complete sha** (D-CEO-20261110-13 still holds: not set from working days). The weekly cap is decided (D-CEO-20261112-01); Vadim lifted the 65% usage stop on 2026-11-13 (D-CEO-20261113-01; reset Thu 19 Nov 2026, 17:53 CET).
3. **Vadim's direct yes for the Architect's PR-A: pending.** PR-A `v5/breeds-ui-a`, clamp-bind, `v5/tel-envelope` and `v5/vitest-teardown-fix` were box-only at the 10 Nov 11:00 CET snapshot; they were later pushed (`in-flight.md`). Opening PR-A still waits on Vadim's direct yes unless a later ruling says otherwise.
4. **QA budget:** D-CEO-20261112-01 sets the per-window split at Eng 47 / QA 12 (Product-Econ 2 / CEO 1 / Ops 1 / Art&UX 1 / reserve 1); 75% Eng was rejected because it would push QA below 10, which conflicts with quality rule 15. D-CEO-20261113-01: that split is now a **priority guide**, not a cap on total spend — the studio runs at full pace until the weekly limit (reset Thu 19 Nov 2026, 17:53 CET). The ~84–105 pts of QA over the run is unchanged as an estimate; the final window still flips toward QA (~25–30 pts).
5. **Resolved this update:** pause spec rev (v1.3.19 `07540579` governs; flag table `7536acfa` superseded — D-HOP-2026-11-12-02, `product/decisions.md` sha1 `9b700863` at the pin; current box file `9db8f9fa`); art pins for golden UI and breeds UI (HoAUX). **Still open:** Econ rulings (`tc_streak_cool_cue_min_tier`, autorefill thresholds).

## Gates, in order

| # | Gate | Condition | Owner | Source |
|---|---|---|---|---|
| G1 | PR merge bar | One Architect review + one QA bar per PR sha, max 3 rounds; clean merge-forward inherits the PASS | Architect, HoQA | rules 24/25, org-plan rule 11 |
| G2 | **Sim-complete sha** | Every flag's sim merged on `rc/v5` (remaining list above). **Sha still TBD.** Do not treat a partial tip as sim-complete | HoE posts the sha | `engineering/v5-flag-table.md` §sim-complete |
| G3 | **Econ runs of record** | R04, CSV, B4, K10 runs at the sim-complete sha; CSV chain = HoP content approval → HoQA TS gate → HoE sha → CEO go | HoP / Econ, HoQA, HoE, CEO | D-CEO-20261109-02, D-CEO-20261110-12 |
| G4 | **K10 / B4 green** | On the sim-complete sha with the accepted CSV merged | HoQA | D-CEO-20261110-01/-08 |
| G5 | **Freeze** | Merge train + every lane-U row + every sim row merged, and G4 green | HoE posts freeze sha | D-CEO-20261110-08 |
| G6 | **RC verdict** | One full QA pass on the complete RC with all 14 flags at 1; ship-values flip (D-CEO-20261030-07); Art final RC evidence review; Claude passes per milestone RC are second opinions only (rule 22) | HoQA; Art | D-CEO-20261030-10, D-CEO-20261028-02 |

Post-freeze merges that must still land before G6: #121, #122 (D-CEO-20261110-04; #119 and #123 have merged since 2026-11-12) and the Broody yard UI (D-CEO-20261110-07). #117 and #116 are post-freeze in the train (`engineering/v5-ui-build-state.md`).

## Usage-bound timeline

Source: `ops/usage-forecast-v5.md` (HoOps, 2026-11-10 ~02:15 CET; uncertainty ±40%).
- Calibration: **~1.4 points per engineer-hour**. One usage window was **65 points** under the 65% weekly stop (D-CEO-20261109-01). That stop is lifted (D-CEO-20261113-01); the hard stop is now the weekly limit itself. Next reset **Thu 19 Nov 2026 17:53 CET**.
- Remaining work: Engineering **186–256 h** (≈260–360 pts) + QA **60–75 h** (≈84–105 pts, ~22 bars + 13–19 h serial tail) + Art ~4 pts.
- **Floor: ~350–470 points ≈ 5.4–7.2 windows with zero overhead; ~6–8.5 windows with realistic overhead (10–15%).**
- Overhead cuts adopted at the next restart (D-CEO-20261110-19, org-plan rules 10–14). The HoOps audit first estimated 33–49 pts/window saved; after the corrected math and a Claude Code Reviewer check the figure is **~12–18 pts/window (25–38 of ~135 pts/week), ≈1.2–1.4× (≈1.3×) more production work per window** (`ops/usage-overhead-audit-w45.md` line 36, revised after `ops/usage-overhead-audit-w45-review.md`). Applied to the 6–8.5-window floor that is roughly **5–7 windows** (CEO estimate, not a HoOps re-forecast; HoOps re-calibrates after the first restart window).
- Levers: overhead (CEO) and the cap (Vadim). Headcount does not reduce total points.

## Weekly split (per window; now a priority guide)

Source: `ops/usage-budget-v5-weekly.md`, accepted D-CEO-20261110-15, reaffirmed D-CEO-20261112-01 (Eng 47 / QA 12 per window; 75% Eng rejected). D-CEO-20261113-01: the split no longer caps total spend; it is a priority guide while the studio runs at full pace until the weekly limit (reset Thu 19 Nov 2026, 17:53 CET).

| Role | pts/week | share |
|---|---|---|
| Engineering (all lanes) | 47 | 72% |
| QA (merge bars; final week = verdict) | 12 | 18% |
| Product/Econ (rulings; runs of record at the sim-complete sha) | 2 | 3% |
| CEO | 1 | 1.5% |
| Ops (usage watch) | 1 | 1.5% |
| Art & UX (on call; 4 over the run) | 1 | 1.5% |
| Reserve | 1 | 1.5% |

- The final window flips to QA (~25–30 pts) because the QA serial tail can't overlap engineering.
- Lean-mode target of ≥75% Engineering (D-CEO-20261110-14) was **rejected** as the cap (D-CEO-20261112-01): it would push QA below 10, which conflicts with quality rule 15.
- HoOps posts the split at each restart and re-calibrates from real per-role burn after the first window. The 25%/40%/55% checkpoints and the 55% reserve call (D-CEO-20261110-03) were written when the stop was 65%; that stop is lifted (D-CEO-20261113-01), and the hard stop is the weekly limit.
