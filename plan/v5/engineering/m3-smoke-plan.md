# M3 Cross-browser and Real-Device Smoke Plan: QA-reviewed v1

**Status:** QA-reviewed v1 (Head of QA approved, with edits 5, 6, a–d applied 2026-10-15).
**Author:** Head of Engineering · 2026-10-15
**Build under test:** `m2-rc1` @ `bf1962a` (and later `post-rc1/polish` commits)
**Source of checks:** qa/m2-test-plan.md (§4, §6, §7), product/core-loop-spec.md (M1 AC1–AC11)

## 0. Research findings (box, 2026-10-15, nothing installed)
| Question | Finding |
|---|---|
| Playwright in repo? | **Partly.** `playwright-core@1.64.1` is a devDependency. There is no `@playwright/test` runner and no bundled browsers (`~/.cache/ms-playwright` doesn't exist). Existing scripts (`scripts/smoke.mjs`, `screenshot*.mjs`) drive system **Google Chrome 154** (`/usr/bin/google-chrome`) on Chromium only, at 390×844 with touch. |
| Chromium on box | **Works today** through system Chrome. `npm run smoke` already passes. |
| Firefox / WebKit on box | **Not runnable yet**: the browser builds aren't downloaded. Box: Debian 13 (trixie), x86_64, 8 CPU, 15 GB RAM, display `:9`, passwordless sudo available. Playwright 1.64.1 would fetch **Firefox 157.0**, **WebKit 27.2** and Chromium/CfT 156. |
| Missing system libs (find over /usr/lib) | Present: gtk-3, gstreamer-1.0, nss3, asound, gbm, Xt, hyphen, x264, opus, flite, webpdemux, harfbuzz-icu, epoxy, xslt, vpx. **Missing (WebKit mostly):** libgtk-4, libwoff2dec, libgstplayer (gst-plugins-bad), libmanette-0.2, libenchant-2, libsecret-1, libavif, libevent-2; **Firefox:** libdbus-glib-1. |
| Commands that would be needed (NOT run) | `cd game && npm i -D @playwright/test@1.64.1` (optional runner) · `npx playwright install chromium firefox webkit` (downloads about 400 MB from cdn.playwright.dev; free, no account) · `sudo npx playwright install-deps chromium firefox webkit` (apt installs the missing libs above). Alternative: run the official free image `mcr.microsoft.com/playwright:v1.64.1-noble` in Docker, if Docker is available. |
| Desktop VM vs real phone | A Linux box covers Chromium/Chrome, Edge (same Blink engine; real Edge for Linux is a free download, optional), Firefox, and **WebKit as a proxy for Safari**, plus emulated mobile viewports/touch (`devices['iPhone 13']`, `devices['Pixel 7']`). **It cannot test:** real iOS Safari (iOS forces every browser onto WebKit, with its own audio-unlock, 100vh/safe-area, bfcache and tab-kill behaviour), real macOS Safari, real touch latency, GPU/thermal fps on phones, OS backgrounding and memory pressure, rotation. **Gap: iOS/macOS Safari need a real iPhone or a Mac.** We have neither in the studio today. |

## 1. Browser / device matrix
| # | Target | Version | Viewports | Where | Priority |
|---|---|---|---|---|---|
| B1 | Chrome desktop | stable 154 (box) + Playwright CfT 156 | 1280×800, 1920×1080, 768×1024 | box, automated | **Must** (full regression) |
| B2 | Firefox desktop | 157 (Playwright build) | 1280×800, 768×1024 | box, automated | **Must** |
| B3 | Safari macOS | 18.x / 26.x latest | 1280×800 | needs a Mac | **Must** for public release (proxy: B4 until a Mac exists) |
| B4 | WebKit (Playwright) | 27.2 | 390×844, 1280×800 | box, automated | **Must** (Safari proxy, doesn't replace B3/D1) |
| B5 | Edge desktop | Microsoft Edge for Linux, stable (free download) | 1280×800 | box: one real Edge run of SM-1, SM-2, SM-5, SM-6; Chromium covers the rest | **Must** (single run). Windows run only if that run or telemetry shows an Edge-specific bug |
| D1 | iOS Safari, recent iPhone | iOS 18+/26 | 390×844 portrait (+landscape) | **real device** | **Must** |
| D2 | Android Chrome, mid-range (e.g. Pixel 6a / Galaxy A5x) | Android 13+, Chrome stable | 393×851-ish portrait | real device (Android emulator on box = fallback) | **Must** |
| D3 | iPad Safari / Android tablet | latest | 768×1024 | real device | Nice-to-have |
| D4 | Samsung Internet, Firefox Android | latest | phone | real device | Nice-to-have |
| E1 | Emulated phones (Playwright `iPhone 13`, `Pixel 7` on WebKit/Chromium) | — | 390×844 / 412×915, hasTouch | box, automated | **Must** (cheap pre-filter) |

Layouts: 390px portrait (mobile), 768px (tablet/breakpoint edge), 1280px (desktop docked, ≥960px).

## 2. Smoke checklist (per target; "S" = smoke subset, "F" = full on B1 only)
| ID | Check | Source |
|---|---|---|
| SM-1 Load | Cold load from preview URL, "Tap to start", onboarding shown, **0 console/page errors**, fonts render | M1 AC10, smoke.mjs |
| SM-2 Core loop | Coop fills (AC1), Collect moves min(coop, per_tap) (AC2), customers queue/demand (AC3), Sell credits ×price (AC4), Upgrade disabled/deducts (AC5), empty nest shows no eggs | AC1–AC5 |
| SM-3 Save/load v5 | Reload restores coins/coop/basket/levels/workers/grader tier/energy/cooldown/Unpaid (save `version: 5`); v4 save fixture **and a real m1-rc2 save** both migrate with no workers and no crash; storage disabled/private mode doesn't crash | AC8, OFF-4 |
| SM-4 Offline | Shift saved timestamp ≥ 60 s (automated) / real ≥ 5 min (devices): modal once, eggs = floor(min(t,7200)×0.25×eps), 2 h cap, clock-back → 0, workers frozen offline | AC11, OFF-1–3, O1–O14 |
| SM-5 Workers | Hire W1 at F3; energy drains; Manage refills + 30 s global cooldown; **Manage all** (portrait + desktop docked button); Unpaid stays Unpaid; Asleep + Unpaid resume case | §2–3, U-2, rc-report §7 |
| SM-6 SFX toggle | Toggle mutes/unmutes; persists over reload; first tap unlocks audio (**iOS critical**); no audio before a gesture; **iPhone: the toggle state survives a reload, and audio still works after the app has been backgrounded and resumed** | M1 Art & UX |
| SM-7 Layout | 390, 768, 1280 (+1920): no overlap/clipping, docked panel at ≥960, safe-area/notch on iPhone, landscape doesn't break | §7 desktop smoke |
| SM-8 Input | Touch taps (no 300 ms delay, no double-tap zoom, no text selection on rapid tap), mouse + keyboard (Tab/Enter/Space reach buttons) | §7 |
| SM-9 Performance | **Sampler:** in-page rAF sampler exposed behind the existing test-hook gate (off in prod). **Scenario:** F20+ save fixture, all 4 workers hired, scripted collect/sell/Manage loop; 10 s warm-up, then 60 s sample. **Pass:** p95 frame time ≤ 20 ms, ≤ 5% of frames > 20 ms, no frame > 100 ms, sim 10 Hz ±1 tick/s. **Box:** gate only on headed runs on `:9`; headless numbers are informational. **Real devices:** the sampler writes its result to an on-screen debug overlay. **Heap (B1):** measured via CDP; growth from min 5 to min 30 ≤ 10% | §7, QA edit 6 |
| SM-10 Background | Hidden tab < 60 s simulated, ≥ 60 s frozen after the first 60 s; real app switch/lock on phones resumes without a duplicate offline modal | OFF-5, §7 |

## 3. Running it on the box
```bash
cd /workspace/egg-farm-studio/game
git checkout m2-rc1            # or the commit under test
npm ci && npm test && npm run build
npx vite preview --port 4174 --strictPort --host 127.0.0.1 &
npm run smoke                  # existing Chromium smoke (works today)
```
Automated cross-browser pass (to be written by Engineering as `scripts/xbrowser-smoke.mjs`, needs the installs from §0):
```js
import { chromium, firefox, webkit, devices } from 'playwright-core';
const targets = [
  ['chromium-1280', chromium, { viewport:{width:1280,height:800} }],
  ['chromium-768',  chromium, { viewport:{width:768,height:1024}, hasTouch:true }],
  ['firefox-1280',  firefox,  { viewport:{width:1280,height:800} }],
  ['firefox-390',   firefox,  { viewport:{width:390,height:844}, hasTouch:true }],
  ['webkit-iphone', webkit,   devices['iPhone 13']],
  ['webkit-1280',   webkit,   { viewport:{width:1280,height:800} }],
  ['chrome-pixel',  chromium, devices['Pixel 7']],
];
for (const [name, type, ctx] of targets) {
  const b = await type.launch(type === chromium ? { executablePath: process.env.CHROME } : {});
  const page = await (await b.newContext(ctx)).newPage();
  // collect pageerror/console errors -> fail
  // SM-1 load, SM-2 core loop (reuse smoke.mjs steps), SM-5 hire+Manage/Manage all,
  // SM-6 sfx toggle state, SM-3 reload + v4 fixture, SM-4 offline via localStorage timestamp shift,
  // SM-9: load F20+ fixture, hire all 4 workers, scripted loop; 10 s warm-up + 60 s test-hook rAF sampler
  //       (gating only when headed on :9); B1 also: CDP heap at min 5 and min 30 (≤ 10% growth)
  // screenshot per step: ../qa/m3-shots/<name>/<step>.png
  await b.close();
}
// write ../qa/m3-shots/summary.json (target x check -> pass/fail, fps, tick rate)
```
Plus a one-off real Edge run (`executablePath: '/usr/bin/microsoft-edge-stable'`, 1280×800, SM-1/2/5/6). Run time is about 10 min for 8 targets (60 s+ perf each); the 30-min heap run on B1 is separate. Headed mode on `:9` lets someone watch.

## 4. Manual real-device steps (D1, D2; B3 if a Mac is available)
1. Serve the build so the phone can reach it: a static host or LAN `vite preview --host 0.0.0.0`. The box isn't reachable from a phone by default, so the **hosting route is an open question** (§7).
2. Fresh install: open the URL in a private tab, run SM-1, SM-2 and SM-5 by touch, for about 10 min of play.
3. SFX: confirm the first tap unlocks sound and the toggle mutes it; check with the silent switch on and off (iPhone).
4. Rotate portrait → landscape → portrait; check the notch/home-indicator safe areas.
5. Background the browser for 30 s, then for ≥ 5 min (lock the screen): resume and check one offline modal with the correct eggs (SM-4, SM-10).
6. Close the tab, reopen it, and check that the save is restored (SM-3). Add to Home Screen (iOS) and check it works.
7. Perf: load the F20+ fixture on a test-hook build, run the 10 s + 60 s scripted loop, and read the SM-9 result from the on-screen debug overlay (screenshot it). Then play for 15 min and note stutter and heat.
8. Record device/OS/browser versions, screenshots and a screen recording in `qa/m3-device-report.md`.

## 5. Exit criteria
- Tag under test: **`m2-rc1` @ `bf1962a`**. Any later build needs a new tag and a rerun.
- **Any console error or page error on any target fails the run.**
- All **Must** targets pass SM-1…SM-10 (S subset; full regression on B1, incl. qa/rc2-scripts and the 210 unit/QA tests).
- 0 Blocker/Critical; Majors waived only by Product + CEO (per m2-test-plan §7).
- Perf: SM-9 pass thresholds met in headed box runs and on D1/D2 via the overlay; B1 heap growth from min 5 to min 30 ≤ 10%.
- Screenshots for every target × layout archived; QA report filed and signed by Head of QA.
- If D1/B3 can't be covered, **release is blocked** unless the CEO explicitly accepts the iOS/Safari risk in writing.

## 6. Owners and effort
| Task | Owner | Estimate |
|---|---|---|
| Install browsers/deps + Edge for Linux on box (after OK) | Engineering | 1 h |
| `xbrowser-smoke.mjs` + offline, v4 and m1-rc2 save fixtures + screenshots + Edge run | Engineering | 1–1.5 days |
| Test-hook rAF/tick sampler + F20+ fixture + scripted loop + CDP heap probe | Engineering | 0.5–1 day |
| On-screen debug overlay for real devices (test-hook gated) | Engineering | 0.5 day |
| Hosting a build reachable from phones | Engineering (+ CEO decision) | 0.5 day |
| Automated pass triage, 3 browsers × layouts | QA (+ Eng fixes) | 0.5 day |
| Real-device sessions, D1 + D2 (+ B3) incl. overlay perf, iPhone SFX checks | QA | 1–1.5 days |
| Report + sign-off | Head of QA | 0.5 day |
| **Total** | | **about 5.5–7 working days** (Eng 3–4, QA 2.5–3), plus fix time |

## 7. Open questions / approvals needed
1. **Browser installs: APPROVED by the CEO 2026-10-15 21:49.** Playwright browsers (`npx playwright install`), apt deps (`sudo npx playwright install-deps`) and Microsoft Edge for Linux on the shared box. Free, no account. Install and first run in progress.
2. **iOS Safari + macOS Safari gap:** who supplies a real iPhone and a Mac? Vadim's own devices, or a cloud farm (BrowserStack / Sauce Labs / LambdaTest real-device iOS). Cloud farms are paid. **Needs Vadim's approval (not only the CEO's)**, both for a paid cloud farm and for using Vadim's own devices. Not set up.
3. **Android real device (needs Vadim's approval):** Vadim's phone, or a free Android emulator on the box (no KVM check done yet) as a weaker fallback?
4. **Hosting for phone access:** free static hosting (e.g. GitHub Pages from the repo) vs a tunnel. Either one makes the build public. **Needs Vadim's approval (not only the CEO's).**
5. ~~Edge on Windows?~~ CLOSED by QA: Chromium + one real Edge for Linux run; Windows only if a bug shows up.
6. ~~Perf thresholds~~ CLOSED by QA edit 6 (see SM-9).

## Changelog
- 2026-10-15 v1 (QA-reviewed): applied Head of QA edits: (5) real Edge for Linux run, no Windows by default; (6) SM-9 replaced with test-hook rAF sampler, F20+ scenario, thresholds, headed-only gating, device overlay, CDP heap ≤ 10%; (a) m1-rc2 save in SM-3; (b) iPhone SFX reload/background checks; (c) exact tag + fail on any console/page error; (d) §7 items 2–4 need Vadim's approval. Effort raised to about 5.5–7 days.
- 2026-10-15 21:56: §7.1 updated, browser installs CEO-approved (QA N8, matches product/m3-proposal.md). Schedule per M3 proposal: m3-rc0 Thu Oct 22 (save hardening + frame sampler/overlay), m3-rc1 Tue Oct 27 if rc0 lands, else Thu Oct 29.
