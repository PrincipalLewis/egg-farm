# Final RC full 3-engine pass. Plan (Head of QA, 2026-10-17 12:23)
Base: main dd52bfd (C2 dropped unless Vadim clears Features by 12:30). Use only the RC SHA HoE sends. Use the full SHA, confirm it's pushed, and confirm main equals the RC SHA.

## Saves & Release QA (lane 1)
- Unit tests, check-release-build, and rc0 smoke in Chromium/Firefox/WebKit.
- Save/load and migration from an old save; offline earnings; hidden-tab offline in **Firefox** (carried over from #39); clock change.
- WebKit runtime globals: no eggfarmPerf or debug globals.
- AC7 on the TS variance bot (seller-variance.ts); payout preview equals the credited amount, with M4 on and off.
- The HTML artifact loads and its build label matches the RC SHA.

## UI/Layout & Gameplay QA (lane 2, Chromium; others serial on lane 1 when free)
- PM4-P3 re-check: Collection card in the coop-capped, short-on-coins state at 360/375/390 x 3 engines, 0 overlaps.
- Farm card, coop sprite diff vs the #40 baseline.
- M4-A highlight rule, the #5 toast, #35, #37 (if merged), worker-asleep (if merged).
- Core loop: hire, collect, sell, Sell all, upgrade.
- Console errors: none.

## Screenshot set to Art & UX
- 360/375/390 plus **1280 docked**, in all 3 engines.
- manifest.json: full SHA, pushed, HUD label checked. **Each shot's tab and state must match its manifest entry.** Before handoff, open every shot and check it against its entry (the p3-fix-462a071 set was mislabeled).

## Sign-off
All ACs pass, no open Blocker/Critical/Major, report filed. Then Player, Game Critic, Claude QA Tester and Claude Gamer each do one pass, and only a real bug blocks.
