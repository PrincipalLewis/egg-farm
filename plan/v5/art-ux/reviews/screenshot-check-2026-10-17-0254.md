# UI screenshot spec check · 2026-10-17 02:54 CEST · UI/Visual Designer
Result: **FAIL** for M4-A @ 14ba6e9 (1 Major, 2 Minor, plus 2 captures that don't show the state they're named for). PR #22 money format, PR #20 save-recovery and PR #12 QA set (7e70a2e): PASS / no new issues.
Viewed with Read (montages + 2–4× crops); contrast measured from PNG pixels with PIL.

## 1. M4-A tracks · 14ba6e9 · Engineering (engineering/screenshots/m4a-14ba6e9/, 02:33–02:54)
Spec: art-ux/m4-tracks-copy.md v1.1 (lines 9–11, 19–24); layout-spec.md line 74 (S2-6 qtag), line 110 (maxed), line 176 (toast placement); m3-next-goal-spec.md lines 44–45.

PASS
- Goal strip (goal-strip-{360,1280-docked}.png + crops, state.json `goal`): pill back, 2px border, white bg, `Ready!` chip inside; pill 40px at 360 with 44px hit, 44px docked; chevron hidden below 380px and shown docked (m3-next-goal-spec.md line 45 ✔). 01:55 Major stays closed.
- Locked row (lock-{360,1280-docked}.png): `Needs Farm L6` with a CSS lock glyph in Dust (12px, no emoji), no cost/button, full opacity; aria `Hens, level 8, locked. Needs Farm level 6.` (m4-tracks-copy.md lines 9, 11 ✔). 01:17 lock-emoji Nit **closed**.
- MAX (max-rows-5of5-strip-{360,1280-docked}.png, state.json `max`): `--c-yolk` pill, `--c-text` label, no shadow, rendered as SPAN, tabIndex −1, `maxButtons: 0`; row aria `Hens, level 30, max.` (line 10; layout-spec.md line 110 ✔). 01:17 item 1 **closed**.
- 5/5 strip + text alternative (strip-5of5-text-alternative-*.txt): `Balanced farm 5/5 · +30%`, `role="img"`, aria `Balanced farm 5 of 5. Top tier, +30% income.` (lines 20, 23 ✔).
- Toast copy (tier-toast-{4of5,5of5}-*, milestone-toast-{hens,eggvalue}-*): `Balanced farm 4/5: +25% income`, `Balanced farm 5/5: +30% income`, `Hens L20: bigger coop · offline ×1.5`, `Egg value L10: Large ×1.25`: exact strings per lines 19, 24 ✔; state.json shows all four toasts fired. 01:17 item 4 copy is now evidenced.
- "Full" tag at 360 (seen in max-rows-5of5-strip-360, tier-toast-*-360): reads `Full`, straddles the strip's top outline at right, covers no chip and not the "+6" tile (layout-spec.md line 74 ✔). The duplicate clipped `Queue fu…` tag from 01:17 item 3 is gone.

