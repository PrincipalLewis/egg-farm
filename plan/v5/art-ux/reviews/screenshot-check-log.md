# UI screenshot spec check log (UI/Visual Designer)
Scope: M4-A (vs m4-tracks-copy.md v1.1), m3/rc1-ui, B-1 Coop full (vs b1-coop-full-copy.md), 'Limited by collecting' overlap fix (vs rc2-notes-b2-b3.md), v1.6 goal label (vs rc1-upgrade-value.md v1.6).
Rule: a screenshot is "new" if its folder/file is not listed below. File mtimes are not reliable (whole workspace was re-copied 2026-10-16 20:02–20:03).

## 2026-10-16 20:10 baseline (routine first run, no review needed)
- No screenshots exist yet for M4-A, B-1 Coop full, the 'Limited by collecting' fix, or the v1.6 goal label (searched all of /workspace/egg-farm-studio).
- Baseline, already reviewed or out of scope, not re-checked: everything under engineering/screenshots/ (incl. artux-m3-rc1-ui-fc8e1cf, reviewed in reviews/rc1-ui-fc8e1cf.md), engineering/triage/, game/qa-out/, game/qa/, qa/m2-shots, qa/m3-shots, qa/m3-pt1, qa/m3-rc0, qa/m3-webkit, qa/m3-recheck/* (incl. rc1-ui-aa66bdb, rc1-ui-14b28f8, rc1-ui-fc8e1cf, cut-a-1371305, save-recovery-dialog-a01faea, mk24-1-*), qa/claude-gamer/*, qa/claude-qa/*, product/critic/shots, art-ux/* own mocks and assets. 1,901 images in total.
- qa/m3-recheck/rc1-qa-bugs-v4-7d52952/ has logs only, no images.

## 2026-10-16 21:03 run → reviews/screenshot-check-2026-10-16-2040.md (FAIL: 1 Major, 1 Minor)
Checked (new since baseline):
- qa/m3-recheck/cut-a-1371305-artux-triage/*.png (84: 1371305 / 8932a01 / 737c2cf farmcard ×3 engines ×3 widths, goal-eggvalue-360 ×3)
- qa/m3-recheck/rc1-qa-bugs-v4-7d52952/*.png (33) and rc0-shots/*.png (10)
- qa/m3-recheck/release-confirm-m3-rc1-dialog/shots/*.png (24, out of scope)
- art-ux/mocks/ new files (own mocks, out of scope)

## 2026-10-16 21:45 run → reviews/screenshot-check-2026-10-16-2145.md (PASS; M4-A coverage partial)
Checked (new since 21:03):
- qa/m3-recheck/m4a-v3-677317d-smoke/*.png (8) and m4a-v2-3351d6c-smoke/*.png (8)
- qa/m3-recheck/rc1-qa-bugs-v4-7d52952/firefox-{b1-badge,b1-coopfull}-{360,1280}.png, firefox-m1-181B-{360,375,390,430,1280}.png, firefox-tut1-cardtap-{1024x474,1280x720,1366x768}.png, firefox-b4-release-perf.png (13)
- qa/m3-recheck/logs-4bf4a22/tg-{chromium,firefox,webkit}-{1280x800,360x640,320x568,320x300-rm}.png (12, out of scope)

## 2026-10-16 22:10 run (no new UI screenshots; no review, nothing sent)
Logged so later runs skip them; both are byte-identical copies of baseline images (md5 match), not new captures:
- ops/claude/smoke-checks/rc1-ux-clarity-ccd7bf9/smoke-2026-10-16T19-45-33-123Z.png (= ops/claude/smoke.png, tooling smoke shot, out of scope)
- qa/scratch/pr1-e845cf3/docs/readme/{header,screenshot-desktop,screenshot-farm,screenshot-workers}.png (= repo README images, same as scratch/artux-main, wt-v4, game-rc1-bugs-v3 docs/readme; out of scope)
- Baseline-era repo README copies also covered: game-rc1-bugs-v3/docs/readme, wt-v4/docs/readme, scratch/artux-*/docs/readme, ops/claude/smoke.png.
Still waiting on: M4-A remaining sign-off shots, B-1 Coop full SHA/screenshot (PM Workers), B-3 compact Farm card SHA (UI engineer), 'Limited by collecting' fix, v1.6.1 goal label.

## 2026-10-16 22:31 run → reviews/screenshot-check-2026-10-16-2231.md (FAIL, Minor: order card at 360 + Need 181.2B wrap)
Checked (new since 22:10):
- qa/m3-recheck/rc1-qa-bugs-v4-7d52952/webkit-{mixed,need}-{360,375,390,430,1280}.png (10)
- qa/scratch/pr1-cf66ce5/docs/readme/{header,screenshot-desktop,screenshot-farm,screenshot-workers}.png (4, md5 = pr1-e845cf3 README copies, out of scope)
- Also re-looked at chromium-need-360.png (already logged) for the Need-state finding.
Still waiting on: M4-A remaining sign-off shots, B-1 Coop full SHA/screenshot (PM Workers), B-3 compact Farm card SHA (UI engineer), 'Limited by collecting' fix, v1.6.1 goal label.

## 2026-10-16 22:55 run → reviews/screenshot-check-2026-10-16-2255.md (PASS; WebKit extras @7d52952)
Checked (new since 22:31):
- qa/m3-recheck/rc1-qa-bugs-v4-7d52952/webkit-{b1-badge,b1-coopfull}-{360,1280}.png, webkit-m1-181B-{360,375,390,430,1280}.png, webkit-tut1-cardtap-{1024x474,1280x720,1366x768}.png, webkit-b4-release-perf.png (13)
- qa/scratch/pr1-96c4a1e/docs/readme/{header,screenshot-desktop,screenshot-farm,screenshot-workers}.png (4, md5 = pr1-cf66ce5 README copies, out of scope)
Still waiting on: M4-A remaining sign-off shots, B-1 Coop full SHA/screenshot (PM Workers), B-3 compact Farm card SHA (UI engineer), 'Limited by collecting' fix, v1.6.1 goal label.

## 2026-10-16 23:25 run → reviews/screenshot-check-2026-10-16-2325.md (FAIL, Minor: sticky Refill bar over banner at 360)
Checked (new since 22:55):
- qa/m3-recheck/cuta-ux-extras/chromium-{360,1280}-{1-closed-nav,2-workers-sheet,2a-unpaid-banner,2b-grader-banner,2c-grader-viewport}.png (10, d56033f)
- qa/trial-qa-bot/{chromium,firefox}/01-load … 10-reloaded-started.png (20, a01faea)
- product/critic/wt-7d52952/docs/readme/{header,screenshot-desktop,screenshot-farm,screenshot-workers}.png (4, md5 = pr1-96c4a1e README copies, out of scope)
Still waiting on: M4-A remaining sign-off shots, B-1 Coop full SHA/screenshot (PM Workers), B-3 compact Farm card SHA (UI engineer), 'Limited by collecting' fix, v1.6.1 goal label.

## 2026-10-16 23:47 run (no new UI screenshots; no review, nothing sent)
Logged so later runs skip them:
- qa/scratch/pr6-594cd59/docs/readme/{header,screenshot-desktop,screenshot-farm,screenshot-workers}.png (4, md5 = product/critic/wt-7d52952 README copies, out of scope)
- qa/m3-recheck/logs-4bf4a22/tg-webkit-*.png re-rendered 23:42 under already-logged names (out of scope)
Still waiting on: M4-A remaining sign-off shots, B-1 Coop full SHA/screenshot (PM Workers), B-3 compact Farm card SHA (UI engineer), 'Limited by collecting' fix, v1.6.1 goal label.

