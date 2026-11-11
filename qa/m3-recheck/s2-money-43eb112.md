# m3/rc1-s2-money @ 43eb112 (25ca816 + 9c3d47b on top of 10536b4) · 2026-10-16 · Head of QA
Worktree /tmp/qa-s2money-43eb112 (detached, clean; branch not modified or pushed). Release build `check-release-build: m3-rc1-pre+43eb112 ok` + `no eggfarmUi in release ok`; harness on `build:qa`/`dist-qa`. Every run checks first that the server is serving this worktree's bundle (s2-lib guard: dist-qa index-3adIDWZc.js, release index-Dq3R8IA8.js), on its own port (5400–5505). 10536b4 results (/tmp/qa-s2money-10536b4, s2-money-10536b4/) are kept only as a baseline.
Engines: Chromium (google-chrome), Firefox, WebKit (Playwright), headless, 375x812. Logs/JSON/screenshots: `s2-money-43eb112/`.
Scripts: qa/m3-recheck/s2-8-wage-rate.mjs (new, reusable); qa/m3-scripts/ s2-money-10536b4.mjs (fuzz, full-queue pop, $0 gate, S2-9, fast Collect), s2-3a-squeeze.mjs, s2-3a-early-probe.mjs, s2-43eb112-save-globals.mjs, s2-fastcollect-only.mjs, s2-3a-mk.mjs (MK-16/19 now accept an early-ended card if it was squeezed and a pop fired), s2-10-latency.mjs (seed money $9,000 → $30,000), s2-lib.mjs (bundle guard now follows DIST).

