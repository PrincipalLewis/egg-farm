# Screenshot spec check, 2026-10-17 12:19 (UTC+2)

Verdict: **PASS** for PR #40 (PM4-P3 Collection card fix) @ 462a071. No Blocker, Critical or Major. 1 Minor and 2 evidence notes logged; nothing held.

Context: #3 dropped/parked at 12:06 (engineering/status.md:491); #40 replaces Cut A for PM4-P3 (HoQA QA-D-1017-8). #37 dropped. RC is cut from main after #40.

## Set reviewed
`qa/m3-recheck/p3-fix-462a071/` with manifest.json (PR 40, branch fix/p3-collection-card-375, sha 462a071, build label m3-rc1-pre+462a071 checked, created 12:17). 65 entries, all files present. Chromium, Firefox and WebKit at 360x800, 375x700, 390x844 (Chromium also 375x800 and rc0 375x667). Baseline main af5e3ab is comparison-only.

Change: `.hint.coop` became `.hint.limit{position:static}` and the sprite rule is scoped to `.scene .coop` (styles.css), plus a unit guard (tests/p3-collection-card.test.ts).

## Checks
| Check | Result |
|---|---|
| Overlap 'Need $X more' vs 'Limited by coop' (375) | Fixed. Probe `ov:[]`, `outCard:[]` in all 3 engines at 360/375/390, capped and normal. Baseline af5e3ab overlapped at 375 (172x16px) and spilled out of the card at 360/390. |
| Copy | 'Need $75.5K more', '🏠 Limited by coop · Upgrade Farm →' match spec; numbers abbreviated ($75.6K). |
| Icon plus text | House icon + text on the limit line. PASS. |
| Contrast tokens | Limit line uses --c-wood-text on the cream card, same as the Need line. PASS. |
| Buy button tap target | 224/239/254 x 48px. PASS. |
| Fit / no horizontal scroll | scrollWidth = clientWidth at 360/375/390 in all engines. PASS. |
| Scene sprite still absolute and loaded | `pos:absolute`, loaded, 158/165/172px in Fx/WK. PASS (no regression from scoping). |
| Farm card overlap (probe) | `ov:[]` all engines. PASS. |
| Normal (not capped) state | Need line only, no limit line. PASS. |

## Logged (not held)
- **Minor M-P3-1**: the 'Upgrade Farm →' text link hit area is 93x16px in all engines (was 72x32 before), below the 44px rule. Pre-existing class of issue, secondary path (Farm tab is reachable). Suggested fix after RC: min-height 44px or a padded ::before hit area on `.hint .link`. Not sent to engineering (Minor, freeze).
- **Evidence note E-1**: the Firefox/WebKit full-page shots show the Farm tab although the manifest labels them 'Upgrades>Collection' (probe.mjs switches to Farm before the page screenshot, and the Collection card crop is Chromium-only). The Collection card in Fx/WK is verified by probe geometry, not by pixels.
- **Evidence note E-2**: no 1280 docked shot in the set. Low risk: the fix only changes the hint to normal static flow on a wider card. Should be covered by the final RC 3-engine set.

## Not reviewed
- /workspace/wt-ui-shots/v3main (+ rc0-firefox/webkit, 11:58-12:05): #3 fwd-merge, dropped 12:06, out of scope.

Still waiting on: final RC 3-engine set from main after #40 with manifest (incl. 1280 docked); worker-asleep display; #12/L30+ C2 only if it ships with UI changes.