## 2026-10-17 00:17 run → reviews/screenshot-check-2026-10-17-0017.md (PASS on new captures; 1 question for PM Workers; 23:25 Minor still open)
Checked (new since 23:47):
- qa/m3-recheck/cuta-ux-extras/chromium-360-3-nav-badge.png, chromium-360-3a-nav-badge-crop.png, chromium-{360,1280}-4-asleep-card.png, chromium-{360,1280}-4a-asleep-viewport.png (6, d56033f; + asleep-rects.json)
- qa/m3-recheck/cuta-ux-extras/chromium-{360,1280}-{1,2,2a,2b,2c}-*.png re-rendered 00:02 under already-logged names, same build (re-looked at 360-2c)
- qa/m3-recheck/release-confirm-m3-rc1-qa-v4/shots/*.png (33, QA release confirm on 7d52952, out of scope)
- qa/scratch/pr7-b1004e7/docs/readme/*.png, qa/scratch/sd5-1-5d636d8/docs/readme/*.png (8, md5 = pr6-594cd59 README copies, out of scope)
Still waiting on: M4-A remaining sign-off shots, B-1 Coop full SHA/screenshot (PM Workers), B-3 compact Farm card SHA (UI engineer), 'Limited by collecting' fix, v1.6.1 goal label.

## 2026-10-17 00:49 run → reviews/screenshot-check-2026-10-17-0049.md (FAIL: B-2 @572864a 1 Major + 2 Minor; Workers-tab New dot Minor)
Checked (new since 00:17):
- qa/m3-recheck/b2-pr4-572864a/{pr,base}-chromium-tired-*.png, pr-chromium-tired-{direct,viaHireTip}-*.png, chromium-{mixed,need}-*.png, rc0-shots/*.png, rc0-shots-base/ (B-2 PR #4)
- qa/m3-recheck/pr12-l30-0f2b785/chromium-360-{F29,nudge}.png (2)
- engineering/screenshots/pr12-nudge/nudge-f25-0workers-{360x740,1280x800-docked}-chromium.png (2, already PASS 00:44, status.md)
- qa/m3-recheck/cuta-ux-extras/firefox-{360,1280}-*.png (12, d56033f)
- qa/scratch/engineering/screenshots/rc0-recovery-v11/*.png (3)
- Out of scope: qa/m3-recheck/pr13-release-check-6cc37f6/shots/*.png (7), qa/m3-recheck/save-5d636d8/shots/chromium/*.png (10), qa/claude-gamer/rc1-qa-bugs-v4-7d52952/{desk,m390}-*.png (playtest), qa/m3-recheck/logs-4bf4a22/tg-chromium-*.png (4, re-render)
Still waiting on: M4-A remaining sign-off shots, B-1 Coop full SHA/screenshot (PM Workers), B-3 compact Farm card SHA (UI engineer), 'Limited by collecting' fix, v1.6.1 goal label, Refill nav fix (Market Hand only asleep).

## 2026-10-17 01:17 run → reviews/screenshot-check-2026-10-17-0117.md (FAIL: M4-A e38cf76 2 Minor + 1 regression, toast not captured)
Checked (new since 00:49):
- engineering/screenshots/m4a-e38cf76/{locked-needs-farm-390,max-rows-390,max-balanced-5of5-toast-390,farm-tab-360,farm-tab-1280-docked}.png (+ locked-row-aria.json, max-balanced-state.json, strip-text-alternative.html, console-errors.json)
- engineering/screenshots/m4a-e38cf76/save-recovery-v4-{fresh,restored,storage,cantsave}-{360,1280}.png, m3-rc0-bug9-375-market.png, m3-rc0-desktop-1280.png (10)
- engineering/screenshots/pr12-nudge/workers-tab-dot-360x740-chromium.png (new), nudge-f25-0workers-360x740-chromium.png (re-render)
- qa/m3-recheck/pr12-l30-0f2b785/chromium-{320,340,375,390,1280}-{F29,nudge,tap}.png, chromium-360-tap.png (16 new names; 360 F29/nudge re-rendered)
- qa/m3-recheck/cuta-ux-extras/webkit-{360,1280}-*.png (16, d56033f)
- Out of scope: qa/m3-recheck/b2-pr4-572864a/base-chromium-tired-*.png (re-render), qa/claude-gamer/rc1-qa-bugs-v4-7d52952/coop-0{1..6}-*.png (playtest), qa/scratch/pr7-3b464ea/docs/readme/*.png (4, README copies)
Still waiting on: M4-A fixes + toast captures, B-1 Coop full SHA/screenshot (PM Workers), B-3 compact Farm card SHA (UI engineer), 'Limited by collecting' fix, v1.6.1 goal label, Refill nav fix (Market Hand only asleep), QA rerun of New dot on PR #12 head.

## 2026-10-17 01:55 run → reviews/screenshot-check-2026-10-17-0155.md (FAIL: M4-A 2625e5c goal strip lost its pill, Major regression; S2-6 qtag PASS)
Checked (new since 01:17):
- engineering/screenshots/m4a-2625e5c/{rc1-s2-6-qtag-9of9-{375,390},save-recovery-v4-{fresh,restored,storage,cantsave}-{360,1280},m3-rc0-bug9-375-market,m3-rc0-desktop-1280}.png (12)
- engineering/screenshots/pr12-nudge/{workers-tab-dot,nudge-f25-0workers}-360x740-firefox.png (2)
- qa/m3-recheck/pr12-l30-0f2b785/firefox-{320,340,360,375,390,1280}-{F29,nudge,tap}.png (18), webkit-{360,375,390,1280}-{F29,nudge,tap}.png (12)
- qa/m3-recheck/b2-pr4-572864a/pr-firefox-tired-viaHireTip-1280x720.png (1)
- Re-renders/out of scope: engineering/screenshots/m4a-e38cf76/save-recovery-v4-*.png (8), qa/m3-recheck/cuta-ux-extras/firefox-360-3{,a}-*.png (2), qa/m3-recheck/logs-4bf4a22/tg-chromium-*.png (4), qa/claude-gamer/rc1-qa-bugs-v4-7d52952/coop-0{3..6}-*.png (4)
Still waiting on: M4-A goal-strip fix + MAX/turned-away/lock/toast captures, B-1 Coop full SHA/screenshot (PM Workers), B-3 compact Farm card SHA (UI engineer), 'Limited by collecting' fix, v1.6.1 goal label, Refill nav fix (Market Hand only asleep), sticky Refill bar backing, B-2 tip over Manage, QA rerun of New dot on PR #12 head.

## 2026-10-17 02:24 run → reviews/screenshot-check-2026-10-17-0224.md (PASS: M4-A 14ba6e9 goal pill restored; B-2 902f924 00:49 items 1–3 fixed; rule D not yet built)
Checked (new since 01:55):
- engineering/screenshots/m4a-14ba6e9/{rc1-s2-6-qtag-9of9-{375,390},save-recovery-v4-{fresh,restored,storage,cantsave}-{360,1280},m3-rc0-bug9-375-market,m3-rc0-desktop-1280}.png (12)
- qa/m3-recheck/b2-pr4-902f924/pr-chromium-tired-{direct,viaHireTip}-{1024x474,1280x600,1280x720,1280x800,360x740,390x640}.png (12), rc0-shots/b2-tired-direct-*.png (6), chromium-{mixed,need}-{360,375,390,430,1280}.png (10, fixture re-renders)
- qa/m3-recheck/pr12-b6cbeb5-recapture/*.png (10) and engineering/screenshots/pr12-nudge/*-360x740-webkit.png (2): already PASS 02:19 (art-ux/status.md)
- Re-renders/out of scope: qa/m3-recheck/b2-pr4-572864a/*.png (12), qa/m3-recheck/cuta-ux-extras/{firefox,webkit}-*.png, engineering/screenshots/pr12-nudge/*-chromium.png (01:58)
Still waiting on: M4-A 360 goal-strip view + items 1, 3, 4, 5 + toasts, B-2 rule D build, B-1 Coop full SHA/screenshot (PM Workers), B-3 compact Farm card SHA (UI engineer), 'Limited by collecting' fix, v1.6.1 goal label, Refill nav fix (Market Hand only asleep), sticky Refill bar backing.
- 2026-10-17 02:50 Cut A v3 PR #3 @ eb27707 (HUD reads build c231c02, provenance to confirm): **FAIL, 2 Major / 4 Minor / 3 Nit**, art-ux/reviews/screenshot-check-2026-10-17-cuta3-eb27707.md. Major: B-3 Farm card 368px (target ≤260/282), not applied; goal short-name gain line clipped by strip. Minor: 0-eggs `Need N` → `No eggs`; ` eggs` not dropped at 360; value `$1…` cut; `1000B`/raw seconds. Closed: 21:03 Limited-by overlap, 23:25 sticky Refill backing, 22:31 #3 Need 46px.
- 2026-10-17 03:00 PR #16 offline popup v2 @ 5248dd9: FAIL (Major: cap line uses ⏱ emoji not SVG; Minor: no build label in shots, Collect clipped at 360x420, HUD basket '100K' vs v0.3.1 full digits). → screenshot-check-2026-10-17-pr16-5248dd9.md

## 2026-10-17 02:54 run → reviews/screenshot-check-2026-10-17-0254.md (FAIL: M4-A 14ba6e9 toasts under scrim/HUD, Major; 2 Minor; qtag/turned-away captures missing state)
Checked (new since 02:24):
- engineering/screenshots/m4a-14ba6e9/{goal-strip,goal-strip-crop,lock,max-rows-5of5-strip,tier-toast-4of5,tier-toast-5of5,milestone-toast-hens,milestone-toast-eggvalue,queue-full-tag,turned-away-customer}-{360,1280-docked}.png (20) + state.json, strip-5of5-text-alternative-*.txt
- qa/m3-recheck/pr22-evidence/shots/chromium-{mixed,need}-{360,390}.png (4)
- qa/m3-recheck/pr20-evidence/shots/chromium-*-{fresh,restored,storage,cantsave}.png (16)
- qa/m3-recheck/pr12-7e70a2e/*.png (26)
- Re-renders/out of scope: qa/m3-recheck/b2-pr4-902f924/rc0-shots/{save-recovery-v4-*,b2-tired-normal-*,m3-rc0-*}.png, qa/m3-recheck/b2-pr4-572864a/pr-firefox-tired-*.png (13), qa/m3-recheck/pr13-release-check-8475bc4/shots/fonts-*.png (2)
Still waiting on: M4-A toast fix + qtag/turned-away captures, B-1 Coop full SHA/screenshot (PM Workers), B-3 compact Farm card (Cut A v3 FAIL 02:50), v1.6.1 goal label short-name fix, Refill nav fix (Market Hand only asleep), Cut A v4 shots.

## 2026-10-17 03:23 run → reviews/screenshot-check-2026-10-17-0323.md (PASS: M4-A aa89076 toasts fixed, 02:54 items 1/2/4 closed; Sold out! capture still needed)
Checked (new since 02:54):
- engineering/screenshots/m4a-aa89076/{goal-strip,goal-strip-crop,lock,max-rows-5of5-strip,tier-toast-4of5,tier-toast-5of5,milestone-toast-hens,milestone-toast-eggvalue,queue-full-tag,turned-away-customer}-{360,1280-docked}.png (20) + state.json, strip-5of5-text-alternative-*.txt
- qa/m3-recheck/pr22-evidence/shots/{firefox,webkit}-{mixed,need}-{360,390}.png (8), shots-main/chromium-{mixed,need}-{360,390}.png (4, main baseline)
- qa/m3-recheck/b2-pr4-902f924/pr-firefox-tired-{direct,viaHireTip}-{360x740,390x640,1280x800}.png (6), firefox-{mixed,need}-{360,375,390,430,1280}.png (10, fixture re-renders)
- qa/m3-recheck/pr16-offline-v2-5248dd9/shots/chromium-func-cac{27-671s,28-11520s,30-price,31-basket,32-7199,32-7200,34-one,35-59,35-neg,37-motion}.png (10): invalid run (save-recovery dialog, popup never shown); recheck on QA rerun
- Out of scope: qa/m3-recheck/pr13-release-check-8475bc4/shots/fonts-{firefox,webkit}-{file,http}.png (4)
Still waiting on: M4-A Sold out! (timeout) capture at 360 + docked, then sign-off; QA PR #16 rerun shots; B-1 Coop full SHA/screenshot (PM Workers); B-3 compact Farm card + v1.6.1 goal label (Cut A v4); Refill nav fix (Market Hand only asleep); B-2 rule D.

## 2026-10-17 03:54 run → reviews/screenshot-check-2026-10-17-0354.md (M4-A Sold out! c108440 geometry PASS but PNGs blank (shot after fade), sign-off held; PR #16 5248dd9 rerun still FAIL + new Minor title wrap)
Checked (new since 03:23):
- engineering/screenshots/m4a-aa89076/sold-out-bubbles-{360,1280-docked}.png + state-soldout.json (FAIL x<0, superseded)
- engineering/screenshots/m4a-c108440/sold-out-bubbles-{360,1280-docked}.png + state-soldout.json (geometry PASS, bubbles not visible in PNG)
- engineering/screenshots/m4a-aa89076/{rc1-s2-6-qtag-9of9-{375,390},save-recovery-v4-{fresh,restored,storage,cantsave}-{360,1280},m3-rc0-bug9-375-market,m3-rc0-desktop-1280}.png (12, re-renders PASS)
- qa/m3-recheck/pr16-offline-v2-5248dd9/shots/{chromium,firefox}-func-cac*.png (20), {chromium,firefox}-*-capped-1234567.png (16)
- qa/m3-recheck/hidden-tab-offline-b3341bd/shots/chromium-{hide,reload}-{61s,671s,10800s}.png (6)
Still waiting on: visible Sold out! capture (own paused render queued: art-ux/reviews/evidence/m4a-c108440/, or Features re-shoot), then M4-A sign-off; PR #16 next SHA; B-1 Coop full SHA/screenshot (PM Workers); B-3 compact Farm card + v1.6.1 goal label (Cut A v4); Refill nav fix (Market Hand only asleep); B-2 rule D.

## 2026-10-17 04:22 run → reviews/screenshot-check-2026-10-17-0422.md (FAIL, 1 Minor: PR #5 3930a4c first toast slides through banner/strip during fade-in; settled placement PASS)
Checked (new since 03:54):
- qa/m3-recheck/toast-pr5-3930a4c/pr-chromium-toast-{360x740,390x640,375x812,390x844,430x932,1024x474,1280x720,1280x800,1366x768}{,-nobanner}.png (18) + pr-toast-chromium.json; rc0-shots/*.png (10, re-renders)
- qa/m3-recheck/b2-pr4-192f273/chromium-{direct,viaHireTip}-{1024x474,1280x600,1280x720,1280x800,360x740,390x640}-end.png (12) + geo-chromium-v1.log (confirms 04:10 rule D check)
- qa/m3-recheck/pr16-offline-v2-5248dd9/shots/webkit-*-capped-1234567.png (8), qa/m3-recheck/hidden-tab-offline-b3341bd/shots/webkit-{hide,reload}-*.png (6), qa/m3-recheck/b2-pr4-902f924/webkit-{mixed,need}-*.png (10)
- Re-renders/out of scope: engineering/screenshots/m4a-c108440/save-recovery-v4-*.png (7)
Still waiting on: PR #5 toast entry-motion fix + mid-fade re-shoot; PR #4 Manage-tip-over-Market fix (04:10); PR #16 next SHA; paused 'Sold out!' frame (follow-up, M4-A signed off); B-1 Coop full SHA/screenshot (PM Workers); B-3 compact Farm card + v1.6.1 goal label (Cut A v4); Refill nav fix (Market Hand only asleep).

## 2026-10-17 05:17 run → reviews/screenshot-check-2026-10-17-0517.md (PASS in scope; 2 Minor UX notes from claude-gamer triage for Head decision)
Checked (new since 04:22):
- qa/m3-recheck/pr17-cf50663-evidence/shots-chromium/*.png (10), qa/m3-recheck/pr18-d8d680e-evidence/shots-chromium/*.png (10): re-renders PASS
- qa/m3-recheck/hidden-tab-offline-b3341bd/shots/firefox-{hide,reload}-*.png (6): PASS
- qa/m3-recheck/claude-gamer-triage-7d52952/shots/chromium-{390,1280}-*.png (22): out of spec scope (old build); notes B2 'No eggs to sell' with eggs, B3 stale sold row
- Out of scope: qa/scratch/pr17-18-y/clones/*/docs/readme/*.png (12, README copies)
Still waiting on: PR #5 toast entry-motion fix + mid-fade re-shoot; PR #4 Manage-tip fix; PR #16 next SHA; paused 'Sold out!' frame; B-1 Coop full SHA/screenshot (PM Workers); B-3 compact Farm card + v1.6.1 goal label (Cut A v4); Refill nav fix (Market Hand only asleep).

## 2026-10-17 05:49 run → reviews/screenshot-check-2026-10-17-0549.md (PASS; re-renders and Firefox copies only)
Checked (new since 05:17):
- qa/m3-recheck/pr17-cf50663-evidence/shots-chromium-rerun/*.png (10), qa/m3-recheck/pr18-d8d680e-evidence/shots-chromium-rerun/*.png (10): re-renders PASS (animation-frame diffs only)
- qa/m3-recheck/claude-gamer-triage-7d52952/shots/firefox-{390,1280}-*.png (22): engine parity with Chromium, out of spec scope (old build)
- Out of scope: qa/m3-recheck/m4a-c108440-evidence/ffprobe-firefox.png (1, boot probe)
Still waiting on: PR #5 toast entry-motion fix + mid-fade re-shoot; PR #4 Manage-tip fix; PR #16 0470045 shots; paused 'Sold out!' frame; B-1 Coop full SHA/screenshot (PM Workers); B-3 compact Farm card + v1.6.1 goal label (Cut A v4); Refill nav fix (Market Hand only asleep).

## 2026-10-17 06:16 run → reviews/screenshot-check-2026-10-17-0616.md (FAIL, 1 Minor: PR #25 single-tab Play here 44px vs design 48)
Checked (new since 05:49):
- qa/m3-recheck/pr25-hidden-tab-59cce62/shots/chromium-{hide,reload}-{61s,120s,671s,10800s}.png (8), chromium-m1-{deactivate,refuseNewer}.png (2): Welcome-back v1 PASS (parity with b3341bd); m1-deactivate FAIL Minor — Play here 44px vs art-ux/single-tab-guard/spec.md 48px (mock 48px)
- No PNGs yet: qa/m3-recheck/toast-pr5-ac4ec56/
Still waiting on: PR #5 toast mid-fade re-shoot; PR #4 Manage-tip fix; PR #16 0470045 shots; paused 'Sold out!' frame; B-1 Coop full SHA/screenshot (PM Workers); B-3 compact Farm card + v1.6.1 goal label (Cut A v4); Refill nav fix (Market Hand only asleep); PR #25 Firefox/WebKit + Play-here 48px fix re-shoot.

## 2026-10-17 06:47 run → reviews/screenshot-check-2026-10-17-0647.md (PASS on new; carry-over Minor PR #25 Play here 44px still open, same in Firefox/WebKit)
Checked (new since 06:16):
- qa/m3-recheck/pr25-hidden-tab-59cce62/shots/{firefox,webkit}-{hide,reload}-{61s,120s,671s,10800s}.png (16): Welcome-back v1 PASS, parity with Chromium
- qa/m3-recheck/pr25-hidden-tab-59cce62/shots/{firefox,webkit}-m1-{deactivate,refuseNewer}.png (4): copy PASS; Play here 44px vs 48px (carry-over Minor)
- qa/m3-recheck/pr28-sellall-grader-f7642c9/shots/sellall-grader-t1-360.png (1): Sell all label with Grader bonus PASS at 360
- qa/m3-recheck/pr28-sellall-grader-f7642c9/shots/{m3-rc0-bug9-375-market,m3-rc0-desktop-1280,save-recovery-v4-*}.png (10): re-renders PASS
Still waiting on: PR #25 Play-here fix re-shoot; PR #5 toast mid-fade re-shoot; PR #4 Manage-tip fix; PR #16 0470045 shots; paused 'Sold out!' frame; B-1 Coop full SHA/screenshot (PM Workers); B-3 compact Farm card + v1.6.1 goal label (Cut A v4); Refill nav fix (Market Hand only asleep).

## 2026-10-17 07:22 run → reviews/screenshot-check-2026-10-17-0722.md (FAIL, 2 Minor on PR #16 0470045; PR #5 37524aa mid-fade PASS, closes 04:22 Minor)
Checked (new since 06:47):
- qa/m3-recheck/toast-pr5-37524aa/rc0-shots-chromium/toast-v3/toast-midfade-100ms-{360x740-banner,390x640-nobanner,1280x800-banner,1280x800-nobanner}.png (4): PASS; rc0-shots-chromium/m3-rc0-desktop-1280.png (1): re-render PASS
- qa/m3-recheck/pr16-offline-v2-0470045-evidence/shots/chromium-welcome-{320x568,360x420,360x640,375x667,390x844,1280x800}.png (6): 03:00/03:54 items closed; FAIL Minor cap line cut at 360x420; FAIL Minor toast over card (hides hero at 320x568); build label carry-over
- qa/m3-recheck/pr28-sellall-grader-f7642c9/{chromium,firefox}-{360,390}-t1-orig.png (4): PASS parity
- qa/m3-recheck/pr25-hidden-tab-59cce62/rc0-shots/*.png (10): re-renders PASS
- No PNGs: qa/m3-recheck/pr16-offline-v2-0470045-evidence/shots-oc-chromium/ (json only)
Still waiting on: PR #16 fix re-shoot (360x420, 320x568); PR #25 Play-here fix re-shoot; PR #4 Manage-tip fix; paused 'Sold out!' frame; B-1 Coop full SHA/screenshot (PM Workers); B-3 compact Farm card + v1.6.1 goal label (Cut A v4); Refill nav fix (Market Hand only asleep).

## 2026-10-17 07:49 run → reviews/screenshot-check-2026-10-17-0749.md (PASS; closes PR #4 04:10 Minor)
Checked (new since 07:22):
- /workspace/wt-ui-shots/b2-v4/b2-*.png (14), b2-v4/firefox/b2-*.png (14), b2-v4/webkit/b2-*.png (6): PR #4 4e47d77 Manage tip on Manage at 1024x474, PASS (04:10 Minor closed); tired tip PASS
- qa/m3-recheck/pr28-sellall-grader-f7642c9/webkit-{360,390}-t1-orig.png (2): PASS parity
- qa/m3-recheck/pr16-offline-v2-0470045-evidence/shots/rc0-chromium/*.png (10): re-renders PASS
- art-ux/reviews/pr25-c9a1f4b-m1-deactivate/*.png (10): re-renders PASS (log: Play here 48px at c9a1f4b; no m1 PNG yet)
- Not evidence: qa/m3-recheck/toast-pr5-37524aa/chromium-midfade-re+100ms-*.png (4, no toast; QA marked invalid)
Still waiting on: PR #16 fix re-shoot (360x420, 320x568); PR #25 m1-deactivate PNG at fix SHA; paused 'Sold out!' frame; B-1 Coop full SHA/screenshot (PM Workers); B-3 compact Farm card + v1.6.1 goal label (Cut A v4); Refill nav fix (Market Hand only asleep).

## 2026-10-17 08:18 run → reviews/screenshot-check-2026-10-17-0818.md (FAIL, 1 new Minor: PR #3 8a49d35 Firefox 1280 banner under sticky Refill bar; closes cuta3 #2-#5, Nit 7, timer part of #6, 06:17 Sold-chip Minor)
Checked (new since 07:49):
- /workspace/wt-ui-shots/cuta4/*.png (chromium/firefox/webkit, 132 PNG + rects/report JSON): PR #3 Cut A v3 @ 8a49d35; FAIL Minor firefox-1280-{2a,2b,4,4a}; B-3 still not applied (carry-over Major); HUD 1000B open
- /workspace/wt-ui-shots/cuta4/rc0-chromium/*.png (47): re-renders, not separately reviewed beyond spot checks
- /workspace/wt-ui-shots/rc2-minors/*.png (8): 9677d26 Sold freeze PASS (06:17 Minor closed), Waiting/next-customer/B4 PASS
- qa/m3-recheck/toast-pr5-37524aa/firefox-midfade-re+100ms-*.png (4): PASS parity
- qa/m3-recheck/pr16-offline-v2-0470045-evidence/shots/firefox-welcome-*.png (6): 07:22 Minors reproduce (carry-over)
- engineering/screenshots/*.png (13), /workspace/offline-v2-gates/rc0-shots/*.png (10): re-renders PASS
- Not yet: /workspace/wt-ui-shots/rc2-minors-2/ (empty, render running); cuta4/rc0-{firefox,webkit}/ (empty)
Still waiting on: PR #3 Firefox banner-scroll fix; B-3 SHA; HUD 1T; PR #16 fix re-shoot; PR #25 m1 PNG at fix SHA; rc2-minors Fx/WK; rc2-minors-2; 'Sold out!' frame; B-1 (PM Workers); Refill nav fix.

## 2026-10-17 08:52 run → reviews/screenshot-check-2026-10-17-0852.md (PASS on new; closes 06:16 Minor PR #25 Play here 48px; 07:22 PR #16 Minors reproduce in WebKit)
Checked (new since 08:18):
- art-ux/reviews/pr25-2340d61-m1-deactivate/m1-deactivate-chromium-{360,390,1280}.png (3): PR #25 @ 2340d61 Play here 48px PASS (06:16 Minor closed)
- art-ux/reviews/pr25-2340d61-m1-deactivate/{m3-rc0-*,save-recovery-v4-*,sellall-grader-t1-360}.png (11): re-renders PASS (rc0 chromium 222/222)
- qa/m3-recheck/pr16-offline-v2-0470045-evidence/shots/webkit-welcome-*.png (6): parity; 07:22 Minors reproduce (carry-over)
- qa/m3-recheck/toast-pr5-37524aa/webkit-midfade-re+100ms-*.png (4): PASS parity
- Out of scope: qa/wt-ac7-8e6d53e/docs/readme/*.png (4, README copies)
Still waiting on: PR #16 fix re-shoot; PR #25 Fx/WK m1 at 2340d61; PR #3 Firefox banner-scroll fix; B-3 SHA; HUD 1T; rc2-minors Fx/WK; rc2-minors-2; 'Sold out!' frame; B-1 (PM Workers); v1.6.1 goal label; Refill nav fix.

## 2026-10-17 09:23 run → reviews/screenshot-check-2026-10-17-0923.md (PASS on new, no new Minor; B-3 early look PASS in Firefox @ 9690b9d; 2 Nits from QA probe)
Checked (new since 08:52):
- /workspace/wt-ui-shots/b3/b3-farmcard-{affordable,eta}-{360,390,1280-docked}-firefox.png (6): B-3 @ 9690b9d PASS (258/280px at 360/390, Buy 48px); docked Buy width question to Head
- qa/m3-recheck/cutA-8a49d35/chromium-{farmcard,goal,market,upgrades}-*.png (32), fc-shots/*.png (26), rc0-shots/*.png (47): PR #3 8a49d35 Chromium parity PASS; v1.6.1 goal (Farm L30, stress wrap) PASS; Nits N1 chip arrive 181.2B 57/50px, N2 .l1 167/164px at 360
- qa/m3-recheck/toast-pr5-37524aa/cmp-toast-midfade-100ms-*.png (2): QA composites, no new evidence
- Not posted / not evidence: /tmp/b3s/*.png (6, HUD cd9b313 + 'build undefined'); /tmp/m2full/rc2-minors-2/*.png (35, 35a37a6, unposted); /tmp/frz-shots/*.png (13, M4-A diff routine)
Still waiting on: PR #3 Firefox banner-scroll fix; B-3 posted SHA (Chromium/WebKit/375, on #3 final); PR #16 fix re-shoot; PR #25 Fx/WK m1; HUD 1T; rc2-minors Fx/WK; rc2-minors-2/PR #35; 'Sold out!' frame; B-1 (PM Workers); v1.6.1 full label set; Refill nav fix.

## 2026-10-17 09:47 run → reviews/screenshot-check-2026-10-17-0947.md (PASS on new, no new Minor; 1 new Nit N3; B-3 Chromium/WebKit/375 PASS @ 3ee5d39; rc2-minors-2 @ fcdda2c PASS, closes N2 and the 07:22 toast-over-modal item on #35)
Checked (new since 09:23):
- /workspace/wt-ui-shots/b3/b3-farmcard-{affordable,eta}-{360,375,390,1280-docked}-chromium.png (8), b3/webkit/*-webkit.png (8): B-3 @ 3ee5d39 PASS (258/280px, Buy 48px, docked Buy full width)
- /workspace/wt-ui-shots/rc2-minors-2/*.png (39): order-wants/order-fit (§9/§9.1) PASS; toast-layer-*/welcome-over-toast-* PASS; tutorial-goal-bubble/-link-tapped/step3 PASS; Nit N3 hens over goal strip at 360x420
- qa/m3-recheck/cutA-8a49d35/firefox-*.png (32): Firefox parity PASS with the Chromium set (09:23)
- Not evidence: /tmp/m8/*.png (55), /tmp/scratch25/shots/*.png (4), /tmp/mw-fe33/docs/readme/*.png (4)
Still waiting on: PR #3 Firefox banner-scroll fix; B-3 on #3 final; PR #16 fix re-shoot; PR #25 Fx/WK m1; HUD 1T; rc2-minors Fx/WK; rc2-minors-2 Fx/WK + 375; 'Sold out!' frame; B-1 (PM Workers); v1.6.1 full label set; Refill nav fix.

## 2026-10-17 10:23 run → reviews/screenshot-check-2026-10-17-1023.md (PASS on new, no new Minor/Nit; closes Nit N3 @ 1827a27; B-3 3598417 Firefox PASS)
Checked (new since 09:47):
- /workspace/wt-ui-shots/b3/firefox/*-firefox.png (8): B-3 @ 3598417 PASS (258/280px, Buy 48px, docked full width)
- /workspace/wt-ui-shots/b3/*-chromium.png (8), b3/webkit/*.png (8): re-rendered at 3598417 under the same names, PASS
- /workspace/wt-ui-shots/rc2-minors-2-1827a27/*.png (50, Chromium) + firefox/*.png (50): #35 @ 1827a27 PASS; 375 Wants shots PASS; N3 closed
- qa/m3-recheck/toast-pr5-a56b3a2/rc0-shots-chromium/toast-v3/*.png (4), ff-extra-shots/toast-v3/*.png (6, Chromium): #5 first frame PASS
- qa/m3-recheck/toast-pr5-a56b3a2/rc0-shots-chromium/*.png (10): re-renders PASS
- qa/m3-recheck/m4a-31-delta-d75d41f-evidence/shots-chromium/*.png (16): #31 d75d41f PASS (fileopen-release OK; fileopen-file blank = wrong QA target)
- Not evidence: qa/m3-recheck/toast-pr5-a56b3a2/chromium-midfade-re+100ms-*.png (4, invalid probe); /tmp/m2full/**, /tmp/n3old/*.png (40), /tmp/qa-pr25fwd/**/docs/readme, /tmp/qa-pr5-a56b3a2/docs/readme (unposted / README copies)
Still waiting on: B-3 on #3 final; PR #3 Firefox banner-scroll fix; rc2-minors-2 WebKit @ 1827a27; #5 Fx/WK @ a56b3a2; #31 Fx/WK shots; B-1 (PM Workers); v1.6.1 full label set.
- 2026-10-17 10:40 CEST — PR #35 @ efd7886 (head 3fa3781, tests only): PASS, FF/WebKit/375, manifest SHA = HUD label, §9.1 value never cut at 3.98M/360; 2 Nits logged. reviews/screenshot-check-2026-10-17-pr35-efd7886.md

