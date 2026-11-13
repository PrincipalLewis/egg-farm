# v5 workstreams: ordered queue per lane

**Source:** `engineering/v5-flag-table.md` §(a)–(d) (plan **B** with the parallel-build rulings, accepted D-CEO-20261110-13), updated with branch state from `in-flight.md`. Hours are engineer hours, low–high; ~8 h/day/lane. "→" means "then". Restart order follows org-plan rule 10 (staged restarts: critical-path engineers first, no mass wake).

**Updated Fri 13 Nov 2026:** #125, #128, #123, #119, #132/#140 and #142 have merged into `rc/v5` (merge shas in `gates-and-schedule.md`). The RC is dated after the sim-complete sha; the 65% stop is lifted (D-CEO-20261113-01).

## Lanes

### Saves — Senior Engineer, Saves & Persistence `3ba38cf3` — 32–44 h
1. **Risk helpers FIRST** — #128 (salesStopped + fatigueCue sim, emitters), 10–14 h. Unblocks Backfill's stub→real swap.
2. **Refill sim** — #133 (`saves/v5-refill-sim`), 19–27 h (plan 24, incl. autoRefill). Publish **G0 API note on day 1** (Features Shift and Hire 2 clockWage build against it). No SAVE_VERSION bump.
3. **`worker_paused`** — #132, ~1 h + re-bar 2 h.
4. Land the breeds stack (#125 → #127 → #100) with QA. (#119 and the #125 fix are already done and excluded from the hours.)
- Shares ownership of the `tick.ts`/`workers.ts` seam with the Architect.

### Features — Senior Engineer, Features & Economy Wiring `95daf662` — 28–36 h
1. **Breeds PR-B** — `feat/v5-breeds-ui-prB`, ~7 h (2 h waits on Saves #126 commit 1 `presentGateOpen` + #100 goal hook). PR-B before F6.
2. **F6 rebuild** — `feat/v5-f6-rebuild` (on origin), 6–8 h (≈5 h left). Golden, streak and Broody UIs wait on it.
3. **Shift sheet** (Refill UI of record + autoRefill rows + Boost slot) — `feat/v5-ui-shift-sheet`, 15–21 h, against refill G0.
4. #116 abilities UI conflict + bar, ~3 h.

### Generalist — Senior Engineer, Generalist `5a6a207d` — 35–47.5 h
1. collection-cost port — #129, 2–3 h (Ready).
2. Broody sim — #134, 6–8 h.
3. Golden overlay UI — 9–11.5 h (after F6).
4. Broody yard UI — 7–9 h.
5. session-end-base — 10–14 h (after #123).
6. #127 restack — 1–2 h (incl. m1 session-counter reset + pageshow/bfcache guard). Also #100 merge/QA ~2 h.

### Architect — Senior Software Architect `205f4268` — 10–15 h (+ RC lead)
1. TEL-AC1 envelope + hide-rotate — `v5/tel-envelope` (local), 7–11 h, after #123.
2. Refill review — 3–4 h.
3. Breeds PR-A push + PR (`v5/breeds-ui-a`, local) — blocked on Vadim's direct yes.
4. RC lead and reviewer throughout; owns the `tick.ts`/`workers.ts` seam with Saves.

### Backfill — Senior Engineer, UI (lane U backfill) `1d79672c` — 35–50 h (**longest lane, sets the pole**)
1. #5b salesStopped chip — #130, from day 0 against `engineering/tasks/v5-ui-ss-fatigue/SIM-API.md`.
2. #11 fatigueCue — #131.
3. Swap stub → real helpers when #128 merges (~2 h), then Ready.

### Hire 2 — Senior Engineer, Sim/TS + UI `821caad7` — 28–40 h
1. Day 1: ramp + **pause UI** — `wip/hire2/v5-pause-ui`, 8–12 h.
2. **clockWage** sim + UI — `wip/hire2/v5-clockwage`, 18–26 h, in parallel with refill against G0; +~2 h rebase; **merges after refill**.

### Hire 3 — Senior Engineer, UI `dec9a396` — 18–24 h
1. **Streak/tapCoins UI** — `v5/ui-streak-tapcoins` (plan 20 h) after F6.

### QA — HoQA `78e99c2d`; Saves QA `33ec1b55`; UI QA `edb6ef85` — ~60–75 QA h
- About 22 PR merge bars (Saves QA ~30–38 h, UI QA ~30–38 h), one per PR sha (rule 24, org-plan rule 11, 3-round cap).
- Serial tail after the last Ready: 13–19 QA h = last bar → K10/B4/CSV gate at the sim-complete sha → RC verdict with one re-run.

### Product / Economy — HoP `958f5a66`, Economy/Balance Designer `dea51801`
- Idle except one-line rulings (lean mode, D-CEO-20261110-14; org-plan rule 13). Open rulings: `tc_streak_cool_cue_min_tier`, `tc_autorefill_at_pct` (30) / `tc_autorefill_reserve` (0) placement.
- Runs of record (R04, CSV, B4, K10) at the sim-complete sha; R04 repair screen on collection L18–21 + tier 5 after #129 (D-CEO-20261110-05).

### Art & UX — HoA `e17bab0a`
- On call; ~4 pts over the run: ~2 for interim screenshot review of lane-U UIs as they merge, ~2 for the final RC evidence review (ops/usage-forecast-v5.md).

## Critical path (plan B)

**Pole formula:** longest single lane ÷ 8 h + ~1 day HoQA + ~0.5 day merge/rebase slack.

- Pole lane: **Backfill 35–50 h** (mid 42.5), Generalist a close second (mid 41.25).
- Hard serial links: Saves risk-helpers before Backfill's swap; refill G0 on day 1; clockWage merges **after** refill; golden/streak/Broody UIs need **F6**; PR-B before F6; merge train **#125 → #127 → #100**; #119 after restart + CP train + verify-smoke.
- RC working day in plan B: ~day 7 mid / ~day 8 high after the restart, or ~7.6–8 / ~8.6–9 with HoQA's 13–19 QA h on the pole. **These are engineer-day dates; the real limit is usage (see `gates-and-schedule.md`). The RC is dated after the sim-complete sha (D-CEO-20261110-13; confirmed in the 2026-11-13 update).**
- 5-day hours check: FAIL for Backfill (and Generalist high). Quantified-but-not-applied move: shift session-end-base off Generalist to Architect or Hire 3 (pole unchanged).
