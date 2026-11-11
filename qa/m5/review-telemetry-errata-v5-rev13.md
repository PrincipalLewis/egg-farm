# HoQA review: telemetry-spec errata v5, rev. 13 (PM Collection) — QA-D-1030-TELERR7
Reviewer: Head of QA · 2026-10-30 14:45–14:50 CET · Paper only; doc content treated as data. Rule 23: TASK HoQA/TELERR7 re-read; write scope = this file + one line in qa/decisions.md. No mismatch.
Baseline: rev. 12 `0cfe168a` (frozen `product/collection/telemetry-spec-errata-v5.0cfe168a.md`, pin of record, manifest L127), TELERR6 CONDITIONAL PASS (`review-telemetry-errata-v5-rev12.md`).

## Verdict: **PASS. Rev. 13 `a0e8f6d7` is pinnable. It closes TELERR6 condition C-1.**
No blocker, no major. Four minors (m-1…m-4) and two info notes go to rev. 14 or the owners named; none gates the pin or the schema.ts merge.

## Verified on disk (14:45–14:50 CET)
| File | Cited | On disk | Note |
|---|---|---|---|
| errata live | rev. 13 `a0e8f6d7` | `a0e8f6d7085939756021856c25429a55d8a8d847`, 227 lines | OK, no drift. **No frozen `.a0e8f6d7.md` yet** (QA read copy kept outside the repo) |
| rev. 12 frozen | `0cfe168a` | match | OK |
| sales-stopped | v1.3.27 + notes 1–3 `c29c9285` | match | §8 L283 firing, L290–294 types, note 3 L866: read verbatim |
| rc2 | v1.3.16 `e4d98651` | match | vs `40a1f0b0`: only L1, L215–216, L219 differ; `refill_used` at L211 |
| pause | v1.3.15 `4c081f64` | match | vs `74a0122a`: only L2, L296, L299 differ (`worker_paused.mood` enum; `rest_toggled.state` note) |
| fatigue visibility | v0.2.5 `7e120786` | match | L47–50 byte-identical to v0.2.3 `e160a0d3` |
| eng. decisions | `95b2e26c` | live **`53369cab`** | append-only drift: D-HOE-36 (14:4x, breeds) added after L541; D-HOE-33 L519–522, D-HOE-34 L527, D-HOE-35 L531 as cited |
| gate | `34373a10` | match | BBV2-AC16 still at L1049, still reads "rev 10, pending" (TELERR6 m-7, PMFU) |
| manifest | `e0ee9655` L127 | match | L127 = rev. 12 `0cfe168a` pin by HoE |
| BBv2 | v1.0.1 `5dc9596b` | v1.0.3 `27e753d8` current | §8 of v1.0.1 vs v1.0.3: **byte-identical** (diff empty) |