## 2026-10-17 10:53 run → reviews/screenshot-check-2026-10-17-1053.md (NO VERDICT: all new in-scope sets rejected, no manifest.json; nothing held)
Seen and rejected (no manifest.json):
- qa/m3-recheck/m4a-31-delta-d75d41f-evidence/shots-{firefox,webkit}/*.png (4): #31 Fx/WK
- qa/m3-recheck/toast-pr5-a56b3a2/{firefox,webkit}-midfade-re+100ms-*.png (8, invalid probe) + ff-extra-shots/toast-v3/*.png (6, re-render): #5
- qa/m3-recheck/pr35-3fa3781/shots/**/*.png (109): #35 QA parity; efd7886 manifest set already PASS 10:40
- /workspace/wt-ui-shots/cuta4/{firefox,webkit}-*.png (10:15/10:24 re-render): not the #3 forward-merge, out of scope
- Not evidence: art-ux/scratch/sc1023/*.png (18, own scratch); wt-ui-shots/b3/firefox (B-3 parked)
Still waiting on: #3 fwd-merge shots (if layout changed); #31 Fx/WK + manifest; #5 Fx/WK + manifest; c05c83a min wait; worker-asleep display; #37; #12; final RC 3-engine shots.

## 2026-10-17 11:19 run → reviews/screenshot-check-2026-10-17-1119.md (NO VERDICT: no new in-scope set with manifest.json; nothing held)
Seen:
- /workspace/wt-ui-shots/v3main/*.png (52) + rc0-chromium/*.png (48), rc0-firefox empty: #3 fwd-merge, REJECTED (no manifest.json, no WebKit, render in progress)
- qa/m3-recheck/pr25-fwd-6dc2f5a-evidence/**/*.png (13): #25/#39 fwd-merge, out of scope, no manifest
- art-ux/reviews/pr25-6dc2f5a-fwd/*.png (6): #39 m1 art-ux working set, out of scope
- qa/m3-recheck/player-m4a-triage/**/*.png (47): QA triage, not evidence
Still waiting on: #3 fwd-merge with manifest (if layout changed); worker-asleep display; #37; #12; final RC 3-engine shots with manifest.