## Results (C / F / W)
| # | Check | Result | Evidence |
|---|---|---|---|
| Unit | vitest | **373/373 PASS** | needs ../../product/economy.csv (symlink /tmp/product); earlier ENOENT runs were the missing symlink, not code |
| 1a | S2-3a-1 squeeze: a card pushed out by an arriving live customer | **PASS** 3 engines | clone `transition: opacity 0.12s`, `+$133.20` pop from its slot in the same frame; reduced motion = instant cut + pop, no fade clone |
| 1b | Fuzz, 300 s, Market+Coop Hand + random player input | **PASS** 3/3 | 110 served → 110–113 cards, 0 uncovered. This fixture never hits the squeeze path (0 squeezes), so 1a covers that |
| 1c | MK-16 | **PASS** (the script flags 4 cards at ~0.9 s) | probe: all 4 are re-rendered with the same text in the same ms when the welcome modal closes (t≈2.05 s) and they keep dwelling. Not an early end |
| 1d | MK-19 reduced motion | **PASS** | only the first sample (1.2 s, already mid-dwell when sampling started) is short, same artefact as at 16d0fe3; the rest are 1.45–1.51 s, `.rm`, no animation |
| 1e | Full-queue +$X pop | **PASS** 3/3 | sale with "+N" showing: pop `+$478.40`, no card, money credited |
| 2 | S2-10-1 tap → screen update, p95 < 100 ms | **PASS** | normal: p95 2–17 ms; frames stalled: p95 3–15 ms (was 250–384 ms at 16d0fe3). Hire rows flag FAIL only because 5/15 taps had nothing left to hire (harness); timings 3–8 ms |
| 3a | **Market Hand wage (F3, economy.csv 0.75 $/min)** | **PASS** 3/3 | real 60 s = **75¢**; accelerated 60 s = 75¢, 10 min = **750¢**; money balance delta = sum of charged wage events. ui.rates() wage = 1.25 ¢/s = exact = charged. 10536b4 baseline: 60¢/60 s, 600¢/10 min (−20%), rates 1 ¢/s |
| 3b | Wage label ('Wage $0.75/min' / '$X/s') and net-rate pill | **N/A** | not in this SHA (moves to m3/rc1-ui); no wage text on screen. Rerun with LABEL=1 on rc1-ui |
| 3c | Independent sim check | **PASS** | product/sim/economy_sim.py `pay()` with wage_carry (M2_P4): 60 s = $0.75, 600 s = $7.50; old rounding = $0.60/$6.00 |
| 3d | S2-8 $0 gate, 2 h accelerated (two drops to $0) | **PASS** 3/3 | min money 0, both workers go Unpaid and resume, Collect 60/60, Sell 60/60, end probe earns, no soft-lock |
| 3e | $0 gate with carried fraction (frac 0.9, $0.01) | **PASS** 3/3 | money ≥ 0 and integer, nothing charged while Unpaid, frac held at 0.9, resumes at $10 |
| 4 | Save v6: v4→v6 (m1-rc2-v4-12min), v5→v6 (12min, 40min, 40min-edge) | **PASS** 3/3 | money, F/C levels, workers (energy/unpaid) identical, version 6, wageFracCents {} |
| 4b | wageFracCents across save/reload and a kill | **PASS** 3/3 | 0.75 kept through reload; kill = last autosave left on disk then page closed without unload (CDP Page.crash hangs headless Chrome) → 0.5 restored |
| 5 | S2-9 chip tap | **PASS** 3/3 | no auto-open as the queue fills (14 s to full); tap on a chip that's on screen opens; a press that started on another chip or the empty strip doesn't; a chip on screen <250 ms doesn't open, the same chip opens later |
| 6 | Fast Collect | **PASS** (1 WebKit flake) | touch-action: manipulation on #app/.scene/.queue (and #collect). 10×@50 ms button+scene 10/10, 45×@15/s 45/45 with squash and pop ≤100 ms on every tap. WebKit lost 1/45 on one button burst (44 collects, feedback 45/45); 4 reruns (3×45 button, 1×45 scene) clean, so it's a watch item |
| 7 | 25ca816 window.eggfarmUi in release | **PASS** 3/3 | `'eggfarmUi' in window` false, typeof undefined |
| 7b | Release globals: only eggfarmExportTelemetry | **FAIL** 3/3 | app globals on release: `eggfarmExportTelemetry`, **`eggfarm`**, **`eggfarmOrderList`** (main.ts:52, app.ts:104 unconditional on this branch). Save branch 98396ed already gates both behind IOS_FLAG_ENABLED |
| R | S2-4b (stall) | PASS 3/3 | 6/6 C, 5/5 F, 5/5 W |
| R | S2-7 | PASS except S2-6 | S2-6 "Queue full" overlapping "+5" at 375/390 is expected here (fix on m3/rc1-ui) |
| R | s2-regress (greyed taps, live money, sheet, offline) | PASS 3/3 | 5/5 |
| R | MK-17/18/20/21/22 | PASS | MK-18 C/F/W pass; MK-20 hashes the same in two runs and match 16d0fe3 (mk20-sim-hash.log); MK-21 ≥40%; MK-22 first customer <1 s |

## Defects
- **S2-REL-1 (Low; Medium if it still ships after the merge):** release bundle still exposes `window.eggfarm` (full game handle, writable state) and `window.eggfarmOrderList`. Repro: `npm run build`, serve dist, start the game, check `typeof window.eggfarm` → "object". The fix is on rc1-save-durability (98396ed). **Must be rechecked on the merged SHA**; it fails sign-off if either global survives the merge.
- Watch: WebKit fast Collect, 1 lost tap out of 45 at 15/s once; not reproduced in 4 reruns.
- Coverage note: the long fuzz never squeezes a card (Market Hand empties the queue). The directed squeeze test covers that path.

## Monday merge
OK to merge for S2-3a-1, S2-8 (exact wage, v6 save, $0 gate), S2-9, S2-10, fast Collect, with no regressions. Condition: the merged build must show only `eggfarmExportTelemetry` on release (merge after or with 98396ed and rerun MODE=globals). Wage label and pill are verified on rc1-ui.
