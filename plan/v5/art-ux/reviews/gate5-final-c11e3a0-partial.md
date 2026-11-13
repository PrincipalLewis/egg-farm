# Gate 5 final UI verdict (PARTIAL, deadline run), 2026-10-19 06:55 CEST

**Verdict: PARTIAL PASS. 0 Blocker/Critical/Major. Nothing held.** B-M1 (the only open Major) is closed on the data.

## What was reviewed and why
- The final B moved from ffc3dfd to **c11e3a0 (PR #49)**: a fast-forward that touches only `scripts/rc0-browser.mjs` (QA's G5 checks rewritten to v1.15). Shipped JS is byte-identical to ffc3dfd apart from the embedded build-id (QA, gate5-final-c11e3a0.md). QA reshot everything on c11e3a0, so I reviewed **qa/m3-recheck/gate5-final-c11e3a0/** (ffc3dfd set used only as reference).
- **Neither set has a manifest.json** (c11e3a0 still writing rc0 shots at 06:51). Per the 07:00 deadline rule I reviewed what exists: entries-<engine>.jsonl (QA's manifest entries), exp-final + exp-sheetclose jsonl/logs, rc0 logs (297/297 pass on all 3 engines), check-release-build (all ok), and the shots (84 per engine).
- Judged against m4-on-checklist.md with **m4a-spec v1.15 overriding EXP-a** (outside taps register; an outside-tap buy is correct).

## Checklist
1. **B-M1 focus on close: PASS (3 engines × 4 sizes, 72 cells).** activeElement: sheet closed at 360/375/390 → bottom-nav `data-nav=upgrades` "Upgrades" (Enter, Escape, click). Sheet open → active `[data-tab]` "Collection". 1280 docked (panel always open) → active `[data-tab]` "Collection". `#collect` never used. Tab row in frame in all C3 shots. rc0 G5 "close via Escape/Enter/card + focus on the active Upgrades tab" PASS at 360/390/1280.
2. **Card: PASS.** Shows alone: Welcome back first, card queued behind it ("never two dialogs" PASS); toast held while open and played after close. Got it 268×48 in all 12 cells, focus on Got it on open. Refund line readable at 360, nothing clipped (clipX []). §11 copy verbatim: `Upgrades got an upgrade!` / `Hens and Egg value are now separate. Top them up!` / `We refunded +$999.99B for your old upgrades.` / `Got it`. Card never covers Buy or Collect; outside Buy tap buys 1 and the card stays (v1.15 correct); outside Collect tap registers.
3. **Gone after reload: PASS** (countAfterReload 1; "EXP1 not shown again after reload" PASS). **New save: PASS** (C6, 12 cells). **Flag off: NOT SHOT** (gap).
4. **Tabs 36/44: PASS** (pill 36, hit 44 at 360/390; 119×44 at 960/1280). **`Level N / 30`: PASS** ("Level 6 / 30" in sheet and docked panel).
5. **QA C5-gate-readonly FAIL (all engines × sizes, "no card after writable"): not a Major.** As traced at 06:18, a refused write aborts the tracksV7 migration for the session (game.ts:206 → abortTracks, game.ts:176), so onTracksCommitted never fires and there's nothing to explain until the next load commits the migration. The migrated acdbedc save **does** show the card in every C1 shot (all 3 engines × 4 sizes), so the "card missing from the migrated save" Major does not apply.

## Minors / Nits (logged, no hold)
- **Minor (focus visibility):** after Esc at 360, focus is on nav Upgrades per activeElement but no visible focus ring shows on the nav button in the shot (firefox exp-C3-focus-closed-Escape-360x800). Check `:focus-visible` styling on `.nav` buttons in a follow-up.
- **Minor (overlap):** with the Upgrades or Market sheet open at 360, the card sits over the sheet title and 360px² of the close × (35px² at 390). hitIsClose=true and the sheet still closes, so not a Major.
- **Nit (test wording):** C5 should expect "card after reload once storage is writable", not "without a reload".
- **Nit (test method):** C4 refund>0 is build markup injected into the live card, not a real refund>0 save.

## Gaps (unproven at deadline)
- No manifest.json on either set; rc0 shot folders still filling (chromium 17, firefox 3, webkit 3).
- C5b (read-only, then reload with writable storage, card shows once) not run.
- Flag-off absence not shot.
- The EXP set covers migrated acdbedc and a new farm only. Mid L10 and L30 capped states aren't in this set.
- Real refund>0 save not shot (injected only).
