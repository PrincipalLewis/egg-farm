# QA re-review: failure-cost v0.3.21 and lighter-refill v0.8.11 (D-PMW-2026-10-30-15)
**2026-10-30 13:41 CET · Head of QA (executor) · paper only · QA-D-1030-FC0321 · no messages sent, no product/ or art-ux/ files edited.**
Follows QA-D-1030-FC0319 (`qa/m5/review-failure-cost-v0.3.19.md`, ACCEPT-WITH-NOTES). v0.3.20 2f830cb0 (Art-sign wording only) came in between.

## Verdicts
| Spec | Verdict |
|---|---|
| (A) failure-cost v0.3.21 f961a734 | **ACCEPT-WITH-NOTES** (1 Minor, 3 Info) |
| (B) lighter-refill v0.8.11 fa074d29 | **ACCEPT-WITH-NOTES** (1 Major doc defect, 1 Minor, 1 Info). The rename is complete. The Major is one stale clause that contradicts D-HOP-2026-10-30-41 (2). QA cases follow telemetry errata rev 4, which is the spec of record, so this doesn't block testing. It must be fixed before gate cards AR-AC* re-pin to lighter v0.8.11. |

## Hashes (sha1 computed on disk 13:39 CET)
| File | Claimed | On disk | OK |
|---|---|---|---|
| product/workers/m5.1-worker-failure-cost-proposal.md v0.3.21 | f961a73403726f7bcf6c81c2ed13913f0de260d7 | f961a73403726f7bcf6c81c2ed13913f0de260d7 | yes |
| frozen v0.3.20 `.2f830cb0.md` | 2f830cb0 | 2f830cb03af173593add1f35e3dd51316777eea7 | yes |
| product/workers/m5.1-lighter-refill-proposal.md v0.8.11 | fa074d29845befee41b828c1a3b22454457fd9e1 | fa074d29845befee41b828c1a3b22454457fd9e1 | yes |
| frozen lighter v0.8.10 `.f71e4516.md` | f71e4516 | f71e45161c14382772e8f76f543452164c51b3b1 | yes |
| art-ux/m5-refill-flows.md v1.0.1 (signed 13:32, art-ux/decisions.md L534) | 43828d0b | 43828d0b5c7b4a9939477444a71053492cd1aeb2 | yes |
| art-ux/reviews/m5-refill-axe/sr-markup.md | cc763196 | cc763196941918cbe9c070665c227fcd33bca01a | yes |
| art-ux/reviews/m5-refill-axe/results-v101.json | 16eef48a | 16eef48a0b76458779b478f08dd1d4a30598ef50 | yes |
| product/collection/telemetry-spec-errata-v5.md (rev 4, 13:39, read for cross-check only; not yet reviewed or pinned) | — | 9e02ac3a71ec00395890ed85a45228786ed44fe0 | n/a |

Diffs reviewed: failure-cost `.2f830cb0.md` vs live (changed lines 1–2, 58, 84, 106, 113, 116, 120, 123, 126–128, 131, 134–135, 148, 163, 174, 176, 188–193, 195). I also compared live against v0.3.19 `.4f5bbc5c.md` for the FC0319 notes. Lighter: `.f71e4516.md` vs live (changed lines 1–2, 69, 84, 86, 90–91, 94, and new line 107). A number sweep of the failure-cost body (struck text excluded, v0.3.20 → v0.3.21) finds only citation and sha changes, plus the existing 253px bar now cited at L120/L128. No economy number, bar or flag changed, which matches "record-only".

## (A) failure-cost v0.3.21

### A1. QA-D-1030-FC0319 notes fixed: **PASS**
- **N1 (where the space lives):** fixed. In L106 (AC-FC10), L113 (AC-FC13 Rule), L116 (Format) and L163 (AC-FC20), the space is the leading space of `data-cd=" 0:42"`, drawn by `::after` with `white-space:pre`, and the text node "Next charge in" has no trailing space.
- **N3 (stale "Refill in" text):** fixed.
  - L120 Range now reads "Next charge in 2:30" inside the swept set 0:01…9:59, under the constant-width rule.
  - L128 case (iv) reads "Width per the constant-width rule: `min-width:253px` + `flex:1 1 0`, identical ±0.5 px to every other label at the same viewport (D-HOP-2026-10-30-22)".
  - Cases (ii) L126, (iii) L127, (vii) L131, (x) L134 and (xi) L135 strike "Refill in m:ss" and replace it with "Next charge in m:ss". Cases (i) and (ix) were already done.
  - A sweep of live (unstruck) text from L107 to L170 finds no "Refill in" use. The remaining hits are inside "no longer applies" errata sentences (L121, L148) or in the header and changelog history.
