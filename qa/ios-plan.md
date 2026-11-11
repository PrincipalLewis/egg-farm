# iPhone / iPad / Mac Safari test plan (QA, 2026-10-15)

## 1. Standing coverage: Playwright WebKit (free, in-box)
Script: `node qa/m3-scripts/webkit-safari.mjs <built worktree> [label]` → `qa/m3-webkit/<label>/results.json` + screenshots; exit 1 on any fail.
Profiles: iPhone 15, iPhone SE (3rd gen), iPad (gen 7), Desktop Safari 1280×800 (Mac stand-in). Engine: WebKit build 2370 via playwright-core 1.64.1.
Checks: SM-1 load+onboarding · SM-2 collect/sell/buy via taps · SM-3 save/reload · SM-5 F3 save, hire Market Hand via UI · Export (log JSON valid) · Reset (install_id kept, save_reset logged, F0, onboarding back) · SM-7 no overflow, Collect in view, targets ≥44 px · SM-8 5 rapid taps, no zoom/selection, touch-action · no console/page errors.

### Run 1 — m3-pt1 @ 0345680 (2026-10-15)
| Profile | Result |
|---|---|
| iPhone 15 | 9/9 PASS |
| iPhone SE | 9/9 PASS |
| iPad | 9/9 PASS |
| Desktop WebKit | 7/8 — **SM-7 FAIL** |

- **PT1-5 (minor, new):** at desktop width the Upgrades tab buttons (Collection/Farm/Workers) render 119×36 px, below AC13's 44 px minimum. Mobile layouts pass. Low impact with a mouse, but it violates the AC as written. Owner: Engineering, by rc0.
- First run SM-5 failure was a script bug (asserted coins===1000; wage tick made it 999). Assertion loosened to 990–1000; rerun clean.
- iOS-UA Export: no Web Share in Playwright WebKit, so the download path ran and the toast said "Log copied to clipboard". The file was valid. Real share-sheet behaviour is untested (see gaps).

What it does **not** prove: it's WebKit on Linux with an iOS UA and viewport. It is not iOS Safari: no iOS media/audio policy, no ITP, no Safari UI chrome, no real touch stack, no device CPU/thermal.

