# M3 Test Plan: Public-Release Readiness (Head of QA, 2026-10-15, rev 1)
Source: product/m3-proposal.md (CEO-approved 2026-10-15), engineering/m3-smoke-plan.md v1. Drops: **pt1** Mon Oct 19 · **rc0** Thu Oct 22 · **rc1** Tue Oct 27 (Thu Oct 29 if rc0 slips). Severity: blocker/major/minor. CEO rulings: **Lighthouse Accessibility ≥90 is a gate. Lighthouse Performance is reported only.** Every result goes in `qa/m3-rc-report.md` (per drop) with build tag + commit.

## 0. Entry checks per drop (a drop is rejected if any fails)
| ID | Drop | Check | Method | Pass line |
|---|---|---|---|---|
| EN-1 | all | Build sanity | `npm test` (210+ tests), `npm run build`, `npm run smoke`, `sync-economy --check`; diff vs previous drop: no `src/sim`, `balance.json` or `economy.csv` change unless there is an approved change request | all green, diff clean |
| EN-2 | pt1 | **Telemetry keeps session 1** | Accelerated 4 h run (test-hook clock, sim time) with a session_start at t=0 and t=20 h, scripted play, then Export | Export holds the session-1 `session_start/session_end`, every `upgrade`, `onboarding_*`, `worker_hire`, `worker_manage*` from t=0. Only tap/customer_*/sell are trimmed (or the log holds ≥4 h) |
| EN-3 | pt1 | **Export log button** | Settings → Export log on B1, B2, B4 (WebKit), E1 iPhone; D1 real iPhone when V2 is decided | Chromium/Firefox download valid JSON (`JSON.parse` OK, `events[]`). WebKit/iOS: download or copy-to-clipboard fallback yields the same JSON. No console errors |
| EN-4 | pt1 | **install_id / build on session_start** | Inspect the export; reload ×2; clear storage ×1 | every `session_start` has `install_id` (random, ≥16 chars, stable across reloads, new after clear) and `build` = tag/commit |
| EN-5 | pt1 | Privacy | grep a sample export | no free text, IP, UA string or device name. Only `install_id`/`build` identify the export |
| EN-6 | pt1 | Playtest UI frozen | contrast swaps, AC5 hint, Workers intro present | all three present (§5 risk rule) |