- **N5 (Econ RF5 fields):** resolved outside this doc. Errata rev 4 row 5 puts `refillable_n, best_worker, lowest_worker` on `refill_used`. Failure-cost doesn't define `refill_used`, so there's nothing to change here.
- **Lighter point 5:** see B1.

### A2. `.lbl` + inline `.sr-in` replaces the absolute `.sr` (RF-UI-9/19/20; AC-FC10/13/17(b)/20): **PASS**
- AC-FC10 (L106) has a "Markup erratum (v0.3.21)" block. All three button snippets and all three CSS rules in it match `sr-markup.md` cc763196 byte for byte (substring check on all 6). It covers Unpaid as well (aria-disabled + rc1 Unpaid describedby).
- The `position:absolute` `.sr` is struck in the name-source text (L106) and replaced by inline `.sr-in`, with "The `.sr` class is no longer used on this button".
- AC-FC13 Rule (L113) and AC-FC20 (L163) restate item (3) as the inline `.sr-in` inside `.lbl` and point to the AC-FC10 erratum. AC-FC13 Unpaid (L123) uses `.sr-in`.
- AC-FC17 (b) (L148) now reads "the inline `.sr-in` span renders 0×0 and does not count", and the `.sr` position:absolute clause is struck.
- These map to Art's RF-UI-9 (DOM order), RF-UI-19 (axe + exact names) and RF-UI-20, which are art-ux/m5-refill-flows.md §8.2 L176–183 and L263–264. Art also confirmed PMW's erratum at art-ux/decisions.md L548.

### A3. Constant-width rule at L120 and case (iv): **PASS**
Both cite `min-width:253px` + `flex:1 1 0`, ±0.5 px across all labels per viewport, and D-HOP-2026-10-30-22. That matches L116 Format, L121 Constant width and L148 AC-FC17 (b). The `charge_regen_s ≤ 599` cap stays, now justified only by m:ss (the 10:00 width figure is struck).

### A4. "Refill in" → "Next charge in" in cases ii, iii, vii, x and xi: **PASS** (see A1).

### A5. `data-cd=" 0:42"` with `white-space:pre`, and the leading space kept out of the name: **PASS**
- The space sits only in `data-cd` on a `<span aria-hidden="true">`, and only `::after` draws it. An aria-hidden subtree, including its generated content, contributes nothing to the name. The resulting name is "Next charge in" + " progress, {Role}" = "Next charge in progress, {Role}", with exactly one space.
- **Info I-A1:** L106/L113/L163 still offer the alternative "(or `content: attr(data-cd) / ""`)". That's harmless under aria-hidden, but the erratum CSS is the single required form. QA asserts the erratum CSS rule.

### A6. Names match Art v1.0.1 43828d0b, and the exact raw-name gate (QA-D-1030-NAME-FINAL): **PASS**
- L106 lists the exact names "Refill, {Role}" (enabled and Unpaid), "Next charge in progress, {Role}" and "Rested, refill below 50%, {Role}". These are identical to Art §2 L43–46 and §8.2 L181 ("exact strings, no normalisation, no space before the comma").
- The cause of the v0.3.19 failure (`Refill , {Role}` from a blockified absolute `.sr` in Chromium AX and Playwright) is recorded at L106 and L190.
- Evidence results-v101.json 16eef48a matches exact strings via axe + ariaSnapshot in 3 engines, plus CDP in Chromium, at 360/390/1280.
- QA's gate stays EXACT on the raw computed name. norm() is a diagnostic only and is never used to pass (NAME-FINAL).

