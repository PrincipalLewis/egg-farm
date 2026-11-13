# v5 streak / tapCoins UI: literals outside the [F3-no-literal] scan (for the PR body)
Branch `v5/ui-streak-tapcoins` @ 90cb2d7, 2026-11-10 (CET, UTC+1). Architect ruling: `src/ui/streak-flags.ts` (the only flagOn caller) is accepted, same pattern as `sim/tap-coins.ts`. The exception covers **UI layout numbers only** (px, CSS/animation ms, z-index). Every player-felt streak number (window, threshold, multiplier, timer) comes from `m4.tc`.
Method: the gate's own strip (comments, strings) and literal regex, NEUTRAL = 0/1/1000/1e-9/0xffffffff/1.0, run over streak-view.ts, streak-f6-stub.ts, streak-meter.ts, tap-coin-pop.ts, streak-chips.ts and streak-flags.ts. streak-chips.ts and streak-flags.ts have none. Lines are at 90cb2d7.
Tags: **layout** = px, CSS/anim ms, a11y throttle (exception). **math** = unit or precision arithmetic, not a tunable. **TUNABLE** = player-felt; has to move to m4.tc and the CSV.

| File:line | Literal(s) | What | Tag |
|---|---|---|---|
| streak-view.ts:22 | 1e12 ×2 | float-noise rounding of T_k (cap, per_tap, count all from m4.tc) | math |
| streak-view.ts:24 | 100 | fraction to % (pctFloor) | math |
| streak-view.ts:37 | 100 | reduced-motion whole-% steps (fraction to %) | math |
| **streak-view.ts:62** | **2** | **COOL_CUE_MIN_TIER: cool sting + "Streak cooling" only if tier ≥ 2 was reached (combo-tiers §1 tier-2 row, §6)** | **TUNABLE (threshold)** |
| streak-view.ts:77 | 2 | array index T[k−2] (= T_(k−1)) | math |
| streak-f6-stub.ts:46 | 30 | stub FX budget max (mirrors F6 FxBudget; F6 owns it; the stub is deleted at swap) | layout |
| streak-f6-stub.ts:48 | 16 | stub default zone clear px (F6 registerZone default) | layout |
| streak-meter.ts:35 | 2000, (1000), 900, 800, 400 | STREAK_UI_MS: live-region gaps 2 s / 1 s (combo-tiers §6, R16), pill 900 ms, coin pop 800 ms, tier-up 400 ms lifetimes (combo-tiers §2) | layout (a11y throttle, anim ms). Borderline "timer"; Art-owned durations, no sim effect |
| streak-meter.ts:37 | 16 | METER_ZONE_PX: golden no-spawn clearance (golden R14 / ST-AC21) | layout |
| streak-meter.ts:39 | 6 | MAX_SPARKS: spark dots at MAX (combo-tiers §2) | layout |
| streak-meter.ts:41 | 40 | EGG_POP_ABOVE_CENTRE_PX: app.ts floatText offset mirror | layout |
| streak-meter.ts:82 | 2 ×3 | box centre (/2) | math |
| streak-meter.ts:95 | 150, 120, 0.5, 180, 12, 8 | spark fan angles (deg), deg→rad, distance 12–20 px | layout |
| streak-meter.ts:112 | 2 | (rnd·2−1) ±1 range | math |
| tap-coin-pop.ts:10–14 | 8, 8, 8, 32, 20 | POP gap/edge/drift/rise/egg separation px (combo-tiers §4.2, R16) | layout |
| tap-coin-pop.ts:28, 36 | 2 | box centre (/2) | math |

## Fixed in this audit
- streak-meter.ts: the reset clamp had a local `MAX_FRAME_FOCUS_S = 1` (exempt from the scan as "1", but a player-felt timer copy). It now imports `FOCUS_DT_MAX_S` from sim/clock (3fa4224).
- streak-meter.ts:112: the drift used a bare 8. It now uses `POP.driftPx` (90cb2d7).

## Open: 1 tunable
**COOL_CUE_MIN_TIER = 2 → `tc_streak_cool_cue_min_tier` (2).** Parked (D-CEO-20261110-17): it stays one named constant in streak-view.ts, now marked `// TODO(tc_streak_cool_cue_min_tier): move to m4.tc/CSV at the restart (HoE routes to Econ/HoP/QA)`; the TODO is now line 62 and the constant line 63. I tried it and reverted. `data/economy.csv` is the M5.0 shipping CSV of record: its sha256 is pinned in tests/economy.test.ts CONFIG_BY_CSV_SHA (D-HOP-2026-10-29-01) against the vendored reference sim, so any column change fails parity until Economy re-vendors. QA's ST-AC18 pin also fixes the streak tc keys at the 7 in spec §5 / G3. Needs: an Economy PR (CSV column, constant 2, plus the fixture sha map), Product (spec §5 / G3 row), and QA (whether to extend the ST-AC18 pin and M5_TC_KEYS.streak). After that, my change is one line: `this.runMax >= tcNum(b, 'streak_cool_cue_min_tier')`, plus a config test.
