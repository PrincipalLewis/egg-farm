# DRAFT PR body (no PR opened): v5 streak meter/chips, A2 tier pops, tapCoins +$ pop UI
Branch `v5/ui-streak-tapcoins` @ **f13d95a** (base rc/v5 d65391b). Spec: streak v1.3.3 b315dea1, art-ux/m5-combo-tiers.md v0.3 ed4ded1d. PR goes up via HoE after the rebase onto F6 (see HANDOFF.md).

## Summary
Streak meter row, A2 tier pill + MAX sparks, tapCoins +$ coin pop, live regions, reduced motion, price chips (order cards + Sell all), R2/R3 credited-tap filter, R16 tier-pitched egg.collect, the tier sting replacing that tap's collect (§1), F-2 fix (own commit 9763ad3), streak SFX copied to public/assets/audio (aa1fa96). app.ts limited to the 4 HoE items (app-ts-hunks.md). Flags off: byte-identical.

## Tests
Full vitest @f316147: 164/164 files, 2386 pass, 1 skip; sync-economy --check OK. Trial (F6 v1.0 da38e3f + branch + f6-swap.diff) @c8d75e2: 165/165, 2422 pass. Browser (visual-check.md, shots/): chromium/firefox/webkit 40/40 at 360/390/1280; audio chromium/firefox 6/6.

## Literals (Architect ruling: layout numbers only; player-felt numbers from m4.tc). Full table: literals.md
| Where | Literal | Tag |
|---|---|---|
| streak-view.ts COOL_CUE_MIN_TIER | 2 (cool sting/announce from tier ≥ 2) | **TUNABLE**: open, stays one named constant with `TODO(tc_streak_cool_cue_min_tier)`; HoE routes to Econ/HoP/QA (CSV of record is sha-pinned; ST-AC18 pins 7 keys) |
| streak-view.ts | 1e12, 100, 100, 2 (index) | math |
| streak-meter.ts STREAK_UI_MS | 2000/1000 live-region gaps; 900 pill, 800 coin pop, 400 tier-up | layout (a11y throttle, anim ms) |
| streak-meter.ts | 16 METER_ZONE_PX, 6 MAX_SPARKS, 40 EGG_POP_ABOVE_CENTRE_PX, spark angles/distances | layout |
| tap-coin-pop.ts POP | 8/8/8/32/20 px | layout |
| streak-f6-stub.ts | 30 FX max, 16 zone clear (deleted at the F6 swap) | layout |
| box centres, ±1 ranges | 2 | math |

## Commit authors
6b1af0a ad924b1 6d18303 d4e51c0 28836e0 61d9a79 77a0e2b 0dd138e carry the Architect as author because of the shared-config leak before the D-HOE-58 reset; handled like #128, no rewrite.

## Open Art questions (built to the current flows)
- S-AC19: the order card's Sell button value chip, which depends on the MK-24-1 width. Not built yet; the chips sit on the card's l1 line.
- Sell all chip placement: built as a centred row above #sellAll; needs Art to confirm.

## Notes
- Synthetic (untrusted) collect clicks are dropped while the streak/tapCoins flag is on (R3). HoE OK for v5; Architect to confirm at review. Flags off: unchanged.
- WebKit audio: not assessed, a known environment limit (this WebKit build can't decode mp3, QA-D-1030-WKDEPS), not a fail. Chromium/Firefox cover §1 sting-replaces-collect and R16 pitch.