## 2026-10-17 11:55 run → reviews/screenshot-check-2026-10-17-1155.md (NO VERDICT: no new in-scope set with manifest.json; nothing held)
Seen:
- /workspace/wt-ui-shots/v3main/*.png (31) + rc0-chromium/*.png (42), rc0-firefox empty: #3 fwd-merge re-render in progress, REJECTED (no manifest.json, no WebKit)
- qa/m3-recheck/p3-fix-462a071/*.png (32) + rc0-shots/*.png (2): P3-only patch 462a071 vs af5e3ab, Chromium only, REJECTED (no manifest.json)
- /workspace/wt-ui-shots/p3-375/{before,after}/*.png (3): P3 before/after, REJECTED (no manifest.json)
- qa/m3-recheck/player-m4a-triage/*.png (13), pr25-fwd-6dc2f5a-evidence/**/*.png (30): out of scope / not evidence
Still waiting on: #3 fwd-merge or P3 patch with manifest + Fx/WK; worker-asleep display; #37; #12/L30+; final RC 3-engine with manifest.

## 2026-10-17 12:19 run → reviews/screenshot-check-2026-10-17-1219.md (PASS: PR #40 P3 @ 462a071, 3 engines, manifest; 1 Minor logged; nothing held)
Checked:
- qa/m3-recheck/p3-fix-462a071/{chromium,firefox,webkit}-462a071-*.png + *-card.png + sprite-*.png + rc0-shots/*.png (65, manifest.json 12:16): PM4-P3 fixed, no overlap, 3 engines at 360/375/390. Minor M-P3-1 link hit area 93x16. Fx/WK full shots show Farm tab (manifest label off); no 1280 docked.
- qa/m3-recheck/p3-fix-462a071/*-af5e3ab-*.png: baseline, comparison only
Seen, out of scope:
- /workspace/wt-ui-shots/v3main/*.png (35) + rc0-{chromium,firefox,webkit}/*.png: #3 fwd-merge, #3 dropped 12:06
Still waiting on: final RC 3-engine set (main after #40) with manifest incl. 1280 docked; worker-asleep display; #12 only if UI changes.

## 2026-10-17 12:50 run → reviews/screenshot-check-2026-10-17-1250.md (PASS: PM4-P3 corrected Fx/WK set on main dd52bfd + 462a071; no new Minor/Nit; nothing held)
Checked:
- qa/m3-recheck/p3-fix-462a071/corrected/dd52bfd/*.png (32, manifest 12:28): main Merge #40, Fx/WK at 360x800/375x800/375x700/390x844, capped+normal, Collection tab asserted. 0 overlaps, Buy 48px; M-P3-1 link 93x16 unchanged (Minor, logged). Closes 12:19 Farm-tab mislabel observation.
- qa/m3-recheck/p3-fix-462a071/corrected/462a071/*.png (32, manifest 12:28): #40 head, same matrix, PASS.
Seen, out of scope:
- qa/m3-recheck/pr37-85e5bb1/shots/html-open-chromium.png (1): #37 dropped, no manifest
- qa/m3-recheck/p3-fix-462a071/*-farmtab.png, before-af5e3ab/*-farmtab.png: renames of 12:19-seen files
Still waiting on: final RC 3-engine set (main dd52bfd) with manifest incl. 1280 docked; worker-asleep display (if merged); #12 only if UI changes.

## 2026-10-17 13:22 run → reviews/screenshot-check-2026-10-17-1322.md (NO VERDICT: final RC set still rendering, no manifest.json; nothing held)
Seen and rejected (no manifest.json):
- qa/m3-recheck/rc-dd52bfd/{p3,shots,rc0-shots-chromium,check-sheets}/*.png (77): final RC dd52bfd, Chromium only, Firefox in progress (p3-firefox exit=1), no WebKit
- qa/m3-recheck/rc-pass-dd52bfd-evidence{,-preverify-1240}/**/*.png (28): QA functional Firefox evidence
Observation: QA layout BAD 12 = mobile segmented tabs 36px in a 44px track (QA: Minor/pre-existing); confirm on the manifest set.
Still waiting on: final RC 3-engine set (dd52bfd) with manifest incl. 1280 docked; worker-asleep display (if merged); #12 only if UI changes.

