# M3 rc0 full test pass: tag `m3-rc0` = 16176a3 (Head of QA, 2026-10-16 01:45–02:25 CEST)

## Verdict: **NO SIGN-OFF** (one open Major, D2, with no waiver)
Everything else passes. The only blocker to sign-off is **D2**: in the AC14f force-kill proxy, a purchase is lost if the browser process dies within about 3 s. If Product and the CEO accept D2 as a browser-platform limit (waiver), or rule that the desktop kill proxy doesn't represent 14f, this pass supports **SIGN-OFF** with D1 and D3–D7 queued for rc1. AC10 (real devices) and the device half of 14f stay under the C4 waiver (gaps below).

**Build identity.** `git rev-parse m3-rc0^{commit}` = `16176a3e2bd7bd0661d8da5256f27a1ffd3ac739`. It's an annotated tag. I used a clean detached worktree `/tmp/qarc0/game` at the tag, with `../product` copied next to it and node_modules symlinked. `git status --short` was empty after the builds. The release build id is `m3-rc0+16176a3`. I killed stale `vite preview` processes before the run (5140, 5141, 5210), gave every script its own fixed port, and left another agent's `vite` dev server (5192, /workspace/rc0) running. All build artifacts and screenshots come from this tag. Nothing was taken from `engineering/screenshots/rc0-artux`. Nothing was committed, pushed or tagged.
**Harness.** Engineering scripts that write into `engineering/` were copied to `qa/m3-scripts/rc0-*.qa.mjs` (output → `qa/m3-rc0/`, port from `PORT`) and run from there. rc0-browser WebKit ran with `ENGINE=webkit`. New QA scripts: `rc0-ui-probe.mjs`, `rc0-ac14f-kill.mjs`, `rc0-f15.mjs`, `qa-rc0-long.test.ts`. Evidence is in `qa/m3-rc0/` (logs, JSON, `shots/`) and `qa/m3-webkit/rc0-16176a3/`.

## Run summary
| Run | Result |
|---|---|
| `npm test` (sync-economy check + vitest, incl. pacing/AC7/AC-W1/W4, offline, ac14, save-hardening, ios-tip, frame-sampler, recovery-v11) | **339/339**, 35/35 files |
| `npm run build` / `build:qa` | OK. `check-release-build: m3-rc0+16176a3 ok` |
| +dirty guard (second worktree at the tag + untracked file) | `npm run build` **exit 1**: "build id m3-rc0+16176a3+dirty - commit or stash…" ✔ |
| `rc0-browser` Chromium / WebKit (`ENGINE=webkit`) | **40/40 + 40/40** (PT1-4, PT1-5, PT1-6 axe, PT1-8, B1–B3, B5, B6, B8, Bug9) |
| `ac14-browser` Chromium / WebKit / Firefox | **17/17 ×3** (recovery dialog R/F/Q: copy, alertdialog, focus, Esc/scrim, focus trap, export, close→focus, quota once, two tabs) |
| `recovery-v11-browser` (v1.1 checks 6–8 + export failure) Chromium / WebKit / Firefox | **7/7 ×3** |
| `pt1-10-check` (PT1-10 final rule) Chromium / WebKit | **9/9 ×2** |
| `qa/m3-scripts/webkit-safari.mjs` (iPhone 15, iPhone SE, iPad, Mac WebKit) | **all PASS** (10/10/10/9), 0 console errors |
| `qa/csv_check.py product/economy.csv` | rows 31, **0 mismatches**; worker cols 28/28, 0 mismatches |
| QA unit (`qa-pt1` EN-2 4 h + migrations, `qa-recheck`, new `qa-rc0-long`) | **14/14** |
| `rc0-ui-probe` Chromium / WebKit | **27/30 ×2** (fails = D3, D4, tap grid D1 + D5) |
| `rc0-f15` (Art & UX F1–F5) Chromium / WebKit | **5/6 ×2**. The F4 "fail" is a harness regex (non-breaking space); the screenshot shows "0/50 eggs · $374.00" → F4 **PASS** by inspection |
| `rc0-ac14f-kill` Chromium / Firefox / WebKit | 14e **3/3 ×3**; 14f **FAIL** at kill ≤2 s, all 3 engines (D2) |
| SM-9 headed `:9` (B1 gate), 3 × 60 s samples | p95 16.8 / 16.7 / 16.7 ms; >20 ms 0.06% / 0% / 0.03%; max 66.7 / 16.8 / 33.3 ms; **PASS ×3**. Headless (info) p95 16.7 |

