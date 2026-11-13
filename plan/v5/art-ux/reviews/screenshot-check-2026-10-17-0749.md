# Screenshot spec check — 2026-10-17 07:49 (UI/Visual Designer)

**Verdict: PASS on new captures.** Closes the 04:10/04:22 Minor on PR #4 (standalone Manage tip over Market at 1024x474). No new change items.

## 1. PR #4 B-2 Manage tired-tip anchoring @ 4e47d77 (engineering/status.md:413; shots /workspace/wt-ui-shots/b2-v4/{,firefox/,webkit/}, 34 PNGs)
- b2-skip-manage-1024x474.png (Chromium, Firefox, WebKit identical): 'Tap **Manage** to perk them up!' now sits directly above the Manage button (hand pointing down, ~8px gap), inside the Upgrades panel, right edge inside the panel, not over the Market panel or header. **04:10 Minor CLOSED** (was l=681–968, t=204–272 over Market at 192f273).
- b2-guard-skip-1280x720.png: Manage tip above Manage, ~7px under the Collection/Farm/Workers tablist, clear of tabs. PASS.
- b2-tired-{normal,direct,click}-{360x740,390x640,1280x600,1280x720,1280x800}.png: 'Workers get tired over time.' below Manage inside the Workers list, in viewport at every size, clear of the 'Coop upgraded!' toast and tablist. Same layout as the 02:24/04:22 PASS. PASS.
- Nit (no change asked, Head to note): at 1024x474 and 1280x720 the down-pointing Manage tip covers the 'Market Hand · Working' name and Energy line while it shows. Acceptable for a transient coach tip; the tip points at the control it names.
- QA's qa/m3-recheck/pr4-b2-4e47d77.md says 'no tip at 1280x720/600/1024x474 by design'; the engineer shots above show the Manage tip at those sizes. QA's own shots/ folder is still empty, so QA's browser result is pending; worth a QA confirmation of which path their probe exercises.

## 2. PR #28 Sell all + Grader @ f7642c9 — WebKit (qa/m3-recheck/pr28-sellall-grader-f7642c9/webkit-{360,390}-t1-orig.png, 2)
'Sell all (181.2B eggs · $608.8B)' on one line at 360/390, button 56px tall, matches the Chromium/Firefox PASS. Engine parity PASS.

## 3. Re-renders (rc0 + save-recovery v4), PASS
- qa/m3-recheck/pr16-offline-v2-0470045-evidence/shots/rc0-chromium/*.png (10): match baseline (rc0 204/204).
- art-ux/reviews/pr25-c9a1f4b-m1-deactivate/*.png (10): match baseline. Its logs/rc0-chromium.log reports "Tab guard 'Play here' min-height 48px at 360 — 48" at c9a1f4b, so the PR #25 Play-here Minor (06:16) looks fixed on DOM; it closes once an m1-deactivate PNG at the fix SHA exists (none in that folder yet; the rc0 run also has 1 harness throw in hiddentabguard: Animation.finish on an infinite animation, 203/204 — harness, not UI).

## 4. Not evidence
- qa/m3-recheck/toast-pr5-37524aa/chromium-midfade-re+100ms-{360x740-banner,390x640-nobanner,1280x800-banner,1280x800-nobanner}.png (4): no toast in frame; QA marks this re-trigger run invalid (summary.txt 07:37, 2nd buyFarm doesn't toast; v2 rerun queued). The 07:22 PASS on the first-toast mid-fade shots stands.

## Still open / waiting
PR #16 0470045 fix re-shoot (360x420 cap line, 320x568 toast over card); PR #25 m1-deactivate PNG at c9a1f4b (or the PR #25 fix SHA); build label carry-over; paused 'Sold out!' frame; B-1 Coop full SHA/screenshot (PM Workers); B-3 compact Farm card + v1.6.1 goal label (Cut A v4); Refill nav fix (Market Hand only asleep).
