# Design-doc review: m5-golden-egg-spec.md v1.0
**Reviewer:** PM, Collection (design-doc-review skill), 2026-10-24 CEST. The game-design, systems, economy and QA lenses were all run adversarially by the reviewer in one pass; no specialist agents were consulted.
**Inputs:**
- the spec;
- `m4-timed-collectible-spec.md` v0.5;
- `art-ux/m4-timed-collectible.md` v1.0 + mocks;
- `engineering/m5.0-sizing.md` §1/§8;
- D-HOP-2026-10-24-04;
- telemetry-spec v0.6.2;
- economy.csv (`tc_*` constants);
- RC1 `5d9efa6` (`payout.ts`, `income.ts`, `format.ts`, `save.ts`, `hidden-time.ts`).

## Completeness: 8/8
| Section | Req. | Present |
|---|---|---|
| Overview | REQUIRED | §1 ✓ |
| Player fantasy | REQUIRED | §2 ✓ |
| Detailed rules | REQUIRED | §3 R1–R26 ✓ |
| Formulas | REQUIRED | §4 with boundary plug-ins ✓ |
| Edge cases | REQUIRED | §6 E1–E19 ✓ (hidden, modal, offline, reload, frenzy, worker asleep, coop empty, autoclicker, formatting) |
| Dependencies | REQUIRED | §7 both directions ✓ |
| Tuning knobs | REQUIRED | §5, each traced to a CSV column or NEW-ROW ✓ |
| Acceptance criteria | REQUIRED | §9 GE-AC1–29b ✓ |
| Telemetry / build size / gap closure | ADVISORY | §8, §10, §12 ✓ |

## Dependency check
- **Art v1.0 spots:** the tables match `art-ux/m4-timed-collectible.md` §2 byte for byte (checked all 24 coordinates). Runtime rule 3 is restated. ✓
- **Asset:** `golden-egg.svg` exists as a file entry, but Art's header says it is "not drawn yet". It's listed as a UI-PR deliverable (§7). Not a spec defect.
- **Hooks:** `saleMultipliers` (`payout.ts:8`) exists and returns `[grader]` ✓. `fmtMoneyExact`/`fmtMoneyShort`/`fmtMoneyAria` exist ✓. `state.rng` is at `state.ts:48` ✓. `evRng` is new (HoE F1a) ✓.
- **Telemetry:** the collectible_* and frenzy_* names are on the §3.1 allowlist ✓.

## Formula plug-ins
- F8: cash = 45 × 9 × 1.40 = $567.00 ✓.
- F30 base: $3,487.50 ✓.
- E = 0 guard ✓.
- Gap range [120, 300), mean 210 ✓.
- All popup amounts on the CSV range are < $1M, so they show full digits (popMoney); the ≥ $1M path is tested by GE-AC25 ✓.

## Value conflicts
| # | Where | Conflict | Resolution |
|---|---|---|---|
| V1 | v0.5 names vs CSV | `tc_p_cash` etc. vs `tc_egg_w_cash` | CSV names canonical (§5) ✓ |
| V2 | Docked breakpoint | QA matrix ≥ 1024 vs Art/layout ≥ 960 | Follows Art (960); Q2 non-blocking ✓ |
| V3 | Popup format | Art copy `+$1.2K!` vs rc1 floaters `fmtMoneyExact` vs C-AC39 full digits < $1M | popMoney rule (R25); Art to confirm width (Q4) |
| V4 | HoE's CSV names vs mine | HoE `tc_first_spawn_s`/`tc_warn_at_s`/`tc_urgent_at_s` | Adopted HoE's names ✓ |

## Required before implementation (blocking), found in pass 1, all fixed
- **B1 Reload/offline countdown was inconsistent with the save plan.** R8 restarted a fresh gap on every reload, while §10 and HoE F2 save `nextSpawnRemainingS`/`frenzyEndAt`. The reset also let a reload shorten the wait. **Fixed:** R8 split (an egg on screen is removed and gets a fresh gap; otherwise the saved countdown resumes); new **R10a** save and sanitising rules; **GE-AC14b**; `frenzy_ended.reason` adds `reload`.
- **B2 The menu set didn't match D-HOP-04 #4.** v0.5/draft R6 excluded the tracks explainer and didn't name onboarding or coach. **Fixed:** R6 lists modals, sheets, explainer, onboarding and coach, tied to the streak freeze. GE-AC19 runs once per menu type.
- **B3 Spawn-spot transforms deviated from Art's final rules.** The draft scaled docked x and offset the 360 table in y. D-HOP-04 #6 makes Art v1.0 final. **Fixed:** R11–R13 restate Art's rules exactly, the expected-centre table was recomputed (1024×474 S5–S8 marked as always dropped), and GE-AC15 requires ≥ 2 valid spots (an Art defect if fewer).
- **B4 RNG isolation unspecified.** Drawing from `state.rng` would shift customer sequences and every pacing seed. **Fixed:** `evRng` in R3, R14 and §3.5; GE-AC3 checks byte-identical customer sequences.
- **B5 M4-AC24 not restated.** **Fixed:** GE-AC29 is against M5-G1 (P95 ≤ 2.0, worst ≤ 2.25, seeds 0–99, F10/F18/F24) with focus and M4-B removed; GE-AC29b carries M4-AC24b.