## 2. Gaps only real devices catch (ranked by risk for Egg Farm)
1. **Audio unlock + silent switch** — iOS needs a user gesture to resume AudioContext. The ring/silent switch mutes Web Audio on some iOS versions and not others. Verify that the first tap unlocks audio, there's no hang (the PT1-3 regression class), and SFX behaves with the switch on and off. *High.*
2. **Storage: ITP 7-day eviction, private mode** — Safari can delete script-written storage (localStorage) after 7 days without a visit, unless the site is added to the Home Screen. In Private mode storage is ephemeral. Risk: an idle game silently loses progress → needs a product/README decision (Export reminder). Verify the corrupt/missing-save path on device. *High (can't really be automated; 7-day clock).*
3. **Export via share sheet / Files** — on real iOS `navigator.share` with a file opens the share sheet ("Save to Files"). Verify the file name, the JSON content, cancel handling, and fallback. *Medium-high.*
4. **Safe-area insets, notch/Dynamic Island, home indicator** — `env(safe-area-inset-*)` is 0 in Playwright. Check that the bottom tab bar and Collect button aren't under the home indicator, in portrait and landscape. *Medium.*
5. **Address bar / dynamic viewport** — the collapsing toolbar changes `innerHeight`/`vh`. Check for layout jumps and for the Collect button being pushed off-screen; `100vh` vs `100dvh`. *Medium.*
6. **Backgrounding / tab discard** — iOS freezes or kills background tabs. Verify offline progress on return, a save before suspend (`visibilitychange`/`pagehide`), and no double-credit. *Medium.*
7. **Real touch & long-press** — callout/magnifier on long-press, text selection, double-tap zoom, 300 ms behaviour, palm/multi-touch. Emulated taps don't exercise these. *Medium.*
8. **Real performance** — frame time, battery and heat over a 10-minute session on an older device (iPhone SE/11 class). *Low-medium.*
9. **Mac Safari quirks** — real Safari 26 on macOS: download prompt/location for Export, ITP also applies, autoplay policy, trackpad pinch, ⌘R reload save. *Low-medium.*

## 3. Real-device options (prices checked 2026-10-15)
| | BrowserStack | LambdaTest (rebranded TestMu AI, Jan 2026) |
|---|---|---|
| Free trial | Usage-based, one-off: **30 min Live (1 min per device)**, 60 min Automate, 100 min App Automate [S3,S4] | Free forever: **5 real-device Live sessions/month, 2 min each**; Automation 100 lifetime minutes, 2 parallel [S2] |
| Live, real iOS (manual) | **Desktop & Mobile $39/mo billed annually**, 1 user [S1]. Freelancer $12.50/mo annual / $19 month-to-month (100 min App Live, 1 user) — whether it includes web Live on real iOS is *unverified* [S1, S4] | **Real Device Plus Live $39/mo billed annually** per parallel [S2]; monthly price *unverified* |
| Automated Playwright on real iOS | Automate **Desktop & Mobile $175/mo** (annual, 1 parallel); Pro $225 [S1] | **Real Device Plus Automation Cloud $199/mo** (annual, 1 parallel) [S2] |
| Playwright on real iOS Safari? | **Yes, GA** since June 2025; matrix lists Playwright 1.50.1–1.63, all iOS [S5,S6] | **Beta**, feature flag via account team; Playwright 1.53–1.60 (not 1.54); iOS 17/18/26 [S7] |
| Local build access | BrowserStack Local tunnel binary (localhost/staging included in all plans) [S1] | Lambda Tunnel (stated on Real Device plans) [S2] |

Note: we're on Playwright 1.64.1. Neither vendor lists it for iOS yet, so automation would need a pinned older Playwright — *unverified that 1.64 is rejected*. We can also skip the tunnel entirely by uploading `dist/` to any static host (a preview URL).

Sources (all fetched 2026-10-15):
- S1 https://www.browserstack.com/pricing
- S2 https://www.lambdatest.com/pricing (redirects to testmuai.com/pricing)
- S3 https://www.browserstack.com/support/faq/plans-pricing/plans/what-do-i-get-with-a-free-trial
- S4 https://www.browserstack.com/support/faq/plans-pricing/usage-plans-pricing/is-usage-limited-and-if-so-what-are-those-limits
- S5 https://www.browserstack.com/docs/automate/playwright/playwright-ios/nodejs
- S6 https://www.browserstack.com/docs/automate/playwright/browsers-and-os
- S7 https://www.testmuai.com/support/docs/playwright-ios-device/

## 4. Recommendation
1. **Keep the WebKit script as the per-build gate** ($0, ~80 s per run; already in place).
2. **Per release candidate: one manual real-device pass** using the gap checklist above (≈45–60 min per pass: iPhone SE + a recent iPhone + iPad + Mac Safari). Cheapest real option: **BrowserStack Live Desktop & Mobile, $39/mo billed annually (~$468/yr)**. It's GA, has 1 user and includes the Local tunnel. LambdaTest Real Device Plus Live is the same $39. Pick by trial feel. The free tiers (30 one-minute device slots / 2-minute sessions) are too short for a real pass, but they're enough to confirm the tunnel works.
3. **Don't buy automated real-iOS Playwright yet** ($175–199/mo). Most top gaps (silent switch, ITP 7 days, share sheet, long-press feel) are manual by nature, and the version pinning adds upkeep. Revisit after launch if iOS bugs escape.
4. **Cheaper alternative if anyone on the team has an iPhone/Mac:** $0. Host a preview URL and run the same checklist by hand. Hardware beats cloud for audio, the silent switch, haptics and performance. Effort is the same 45–60 min per RC.
5. Product decision needed regardless: the ITP 7-day eviction risk → an Export nudge and/or an "Add to Home Screen" hint.

No accounts created; nothing purchased.
