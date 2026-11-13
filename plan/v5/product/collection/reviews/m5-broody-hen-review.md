# Design-doc review: m5-broody-hen-spec.md v1.0
**Reviewer:** PM, Collection (design-doc-review skill), 2026-10-24 CEST. The four lenses (game design, systems, economy, QA) were run adversarially by the reviewer; no specialists were consulted.
**Inputs:**
- the spec;
- v2 slice §2.2;
- D-HOP-2026-10-24-04 and HoP (d);
- `engineering/m5.0-sizing.md` §2 item 5 and §8;
- PR #69 CCR review (`engineering/reviews/pr69-c849ccf.md`);
- RC1 `app.ts` yard render, `styles.css:83-86`, `actions.ts` (no fire action), `save.ts`;
- telemetry-spec v0.6.2.

## Completeness: 8/8
Overview ✓ · Fantasy ✓ · Rules R1–R21 ✓ · Formulas with plug-ins ✓ · Edge cases B1–B17 ✓ · Dependencies both ways ✓ · Tunables traced (3 NEW-ROW for M5-G3; unlock is a rule, not a column) ✓ · ACs BH-AC1–21 ✓ · Telemetry, size and gap closure ✓.

## Dependency check
- **#69:** confirmed as PR #69 `fix/yard-hens-from-track` (sprites = min(hens[H], 12), D-HOP-2026-10-24-01), CCR PASS, Art PASS 16:05, awaiting the v2 rebase after #67. The spec gates the flag on it (R2, BH-AC20) ✓.
- **Slot order:** the draw order `[2,3,1,4,0,5,8,9,7,10,6,11]` matches `app.ts` ✓.
- **Unlock permanence:** `workers.coop_hand` presence; rc1 has no fire action ✓.
- **Shared framework:** I_ref (streak spec §4.1), the focus clock and exclusions (golden spec R5/R14) ✓.
- **Art assets:** glow/wobble not delivered (HoE §8.6), routed as a UI-PR blocker ✓.

