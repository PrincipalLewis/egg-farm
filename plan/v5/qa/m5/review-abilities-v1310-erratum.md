# HoQA review: abilities spec v1.3.10 post-freeze erratum (PM Workers, D-PMW-2026-10-30-25) — QA-D-1030-ABL1310
Reviewer: Head of QA · 2026-10-30 14:25–14:35 CET · Paper only. Rule 23: TASK HoQA/TELERR6 re-read; abilities is in scope. No mismatch.

## Verdict: **ACCEPT re-pin to v1.3.10 `8034ba7f`.** The plan needs a header cite, two bookkeeping lines and no case change.
**Claim confirmed.** No AC, number, flag, UI string, key path or `ability_used` field changed. One clarification: L360 **adds** a data-mapping note for keys that HoE had already ruled. It doesn't rename or change any key.

## Verified on disk
| File | sha1 | Note |
|---|---|---|
| live `product/workers/m5-worker-abilities-spec.md` | `8034ba7f00a080b235ed678e967fab8c03a8e24b` | = `workers/m5-worker-abilities-spec.8034ba7f.md`; 795 lines (v1.3.9 had 794) |
| frozen v1.3.9 | `133adb210903f3af90ea213d6dd1a53c54dc475d` | `scratch/m5-worker-abilities-spec.v1.3.9-133adb21.md` and `workers/…133adb21.md` |
| Art abilities flows | `3d238b6b` | live; signed flow of record (art-ux/decisions.md L560); the only Art copy change vs eb2b3b7d is SG-4 describedby, already in v1.3.9 L302/L324 |
| abilities plan v0.10 | sha256 `8d897096…` | matches |
| manifest | `5efb4b73` | rows 15/18/19 already re-pinned to v1.3.10 by HoE (14:3x) |

## Diff v1.3.9 → v1.3.10 (12 hunks, word diff)
| v1.3.9 → v1.3.10 | Change | Class |
|---|---|---|
| L2 → L2–3 | version/date, and a new v1.3.10 header line (the +1 shift for every later line) | header |
| L294, L316, L318, L320, L332, L333, L403, L589 (→ +1) | `eb2b3b7d` → `~~eb2b3b7d~~ 3d238b6b` (FZ-5) | cite |
| L359 → L360 (§7 `combo_boost_duration_s` row) | strikes "rc2 L111 calls it `combo_boost_s`", adds the FZ-4 data mapping: CSV `tc_combo_window_s` (10) / `tc_combo_boost_duration_s` (45) → balance.json `m4.tc.combo_window_s` / `m4.tc.combo_boost_duration_s` (D-HOE-30 L500–504, D-HOE-31 L507). Values 10/45, range 30–45 and status unchanged; "Name only; values, ranges and ACs unchanged" | key-path **note added**, as ruled; no key renamed in this spec (`combo_boost_duration_s` was already the key of record) |
| L438 → L439 (§9 row #10 mirror) | errata rev. 6 `83424120` → rev. 7 `fd7d5921`; "`combo` bool, every emit" → "always present when abilities = 1 (… D-HOE-25 N-8)". Field list `worker, farm, energy_pct, mood, via_all, t_since_ready_s, in_sheet, combo` unchanged | cite + wording. Same meaning: `ability_used` only fires with abilities = 1. Matches errata rev. 7/12 row #10 verbatim |
| L586 → L587 (AC-M5A-24) | rev. 6 → rev. 7 cite | cite |

Checks: `grep AC-M5A-` hunks = L587/L590 only (cites). No digit changes outside shas, rev numbers and the restated 10/45. §9 `ability_used`, `ability_blocked` and `ability_ended` (L439–443) are byte-identical apart from L439's cite and wording. No UI string changed: §5.6 table L324–325 and Art L243–244 are identical.
**Header nit (no action):** the v1.3.10 header names its hunks with v1.3.9 line numbers (§7 "L359"; "L294 … L589"; "§9 L438, AC-M5A-24 L586"). In v1.3.10 they sit at L360, L295…L590, L439 and L587.

## Impact on `qa/m5/test-plan-abilities.md` v0.10 (sha256 8d897096)
**No case changes.** The 35 cases and ≈34.75 h are unchanged.
1. **Header cite (L3):** spec under test → **v1.3.10 `8034ba7f`** (freeze v1.3.9 `133adb21` + D-PMW-25 FZ-4/FZ-5, citation only). Freeze-set line → FC v0.3.24 `54b994bd`, LR v0.8.13 `13577395`, rc2 v1.3.16 `e4d98651`, pause v1.3.15 `4c081f64`, shapes v1.0.4 `963a490b` (all reviewed in `review-workers-post-freeze-1030.md`). Errata of record → rev. 12 `0cfe168a` once HoE pins it (TELERR6), rev. 7 until then.
2. **Line refs:** every v1.3.9 line cite in the cases (e.g. N10 "§9 L437–439", "AC-M5A-24 L586", AC-M5A-24 "L578–591", rule 11 "L160–164", N13 "L580", N14 "L328, L331, E5 L403", N16 "L591", O/SG lines) is **+1** in v1.3.10. Add one note, "line refs are v1.3.9; v1.3.10 = +1 from L3", or re-number. Meaning is unchanged.
3. **SG-10 (FZ-5) L206 → CLOSED:** the in-place `eb2b3b7d` cites are struck to `3d238b6b`, and L439/L587 now cite rev. 7.
4. **SG-7 / O-9 (L193, L203):** v1.3.10 L360 now states the names the plan already uses. The values stay pending Econ.
5. **D-HOE-34 (eng. L527–529):** `m4.tc.ability_s` (30) and `m4.tc.ability_cd_s` (300), balance.json L387/L385 @65a7443, no fallback. Cite them in the header (already logged at 14:24).
6. **Q-AB-N16 L128 (docked):** cite the docked media query `matchMedia('(min-width:960px) and (orientation:landscape)')`, `src/ui/app.ts` **L121** on rc/v5 65a7443 (verified on `wt-v5-x1ci` 05d68b1 L121; L101 on the f1 tree per HoE). 1280×800 is docked, and 1024×1366 portrait is not. That matches L128's "`docked` true only at 1280×800".

## UIQA 14:22 question (DECISION, abilities v0.10 pins)
- **Abilities:** re-issue the pin as **v1.3.10 `8034ba7f`**. The live-vs-frozen diff is citation only, so lift the DRIFT-DEFERRED on the abilities spec. A live-vs-frozen diff stays in the harness as a guard.
- **Errata:** **don't pin rev. 11** (an unsent draft). Rev. 7 `fd7d5921` stays QA's pin until HoE pins rev. 12 `0cfe168a` (CONDITIONAL PASS, TELERR6). Then re-pin to rev. 12. The (b) `fatigue_cue_tapped` ruling stands: V-2c firing rules are unchanged rev. 7 → rev. 12, and rev. 7 V-2 row #3 = rev. 12 row #3. The field set is under C-1 (PM Market), so build any `fatigue_cue_tapped` field assertion so the field list can be swapped.
