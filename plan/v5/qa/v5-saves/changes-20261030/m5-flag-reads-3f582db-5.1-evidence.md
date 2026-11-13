# 5.1 evidence: which src at rc/v5 3f582db reads each Row 34 flag (QA Saves, 2026-10-30 ~12:15 CET)
Status: EVIDENCE NOTE only. Superseded for v5 by D-CEO-20261030-06 (RC ships every m4.flags value at 0); the Row 34 flag-on work was dropped mid-way.
Method: `rg` over src/ (tests excluded) in scratch worktree qa/scratch/wt-rc1-3f582db (clean, 3f582dbfe31a9d309e6b1d0e96a4f77711b333ec).
Flag gate: config/flags.ts:16 `flagOn` = m4.enabled && m4.flags[f] === 1 (one namespace; M5_FLAGS list flags.ts:8-11).

## Generic: ANY flag on changes behaviour (even flags with no feature code)
- sim/timers.ts:23 `anyM5FlagOn` -> sim/tick.ts:28: with any M5 flag on, timed effects/production run with `{suspended: !clock.focus}` (F1c focus clock).
- game.ts:402 `attendedNow()` = anyM5FlagOn && attendedProbe -> game.ts:308 (apply ctx), :405 (player sale ctx), :423 focusFrameMs (sim/clock.ts:19).
So turning on e.g. clockWage alone (no reader) still switches the sim onto the focus-clock path.

## Per flag
| flag | specific reader(s) at 3f582db | behaviour change beyond the generic path? |
|---|---|---|
| golden | save/m5-fields.ts:60 (m5Load clamps nextSpawnRemainingS/frenzyRemainingS), :61 (evRngState sanitise), :99-100 (m5Offline expires goldenEgg + drawGap :38); sim/timers.ts:19 seedEvRng (flags.ts:18 evRngFlagOn) | save sanitise + evRng seeding only; no spawn/collect gameplay or UI (drawGap only called from m5Offline) |
| streak | sim/streak.ts:15 streakOn; creditTap via sim/actions.ts:64 (collect); sale factor sim/effects.ts:23 + payout.ts:11, actions.ts:30; timers.ts:21 streakTick; m5-fields.ts:102 (offline end), :108 (short gap) | YES: real sim (sale price x(1+s), streak_peak events); no UI (row 17) |
| pause | sim/pause.ts:10 isPaused -> econ/income.ts:46; m5-fields.ts:74 pauseLoad (load sanitiser, CCR-F4); config/m5-rules.ts:13 required tc | load sanitiser + isPaused read, but nothing in src sets `paused` (no sim/UI, manifest rows 31-32) |
| abilities | m5-fields.ts:66-71 (m5Load), :98 (m5Offline endCalls) | save sanitise only; no ability gameplay/UI |
| broody | m5-fields.ts:61-65 (m5Load nest/henIdx), timers.ts:19 (evRng seed) | save sanitise + evRng seed only |
| tapCoins | m5-fields.ts:23 (anyFlag enables m5Load/m5Offline); sim/events.ts:10 comment (bonus_cents) | none beyond enabling the sanitiser path + generic |
| fatigueCue | none (flags.ts only) | generic only |
| rc2Refill | none | generic only |
| autoRefill | none | generic only |
| clockWage | none | generic only |
| zeroGainUi | flags.ts:19 zeroGainConfirmOn (no callers) | generic only |
| salesStopped / bestBuyV2 / breeds | none as flags (econ/income.ts:82 `salesStopped()` is an unrelated sim helper, not the flag) | Row 34 = 0 anyway |
Validation: config/m5-rules.ts:15-23 validateM5 accepts 0/1 for every known flag; a scratch overlay build with the Row 34 ON values (12:14-12:15, discarded) passed sync-economy --check and tsc; build:html only refused on `+dirty` (uncommitted overlay). Not run in a browser (work dropped at the ruling).
Conclusion: consistent with D-HOE-20261030-11 — only streak (sim, no UI) and the save/load plumbing read these flags; nine of the eleven ON flags have no feature reader, but any of them flips the generic focus-clock path.