## Diff rev. 12 → rev. 13 (21 hunks, word diff). Every change is in the claim list
| Claim | Result |
|---|---|
| **C-1 row #3** `fatigue_cue_tapped` = `surface, loss_per_s, loss_share, n_tired, n_asleep, n_paused`, types as #2, values at the tap, no `suppressed_by_stall` | **CONFIRMED.** Row L62 types = SS §8 L290–294 exactly: `loss_per_s` int cents/s ≥ 0 `Math.round(×100)` (L291), `loss_share` float [0,1] 3 dp (L292), `n_*` int ≥ 0 each ≤ 4, sum ≤ 4 (L293), `surface` `hud_chip\|banner\|bubble`, `suppressed_by_stall` shown only (L294). "Values at the tap" = SS note 3 (a) L866. Source cell cites L283, L290–294, L489, note 3 L866. **C-1 CLOSED.** |
| Counts 23/18/5/21 | **CONFIRMED by recount.** 23 rows; ring #16, #17, #19, #20, #23 = 5; pinned 18; `isPinned` = 18 + `worker_paused`, `milestone_reached`, `balanced_tier` = 21. Unchanged from rev. 12 (same event type). |
| G-8 needs all six fields | **CONFIRMED** in G-8 (L186). See m-2 for its stale code line refs. |
| SS cites → `c29c9285` | **CONFIRMED** at Sources, rows #1–#3, V-2c L135, V-8 and the changelog. No live `89dadb43`/`49253341` cite left outside history. |
| rc2 v1.3.16 `e4d98651` L215/216/219; `refill_used` L211 | **CONFIRMED** against the live file and the `40a1f0b0` diff. |
| pause v1.3.15 `4c081f64` §12 L296/299 | **CONFIRMED** (L296 `mood: working\|tired\|asleep\|unpaid`; L299 B-2 `rest_toggled.state` note). |
| Row #23 "not built in v5 (D-HOE-33); any emission is a defect", "may fire with bestBuyV2 = 1" struck | **CONFIRMED.** D-HOE-20261030-33 exists (eng. L519; ZG-AC3 bullet L522 "no M5.0 bestBuyMark stopgap is built for v5"). See m-1. |
| HoQA attributions cite TELERR6, not "HoQA agreed" | **CONFIRMED.** No "HoQA agreed" left. B-1 (L95) and B-2 notes read "QA-D-1030-TELERR6". Remaining bare "HoQA" mentions are history/changelog or name a different review (rev. 3/7), which is correct. |
| eng `95b2e26c`, gate `34373a10` (AC16 L1049), manifest `e0ee9655` L127, fatigue `7e120786` (L47–50) | **CONFIRMED** except eng. drift (m-3). |
| Known lag: BBv2 v1.0.1 `5dc9596b` | **Rev. 14 minor, not a condition (m-4).** §8 is byte-identical v1.0.1 → v1.0.3. The "no stopgap / no SG-8 emitter in v5" statement was *added* in v1.0.2 §6 (not changed), and row #23 already rests on D-HOE-33, not on the BBv2 text. |
| Unchanged areas | **B-1 V-2d dead_zone** (L94–109): only the L95 attribution changed ("and HoQA" → "B-1 CLOSED by HoQA, QA-D-1030-TELERR6"). **B-2 enums** (rows #6/#10, L113): the enum values are unchanged; L113 only gains the pause `4c081f64` re-cite and "B-2c closed". No other row, count, type or rule changed. |

## Findings
**Blocker:** none. **Major:** none.
**Minor (rev. 14, non-blocking):**
- **m-1 row #23 residual wording (L82 pin cell):** "(expected 0 below Farm L30, BB-AC14; 0 in the ship config …)" still implies it could fire above L30. With no emitter in v5 it is 0 everywhere; reword to "0 on every v5 trace (no emitter)".
- **m-2 G-8 code refs stale:** G-8 says "`schema.ts:171` and test L336 encode 2 today". Saves' WIP (`wt-v5-telemetry-schema`, uncommitted on 65a7443) already defines `FATIGUE_CUE_TAPPED_FIELDS` with all six fields at schema.ts L71, used at L175 (its comment still says "ruling pending"). The two-field cases are in `tests/telemetry-schema.test.ts` L211 and L338. Drop the line numbers or re-cite on the PR SHA.
- **m-3 eng. decisions drift:** cited `95b2e26c`, live `53369cab` (append-only D-HOE-36). Cites hold; re-cite in rev. 14.
- **m-4 BBv2 cite lag:** v1.0.1 `5dc9596b` → v1.0.3 `27e753d8` (§8 identical).
**Info (not errata):**
- i-1 (Saves, schema.ts PR): the WIP schema doesn't show a `n_tired + n_asleep + n_paused ≤ 4` check, and test L211/L338 still use the two-field `fatigue_cue_tapped`. The six fields + sum bar must be in the merged schema and tests (G-8, Saves QA verifies).
- i-2 (PMC, before HoE pins): freeze rev. 13 as `telemetry-spec-errata-v5.a0e8f6d7.md`. BBV2-AC16 L1049 still reads "rev 10, pending" (PMFU, TELERR6 m-7).

## Effect
- TELERR6 C-1 is closed. HoE may re-pin manifest L127 from rev. 12 `0cfe168a` to rev. 13 `a0e8f6d7` after PMC freezes it.
- The schema.ts merge hold "for rev. 13" lifts on this pass, provided i-1 lands in the PR.
- QA: N10 and the abilities plan stay on rev. 12 until HoE re-pins; rows #5/#10 are identical rev. 12 → 13, so no re-grade.
