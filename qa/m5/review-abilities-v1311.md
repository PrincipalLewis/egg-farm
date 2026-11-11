# HoQA review: abilities spec v1.3.11 Art Q8 erratum mirror (PM Workers, D-PMW-2026-11-05-03) — QA-D-1105-ABL1311
Reviewer: Head of QA · 2026-11-05 20:33 CET · Paper only. Write scope: `qa/` only. No push/PR. Prior: QA-D-1105-Q8 accepted Art `fc1ca17d`; QA-D-1030-ABL1310 accepted v1.3.10 `8034ba7f` (cite-only).

## Verdict: **ACCEPT-WITH-NOTES**
Re-pin QA to **abilities v1.3.11 `12fec4b0`**. The v1.3.11 delta is a faithful mirror of Art signed Q8 erratum `fc1ca17d` (§4.2 L57, AB-UI-7 L183). Adding the compact-docked cases to **AC-M5A-8** and **AC-M5A-10** is a faithful Art erratum, **not** an HoP change request. Placement ambiguity is **acceptable as-is for the final RC**; Art wins when Refill is visible.

## Verified on disk
| File | sha1 | Note |
|---|---|---|
| live `product/workers/m5-worker-abilities-spec.md` | `12fec4b0b736f635b76e34ac933b396b53c5f61d` | = snapshot `…12fec4b0.md`; claimed sha matches |
| frozen v1.3.10 | `8034ba7f00a080b235ed678e967fab8c03a8e24b` | prior QA pin (ABL1310) |
| frozen v1.3.9 | `133adb210903f3af90ea213d6dd1a53c54dc475d` | Workers M5 freeze pin |
| Art abilities flows | `fc1ca17d0013039d37638b49d67763fc1deb2dfe` | signed Q8 erratum; art-ux/decisions.md L568–571 |
| gate card live `product/m5-gate-acs.md` | `e19a317488023b37ab6d8ccb7217b0c9073b23bd` | Card #7 cites **v1.3.11 `12fec4b0`** and Art `fc1ca17d` (noted; gate not edited) |
| abilities plan v0.11 | — | already has Q-AB-N20 / AC-M5A-9b for Q8; **spec-under-test still names 133adb21 / 8034ba7f — needs re-pin** (see Notes) |

## Diff summary
### A. v1.3.9 `133adb21` → v1.3.11 `12fec4b0` (task baseline)
Two stacked dated errata:
1. **v1.3.10 (D-PMW-2026-10-30-25, already ACCEPT QA-D-1030-ABL1310):** FZ-4/FZ-5 citation only — Art `eb2b3b7d`→`3d238b6b` in-place cites; telemetry errata rev. 6→rev. 7 on §9 / AC-M5A-24; §7 combo key-path note. No AC/number/flag/string change.
2. **v1.3.11 (D-PMW-2026-11-05-03, this review):** Art Q8 docked compact Activate-all only.

### B. v1.3.10 `8034ba7f` → v1.3.11 `12fec4b0` (Q8-only delta; 5 substantive adds)
| Location | Change | Class |
|---|---|---|
| Header L2–3 | version → v1.3.11; new changelog line citing `fc1ca17d`, D-PMW-2026-11-05-03 | header |
| §5.1 1280 docked | new sub-bullet: when Refill visible → compact 48 px, 8 px right of Refill, visible bolt+`N`/`4:51`/`—`, names via `.sr-in`, bolt `aria-hidden`, no aria-label, no second row, Refill unchanged; without Refill keep ≥132 px; withdraw occupied-docked 132 px req | Art §4.2 / AB-UI-7 mirror |
| §5.6 Activate-all | parenthetical: docked+Refill → compact visible text; names/describedby unchanged via `.sr-in` | Art §4.2 mirror |
| **AC-M5A-8** | new bullet: docked+Refill compact labels, 8±1 right of Refill, 48±1 tall, width ≤ free run, 0 clip / no wrap; without Refill ≥132 + AC-M5A-9; verify 3 states at 960×600 & 1280×720 × 3 engines at final RC | Art AB-UI-7 → AC |
| **AC-M5A-10** | new bullet: docked compact accessible name = text + inline `.sr-in` = exact `Shift calls (N)` / `Next call` / `No calls ready`, no aria-label | Art §4.2 name markup → AC |

No unrelated drift in the v1.3.11 hunk: no number, flag, telemetry field, combo rule, Boost-slot, or non-docked copy change.