## AC traceability
| AC / item | Check | Result | Evidence |
|---|---|---|---|
| EN-1 | test/build/sync-check, clean tree | PASS | npm-test.txt, build*.txt |
| AC1/AC2 | regression + pacing (AC7 ≤30 s, AC-W1, W4/W4b) in suite | PASS | npm-test.txt |
| AC5 dead zones | accelerated 8 h greedy bot. Max no-purchase gap before max level is within the suite's AC5 tests. The 6589 s gap at F30 is after maxLevel 30 (nothing left to buy, expected) | PASS (sim) | long-session.json |
| AC12 SM-9 | headed :9 ×3, sampler and overlay render, screenshots | PASS (heap growth min 5→30 **not measured**, the samples weren't spread over 15 min; see gaps) | sm9-headed*.txt, shots/sm9-overlay*.png |
| AC12 sampler gate | `?perf=1` absent/refused in prod | **FAIL → D3** | ui-probe-*.txt, shots/ui-probe/release-perf1-*.png |
| AC14a | migrations v1–v5 + fixtures | PASS (unit) | ac14.test.ts, qa-pt1 |
| AC14b | corrupt → R/F dialog, `eggfarm.save.corrupt.<ts>` keep 3, `save_corrupt` {reason, had_backup, restored_from_backup, build}, QA cases 1–3 | PASS (unit `save-hardening` + browser ac14 ×3) | npm-test.txt, ac14-*.txt |
| AC14c | quota → notice once, Q dialog | PASS | ac14-*, rv11-* |
| AC14d | two tabs read-only | PASS (unit + browser) | ac14-* |
| AC14e | savedAt −1 h / +10 h / +2 h in 3 browsers: back → 0 offline, no negatives; forward → capped 2 h ("2h+", +36K eggs), cooldown 29.2 s ≤30, energy not advanced. In-session clock change: back gives nothing, +1 day simulates ≤60 s | PASS | ac14f-*.txt, clock-change.json |
| AC14f | **Proxy:** persistent profile, buy via the real button, SIGKILL the whole browser process tree after D ms, relaunch | **FAIL → D2** | ac14f-*.txt, ac14f-latency-*.txt |
| AC14g | `?ios=safari/chrome/standalone` on build:qa: Safari line, address-bar line, no tip; session 1 → no tip; real iPhone UA on release → Safari tip; `?ios=*` **inert in release** (no tip on a desktop UA) | PASS | ui-probe-*, shots/ui-probe/ac14g-* |
| Save-recovery v1.1 checks 6–8 | 44px outlined Export, Settings re-export, alertdialog name/desc, failure message | PASS ×3 engines | rv11-*, shots/recovery-v11/ |
| Recovery dialog SR + keyboard | role alertdialog, aria-modal, name "Welcome back!"/"A fresh start" + description; initial focus on primary; Tab cycles primary↔Export only; Esc/scrim don't close; focus → Collect on close | PASS | ac14-*, rv11-* |
| PT1-4 / PT1-8 / PT1-10 | | PASS | rc0-browser-*, pt1-10-* |
| +dirty | | PASS | dirty-guard.txt |
| Art & UX F1–F5 | F1 toast below the strip (top 144 vs strip 136), slot copy only on a real gain (L4→5 yes, L5→6 no); F2 "No eggs to sell", no $0.00; F3 5 cards at 390×844; F4 " · "; F5 strip 4+6 = Market 5+5 = 10 | PASS | f1-f5-*, shots/f1-f5/ |
| Rotate prompt | see UI sign-off below | PASS (D7 info) | ui-probe-* |
| Font credits | `/fonts/OFL.txt` bundled in dist (+ per-family LICENSE files), 200 + OFL text, link opens it in a new tab | PASS | ui-probe-* |
| D1 re-confirm | | still present (Low) | ui-probe-*, tap-grid-*.json |
| Big numbers / long session | 8 h accelerated: no NaN/Infinity, finite coins, clean formatting in reachable range | PASS. D6 beyond the reachable range | long-session.json |
| Offline earnings | unit (cap, <60 s, negative gap) + 14e browser | PASS | |
| AC10 real devices / 14f on device | — | waived (C4); not run | |

## UI sign-off confirmations (for Art & UX)
**Tap-area grid** (`rc0-ui-probe`, `tap-grid-{chromium,webkit}.json`). For every visible button, link, input and tab, I hit-tested the element's own box with `elementFromPoint` (1 px rows × 2 px columns), measured the effective hit width and height along the centre lines (±20 px into neighbours), and recorded which neighbour takes each lost point. I scanned the farm, Upgrades/Workers/Market panels and Settings at 360×640, 390×844 and 1280×800, in Chromium and WebKit, 67 control-instances per engine.
- **Licence link (D1): FAIL, still present.** Box 140×44, effective 140×**42.5**. The bottom 1.2 px of hits go to `#sReset` (Chromium 4.5% of points, WebKit 6.8%), the same at all three widths. The fix is on rc1-pending, not in this tag.
- **Next-goal button `#goal` (D5): under 44.** In portrait (360/390) it's 40 px tall (`--goal-h:40px`, per `art-ux/m3-next-goal-spec.md`), and the effective height is 40.5. Desktop is 44. There's no overlap with another control: the 2% of lost points are its rounded corners, which fall on the `.collectbar` background.
- Settings toggles `#sSfx`/`#sRm`: the input is 44×24, but it sits inside a `<label class="toggle">` row with min-height 44 that's full width, so the effective target is ≥44. PASS.
- Bottom tabs: the Market/Upgrades edges touch at x=102.7 (a sub-pixel shared edge, no real overlap). Desktop tabs are 119×44 with no overlap (PT1-8). `#settings` is 44×44: the round button's corners hit the HUD, but the centre lines are 44.5. Everything else is ≥44×44 and unobstructed. PASS.
**Rotate prompt** (Chromium + WebKit, 844×390 touch):
- Shown only on phone landscape. Tablet 1024×768 touch, desktop 1280×800 and phone portrait: no overlay. PASS.
- `role=alertdialog`, `aria-modal=true`, name "Turn your phone" (aria-labelledby), description "Egg Farm plays best in portrait." (aria-describedby), icon `aria-hidden`. PASS.
- Focus moves to the prompt (`tabindex=-1`) and `#app` is `inert`. A hit-test at Collect's centre lands on the prompt. A click plus Tab/Enter/Space don't reach `#app`. PASS.
- Dismiss (back to portrait): the prompt hides, `inert` is cleared, and focus returns to the element that had it before (Collect → Collect). PASS. **D7 (info):** Tab while the prompt is up moves focus to `<body>`, not back to the prompt. It's not reachable in `#app`, so it's harmless, but a strict modal would keep focus on the dialog.
- Reduced motion (emulated `prefers-reduced-motion: reduce`): wobble `animation: none`; with default motion it's `rp-wobble`. PASS.
**Save-recovery dialog:** see the AC table. Roles, names, descriptions, the focus trap, Esc and the tab order pass in 3 engines.

## Defects
| ID | Sev | Defect | Repro | Owner / target |
|---|---|---|---|---|
| D1 | Low | The licence link overlaps "Reset save" by 1.2 px, so the effective tap height is 42.5 px | Settings → scroll to "SIL Open Font License 1.1". `elementFromPoint(link.left+5, link.bottom-1)` = `#sReset`. 360/390/1280, both engines | Eng/Art & UX, rc1 (fixed on rc1-pending d0e4169 per Art & UX) |
| **D2** | **Major** | **AC14f proxy: a purchase is lost when the browser is force-killed within ~2–3 s.** The game saves synchronously on purchase (`game.ts:84`), but the browser commits localStorage to disk lazily. Results: Chromium lost at 0/100/500/1000/2000/3000 ms, kept at ≥5000 ms. Firefox lost at ≤2000 ms (the whole seeded save too, F=0 on reopen), kept at ≥3000 ms. WebKit lost at 0/100 ms, kept at ≥500 ms. No corruption and no recovery dialog: you just reopen to the state before the purchase | `PORT=4710 ENGINE=chromium node qa/m3-scripts/rc0-ac14f-kill.mjs <worktree>` (persistent profile, 40-min fixture, buy via `button.buy`, SIGKILL the process tree found by profile path, relaunch). `DELAYS=` sets the kill delays | Eng + Product/CEO ruling. Options: mirror the save to IndexedDB with `durability:'strict'`, or waive as a platform limit. A desktop SIGKILL isn't an iOS/Android app kill; the real-device check is still owed (C4) |
| D3 | Minor | The SM-9 sampler loads and runs in the **release** build with `?perf=1` (`frame-sampler-*.js` is in `dist`, overlay "SM-9 warm-up 10 s…"). Test plan §4 / smoke plan: "absent/refused in prod" | Release `dist`, open `/?perf=1` | Eng, rc1 (rc1-pending notes say "QA hooks compiled out"; to verify there) |
| D4 | Minor (needs ruling before public) | The `?debug=1` panel (add coins, skip time) ships in the release build (`panel-*.js` loads) | Release `dist`, `/?debug=1` | Eng/CEO |
| D5 | Low | The next-goal button is 40 px tall in portrait, below the ≥44 px tap-target standard. It matches spec tokens, so it's a spec conflict | 360/390, `#goal` height 40 | Art & UX ruling |
| D6 | Low | Big-number formatter has no suffix above B: `$1000B` at 1e14 cents, `1e+21B`/`$1e+89B` at extremes (counts ≥1e21 show "e+") | `fmtMoney(1e30)` = `$10000000000000000000B` | Eng. Not reachable in M3 (≈$0.5M after 8 h at max level); fix before prestige/live ops |
| D7 | Info | The rotate prompt doesn't keep keyboard focus: Tab moves to `<body>` | Phone landscape, press Tab | Eng/Art & UX, optional |

## C4 waiver gaps (decisions.md Oct 15 22:56, Vadim)
Not covered by this pass (only Playwright WebKit + emulated iOS):
1. iOS audio unlock and the silent switch
2. 7-day ITP storage eviction
3. Share-sheet export
4. Safe area/viewport (notch, home indicator)
5. Background-tab freeze

Also not run: AC10 real devices (D1 iPhone, B3 Mac, D2 Android), the device half of 14f (force-kill/background 30 s/lock 5 min), and the SM-9 device overlay. These are to be revisited before any wide public launch.

## Not covered / deviations
- SM-9: the 3 headed samples ran back to back (~3.5 min), not spread over a 15 min session. Heap growth min 5→30 wasn't measured. The 150 ms busy-wait sanity check is covered only by the unit test ("any frame >100 ms fails"), not in the browser.
- Lighthouse and the full axe sweep are rc1 scope (axe on key surfaces is in rc0-browser, 0 serious).
- Exploratory: I found no confusing UI beyond D5–D7. The HUD shows "$0.00" at 0 coins, which is correct and outside F2's Market scope.
- The worktree `/tmp/qarc0/game` (clean, at the tag) was left for re-runs. The guard worktree was removed.

## Sign-off (Oct 16, 02:16)
QA SIGNS OFF m3-rc0 (16176a3) for internal playtest only, per the CEO ruling. Known issues: D2 and D4 (waived for rc0, must-fix and blocking for rc1 and any public build), D3 (rc1), D1, D5, D6 (Low), D7 (Info). The C4 waiver gaps are as listed above.
