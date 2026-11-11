# HoQA re-review: Workers M5 spec freeze candidate (TASK HoQA/FREEZE-RR1)
2026-10-30 14:05 CET (Europe/Belgrade) · Head of QA · QA-D-1030-FREEZE-RR1 · paper only. Spec text is reviewed as data.
Request: PMW (D-PMW-2026-10-30-20, then -21 and -22) asks HoQA to re-review the bumped files. If accepted, PMW declares the Workers M5 spec freeze and QA pins once (QA-D-1030-PINFREEZE).

## 0. Verdict
| File | Version / sha1 (verified with sha1sum, 14:04 CET) | Verdict |
|---|---|---|
| failure-cost | v0.3.23 `8c03eb07d1476697e8bfd63bcf0cd4aa221ab4c4` | **ACCEPT-WITH-NOTES** (FZ-1 is Major. Fix it with a dated errata note before CW case authoring. It doesn't block the pin.) |
| lighter refill | v0.8.12 `064c412ddd0686035429569fbcd6da91247c3ddf` | **ACCEPT-WITH-NOTES** (stale citation only; the fields match rev 7/8) |
| abilities | v1.3.9 `133adb210903f3af90ea213d6dd1a53c54dc475d` | **ACCEPT-WITH-NOTES** (G-14 met; FZ-4 key naming is Major, owned by PMW + Econ + HoE, and must be settled before the Econ CSV PR) |
| rc2 Refill | v1.3.14 `944ca78e9d46e599a9dd4d01cc2b43bb9030ec4b` | **ACCEPT** (M-1 closed) |
| pause / nudge / save shapes | v1.3.14 `74a0122a…` / v0.1.1 `2786a08f…` / v1.0.2 `34123ece…` | unchanged, verified |

**Overall: ACCEPT-WITH-NOTES.** PMW may declare the Workers M5 spec freeze on exactly the set above. Then QA pins once.
- The original claim (FC v0.3.22 `dea537fc`, abilities v1.3.8 `113dcbc5`, rc2 v1.3.13 `1779312a`) was superseded within 3 minutes and must not be pinned.
- After the freeze, FZ-1, FZ-2, FZ-3 and FZ-5 can land as dated errata notes with no AC change (the same rule as PM Market's v1.3.27).
- FZ-4 (combo key names) is a data/manifest question. It does not change spec ACs, but it must be settled before the Econ CSV PR (Sat 31 Oct 16:00 CET).

## 1. Verified sha table (QA sha1sum on disk)
| Item | Claimed | On disk | Note |
|---|---|---|---|
| failure-cost live | dea537fc (v0.3.22) | **8c03eb07** (v0.3.23, 13:59) | dea537fc is frozen as `workers/…dea537fc.md` (verified). Superseded by D-PMW-22. |
| lighter refill live | 064c412d | 064c412d ✔ | frozen copy `.064c412d.md` |
| abilities live | 113dcbc5 (v1.3.8) | **133adb21** (v1.3.9, 13:59) | 113dcbc5 is frozen as `.113dcbc5.md` (verified). Superseded by D-PMW-22. |
| rc2 live | 1779312a (v1.3.13) | **944ca78e** (v1.3.14, 13:58) | 1779312a is frozen (verified). D-PMW-21. |
| pause | 74a0122a | 74a0122a ✔ | |
| nudge | 2786a08f | 2786a08f ✔ | |
| save shapes | 34123ece | 34123ece ✔ | |
| Art abilities flows | 3d238b6b | 3d238b6b ✔ `art-ux/m5-abilities-flows.md` | Signed per art-ux/decisions.md L560 (13:58 CET): "replaces eb2b3b7d as signed", copy errata only, exact names unchanged. |
| Art fatigue UX | ffb13c19 | ffb13c19 ✔ `art-ux/m4.2-fatigue-visibility-ux.md` | |
| errata v5 | rev 7 fd7d5921 | live is now **rev 8 `b989e3cd`** (14:02, PMC) | Row 5 and row 10 field and type cells are identical rev 5→8 (only the source-ref column was re-pointed in rev 8). Rev 7 is frozen as `.fd7d5921.md`. |
| m5-gate-acs.md | 1d68e515 | 1d68e515 at 14:00 (sha256 a40a44b2…); **live now 53c0b5c2** (sha256 450e88f7…, 14:03) | See §6. |
| v5-ship-set.md | — | sha256 3fdd98ab… ✔ | bestBuyV2 = 1 |

## 2. failure-cost v0.3.23 (diff vs v0.3.21 f961a734, via v0.3.22 dea537fc)
- **F-A1 folded ✔.** L106 (evidence line and **Check**) and L163 (AC-FC20) now read "no countdown (m:ss) digit in any state". The 0-charge and Refill/Unpaid names match no `/\d/`. Rested's static "50%" is allowed. Old text is struck in place.
- **Toasts ✔ against Art.** L52 table and AC-FC9 L104: `Hawker fell asleep: sales slowed. Tap Refill.` and `Egg Grader fell asleep: bonus down to {pct}%. Tap Refill.` are byte-identical to art-ux/decisions.md L560 and fatigue UX ffb13c19 §4 L107.
- MH/CH strings are unchanged. No Unpaid variant (correct: neither role pays a wage, rc1-asleep L81). Announced aria polite with the same text. The ≤ 2-line rule applies.
- §6 note: `ability_used` has `combo` and no window-remaining field ✔.
- **FZ-1 (Major, doc, fix before CW authoring): toast cadence and flag for Hawker/Grader.**
  - AC-FC9 L104 now says the Hawker/Grader toasts follow the "same one-toast-per-onset" rule, i.e. one toast every Asleep onset.
  - The fatigue spec (`m4.2-fatigue-visibility-spec.md` L29) and Art fatigue UX §4 ("First-Asleep toast (rule 5, once per save)") define this same string as a **once-per-save** toast.
  - For MH/CH, FC says its toast is "coalesced with the existing asleep toast". For Hawker/Grader, FC now adopts the fatigue-UX string under a per-onset cadence.
  - The spec doesn't say:
    - (a) which cadence wins for Hawker/Grader: per onset, or once per save;
    - (b) whether the per-onset Hawker/Grader toast is gated on `m4.flags.clockWage` (card #10) like the MH/CH wage toast, or on fatigueCue;
    - (c) what fires with clockWage = 0.
  - Ask: add one errata sentence giving the precedence and the flag.
- **FZ-2 (Minor):** `{pct}` is "from data, 15" but the data key isn't named. Name the balance/CSV key (the Grader asleep bonus share), so the case reads it instead of hard-coding 15.

## 3. lighter refill v0.8.12 (diff vs v0.8.11 fa074d29)
- **F-B1 ✔.** `grep manage_used` finds only the struck old text and the "no manage_used alias" sentence (L62), plus the header and changelog (L2, L108). There is no live alias.
- **F-B2: fields ✔, citation stale.** The §6 L62 field list is identical to errata row 5: `worker, energy_pct, charges_left, rank_by_risk, by, sheet_id|null, entry_point (nav|card|stall_chip|fatigue_chip|auto), stall_id?, refillable_n, best_worker, lowest_worker`, with code-id worker values.
  - Row 5's field and type cells hash the same in rev 5 cea3d717, rev 6 83424120, rev 7 fd7d5921 and rev 8 b989e3cd (rev 8 only re-pointed the source column to "lighter v0.8.12 §6 L62").
- **FZ-3 (Minor, non-blocking):** L2, L62 and L109 cite rev 5 cea3d717, which is superseded. Re-cite them to rev 7 fd7d5921 (or the rev of record in the manifest). It's not blocking, because the fields don't differ.

## 4. abilities v1.3.9 (diff v1.3.7 314dc0e3 → v1.3.8 113dcbc5 → v1.3.9 133adb21)
- **113dcbc5 → 133adb21 is copy only ✔.** There are three hunks:
  - the header plus a new v1.3.9 line (L2–4);
  - the SG-4 note (L302);
  - the §5.6 Combo row describedby (L324): `Combo: 45-second…` → `Combo, 45-second boost: {effect} Starts when the sheet closes.`
  - §9 and AC-M5A-24 are untouched (+2-line offset only), so G-14 carries over.
- **G-14 vs errata rev 7 row #10 ✔ (the condition is met).** Line refs below are verified in 113dcbc5, with the v1.3.9 line in brackets:
  - rule 11 Window L159 [L161]: Shift-sheet Boost only; **manual** refill only; sim ms inclusive, ≤ 10000 ms in, > 10000 ms out (10000 = combo, 10001 = no combo, 10050 out); auto never opens the window.
  - rule 11 Telemetry L162 [L164]: `combo:true|false` on every emit; card call (`in_sheet:false`) is always `combo:false`; no window-remaining field.
  - §9 L435–437 [L437–439]: the field list `worker, farm, energy_pct, mood, via_all, t_since_ready_s, in_sheet, combo` matches row #10. The determinism pins match: in_sheet false/true; `refill_used.by` manual|auto with only manual opening the window; no window field.
  - AC-M5A-24 L584–586 [L586–588]: telemetry bullet, negative case (a) (manual refill + card Boost → 30.0 ±0.5 s, `{in_sheet:false, combo:false}`), negative case (b) (auto refill + sheet Boost → 30.0 ±0.5 s, `{in_sheet:true, combo:false}`). Boundary bullet L580: 10000 → 45 s `combo:true`; 10001 → 30 s; 10050 → 30 s.
  - "every emit" (spec) vs "always present when abilities = 1" (rev 7 N-8): equivalent, because `ability_used` only fires with abilities = 1 (row #10 flag column "abilities").
- **D-HOP-42 ✔:** Ready `Boost, {Call}, {Role}` replaces `{Call}, {Role}`; capital-C `Combo`; exact-name checks are case-sensitive (L589).
- **§5.6 mirror ✔ (L322–330 vs Art 3d238b6b §16.3 L240–250).** All 8 states, visible text, look, exact names and describedby are identical:
  - Ready `Boost, {Call}, {Role}`;
  - Combo `{Call}, Combo, {Role}`;
  - Paused `Paused, {Call}, {Role}`, with describedby `{Call} is blocked while {Role} is on a break.`;
  - combo describedby `Combo, 45-second boost: …` (Art adds only its own errata note in the cell).
  - `Paused, {Role}` is removed (SG-9 closed). E5 now has Rest = `paused:true` + `restAuto` at rc2Refill = 1, with `ability_blocked{reason:"paused"}`.
- **Durations ✔:** combo 45 focus s from `sheetCloseComplete`, else `tc_ability_s` 30 (L162, L333, L580).
- **SG-3 ✔** per D-PMW-18 (L161, L331, L580). **SG-5 ✔:** cap 50 + one `{capped:true}` with key `events`; `session_end.ability_blocked_taps` (§9 L440, L443, AC-M5A-20 L550). **SG-6 ✔:** Inspect +0.5 is the base `tc_ability_w4_tier_add`, not mood-scaled, D-HOE-20261030-25 (L299). **SG-4 closed** with exact copy (Art 3d238b6b).
- **FZ-4 (Major, data naming, owner PMW + Econ + HoE, before the Econ CSV PR Sat 31 Oct 16:00):** the combo tunables have three names in the record.
  - Spec §7 L358–359: `combo_window_s`, `combo_boost_duration_s` ("key of record").
  - Studio `product/economy.csv` header cols 112–113: `combo_window_s`, **`combo_boost_s`**. rc2 L111 also says `combo_boost_s`.
  - D-HOE-20261030-26 amendment: "no tc_combo_* keys" in a8c4e268.
  - The UI harness fixture (P30) reads `m4.tc.combo_window_s` / `m4.tc.combo_boost_duration_s`.
  - The spec names no balance.json path. Ask: one CSV column name and one balance.json path for each key, written in spec §7 and in the CSV PR.
  - QA timing rows N11/N13/N17/N18 stay BLOCKED (never defaulted) until an RC balance.json has both keys (SG-7).
- **FZ-5 (Minor):** the v1.3.9 header (L3) says "every eb2b3b7d cite below reads as 3d238b6b", but 13 in-place `eb2b3b7d` cites remain (L5, L7, L294, L316, L318, L320, L332, L333, L403, L589). §9 L438 and AC-M5A-24 L586 still cite errata **rev 6 83424120** for row #10 and quote rev 6's "every emit" wording. Re-cite them to rev 7 fd7d5921 (rows identical in meaning). It's not blocking.
- **Info:** there's no "v1.3.9 review delta" line at the end (L794 is the last delta, v1.3.8). The §5.6 Combo row label "(≤ 10.0 s since this worker's Refill tap)" is Art's text. The PMW note at L331 makes it manual and sim-ms, so it's fine.

## 5. rc2 v1.3.14 (diff vs v1.3.13 1779312a)
- The diff is the L1 header plus L216 only ✔. `stall_id` is now a "**per-session monotonic int counter ≥ 1** (D-HOE-20261030-24; PMC errata rev 7 fd7d5921; never a reused slot number…)". The type, range, flags and numbers are unchanged. **TELERR4 M-1 closed.**
- **M-2 closed** by D-HOE-20261030-28 (14:00 CET): at breeds = 0 the sim never reads, sanitises or writes the breeds key and emits no `breeds_sanitise` or breeds `save_migrated`. The key is kept verbatim (as in E13). The single `save_migrated{migration:"breeds_sanitise", reason, backup_stores:[]}` comes only on the first flag-on load or tick. Owner: Saves, #95 follow-up, with a flag-off test.

## 6. Gate file product/m5-gate-acs.md (read-only)
- My 32d0b335 was the sha1 PM Market claimed at 13:53 (card #T SS-G43). No copy of it exists on disk.
- 1d68e515 (PMW 13:54, D-PMW-19 C) is that content plus L315 (card #6a → rc2 v1.3.13) and L437 (card #7 gap 7 → 10000/10001 ms).
- D-PMW-19 says "pre 2ab14495", but the diff 2ab14495 → 1d68e515 also contains all of PM Market's SS-G43 card #T edits (L617–807). So the real base was 32d0b335, and **no update was lost**.
- Live is now 53c0b5c2 (14:03): PMC/PMFU added zero-gain errata rev 2 (L226), BBv2 in v5 (L243) and card #12 BBv2 (L1010–1048). The frozen pre-copy is `scratch/m5-gate-acs.pre-col24.ce79b5b6.md`.
- **Spec pins on the cards, now stale** (PMW-owned; PMW re-pins at the freeze): L315 rc2 v1.3.13 1779312a → v1.3.14 944ca78e; L364 LR v0.8.11 fa074d29 → v0.8.12 064c412d; L407 abilities v1.3.7 314dc0e3 → v1.3.9 133adb21 (and Art flows 3d238b6b); L446 FC v0.3.21 f961a734 → v0.3.23 8c03eb07.
- **QA-owned lines still citing 6173f757 / manage_used / Art pending** (live 53c0b5c2 line numbers; HoQA edits them by asserting read-modify-write after PMW declares the freeze):
  - **L359** card #6a Cases: U6 "AC10 (4 events pinned; `manage_used` alias)" → "AC10 (4 events pinned; `refill_used` only, no `manage_used` alias, D-HOE-19 G-4)".
  - **L360** card #6a Engines/owner: "Art `m5-refill-flows` v1.0 `6173f757` (… not signed …)" → "Art signed m5-refill-flows v1.0.1 43828d0b". Drop the "re-checks if the final sign changes it" clause.
  - **L361** card #6a Gate-ready: "Art flow v1.0 `6173f757` not yet signed" → remove it (signed 43828d0b, 13:32 CET). Cite spec rc2 v1.3.14 944ca78e and the re-pinned plan sha. Keep the build/AC7/flag-on blockers.
  - **L480** card #10 Cases: "per Art `m5-refill-flows` v1.0 `6173f757`, sign final after PMW AC-RF2 errata" → "per Art signed m5-refill-flows v1.0.1 43828d0b". Add the Hawker/Grader toast cases (FC v0.3.23 AC-FC9) after FZ-1.
  - **L481** card #10 Engines/owner: "Art `m5-refill-flows` v1.0 `6173f757` (not yet signed…)" → "v1.0.1 43828d0b (signed)".
  - **L482** card #10 Gate-ready: "AC10/AC11 depend on rc2Refill and its Art flow v1.0 `6173f757` (sign final…)" → "…its Art flow v1.0.1 43828d0b (signed)". Spec FC v0.3.23 8c03eb07.
  - **L557** card #5b Cases (QA line, Market card): "Art `m5-refill-flows` v1.0 `6173f757` §5 L89" → the same section in v1.0.1 43828d0b (re-verify the line ref). Coordinate with PM Market under the SS freeze (errata note only).
- Not QA-owned (list only):
  - L452 (card #10 history line, already "superseded");
  - L628, L717, L805 (card #T "no manage_used" statements; correct as is);
  - **L632** card #T ship state cites `v5-ship-set.md` sha256 `56090a61…` and "`bestBuyV2` = 0 (L19)". Live ship-set is sha256 **3fdd98ab** with bestBuyV2 = 1 (D-CEO-20261030-11 (3), D-HOP-47). PM Market should re-pin.
- No line contains the literal "Art pending".

## 7. Abilities plan re-pin change list (qa/m5/test-plan-abilities.md v0.9.1, sha256 be86153b → v0.10 at the freeze)
1. **Header:** spec under test → v1.3.9 `133adb21`; Art flows → signed 3d238b6b (was eb2b3b7d); errata → the rev of record in the manifest (rev 7 fd7d5921 / rev 8 b989e3cd; row 5 and row 10 fields identical). Strike "v1.3.8 pending sha" everywhere.
2. **N10:** add `combo:bool` to the `ability_used` field list. The schema diff vs v1.3.4 becomes "+`combo`", not "none".
3. **N11:** balance paths per the FZ-4 outcome. Interim: `m4.tc.combo_window_s` / `m4.tc.combo_boost_duration_s` (UI fixture P30), plus `tc_ability_s` / `tc_ability_cd_s`. A missing key means BLOCKED. Add `combo:false` to legs (b) and (c).
4. **N12:** resting name `Paused, {Role}` → **`Paused, {Call}, {Role}`**, with describedby `{Call} is blocked while {Role} is on a break.` Add the combo describedby (item 7). All 8 states as in spec §5.6 L322–330.
5. **N13:** retitle to "combo boundary 10000 / 10001 / 10050 ms". Graded:
   - Δ = 10000 ms → IN (45.0 ±0.5, `combo:true`);
   - **Δ = 10001 ms → OUT** (30.0 ±0.5, `combo:false`);
   - 10050 ms → OUT;
   - 9900 ms → IN;
   - 10100 ms → OUT (diagnostic).
   - The chip label is `Combo` through 10000 ms and `Boost` from 10001 ms, with a 0 px shift.
6. **N14:** gate on **`Paused, {Call}, {Role}`** (spec = Art, SG-9 closed). Drop the "records both" dual reading. Keep `ability_blocked{reason:"paused"}`, the 0 close requests and Rest-in-window → `Paused` → `Combo`.
7. **N15 (unblocked):** describedby exactly **`Combo, 45-second boost: {effect} Starts when the sheet closes.`** (comma after Combo, Art 3d238b6b, abilities L302/L324; 45 from data). Expiry at Δ ≥ 10001 ms → `Boost, {Call}, {Role}` and the 30-second describedby.
8. **N16:** replace "instrumented hook" with D-HOE-20261030-27:
   - Listen on `document` for CustomEvent **`egg:sheetclosecomplete`**, detail `{id: string, docked: boolean}`. Assert exactly 1 per close (Boost tap, close button, scrim/Esc, and a double tap during the close) at 360×640, 390×844, 1280×800 docked and 1024×1366, dispatched after the close animation ends.
   - A second `closeComplete()` on a closed sheet dispatches nothing.
   - Also **`egg:sheetopened`** with the same detail, once per open.
   - No window globals.
   - The Boost call starts on that event (remaining = full until it fires, ≤ 1 frame after). `ability_used{in_sheet:true}` ×1.
   - Owner UI e80556fd after #86. Timing stays BLOCKED-ON-BUILD #86.
9. **N17:** clear the dependency (`refill_used.by` is pinned: v1.3.9 §9 L439, errata row 5). Δ = 0 / 5000 / 10000 ms. The negative case is now spec AC (b) (L588): `{in_sheet:true, combo:false}`.
10. **N18:** clear the dependency. This is spec AC negative case (a) (L587). Δ = 2000 and 10000 ms → `{in_sheet:false, combo:false}`.
11. **SG table:** close SG-4 (exact copy 3d238b6b), SG-8 (`combo` in v1.3.8/9 and errata rev 6+) and SG-9. SG-7 stays open (FZ-4 + Econ CSV PR). SG-1/2/3/5/6 are closed (already ruled; confirm the text cites v1.3.9 line numbers: SG-5 L440/L443/L550, SG-6 L299).
12. **Gate estimate:** no new cases (N13 legs re-labelled, not added), so I expect no hours change. Recheck with UI QA lane B timing as already planned.

## 8. Opens after freeze
- FZ-1 (PMW + Art: toast cadence and flag);
- FZ-2/FZ-3/FZ-5 (PMW cites);
- FZ-4 (PMW + Econ + HoE: combo key names and paths before the CSV PR);
- gate-card spec re-pins (PMW L315/L364/L407/L446; PM Market L632);
- HoQA gate lines (§6);
- plan v0.10 (§7).
