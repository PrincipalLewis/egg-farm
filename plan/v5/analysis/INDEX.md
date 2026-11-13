# analysis/ index

All analysis behind v5, copied from the studio box (folder structure kept under `analysis/<source folder>/`), 2026-11-10 ~11:00 CET:
- `analysis/product/research/` — active-play research (`active-play-study.md`, Oct 24 onward) and other product research.
- `analysis/product/critic/` — Game Critic findings. `analysis/qa/claude-gamer/`, `analysis/qa/claude-qa/` — Claude Gamer / Claude QA findings.
- `analysis/product/sim/` — economy/pacing simulations and sim results (incl. telemetry sims).
- `analysis/playtest/` — playtest briefs, player notes and triage. `analysis/research/` — studio research register.

Analyses that live with their owners are **not duplicated here**; see:
- Ranked product plan: [`../product/m5-value-ranking.md`](../product/m5-value-ranking.md); M5/M5.1 economy package: [`../product/m5.1-kickoff-package.md`](../product/m5.1-kickoff-package.md), [`../product/economy.md`](../product/economy.md), [`../product/economy.csv`](../product/economy.csv), `../product/economy/`, `../product/late-game-curve-model.md`, `../product/casual-noworker-pacing.md`, `../product/f1-midgame-stall.md`, sweeps `../product/*-sweep.md`, AC7 `../product/ac7-*.md`.
- Game-design-lens: [`product/research/ccgs-trial-output.md`](product/research/ccgs-trial-output.md) (lens applied to the L10 dead zone). Loop map, dead zones and player journey: [`../product/m5-interaction-plan.md`](../product/m5-interaction-plan.md) §3. Balance checks: `../product/balance-changelog.md`, `../product/*-sweep.md`, `../product/m4-risk-list.md`. No separate player-journey-map or balance-check report was found on the box (searched by name and content).
- Sim/gate reports R04, B4, K10, AC7, BG5: [`../qa/reviews/`](../qa/reviews/), [`../qa/v5-econ/`](../qa/v5-econ/), [`../qa/m5/`](../qa/m5/); R04 cycle handoffs under `../handoffs/scratch/post-l10/`.
- Analytics/telemetry design: [`../product/collection/telemetry-spec.md`](../product/collection/telemetry-spec.md) + `telemetry-spec-errata-v5.md`, `../product/collection-telemetry-sim-reconciliation.md`, `../product/m3-telemetry-review.md`.
- Architect 14-flag sim audit: [`../engineering/v5-sim-build-state.md`](../engineering/v5-sim-build-state.md); flag table: [`../engineering/v5-flag-table.md`](../engineering/v5-flag-table.md); UI audit: [`../engineering/v5-ui-build-state.md`](../engineering/v5-ui-build-state.md).
- Usage forecast and audit: [`../ops/usage-forecast-v5.md`](../ops/usage-forecast-v5.md), [`../ops/usage-overhead-audit-w45.md`](../ops/usage-overhead-audit-w45.md), [`../ops/usage-overhead-audit-w45-review.md`](../ops/usage-overhead-audit-w45-review.md).