### A7. No digits in names: **PASS on intent, Minor wording defect (F-A1)**
- **F-A1 (Minor):** L106 ("The computed name has **no digit in any state**"), L163 and the L106 evidence line ("no digit in any name") say this literally. The Rested name "Rested, refill below 50%, {Role}" contains "50", so a literal `/\d/` check on all states fails Rested by construction.
  - Art scopes the rule correctly: no *countdown* digits, and "the `50` in Rested is static visible text" (m5-refill-flows L181).
  - Art's own harness strips it first: `run-v101.cjs` L36 `noDigit: !/\d/.test(axeName.replace(/50%/,''))`.
  - The gate file's QA line (m5-gate-acs.md L480) applies `/\d/` to the 0-charge name only.
  - **Fix:** reword to "no countdown (m:ss) digit in any state. The 0-charge and Refill/Unpaid names match no `/\d/`. Rested's static '50%' is part of its exact name."
  - **QA action meanwhile:** the RF B4 / CW B5 cases apply `/\d/` to the 0-charge and Refill/Unpaid names, plus "name stable across ticks". Rested is covered by its exact-string match.

### A8. `refill_used` only, no `manage_used` alias: **PASS (N/A)**
Failure-cost defines neither event. A sweep of unstruck text finds no `manage_used`, `refill{` or `"refill"` event name. Its telemetry (§6 L165–171, AC-FC15) is `wage.state`, `session_end.wage_paid_asleep_cents`/`asleep_s`, `tip_shown{clock_wage}` and the lighter `session_end` fields. All of these are in errata rev 4 row `session_end` (L87).

### A9. Wire ids `market_hand|coop_hand|hawker|grader`: **PASS (N/A), Info I-A2**
No worker enum is stated on the wire. **I-A2:** AC-FC15 (L138) names `worker_summary.wage_<worker>_asleep_cents` without saying that `<worker>` is the code id. Errata rev 4 L49 fixes it as `market_hand|coop_hand|hawker|grader` (D-HOE-19). An optional one-clause cite would help at the next touch. QA asserts the code ids.

### A10. Paused totals only with rc2Refill=0: **PASS (N/A)**
Failure-cost doesn't mention `paused_worker_s`/`all_paused_s`. The rule lives in errata rev 4 (L163, D-HOP-41 13:36 amendment) and rc2 v1.3.7.

### Other (A)
- **I-A3 (test design, carried from N2):** L106, L136 (xii) and L163 still state axe `label-content-name-mismatch` = 0 as a bar. With no `aria-label`, the rule is inapplicable. QA records it as "inapplicable, not passed" and relies on the exact-name assertions. No spec change needed.
- Art's signed v1.0.1 header pins failure-cost v0.3.19 4f5bbc5c, not v0.3.21. Art's 13:45 entry (art-ux/decisions.md L548) explicitly verifies v0.3.21's erratum, so the pair is consistent.
- **Clock note:** art-ux/decisions.md L548 is stamped 13:45 CET, but the box clock read 13:39 CET when it was on disk. That's the same kind of skew Saves QA reported for D-HOE-20. Treat stamps as unverified and order entries by sha.

## (B) lighter-refill v0.8.11

### B1. `refill` → `refill_used` in AC-LR1/13/15/19/20/21(b): **PASS**
All 7 occurrences listed in FC0319 are renamed in place:
- L69 AC-LR1 `refill_used{by:"auto"}`
- L84 AC-LR13 `refill_used{by:"auto", energy_pct:0}`
- L86 AC-LR15 `refill_used{by:"manual"}` and "exactly one `refill_used` event"
- L90 AC-LR19 `refill_used{by:"auto"}`
- L91 AC-LR20 `refill_used{by:"auto", energy_pct:0}`
- L94 AC-LR21 (b) `refill_used{by:"auto", energy_pct:0}`

A sweep of unstruck text finds no live `refill{` or `` `refill` `` event name and no `charges_after`. The remaining hits are the header and changelog history (L2, L107–108) and the L62 mapping sentence.

### B2. No leftover `manage_used`: **FAIL, F-B1 (Major, doc)**
- L62 (unchanged from v0.8.10) still reads "It was never implemented, so there is no alias (**the rc2 `manage_used` alias stands**)."
- That contradicts D-HOP-2026-10-30-41 (2) / C-3, D-HOE-20261030-19 (G-4) and errata rev 4 L74 ("`manage_used`: no alias of any kind… wire and export carry `refill_used` only"). It also contradicts PMW's own rc2 v1.3.7 (header: "no `manage_used` alias").
- **Fix:** strike the parenthetical and write "No `manage_used` alias exists (D-HOP-2026-10-30-41 (2)); wire and export carry `refill_used` only."
- It's Major because it's live normative text contradicting a HoP ruling. It doesn't block QA because the errata is the spec of record and TEL-AC6/RF-AC10 are amended name-only.