Change list
1. **Major · tier and milestone toasts are unreadable: under the sheet scrim at 360, on top of the HUD bar when docked.**
   - 360 (tier-toast-4of5-360.png, tier-toast-5of5-360.png, milestone-toast-*-360.png): the toast pill draws *below* the Upgrades sheet's dim scrim, at y≈160 over the queue strip (5/5 overlaps the chips). Measured text/bg contrast 1.4:1 (4/5) to 2.8:1, against 4.5:1 required.
   - 1280 docked (tier-toast-*-1280-docked.png, milestone-toast-*-1280-docked.png): the pill sits *inside* the brown HUD bar (y≈8–28), translucent olive on brown with beige text, 1.8:1 to 2.4:1.
   - Spec: layout-spec.md line 176 (reused by m4-tracks-copy.md line 19, "Coop upgraded!" style): shown **above any open sheet** (z-index over panels), **top-centre under the HUD**, pill, `--c-meadow-strong` (#3D7F33) bg, white Fredoka 16px, slides down, auto-hides by 2.5 s, `pointer-events:none`. The PR #20 save-recovery shots on main show "Coop upgraded!" drawn correctly over a modal, so the M4-A toasts likely aren't using that same toast layer.
   - Fix: render the M4-A tier and milestone toasts through the existing "Coop upgraded!" toast host (same z-index above the sheet scrim, `top: HUD height + 8px`, opaque meadow-strong bg, white 16px). If the frames were taken mid-fade, also re-shoot at full opacity (about 400–600 ms after trigger) at 360 and 1280 docked, with the sheet open.
2. **Minor · a customer drawn at the right viewport edge overlaps the "Full" tag at 360.** max-rows-5of5-strip-360.png and tier-toast-5of5-360.png: a leaving or turned-away customer figure at x≈334–360 overlaps the tag's right end and is cut by the viewport. Fix: keep leaving/turned-away customers below the tag (`.qtag` z-index above them, or exit below the strip outline), and clip them to the strip so nothing draws past the viewport.
3. **Minor · "Sold out!" bubbles at 360 are wider than the 56px chips.** turned-away-customer-360.png: neighbouring bubbles touch or overlap and the first bubble's left border is cut at x=0. Fix: cap the bubble at the chip width (56px at 5 chips, 12px Fredoka is enough), or use a shorter label when ≥4 bubbles are shown, and keep the bubble inside the 12px strip padding.
4. **Missing evidence · queue-full tag and turned-away captures don't show their states.** queue-full-tag-{360,1280-docked}.png show an empty queue with no tag; turned-away-customer-1280-docked.png shows 4 chips + "+2" with no tag and no turned-away customer; state.json has `qtag: null`, `turnedAway.ghostSeen: false`. Needed: queue at capacity with the tag at 360 and 1280 docked, and one frame with a turned-away customer leaving while the queue is full.
- Repeat, already tracked (Cut A v3 item 6): queue-full-tag-1280-docked.png Market reads `Next customer soon... (999970s)` (raw seconds).

M4-A sign-off still needs: item 1 fixed and re-shot; items 2–4.

## 2. PR #22 money format · qa/m3-recheck/pr22-evidence/ (pr 3609b9d merged with main dfd53b9, build 1978b82)
shots/chromium-{mixed,need}-{360,390}.png + fmt-edges.log: `1.8M`, `181.2B`, `$9.94M`, `$1T`, HUD `200B`, `Sell all (181.2B eggs · $666.8B)`; fmt-edges hard-fails 0, rollups 999.95K→1M and 999.95B→1,000T correct. **PASS for the format scope.**
- Known, not caused by PR #22 (base lacks Cut A v3): `Need 181.2B` clips to `leed 181.2` in the 80/88px button and the row value is ellipsised (` · $9.9…`, ` · $1T` cut at 360). Covered by Cut A v3 (MK-35 `No eggs`, 22:31 #3) and the order-line overflow rule v1.1. QA's layout-chromium.log Sell-preview/aria "FAILS" test the rc2 preview that isn't in this build.
- Question for QA (not a fail): Sell all values 181.2B eggs at $666.8B while order 3 alone shows 181.2B eggs · $1T. Confirm the fixture pricing is intended.
- Negative values (INFO in fmt-edges.log: `$-1.50`, `-12,345`): no negative money is shown in UI today; flag if that changes.

## 3. Other new shots
- qa/m3-recheck/pr20-evidence/shots/chromium-{360x740,390x844,1024x474,1280x800}-{fresh,restored,storage,cantsave}.png (16, f1e24d4): match save-recovery-dialog.md v2.1/v2.2 (titles, bodies, badges, outlined Export, restored Export link only with an old main save); dlg-layout log all PASS, targets ≥44px. **PASS.**
- qa/m3-recheck/pr12-7e70a2e/{chromium,firefox}-{360,1280}-*.png, *-func-on-after-hire.png (26): same build as the 02:19 PASS; nudge one line, New dot clears "Workers", flag-off has no nudge. No new issues.
- Re-renders / out of scope: qa/m3-recheck/b2-pr4-902f924/rc0-shots/{save-recovery-v4-*,b2-tired-normal-*,m3-rc0-*}.png and later re-renders of logged names; qa/m3-recheck/b2-pr4-572864a/pr-firefox-tired-*.png (superseded SHA); qa/m3-recheck/pr13-release-check-8475bc4/shots/fonts-chromium-{file,http}.png (release check).
