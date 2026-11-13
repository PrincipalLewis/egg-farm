# P46-M1 fix review: B c0bb3de / C 0d4c0fe (2026-10-19 05:20 CEST)
Sets: /workspace/wt-ui-shots/m4-gate5-v2 (B), /workspace/wt-ui-shots/m4-gate5-v115 (C). Both have a manifest.json, 24 and 27 PNGs.
Checked against m4-on-checklist.md (04:13, 04:34, 04:47 addenda) and the reshoot list in pr46-24e3674.md.

## Rulings in force (decisions.md)
- art-ux/decisions.md 04:50: the CEO's D-07 amendment (b) applies. The dismissing tap is swallowed, and a pass-through buy is a MAJOR. That is B.
- product/decisions.md 04:50: D-HOP-2026-10-19-14 (v1.15, non-modal) is SUPERSEDED, and m4a-spec is now v1.16 (swallow). C is the non-shipping variant. It was reviewed only against v1.15, for information.
- D-CEO-20261019-10: capped at L30, so "Level N / 30" is correct. L31–55 and C1–C4 move to the follow-up.

## Verdict
- **B: REJECTED (set not reviewable at the head). The P46-M1 close is UNPROVEN.** No Major was seen in the build.
- **C: REJECTED (same gaps).** The P46-M1 close is UNPROVEN.

## Gaps that block both sets
1. **Wrong SHA.** The B manifest sha is aa59600 and the C manifest sha is bac1c27 (build-id m3-rc1-pre+aa59600 / +bac1c27). The heads c0bb3de/0d4c0fe come after these and add ae24de8/a1f7b07 (the P46-M1 fix) plus the docked-visibility fix. The shots therefore predate the fix they are meant to prove.
2. **Focus is not visible.** The focus-after-{escape,enter,card} 360 shots have the Upgrades sheet scrolled so that the tab row is out of frame, and there is no focus ring. They are pixel-identical in content to upgrades-tabs-360. The manifest says "focus ring on the Farm tab", but nothing shows it. Needed: the tab row in frame with a visible ring, or a document.activeElement assertion in the manifest.
3. **No focus shots at 1280 docked**, which is exactly the path c0bb3de/0d4c0fe changed. There is also no Got it close shot (only Esc and Enter, plus card for C).
4. **No 375 viewport.** Only 360/390/1280 were shot.
5. **No refund variant at 360**, and Got it ≥48 is not measured in the manifest.
6. **No reload, fresh-save or flag-off shots** (EXP-d, persistence).
7. **No pass-through evidence.** There are no coins/levels before and after a Buy tap while the card is up. B needs a swallowed tap. C needs an outside tap that registers and leaves the card open.
8. **No Best buy chip shot.** F3 is still not shown.
9. No 8s auto-dismiss or reduced-motion check.

## What passes from the shots
- §11 copy is verbatim: "Upgrades got an upgrade!" / "Hens and Egg value are now separate. Top them up!" / "Got it".
- No toast over the card, and no Welcome back under it, in the 360/390/1280 explainer shots.
- Tabs 36/44: manifest checks p36/h44 ×3. The tab row itself is not in frame in the 360 shots (Nit).
- Capped readout: "Level 9 / 30" and "Level 11 / 30" are correct per D-10.
- 3 engines are present. 1280 is docked:true.

## Code read (not a substitute for shots)
c0bb3de tracks-explainer.ts close(): it focuses `[data-tab].active` when that tab is rendered (getClientRects or not inside [hidden]), with preventScroll. Otherwise it focuses prev, then #collect. It only does this when focus was on the card. Tests were added. This looks correct for P46-M1.

## Minors / Nits
- Minor: no ★ Best buy chip (F3, carried over).
- Minor: no fade on close, and no coin pop on refund (carried over from #46).
- Nit: focus and tabs shots crop the tab row.

## Needed to close
Reshoot B at c0bb3de (C at 0d4c0fe optional, since it is superseded) with the manifest sha matching the head. Cover 3 engines × 360/375/390/1280 docked, and include: focus after Got it, Esc and Enter with the tab row and ring visible (plus activeElement in the manifest); refund at 360 with the Got it height; Buy tap before/after; reload, fresh save and flag off; and the Best buy chip.
