# M3 pt1 QA report (Head of QA, 2026-10-15 22:45 CEST)
**Build:** `game` branch `m3/pt1` @ **7d592c4** (from dd15dbf), fresh worktree `/tmp/efs/pt1`. Not tested: Engineering's uncommitted WIP in the main checkout (pointer-hand/onboarding edits).
**Verdict: FAIL. Don't tag m3-pt1 yet.** No blockers. 3 majors (PT1-1..3), all small fixes. Everything else in the pt1 section passes. Re-test after the fixes takes about 1 h.

## 1. Regression
| Check | Result |
|---|---|
| `npm test` | **230/230 pass** (22 files); build + `sync-economy --check` OK |
| QA independent tests (18, incl. Asleep+Unpaid R9) | 18/18 pass |
| AC-W4 / AC-W4b / AC-W1 | **5.75** / **7.75** / build 100% · 12.67 · 30.67 vs Python 98% · 12.33 · 30.67 → unchanged, PASS |
| Fixtures migrate on pt1 (`qa/m3-scripts/qa-pt1.test.ts`) | m1-rc2 v4 → v5 with no workers; three v5 files incl. edge keep workers/energy/Unpaid/cooldown/tier field by field → PASS |

## 2. pt1 entry checks
| ID | Result | Evidence |
|---|---|---|
| EN-2 4 h accelerated run | **PASS** | Real balance (`ring_size` 5000), session 1 = 30 min, session 2 at +22 h for 3.5 h. Export holds session-1 `session_start`/`session_end` (1/1), 33 `upgrade`, 5 `onboarding_step`, 3 `worker_hire`, 10 `worker_manage*`. **0 session-1 high-rate events left** (tap/sell/customer_*/worker_summary trimmed). 5,183 events, 446 KB (well inside quota). QA D1 reference on it: D1 = yes, first session 30.0 min. `qa/m3-pt1/en2-summary.json` |
| EN-3 Export log | **PASS** (Firefox needed a harness workaround, see PT1-3) | Chromium, Firefox, WebKit 1280: download `eggfarm-log-<id8>-2026-10-15.json`, valid JSON, "Log downloaded.". iPhone 13 WebKit emulation: share path → file shared ("Log shared."); `canShare` false → clipboard ("Log copied to clipboard…"); share cancelled (AbortError) → clipboard fallback. 0 console errors. `qa/m3-pt1/browser-results*.json` |
| EN-4 install_id / build | **PARTIAL → PT1-1** | `eggfarm.install_id` is its own key (UUID v4). It survives Reset save and a corrupt save in all 4 contexts. Every `session_start` carries `install_id` + `build`. **But `build` = the hard-coded string `"m3-pt1"`, not the git hash** (`main.ts` `VERSION`) |
| EN-5 Privacy | **PASS** | Export key set: N, build, by, coinsBefore, coop_hand_eggs, cost, count, eggs, energyBefore, farm, id, install_id, k, market_hand_cents/eggs, name, newLevel, partial, price, reason, sessionMs, step, ts, type, upgrade, value, wage_*_cents, windowMs, worker, workers. No free text, UA, IP, email. The filename carries only the first 8 characters of install_id |
| EN-6 Playtest UI frozen | **PASS** | contrast swaps (2327e0f + contrast tests), AC5 strip (13fbf63), Workers intro (31dee53) present |

## 3. FTUE / AC3 / AC4 / AC5
| Check | Result | Evidence |
|---|---|---|
| onboarding_step values | **PASS** | complete path: 1 collect, 2 sell, 3 upgrade, 4 complete, **5 next_goal_intro**. Skip path: 1, `onboarding_skip` atStep 1. Workers: **6 workers_hire_tip** (shown/open/dismiss), **7 workers_coach** (shown/done) |
| Next-goal strip hidden until step 3 completes or is skipped | **PASS** | `#goal.hidden` true at steps 1, 2, 3; false after complete (390) and after Skip (1280). Not replayed after reload |
| Workers tip A trigger | **PASS** | F3 with $39.00: not shown. $40.00: banner shown → "Open" opens the Workers tab → hire → coach B shown |
| Tip once per save | **PASS for reload/Reset, FAIL on corrupt fallback → PT1-4** | After a reload with Market Hand unhired + affordable: not reshown. Reset clears `eggfarm.ui` together with the save, so intro + onboarding replay with the new save, which is consistent with "once per save". But the corrupt-save fallback keeps `eggfarm.ui`, so the new F0 save gets no onboarding and no Workers tip |
| AC5 hint states (pt1 UI step) | **PASS (partial scope)** | strip visible after FTUE at 390/1280. Engineering unit tests (`next-goal.test.ts`, 12) cover ready/countdown/dash/tie-break/no-buy. Full 10-state spot-check + independent dead-zone recompute stay scheduled for rc1 (plan §1) |
| AC13 contrast (pt1 part) | **PASS** | axe `color-contrast`: 0 violations on farm, workers, settings, onboarding at 390 and 1280 |
| Lighthouse (pt1 baseline) | A11y 100 / Perf 100 (mobile + desktop, 3 runs each) | **It only audits the "Tap to start" screen** (see PT1-7), so this is not a valid gate reading |

