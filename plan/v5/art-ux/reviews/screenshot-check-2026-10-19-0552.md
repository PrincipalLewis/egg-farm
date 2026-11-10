# Screenshot spec check, 2026-10-19 05:52 CEST: NO NEW IN-SCOPE SHOTS, nothing held

## B SHA
- origin `rc/m4-t3-capped` = **ffc3dfd** (pushed 05:31). Saves' local branch is still 0ee8831; origin is 0ee8831 + 085af12 + ffc3dfd.
- 085af12 ports the v1.15 non-modal explainer (bac1c27) onto capped and drops the swallow (2c34044). This matches decisions.md 04:46 (later): v1.15 / D-HOP-14 is final. The saved prompt's "Buy tap while the card is up buys nothing" check is stale. On B the check is now: an outside tap registers normally, and only the tap that closes the card does nothing else.
- ffc3dfd (B-M1 fix): focus after close goes to the bottom-nav Upgrades tab when the sheet is closed, to the active tab when it's open, and to #collect only as a last resort. This should settle the mobile focus=#collect question from 05:35.
- Diff vs c0bb3de (last reviewed B): src/ui/app.ts, tracks-explainer.ts, next-goal.ts, tracks-ui.ts, sim/tracks.ts (68+/79-, no styles.css). vs 24e3674: 86+/83- across 13 files. vs dd52bfd: explainer, F2 tab CSS, refund line, balance.json and save/migrate changes.

## Seen, rejected unreviewed (no manifest.json)
- qa/m3-recheck/gate5-final-ffc3dfd/: QA's final Gate 5 run on ffc3dfd. **In progress**: chromium/ has 60 PNGs, firefox/ has 1, no WebKit yet. Its exp-final-chromium.log reports `C5-gate-readonly: no card after writable` FAIL at 360/375/390/1280. That's QA's functional probe, not a shot finding. Check it on the manifest set: the card should appear once the save becomes writable.
- qa/m3-recheck/gate5-final-prep/preview-B-0ee8831/ (main 60, ext 6, rc0 16): a preview at the superseded 0ee8831.
- qa/m3-recheck/gate5-final-prep/refund360-c0bb3de/ (4 PNGs, NOTE.md): QA's probe of the refund line on c0bb3de with injected markup, which they call a shot-script artefact. It's consistent with B-M2 being cleared at 05:30.

## Already reviewed
- wt-ui-shots/m4-gate5-b-c0bb3de (05:35) and m4-gate5-b-c0bb3de-refund (05:30).

## Next
Review gate5-final-ffc3dfd once it has a manifest.json, across all 3 engines × 360/375/390/1280 docked × fresh/L10/L30 capped/migrated acdbedc. Focus checks: the v1.15 pass-through, focus to the bottom-nav Upgrades tab on mobile and to the active tab at 1280 (ring in frame), the refund card at 360, Got it ≥48px, the card gone after reload / on a new save / with the flag off, C5 read-only gate, tabs 36/44, and the §11 copy verbatim.