## 1. AC checks
| AC | Check | Method | Owner (builds / verifies) | Pass line | Drop |
|---|---|---|---|---|---|
| AC1 | Post-rc1 items | Workers tab shows `icon-hire.svg`. Manage all greyed + `aria-disabled` for t∈[0,30) s of cooldown (DOM poll every 1 s). `worker_yawn` once per entry into ≤40% Working/Tired, not Unpaid/Asleep, re-armed after Manage (unit test + export). Full B1 regression (210 tests + `qa/rc2-scripts`). Pacing unchanged: AC7, AC-W1 (98%/30.7 Py, parity), AC-W4 5.75, AC-W4b 7.75 | Eng / QA | all pass; pacing numbers identical to m2-rc1 | pt1, re-run rc0, rc1 |
| AC2 | First upgrade ≤30 s | AC7 bot | Designer / QA runs | ≤30 s seller15 | every drop |
| AC3 | Onboarding | Fresh save: overlay shown once. Reload → not shown. Skip works. Export has `onboarding_step` 1–3 / `onboarding_skip`. Directional: ≥80% finish/skip ≤90 s (Designer, exports) | Eng / QA functional, Designer % | functional all pass. % reported only | pt1 |
| AC4 | Workers intro | F3 fixture: beat (a) tip opens Workers tab, logs `onboarding_step{name:'workers_hire_tip'}`. Hire → beat (b) coach bubble, logs `workers_coach`. Each shown once, also after reload. Directional: ≥70% hire ≤5 min | Eng / QA functional, Designer % | functional pass. % reported | pt1 |
| AC5 | Next-goal hint + dead zones | **QA step 1:** hint strip visible above Collect in each state: fresh save, mid-game (F10), nothing affordable (shows next unlock/countdown), max level, offline modal closed, panels open (mobile: strip stays above Collect), all 4 viewports. **QA step 2:** hint names the cheapest *useful* upgrade (spot-check 10 states against `cheapest affordable that raises income or capacity`). **QA step 3:** rerun the Designer's casual bot (100 seeds) and recompute the max dead zone independently. **Step 4:** export gaps (Designer), QA spot-checks 2 exports | Art & UX + Eng / Designer, QA | visible in 100% of states, 10/10 correct. Max dead zone ≤2 min in sim (directional in exports) | pt1 (UI), rc1 (exports) |
| AC6 | D1 + first session | **Script verification (QA, before the review):** 3 synthetic exports + edges, see §2 | Designer / QA | script output = expected for all synthetic cases | after pt1, before review (Oct 22) |
| AC7 | Playtest executed | Ops log: ≥10 testers, ≥2 sessions over ≥2 days, export received. QA: EN-2..EN-5 on pt1 | Ops / QA | entry checks pass; tester count reported | pt1 → Oct 22 |
| AC8 | Telemetry review | **QA step:** recompute 2 metrics (time-to-L10 median, worker hire rate) from raw exports with QA's own script, and check the review uses CIs + "insufficient data" (n<10 or <5 reaching) and the casual model (Py `run_m2`, seeds 0–99) as the reference | Designer / QA | QA values = review values (±1 s / ±1 pt); rules applied | rc1 |
| AC9 | Smoke matrix | SM-1..10 subset on every Must target; full regression on B1 (§3) | Eng harness / QA runs, triages | 0 failures, 0 console/page errors on all Must targets | pt1 (subset), rc0, rc1 (full) |
| AC10 | Real devices | §6 steps on D1 iPhone, B3 Mac, D2 Android | QA | all steps pass, or a written CEO waiver per gap | rc0 (first run), rc1 (re-run) |
| AC11 | Load + size | CDP load script, 3 runs median: 390×844, 4G 150 ms/9 Mbps, 4× CPU. TTI = first tappable egg. `gzip -9` sum of `dist` incl. audio/fonts; critical path from HAR. Lighthouse mobile Perf **reported only** | Eng / QA | TTI ≤3 s; total ≤500 KB; first load ≤150 KB | pt1 baseline, rc0, rc1 |
| AC12 | Frames/heap (SM-9) | §4 | Eng sampler+overlay / QA | SM-9 thresholds | rc0, rc1 |
| AC13 | Accessibility | axe-core (0 serious/critical) on 390 + 1280, all panels/tabs/modals. Manual keyboard pass B1: Tab order, Enter/Space, visible focus ring ≥3:1. Contrast: token list (`art-ux/m3-review.md` §1) via script, text ≥4.5:1 / large ≥3:1 / non-text ≥3:1. Targets ≥44 px (DOM bbox scan). Disabled = not colour-only. `prefers-reduced-motion` emulated → no tweens/flyers. SFX toggle persists. **Lighthouse Accessibility ≥90 (GATE)** mobile + desktop | Art & UX + Eng / QA | all pass; Lighthouse A11y ≥90 both | pt1 (contrast), rc1 (full) |
| AC14a–f | Save robustness | §5 | Eng / QA | §5 | rc0, regression rc1 |
| AC15 | Listing package | checklist vs AC15 list (counts, sizes 512×512, ≤80 chars, GIF ≤30 s, OFL fonts listed). Screenshots from rc1 | Product + Art & UX / QA spot-check | every item present | rc1 |
| AC16 | Sign-off | all gating ACs pass. AC3/4/6 reported. No open blocker. Majors only with a Product + CEO waiver. AC10 gaps per C4 | QA, Ops | report filed | rc1 Oct 27 (Oct 29) |

