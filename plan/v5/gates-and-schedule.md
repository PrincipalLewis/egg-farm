# Gates and schedule

## Top open gaps (TBD) at the time of writing
1. **Sim-complete sha: TBD.** It is the first `rc/v5` tip where every flag's sim has landed; still needs #128, #133 (refill + autoRefill), #134 (broody), clockWage sim (no PR yet), #132 `worker_paused`, #123, #125 → #127, #100 (flag table §sim-complete).
2. **RC date: TBD.** Not set from working days (D-CEO-20261110-13); it depends on Vadim's answer on the weekly usage cap/budget (escalated, no answer as of this snapshot).
3. **Vadim's direct yes for the Architect's local branches: pending.** PR-A `v5/breeds-ui-a`, clamp-bind, `v5/tel-envelope` and `v5/vitest-teardown-fix` are on the box only (`in-flight.md`).
4. **QA budget over the run: TBD.** ~84–105 pts of QA vs 12 pts/week in the split; the CEO sets the QA budget at the restart (flag table §(d)).
5. **Spec rev for pause** (v1.3.17 `7536acfa` in the flag table vs current v1.3.19 `07540579`), **art pin shas for golden UI and breeds UI**, and the open Econ rulings (`tc_streak_cool_cue_min_tier`, autorefill thresholds) are unresolved.

## Gates, in order

| # | Gate | Condition | Owner | Source |
|---|---|---|---|---|
| G1 | PR merge bar | One Architect review + one QA bar per PR sha, max 3 rounds; clean merge-forward inherits the PASS | Architect, HoQA | rules 24/25, org-plan rule 11 |
| G2 | **Sim-complete sha** | Every flag's sim merged on `rc/v5` (list above). **TBD.** Do not treat a partial tip as sim-complete | HoE posts the sha | `engineering/v5-flag-table.md` §sim-complete |
| G3 | **Econ runs of record** | R04, CSV, B4, K10 runs at the sim-complete sha; CSV chain = HoP content approval → HoQA TS gate → HoE sha → CEO go | HoP / Econ, HoQA, HoE, CEO | D-CEO-20261109-02, D-CEO-20261110-12 |
| G4 | **K10 / B4 green** | On the sim-complete sha with the accepted CSV merged | HoQA | D-CEO-20261110-01/-08 |
| G5 | **Freeze** | Merge train + every lane-U row + every sim row merged, and G4 green | HoE posts freeze sha | D-CEO-20261110-08 |
| G6 | **RC verdict** | One full QA pass on the complete RC with all 14 flags at 1; ship-values flip (D-CEO-20261030-07); Art final RC evidence review; Claude passes per milestone RC are second opinions only (rule 22) | HoQA; Art | D-CEO-20261030-10, D-CEO-20261028-02 |

Post-freeze merges that must still land before G6: #119, #121, #122, #123 (D-CEO-20261110-04) and the Broody yard UI (D-CEO-20261110-07). #117 and #116 are post-freeze in the train (`engineering/v5-ui-build-state.md`).

## Usage-bound timeline

Source: `ops/usage-forecast-v5.md` (HoOps, 2026-11-10 ~02:15 CET; uncertainty ±40%).
- Calibration: **~1.4 points per engineer-hour**. One usage window = **65 points** (the 65% weekly stop); one window per weekly reset. Next reset **Thu 12 Nov 2026 17:53 CET**.
- Remaining work: Engineering **186–256 h** (≈260–360 pts) + QA **60–75 h** (≈84–105 pts, ~22 bars + 13–19 h serial tail) + Art ~4 pts.
- **Floor: ~350–470 points ≈ 5.4–7.2 windows with zero overhead; ~6–8.5 windows with realistic overhead (10–15%).**
- Overhead cuts adopted at the next restart (D-CEO-20261110-19, org-plan rules 10–14). The HoOps audit first estimated 33–49 pts/window saved; after the corrected math and a Claude Code Reviewer check the figure is **~12–18 pts/window (25–38 of ~135 pts/week), ≈1.2–1.4× (≈1.3×) more production work per window** (`ops/usage-overhead-audit-w45.md` line 36, revised after `ops/usage-overhead-audit-w45-review.md`). Applied to the 6–8.5-window floor that is roughly **5–7 windows** (CEO estimate, not a HoOps re-forecast; HoOps re-calibrates after the first restart window).
- Levers: overhead (CEO) and the cap (Vadim). Headcount does not reduce total points.

## Weekly split (per 65-pt window)

Source: `ops/usage-budget-v5-weekly.md`, accepted D-CEO-20261110-15.

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
- Lean-mode target is ≥75% Engineering (D-CEO-20261110-14); with QA at 12/week that is not reachable, which is a CEO call.
- HoOps posts the split at each restart and re-calibrates from real per-role burn after the first window. Checkpoints: HoOps pings the CEO at 25%, 40% and 55% weekly usage; at 55% the CEO makes the reserve call (D-CEO-20261110-03).