### B3. Fields match the telemetry errata (`refillable_n`, `best_worker`, `lowest_worker`): **FAIL, F-B2 (Minor)**
- The L62 field list is `{worker, energy_pct, charges_left, rank_by_risk, by, sheet_id, entry_point: nav|card|stall_chip|auto, stall_id?}`. Errata rev 4 row 5 (L59) is the same list **plus `refillable_n, best_worker, lowest_worker`**, with `entry_point` also allowing **`fatigue_chip`** and `sheet_id` typed as an int counter (null only for `by:auto` outside a sheet, which matches L62).
- L62 also doesn't say that worker fields carry code ids (`market_hand|coop_hand|hawker|grader`, errata L49).
- "The pinned list and the new fields need HoE allowlist approval" is stale now that the errata lists `refill_used` as **pinned**.
- **Fix:** add the three fields and `fatigue_chip`, state code ids, and cite errata rev 4 row 5 as the source of truth (or replace the list with that cite).
- QA's AR cases follow errata row 5.
- **Info I-B1:** the "W1→W4" tie order (L20, L42, L73) is spec shorthand, which errata L49 allows. It isn't a wire value. No change.

### B4. Markup
Lighter states no sheet-row Refill markup, so the failure-cost erratum is cited, not mirrored (L107). Correct.

### B5. Paused totals and wire ids
Lighter has no `paused_*` fields. Wire ids: see F-B2.

## Findings summary
| ID | Spec | Severity | Finding | Fix |
|---|---|---|---|---|
| F-B1 | lighter L62 | **Major (doc; non-blocking for QA)** | "the rc2 `manage_used` alias stands" contradicts D-HOP-41 (2) / D-HOE-19 / errata rev 4 L74 | Strike it; state that no alias exists and `refill_used` is the only event |
| F-A1 | failure-cost L106 (Check + evidence), L163 | Minor | "no digit in any state/name" is literally false for Rested "…below 50%…" | Scope it to countdown digits; `/\d/` applies to the 0-charge and Refill/Unpaid names |
| F-B2 | lighter L62 | Minor | `refill_used` field list lacks `refillable_n, best_worker, lowest_worker`, `entry_point` `fatigue_chip` and code-id worker values; "needs HoE approval" is stale | Align to errata rev 4 row 5, or cite it |
| I-A1 | failure-cost L106/113/163 | Info | Alternative `content: attr(data-cd) / ""` is still offered | Optional: drop it |
| I-A2 | failure-cost L138 | Info | `wage_<worker>_asleep_cents` doesn't state code ids | Optional: cite errata L49 |
| I-A3 | failure-cost L106/136/163 | Info (test design) | axe name-mismatch bar is inapplicable without aria-label | QA records it as inapplicable; no spec change |
| I-B1 | lighter L20/42/73 | Info | W1→W4 is shorthand only | None |

## QA follow-ups (HoQA lane, not PMW)
1. Gate cards #6a/#6b/#10 (RF-AC3/8, CW-AC10/11) and the QA lines: re-pin to failure-cost f961a734, Art 43828d0b and sr-markup cc763196 once PMW's rc2-batch re-pin lands. The RF B4 / CW B5 cases assert the `.lbl`/`.sr-in` DOM, exact raw names in 3 engines, the scoped `/\d/` (F-A1) and axe "inapplicable".
2. The UI QA harness P4/P6 should be authored against the v0.3.21 erratum markup, not the v0.3.19 `.sr`. P5 (autoRefill) asserts the `refill_used` fields from errata rev 4 row 5, not lighter L62 (F-B2).
3. Re-pin the AR-AC* QA lines from lighter v0.8.10 f71e4516 to v0.8.11 fa074d29 only after F-B1 is fixed, or pin fa074d29 with F-B1 noted as overridden by D-HOP-41.
4. Errata rev 4 (9e02ac3a, 13:39) is on disk and still needs its own HoQA review before HoE pins it. This review only read it for cross-checks.