## Recommended (non-blocking)
- R1: the Frenzy stays wall-clock under menus (R23, HoE F1). D-HOP-04 #4 names only the golden-egg timer and the streak decay, so this is consistent, but a player who opens Settings mid-Frenzy loses Frenzy time. HoP may want to freeze it too (≈ 0.25 dd).
- R2: §4.5's EV assumes ≈ 30 s of production value per Frenzy. Economy M5-G3 should measure it, not assume it.
- R3: GE-AC27's 150 KB budget is inherited from T-AC. HoQA should confirm it with the new `layout` field.

## Disagreements
None open. The reviewer's own lean was a 1024 docked breakpoint; it was set aside in favour of Art (D-HOP-04 #6).

## Nice-to-have
A dev overlay that draws the 8 spots and the live exclusion rects (helps QA with GE-AC15).

## Scope signal
**M** (HoE: 3.75–4.25 dd + 1.5 QA). This is the critical-path framework for the Broody Hen.

## Verdict
- **Pass 1: NEEDS REVISION** (5 blocking).
- **Final, after fixes: APPROVED for build-readiness**, with external gates that the spec can't close: Economy M5-G3 values ([P1-PENDING]) and the M5-G1 pass; Art drawing `golden-egg.svg` and the SFX; HoP sign-off on v1.0; the implementation hold (D-CEO-20261024-04).

## v1.1 delta re-check (2026-10-24 16:21 CEST, D-HOP-2026-10-24-08)
- **Changes re-checked:**
  - Frenzy is now on the active clock and frozen under menus and while hidden (R23/R24, R10a `frenzyRemainingS`, GE-AC10b, GE-AC14b, E3b);
  - docked breakpoint 960 restated; no AC uses 1024 as a breakpoint, and 1024×474 is a test viewport only;
  - the 0.15 dependency removed; open questions closed.
- **New blocking item found and fixed in v1.1:** a frozen Frenzy that still applied ×2 would let a player park a permanent ×2 on worker sales behind an open menu. R23 now suspends the ×2 while frozen, and GE-AC10b asserts 1× sales during the freeze.
- Recommended R1 from pass 1 (Frenzy under menus) is closed by D-HOP-08 #3.
- **Status:** Approved (conditional), D-HOP-08 · **BUILDABLE (HoE §12)**.
- **Verdict v1.1: APPROVED.** Gates unchanged: M5-G3/M5-G1, Art assets, the implementation hold.

## QA-gaps + HoE §9–§10 re-check (2026-10-24 16:27 CEST)
- **QA `qa/m5/testability-gaps.md`:**
  - GE-1–GE-12 are answered in §13: `evRngState`, the pagehide expiry, the countdown restore, the 1.0 s focus-dt clamp, the `golden_enabled` flag, the takeover reason, `interval_s`/`reaction_ms` definitions, and `hidden_end` removed. GE-8's landing date is Economy's.
  - X1–X7 are answered in the new §3.7. The X4 scope and the X5 implementation belong to HoE/HoP; the ability factors to PM Workers.
  - New ACs GE-AC30–34.
- **HoE §9–§10:** timers restated on the **focus clock** (Glossary, R5); offline = hidden-tab or frame gap ≥ 60 s; telemetry tags [T-sub]/[T-full]/[T-req] per §10.1.
- **Flags raised (non-blocking):** C1 term clash with D-HOP-04 #5; C2 I_ref counting hidden-sim sales; A3 the R5e clamp. All three were closed by D-HOP-09 (below).
- No new blocking items. **Verdict: APPROVED** (unchanged).