| File | What it is (first heading) | Rev | Date | Fed (decisions / features) |
|---|---|---|---|---|
| [playtest/player-notes/2026-10-15-session1.md](playtest/player-notes/2026-10-15-session1.md) | Player playtest, session 1 (2026-10-15) | — | 2026-10-15 | — |
| [playtest/player-notes/2026-10-16-session3.md](playtest/player-notes/2026-10-16-session3.md) | Player playtest, session 3: m3-rc1-pre+a01faea (origin/main) | — | 2026-11-09 (mtime) | — |
| [playtest/player-notes/2026-10-17-session2.md](playtest/player-notes/2026-10-17-session2.md) | Player playtest, session 2: m3-rc0 (16176a3, signed off for internal playtest) | — | 2026-11-09 (mtime) | — |
| [playtest/player-notes/2026-10-19-session-m4b.md](playtest/player-notes/2026-10-19-session-m4b.md) | M4 B player-experience pass (Player) | — | 2026-11-09 (mtime) | — |
| [playtest/session2-brief.md](playtest/session2-brief.md) | Playtest session 2 brief (Player) — build m3-rc0 | — | 2026-11-09 (mtime) | — |
| [playtest/triage/2026-10-15-session1.md](playtest/triage/2026-10-15-session1.md) | Triage: Player session 1 (m3-pt1, 0345680) | — | 2026-10-15 | — |
| [playtest/triage/2026-10-16-session2.md](playtest/triage/2026-10-16-session2.md) | Triage: Player session 2 (m3-rc0, 16176a3) | v1.1 | 2026-10-17 | — |
| [playtest/triage/feedback-log.md](playtest/triage/feedback-log.md) | Player feedback triage log (pre-launch) | — | 2026-10-28 | D-CEO-20261028-01 |
| [product/critic/l10-interaction-read-2026-10-23.md](product/critic/l10-interaction-read-2026-10-23.md) | L10+ interaction read: M4.1 RC1 (PR #67 head 5d9efa6, build m4.1+5d9efa6) | — | 2026-11-09 (mtime) | D-CEO-20261024-05 |
| [product/critic/review-dd52bfd-2026-10-17.md](product/critic/review-dd52bfd-2026-10-17.md) | Critic review: m3-rc1-pre+dd52bfd (M4 off), Oct 17 2026 | — | 2026-11-09 (mtime) | — |
| [product/critic/review-m4b-dd223f5-2026-10-19.md](product/critic/review-m4b-dd223f5-2026-10-19.md) | Critic review: M4 B release m4b-dd223f5 (build-id m3-rc1-pre+246de09), Oct 19 2026 | — | 2026-11-09 (mtime) | — |
| [product/critic/review-rc1-pt1-2026-10-16.md](product/critic/review-rc1-pt1-2026-10-16.md) | Critic review: rc1-pt1 (build 2490c79), Oct 16 2026 | — | 2026-11-09 (mtime) | — |
| [product/critic/saves/README-l10-save.md](product/critic/saves/README-l10-save.md) | Fast-forward saves for build m4.1+5d9efa6 (PR #67 head 5d9efa6) | — | 2026-11-09 (mtime) | — |
| [product/critic/shots-l10-m41/log.txt](product/critic/shots-l10-m41/log.txt) | 16:13:39 start. L10 loaded, 3 workers, coins ~$290 at start; passive ~$100-125/s. | — | 2026-11-09 (mtime) | — |
| [product/research/active-play-study.md](product/research/active-play-study.md) | Active-play study: why the game plays itself by ~Farm L10, and what M4 does about it | — | 2026-10-16 | — |
| [product/research/ccgs-trial-output.md](product/research/ccgs-trial-output.md) | CCGS trial: "game-design-lens" applied to the L10 dead zone | v0.5 | 2026-10-24 | D-CEO-20261024-04 |
| [product/research/interaction-study-v2.md](product/research/interaction-study-v2.md) | Interaction study v2: what gives a Farm L10+ player something meaningful to do | v1.1 | 2026-10-24 | D-CEO-20261024-05 |
| [product/research/m4-shipped-audit.md](product/research/m4-shipped-audit.md) | M4 shipped-vs-specced-vs-cut audit (HoP, for D-CEO-20261024-05 addendum) · 2026-10-24 15:50 CEST | v1.25 | 2026-10-24 | D-CEO-20261024-05, D-CEO-20261017-01 |
| [product/research/slices/collection.md](product/research/slices/collection.md) | Research slice: Collection / tapping active-play mechanics | — | 2026-10-16 | — |
| [product/research/slices/market.md](product/research/slices/market.md) | Research slice: active-play market mechanics · 2026-10-16 · PM, Market/Customers | — | 2026-10-16 | — |
| [product/research/slices/upgrades.md](product/research/slices/upgrades.md) | Research slice: upgrade and progression structure in idle games | — | 2026-10-16 | — |
| [product/research/slices/workers.md](product/research/slices/workers.md) | Research slice: Managers & Workers (PM, Workers) — 2026-10-16 | — | 2026-10-16 | — |
| [product/research/v2-slices/collection.md](product/research/v2-slices/collection.md) | v2 slice: Collection — tapping & golden eggs after automation | v0.1 | 2026-10-24 | D-CEO-20261024-05, golden |
| [product/research/v2-slices/economy.c0d9492b.md](product/research/v2-slices/economy.c0d9492b.md) | v2 research slice: Economy (tap share, active-reward options and budget, economy gates) | v0.5 | 2026-10-24 | D-CEO-20261024-05, economy |
| [product/research/v2-slices/economy.md](product/research/v2-slices/economy.md) | v2 research slice: Economy (tap share, active-reward options and budget, economy gates) | v0.5 | 2026-10-24 | D-CEO-20261024-05, economy |
| [product/research/v2-slices/market.md](product/research/v2-slices/market.md) | v2 research slice: customers, orders & events as active goals · PM, Market/Customers · 2026-10-24 | v0.3 | 2026-10-24 | D-CEO-20261024-05, D-CEO-20261024-04 |
| [product/research/v2-slices/upgrades.md](product/research/v2-slices/upgrades.md) | v2 research slice: breeds, research tree, prestige (Upgrades) | — | 2026-10-24 | D-CEO-20261024-05, D-HOP-2026-10-23-02, breeds |
| [product/research/v2-slices/workers.md](product/research/v2-slices/workers.md) | v2 slice: Workers. What the player does after automation (PM, Workers). v0.1, 2026-10-24 | v0.1 | 2026-10-24 | D-CEO-20261024-05, D-HOP-2026-10-23-02 |
| [product/sim/d1_review.py](product/sim/d1_review.py) | one tester per install_id: if two exports share an id, keep one (latest file name) and flag the duplicate | — | 2026-11-09 (mtime) | — |
| [product/sim/economy_sim.py](product/sim/economy_sim.py) | Proposal M1-R1 (see product/economy-proposal-m1.md). Farm cost growth unchanged at x1.35. | — | 2026-10-15 | economy |
| [product/sim/f1choice/f1_choice.py](product/sim/f1choice/f1_choice.py) | """F1-CHOICE (Economy, 2026-10-16): how often is a non-Farm upgrade the best next buy before L20, on F1 (econo | — | 2026-10-16 | economy |
| [product/sim/late/late_curve.py](product/sim/late/late_curve.py) | """L30-50 late-game curve model (Economy/Balance Designer, 2026-10-16). PROPOSAL ONLY: writes product/economy. | — | 2026-10-16 | economy |
| [product/sim/late/late_curve_err.txt](product/sim/late/late_curve_err.txt) | b 0.08 g1 1.1000: L35 55.5 L40 71.5 | — | 2026-11-09 (mtime) | — |
| [product/sim/late/late_curve_out.md](product/sim/late/late_curve_out.md) | L30-50 candidate curves v7 (H/V rows to L55, HoP (a)) on v6 hand-tuned L41-50 (milestones x1.10/x1.15/x1.10/x1 | — | 2026-11-09 (mtime) | — |
| [product/sim/late/late_curve_polish.py](product/sim/late/late_curve_polish.py) | """L30-50 late-game curve model (Economy/Balance Designer, 2026-10-16). PROPOSAL ONLY: writes product/economy. | — | 2026-10-16 | economy |
| [product/sim/late/late_polish_ev.py](product/sim/late/late_polish_ev.py) | import sys, csv, math, os, json | — | 2026-11-09 (mtime) | — |
| [product/sim/late/late_polish_tune.py](product/sim/late/late_polish_tune.py) | from late_polish_ev import  | — | 2026-11-09 (mtime) | — |
| [product/sim/late/nudge_log_casual_noworkers.csv](product/sim/late/nudge_log_casual_noworkers.csv) | seed,kind,fire_t_s,farm_level,coins_at_fire,next_hire_cost,afford_after_s | — | 2026-11-09 (mtime) | — |
| [product/sim/late/nudge_run.py](product/sim/late/nudge_run.py) | """Hire-nudge affordability log, casual no-workers profile (never hires). NUDGE=1 python3 nudge_run.py <csv> < | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/f1_bands_out.md](product/sim/m2_validation/f1_bands_out.md) |  variant  model  AC7 L@30:00 med (min-max)  AC7 pass L18-22 seeds  L30 min med (n/r)  L30 180-300 pass seeds   | — | 2026-11-09 (mtime) | ac7 |
| [product/sim/m2_validation/f1_f21_out.md](product/sim/m2_validation/f1_f21_out.md) |  variant  model  managed/unmanaged inc@F21 (median of per-seed ratios)  seeds with both F21 values  managed $/ | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/f1_f21_share06_out.md](product/sim/m2_validation/f1_f21_share06_out.md) |  variant  model  managed/unmanaged inc@F21 (median of per-seed ratios)  seeds with both F21 values  managed $/ | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/f1_f2224_out.md](product/sim/m2_validation/f1_f2224_out.md) |  variant  model  ratio F22-24 mean (median of seeds)  F22 / F23 / F24  seeds  pass >=1.5  | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/f1_gapfix.py](product/sim/m2_validation/f1_gapfix.py) | open gap at 30:00 counts only if it later closes (measure to next buy, any time) | — | 2026-10-16 | — |
| [product/sim/m2_validation/f1_gapfix_f2224.py](product/sim/m2_validation/f1_gapfix_f2224.py) | import f1_levers as fl, f1_gapfix as g | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/f1_gapfix_f2224_out.md](product/sim/m2_validation/f1_gapfix_f2224_out.md) |  variant  model  ratio F22-24 mean (median of seeds)  F22 / F23 / F24  seeds  pass >=1.5  | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/f1_gapfix_out.md](product/sim/m2_validation/f1_gapfix_out.md) |  variant  model  gap incl. open-at-30:00 med / worst (s)  closed-in-30:00 med / worst  where (median seed: pre | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/f1_levels_out.md](product/sim/m2_validation/f1_levels_out.md) |  F  farm_cost current  B seg x1.25 + L15-20 x1.45  current seller15  current casual  current cheapest  B seg x | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/f1_levers.py](product/sim/m2_validation/f1_levers.py) | """F1 levers (Economy, 2026-10-16): opt-in variants on CURRENT (P1q+P3) + M2_CURRENT (P4). economy_sim.py unto | — | 2026-10-16 | economy |
| [product/sim/m2_validation/f1_p1l16.py](product/sim/m2_validation/f1_p1l16.py) | """P1-L16 (Economy, 2026-10-16): demand/supply at L10-20 and order completion, F1 order-size fix candidates. | — | 2026-10-16 | economy |
| [product/sim/m2_validation/f1_p1l16_out.md](product/sim/m2_validation/f1_p1l16_out.md) | Analytic demand/supply = ((dmin+dmax)/2 / interval) / eggs_per_sec  (x1.25 with Hawker Working) | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/f1_rec_check.md](product/sim/m2_validation/f1_rec_check.md) |  variant  model  first buy s  L10 min  L18 min  s/level L5..L14  max gap to L18 s  max ×prev after L18 (L19-25 | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/f1_stall.py](product/sim/m2_validation/f1_stall.py) | order size: log the spawned order (size stored as q[-1][5] original size) | — | 2026-10-16 | — |
| [product/sim/m2_validation/f1_stall_out.md](product/sim/m2_validation/f1_stall_out.md) | F1 stall before/after (30 seeds/model, 120 min, run_m2 managed, workers on) | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/m2table.py](product/sim/m2_validation/m2table.py) | import json, statistics as st, sys | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/m2table_v01.md](product/sim/m2_validation/m2table_v01.md) | seller15 (100 seeds, 2 h) | v0.1 | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/m2table_v2.md](product/sim/m2_validation/m2table_v2.md) | seller15 (100 seeds, 2 h) | v0.1 | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/m2table_v3.md](product/sim/m2_validation/m2table_v3.md) | seller15 (100 seeds, 2 h) | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/m2table_v4.md](product/sim/m2_validation/m2table_v4.md) | seller15 (100 seeds, 2 h) | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/m2table_v5.md](product/sim/m2_validation/m2table_v5.md) | seller15 (100 seeds, 2 h) | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/m2table_v6.md](product/sim/m2_validation/m2table_v6.md) |  scenario  model  F10  F18  F25  F10 ≤ 15 m  lost %  | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/m2table_v7.md](product/sim/m2_validation/m2table_v7.md) | seller15 | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/m2table_v8.md](product/sim/m2_validation/m2table_v8.md) |  model  scenario  F10  F18  F25 (n/r)  managed/unmanaged income @F21  L25 gap vs managed  F10≤15m  | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/m2table_v9.md](product/sim/m2_validation/m2table_v9.md) |  model  scenario  F10  F18  F25 (n/r)  ×M1 @F21  max step F18→25  Manage / 15 min  | v1.1 | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/m2val.py](product/sim/m2_validation/m2val.py) | import sys, statistics as st, copy, json | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/m2val2.py](product/sim/m2_validation/m2val2.py) | import sys; sys.argv=[sys.argv[0]] | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/m2val3.py](product/sim/m2_validation/m2val3.py) | import sys; sys.argv=[sys.argv[0]] | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/m2val4.py](product/sim/m2_validation/m2val4.py) | import sys; sys.argv=[sys.argv[0]] | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/m2val5.py](product/sim/m2_validation/m2val5.py) | import sys, json, copy, statistics as st | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/m2val6.py](product/sim/m2_validation/m2val6.py) | import sys; exec(open('/workspace/m2val5.py').read().split("SC = [")[0]) | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/m2val7.py](product/sim/m2_validation/m2val7.py) | import sys, json, copy, statistics as st | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/m2val8.py](product/sim/m2_validation/m2val8.py) | import sys; exec(open('/workspace/m2val7.py').read().split("SC = [")[0]) | — | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/m2val9.py](product/sim/m2_validation/m2val9.py) | import sys; exec(open('/workspace/m2val7.py').read().split("SC = [")[0]) | v1.1 | 2026-11-09 (mtime) | — |
| [product/sim/m2_validation/pt1_resim.py](product/sim/m2_validation/pt1_resim.py) | """Playtest-1 re-sim (Economy/Balance Designer, 2026-10-15). Variants only; economy.csv / balance.json untouch | — | 2026-10-15 | economy |
| [product/sim/m2_validation/pt1_resim_csv_out.md](product/sim/m2_validation/pt1_resim_csv_out.md) | M1 AC7 / AC7-soft (100 seeds; run()) | v1.1 | 2026-11-09 (mtime) | ac7 |
| [product/sim/m2_validation/pt1_resim_out.md](product/sim/m2_validation/pt1_resim_out.md) | M1 AC7 / AC7-soft (100 seeds; run()) | — | 2026-11-09 (mtime) | ac7 |
| [product/sim/m2_validation/pt1_resim_uxv13.py](product/sim/m2_validation/pt1_resim_uxv13.py) | """Playtest-1 re-sim (Economy/Balance Designer, 2026-10-15). Variants only; economy.csv / balance.json untouch | — | 2026-10-15 | economy |
| [product/sim/m2_validation/s2_3a.py](product/sim/m2_validation/s2_3a.py) | """S2-3a (Economy, 2026-10-16): queue visibility after an offline break + option B (Market Hand min wait) cost | — | 2026-10-16 | economy |
| [product/sim/m2_validation/s2_3a_out.md](product/sim/m2_validation/s2_3a_out.md) | Part 1: share of the first 120 s after return with >=1 customer card visible (stock-bound, Market Hand Working | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/abilities_err.txt](product/sim/m4/abilities_err.txt) |  | — | 2026-11-09 (mtime) | abilities |
| [product/sim/m4/abilities_out.md](product/sim/m4/abilities_out.md) | Income and AC-A5 (30 seeds, medians) | — | 2026-11-09 (mtime) | abilities |
| [product/sim/m4/abilities_sweep.py](product/sim/m4/abilities_sweep.py) | """M4 abilities (PM Workers spec v0.1) on F1 economy (farm_cost per level from economy.f1.csv) + F1 Market Han | v0.1 | 2026-11-09 (mtime) | abilities, economy |
| [product/sim/m4/abilities_v2_combo2_out.md](product/sim/m4/abilities_v2_combo2_out.md) |  variant  uplift 0-60 s15/ch/cas/slow  uplift F22-24 s15/ch/cas/slow  ratio F22-24 s15/ch/cas/slow  min uplift | — | 2026-11-09 (mtime) | abilities |
| [product/sim/m4/abilities_v2_combo_out.md](product/sim/m4/abilities_v2_combo_out.md) |  variant  uplift 0-60 s15/ch/cas/slow  uplift F22-24 s15/ch/cas/slow  ratio F22-24 s15/ch/cas/slow  min uplift | — | 2026-11-09 (mtime) | abilities |
| [product/sim/m4/abilities_v2_err.txt](product/sim/m4/abilities_v2_err.txt) |  | — | 2026-11-09 (mtime) | abilities |
| [product/sim/m4/abilities_v2_out.md](product/sim/m4/abilities_v2_out.md) |  variant  uplift 0-60 s15/ch/cas/slow  uplift F22-24 s15/ch/cas/slow  ratio F22-24 s15/ch/cas/slow  min uplift | — | 2026-11-09 (mtime) | abilities |
| [product/sim/m4/abilities_v2_sweep.py](product/sim/m4/abilities_v2_sweep.py) | """M4 abilities spec v0.2 sweep: F1 economy (economy.f1.csv farm_cost incl. F1-GAP rows 18/19), mh_hold=2, pau | v0.2 | 2026-11-09 (mtime) | abilities, economy |
| [product/sim/m4/f1_gap.py](product/sim/m4/f1_gap.py) | """Locate the longest no-purchase gap in the F1 no-worker run (first 30 min) and test candidate fixes.""" | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/fb_prem/fb_p0.0.md](product/sim/m4/fb_prem/fb_p0.0.md) | Focus/Bulk cooldown sweep (Focus premium +0.0%): seller15 managed, ALL stack + abilities v0.3, 30-min session, | v0.3 | 2026-11-09 (mtime) | abilities |
| [product/sim/m4/fb_prem/fb_p0.015.md](product/sim/m4/fb_prem/fb_p0.015.md) | Focus/Bulk cooldown sweep (Focus premium +1.5%): seller15 managed, ALL stack + abilities v0.3, 30-min session, | v0.3 | 2026-11-09 (mtime) | abilities |
| [product/sim/m4/fb_prem/fb_p03.md](product/sim/m4/fb_prem/fb_p03.md) | Focus/Bulk cooldown sweep (Focus premium +3.0%): seller15 managed, ALL stack + abilities v0.3, 30-min session, | v0.3 | 2026-11-09 (mtime) | abilities |
| [product/sim/m4/fb_prem/fb_p05_p95.md](product/sim/m4/fb_prem/fb_p05_p95.md) | Focus/Bulk cooldown sweep (Focus premium +5.0%): seller15 managed, ALL stack + abilities v0.3, 30-min session, | v0.3 | 2026-11-09 (mtime) | abilities |
| [product/sim/m4/fb_prem/fb_p05_rush110.md](product/sim/m4/fb_prem/fb_p05_rush110.md) | Focus/Bulk cooldown sweep (Focus premium +5.0%): seller15 managed, ALL stack + abilities v0.3, 30-min session, | v0.3 | 2026-11-09 (mtime) | abilities |
| [product/sim/m4/focus_bulk_cd.py](product/sim/m4/focus_bulk_cd.py) | """M4 Market Hand Focus/Bulk mode-switch cooldown sweep (Economy, 2026-10-16). python3 focus_bulk_cd.py > focu | v0.3 | 2026-10-16 | economy |
| [product/sim/m4/focus_bulk_cd_err.txt](product/sim/m4/focus_bulk_cd_err.txt) |  | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/focus_bulk_cd_out.md](product/sim/m4/focus_bulk_cd_out.md) | Focus/Bulk cooldown sweep: seller15 managed, ALL stack + abilities v0.3, 30-min session, 30 seeds, economy.f1- | v0.3 | 2026-11-09 (mtime) | abilities, economy |
| [product/sim/m4/leave_pen.py](product/sim/m4/leave_pen.py) | """Leave-penalty check (m4-manage-proposal.md §12). Imports m4_sim (not edited); patches a private copy of run | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/leave_pen_err.txt](product/sim/m4/leave_pen_err.txt) |  | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/leave_pen_out.md](product/sim/m4/leave_pen_out.md) |  model  mode  L18 min off→on  L@30 off→on  penalty $/min (on)  penalty % of 2h earn  lowest balance after 10 m | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/m4_abv2_err.txt](product/sim/m4/m4_abv2_err.txt) |  | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/m4_abv2_out.md](product/sim/m4/m4_abv2_out.md) |  variant  F10 opt mean [worst] / casual  F18  F24  max worst  cap 2x  band 1.5-2 (opt means)  | v0.2 | 2026-11-09 (mtime) | — |
| [product/sim/m4/m4_abv2_run.py](product/sim/m4/m4_abv2_run.py) | """v0.2 abilities in the full stack, 10-min active/idle, seeds 0-99. python3 m4_abv2_run.py > m4_abv2_out.md"" | v0.2 | 2026-11-09 (mtime) | abilities |
| [product/sim/m4/m4_active.py](product/sim/m4/m4_active.py) | ---- tracks ---- | — | 2026-10-16 | — |
| [product/sim/m4/m4_active_err.txt](product/sim/m4/m4_active_err.txt) |  | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/m4_active_raw.md](product/sim/m4/m4_active_raw.md) | Progression, no workers, 30 seeds (t18 min median / n reaching / L@30 / H / V / C / max gap min) | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/m4_active_raw2.md](product/sim/m4/m4_active_raw2.md) | 10-min window ratios active/idle (30 seeds), state H=V=F, C=F-3, all unlocked workers hired, energy start 100 | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/m4_active_run.py](product/sim/m4/m4_active_run.py) | """Runner for m4_active.py -> raw tables (stdout). python3 m4_active_run.py --seeds 30""" | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/m4_bots_out.md](product/sim/m4/m4_bots_out.md) |  bot  model  t18 min med (n/30)  L@30 med  H  V  C  max gap min  | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/m4_bots_run.py](product/sim/m4/m4_bots_run.py) | """Task B: check 1 re-run with a bot set (no PM Farm Upgrades 3-track bots exist in product/). python3 m4_bots | — | 2026-10-16 | — |
| [product/sim/m4/m4_err.txt](product/sim/m4/m4_err.txt) |  | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/m4_final_err.txt](product/sim/m4/m4_final_err.txt) |  | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/m4_final_out.md](product/sim/m4/m4_final_out.md) | 10-min active/idle (mean of 30 seeds [worst seed]); optimal / seller15 / casual | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/m4_final_run.py](product/sim/m4/m4_final_run.py) | E1 (30-min windows) | v0.3 | 2026-10-16 | — |
| [product/sim/m4/m4_out.md](product/sim/m4/m4_out.md) | M4 AC table (30 seeds; run_m4 = run_m2 + hooks; CURRENT + M2_CURRENT) | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/m4_sim.py](product/sim/m4/m4_sim.py) | """M4 market / worker-mode / pause / golden-egg modelling (Economy/Balance Designer, 2026-10-16). | — | 2026-10-16 | golden, pause, economy |
| [product/sim/m4/m4_sweep.py](product/sim/m4/m4_sweep.py) | """Follow-up sweeps for m4_sim (B focus setup, B2 counters, C matched-level uplift, D active/idle). python3 m4 | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/m4_sweep_out.md](product/sim/m4/m4_sweep_out.md) |  variant  model  managed $/s 0-60  unmanaged $/s 0-60  managed wages 2h  inc@F21 managed  inc@F21 M1  F21 rati | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/m4_taskc_out.md](product/sim/m4/m4_taskc_out.md) |  | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/m4_taskc_run.py](product/sim/m4/m4_taskc_run.py) | """Task C: golden egg v0.3 E1 + frenzy scope + stacking worst case. python3 m4_taskc_run.py > m4_taskc_out.md" | v0.3 | 2026-11-09 (mtime) | golden |
| [product/sim/m4/m4_workers_prog.py](product/sim/m4/m4_workers_prog.py) | """TR-5 progression re-check WITH workers + Grader (Economy, 2026-10-16). python3 m4_workers_prog.py | v0.3 | 2026-10-16 | economy |
| [product/sim/m4/m4_workers_prog_err.txt](product/sim/m4/m4_workers_prog_err.txt) |  | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/m4_workers_prog_out.md](product/sim/m4/m4_workers_prog_out.md) | economy.f1-m4cols.csv  s15  60 min  workers+Grader ON | — | 2026-11-09 (mtime) | economy |
| [product/sim/m4/m4a_gate40.py](product/sim/m4/m4a_gate40.py) | """M4A-40 gate, best-payback highlight (Economy 2026-10-16). python3 m4a_gate40.py <csv> [s15casual] | — | 2026-10-16 | economy |
| [product/sim/m4/m4a_gate40_hyst.py](product/sim/m4/m4a_gate40_hyst.py) | """M4A-40 gate WITH M4A-18 v1.4 hysteresis (PM Farm copy of Economy's m4a_gate40.py, 2026-10-16; HoP 16:08). | v1.4 | 2026-10-16 | economy |
| [product/sim/m4/m4a_gates_3839.py](product/sim/m4/m4a_gates_3839.py) | """M4A-38 / M4A-39 gates on a table (m4_sim bots, standard scenario, 30 seeds; farm_cost/hens_cost/egg_value_c | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/m4a_m1_ratio.py](product/sim/m4/m4a_m1_ratio.py) | """Active/idle 10-min ratio, base v7 vs fixB (no Hens lay milestones), using m4_final_run's ALL stack. python3 | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/m4a_m1m3.py](product/sim/m4/m4a_m1m3.py) | """M1/M3: Collection-aware look-ahead greedy buyer, 60 min, base v7 vs Hens-demand coupling fixes. python3 m4a | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/m4a_m2_newhens.py](product/sim/m4/m4a_m2_newhens.py) | """M2 recheck after M1 fix (no lay milestones): static first-minute income ratio v7/v6, H=F, grandfathered V.  | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/m4a_verify.py](product/sim/m4/m4a_verify.py) | """Verify Claude M4-A review items with our m4_active model. python3 m4a_verify.py""" | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/migration_v7.py](product/sim/m4/migration_v7.py) | """M4-A save migration v6 -> v7: first 10 min after migration vs the same save staying on v6 (F1). | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/migration_v7_err.txt](product/sim/m4/migration_v7_err.txt) |  | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/migration_v7_out.md](product/sim/m4/migration_v7_out.md) |  save  model  variant  start H/V  eggs/s 0 (v6)  price 0 (v6)  TR-4  inc 0-1 (x v6)  inc 0-10 (x v6)  buys 10  | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/mj2_offline.py](product/sim/m4/mj2_offline.py) | """MJ2: active (optimal, ALL stack, 10-min window $/s) vs 2 h offline $/s at H=F=V=10/20/30, C=F-3. | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/pause_rec_err.txt](product/sim/m4/pause_rec_err.txt) |  | — | 2026-11-09 (mtime) | pause |
| [product/sim/m4/pause_rec_out.md](product/sim/m4/pause_rec_out.md) |  recovery x drain  seller15 pause vs never $/s 0-60 (wins/30)  cheapest pause vs never $/s 0-60 (wins/30)  cas | — | 2026-11-09 (mtime) | pause |
| [product/sim/m4/pause_rec_sweep.py](product/sim/m4/pause_rec_sweep.py) | F22-24 average managed income | — | 2026-11-09 (mtime) | pause |
| [product/sim/m4/pmfu_base30.txt](product/sim/m4/pmfu_base30.txt) | M4 track check, table ../../economy.f1.csv tuning {'hb': 30, 'hg': 1.3, 'vb': 40, 'vg': 1.33, 'hcap': 3, 'vcap | — | 2026-11-09 (mtime) | economy |
| [product/sim/m4/pmfu_plus20.txt](product/sim/m4/pmfu_plus20.txt) | M4 track check, table ../../economy.f1.csv tuning {'hb': 36, 'hg': 1.3, 'vb': 48, 'vg': 1.33, 'hcap': 3, 'vcap | — | 2026-11-09 (mtime) | economy |
| [product/sim/m4/qa_l14_waits.py](product/sim/m4/qa_l14_waits.py) | """QA: waits ending at a Farm L14 purchase (no workers, seller15+casual, 30 seeds) on live economy.csv vs econ | — | 2026-11-09 (mtime) | economy |
| [product/sim/m4/rf_rc2_err.txt](product/sim/m4/rf_rc2_err.txt) |  | — | 2026-11-09 (mtime) | rc2 |
| [product/sim/m4/rf_rc2_opts.md](product/sim/m4/rf_rc2_opts.md) | Refill sweep (live risk=True, staggered start=True): F22-24, seeds 0-99, combo 45 s, single-row refills, ALL s | v0.3 | 2026-11-09 (mtime) | refill, rc2 |
| [product/sim/m4/rf_signoff_err.txt](product/sim/m4/rf_signoff_err.txt) |  | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/rf_signoff_prog.md](product/sim/m4/rf_signoff_prog.md) | Refill v0.4 (150 s / cap 2 / thr 50% / combo 10 s->45 s, single-row, live risk), economy.f1-m4cols.csv, seeds  | v0.4 | 2026-11-09 (mtime) | refill, economy |
| [product/sim/m4/rf_signoff_window.md](product/sim/m4/rf_signoff_window.md) | Refill sweep (live risk=True, staggered start=True): F22-24, seeds 0-99, combo 45 s, single-row refills, ALL s | v0.3 | 2026-11-09 (mtime) | refill |
| [product/sim/m4/rf_sweep.py](product/sim/m4/rf_sweep.py) | """rc2 Refill v0.3/v0.3a sweep (Economy, 2026-10-16). python3 rf_sweep.py > rf_sweep_out.md | v0.3 | 2026-10-16 | refill, rc2, economy |
| [product/sim/m4/rf_sweep_err.txt](product/sim/m4/rf_sweep_err.txt) |  | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/rf_sweep_out.md](product/sim/m4/rf_sweep_out.md) | Refill v0.3a sweep: F22-24, seeds 0-99, combo 45 s, single-row refills, ALL stack + abilities v0.3 | v0.3 | 2026-11-09 (mtime) | abilities, refill |
| [product/sim/m4/rf_v04.py](product/sim/m4/rf_v04.py) | """Refill v0.4 progression check (Economy, 2026-10-16). python3 rf_v04.py [nseeds] > rf_v04_out.md | v0.4 | 2026-10-16 | refill, economy |
| [product/sim/m4/rf_v04_err.txt](product/sim/m4/rf_v04_err.txt) |  | — | 2026-11-09 (mtime) | — |
| [product/sim/m4/rf_v04_out.md](product/sim/m4/rf_v04_out.md) | Refill v0.4 (150 s / cap 2 / thr 40% / combo 10 s->45 s, single-row, live risk), economy.f1-m4cols.csv, seeds  | v0.4 | 2026-11-09 (mtime) | refill, economy |
| [product/sim/m4/rf_v04_window_live.md](product/sim/m4/rf_v04_window_live.md) | Refill sweep (live risk=True, staggered start=False): F22-24, seeds 0-99, combo 45 s, single-row refills, ALL  | v0.3 | 2026-11-09 (mtime) | refill |
| [product/sim/m4/rf_v04_window_live_stagger.md](product/sim/m4/rf_v04_window_live_stagger.md) | Refill sweep (live risk=True, staggered start=True): F22-24, seeds 0-99, combo 45 s, single-row refills, ALL s | v0.3 | 2026-11-09 (mtime) | refill |
| [product/sim/market/casual_taper.py](product/sim/market/casual_taper.py) | """Casual no-worker pacing check + smallest-fix search (Economy, 2026-10-16). python3 casual_taper.py [seeds]  | — | 2026-10-16 | economy, pacing |
| [product/sim/market/casual_taper_err.txt](product/sim/market/casual_taper_err.txt) |  | — | 2026-11-09 (mtime) | — |
| [product/sim/market/casual_taper_out.md](product/sim/market/casual_taper_out.md) | Casual no-worker pacing, economy.m4-candidate.csv, 200 seeds (roadmap_m4_prog.run) | — | 2026-11-09 (mtime) | economy, pacing |
| [product/sim/market/first_hire.py](product/sim/market/first_hire.py) | """First-hire nudge (rc2-first-hire-nudge.md, AC-FH3) on the casual model (Economy, 2026-10-16). python3 first | — | 2026-10-16 | rc2, economy |
| [product/sim/market/first_hire_err.txt](product/sim/market/first_hire_err.txt) |  | — | 2026-11-09 (mtime) | — |
| [product/sim/market/first_hire_out.md](product/sim/market/first_hire_out.md) | First-hire nudge, casual model, economy.m4-candidate.csv, 200 seeds | — | 2026-11-09 (mtime) | economy |
| [product/sim/market/prog_err.txt](product/sim/market/prog_err.txt) |  | — | 2026-11-09 (mtime) | — |
| [product/sim/market/prog_out.md](product/sim/market/prog_out.md) |  player  workers  variant  $/min 10-30 med  lift 10-30 (mean)  lift 0-60  Farm@30:00 med [min-max]  in band  w | — | 2026-11-09 (mtime) | — |
| [product/sim/market/ratio_err.txt](product/sim/market/ratio_err.txt) |  | — | 2026-11-09 (mtime) | — |
| [product/sim/market/ratio_g9_out.md](product/sim/market/ratio_g9_out.md) | 10-min active/idle, 200 seeds: mean / P95 seed / max seed (active = max(W1 on, W1 off) per seed); idle = worke | — | 2026-11-09 (mtime) | — |
| [product/sim/market/ratio_out.md](product/sim/market/ratio_out.md) | 10-min active/idle, 200 seeds: mean / P95 seed / max seed (active = max(W1 on, W1 off) per seed); idle = worke | — | 2026-11-09 (mtime) | — |
| [product/sim/market/roadmap_m4_active.py](product/sim/market/roadmap_m4_active.py) | ---- tracks ---- | v0.2 | 2026-10-16 | — |
| [product/sim/market/roadmap_m4_prog.py](product/sim/market/roadmap_m4_prog.py) | """Customer roadmap v0.2 on full M4 stack (Economy 2026-10-16): copy of sim/m4/m4_workers_prog.py + O[se] sell | v0.2 | 2026-10-16 | economy |
| [product/sim/market/run_prog.py](product/sim/market/run_prog.py) | """Roadmap v0.2 progression grid on economy.m4-candidate.csv. python3 run_prog.py [seeds] [variant-set] > prog | v0.2 | 2026-11-09 (mtime) | economy |
| [product/sim/market/run_ratio.py](product/sim/market/run_ratio.py) | 2 h offline: eggs_per_sec0.25min(away,7200)hens offline mult, price incl. Grader (awake), no customer features | v0.2 | 2026-11-09 (mtime) | — |
| [product/sim/market/tr5_run_base.py](product/sim/market/tr5_run_base.py) | !/usr/bin/env python3 | — | 2026-10-16 | — |
| [product/sim/market/tweak8_out.md](product/sim/market/tweak8_out.md) |  player  workers  variant  $/min 10-30 med  lift 10-30 (mean)  lift 0-60  Farm@30:00 med [min-max]  in band  w | — | 2026-11-09 (mtime) | — |
| [product/sim/market/tweak_err.txt](product/sim/market/tweak_err.txt) |  | — | 2026-11-09 (mtime) | — |
| [product/sim/market/tweak_out.md](product/sim/market/tweak_out.md) |  player  workers  variant  $/min 10-30 med  lift 10-30 (mean)  lift 0-60  Farm@30:00 med [min-max]  in band  w | — | 2026-11-09 (mtime) | — |
| [product/sim/results.txt](product/sim/results.txt) | baseline (economy.csv v1)  (20 seeds, 30 min, sell every 15 s, tap 1/s) | — | 2026-11-09 (mtime) | economy |
| [product/sim/seller-variance-proposal.md](product/sim/seller-variance-proposal.md) | Seller15 bot: per-seed variance (HoQA F-1, PR #7) — proposal for Engineering | — | 2026-10-17 | — |
| [product/sim/seller_variance_run.py](product/sim/seller_variance_run.py) | """100-seed seller15 variance report (F1 m4cols 86f0e80e). python3 seller_variance_run.py [--seeds 100]""" | — | 2026-11-09 (mtime) | — |
| [product/sim/seller_variance_sim.py](product/sim/seller_variance_sim.py) | Proposal M1-R1 (see product/economy-proposal-m1.md). Farm cost growth unchanged at x1.35. | — | 2026-10-15 | economy |
| [product/sim/telemetry/ac_w2share.py](product/sim/telemetry/ac_w2share.py) | """AC-W1..W7 with w2_asleep_collect_share (copy of sim/m4/rf_v04 harness; file unchanged). python3 ac_w2share. | — | 2026-11-09 (mtime) | telemetry |
| [product/sim/telemetry/ac_w2share_out.txt](product/sim/telemetry/ac_w2share_out.txt) | share 0: AC-W1 PASS (98%, 24.7); AC-W2 PASS (+0.00); AC-W3 PASS (33.8 vs 47.0); AC-W4 PASS (2.00, 32.2); AC-W5 | — | 2026-11-09 (mtime) | telemetry |
| [product/sim/telemetry/tel_combo.py](product/sim/telemetry/tel_combo.py) | """Floor N + asleep share 0.15 (unmanaged Coop Hand) and floor alone for no hand already in tel_sweeps. 50 see | — | 2026-11-09 (mtime) | telemetry |
| [product/sim/telemetry/tel_combo_out.md](product/sim/telemetry/tel_combo_out.md) |  N (s), share 0.15, unmanaged hand  visit20  visit45  visit90  | — | 2026-11-09 (mtime) | telemetry |
| [product/sim/telemetry/tel_core.py](product/sim/telemetry/tel_core.py) | taps=(period_s, n): player taps n times (1/s) at the start of every period_s window; None = 1 tap/s | — | 2026-10-16 | telemetry |
| [product/sim/telemetry/tel_pen_fix.py](product/sim/telemetry/tel_pen_fix.py) | """Leave-penalty trace rerun: idle arms with leave_pen=0 (no seller awake -> no penalty), shares 0/0.15/0.20,  | — | 2026-11-09 (mtime) | telemetry |
| [product/sim/telemetry/tel_pen_fix_out.md](product/sim/telemetry/tel_pen_fix_out.md) |  share  leave_pen  unmanaged idle $/s F22/23/24  delta vs share 0  mgd/unm F22-24 mean  unsold basket @60 min  | — | 2026-11-09 (mtime) | telemetry |
| [product/sim/telemetry/tel_report.md](product/sim/telemetry/tel_report.md) | TTFU (first purchase, s), csv caps, nohand | — | 2026-11-09 (mtime) | telemetry |
| [product/sim/telemetry/tel_report.py](product/sim/telemetry/tel_report.py) | import json, statistics as st | — | 2026-11-09 (mtime) | telemetry |
| [product/sim/telemetry/tel_run.py](product/sim/telemetry/tel_run.py) | """python3 tel_run.py [seeds]  -> tel_raw.json. 2 worker processes.""" | — | 2026-11-09 (mtime) | telemetry |
| [product/sim/telemetry/tel_streak.py](product/sim/telemetry/tel_streak.py) | coop-full accounting: find the coop fill line | — | 2026-10-16 | streak, telemetry |
| [product/sim/telemetry/tel_streak_out.md](product/sim/telemetry/tel_streak_out.md) | 60-min window, streak cap 0.40, full stack (200 seeds); ratio = per-seed active / mean managed-idle at same F | — | 2026-11-09 (mtime) | streak, telemetry |
| [product/sim/telemetry/tel_sweeps.py](product/sim/telemetry/tel_sweeps.py) | """Task 2 (w2 asleep share) + task 3 (coop-cap floor) window sweeps. python3 tel_sweeps.py -> tel_sweeps_raw.j | — | 2026-11-09 (mtime) | telemetry |
| [product/sim/telemetry/tel_sweeps_report.md](product/sim/telemetry/tel_sweeps_report.md) | Task 2: w2_asleep_collect_share (unmanaged Coop Hand), F8+ median coop-full % (F11/F17/F23 pooled, 100 seeds,  | — | 2026-11-09 (mtime) | telemetry |
| [product/sim/telemetry/tel_sweeps_report.py](product/sim/telemetry/tel_sweeps_report.py) | import json, statistics as st | — | 2026-11-09 (mtime) | telemetry |
| [product/sim/telemetry/tel_visits.py](product/sim/telemetry/tel_visits.py) | """Stochastic visit player: visits with exponential gaps (mean G s), 5 taps (1/s) per visit + Sell all every 3 | — | 2026-11-09 (mtime) | telemetry |
| [product/sim/telemetry/tel_visits_report.md](product/sim/telemetry/tel_visits_report.md) | visit player full % caps=csv (P10/P50/P90, 30 seeds; n seeds reaching band) | — | 2026-11-09 (mtime) | telemetry |
| [product/sim/telemetry/tel_visits_report.py](product/sim/telemetry/tel_visits_report.py) | import json | — | 2026-11-09 (mtime) | telemetry |
| [qa/claude-gamer/m3-rc1-pre-dd52bfd.md](qa/claude-gamer/m3-rc1-pre-dd52bfd.md) | Claude Gamer — release m3-rc1-pre-dd52bfd (PASS_ID m3-rc1-pre-dd52bfd) | — | 2026-11-09 (mtime) | — |
| [qa/claude-gamer/m3-rc1-pre-dd52bfd/c1-events.txt](qa/claude-gamer/m3-rc1-pre-dd52bfd/c1-events.txt) | 2026-10-17T13:00:13.915Z chunk c1 390x844 480s idle=330-420 | — | 2026-10-17 | — |
| [qa/claude-gamer/m3-rc1-pre-dd52bfd/c2-events.txt](qa/claude-gamer/m3-rc1-pre-dd52bfd/c2-events.txt) | 2026-10-17T13:12:46.699Z chunk c2 390x844 540s idle=-1--1 | — | 2026-10-17 | — |
| [qa/claude-gamer/m3-rc1-pre-dd52bfd/c3-events.txt](qa/claude-gamer/m3-rc1-pre-dd52bfd/c3-events.txt) | 2026-10-17T13:25:55.508Z chunk c3 390x844 540s idle=-1--1 | — | 2026-10-17 | — |
| [qa/claude-gamer/m3-rc1-pre-dd52bfd/claude-judgement.txt](qa/claude-gamer/m3-rc1-pre-dd52bfd/claude-judgement.txt) | [gamer] call 1/10 (pass) model=sonnet effort=medium timeout=600s perms=on | — | 2026-11-09 (mtime) | — |
| [qa/claude-gamer/m3-rc1-pre-dd52bfd/desk-events.txt](qa/claude-gamer/m3-rc1-pre-dd52bfd/desk-events.txt) | 2026-10-17T13:35:25.025Z chunk desk 1280x800 180s idle=-1--1 | — | 2026-10-17 | — |
| [qa/claude-gamer/permtest-ce7d59a/note.md](qa/claude-gamer/permtest-ce7d59a/note.md) | gamer permtest ok | — | 2026-11-09 (mtime) | — |
| [qa/claude-gamer/rc1-pt1-pass1.md](qa/claude-gamer/rc1-pt1-pass1.md) | Claude Gamer — rc1-pt1 pass 1 | — | 2026-11-09 (mtime) | — |
| [qa/claude-gamer/rc1-qa-bugs-v4-7d52952.md](qa/claude-gamer/rc1-qa-bugs-v4-7d52952.md) | Claude Gamer — fix/rc1-qa-bugs-v4 @ 7d52952 (pass rc1-qa-bugs-v4-7d52952) | — | 2026-11-09 (mtime) | — |
| [qa/claude-gamer/rc1-qa-bugs-v4-7d52952/claude-judgement.txt](qa/claude-gamer/rc1-qa-bugs-v4-7d52952/claude-judgement.txt) | [gamer] call 1/10 (pass) model=sonnet effort=medium timeout=600s perms=on | — | 2026-11-09 (mtime) | — |
| [qa/claude-gamer/rc1-qa-bugs-v4-7d52952/coop-events.txt](qa/claude-gamer/rc1-qa-bugs-v4-7d52952/coop-events.txt) | 0:02 build undefined | — | 2026-11-09 (mtime) | — |
| [qa/claude-gamer/rc1-qa-bugs-v4-7d52952/desk-events.txt](qa/claude-gamer/rc1-qa-bugs-v4-7d52952/desk-events.txt) | 0:02 build undefined | — | 2026-11-09 (mtime) | — |
| [qa/claude-gamer/rc1-qa-bugs-v4-7d52952/m390-events.txt](qa/claude-gamer/rc1-qa-bugs-v4-7d52952/m390-events.txt) | 0:02 build undefined | — | 2026-11-09 (mtime) | — |
| [qa/claude-gamer/rc1-ux-clarity-ccd7bf9.md](qa/claude-gamer/rc1-ux-clarity-ccd7bf9.md) | Claude Gamer — rc1/ux-clarity @ ccd7bf9 (pass rc1-ux-clarity-ccd7bf9) | — | 2026-10-16 | — |
| [qa/claude-gamer/rc1-ux-clarity-ccd7bf9/claude-judgement.txt](qa/claude-gamer/rc1-ux-clarity-ccd7bf9/claude-judgement.txt) | [gamer] call 1/10 (pass) model=sonnet effort=medium timeout=600s perms=on | — | 2026-11-09 (mtime) | — |
| [qa/claude-gamer/rc1-ux-clarity-ccd7bf9/desk-events.txt](qa/claude-gamer/rc1-ux-clarity-ccd7bf9/desk-events.txt) | 0:01 shot desk-01-0m01-title.png | — | 2026-11-09 (mtime) | — |
| [qa/claude-gamer/rc1-ux-clarity-ccd7bf9/m390-events.txt](qa/claude-gamer/rc1-ux-clarity-ccd7bf9/m390-events.txt) | 0:01 shot m390-01-0m01-title.png | — | 2026-11-09 (mtime) | — |
| [qa/claude-gamer/rc1-ux-clarity-ccd7bf9/run1-stuck/m390-events.txt](qa/claude-gamer/rc1-ux-clarity-ccd7bf9/run1-stuck/m390-events.txt) | 0:02 shot m390-01-0m02-title.png | — | 2026-11-09 (mtime) | — |
| [qa/claude-qa/claude-qa-reports.md](qa/claude-qa/claude-qa-reports.md) | 2026-10-17 — Latest release m3-rc1-pre-dd52bfd (asset egg-farm.html) | — | 2026-10-17 | — |
| [qa/claude-qa/m3-rc1-pre-dd52bfd.md](qa/claude-qa/m3-rc1-pre-dd52bfd.md) | QA pass: GitHub Latest release m3-rc1-pre-dd52bfd (asset egg-farm.html) | — | 2026-11-09 (mtime) | — |
| [qa/claude-qa/permtest-ce7d59a/note.md](qa/claude-qa/permtest-ce7d59a/note.md) | qa permtest ok | — | 2026-11-09 (mtime) | — |
| [qa/claude-qa/rc1-pt1-pass1.md](qa/claude-qa/rc1-pt1-pass1.md) | rc1-pt1 (2490c79) QA pass 1 — Claude-assisted review, verified — 2026-10-16 | — | 2026-10-16 | — |
| [qa/claude-qa/rc1-qa-bugs-v4-7d52952.md](qa/claude-qa/rc1-qa-bugs-v4-7d52952.md) | QA pass: fix/rc1-qa-bugs-v4 @ 7d52952 | — | 2026-11-09 (mtime) | — |
| [qa/claude-qa/save-durability-2959ba0.md](qa/claude-qa/save-durability-2959ba0.md) | QA pass 2: save durability, build 2959ba0 | — | 2026-11-09 (mtime) | — |
| [qa/claude-qa/save-durability-4a25d0d.md](qa/claude-qa/save-durability-4a25d0d.md) | QA pass 3: save durability v3, build 4a25d0d | — | 2026-10-16 | — |
| [research/README.md](research/README.md) | Research register | — | 2026-11-09 (mtime) | — |
| [research/agent-dashboard-patterns.md](research/agent-dashboard-patterns.md) | Agent / ops activity dashboard patterns | — | 2026-10-27 | — |
| [research/cursor-x-subscription.md](research/cursor-x-subscription.md) | Question: Can studio bots use Cursor, and what does it cost us? | — | 2026-10-27 | — |

## Raw outputs over ~1 MB NOT copied (31)
These stay on the studio box (paths relative to `/workspace/egg-farm-studio/`). Under rule 19, gate outputs <5 MB are on the repo `artifacts` branch.

- `artifacts/m52-o1a/pr.casual.off.p0.jsonl` (6634 KB)
- `artifacts/m52-o1a/pr.casual.off.p1.jsonl` (6634 KB)
- `artifacts/m52-o1a/pr.casual.on.p0.jsonl` (6634 KB)
- `artifacts/m52-o1a/pr.casual.on.p1.jsonl` (6634 KB)
- `artifacts/m52-o1a/pr.optimal.off.p0.jsonl` (6716 KB)
- `artifacts/m52-o1a/pr.optimal.off.p1.jsonl` (6717 KB)
- `artifacts/m52-o1a/pr.optimal.on.p0.jsonl` (6716 KB)
- `artifacts/m52-o1a/pr.optimal.on.p1.jsonl` (6717 KB)
- `artifacts/m52-o1a/pr.seller15.off.p0.jsonl` (6709 KB)
- `artifacts/m52-o1a/pr.seller15.off.p1.jsonl` (6709 KB)
- `artifacts/m52-o1a/pr.seller15.on.p0.jsonl` (6708 KB)
- `artifacts/m52-o1a/pr.seller15.on.p1.jsonl` (6709 KB)
- `artifacts/v5-ui/harness-rc-next/tests/selftest-20261030-112603-full/6-step-guard/g5/bn/bin/node` (97496 KB)
- `artifacts/v5-ui/harness-rc-next/tests/selftest-20261030-113736-full/6-step-guard/g5/bn/bin/node` (97496 KB)
- `artifacts/v5-ui/harness-rc-next/tests/selftest-20261030-122803-full/6-step-guard/g5/bn/bin/node` (97496 KB)
- `artifacts/v5-ui/harness-rc-next/tests/selftest-20261030-132101-step-guard/g5/bn/bin/node` (97496 KB)
- `artifacts/v5-ui/harness-rc-next/tests/selftest-20261030-134535-step-guard/g5/bn/bin/node` (97496 KB)
- `artifacts/v5-ui/harness-rc-next/tests/selftest-20261030-135934-step-guard/g5/bn/bin/node` (97496 KB)
- `artifacts/v5-ui/harness-rc-next/tests/selftest-20261030-140459-step-guard/g5/bn/bin/node` (97496 KB)
- `artifacts/v5-ui/harness-rc-next/tests/selftest-20261030-140546-step-guard/g5/bn/bin/node` (97496 KB)
- `artifacts/v5-ui/harness-rc-next/tests/selftest-20261030-141216-step-guard/g5/bn/bin/node` (97496 KB)
- `artifacts/v5-ui/harness-rc-next/tests/selftest-20261030-142437-step-guard/g5/bn/bin/node` (97496 KB)
- `artifacts/v5-ui/harness-rc-next/tests/selftest-20261030-143105-step-guard/g5/bn/bin/node` (97496 KB)
- `product/farm/scratch/e10/hatchlog/AssZ-seller15-cur-farmfirst-lay700-T7200.json` (1537 KB)
- `product/farm/scratch/e10/hatchlog/AssZhold-seller15-cur-farmfirst-lay700-T7200.json` (1537 KB)
- `product/farm/scratch/e10/hatchlog/none-seller15-cur-farmfirst-lay700-T7200.json` (1539 KB)
- `product/farm/scratch/e10/hatchlog/none-seller15-cur-greedy-lay700-T7200.json` (1607 KB)
- `product/farm/scratch/e10/hatchlog/none-seller15-cur-whenidle-lay700-T7200.json` (1589 KB)
- `product/sim/telemetry/tel_raw.json` (1153 KB)
- `product/sim/telemetry/tel_sweeps_raw.json` (1983 KB)
- `qa/reviews/bg5-bg4-cert-20261110/logs/d6ac-search/fs-sha256.tsv.gz` (8303 KB)
