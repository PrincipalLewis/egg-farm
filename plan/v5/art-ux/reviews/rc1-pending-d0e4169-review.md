# rc1-pending review @ d0e4169 (Art & UX)
2026-10-16 02:15 · Evidence: engineering/screenshots/rc1-pending-artux/ (12 PNGs, Chromium + WebKit, clean tree, ~02:10). Baseline: reviews/rc0-signoff-draft.md.
**Verdict: PASS. 1 minor cosmetic note (N1); build-label issue L1 recorded (not a UI defect).**

| # | item | result | notes |
|---|---|---|---|
| Icon | Cropped rotate icon matches the spec/mockbuild | PASS | The drawing now measures ~55×52px dark pixels inside the 64 box (was 44×42 un-cropped), centred, stroke not clipped, matches mockbuild/icon-rotate-phone-64/96.png. Identical in both engines. |
| D1 | Licence link 44px tall, no overlap with Reset save | PASS | Link line centre ≈ 22px above the Reset save top edge after a 44px box, so ≥8px of clear space. Reset save is fully visible and untouched. The 44px is taken as asserted by artux-shots (the hit box isn't measurable from a PNG). |
| N1 | Credit paragraph spacing (minor, cosmetic) | NOTE | The 44px padding on the inline link enlarges its line box, so "Authors. SIL Open Font License 1.1." sits ~8px lower than lines 1–2 and reads a little like a separate block (R4 lookalike). Optional fix: put the vertical padding on a `::before` hit area or `display:inline-block;padding-block:14px;margin-block:-14px` so line spacing stays even. Not blocking. |
| F1 | Toast below strip | PASS | queue-farm-390 "Coop upgraded!" under the strip; toast-below-strip-360 strip + "Queue full" + "+5" clear. |
| F2 | No "$0.00" | PASS | "No eggs to sell"; cards show full values. |
| F3/F4 | 5 cards at 390, " · " | PASS | "0/52 eggs · $388.96", "+5 waiting". |
| F5 | +N counts | PASS | Strip +6 / Market +5. |
| R1 | FTUE not over Settings | PASS | Both engines. |
| R3 | Rotate prompt copy/layout | PASS | Unchanged except the icon. |
| R4 | Font credit copy | PASS | Copy exact (see N1 for spacing). |
| Recovery v1.1 | | PASS (carried) | Not in this set; no recovery changes since 2fae4c4. |
| L1 | Build label | LABELLING ISSUE (not UI) | Settings shows "Egg Farm m3-rc0+d0e4169", but the release is m3-rc1-pre (QA catch). Engineering fixes the version string; no UI change needed. |

Correction: rc0-signoff-draft.md listed "D1" as the real-iPhone smoke session; in this rc1 list D1 is the licence-link fix (now PASS). The real-iPhone session stays an accepted risk tracked by QA. Still open: the FTUE resume-after-dialog check (QA).

## Addendum @ bd0dc66 (2026-10-16 02:15, engineering/screenshots/artux-m3-rc1-pre-bd0dc66/, Chromium + WebKit)
| check | result | notes |
|---|---|---|
| Credit reads as one paragraph | PASS | Three evenly spaced lines; no gap before "Authors. SIL Open Font License 1.1." N1 closed. |
| 14px under the paragraph doesn't look stray | PASS | Gap credit → Reset save ≈ 30px, matching Export log → credit ≈ 30px, so the spacing looks symmetric and intentional. |
| No visible overlap link ↔ Reset save | PASS | Clear space between the link baseline and the button top. |
| Label | PASS | "Egg Farm m3-rc1-pre+bd0dc66". L1 closed. |
Identical in both engines. **Verdict @bd0dc66: PASS.**
