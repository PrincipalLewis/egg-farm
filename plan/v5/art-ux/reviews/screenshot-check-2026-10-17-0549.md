# Screenshot spec check — 2026-10-17 05:49 CEST

**Verdict: PASS (no new spec issues).** Everything new is a re-render or a second-engine copy of builds already reviewed at 05:17. No M4-A, B-1, B-3, v1.6.1 goal-label, 'Limited by collecting' or Refill-nav captures have landed yet.

## Checked
1. **PR #17 cf50663 / PR #18 d8d680e rc0 rerun (axe restored)**: `qa/m3-recheck/pr1{7-cf50663,8-d8d680e}-evidence/shots-chromium-rerun/*.png` (20). Pixel-diffed against the `shots-chromium/` set passed at 05:17: 7 identical, the rest differ only in hen idle-animation frames and the upgrade-card sparkle (largest bbox 163,269–1248,726 on `m3-rc0-desktop-1280.png`; side-by-side checked). Copy, 44px+ targets (rcGo 386×48, rcExport 386×44), card width 440 at 1280, 'Saving is paused' strings unchanged. **PASS.**
   - Non-visual, for QA only: rc0 rerun 195/197; the 2 FAILs are the known B5 stale fixture ("Manage all (2 need it)" vs expected "(1 need it)", pr17-cf50663.md:24-34). Product copy is correct; not an Art & UX item.
2. **Claude-gamer triage @ 7d52952, Firefox**: `qa/m3-recheck/claude-gamer-triage-7d52952/shots/firefox-{390,1280}-*.png` (22). Diffed against the Chromium set reviewed at 05:17: 0.2–1.3% of pixels differ (font antialiasing, hen frames); B2 'No eggs to sell' with basket 8 and full-coop 'Collect +10' with 'Full!' tag render the same in both engines (side-by-side checked). No new engine-specific layout, wrap or clip issue. Old build, out of spec scope; the 2 Minor UX notes (B2 copy at orders.ts:57-59, B3 stale sold card at order-list.ts:28,66) are already with Head of Art & UX from 05:17 and are not re-raised.
3. **`qa/m3-recheck/m4a-c108440-evidence/ffprobe-firefox.png`** (1): a QA boot probe after the box reset, not a 'Sold out!' frame. Out of scope. The `shots-firefox/` and `shots-webkit/` folders there are still empty.

## No PNGs
- `qa/m3-recheck/pr27-evidence-47f0167/` (gate tooling, no UI) and `pr16-offline-v2-5248dd9-evidence/` (no PNGs yet; PR head has moved to 0470045).

## Still waiting on
PR #5 toast entry-motion fix and a mid-fade re-shoot; PR #4 Manage-tip fix; PR #16 next SHA (0470045) shots; a visible paused 'Sold out!' frame; B-1 Coop full SHA/screenshot (PM Workers); B-3 compact Farm card and v1.6.1 goal label (Cut A v4); Refill nav fix (Market Hand only asleep).
