# rc0 UI sign-off (DRAFT, provisional) — tag m3-rc0 @ 16176a3
Reviewer: Art & UX · 2026-10-16 01:50 · Evidence: engineering/screenshots/rc0-artux/ (12 PNGs, clean build "m3-rc0+16176a3", Chromium + WebKit, ~01:47), rc0-recovery-v11/ (at 2fae4c4; there's no save-recovery change since, so it's carried over). Prior: reviews/rc0-pt1-13-queue-review.md, reviews/rc0-2fae4c4-review.md.

**Provisional verdict: UI PASS for rc0, pending QA's Sunday report.** This is a draft, not a release approval; release decisions stay with the CEO/Vadim.

| # | item | result | evidence / note |
|---|---|---|---|
| F1 | Slot toast below the strip, plain copy unless a slot is gained | PASS | queue-farm-390: "Coop upgraded!" under the strip; toast-below-strip-360: the strip, "Queue full" and "+5" aren't covered (the toast is fading below the strip). |
| F2 | Never "$0.00" | PASS | "No eggs to sell"; cards "0/50 eggs · $374.00". |
| F3 | 390×844: 5 cards + chip | PASS | queue-market-390, both engines. |
| F4 | " · " separator | PASS | "0/52 eggs · $388.96". |
| F5 | Strip / Market +N | PASS | 4+6 / 5+5 = 10; each label means "not shown here". |
| R1 | FTUE never over Settings | PASS | r1-settings-over-ftue-360, both engines. |
| R2 | OFL link 44px tap target | PASS (visual) | Hit box asserted by artux-shots; not measurable from a PNG. |
| R3 | Rotate icon 64×64 box | PASS | 64 box; the un-cropped viewBox is expected (crop goes in rc1). |
| R4 | Font credit one paragraph | PASS | settings-font-credits-360. |
| — | Font credits copy + bundled OFL | PASS / QA | Copy exact; QA to confirm the link opens fonts/OFL.txt. |
| — | Rotate prompt 640×360 | PASS | Copy, colors, opaque cream, both engines. Tablet/desktop no-overlay, inert and focus are QA §6. |
| — | Save recovery v1.1 (storage-full) | PASS | Copy, 44px secondary Export, centred at 960, Settings re-export + "Saved a copy." in Chromium, WebKit and Firefox. The alertdialog/focus a11y tree is a QA AC. |
| — | Build string | PASS | No "+dirty". |

## Known rc1 items
1. **Icon crop:** commit art-ux/assets/icon-rotate-phone.svg (viewBox `2.75 0.25 52.5 52.5`, already copied to game/public/assets, uncommitted) and re-shoot rotate-prompt-640x360.
2. **D1 (licence link 44px, no overlap with Reset save):** fixed and PASS at d0e4169 (see rc1-pending-d0e4169-review.md). Separately, the real iPhone Safari smoke session (smoke-plan D1) is an accepted risk (Vadim, AC10 waived).
3. **Resume check:** onboarding resumes correctly after Settings (or any dialog) closes. Not shown in the screenshots; QA to verify.

## Pending QA (Sunday report)
Rotate prompt §6 (tablet/desktop, taps blocked, SR, reduced motion); save-recovery ACs 2, 3, 8 (not dismissable, focus trap, a11y tree); OFL link opens; queue QA 1–20 re-run on the tag. If any of these fail in a UI-affecting way, this draft is withdrawn.
