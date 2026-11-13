# UI screenshot spec check · 2026-10-16 21:45 · UI/Visual Designer
Routine run. New screenshots since the 21:03 run (log: reviews/screenshot-check-log.md).
Builds: M4-A **677317d** (m4/m4a-tracks-v3, verdict SHA) and **3351d6c** (v2, superseded); **7d52952** Firefox pass (fix/rc1-qa-bugs-v4).

## Verdict: PASS (nothing fails against my specs); M4-A coverage is partial
| # | Item | Spec | Result |
|---|---|---|---|
| 1 | M4-A Farm tab @677317d, 375, Chromium + Firefox (WebKit 375 fresh farm) | m4-tracks-copy.md v1.1 | **PASS** for every state shown |
| 2 | M4-A @3351d6c (v2) | same | same render as v3 (superseded), PASS |
| 3 | B-1 Coop full @7d52952, Firefox 360 + 1280 | b1-coop-full-copy.md §1–§5 | **NOT IN BUILD** (same as Chromium at 21:03); badge fit passes |
| 4 | rc1-ui Firefox extras @7d52952 (m1-181B ×5 widths, tut1-cardtap ×3 docked, b4-release-perf) | m3-customer-queue-spec.md | PASS (QA extra-firefox.log all PASS) |

## 1. M4-A @677317d: PASS
Evidence: qa/m3-recheck/m4a-v3-677317d-smoke/{chromium,firefox}-2-farm-tab.png (mid-game save F19/H19/V13, 375×812), webkit-6-farm-375.png; report qa/m3-recheck/m4a-v3-677317d-smoke.md.
- Balanced strip: `Balanced farm 2/5 · next +20% at all ≥ 15` matches m4-tracks-copy.md:18. Values are right: m = min(19,19,13) = 13, so k = 2, N = 15, x = 20 (m4a-spec.md:95). One line at 375.
- Segments: 3 (one per track, m4a-spec.md:143). Egg value is filled ~88% (93/106px ≈ 13/15) ✔. The weakest segment has a 2px #F29E1F outline (`--c-yolk-dark`), so the cue is not colour alone (m4-tracks-copy.md:21) ✔.
- Effect lines: `Eggs/s 20 → 21`, `Egg price $6.07 → $6.55` (m4-tracks-copy.md:27) ✔. The green arrow is decorative; the numbers carry the meaning.
- Milestone hint: Hens shows `Next at L20: bigger coop · offline ×1.5` (1 level away, ×1.5 at H20 per m4a-spec.md:91) in muted small text ✔ (m4-tracks-copy.md:28). Egg value shows no hint, which is correct: the next grade is L20 (m4a-spec.md:92), 7 levels away (> 5).
- Best-payback outline is on Egg value, using `--c-yolk-dark` (style-direction.md:31) ✔. Buy buttons are ~240×48px ✔. Costs `$5,262.00` / `$1,955.00` follow the shared formatter (full digits under $10K, game/src/ui/format.ts:9; layout-spec.md:65) ✔.
- Tabs: the visual track measures 34px at 375, but `.tabs button` has `min-height:44px` with `margin-block:-4px` in the build CSS, so the hit area is 44px ✔ (layout-spec.md:90 asks 44px tall; info only).
- No horizontal scroll at 375 (QA check 6, 5/5) ✔. Chromium and Firefox renders are identical.

**Not covered by these shots (needs captures before M4-A sign-off):**
1. Locked row `Needs Farm L{n}` with lock glyph and Dust text at full opacity, plus its aria-label (m4-tracks-copy.md:9–11).
2. `MAX` row with no hint (m4-tracks-copy.md:10, :28).
3. Top tier `Balanced farm 5/5 · +30%` and the tier/milestone toasts (m4-tracks-copy.md:19–23).
4. Fit at **360** and **1280 docked** for the Farm tab (the longest line, the Hens hint, is the one to watch at 360: Nunito 13px inside the row text column).
5. Strip text alternative `Balanced farm 2 of 5. Weakest: Egg value, level 13 of 15.` (m4-tracks-copy.md:22): needs a DOM/aria dump, not a screenshot.

## 3. B-1 Coop full @7d52952 Firefox: not in build
Evidence: rc1-qa-bugs-v4-7d52952/firefox-b1-{coopfull,badge}-{360,1280}.png, extra-firefox.log.
- Same as Chromium (screenshot-check-2026-10-16-2040.md §3): badge reads `Full!` (39.6px), no ⚠, no aria, no rate chip, no hint (`b1BuildPresent:false`). Badge sits inside the coop box and the viewport at 360 and 1280, clear of the roof, with no overlap (8 samples each) ✔.
- Still waiting on PM Workers' B-1 SHA for the 360 roof-clearance and aria-suffix checks (b1-coop-full-copy.md:57).

## Out of scope / no review needed
- qa/m3-recheck/logs-4bf4a22/tg-*.png (12): single-tab guard dialog, 3 engines × 1280/360/320×568/320×300 rm. Not in this routine's spec list; glanced at 360 (one-line button, copy readable, nothing clipped).
- m4a-*-smoke/*-2-sell-step.png: m3 tutorial Sell step (unchanged); downgrade-downgrade.png: a01faea main build (M4 off).
