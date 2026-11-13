# P46-M1 reshoot review: B at c0bb3de (2026-10-19 05:35 CEST)
Set: /workspace/wt-ui-shots/m4-gate5-b-c0bb3de (81 PNGs + manifest.json rev 1, author Senior Engineer UI & rc1 Fixes, e80556fd).
Manifest sha c0bb3de7963e…800 = origin fix/m4-gate5-explainer head; build-id m3-rc1-pre+c0bb3de. SHA gap from the 05:20 review is CLOSED.
Checked against m4-on-checklist.md (04:13, 04:34, 04:47 addenda) and the pr46-24e3674.md reshoot list. Code delta: 24e3674..c0bb3de touches app.ts (6), tracks-explainer.ts (26), the test and the shot script; dd52bfd..c0bb3de src adds tracks-explainer.ts (+45) and tracks-ui.ts (+3).
Branch note: origin has NO rc/m4-t3-capped ref right now (ls-remote 05:35). Per engineering/status.md 05:32, Saves' local capped branch is at 0ee8831, not pushed. The final B RC SHA set is still owed; this set is the #46 explainer head only.

## Verdict: INCOMPLETE, not a pass. No build Major seen. EXP-b (P46-M1), EXP-c refund and EXP-d flag-off remain UNPROVEN. Nothing held on a defect.

## Passes (evidence in shots)
- 3 engines × 360/375/390/1280; 1280 docked:true. 375 now present.
- Explainer alone in all 3 engines at 360/375/390/1280: no toast over it, no Welcome back under it, nothing clipped at 360.
- §11 copy verbatim: "Upgrades got an upgrade!" / "Hens and Egg value are now separate. Top them up!" / "Got it".
- Got it height at 360 (no refund): measured 48px outer (border rows 164–211) in all 3 engines. At the 48 floor exactly.
- EXP-a swallow (D-07 amendment b): buy-tap shots in 3 engines × 4 sizes, manifest F0=10, F1=10, "0 bought", card closed.
- 1280 docked Got it: manifest focus = "collection" = the active Upgrades tab (Collection). Matches EXP-b for the docked path.
- After reload: card gone (3 engines × 4 sizes). Fresh/new save: card absent (3 engines × 4 sizes).
- Tabs: manifest checks p36/h44 ×3 per shot; tab row visible and fine at 1280.
- Capped readout "Level N / 30" correct per D-CEO-10.

## Still unproven (reshoot needed to close)
1. **EXP-b keyboard focus ring (P46-M1).** focus-after-escape/enter exist only at 360, and they show the Upgrades sheet scrolled so the tab row is out of frame, with no ring and no activeElement field in the manifest (same gap as 05:20). No Esc/Enter shots at 375/390/1280 docked.
2. **EXP-b on mobile Got it.** Manifest focus = "collect" at 360/375/390 ("sheet closed"). That's c0bb3de's documented fallback when the active tab isn't rendered. Acceptable if the card only shows over the farm on mobile, but this needs an HoAUX ruling that #collect counts as "returns to the Upgrades tab" on mobile.
3. At 1280 Got it, no visible ring on Collection (a mouse click, so no :focus-visible is expected). Fine, but the keyboard path must show one: see 1.
4. **EXP-c refund at 360.** The refund-line-360 shots in all 3 engines show the open Upgrades sheet with NO card at all. The refund line and Got it ≥48 with the refund are not shown. Script or timing issue suspected (hunch), so this isn't counted as a build Major.
5. **EXP-d flag off.** No flag-off shot.
6. **"Next tap buys"** after the swallowed tap is not shown (only the 0-bought half).
7. No mid L10 / L30-capped / migrated-acdbedc labels in the manifest; every shot uses m2-rc1-v5-12min.json. The migration/L30 matrix is owed by the final B RC set.
8. Not shown (carried): 8s auto-dismiss, reduced-motion 150ms fade, ★ Best buy chip (F3).

## Minors / Nits (logged, not held)
- Minor (carried): no ★ Best buy chip (F3).
- Minor (carried): no fade on close and no coin pop on refund.
- Nit: tabs/focus 360–390 shots still crop the tab row.
- Nit: Got it is exactly 48px; no headroom if the refund line adds padding.

## Needed to close
Reshoot at c0bb3de (or the final B head): Esc and Enter at 360/375/390/1280 docked with the tab row in frame and document.activeElement in the manifest; the refund card actually open at 360 with Got it height measured; flag off; the Buy tap swallowed then the next tap buys (coins/levels before and after); plus the HoAUX ruling on #collect as the mobile focus target. Then the final rc/m4-t3-capped set (once pushed) with fresh / mid L10 / L30 capped / migrated acdbedc.
