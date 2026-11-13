# UI screenshot spec check · 2026-10-17 03:23 CEST · UI/Visual Designer
Result: **PASS** for M4-A @ aa89076 (02:54 Major fixed; 02:54 items 2 and 4 closed; item 3 committed but not captured). PR #22 Firefox/WebKit + main baseline and B-2 PR #4 Firefox: no new issues. QA PR #16 functional shots are not usable evidence (harness run that never opened the offline popup).
Viewed with Read (montages + 3× crops); contrast computed from the state.json colours (WCAG formula).

## 1. M4-A tracks · aa89076 · Engineering (engineering/screenshots/m4a-aa89076/, 03:22)
Commit: game/ aa89076 "M4-A Art&UX 02:54 #1-#3" (src/ui/app.ts, src/ui/styles.css). Spec: art-ux/m4-tracks-copy.md v1.1 (lines 9–11, 19–24); layout-spec.md line 74 (qtag), line 110 (maxed), line 176 (toast).

PASS
- **Toasts (02:54 item 1, Major) closed.** tier-toast-{4of5,5of5}-360.png, milestone-toast-{hens,eggvalue}-360.png: the pill now draws above the Upgrades sheet scrim, top-centre at y=64 (HUD bottom 56 + 8), opaque `--c-meadow-strong` rgb(61,127,51), white Fredoka 16px, z 31, opacity 1 (state.json `*Toast`). 1280 docked: same pill under the HUD over the farm, no longer inside the brown bar. White on #3D7F33 = 4.9:1 (≥4.5 ✔). Copy unchanged and exact (lines 19, 24). Matches the "Coop upgraded!" host (seen in lock-360.png).
- **Edge customer vs tag (02:54 item 2, Minor) closed.** turned-away-customer-360.png: the leaving customer stays inside the strip outline at x≈330–345, below the `Full` tag, nothing past the viewport; docked it sits inside the strip at x≈690 under `Queue full`.
- **Queue-full / turned-away evidence (02:54 item 4) closed.** queue-full-tag-360.png shows 4 chips + `+6` with `Full`; queue-full-tag-1280-docked shows `Queue full`; turned-away frames show a customer leaving while full (state.json `qtag` right 344/860, `hits 0`, `ghostSeen: true`, `ghostInStrip: true`, one tag only). Docked Market now reads `(8s)`, raw-seconds repeat not present in this fixture.
- Unchanged and still PASS: goal pill (40px at 360 / 44px hit, chevron hidden <380px), locked row `Needs Farm L6` + CSS lock + aria, MAX as non-focusable SPAN + row aria, `Balanced farm 5/5 · +30%` with role="img" alt `Balanced farm 5 of 5. Top tier, +30% income.` (strip-5of5-text-alternative-*.txt), Farm tab at 360 and 1280 docked.

Still open (evidence only, not a fail)
1. **"Sold out!" bubble width (02:54 item 3).** The fix is committed (app.ts:375 `ghost(..., { text: 'Sold out!', cls: 'soldout' })` fires on `reason === 'timeout'`, CSS caps it at chip width and wraps), but the turned-away captures are a different event, so no bubble is on screen (state.json `bubbles: []`). Needed: one frame at 360 with ≥4 customers timing out at once (bubbles side by side, first chip at the left edge), plus 1280 docked.

M4-A sign-off: everything on the sign-off list is now evidenced (locked row + aria, MAX, 5/5 + toasts, Farm tab 360/1280 docked, strip text alternative). Recommend Head of Art & UX sign-off once the Sold out! capture confirms item 3.

## 2. Other new shots
- qa/m3-recheck/pr22-evidence/shots/{firefox,webkit}-{mixed,need}-{360,390}.png (8): same output as the 02:54 Chromium PASS (`1.8M`, `181.2B`, `$9.94M`, `$1T`, HUD `200B`, `Sell all (181.2B eggs · $666.8B)`). Known `Need 181.2B` clip / row ellipsis is Cut A v3 scope. **No new issues.**
- qa/m3-recheck/pr22-evidence/shots-main/chromium-*.png (4): main dfd53b9 baseline for comparison (shows old `$1000.2B`), not a PR build.
- qa/m3-recheck/b2-pr4-902f924/pr-firefox-tired-{direct,viaHireTip}-{360x740,390x640,1280x800}.png (6): same layout as the 02:24 Chromium PASS (tip under the worker row, clear of Manage; Coop upgraded toast clear). **No new issues.** Rule D still not built. firefox-{mixed,need}-*.png (10): fixture re-renders.
- qa/m3-recheck/pr16-offline-v2-5248dd9/shots/chromium-func-*.png (10): every frame shows the "A fresh start" save-recovery dialog, not the offline popup. QA summary.txt 03:22 already notes the seeded save was overridden and a rerun is going. **Not evidence; not reviewed against the offline popup spec.** My 03:00 PR #16 FAIL stands.
- Out of scope: qa/m3-recheck/pr13-release-check-8475bc4/shots/fonts-{firefox,webkit}-*.png (4, release check).