## D-HOP-2026-10-24-09 re-check (2026-10-24)
- **#1:** the focus clock (`focusClock`) is used everywhere. A grep finds "attended" only in the D-HOP-04 #5 sense (abilities).
- **#2:** C2 is confirmed in X2 and §14.
- **#4:** R5e is accepted, HoE to confirm.
- **#5:** R23 and `frenzyRemainingS` are endorsed.
- **#6:** `golden_spawned`/`golden_collected` are now [T-sub, pending HoE sizing].
- No new blocking items. **Verdict unchanged: APPROVED.**

## D-HOP-2026-10-24-10 + Art v1.1 + HoE re-check (2026-10-24)
- **Spots:** R11–R13 now follow Art v1.1 §2 (scene-anchored phone spots; docked y′ only at vh ≥ 700 and FW ≥ 880; `docked-compact` at 1024×474), referenced rather than copied.
  - GE-AC15 checks the measured counts (8/7/4, 6/5/3, 8/8/7) above the ≥ 2 floor in three engines.
  - New zones: `Full!`, the pill (0 px), the Broody tap box and the toast.
- **Popups:** short money plus the 8 px clamp (R25/R25a, E16, GE-AC25).
- **Taps:** `stopPropagation` (R25b, GE-AC35).
- **HoE:** A2 and A3 are confirmed.
- **I_ref:** golden rewards don't use it, so the warm-up only gets a note in X2.
- Plug-in check: GE-AC25 123,456¢ = $1,234.56 → `+$1.2K!`; 1,234,567¢ = $12,345.67 → `+$12.3K!` ✓.
- No new blocking items. **Verdict unchanged: APPROVED.**

## HoE §12 (BUILDABLE) re-check (2026-10-24)
- **D-C1:** `m4.flags.golden` in R10d, GE-AC34 and §13.
- **D-C2:** seeding from `state.rng` once.
  - Check: GE-AC33 reference = `xorshift32(mixSeed(mixSeed(7) ^ 0x6576526E))` ✓.
- **D-C3:** new R5f and GE-AC31b, reconciled with R5e: R5e caps the timers, and R5f applies the uplift only to the first ⌈focusDt/0.1⌉ ≤ 10 ticks.
- **D-C4:** `evRng` is golden-only.
- **D-C5:** sanitisers.
- Art and SFX remain merge gates, not spec items.
- No `m4.tc.*_enabled` or `state.seed` left. **Verdict: APPROVED, BUILDABLE.**

## D-HOP-2026-10-24-16 + HoE Q4 re-check (2026-10-24)
- **M5-G3 values:** the scratch M5-G3 values equal the spec's (weights 0.45/0.35/0.20, cash 45 s, eggs 60 s, first spawn 45, warn/urgent 20/27). They're retagged [G3-scratch: pending measure:l30plus re-measure].
  - The EV arithmetic (≈ 43 s, ≈ +20%) and GE-AC9/25 are unchanged.
  - `tc_spawn_grace_ms` isn't in the draft (flagged in §11).
- **Q4:** closed. R10a carries HoE's 2 rules; new GE-AC36.
  - GE-AC36 covers tick-0 enables in either order and later Broody toggles.
  - Unasserted case (noted for HoE): broody on first, golden enabled at a later tick vs. golden alone at that tick. `state.rng` has advanced, so `evRngState` is the same only if both runs create it at the same tick. GE-AC36 doesn't assert it.
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

## HoE money-math ruling 2 re-check (2026-10-24 17:13)
- Golden rewards keep sub-cent precision: `baseScaled` (1/100 ¢) and one rounding at payout. E = 9.5, P = $1.35 gives 57,713¢.
- The plug-ins ($567.00, $3,487.50, $4,650.00) are unchanged. GE-AC9b is redone with exact values. The drift flag is removed.
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

### Re-check · 2026-10-24 17:46 CEST · v1.3.2 wording errata (HoQA v0.7; HoP D-HOP-2026-10-24-26 #7)
- Golden v1.3.2 and Broody v1.3.2 are wording only. GE-17/R14 and Broody R4: the Sales Stopped chip sits inside `#goal` (SS v1.3.9 SS-16: 560 px max, centred; narrower at 959×600 (188–748 in 12–923) and 1024×1366 (232–792 in 12–1012)). Clearance still covers it.
- Broody: BH-AC13 adds 1024×1366 portrait; the v1.3 changelog now reads "BH-n closed 17:24"; D-COL-2026-10-24-01 is marked APPROVED by HoP 17:22 (logged 17:23).
- No rule, AC logic or number changed. Verdict unchanged: APPROVED, BUILDABLE. The streak spec is unchanged (v1.3.1).