## Formula plug-ins
- F7: 0.05 × 10.80 × 150 = $81.00 ✓.
- F10: $123.75, ready $61.88 ✓.
- F30: $581.25 ✓.
- After a reload, I_ref = I_ss (steady-state, D-HOP-10 #1): e.g. at F10, $16.50/s → cap $123.75; a stored $70 nest is ready, and a $60 nest is brooding for 2.3 s (R8a). With I_ss = 0, the nest is kept and ready ✓.
- Cap ≥ $1M only at I_ref ≥ $133,334/s ✓.

## Value conflicts
| # | Conflict | Resolution |
|---|---|---|
| V1 | Slice `broody_unlock` (F7–F10 alternative) and HoE's column list vs D-HOP-04 #7 | First-hire event, no column ✓ |
| V2 | Slice "visible-time only" vs HoE's F1(b) clock (now `focusClock`, D-HOP-09) vs HoP (d) "while open" | Same focus clock as the golden egg (visible, no menu, live); hidden or closed never accrues ✓ |
| V3 | HoE save names `broodyNestCents`/`broodyHenIdx` vs HoP's approved `broody_nest_cents`/`broody_hen_idx` | **Superseded by HoE §12 D-C5:** camelCase `broodyNestCents`/`broodyHenIdx` everywhere |

## Required before implementation (blocking), found in pass 1, all fixed
- **B1 Cap collapse after reload.** I_ref restarts at 0 on reload, so a naive `min(nest + inc, cap)` would zero a saved nest and break HoP (d) persistence. **Fixed:** R8 "never lower a stored nest", and the ready condition max(1¢, share × cap); BH-AC7 and BH-AC12.
- **B2 Save sanitising was not measurable** ("clamped per F2 rules"). **Fixed:** R20 gives explicit rules (non-finite or negative → 0, clamp to [0, 1e15], index outside 0–11 → re-pick); BH-AC8 lists the exact expected values.
- **B3 No rule for an ineligible hen position.** The yard can sit under the coop's Collect area, which would make a misclick trap. **Fixed:** R4 sets live-rect eligibility (16 px from Collect, Sell, HUD and so on) and R5 defers while the nest keeps filling; BH-AC13 and BH-AC14.
- **B4 No #69 ship gate.** **Fixed:** R2 and BH-AC20.
- **B5 RNG isolation.** **Fixed:** `evRng` (R4), with byte-identical customers in BH-AC15.

## Recommended (non-blocking)
- R1: a whole-cent floor on payout loses ≤ 1¢ (Q2). That's acceptable.
- R2: Art & UX should verify eligibility at 360×844 with low Hens levels (after #69 fewer sprites can be drawn). If no slot is ever eligible, the feature silently never shows. A telemetry check on `deferred_ms` would catch it.
- R3: whether B2 coop flutter belongs in M5.0 is an Art call; it's kept out of the ACs.

## Disagreements
None.

## Nice-to-have
An optional nest-fill ring under the hen while brooding (Art).

## Scope signal
**S–M on the framework** (HoE: 2.25–2.5 dd + Art 0.5–1 + QA 1).

## Verdict
- **Pass 1: NEEDS REVISION** (5 blocking).
- **Final, after fixes: APPROVED for build-readiness**, with external gates: #69 merged to main; Art broody states, nest sprite and SFX; Economy M5-G3 (0.05 / 150 [P1-PENDING]) and M5-G1; HoP sign-off; the implementation hold.

## v1.1 delta re-check (2026-10-24 16:21 CEST, D-HOP-2026-10-24-08)
- **Changes re-checked:** I_ref confirmed (#1); M5-G1 wording (#4); the 0.15 dependency removed (backlog). Accrual already froze under menus and while hidden, matching #3. No new blocking items.
- **Status:** Approved (conditional), D-HOP-08 · **BUILDABLE (HoE §12)**.
- **Verdict v1.1: APPROVED.** Gates: #69 in main, Art broody assets, M5-G3/M5-G1, the implementation hold.

## QA-gaps + HoE §9–§10 re-check (2026-10-24 16:27 CEST)
- **QA:** BH-a–BH-i answered in §13 (R14a unlock toast, R14b flag, R14c B2 cosmetic, R20a save edge cases, documented telemetry values, BH-AC22–26).
- **HoE:** accrual is stated on the focus clock; I_ref hidden-sim note (C2).
- No new blocking items. **Verdict: APPROVED** (unchanged).

## D-HOP-2026-10-24-09 re-check (2026-10-24)
- **#1:** focus clock in the Glossary, R7 and R21.
- **#2:** the R7 I_ref note is confirmed.
- **#4:** the shared clamp is accepted, HoE to confirm.
- No new blocking items. **Verdict unchanged: APPROVED.**

## D-HOP-2026-10-24-10 + Art v0.1 + HoE re-check (2026-10-24)
- **BH-j:** R7/R8 now use I_ss after a load or offline return.
  - R8 holds: the nest is never lowered, and a reload no longer zeroes the cap.
  - New R8a: ready is sticky within a page session (no new save field).
  - BH-AC7 is restated ($70 ready; $60 → ready after 2.27 s = 187.5¢ / 82.5¢/s ✓), and new BH-AC28 ($8.25 after 10 s ✓; cap at $10/s = $75 ✓).
- **BH-l:** closed; the floor is the single rounding.
- **Art:** she takes over a drawn hen (R3); 16/8/8 px eligibility (R4); no eligible slot → no hen marked, the nest fills and is never lowered (R5); short-money popup plus the 8 px clamp (R14, B12, BH-AC16); BH-AC13 compares against Art's measured slot table.
- **#69 gate:** now includes Minor m1 (R2, BH-AC20).
- **Taps:** `stopPropagation` (R12, BH-AC27).
- No new blocking items. **Verdict unchanged: APPROVED.**

## HoE §12 (BUILDABLE) re-check (2026-10-24)
- **D-C1:** `m4.flags.broody`.
- **D-C4:** `brRng` (R4, BH-AC15, which now also checks the golden sequence is unchanged).
- **D-C5:** camelCase fields everywhere, with sanitisers.
- **D-C6:** B6b and BH-AC29.
- **Non-blocking Q4 to HoE:** with golden off and Broody on there's no `evRngState`. PM reads it as "derive on the first tick with either flag on".
- **Verdict: APPROVED, BUILDABLE.**

## D-HOP-2026-10-24-16 + HoE Q4 re-check (2026-10-24)
- **M5-G3 values:** the scratch M5-G3 values equal the spec's (0.05 / 150 / 0.5). Cap $123.75 at F10 and the other plug-ins are unchanged.
- **New draft columns:** `tc_broody_unlock_worker` 2 and `tc_broody_max_on_screen` 1, both pinned by validation. V1's "no column" is superseded.
- **Q4:** closed in R4.
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

### Re-check · 2026-10-24 17:46 CEST · v1.3.2 wording errata (HoQA v0.7; HoP D-HOP-2026-10-24-26 #7)
- Golden v1.3.2 and Broody v1.3.2 are wording only. GE-17/R14 and Broody R4: the Sales Stopped chip sits inside `#goal` (SS v1.3.9 SS-16: 560 px max, centred; narrower at 959×600 (188–748 in 12–923) and 1024×1366 (232–792 in 12–1012)). Clearance still covers it.
- Broody: BH-AC13 adds 1024×1366 portrait; the v1.3 changelog now reads "BH-n closed 17:24"; D-COL-2026-10-24-01 is marked APPROVED by HoP 17:22 (logged 17:23).
- No rule, AC logic or number changed. Verdict unchanged: APPROVED, BUILDABLE. The streak spec is unchanged (v1.3.1).