## 2026-10-17 13:50 (reviews/screenshot-check-2026-10-17-1350.md)
Final RC SHA = 90a9c84 (PR #41), diff vs dd52bfd confirmed flag-only (balance.json m4.enabled 0->1).
Seen and rejected (no manifest.json):
- qa/m3-recheck/m4on-pr41-90a9c84/rc0-shots-chromium/*.png (3): Chromium only, no Fx/WK, no acdbedc save
Superseded, not reviewed: qa/m3-recheck/rc-dd52bfd/** (dd52bfd RC sets)
No shots: rc-pass-90a9c84-evidence, m4-downgrade-fixtures
Still waiting on: 90a9c84 3-engine manifest set incl. 1280 docked + acdbedc M4 save; 36px mobile tabs Minor to confirm there.

## 2026-10-17 14:24 (reviews/screenshot-check-2026-10-17-1424.md) NO VERDICT, nothing held
Seen and rejected (no manifest.json):
- qa/m3-recheck/m4on-pr41-90a9c84/rc0-shots-{chromium,firefox,webkit}/*.png (17+3+3): m4probe rerun in progress, Fx/WK only m1-deactivate
- qa/m3-recheck/rc-pass-90a9c84-evidence/{shots-rc0-chromium,shots-rc0-firefox,shots-rc0-webkit,shots-html,hidden-*-dist-qa/shots}/*.png (17+3+1+2+20): QA functional evidence, WebKit still rendering
Still waiting on: 90a9c84 3-engine manifest set incl. 1280 docked + acdbedc M4 save; 36px mobile tabs Minor to confirm there.

## 2026-10-17 14:45 CEST — final RC dd52bfd (M4 off): PASS
- Set qa/m3-recheck/rc-dd52bfd/shots/ 72/72 + manifest (full SHA, pushed, build_label_checked, label matches). 0 B/C/M. Minor: mobile Upgrades tabs 107×36 (confirmed, pre-existing). Nit: docked Sell sub-line size. Review: reviews/screenshot-check-2026-10-17-rc-dd52bfd.md

## 2026-10-17 14:48 (reviews/screenshot-check-2026-10-17-1448.md) NO NEW IN-SCOPE SHOTS, nothing held
Excluded (90a9c84, per D-CEO-20261017-04): qa/m3-recheck/m4on-pr41-90a9c84/{shots/chromium,shots/firefox,p3,loop}/*.png; qa/m3-recheck/rc-pass-90a9c84-evidence/{hidden-*,shots-html,browser-v6load-chromium}/*.png
Seen and rejected (no manifest.json): qa/claude-qa/m3-rc1-pre-dd52bfd/*.png (26); qa/m3-recheck/player-dd52bfd/shots/*.png (2); product/critic/shots-dd52bfd/*.png (3)
Still waiting on: new M4-ON SHA delta set (manifest, 3 engines, M4 UI, pre-M4 migration) diffed vs dd52bfd.

## 2026-10-19 00:20 (reviews/screenshot-check-2026-10-19-0020.md) NO NEW IN-SCOPE SHOTS, nothing held
Excluded (90a9c84): qa/m3-recheck/gate4-dryrun-90a9c84/{v6load,clock-chromium/shots}/*.png (12+4), no manifest
Seen and rejected (no manifest.json): qa/m3-recheck/pl2-qa41-dd52bfd/*.png (8, UI QA P1 prep on dd52bfd)
Still waiting on: new M4-ON SHA (queue Active #1, intake TBD) delta set with manifest, 3 engines, M4 UI, pre-M4 migration, diffed vs dd52bfd.

## 2026-10-19 00:49 (reviews/screenshot-check-2026-10-19-0049.md) NO NEW IN-SCOPE SHOTS, nothing held
Seen, not in scope (Gate 5 script dry run on dd52bfd, M4 off, Chromium only; dd52bfd Latest already PASSED): qa/m3-recheck/gate5-pr41/dryrun-dd52bfd/chromium/*.png (96 in manifest + probe-pl1-{390x844,1280x800} unlisted)
FYI: 36px Upgrades tabs Minor unchanged; 107x26 "Collection" target on L10/L30 upgrades-workers at 360/375/390, to check on #41.
Still waiting on: new M4-ON (#41) SHA delta set with manifest, 3 engines, M4 UI, pre-M4 migration, diffed vs dd52bfd; PL-1 keyboard shot if PL-1 rides.

## 2026-10-19 01:22 (reviews/screenshot-check-2026-10-19-0122.md) NO NEW IN-SCOPE SHOTS, nothing held
Seen, not a shot set (repo README assets in PR #42 @ 528f1a7 checkout, no manifest.json): qa/wt-ac7-pr42-528f1a7/docs/readme/*.png (4)
Still waiting on: new M4-ON (#41) SHA delta set with manifest, 3 engines, M4 UI, pre-M4 migration, diffed vs dd52bfd; PL-1 keyboard shot if PL-1 rides.

## 2026-10-19 01:56 (reviews/screenshot-check-2026-10-19-0156.md) PASS, PL-1 keyboard shot PR #43 @ 48bdb09
Checked (manifest, 3 engines, 1280 docked): qa/m3-recheck/pl1-pr43-48bdb09/{chromium,firefox,webkit}/pl1-a_escape_tap-1280x800.png, pl1-c4_enter_hold_2s-1280x800.png (6)
Logged: Minor M-PL1-1 focus drops to body after a buy (pre-existing on dd52bfd), not held. Nit: c4 manifest state label.
Seen, not in scope (parked rc2-minors): /workspace/wt-ui-shots/rc2-minors-2-efd7886
Still waiting on: new M4-ON (#41) SHA delta set with manifest, 3 engines, M4 UI, pre-M4 migration, diffed vs dd52bfd.

## 2026-10-19 02:17 (reviews/screenshot-check-2026-10-19-0217.md) NO NEW IN-SCOPE SHOTS, nothing held
Seen, not a shot set (repo README assets in QA checkout @ cb57f17, no manifest.json): qa/wt-identity-cb57f17/docs/readme/*.png (4)
Still waiting on: new M4-ON (#41) SHA delta set with manifest, 3 engines, M4 UI, pre-M4 migration, diffed vs dd52bfd.

## 2026-10-19 02:55 (reviews/screenshot-check-2026-10-19-0255.md) NO NEW IN-SCOPE SHOTS, nothing held
Seen, not a shot set (README assets in T3 retune parity checkout, no manifest.json): scratch/m4-retune/paritytree-t3/docs/readme/*.png (4)
Still waiting on: new M4-ON (#41) SHA delta set with manifest, 3 engines, M4 UI, pre-M4 migration, diffed vs dd52bfd (T3 approved 02:26, D-CEO-20261019-04).

## 2026-10-19 03:23 (reviews/screenshot-check-2026-10-19-0323.md) NO NEW IN-SCOPE SHOTS, nothing held
Seen, not a shot set (README assets, no manifest.json): scratch/m4-retune/r4/tree/docs/readme/*.png (4); qa/wt-precheck-pr44/docs/readme/*.png (4, PR #44 @ 4ccb9fd)
Seen, not new (Oct 17 RC0/RC1 filenames re-written 03:21–03:22, no manifest.json): qa/engineering/screenshots/{m3-rc0-bug9-375-market,m3-rc0-desktop-1280,rc1-s2-6-qtag-9of9-375,rc1-s2-6-qtag-9of9-390}.png (4)
Still waiting on: final M4-ON (#41) SHA delta set (target 05:30–06:00 per D-CEO-20261019-05, incl. L30+ pack/migrate-v7) with manifest, 3 engines, M4 UI, pre-M4 migration, diffed vs dd52bfd.

## 2026-10-19 03:47 (reviews/screenshot-check-2026-10-19-0347.md) NO NEW IN-SCOPE SHOTS, nothing held
Seen, rejected unreviewed (no manifest.json, run in progress, WebKit missing): qa/m3-recheck/gate5-pr44-4ccb9fd/{shots/chromium (81), shots/firefox (80), rc0-shots-chromium (17), rc0-shots-firefox (3)} (PR #44 @ 4ccb9fd, save v7; not the final #41 SHA)
Seen, rehearsal (Chromium only, no manifest.json): qa/m3-recheck/gate5-final-prep/validate-4ccb9fd-chromium/chromium (34), validate-4ccb9fd-chromium-migrated/chromium (4)
Seen, not new (re-written 03:21–03:25, no manifest.json): qa/engineering/screenshots/*.png (13)
Seen, not a shot set (README assets): scratch/m4-retune/r4/{rc,stk}/docs/readme/*.png (8)
Still waiting on: final M4-ON (#41) SHA delta set (target 05:30–06:00) with manifest, 3 engines, M4 UI, v7 pre-M4 migration, diffed vs dd52bfd. Re-check gate5-pr44-4ccb9fd once it has a manifest.

## 2026-10-19 04:15 CEST: gate5-pr44-4ccb9fd (manifest rev 1, 253 shots), PASS, 0 Major
Manifest sha 4ccb9fde…aae pushed, Settings label m3-rc1-pre+4ccb9fd. 3 engines × 360/375/390/1280 docked × fresh/L10/migrated-acdbedc, plus W2 asleep in Chromium. Rulings: 26px = role=tab selectors (app.ts:95-98), Minor. Hint = highlight in all states, Minor. W2 OK. Uncovered: L30+, L31–55, the 03:25 addendum, C1–C4, the explainer (not counted). Review: reviews/gate5-pr44-4ccb9fd.md

## 2026-10-19 04:18 (reviews/screenshot-check-2026-10-19-0418.md) NO NEW IN-SCOPE SHOTS, nothing held
Already reviewed 04:15: qa/m3-recheck/gate5-pr44-4ccb9fd (incl. contact/ (4), rc0-shots-webkit/ (3)).
Seen, rejected unreviewed (no manifest.json): qa/m3-recheck/gate4-4ccb9fd-evidence/{clock-firefox/shots (4), hidden-firefox/shots (10), rc0-firefox (3), rc0-webkit (3), shots-html (1), v6load (12)}
Seen, rehearsal (Chromium only, no manifest.json): qa/m3-recheck/gate5-final-prep/validate-4ccb9fd-chromium-0413/chromium (9), validate-4ccb9fd-chromium-cap/chromium (1), validate-4ccb9fd-chromium-migrated/chromium (4)
Seen, not a QA set (no manifest.json): scratch/m4-retune/handoff-T3-l30b/prod/critic/{shots (14), shots-dd52bfd (12)}
Seen, not a shot set (README assets): qa/wt-acw1-l30plus/docs/readme (4); scratch/m4-retune/handoff-T3-l30b/{tree, prod/critic/wt-7d52952}/docs/readme (8); scratch/m4-retune/handoff-T3c/tree/docs/readme (4)
Still waiting on: final M4-ON (#41) SHA delta set (target 05:30–06:00) with manifest, 3 engines, M4 UI, pre-M4 migration (tracksV7:1 + v6BackupId), F1 explainer at 360, diffed vs dd52bfd.
- 2026-10-19 04:55 CEST: PR #46 @ 24e3674 (wt-ui-shots/m4-gate5, 18 shots, manifest present). HOLD: 1 Major (EXP-b focus not returned, tracks-explainer.ts:24), 1 spec conflict (EXP-a vs §11 pass-through), 4 Minors; ruled toast/Welcome-back Major not re-counted. reviews/pr46-24e3674.md

## 2026-10-19 04:50 (reviews/screenshot-check-2026-10-19-0450.md) NO NEW IN-SCOPE SHOTS, nothing held
Already reviewed: wt-ui-shots/m4-gate5 (#46 @ 24e3674, 04:55 entry); qa/m3-recheck/gate5-pr44-4ccb9fd (04:15).
Seen, rejected unreviewed (no manifest.json): qa/m3-recheck/gate4-4ccb9fd-evidence/{clock-chromium (4), clock-firefox (4), clock-webkit (4), hidden-chromium (10), hidden-firefox (2), hidden-webkit (10), rc0-chromium (17), rc0-webkit (3), shots-html (2), v6load (36)}
Seen, rehearsal (Chromium only, no manifest.json): qa/m3-recheck/gate5-final-prep/validate-4ccb9fd-chromium-{0413 (9), 0417 (4), 0434 (4), profileB (2)}
Seen, not a QA set (no manifest.json): scratch/m4-retune/handoff-T3c/prod/critic/{shots (14), shots-dd52bfd (12)}; handoff-T3d/prod/critic/{shots (14), shots-dd52bfd (12)}
Seen, not a shot set (README assets): scratch/m4-retune/handoff-T3c/{ats,w_d,w_r08,w_u099,prod/critic/wt-7d52952}/docs/readme (20); handoff-T3d/{w,prod/critic/wt-7d52952}/docs/readme (8)
B branch: origin rc/m4-t3-capped = 9b79c75 (04:45, interim; final ETA 05:45 to spec v1.15). 65cbf3e (P46-M1 focus/toast fix) not in it yet. No QA set.
Still waiting on: final B SHA QA set with manifest, diffed vs dd52bfd and 24e3674.
- 2026-10-19 05:20 CEST | B m4-gate5-v2 (manifest aa59600, claimed c0bb3de) 24 shots; C m4-gate5-v115 (manifest bac1c27, claimed 0d4c0fe) 27 shots | REJECTED both: SHA mismatch, focus ring not visible, no 375/refund/reload/fresh/flag-off/pass-through/chip; copy, toast and L/30 OK | reviews/p46m1-fix-c0bb3de-0d4c0fe.md
- 2026-10-19 05:35 CEST | B reshoot m4-gate5-b-c0bb3de (manifest sha c0bb3de = head, rev 1) 81 shots, 3 engines × 360/375/390/1280 docked | INCOMPLETE, no build Major, nothing held. Pass: SHA, copy, card alone, Got it 48px, swallow 0-bought, reload/new-save absent, 1280 focus=collection, tabs 36/44. Unproven: Esc/Enter ring (360 only, tab row out of frame), refund card missing from refund-line shots, flag off, next-tap-buys, mobile focus=#collect needs ruling. origin rc/m4-t3-capped ref absent (Saves local 0ee8831 unpushed). | reviews/p46m1-reshoot-c0bb3de.md
- 2026-10-19 05:35 CEST | B m4-gate5-b-c0bb3de 81 shots (sha matches) | HOLD: B-M1 Got it focus→#collect, B-M2 refund-line-360 card hidden on all 3 engines; Minors: focus ring out of frame, no flag-off, no Best buy chip | C m4-gate5-v115 27 shots (manifest bac1c27≠0d4c0fe) REJECT | reviews/m4-gate5-b-c0bb3de-c-0d4c0fe.md
- m4-gate5-b-c0bb3de-refund (3 PNG, manifest) reviewed 05:30: B-M2 cleared

## 2026-10-19 05:52 (reviews/screenshot-check-2026-10-19-0552.md) NO NEW IN-SCOPE SHOTS, nothing held
B SHA: origin rc/m4-t3-capped = ffc3dfd (05:31; 0ee8831 + 085af12 v1.15 non-modal port + ffc3dfd B-M1 focus fix). Swallow check superseded by v1.15.
Seen, rejected unreviewed (no manifest.json, run in progress): qa/m3-recheck/gate5-final-ffc3dfd/{chromium (60), firefox (1)}. QA log: C5-gate-readonly FAIL ×4 widths (Chromium), to re-check on the manifest set.
Seen, rehearsal/probe (no manifest.json): qa/m3-recheck/gate5-final-prep/preview-B-0ee8831/{main/chromium (60), ext/chromium (6), rc0-shots (16)}; gate5-final-prep/refund360-c0bb3de (4)
Still waiting on: gate5-final-ffc3dfd with manifest, 3 engines.

## 2026-10-19 06:18: no new reviewable set, nothing held (reviews/screenshot-check-2026-10-19-0618.md)
Seen, no manifest.json: qa/m3-recheck/gate5-final-ffc3dfd (chromium 68, firefox 72, webkit 60; sheet-close probe still writing).
C5-gate-readonly (all engines): by design. A refused write aborts the tracksV7 migration for the session (game.ts:206/176), so no card until a reload commits it. Not a Major; C5b after-reload still to prove.
Still waiting on: gate5-final-ffc3dfd manifest. Partial verdict at 07:00 if still incomplete.
- 2026-10-19 06:55: Gate 5 final c11e3a0 (PR #49, ffc3dfd + test-script only) PARTIAL PASS, 0 Major, nothing held; B-M1 closed on activeElement 72/72. No manifest; gaps C5b, flag off, mid L10/L30 states, real refund. reviews/gate5-final-c11e3a0-partial.md
- 2026-10-19 07:15 (UTC+2) 51351f0 (child of c11e3a0, script-only diff): PASS 0 Major; flag-off via unit test, C5b via unit test plus reload shots. reviews/gate5-final-51351f0.md
- 2026-10-19 07:31 c9d7523 (storage-blocked gate fix): PASS 0 Major, own 3-engine g5 run 96/96 each + unit 22/22 (reviews/gate5-c9d7523-storage-blocked.md).
- 2026-10-19 10:25 (UTC+2) PR #54 @ 882b97f (M41-11/M4B-1 Egg value unlock level): PASS 0 Major; 48 states (360/375/390/1280 × 3 engines × F5/F6 locked + F7 unlocked/affordable) show 'Needs Farm L7' = data (cap F+3, V9); base dd223f5 shows L6. 1 Minor (copy-doc n=F+1 note stale), 3 pre-existing Nits. reviews/pr54-882b97f.md, shots/pr54-882b97f/ + manifest.
- 2026-10-22 19:45 (UTC+2) M4.1 PR #60 @ 5789805 (M41-11 lock label) PASS 0 Major, 1 Minor (farm-max pill reads like a disabled button), 1 Nit; PR #61 @ 33f1538 (build-id) PASS 0 Major (12px, 5.91:1, 12px clear of Reset save's 44px box). 39 shots (3 engines × 360/1280 + Chromium 375/390) + manifest. reviews/m41-pr60-pr61.md, shots/m41-pr60-pr61/.
- 2026-10-22 20:08 (UTC+2) PR #62 @ fcf9823 (M41-8 F4 strip + UX-M4 ★ Best buy chip): PASS 0 Major, 1 Nit (chip gold close to the selected-tab yolk). F4-13 confirmed by Head (toast artefact); F4-17 suffix never cut on 3 engines (reused eng checks 23/23 each); chip text 7.04:1; tap targets identical vs dd223f5. Reused 51 eng PNGs + 6 new (Chromium 360/375/390/1280, FF/WK 1280) + manifest. reviews/m41-pr62-fcf9823.md, shots/m41-pr62-fcf9823/.
- 2026-10-22 21:02 (UTC+2) PR #63 @ dfdf49c (M41-7 CSR): FAIL 1 Major (tracks explainer opens with the M1/M2 recovery dialog, tracks-explainer.ts:17), 1 Nit; P1/P2 fixed, primary 48.000 / Export 44.000 on 3 engines, copy verbatim vs spec cc6b7e23, no clipping, no red, focus/aria OK. 39 shots (7 states × 3 engines at 360 + M3/M5 at 375/390/1280) + manifest. reviews/m41-pr63-dfdf49c.md, shots/m41-pr63-dfdf49c/.
- 2026-10-22 21:25 CEST · M41-9 #64 @9b6fc4a + #65 @6041522 · reused #64 engineer manifests (3 engines, 504 el each, 0 clip); #65 set has no manifest → own 57 shots Cr155/Fx157/WK27.2 @360/375/390/1280 + manifest · #64 PASS; #65 PASS 1 Minor (Got-it mouse ring) 1 Nit · reviews/m41-9-pr64-pr65.md
- 2026-10-22 21:46 CEST · #62 @54118ec · engineer set rejected (no manifest.json) · own Chromium 155 renders 8 states × 360/375/390/430/1280 + fcf9823 pixel diff, manifest in shots/m41-pr62-54118ec/ · FAIL (1 Major, 1 Nit) · reviews/m41-pr62-54118ec.md
- 2026-10-22 22:38 CEST · #62 @09cee47 · engineer set m41-8-09cee47 has manifest (context only; FARM/W states absent from it) · own 184 shots Cr155 (360/375/390/430/1280) + Fx157/WK27.2 (360/390/430), pixel diff vs 54118ec, manifest in shots/m41-pr62-09cee47/ · PASS (1 Nit) · reviews/m41-pr62-09cee47.md
- 2026-10-23 00:22 CEST · #65 @7779088 + #64 @3110e88 · engineer sets m41-9-7779088 (manifest, 399) and m41-9-3110e88 (manifest, 144) accepted · own 132 shots Cr155/Fx157/WK27.2 (measure/focus/name only) + p65-tap jsonl, manifest in shots/m41-9-7779088-3110e88/ · #65 PASS, #64 PASS (2 pre-existing Nits) · reviews/m41-9-7779088-3110e88.md
- 2026-10-23 00:55 CEST · #63 @8694222 · no engineer set for this SHA · own 48 shots Cr155/Fx157/WK27.2 at 360 (M1–M5 dialog/after-close/reload + normal boot), manifest in shots/m41-pr63-8694222/ · PASS (1 Nit carried) · reviews/m41-pr63-8694222.md
- 2026-10-23 04:09 CEST · #65 @c877f69 · engineer set m41-9-c877f69 accepted (manifest.json valid, 570 shots, 0 missing) · own 12 shots + results JSON across Cr155/Fx157/WK27.2 in shots/m41-9-c877f69/ (576/576 scrolled taps, data-place=none lifecycle, m1/m2/M-1/n1) · PASS (0 findings) · reviews/m41-9-c877f69.md
- 2026-10-24 16:40 CEST · #67 RC1 @5d9efa6 · gates-m41-rc1-5d9efa6 REJECTED (no manifest.json) · m41-9-5d9efa6 ACCEPTED (manifest, 180 shots, no per-shot sha256; reused for WK 375/390 sweep) · own 469 shots Cr155/Fx157/WK27.2 + manifest.json in shots/m41-rc1-5d9efa6/ · PASS · reviews/m41-rc1-5d9efa6.md
- 2026-10-24 16:40 CEST · #69 @c849ccf · no engineer set · own 33 shots Chromium 360/390/1280 + manifest.json in shots/m41-p1-c849ccf/ · PASS (1 Minor) · reviews/m41-p1-c849ccf.md
- 2026-10-24 19:05 CEST · m41-pr70-30b29d3 · engineer set /workspace/wt-ui-shots/m41-p1-30b29d3/ ACCEPTED (manifest.json head 30b29d3 matches, 50/50 files, Chromium only); own FF/WK + 3-engine hud/yard set art-ux/shots/m41-pr70-30b29d3/ (217 files, manifest.json).
