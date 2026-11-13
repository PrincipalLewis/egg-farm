# HoQA review: telemetry-spec errata v5, rev. 12 (PM Collection) — QA-D-1030-TELERR6
Reviewer: Head of QA · 2026-10-30 14:24–14:35 CET · Paper only; doc content treated as data. Rule 23: TASK HoQA/TELERR6 re-read (scope updated by the parent 14:24 from rev 11 to rev 12; write scope = this file, `review-abilities-v1310-erratum.md`, `review-workers-post-freeze-1030.md`, one line in qa/decisions.md). No mismatch.
Baseline: rev. 7 `fd7d5921` (pin of record, manifest `5efb4b73` L117), rev. 9 `49b76d62` (REJECTED, TELERR5, review sha256 `1cf895d4`), rev. 10 `fd3416ec` and rev. 11 `91285d2f` (unsent drafts, read for the diff).

## Verdict: **CONDITIONAL PASS. HoE may pin rev. 12 `0cfe168a` now**, replacing rev. 7.
All five TELERR5 "rev. 10 must" items are closed on disk: B-1, B-2, M-1, M-2, G-17 and the re-cites. One **new** finding, **C-1 (`fatigue_cue_tapped` field set, row #3)**, is my own miss: it has been in every rev since rev. 1, including the pinned rev. 7. Pinning rev. 12 doesn't make it worse, and rev. 12 is better than rev. 7 on every other point. So C-1 is a condition on schema.ts, not on the pin:
- **C-1 (must land before Saves merges `src/telemetry/schema.ts`, G-8; likely Fri 21:00, high Sat 03:00):** PM Market rules the `fatigue_cue_tapped` field set. Then either PMC publishes rev. 13, a one-row change to row #3, or PM Market issues an SS erratum. Saves' schema follows the ruling.
- **C-2 (non-blocking, rev. 13 or the next rev):** the minors below.
- Before HoE pins, PMC freezes rev. 12 as `telemetry-spec-errata-v5.0cfe168a.md` (it's missing on disk; every earlier rev was frozen).

## Verified on disk (14:24–14:33 CET)
| File | Cited | On disk | Note |
|---|---|---|---|
| errata live | rev. 12 `0cfe168a` | `0cfe168a0cb20c21a734b7ca15fe499be97626b6` (sha256 `56aca13d…`), 224 lines, mtime 14:22 | OK. **No frozen `.0cfe168a.md` copy** |
| rev. 11 / rev. 10 / rev. 9 / rev. 7 frozen | 91285d2f / fd3416ec / 49b76d62 / fd7d5921 | all match | OK |
| eng. decisions | `591b6aa3` (D-HOE-33 L519) | live **`95dd1e34`** (14:3x, + D-HOE-34 L527 only; L1–L526 unchanged); D-HOE-32 L511–515, D-HOE-33 L519–520 read verbatim | append-only drift, citation only |
| gate | `344a9039`, BBV2-AC16 L1049 | live **`25e1d859`** (PMW re-pin L262/L315 only, 14:26); AC16 still L1049 | drift, citation only |
| manifest | `2557efa4`, rev. 7 pin L117 | live **`5efb4b73`** (14:3x PMW re-pins appended); L117 still rev. 7 | drift, citation only |
| ship-set | sha256 `d71ed8cf` | `d71ed8cf7a5d2e71…`; L23 telemetry text unchanged | OK |
| harness `m5mr.ts` | `1dde40a7` L106–112/L143 | match; L107 integer-second sample, L108 `inR` = 10 ≤ farm < `maxLevel` (30, balance.json L92), L110–112 `mrAff`/`mrStart`/`mrLongest`/`mrByF`, L143 open stretch closed at T | OK |
| rc2 / pause | v1.3.15 `40a1f0b0` / v1.3.14 `74a0122a` | **live rc2 v1.3.16 `e4d98651`, pause v1.3.15 `4c081f64`** (D-PMW-26, 14:26). The B-2 text matches row #6/#113 exactly (see the Workers review) | B-2c satisfied; re-cite in rev. 13 |
| abilities / LR / FC / fatigue | 8034ba7f / 13577395 / 54b994bd / e160a0d3 | match (fatigue is now **v0.2.5 `7e120786`**, L98/L99 copy; errata cites only L47–50, unchanged) | citation only for every row the errata cites |
| SS | `89dadb43` | match | OK |

## Diffs
- **rev. 11 → rev. 12** (word diff, 16 hunks): header/status (L1–L8); Sources rows L18 (fatigue), L19, L21, L22, L24, L33, L34 and L36; cites in L54, L64 and L68–71 (abilities line refs +1); row #6 L65 (B-2b closed per D-HOE-33); L113, L124 (abilities L444); V-8 L188–189 (B-2b removed, B-2c non-blocking, M-3 gate re-cite); L192 closed-in-rev-12 line; L223–224 changelog. **No event, field, type, pin or count change other than `rest_toggled.state` text.** Clean.
- **rev. 9 → rev. 12:** same as rev. 9 → rev. 11 (read in full at 14:2x) plus the above. Changes are limited to B-1 (row #22, V-2d L94–109), B-2 (rows #6/#10, L113), M-1/M-2 (rows #19–21 pin notes, L124 `session_end.zero_gain_purchase_dropped`, V-3 L154–155, V-8 G-8 L186), G-17 (L86–92) and re-cites. Rows #1–5, #7–9, #11–18 and #23 change only in cites. V-0, V-1, V-2b (except L124), V-2c, V-4, V-5, V-6 and V-7 are unchanged. **Nothing out of scope.**
- **Counts (V-3 L142–160 unchanged since rev. 9):** 23 new types; pin column #1–15, #18, #21, #22 = 18 pinned; #16, #17, #19, #20, #23 = 5 ring; `isPinned` list 18 new + `worker_paused`, `milestone_reached`, `balanced_tier` = 21. **Consistent** with the table and L154.

## TELERR5 items
| Item | Rev. 12 | Verdict |
|---|---|---|
| **B-1** `dead_zone` | Row #22 L81 and V-2d L94–109. (1) sample each integer sim second after collect taps, before buys (= m5mr L107, buys at L140); (2) meaningful = FARM/W1–W4 exempt or `optionGain.gain` > 0, Q-E2 collect with bestBuyV2 = 1; (3) stretch from the first non-affordable second to the next affordable second or max; harness open-at-T closed at T (L143); L29→30 buy in gap(29) (`inR` turns false at farm 30); (4) emit filter only if `s` ≥ 30, open stretch < 30 s at unload **not** emitted; (5) P95 = per-seed longest stretch F10→max, seeds 1–200 per profile, `pacing-guards` quantile; (6) `reason` = `none_affordable` only; `open?` bool optional, present only as `open:true` on unload/background flush, and only if `s` ≥ 30 (L104); scope 10 ≤ farm < 30; no telemetry P95 (L106) | **CLOSED** |
| **B-2** `state`/`mood` | Row #6 L65: `mood` = `WorkerMood` `working\|tired\|asleep\|unpaid`, pre-toggle; `state` = `active\|paused\|resting` (pre-toggle Rest/Pause state, with the `paused`/`restAuto` definitions) = D-HOE-33 L520 verbatim. Row #10 L69 and `worker_paused.mood` L113 = WorkerMood. B-2c (PMW spec errata) is satisfied by rc2 v1.3.16 / pause v1.3.15 (14:26), and the values are identical | **CLOSED**. I ratify B-2c as non-blocking (rev. 12 L188 attributes "HoQA lifted it" before this review; this review is the record) |
| **M-1** allowlist | Rows #19/#20/#23 ring, #21/#22 pinned = D-HOE-31 L508 and D-HOE-32 L512 | **CLOSED** |
| **M-2** cap | Row #21: 50/session, no marker, `session_end.zero_gain_purchase_dropped` int ≥ 0 (L124); G-8 buy-spam fixture (L186) = D-HOE-32 L513 | **CLOSED** |
| **G-17** keys | Top-level `telemetry.bbv2.shown_min_gap_s` 5, `zero_gain_eta_max_s` 60, `dead_zone_min_s` 30 (D-HOE-31 L509, D-HOE-32 L514) + **`zero_gain_purchase_cap` 50**: **HoE did rule this name**, D-HOE-32 L513 (M-2 bullet) "the hand-set key telemetry.bbv2.zero_gain_purchase_cap = 50". Not `m4.telemetry` | **CLOSED** (4 keys) |
| m-1 re-cites | rc2 `40a1f0b0` ✓, SS `89dadb43` ✓ (Sources L17), eng. `591b6aa3` ✓ (now `95dd1e34`), gate `344a9039` L1049 ✓ (now `25e1d859`), manifest `2557efa4` L117 ✓ (now `5efb4b73`) | **CLOSED** at 14:22; new drift in C-2 |

## Findings
### Condition (my miss, pre-existing since rev. 1)
- **C-1 (Major → condition on schema.ts): `fatigue_cue_tapped` field set (row #3 L62) doesn't match sales-stopped v1.3.27 §8 L290–294.**
  - Row #3 reads `surface, loss_per_s`, "as #2".
  - SS §8 L290 types the fields under one heading, "**`fatigue_cue_shown` / `fatigue_cue_tapped`:**": `loss_per_s` L291, `loss_share` L292, `n_tired`/`n_asleep`/`n_paused` L293, and `surface` L294, with "`suppressed_by_stall`: bool, **on `fatigue_cue_shown` only**" (L294). On that reading, `fatigue_cue_tapped` = `{surface, loss_per_s, loss_share, n_tired, n_asleep, n_paused}`.
  - The 2-field version comes from m4.2 v0.2 L49 (`fatigue_cue_tapped {surface, loss_per_s}`) and was never re-sourced. SS v1.3.24 changelog L850 says the tapped fields moved into "the Rules 2–4 line", but L282 lists only `fatigue_cue_shown`, so SS is ambiguous too.
  - **Impact:** the schema is closed (unknown keys fail). Saves' WIP `wt-v5-tel-logs/schema.ts:171` encodes 2 fields, and the test `wt-v5-telemetry-schema/tests/telemetry-schema.test.ts:336` emits 2 fields. An emitter built from SS §8 fails T-AC9. An emitter built from the errata drops 4 fields that SS types.
  - **Ask:** PM Market (field owner, #1–3 sign-off) rules 6 fields (SS L290–294 reading, QA's preferred reading) or 2 fields (then an SS erratum fixes L290/L294). PMC writes row #3; Saves follows. My rev. 3–9 reviews passed row #3. That was a miss.
  - V-2c firing rules (L134–140) are unchanged since rev. 7, so UIQA's (b) ruling on rev. 7 V-2 still holds.
### Minors (C-2; non-blocking; next rev)
- **m-1 V-2c L135** still cites "sales-stopped **v1.3.27 + errata note 1 `49253341`**"; Sources L17 is `89dadb43` (notes 1–2). Re-cite.
- **m-2 rows #4–#6 source column** say "rc2 v1.3.14 L210/L211/L215–219"; Sources pins v1.3.15, and the live file is v1.3.16 `e4d98651` (same lines). Re-cite rc2 v1.3.16 `e4d98651` and pause v1.3.15 `4c081f64` (L19, L23, rows #6/#13, L113).
- **m-3 row #23 L82:** D-HOE-33 L522 says "no M5.0 bestBuyMark stopgap is built for v5". The stopgap is the bb-stopgap spec, `bestBuyMark` L12, SG-8 L28. So `best_buy_suppressed_zero_gain` **never fires in v5**. Row #23 still reads "needs … the stopgap #5c build; may fire with bestBuyV2 = 1". **The claim that row #23 doesn't fire in v5 is consistent with D-HOE-33, but rev. 12 doesn't say it.** Add: "not built in v5 (D-HOE-33): registered so the closed schema stays complete; any v5 emission is a defect". The ring pin and the counts stay.
- **m-4 attribution:** V-2d L95 "agreed by … HoQA" and row #6 "(PMW 14:16, HoQA)" predate my review. Cite QA-D-1030-TELERR6 instead.
- **m-5 one-to-one check (V-2d L108):** `m5mr.ts` keeps only the per-F max (`mrByF`) and the longest stretch (`mrLongest`), not a per-stretch list. For the check, Econ's final-RC harness has to dump every stretch (`farm`, start, `s`) per seed. The scratch harness also uses `gain > 1e-12` as a flags-off approximation (L110; rev. 12 L109 notes it). The Sun 18:00 all-flags-on run must use Q-E2 with bestBuyV2 = 1, as in (2). **Owner Econ**, before the Sun run.
- **m-6 citation drift since 14:22:** eng. `95dd1e34`, gate `25e1d859`, manifest `5efb4b73`, fatigue v0.2.5 `7e120786`. Citation only.
- **m-7 gate card follow-ups (not errata):** BBV2-AC16 L1049 still reads "(**rev 10**, pending; rev 9 … rejected)" (PMFU, M-3). My Card #12 QA block U7 (L1063) cites "rev 9 `49b76d62`, live rev 10 `fd3416ec`" for rows #19–23. I re-cite U7 to rev. 12 and make #23 a negative check (0 events on every v5 trace, D-HOE-33). That's my edit, after this review (outside this task's write scope).

### Checked OK
- B-1 text vs the harness at L106–112/L143: start/end, sampling order, scope, T-close and L29→30 all match. `farm` = level at stretch start = `mrF`.
- `dead_zone` pinned at ≤ 120/h worst case; the G-8 size test includes it (L160, L186).
- No PII and no free text in rows #19–23. `reason` is single-valued.

## HoE pin
**Yes. HoE may pin rev. 12 `0cfe168a` in place of rev. 7 now**, once PMC freezes the `.0cfe168a.md` copy, recording "QA-D-1030-TELERR6 CONDITIONAL PASS, C-1 before schema.ts merge". If C-1 changes row #3, PMC issues rev. 13 (one row plus the C-2 re-cites), I re-review it (about 10 min), and HoE re-pins.

## Open items
| Item | Owner | Due | Blocks |
|---|---|---|---|
| C-1 `fatigue_cue_tapped` field set | PM Market (rule), PMC (row #3), Saves (schema.ts:171 + test L336) | before the schema.ts merge (likely Fri 21:00) | schema.ts / T-AC9 |
| Freeze `.0cfe168a.md` | PMC | before the HoE pin | pin |
| m-1…m-4, m-6 re-cites/wording | PMC | rev. 13 | no |
| m-5 per-stretch dump + Q-E2 in the final harness | Econ | before the Sun 1 Nov 18:00 run | the one-to-one check |
| m-7 AC16 L1049 (PMFU); U7 L1063 (HoQA) | PMFU; HoQA | Sat 31 Oct 18:00 | no |
