# T-v5-refill-btn-48px: Workers-tab Refill bar and card buttons are 48px tall (rule 44<=h<46) [QA-D-1030-PR83-PASS F-A]
2026-10-30 12:35 CET · UI QA (edb6ef85) · Severity **Minor** (HoQ). Owner: UI e80556fd. Target 5.1. Not a v5 or #83 blocker.

## Finding
- `[data-act=manageAll]` (the Workers-tab Refill bar) and each card's `[data-act=manage]` (market_hand, coop_hand, hawker) measure **h = 48px**. The house layout rule is 44 <= h < 46.
- Coverage: all 3 engines (Chromium, Firefox, WebKit) × all 8 sizes (360/375/390/430, 1024x474, 1280x720, 1366x768, 1280). 24/24 cells FAIL.
- The tap-target floor (>= 44x44) IS met, and there's no scrollWidth clipping.
- **Pre-existing:** base 76390f2 also measures 48 (Chromium, 4 sizes). #83 (ba398b6) does not change it.
- **Root cause not isolated:** 48 = min 44 + 4px from the cascade. The source of the extra 4px (padding, border or line-height) wasn't traced, and no source was modified.

## Repro
1. Build ba398b6 (or 76390f2) with node v20.19.2 and serve it on a QA port.
2. Load a mid-game save with workers hired, then open the Workers tab.
3. Measure `getBoundingClientRect().height` on `[data-act=manageAll]` and on each `[data-act=manage]`. Expected 44 <= h < 46; actual 48.

## Evidence
- Report qa/m3-recheck/pr83-ba398b6-delta.md (sha256 d50240cc…0d1a), rows F-A and :58, :86, :90. Evidence qa/m3-recheck/pr83-ba398b6-evidence/ (SHA256SUMS 905c29f0…7b62).