## 2. D1 script verification (AC6)
QA builds synthetic exports in `qa/m3-fixtures/exports/` (generator script, timestamps relative to the first `session_start`):
| Case | Sessions (h after first) | Expected D1 |
|---|---|---|
| S1 yes | 0, 26 | yes |
| S2 no (too soon) | 0, 5, 19.9 | no |
| S3 no (late) | 0, 48.1 | no |
| S4 edge low | 0, 20.0 exactly | yes (inclusive) |
| S5 edge high | 0, 48.0 exactly | yes (inclusive) |
| S6 two install_ids in one file / missing install_id | — | flagged, not counted |
| S7 first session 7.9 / 8.1 min | — | median-first-session input correct |
Pass: the script output matches the table for all 7 cases, and the "insufficient data" rule triggers with n<10.

## 3. Smoke matrix (SM-1..10 × targets; S = subset, F = full, — = n/a, M = manual)
| SM | B1 Chrome | B2 Firefox | B4 WebKit (proxy) | B5 Edge-Linux (once) | E1 emu iPhone/Pixel | D1 iPhone | B3 Mac Safari | D2 Android |
|---|---|---|---|---|---|---|---|---|
| SM-1 Load, 0 errors | F | S | S | S | S | M | M | M |
| SM-2 Core loop + empty nest | F | S | S | S | S | M | M | M |
| SM-3 Save v5, v4 + m1-rc2 fixtures, private mode | F | S | S | — | S | M | M | M |
| SM-4 Offline / clock-back | F | S | S | — | S | M (≥5 min) | M | M |
| SM-5 Workers, Manage all (portrait + docked), Unpaid | F | S | S | S | S | M | M | M |
| SM-6 SFX unlock/toggle | F | S | S | — | S | **M (critical)** | M | M |
| SM-7 Layout 390/360/768/1280(+1920), rotate prompt | F | S | S | S | S | M | M | M |
| SM-8 Input touch/mouse/keyboard | F | S | S | — | S | M | M | M |
| SM-9 Perf | **gate (headed :9)** | info | info | — | info | overlay gate | overlay | overlay gate |
| SM-10 Background/hidden tab | F | S | S | — | S | M | M | M |
Harness `scripts/xbrowser-smoke.mjs` writes `qa/m3-shots/<target>/<step>.png` + `summary.json`. Any console/page error fails the target. WebKit/E1 are labelled "proxy" and never count as Safari/device passes.

