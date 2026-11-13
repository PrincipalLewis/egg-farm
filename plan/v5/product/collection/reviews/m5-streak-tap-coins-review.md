# Design-doc review: m5-streak-tap-coins-spec.md v1.0
**Reviewer:** PM, Collection (design-doc-review skill), 2026-10-24 CEST. The four lenses (game design, systems, economy, QA) were run adversarially by the reviewer; no specialists were consulted.
**Inputs:**
- the spec;
- `m4-collect-streak-spec.md` v0.3;
- `art-ux/m4-collect-streak.md`;
- the v2 slice A1;
- D-HOP-2026-10-24-04;
- `engineering/m5.0-sizing.md` §8;
- telemetry-spec v0.6.2;
- economy.csv;
- RC1 `income.ts`/`payout.ts`/`format.ts`/`app.ts` floaters.

## Completeness: 8/8
Overview §1 ✓ · Fantasy §2 ✓ · Rules §3 R1–R17 ✓ · Formulas §4 + §4.1 I_ref ✓ · Edge cases K1–K19 ✓ · Dependencies §7 ✓ · Tunables §5 traced ✓ · ACs ST-AC1–23 (+16b/16c) ✓ · Telemetry, size and gap closure ✓ (advisory).

## Dependency check
- `saleMultipliers` ✓.
- The floater merge (`app.ts:139-144`) exists ✓.
- `incomePerSec` is steady-state and **not** what D-HOP-04 #2 asks for as the main definition. The spec uses a new trailing-60 s I_ref (`sim/income-ref.ts`, HoE item 3) ✓. Since D-HOP-10 #1, gross `incomePerSec` + wages (I_ss) is used only for the first 60 s of sim time after a load or offline return (§4.1a).
- `tap` telemetry fields match HoE F4's names (`credited`, `bonus_cents`, `credited_taps`) ✓.
- The 0.15 asleep share is not in rc1 (no reader for `w2_asleep_collect_share`) and is flagged ✓.