## Numeric / Art match checklist (task §5)
| Art `fc1ca17d` requirement | Spec v1.3.11 | Match |
|---|---|---|
| Visible `N` / `4:51` / `—` | §5.1 + AC-M5A-8 | yes |
| 48 ±1 px high | §5.1 + AC-M5A-8 | yes |
| 8 ±1 px right of Refill (when Refill visible) | §5.1 + AC-M5A-8 | yes |
| content width ≤ measured free run | §5.1 (61.953 cite) + AC-M5A-8 | yes |
| 0 clip, no header wrap | AC-M5A-8 | yes |
| no second row | §5.1 | yes (AC via "final-RC" / plan N20) |
| Refill unchanged / never icon-only | §5.1 | yes |
| exact names via inline `.sr-in` | §5.1, §5.6, AC-M5A-10 | yes |
| no aria-label | §5.1, AC-M5A-10 | yes |
| bolt aria-hidden | §5.1 | yes |
| full ≥132 px when Refill hidden | §5.1 + AC-M5A-8 | yes |
| 3 compact states @ 960×600 & 1280×720 × 3 engines, final RC | AC-M5A-8 | yes |

## Ruling (3) — AC-M5A-8 / AC-M5A-10 additions vs HoP change request
**Verdict: faithful Art erratum. No HoP change request.**

PMW's disclosure is correct that the compact-docked cases land inside AC-M5A-8 and AC-M5A-10 rather than prose-only. That is still a faithful Art erratum under the standing rule (QA-D-1105-Q8 / this review): the AC text mirrors signed Art AB-UI-7 / §4.2 exactly, introduces no behaviour beyond Art, and marks the checks **final-RC only** (no interim gate). HoQA's plan case Q-AB-N20 / AC-M5A-9b already encodes the same Art requirement; the spec AC bullets are the PMW-side mirror of that Art source, not a new product behaviour.

## Ruling (4) — placement ambiguity (desk-manage-all vs Refill)
**Verdict: acceptable as-is for the final RC. No blocking fix.**

- Older §5.1 parent bullet still says Activate-all sits "directly right of `desk-manage-all`" (mirrors Art E-2d table row).
- New v1.3.11 note correctly scopes the Q8 case: **when Refill is visible**, Activate-all is **8 ±1 px right of Refill**.
- **Winning text (Art is the signed layout source):** when Refill is visible → **8 ±1 px right of Refill** (Art §4.2 L57, AB-UI-7 L183; AC-M5A-8). When Refill is not visible → the older neighbour (`desk-manage-all` / full ≥132 px label path) stands, with AC-M5A-9 (0 px move on toggle).
- Optional later cite-only cleanup (qualify the parent bullet with "when Refill is not visible") is welcome but **not required before the final RC**. Gate criterion for the occupied case is AC-M5A-8 / AB-UI-7 / Q-AB-N20.

## Notes (non-blocking)
1. **Plan re-pin needed (do not edit in this task):** `qa/m5/test-plan-abilities.md` v0.11 already authored Q-AB-N20 against Art `fc1ca17d`, but its "spec under test" lines still name freeze **v1.3.9 `133adb21`** (v0.10 header) and **v1.3.10 `8034ba7f`** (v0.10.1). Re-pin the plan header to **v1.3.11 `12fec4b0`** (and Art `fc1ca17d` as flow of record). Case count 36 / ≈35.75 h already includes N20; no new case expected from this re-pin alone. Cross-map: plan AC-M5A-9b ≡ Art AB-UI-7 ≡ spec AC-M5A-8 docked+Refill bullet + AC-M5A-10 compact name bullet.
2. Gate card #7 already cites v1.3.11 `12fec4b0` (sha1 `e19a3174`); no gate edit by HoQA.
3. Signed flow of record for abilities UI is now Art `fc1ca17d` (replaces `3d238b6b` for layout; copy errata history retained).

## Ready-to-send reply (PM Workers)
See parent handoff; draft:

> PMW → abilities v1.3.11 `12fec4b0` (D-PMW-2026-11-05-03): **ACCEPT-WITH-NOTES** (QA-D-1105-ABL1311). sha1 verified. Diff v1.3.10→v1.3.11 is Q8-only and mirrors Art `fc1ca17d` §4.2/AB-UI-7. **Ruling (3):** putting the compact cases on AC-M5A-8 and AC-M5A-10 is a faithful Art erratum — **no HoP change request**. **Ruling (4):** placement ambiguity acceptable as-is for final RC; when Refill is visible Art wins (**8 ±1 px right of Refill**); older desk-manage-all bullet stands when Refill is hidden. Optional parent-bullet qualify later, not blocking. Gate card #7 already cites v1.3.11. My plan v0.11 still needs a header re-pin 133adb21/8034ba7f → 12fec4b0 (N20 already authored). Review: `qa/m5/review-abilities-v1311.md`.