## 4. SM-9 sampler (AC12, verbatim rule)
In-page rAF sampler behind the test-hook gate (QA first verifies it's **absent/refused in the prod build**). F20+ save fixture, all 4 workers hired, scripted collect/sell/Manage loop. 10 s warm-up, then 60 s sample. **Pass:** p95 ≤20 ms, ≤5% frames >20 ms, no frame >100 ms, sim 10 Hz ±1 tick/s. Gate only on headed box runs on `:9` (B1). Headless and emulated are informational. Devices: read the on-screen overlay and screenshot it. 3 samples over a 15 min session, all must pass. **Heap (B1, CDP): growth min 5 → min 30 ≤10%.** A separate 4 h accelerated run checks only number overflow and large-value formatting (no NaN/Infinity/"e+" in UI). Sampler sanity: inject a 150 ms busy-wait → sampler must report a >100 ms frame. Drops: rc0, rc1.

## 5. Save robustness (AC14) — fixtures in `qa/m3-fixtures/saves/` (built 2026-10-15)
| ID | Check | Fixtures / method | Pass line | Drop |
|---|---|---|---|---|
| 14a | Real-save migration | `m1-rc2-v4-12min.json`, `m2-rc1-v5-12min.json`, `m2-rc1-v5-40min.json`, `m2-rc1-v5-40min-edge.json` (cooldown, Unpaid, Asleep, Tired) + synthetic v1–v3 (Eng). Unit test field-by-field + one manual reload per browser | coins, levels, workers, energy, cooldown, Unpaid, Grader tier equal. v4 → no workers | rc0 |
| 14b | Corrupt/truncated | `corrupt-truncated`, `-wrong-type`, `-version-99`, `-empty`, `-missing-state` (+ "bak also corrupt") | each loads `eggfarm.save.bak` with a notice. Bak corrupt → notice + fresh start. **Never a silent fresh start** (today `missing-state` silently starts at F0, the baseline bug) | rc0 |
| 14c | Quota / private | stub `setItem` → `QuotaExceededError`; WebKit private context; D1 Safari private tab | game keeps running; "progress won't be saved" shown exactly once | rc0 (auto), device run |
| 14d | Two tabs | two contexts on same origin in Chromium, Firefox, WebKit | 2nd tab shows the warning, goes read-only, the save bytes are unchanged after 60 s of play in tab 2 | rc0 |
| 14e | Clock tamper | shift saved timestamp −1 h / +10 h / +2 h exactly | back → 0 offline, no negative timers; forward → offline capped 2 h, worker energy + cooldown unchanged, cooldown ≤30 s | rc0 |
| 14f | Kill/background | D1/D2: buy upgrade, force-kill within 2 s, reopen; also background 30 s / lock 5 min | purchase persists; one offline modal | device run (rc0/rc1) |

## 6. Real devices (AC10) — pending Vadim's V1 (hosting/testers) and V2 (devices)
Blocked until V1/V2 (needed by Mon Oct 19). Per device (D1 iPhone iOS 18+, B3 Mac Safari, D2 mid-range Android Chrome):
1. Record model, OS, browser version. Build tag shown in Settings.
2. Private tab, open hosted URL: SM-1, SM-2, SM-5 by touch, ~10 min.
3. SFX: first tap unlocks; toggle mutes; iPhone silent switch on/off; reload + background keep the state.
4. Rotate → "Rotate for best view" prompt → back to portrait; notch/home-indicator safe areas.
5. Background 30 s, lock ≥5 min: one offline modal, eggs correct (SM-4/10).
6. 14f force-kill after a purchase. Close/reopen tab: save restored. iOS Add to Home Screen works.
7. SM-9: F20+ fixture test-hook build, overlay result screenshot ×3 over 15 min, note heat/stutter.
8. 14c private mode, EN-3 Export on device.
9. Write up in `qa/m3-device-report.md` with screenshots and a screen recording.
If any device is unavailable by rc1, that gap blocks release unless the CEO accepts the risk in writing (C4).

## 7. Lighthouse
Mobile + desktop presets on `vite preview` of the drop, 3 runs, median, **run as a Lighthouse user flow after "Tap to start"** (farm, Upgrades/Workers tab, Settings; a title-screen-only run is not a valid reading — pt1 finding PT1-7). **Accessibility ≥90 = gate (AC13).** Performance = reported only (AC11 gates on the CDP script). Best Practices/SEO reported. Drops: pt1 baseline, rc0, rc1.

## 8. Schedule (QA)
Oct 16 plan + fixtures + D1 synthetic exports · Oct 19 pt1 entry checks (EN-1..6), AC1/3/4/5 functional, smoke subset · Oct 20–22 D1 script verification, AC11/13 baseline · Oct 22–23 rc0: AC14a–f, SM-9, first device run (if V2) · Oct 26 rc1 build: delta, full B1 regression, device re-run, Lighthouse, AC8/AC15 checks · Oct 27 sign-off (Oct 29 if rc0 slips). Effort ≈5–5.5 QA days.

### Device log
- 2026-10-15 22:30 CEST: Android, Chrome (phone model and Chrome version not yet known). Build dd15dbf, private play link. Tested by Vadim. Result: playable. Informal session only; does not replace the D2 15-min SM checks.

## rc1 iOS coverage (C4 waiver, decisions.md Oct 15 22:56)
rc1 iOS unblocked. Gate = Playwright WebKit (iPhone 15, iPhone SE, iPad, desktop WebKit) + emulated iOS. Real-device pass waived for rc1; AC10 waived for rc1. AC14g (Home Screen tip) verified in emulation only.
Uncovered gaps, to be listed in rc1 report: iOS audio unlock/silent switch; 7-day storage eviction; share-sheet export; safe area/viewport; background tab freeze. Revisit before wide public launch.
AC14g scope (Product, Oct 15): tip on all iOS browsers unless standalone. Safari -> "Tap Share..." line; Chrome/Firefox/other iOS -> address-bar Share line; Android -> no tip. Verify via ?ios= flag + Eng UA unit tests; confirm ?ios= inert in release.
PT1-10 ruling (Product, Oct 15 23:47): during 30 s cooldown Manage all always visible, greyed (aria-disabled, >=4.5:1) with ring, both buttons. After cooldown: hidden if no worker <=0.4, active if any. Test in rc0.
- rc0 scope add (Oct 16 01:05): save-recovery dialog spec v1.1 QA checks 6-8 (storage-full 44px Export button, Settings re-export of old save during session, alertdialog role, export-failure message).
- rc0 scope add (Oct 16 01:35, Art & UX): rotate prompt (no overlay tablet/desktop, input blocked behind, focus, reduced motion); font credits (OFL.txt bundled, link opens it); save-recovery dialog screen reader + keyboard; verify Art & UX R1 (onboarding over Settings) and R2 (44px licence link), see art-ux/reviews/rc0-2fae4c4-review.md; recovery-v11-browser checks 6-8 and manual AC14f force-kill. Tag commit must be QA-checked (main moved to 16176a3 past precheck 2fae4c4).

- rc1 scope (from rc0 rulings, Oct 16): D2 force-kill repro in Chromium/Firefox/WebKit plus a check that the IndexedDB save mirror loads whichever copy is newer and valid; D3/D4 check that ?perf and ?debug do nothing in the release build; D5 next-goal button at least 44px on phones; D1 recheck. The rc0 sign-off waits on the CEO ruling on D2.

- AC7 re-baselined for F1 (Product, Oct 16) and HoP 23:15 P95 standard (Oct 16): once the F1 CSV merges, level at 30:00 must sit in L18-L22 (target L20) with **P95 across ≥30 seeds** (P95-low ≥L18 and P95-high ≤L22; need=ceil(0.95N)). L18-25 level steps: P95 ≤6 min and worst-seed ≤8 min. TR-5: ≥29/30 in band, gap P95 ≤3 / worst ≤4 min. 2× active/idle: P95 ≤2.0 (F22-24 exception P95 ≤2.15), worst ≤2.25. That replaces L18 at 24-36 min medians. The L30 band is unchanged. rc0 and earlier stay on the old AC7. QA runners: `qa/m3-scripts/ac7-*.py|mjs|sh`.

- rc1 Workers checks (m2-proposal section 8, items 19-20, and m2-workers-layout v1.1): "Refill tired (N)", where N counts workers at or below 40% energy, is hidden when N is 0 and there is no cooldown. During the 30 s cooldown it is greyed with a ring and a "Ready in Ns" caption. A per-worker Manage button is enabled only at or below 40%. When greyed, its caption reads "Not tired yet" or "Ready in Ns". This replaces the PT1-10 rule from rc1 on. Also: S2-3b preview text "+1 customer (max 9)" and the +N chip pulse (a colour flash under reduced motion); S2-1 coop tiers at L5, L10 and L20 told apart by silhouette and colour, and the toast showing above sheets; S2-5 nav labels; S2-6 chip at 375px.

- After the F1 merge, the balance checks add an L30 band of 180-300 min (seller15, 30 seeds). L30 is a ceiling, not a goal. Product says F1 reaches L30 at 196.5 min; QA will verify that.

- rc1 D2 suite adds single-tab guard checks TG-1 to TG-6 (product/single-tab-guard.md): two tabs in each engine, a force-kill of the owner tab (6 s takeover), offline earnings paid once, and a single tab behaving as in rc0. Note that incognito and normal tabs do not share storage.

- Yellow fragment check (Art & UX spec): on the m3/rc1-ui recheck, take a screenshot about 1 s after a toast or collect animation ends at 375px. If the fragment is gone, it is a timing artefact (Info). If it remains, it is a leaked particle (Low). Coin-pop particles must end on the money pill coin, stay inside the safe area and be removed when their animation ends.

- rc1 tab guard UI: run Art & UX TG-UI-1..8 (art-ux/single-tab-guard/spec.md) alongside TG-1..6 on the D2+guard build. S2-4a: verify Eng repro of both cases (single tab sheet+Manage; two tabs same incognito session) at EOD.

- m3/rc1-ui checks (Art & UX, Oct 16): S2-5 nav "Refill" 12px with red N badge, 64px, 4 equal nav buttons, no green fill. Cooldown shows "0:28" with aria-disabled and stays focusable. aria-label "Refill N tired workers" or "Refill available in 28 seconds", updated at most every 5 s. At 960px+ "Refill tired (N)" at 44px. Visible once 3+ hired and 1+ tired, and during cooldown. S2-4c welcome-back line "Market Hand sold X right away · +$Y" with real values formatted like 1.2K, hidden when 0 sold. S2-1 coop-l5/l10/l20 art differs, toast 2.5 s above or after the sheet, bounce while visible.

- S2-3a styling (Art & UX): the Thanks chip is 64x72 on #E3F1DC with no patience ring. "Thanks!" 12px #3D7F33 (4.9:1), "+$X" 14px formatted like 1.2K. Fades and slides up 8px over 200 ms; disappears instantly with reduced motion. aria-hidden, pointer-events none, not counted in the queue. Full queue: "+$X" pop 16px on Yolk, rising 24px over 600 ms along the coin path, inside the safe area; static 600 ms fade with reduced motion.

- rc1 adds (Oct 16, scope now closed): S2-8 red header rate when net is negative, "Wage $X/s" on hire cards and the worker panel, and the money drain equals the wage. S2-9 Market sheet never opens by itself; the tab gets a badge or pulse on a full queue, and Collect taps are never interrupted. S2-10 money and labels update on the same frame as the action, measured from tap to render (gate candidate).

- S2-8 wages, gate candidate: money never below $0, including during offline catch-up and over long accelerated runs. Workers pause when their wage is unpaid and resume once it can be paid. Selling and collecting by hand always work. Header rate shown at 0 as "$0/s"; negative shows a down arrow in red, updated at most every 1 s, with a single shake that is skipped under reduced motion. "Wage $X/s" on hire cards and the worker panel. S2-9: Market dot and pulse, re-pulse at most every 10 s, cleared on open or when the queue is no longer full, aria-label "Market, queue full".

- S2-3a-1 recheck: every served customer gets either the 1.5 s card or a "+$X" pop, never nothing. When the card is pushed out early, it fades over 120 ms (opacity only) and the 16px pop fires from its slot at the same time; under reduced motion the card is cut instantly and the pop stays. Extend s2-3a-mk.mjs.
- 2026-10-16 QA: AC14d = newest tab takes over (TG-1); D2 kill matrix + save_restore once-per-load added (rc1-d2-qa.mjs, rc1-guard-save-qa.mjs, rc1-780-qa.mjs).

- Release check list: window.eggfarm absent in the release build (CEO, rc1, Tue merge). Verify the release check fails if it is present. D1 save_restore fires only when IndexedDB wins (rc1 if ready, else rc2); recheck on the new SHA.

- S2-8 wage exactness (Product, Oct 16): 60 s of Market Hand wages equals $0.75 ±$0.01, with fractional cents carried forward. Wages under $0.10/s are labelled per minute. The net-rate line uses the exact charged value. Script: qa/m3-recheck/s2-8-wage-rate.mjs.

- After the Tue save rebase: verify scripts/release-globals-browser.mjs is a required CI step in all 3 engines and fails on any global other than eggfarmExportTelemetry (Eng owner, SHA to follow).
- Wage label recheck (next rc1-ui SHA): <$1K/s 2 decimals, >=$1K/s short form, boundary $999.99/s vs $1,000/s, 'Wage $999.99/s' one line at 360.
- Wage label final (Product): <$0.10/s per minute 2 decimals; $0.10/s to <$1,000/s per second 2 decimals ('Wage $12.34/s'); >=$1,000/s K short form. Test boundaries $0.0999/$0.10/s and $999.99/$1,000/s.
- Wed Oct 21 F1 CSV merge: confirm Economy posted a passing 'npm run check-economy-copy' run from the studio workspace, and rerun it myself on the merge SHA (Product process rule, Oct 16).
- rc1 ACs added (PM Market): MK-16..MK-22 (served card, leave anim, reduced motion, no-tap, first customer on return) and MK-23..MK-25 (per-egg price copy, partial Sell text, +$X pop on partial sale), product/market/feature-spec.md.
- F1 (Wed Oct 21): Market Hand min wait market_hand_min_wait_s=2. Holds and charges no wage while every customer has waited <2 s; serves and pays once one reaches 2 s; empty basket unchanged. Pacing targets (L5-14 s/level, L-at-30:00 band, L30 band without workers) in product/f1-proposal.md.
- Process (Head of Product): QA and playtests run only rc1 builds with the build hash shown in game; game-m3 is obsolete.
- Release rule (Vadim via CEO, Oct 16): after each playtest release, confirm the latest GitHub release on PrincipalLewis/egg-farm is marked Latest, its tag commit matches the in-game build hash, and the build loads and plays (collect, sell, upgrade, save/reload).
- rc2: queue-visibility-spec QV-1..QV-27 testability review after the Fri Oct 23 candidate.

## F1-GAP (Product, Oct 16 13:11)
- Test F1 against economy.f1.csv incl. F1-GAP: Farm cost row 18 = 11,076, row 19 = 18,201; w4_tier_cost = 5,538 / 9,100 (f1-proposal.md F1-GAP). Earlier F1 values obsolete.
- Rerun TR-5 via QA gate `python3 qa/m3-scripts/ac7-tr5-gate.py --seeds 30 --scenario standard` (and PM bot `product/farm/m4/tr5_run.py` until it adopts ceil(0.95N)); both read economy.f1.csv / M4 columns.
- CEO: F1 merges as soon as ready (with Market Hand hold logic); it need not wait for UI.

## Build hash location (Art & UX, Oct 16 13:20)
- From the next build, read the build hash from the Settings sheet header ("build <sha>", 12px muted); it stays in the top bar only at >=960px. release-check already reads Settings too; update the top-bar assertion when the build lands.
- Cosmetic: the worker-card Refill cooldown ring clips the "R"; the Refill icon should match the nav button (Engineering to confirm).

## MK-34..MK-39 (rc1, Market sell-button rule; product/market/feature-spec.md)
| AC | Test method |
|---|---|
| MK-34 per-card Sell count k = min(floor(basket), N − filled) | Fixtures with basket 0/1/2.9/exactly N−filled/≫N against cards with filled 0 and partial. For each rendered frame (rAF probe), read the basket pill and every card button. Assert label k == min(floor(basket), N−filled) from the same frame. Also a property test in the unit suite over random basket/filled. |
| MK-35 basket floor 0 gives "No eggs", disabled, shake, no-op | Fixture basket 0.6 with cards present: every per-card button reads exactly "No eggs", has aria-disabled=true and a greyed style, and no "Sell"/"+$" text. Tap each: the shake class is applied, there's no `sell` telemetry event, and coinsCents is unchanged. The card still shows filled/N. Sell all reads "No eggs to sell". 3 engines. |
| MK-36 leaving card never has an enabled Sell button | Force a timeout/served leave (fixture with patience ≈1 s, or Market Hand). Capture the button's aria-disabled on the leave frame, including while the list is pointer-frozen (hover/touch-hold). Tap the leaving card's button at the leave frame and +100 ms: no sell event, coins unchanged, basket unchanged. |
| MK-37 labels correct within one frame of any basket change | rAF probe: after each Collect, Coop Hand, Market Hand, Sell and Sell all, assert by the next frame that all visible labels and enabled states satisfy MK-34/35. Run 2 min of rapid input with the 10-tap harness in 3 engines; 0 mismatched frames. |
| MK-38 "Sell N · +$Y" uses the same k; Y = k × unit price (AC4 rounding); k ≥ 1 | Parse every enabled label and check N == k and Y == fmtMoney(round(k × price)). Do this for price fixtures with fractional cents. The label never shows k = 0. |
| MK-39 plurals | Queue fixtures with 1 and 2+ hidden customers: the visible text, the live region (#ordersLive) and the "+N" chip aria-label read "1 more customer waiting" / "N more customers waiting". Grep the bundle for "1 more customers" and expect no matches. |