## Formula plug-ins
- Cap 0.28 → tiers at 0.07/0.14/0.21/0.28 ✓.
- From the cap to 0: 3 + 0.28/0.03 = 12.33 s ✓.
- 5 s hidden at the cap: ~~0.22~~ → **0.28** (superseded; hidden < 60 s freezes the streak on the focus clock, D-HOP-08 #2 / HoE §9.1; ST-AC12a).
- Peak multiplier 1.28 × 2 = 2.56 ✓.
- F8 bonus ≤ 38¢; F30 ≤ $2.33 ✓.
- R15 threshold: round_half_up pays 1¢ from 0.5¢ → I_ref ≥ $0.1667/s, matching the text "$0.17" ✓ (pass 1 said $0.34; fixed).
- ST-AC21: 0.187/0.28 = 66.8% ✓.

## Value conflicts
| # | Conflict | Resolution |
|---|---|---|
| V1 | `tc_streak_cap` CSV 0.40 vs R9 0.28 vs CEO 0.30 | 0.28 provisional until M5-G3 (D-HOP-04 #3); drafted as a M5-G3 value change ✓ |
| V2 | v0.3 names `streak_step`/`streak_grace_s` vs CSV `tc_streak_per_tap`/`tc_streak_hold_s` | CSV canonical ✓ |
| V3 | `combo_*` CSV columns (an unrelated feature) | Tier column named `tc_streak_tier_count` ✓ |
| V4 | HoE `tap_bonus_income_window_s` vs shared window | `tc_ref_income_window_s` (shared with Broody), HoE alias noted ✓ |

## Required before implementation (blocking), found in pass 1, all fixed
- **B1 Two credited-tap definitions; wall vs sim time.** **Fixed:** R2 is the single D-HOP-04 #1 definition (≥ 1.0 s of sim time, eggs or not), the tap's time is the applying tick, and ST-AC16c covers it. The draft's `performance.now()` was removed.
- **B2 Reference income was `incomePerSec`** (steady-state, wages subtracted, live moods), contrary to D-HOP-04 #2. **Fixed:** §4.1 defines I_ref with inclusions, exclusions, storage, reload and hidden behaviour; ST-AC16b tests composition and isolation.
- **B3 Menus let the decay run (v0.3 K11)**, contrary to D-HOP-04 #4. **Fixed:** R12 freezes the hold and decay on the shared `dialogOpen()` signal; K10 and ST-AC13 rewritten.
- **B4 The telemetry swap was unmeasurable per session:** there was no field saying a Coop Hand was hired. **Fixed:** `session_end.coop_hand` added, and the swap is keyed on it (§8, ST-AC20).
- **B5 R15's pay threshold was wrong ($0.34/s).** **Fixed:** $0.17/s, matching round-half-up. ST-AC15 updated.

## Recommended (non-blocking)
- R1 (Q5): hidden < 60 s still decays (v0.3), while menus freeze. HoP may prefer to freeze on hidden too, since D-HOP-04 #2 calls hidden "sim paused".
- R2 (Q3): "passive income" is read as all sales at passive price factors (player Sell included). HoP should confirm, because worker-only sales would zero I_ref for players without a Market Hand.
- R3: Art & UX should check that tier pop-up copy fits at 360 next to the coin floater.

## Disagreements
The reviewer's lean was that empty-coop taps should only *hold* the streak (v0.3). Overruled by D-HOP-04 #1; the spec follows the ruling.

## Nice-to-have
A `max_tier` histogram on the dashboard; a debug readout of I_ref.

## Scope signal
**S–M** (HoE: streak + A2 2.75–3 dd, A1 1–1.5 dd).

## Verdict
- **Pass 1: NEEDS REVISION** (5 blocking).
- **Final, after fixes: APPROVED for build-readiness**, with external gates: Economy M5-G3 (cap 0.28, tap 0.03, tiers [P1-PENDING]) and M5-G1; Art tier copy, ticks and coin sound; HoP sign-off on Q3/Q5 (non-blocking); the implementation hold.

## v1.1 delta re-check (2026-10-24 16:21 CEST, D-HOP-2026-10-24-08)
- **Changes re-checked:**
  - hidden < 60 s freezes the streak (R10, K8, ST-AC12);
  - I_ref wording aligned with #1;
  - M5-G1 wording confirmed;
  - 0.15 removed (backlog);
  - Q3/Q5 closed.
- **New blocking item found and fixed in v1.1:** R12 (v1.0) applied the *frozen* s to worker sales under a menu, which allowed a permanent +28% by leaving a menu open at the cap. It's now suspended while frozen (R12, K10, ST-AC13), consistent with D-HOP-08 #3.
- **Status:** Approved (conditional), D-HOP-08 · **BUILDABLE (HoE §12)**.
- **Verdict v1.1: APPROVED.** Gates: M5-G3/M5-G1, Art tier copy and sound, the implementation hold.

## QA-gaps + HoE §9–§10 re-check (2026-10-24 16:27 CEST)
- **QA:** ST-1–ST-9 answered in §13. ST-5's M5-G3 date is Economy's.
- **HoE §9.1:** every hidden-decay example and AC was searched in the spec and reviews. The only remaining one (formula plug-ins above, 0.22) is now 0.28. Explicit **ST-AC12a**: hidden 5 s at 0.28 returns 0.28. Hold and decay are on the focus clock; the credited-tap and I_ref windows stay on the sim clock.
- **Flags (closed by D-HOP-09, below):** C2 I_ref including hidden-sim sales; C3 the credited-tap field name; A4 ST-AC20 needing full-migration fields.
- No new blocking items. **Verdict: APPROVED** (unchanged).

## D-HOP-2026-10-24-09 re-check (2026-10-24)
- **#1:** focus clock in the Glossary, R6/R7/R10/R12 and §4.1.
- **#2:** I_ref text is consistent (§4.1, gap 5, ST-2, C2).
- **#3:** `credited_taps` is the only emitted name. `taps_effective` is a dashboard-derived metric (moved eggs + empty credited), a different concept, and is not emitted.
- **#5:** the R12 no-uplift-while-frozen rule is endorsed.
- **#6:** the new §8.1 lists the ST-AC20 fields: 5 new fields on `session_end`, no new events. ST-AC20 is [T-sub, pending HoE sizing].
- No new blocking items. **Verdict unchanged: APPROVED.**

## D-HOP-2026-10-24-10 + HoQA v0.2 re-check (2026-10-24)
- **ST-2b:** §4.1a defines I_ss and a hard handover at 60 s of sim time.
- **Plug-ins:** F8 reload I_ss $12.60 → 37.8 → 38¢ ✓; F10 $16.50 → 49.5 → 50¢ (half-up) ✓.
- **ACs:** ST-AC16b's old reload/offline claims are withdrawn; ST-AC16d covers reload, live I_ss, handover, uplift exclusion, offline, short hide and fresh start.
- **Telemetry:** ST-AC20 is [T-sub] (D-HOP-10 #4).
- **Taps:** golden and Broody taps are excluded from crediting (R3, ST-AC14).
- ~~Non-blocking note: whether I_ss keeps RC1's 1 tap/s term~~ **Closed by D-HOP-2026-10-24-13 #1:** it is kept so I_ss matches the ring.
- No new blocking items. **Verdict unchanged: APPROVED.**

## D-HOP-2026-10-24-13 re-check (2026-10-24)
- **#1:** the I_ss note is closed.
- **#2:** R16, K14, ST-AC17 and the plug-in now use short money with the 8 px clamp. **Art confirmed it (number-pop-spec v1.0).** R16 and ST-AC17 now carry the full pop spec. The pop no longer merges with the egg floater (a separate source, offset 20 px).
  - Check: 81,240¢ → `+$812.40` ✓; 123,456¢ = $1,234.56 → `+$1.2K` ✓; 340,000,000¢ → `+$3.4M` ✓.
- No `popMoney` reference is left in the streak spec. **Verdict unchanged: APPROVED.**

## HoE §12 (BUILDABLE) re-check (2026-10-24)
- **D-C1:** `m4.flags.streak` / `tapCoins` in R13a, ST-AC29 and §13.
- **D-C3:** the R12 long-frame bullet.
- **D-C6:** in §4.1a; K13c and ST-AC16e cover the sales stall.
- **ST-AC20:** `empty_credited` is limited to credited taps while a Coop Hand is hired.
  - Check: (200 + 200) / 600 = 0.667 < 0.85 ✓; credited 100 + 250 = 350 ✓.
- **Verdict: APPROVED, BUILDABLE.**

## D-HOP-2026-10-24-16 re-check (2026-10-24)
- **M5-G3 values:** the scratch M5-G3 values equal the spec's (cap 0.28, tap 0.03, tiers 4 → 0.07/0.14/0.21/0.28, unlock F8). Tap-coin plug-ins (38¢/50¢/$2.33) and ST-AC9/11/21 are unchanged.
- **Renames:** `tc_ref_income_window_s` → `tc_tap_bonus_income_window_s`; the draft's `tc_tap_credit_min_s` 1.0 is used in R2. V4 is superseded.
- **Verdict: APPROVED, BUILDABLE.**

## art-ux/m5-combo-tiers.md v0.2 re-check (2026-10-24)
- **Layout:** Collect 48 px with the meter in the freed 24 px row (§3.5, ST-AC26). Rows: 360 → 552–576 = 24 ✓; 1280 → 772–796 = 24 ✓.
- **Pop anchors:** both pops are anchored 8 px above the coop fill meter (R16, §3.3), so they no longer land in the goal strip (ST-AC17 clearance, new ST-AC10b).
- **MAX:** the pulse is removed (ST-AC21), with no loops.
- **Timing:** pill motion ≤ 400 ms with the fade done by 900 ms.
- **Sound:** 1:1 mapping kept.
- The golden and Broody specs carry a one-line note that their tables stand.
- **Verdict: APPROVED, BUILDABLE.**

## HoQA re-review v0.5 closures re-check (2026-10-24 17:08)
- ST-11/BH-p: exact integer arithmetic per the HoE ST-11 ruling. Examples recomputed: 38¢, 50¢, $2.33 (the float gave 232¢), $123.75 and $8.25 hold; the ready-threshold payout is $61.87 (was $61.88).
- ST-12 text fixed (A4, row 11, X4, §8.1 `empty_credited`, `fgMs`); BH-o `docked-compact` enum.
- GE-16 and GE-17 closed with Art's confirmation and ruling; the 3 new viewports are "Art measuring", with the ≥ 2 floor binding.
- X8 recorded as intended (HoP, Market §4.2). Zero-payout rule: no `+$0.00` floater (streak R16/ST-AC17b; Broody R14).
- Verdict unchanged: APPROVED, BUILDABLE. HoE to confirm the §4.1b wording.

## HoE money-math ruling re-check (2026-10-24 17:11)
- All M5 reward money is now integer bp with the BigInt guard: streak §4.1b, Broody R7 in scaled ¢ × bp units, golden §4 #2–#3. New ACs: ST-AC2c, BH-AC3b, GE-AC9b.
- `round_half_up` grep across the 3 specs: 0 hits.
- The remaining `Math.round` calls are the single float → integer steps (bp, refCents, baseCents). The remaining `round(k × base × Π)` is RC1's existing `saleValueCents` (X7), not M5 reward math.
- Verdict unchanged: APPROVED, BUILDABLE.

## v1.2 re-check (2026-10-24 17:19; HoP cross-check v0.2, HoQA v0.6, HoE money-math ruling 2)
- The spec is now **v1.2**: header, status line and a consolidated changelog for the 16:59–17:13 edits.
- Draft CSV cited as sha256 45095351…81b8 (Economy via HoP, 17:18).
- HoQA v0.6 points folded in. The values where the BigInt and `Number` paths disagree were verified in Node.
- Verdict unchanged: APPROVED, BUILDABLE. This review now refers to v1.2.

## v1.3 re-check (2026-10-24 17:22; Art rects 5d9efa6, UI/Visual GE16/17 review (art-ux/reviews/ge16-ge17-5d9efa6.md), D-HOP-2026-10-24-24)
- Draft CSV of record: sha256 8dc90e2b…996b (`sha256sum` on disk matches). No spec relies on a `guard_*` column.
- Golden: GE-16/16b/17 closed with the measured counts; phone = NOT (width ≥ 960 AND landscape).
- Broody: D-COL-2026-10-24-01 (min 1 slot); new BH-AC13b; BH-k closed; BH-n stays open (Art assets).
- Verdict unchanged: APPROVED, BUILDABLE. This review now refers to v1.3.
