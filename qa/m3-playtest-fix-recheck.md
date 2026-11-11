# M3 playtest-fix re-check (Head of QA, 2026-10-15 23:50 CEST)
**Commit tested:** `game` branch `m3/rc0` @ **50b4b18** (range d72008a..50b4b18), fresh worktree `/tmp/efs2/game` (clean tree). Not tested: 576b28a (B6, landed after the range) and the uncommitted WIP in the main checkout (`scripts/rc0-browser.mjs`, `src/ui/app.ts`).
Product inputs for the suite: `product/` as of `economy.pre-p1q.csv` (the build's balance.json was synced from it). The live `economy.csv` (P1q, 23:41) is not what 50b4b18 was built against, see PT1-11.
Sources: `playtest/triage/2026-10-15-session1.md`, `qa/m3-pt1-report.md`.

**Verdict: all 7 items PASS.** 3 new defects (PT1-9 major, PT1-10 minor, PT1-11 major, process), 1 QA-side info item. The suite is not green on a clean checkout because of PT1-9 and a stale parity fixture (QA-2).

## 1. Per item
| Item | Original issue / repro | Verdict | Evidence |
|---|---|---|---|
| B1 | "New helper!" banner still shows after hiring the Market Hand | **PASS** | rc0-browser (Chromium + WebKit): banner present before hire (count 1), gone right after hire and still gone 30 s later. Code: banner removed as soon as `workers.market_hand` exists, whatever path the hire took |
| B2 | "Coop upgraded" toast stuck half off-screen | **PASS** | Upgrade to L5 at 390 and 1280, both engines: shown at top 64 px, visible. Afterwards bottom = −8 px, `visibility:hidden`, opacity 0, so it's fully off-screen |
| B3 | Goal chip SR text out of date, "1 minutes" | **PASS** | QA unit (`qa-recheck.test.ts`): "~1 min" → "about 1 minute", "~2 min" → "2 minutes", "1 minute 1 second", "1 hour 5 minutes", "45 seconds". Browser: aria-label matches the visible label/status. The live region is cleared after it announces. It only announces when the target or state changes, not on every 1 Hz tick (code review) |
| B5 | "Manage all" counts workers at 81% or more | **PASS** | QA unit: `manage_prompt_threshold` = 0.4 in balance.json. Player repro (81/85/90%): N = 0, pill hidden, Farm View button hidden. Boundary: 40% counts, 41% doesn't, "(1 need it)". Asleep/low workers are counted. Per-worker Manage is enabled only at 40% or below. Side effect, see PT1-10 |
| PT1-4 | Corrupt-save fallback keeps FTUE/Workers-tip flags | **PASS** | Corrupt save + old done-flags: FTUE runs again (`onboardingDone:false`, `onbStep:1`). The sfx pref is kept (`sfx:false`). The `.bak` restore path keeps the flags, by design |
| PT1-5 | Reload mid-onboarding drops the overlay silently | **PASS** | Reload at step 2 logs `onboarding_abandon {atStep:2, reason:"reload"}`, and no overlay is left half-running. Engineering chose "log abandon", not "resume", which was one of the two fixes the pt1 report allowed |
| PT1-6 | axe: `aria-prohibited-attr` #queue, label mismatch #scene, `aria-dialog-name`, no h1 | **PASS** | axe in both engines: 0 serious/critical. `#queue` role=group, `#scene` aria-hidden (Collect stays a real button), the onboarding caption is a named dialog, sr-only h1 present. Full rc1 axe + Lighthouse user-flow still planned (PT1-7) |

Also passing in the same range: PT1-8 (desktop tabs 119×44 at 1280 and 960, no overlap) and AC14g (UA unit tests in the suite). AC14g browser checks are covered in the separate AC14g pass.

## 2. Test counts
| Run | Result |
|---|---|
| `npm test` (Engineering suite, 27 files) | **290/292** on a clean checkout. Failures: build-id test (PT1-9) and the economy parity fixture (QA-2). With the Vite timestamp file excluded: **291/292** (only QA-2 left) |
| `npm run build` / `build:qa` | OK (`sync-economy --check` OK against pre-p1q CSV) |
| `scripts/rc0-browser.mjs` Chromium / WebKit | **15/15** + **15/15** (`qa/m3-recheck/rc0-browser-*.txt`) |
| `qa/m3-scripts/webkit-safari.mjs` (iPhone 15, iPhone SE, iPad, Mac WebKit) | **35/35** pass, 0 console errors, build `m3-rc0+50b4b18` (`qa/m3-webkit/recheck-50b4b18/`). The first attempt failed when the preview server dropped mid-run (harness flake); the re-run was clean |
| `qa/m3-scripts/qa-pt1.test.ts` (EN-2 4 h + fixture migrations) | **6/6** (output in `qa/m3-recheck/`) |
| `qa/m2-scripts/qa-independent.test.ts` | **17/18**. U-4 expects "All rested" at N = 0, which is the old M2 rule that B5 replaced on purpose. Expected change: QA will update U-4 |
| `qa/m3-scripts/qa-recheck.test.ts` (new, B3 + B5) | **6/6** |
Not re-run: `qa-pt1-browser.mjs` and `qa-pt1-ftue.mjs` (paths hard-coded to the pt1 worktree; their EN-3/FTUE coverage overlaps with webkit-safari and rc0-browser), and AC-W4/W4b/W1 (no sim change in the range).

## 3. New defects
| ID | Sev | Defect | Fix |
|---|---|---|---|
| PT1-9 | **Major** | Every build reports `+dirty`, even from a clean tree. While Vite loads the config it writes `vite.config.ts.timestamp-*.mjs` into the project. `gitBuildId()` runs during that load, `git status --porcelain` sees the file, and the result gets `+dirty`. Repro: clean worktree, `npx vite build`, bundle says `m3-rc0+50b4b18+dirty`. This defeats the PT1-1 "dirty" signal and fails `telemetry-m3` "BUILD_ID … matching HEAD". Confirmed: excluding `vite.config.ts.timestamp-*` gives `m3-rc0+50b4b18` and the test passes | add `vite.config.ts.timestamp-*` to `.gitignore` (or skip it in `gitBuildId`) |
| PT1-10 | Minor (UX) | B5 side effect: after "Manage all" everyone is at 100%, so N = 0 and the pill and Farm View button disappear for the whole 30 s cooldown. The shared cooldown ring from M2 §4.6 is no longer visible anywhere, and the cooldown label branch in `manageAllHtml` can't be reached | Art & UX / Product to rule whether to show the ring somewhere during cooldown. Otherwise accept and update M2 §4.6 |
| PT1-11 | **Major** (process, not this commit) | Live `product/economy.csv` (P1q, merged 23:41) fails `sync-economy --check`: "could not fit customerIntervalDecay". Once synced, `npm test` and `npm run build` both stop before running anything | Engineering updates `src/config/formulas.ts` for the P1q interval formula when P1q is synced (with Economy). Gate the P1q merge on a green `sync-economy` |
| QA-2 | Info | Parity test "fixture is fresh vs the live reference sim" fails because `product/sim/economy_sim.py` changed at 23:24 (Economy P1 work) after the fixture was made (19:45). This is drift, not a code regression | `npm run gen-fixtures` once P1q is final |

## 4. Remaining
Then B8, B9 (360/390 real window), F2, F3/B4, F4 when they land, along with P1q after PT1-11 is fixed.

## 5. B6 re-check (follow-up, 2026-10-15 23:58 CEST): commit **576b28a**
**Issue:** the desktop Collect bar runs under the side panel. **Verdict: FAIL (partial).** The bar is fixed for every queue size at 1024 px and wider, and for up to 5 customers at 960 px. At 960×700 with 10 customers in the queue it still runs 48 px under the panel (bar right edge 608, panel starts at 560). P1q raises `queue_max` to 10 from Farm L20, so players will reach this state.
| Check | 50b4b18 (before) | 576b28a (after) |
|---|---|---|
| Engineering `rc0-browser` b6/b6b (0–5 customers) | 6/6 PASS. **Doesn't reproduce the bug**, because it passes on the pre-fix build too | 6/6 PASS. Full script **21/21** Chromium + **21/21** WebKit |
| QA probe `qa/m3-scripts/b6-probe.mjs` (F25, 9.99e15 numbers; widths 960/1024/1280; 0/5/10 customers) | **Reproduced:** 10 customers overlap at 960 (bar 644 vs panel 560) and 1024 (644 vs 624) | 1024 and 1280 clear. **960 with 10 customers still overlaps** (608 vs 560). No sideways scroll in any case (`qa/m3-recheck/b6-probe.txt`) |
| `npm test` | 290/292 | 290/292 (same 2 failures, PT1-9 + QA-2) |
| `webkit-safari.mjs` | 35/35 | 35/35 (`qa/m3-webkit/recheck-576b28a/`) |
**No regressions** from 576b28a.

| ID | Sev | Defect | Fix |
|---|---|---|---|
| PT1-12 | Minor (B6 remainder) | At 960 px desktop with 10 customers (P1q `queue_max` 10), the Collect bar's right edge is at 608 px, 48 px under the side panel. The farm column is 560 px, so the bar's minimum content width wins over `minmax(0,1fr)` | cap the bar at `max-width:calc(100% - 24px)` and let the queue wrap or scroll inside the column. Add a b6 check with 10 customers at 960 |

## 6. Follow-up QA changes (23:58)
- `qa/m2-scripts/qa-independent.test.ts` U-4 now uses the post-B5 rule: hidden when N = 0 (all full, or 99%); at 40% it shows "(1 need it)"; cooldown "0:12" still shown. **18/18** on 50b4b18.
- `qa/csv_check.py` now uses the P1q/P3 formulas (interval ×0.5 of the base interval, demand ceil(0.4k)..ceil(0.8k) with k = eggs/s × base interval, `queue_max` min(10, 6+floor(F/5)), L0 1.5 eggs/s, offline rounded to 2 dp). Live `economy.csv` (P1q): **0 mismatches**, worker columns 28/28 with 0 mismatches, exit 0. `economy.p1q.csv` also gives 0. `economy.pre-p1q.csv` now gives 127, which is expected. The old version is kept at `/tmp/csv_check.pre-p1q.py`.

## 7. Fix verification on **c5bc2cb** (Head of QA, 2026-10-16 00:25 CEST)
Clean worktree `/tmp/efs3/game` @ c5bc2cb (`git status` clean before and after every run). Product inputs are the live P1q `product/economy.csv` (23:48), which is byte-identical to `data/economy.csv` in the repo.
**Harness note:** during this pass I found a stale `vite preview` from the 576b28a worktree still holding port 4181. Every rc0-browser run in this section was redone after killing it. The §5 results (576b28a) are unaffected, because that worktree was the one under test.

| Item | Commit | Verdict | Evidence |
|---|---|---|---|
| PT1-9 build id | b6f4a6e | **PASS** | Clean tree: `npx vite build`, bundle `m3-rc0+c5bc2cb` (no `+dirty`). `.gitignore` has `vite.config.ts.timestamp-*`. Telemetry build-id test passes. Tree still clean after the build |
| PT1-11 sync-economy on P1q | b652cb0 | **PASS** | `sync-economy --check`: "balance.json up to date with economy.csv" on the live P1q CSV. `npm run build` + `build:qa` OK. QA `csv_check.py` on the same CSV: 0 mismatches, worker columns 28/28 with 0 mismatches |
| PT1-10 Manage all cooldown (final rule) | b5c5c11 | **FAIL (contrast only)** | `qa/m3-scripts/pt1-10-check.mjs`, 7/9 in Chromium, 7/9 in WebKit, at 390 and 1280. **PASS:** during the 30 s cooldown both the Workers pill ("Manage all 0:30") and the Farm View button are visible, `aria-disabled="true"`, greyed, with the ring showing. After the cooldown, with nobody ≤ 0.4, both are hidden. With one worker at 0.4, both are visible and active ("(1 need it)" at 1280). **FAIL:** contrast of the greyed state is **3.76:1** (text/icon `--c-muted` #6B5D52 on `--c-disabled` #CFC6BA), below the 4.5:1 rule → PT1-14 |
| PT1-12 Collect bar / queue | c5bc2cb | **PASS on Chromium; WebKit 375 fails (pre-existing, see PT1-13)** | `b6-probe.mjs`, F25, 10 customers, `WIDTHS=375,960,1280`. Chromium: all clear (960: bar right edge 536 ≤ panel 560 − 12; queue 548), no sideways scroll, 0 elements past the right edge. WebKit: 960/1280 clear. **375: no sideways scroll, but 26 elements stick out past the right edge** (queue to 611, Collect bar to 587 at 375 wide), clipped by `overflow-x:hidden`. Same with the iPhone SE device profile (content to 428 px, goal status and Collect right edge cut off; `qa/m3-recheck/pt1-13-webkit-iphonese.png`). Already present at 576b28a, 30106b2 and 02e8430, so this isn't caused by c5bc2cb |

### Test counts (c5bc2cb)
| Run | Result |
|---|---|
| `npm test` | 270/304. **All 34 failures are in `tests/economy.test.ts`** (known, pending `gen-fixtures`; not logged as game bugs). The other 28 files pass |
| `rc0-browser.mjs` Chromium | **36/40**. The 4 failures are all "Bug9 … short copy", where the script's regex expects `N/N eggs · $` on one line but P2 (5c02fe4) renders `113/113 eggs\n· $553.70`. That's a script issue (QA-3), not a game bug: Sell is inside the card and the text fits on 1 line |
| `rc0-browser.mjs` WebKit | **33/40**. The same 4 copy-regex failures, plus 3 "Bug9 no sideways scroll" failures at 360/375/390 (elements sticking out past the right edge = PT1-13) |
| `webkit-safari.mjs` (4 profiles) | **35/35** (`qa/m3-webkit/recheck-c5bc2cb/`). SM-7 checks only for scroll overflow, so it misses PT1-13. QA will add a check for elements past the right edge |
| `qa-pt1.test.ts` | 6/6 |
| `qa-independent.test.ts` | **18/18** after the QA update to P4: E-3 now uses 30% workers (Manage only at ≤ 40%), and U-4 expects Manage all with nobody ≤ 40% to do nothing (no cooldown). At 40%: refill + 30 s cooldown + greyed. Before the update it was 16/18 |
| `qa-recheck.test.ts` | 6/6 |
| `csv_check.py` (updated to P1q v2: interval max(1.5, round(5·0.95^F, 2)), demand ceil(0.8k)..ceil(1.6k), k = eggs/s × new interval) | 0 mismatches, exit 0 |
| `pt1-10-check.mjs` (new) | 7/9 + 7/9 (PT1-14) |

### New defects
| ID | Sev | Defect | Fix |
|---|---|---|---|
| PT1-13 | **Major** (B9 remainder, WebKit/iOS only) | In WebKit at 360–390 px the farm column (queue, scene, Collect bar, goal chip) is wider than the viewport by about 30–50 px and gets clipped by `html,body{overflow-x:hidden}`. The goal status and the right edge of Collect are cut off, and there's no right margin. Chromium is fine. Present since at least 02e8430 | find the WebKit min-content source (likely the flex/grid `min-width:auto` on `.farm`/`.queue` children). Add an "elements past the right edge" assertion to SM-7 and to rc0-browser in WebKit |
| PT1-14 | Minor (AC13 accessibility) | The greyed Manage all (cooldown) is 3.76:1, below 4.5:1 | use `color:#5A4C42` (4.88:1) or darker on `--c-disabled`, for both `.manage-all` and `.farm-manage-all` |
| QA-3 | Info (Engineering script) | The rc0-browser Bug9 copy regex wasn't updated for the P2 two-line card copy | change the regex to `/eggs\s*·\s*\$/` |

## 8. Re-check on **3de7d11** (Head of QA, 2026-10-16 01:05 CEST)
Clean worktree `/tmp/efs4/game` @ 3de7d11. Every stale `vite preview` was killed first, and every script ran on its own random port from the worktree under test. `git status` was clean after every run. The live P1q `product/economy.csv` is byte-identical to `data/economy.csv`. Build: `m3-rc0+3de7d11` (no `+dirty`).

| Item | Commit | Verdict | Evidence |
|---|---|---|---|
| PT1-13 WebKit narrow phones | 3de7d11 | **PASS** | QA `pt1-13-edge.mjs` (all visible elements in `#app`/`#panel-layer`, on Farm/Market/Upgrades/Workers, at F0 and at F25 with 10 customers and huge numbers): **10/10** at 320/360/375/390 + iPhone SE. 0 elements past the right edge, 0 sideways scroll. Engineering's `pt1-13-webkit.mjs` also passes. The new `webkit-safari.mjs` **SM-7b right edge** check passes in 4/4 profiles here, and **fails on c5bc2cb** in 3/4 (queue@428 on SE, @400 on iPhone 15, @951 on iPad), so the check really detects the bug. Tap targets still ≥ 44 (SM-7) |
| PT1-14 greyed Manage all contrast | 3de7d11 | **PASS** | `pt1-10-check.mjs` **9/9 Chromium + 9/9 WebKit**: greyed pill and Farm View button **4.88:1** (#5A4C42 on #CFC6BA), aria-disabled, ring. The PT1-10 visible/hidden/active rules still pass |
| QA-3 Bug9 copy regex | 3de7d11 | **PASS** | rc0-browser Bug9 checks pass in both engines (see counts) |
| FTUE v1.1 §2.1 gating + §2.2 Collect label | 693e0e8 | **PASS** | QA `ftue-v11-check.mjs` **12/12 Chromium + 12/12 WebKit**. Covered: label "Collect +5 · 1 ready" when the coop has fewer eggs than one tap, and "Collect +5" otherwise. Collect gate closed → "Your hens are laying eggs…" hint, with no scrim ring or pointer and Skip visible. Sell with no customer → "A customer is on the way… 8 s". Customer but empty basket → "Collect some eggs to sell.". Open → coach mark. Buy unaffordable → "Sell a few more eggs to afford it · $10 to go". Affordable → coach mark. Hint auto-hides after 15 s while Skip stays. Gate closed for 60 s → step skipped, with `onboarding_step {step:2, name:"sell", timeout:true}` logged and the Buy step started. 0 page errors. Engineering's `ftue-v11.test.ts` is in the green suite |
| Queue anti-churn (spec §7 QA 13–20) | d31533e | **PASS** | `scripts/queue-qa.mjs` 13–20 **8/8 in both engines**: 0 card moves or replaced nodes outside serve/leave, CLS 0.0086 / 0, 0 long tasks, chip/live writes ≥ 2 s apart (WebKit min gap 1999 ms, which is timer rounding), 0 px scroll-anchor drift, tap target stable while held, partial leave correct, farm strip 4 + "+6", Farm row preview "+1 customer slot (6 → 7)". The **F24 sampler fails in headless WebKit only** (see perf below) |

### F24 Market perf (`qa/m3-scripts/perf-f24-matrix.mjs` + `perf-blank-raf.mjs`, 360×640, 20 s after a 5 s warm-up; `qa/m3-recheck/perf-f24-matrix-3de7d11.txt`)
| Engine / mode | Blank page rAF p50/p95 | F24 farm view (Market closed) p95 | F24 Market open p95 (over 20 ms) |
|---|---|---|---|
| WebKit headless | 16 / 17 | **26** | **26** (95.5%) |
| WebKit headed (box display :10) | 17 / 18 | 18 | 18 (0.1%), max 21 |
| Chromium headless | 16.7 / 16.7 | 16.7 | 16.7 (0%) |
| Chromium headed | 16.7 / 16.8 | 16.8 | 16.7 (0%) |
**Conclusion: this comes from the box's rendering, not the game.** The slowdown appears only in *headless* WebKit, and it's the same with the Market closed (26 vs 26). So it isn't the queue/Market code; it's headless WebKit's software paint of the game's layered SVG scene. The same build in headed WebKit is 18 ms p95, Chromium is 16.7 ms in both modes, and there are 0 long tasks (no slow JS). A blank page in headless WebKit runs 17 ms, so the headless frame clock itself is fine; the cost is painting game content in that mode. Not logged as a defect. The F24 perf gate should use headed WebKit/Chromium on the box (≤ 20 ms p95: PASS). Real-Safari perf is one of the C4-waiver gaps.

### Test counts (3de7d11)
| Run | Result |
|---|---|
| `npm test` | **314/314** (31 files). The economy fixtures are fresh after fdf7eaf, so the 34 known failures are gone |
| `npm run build` / `build:qa` | OK, `m3-rc0+3de7d11` |
| `rc0-browser.mjs` | **40/40 Chromium, 40/40 WebKit** |
| `webkit-safari.mjs` (with the new SM-7b) | **39/39** (`qa/m3-webkit/recheck-3de7d11/`). Negative control on c5bc2cb: SM-7b fails on iPhone 15, iPhone SE and iPad |
| `queue-qa.mjs` | Chromium 9/9. WebKit headless 8/9 (F24 sampler, box rendering, see above) |
| QA `pt1-13-edge.mjs` / `pt1-10-check.mjs` / `ftue-v11-check.mjs` | 10/10 · 9/9 + 9/9 · 12/12 + 12/12 |
| QA `qa-pt1` / `qa-independent` / `qa-recheck` | 6/6 · 18/18 · 6/6 |
| `csv_check.py` (live P1q `economy.csv`) | 0 mismatches, worker columns 28/28 with 0 mismatches |

**New defects: none.** Open items from this file: none are blocking for the playtest re-check. Next: player session 2 on rc0 (F1/B9 focus).