## 4. D1 script (AC6)
The Designer's script doesn't exist yet (no `product/m3-telemetry-review.md`). QA is ready: 9 synthetic exports in `qa/m3-fixtures/exports/` + `expected.json`, and the QA reference `qa/m3-scripts/d1_reference.py`. **9/9 match** (S1 yes, S2/S3 no, S4 = 20.0 h and S5 = 48.0 h inclusive → yes, S6a two ids / S6b missing id → flagged, not counted, S7a/b first session 7.9/8.1 min). With n = 7 the "insufficient data" rule triggers. Not a pt1 build gate (plan: verify by Oct 22). **Owner: Designer, deliver the script.**

## 5. Defects
| ID | Sev | Defect | Fix |
|---|---|---|---|
| PT1-1 | **Major** | `session_start.build` is the hand-set string `m3-pt1` (`src/main.ts` VERSION), not the git hash. Any pt1 hotfix or pt2 built without editing VERSION reports the same build, so playtest exports can't be split by build | inject at build time, e.g. Vite `define: { __BUILD__: 'm3-pt1+' + git rev-parse --short HEAD }`. Unit test: `build` matches `/^m3-pt1\+[0-9a-f]{7}$/` and equals HEAD |
| PT1-2 | **Major** | **Reset save deletes `eggfarm.telemetry`** (`RESET_KEYS`). A tester who resets during the playtest loses every pinned session-1 event, which breaks D1, first-session and funnel data (AC6/AC7/AC8). Reset also wipes SFX/reduced-motion prefs (`eggfarm.ui`) | keep `eggfarm.telemetry` on reset and log a pinned `save_reset` event. Keep the sfx/reducedMotion prefs, clear only progress flags |
| PT1-3 | **Major** (since M1) | "Tap to start" hangs forever if `AudioContext.resume()` never resolves. Reproduced in Playwright Firefox 157 on the box (no audio device): resume pending >4 s, game never boots, no error (m2-rc1 too). Blocks the B2 Firefox matrix and real players with no or broken audio output | `await Promise.race([ctx.resume(), timeout(500)])` and never block `boot()` on audio. Test: stubbed never-resolving resume still boots |
| PT1-4 | Minor | Onboarding/Workers-intro flags live in `eggfarm.ui`, not the save. The corrupt-save fallback starts a fresh F0 save but keeps `onboardingDone`/`workersIntroA/B`, so no FTUE and no tip for that new save | clear progress flags when load falls back to a fresh game (with AC14b in rc0), or move the flags into the save |
| PT1-5 | Minor | Reload during onboarding (save exists, `onboardingDone` false) abandons it: the overlay is not resumed, the strip shows, and no `onboarding_skip` is logged. AC3 analysis would read it as not finished | resume at the current step, or log `onboarding_abandon {atStep}` |
| PT1-6 | Minor (AC13, rc1) | axe serious: `aria-prohibited-attr` on `#queue`, `label-content-name-mismatch` on `#scene` (all screens), `aria-dialog-name` on `.onb-cap`. Moderate: `page-has-heading-one` | fix by rc1. QA re-runs axe |
| PT1-7 | Info (QA plan) | Lighthouse audits only the title screen, so a score of 100 says nothing about gameplay a11y | rc1 Lighthouse runs as a user flow after "Tap to start" (farm, Upgrades/Workers, Settings). Plan updated accordingly |
| QA-1 | Minor (QA, fixed) | `qa/m3-fixtures/saves/SHA256SUMS.txt` held 12-character hashes + absolute paths, so `sha256sum -c` failed | regenerated with full hashes and relative names (`sha256sum -c` 10/10 OK). It's a pure checksum file, so it's copied into Engineering's `game/tests/fixtures/saves/` (main checkout, uncommitted; Engineering to commit). Fixture contents are byte-identical in both folders |

## 6. Re-test on the fix commit
EN-4 build hash, Reset-keeps-telemetry (EN-2 with a reset between sessions), Firefox boot without a workaround (EN-3 on B2), then the 230-test suite + QA tests + AC-W4/W4b/W1. PT1-4..6 can ride to rc0/rc1.
Artifacts: `qa/m3-pt1/` (results JSON, 4 h export, screenshots), scripts in `qa/m3-scripts/`.
