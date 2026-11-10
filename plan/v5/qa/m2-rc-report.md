# M2 Workers — rc1 QA report (Head of QA, 2026-10-15 21:45 CEST)
**Build:** `game` branch `m2-workers` @ **7ca3a73** (worktree `/tmp/efs/m2qa`, main checkout and m1-rc2 untouched). Test plan: `qa/m2-test-plan.md` rev 2 (spec v1.1). Reference sim: `product/sim/economy_sim.py` (R9 fixed).
**Verdict: NOT READY for m2-rc1. One major (empty-nest fix not on the branch). Every M2 AC and every functional case passes. Merge `fix/empty-nest` (8e07b33), re-smoke, and rc1 can be tagged.**

## 1. Build / suites
| Check | Result |
|---|---|
| `npm test` (sync-economy --check + vitest) | **191/191 pass**, 17 files |
| `npm run sync-economy -- --check` | balance.json up to date with economy.csv |
| `npm run build` (tsc + vite) / `npm run smoke` | pass / smoke OK |
| `qa/csv_check.py` (extended: 28 worker columns) | 31 rows, M1 mismatches 0, **worker columns 28, mismatches 0**: constants = economy.md v1.1; w1/w2/w3 cost+wage 0 before F3/F7/F8, >0 after; w4 tier/mult/cost per tier, mult 1.0 before F18 |
| `qa/m2_expected.py` (now reads worker values from economy.csv; balance.json only cross-checked) | CSV vs balance.json: OK; CONFIG CHECK v1.1: OK; outputs match plan values (630/639/900 s, yawn 540 s, Grader prices, wages) |
| QA independent build tests `qa/m2-scripts/qa-independent.test.ts` | **17/17 pass** |
| aa885bf→7ca3a73 diff | only public/assets, src/ui, src/main.ts, scripts, one test file. **No change in src/sim, balance.json or economy.csv** |

## 2. Acceptance criteria
| AC | Target | Measured (independent) | Result |
|---|---|---|---|
| AC-W1 casual (gate: Python) | ≥95% F10≤15 min, F18 med ≤40 | Python rerun by QA, seeds 0–99: **98%, F10 med 12.33, F18 med 30.67** | PASS |
| AC-W1 build parity | medians ±20%, pass rate ±5 pts | build 100% / 12.67 / 30.67 → +2.8% / 0% / +2 pts | PASS |
| AC-W2 | ≤ +1 min vs M1 at F10, F18 | +0.75 / +1.00 (on the edge, as the sim predicted) | PASS |
| AC-W3 | unmanaged ≤ no workers | build test pass (F25 unmanaged < none, both policies) | PASS |
| AC-W4 (gate) | worst step F18→F25 ≤6 min, F25 ≤70 | build 5.75 / 62.25; Python rerun 5.75 / 62.25 | PASS |
| AC-W4b (soft) | ≤8 min | build 7.75; Python 7.75 (F25 70.5) | PASS (thin) |
| AC-W5 (telemetry only) | ≥1 Manage /15 min | sim 0.833/10 min = 1.25/15 min; worker_manage + worker_manage_all events emitted | INFO (not a gate) |
| AC-W6 | ≥4 min at F18, ≥15% F21 income | build test pass | PASS |
Test hooks: `sim_test` absent from balance.json (off by default); `validateBalance(…, prod=true)` throws on hooks (QA test + engineering test). Prod bundle contains only the guard. PASS.

## 3. Functional cases
| Case | Result | Evidence |
|---|---|---|
| E-1 drain | PASS | QA test: Working at 630 s, Tired by 639 s, Asleep by 900 s |
| E-1b yawn cue | PASS | `isYawning` = 0 < E ≤ 40, not Unpaid; overlay-yawn + amber ring at 38% in 390 px shots; yawn SFX throttled 6 s, first yawning worker only, muted by SFX toggle (code) |
| E-2 thresholds | PASS | engineering suite + mood() code |
| E-3 / E-3c shared 30 s cooldown | PASS | QA test: 29.9 s rejected, 30.0 s accepted; Manage↔Manage all both directions (eng suite) |
| E-3b / E-3d Manage all visibility | PASS | hidden at 2 workers (QA test), shown at 3+, countdown "Manage all 0:15", aria-disabled during cooldown (DOM) |
| U-1 Unpaid: no drain, no wage | PASS | QA test: 70% after 300 s, coins unchanged |
| W1-6 → Unpaid, coins never <0 | PASS | QA test |
| U-2 Manage on Unpaid | PASS | QA test: 100%, stays Unpaid, cooldown 30 |
| U-3 Grader tier keeps energy | PASS | QA test: 37% kept, tier 2 |
| U-4 all full / 99% / labels | PASS | QA test: no cooldown when all 100%, "All rested" + disabled; 99% enabled |
| U-5 both Unpaid at F10 | PASS | $2.49 none; $4.99/$6.00/$7.49 only Market Hand; $7.50 both |
| R9 W1 paid, W2 Unpaid | PASS | $5.00 and $7.49 → W2 stays Unpaid; $7.50 → resumes |
| OFF-1..3 offline | PASS | applyOffline only touches pendingOfflineEggs; eng test "workers do nothing offline"; O-cases pass |
| OFF-4 save v5 migration | PASS | QA test: v4 → v5, workers {}, graderTier 0 |
| E-7 telemetry | PASS with deviation | events: worker_hire, worker_manage, worker_manage_all, worker_state (incl. unpaid), grader_tier; wages roll up in worker_summary (wage_*_cents). **No worker_yawn event** (minor, see m-2) |
| Empty-nest fix | **FAIL** | fix 8e07b33 is on `fix/empty-nest`/main but **not in m2-workers**: icon-nest.svg still has eggs drawn, nest-eggs.svg missing (git diff, qa-390-empty-nest.png) |

## 4. Final art (390 px)
- Wired: `ring-cooldown.svg` is inlined in workers-ui.ts with the same markup as the file, so CSS can drive `--ring-offset`. The file is also preloaded. `icon-manage-all.svg` is used on the Workers-tab pill and the Farm View button. `sfx-worker-yawn.mp3` is in SFX map and in dist. The updated overlay-yawn.svg is used.
- Engineering shots `m2-workers-ring-cooldown.png` and `m2-farm-manage-all.png` reviewed. They match QA's own shots: `qa/m2-shots/qa-390-workers-cooldown.png` (ring on Manage all + every Manage, 0:15), `qa-390-farm-manage-all.png` (44×44 button, shown with 3+ workers and one at 38%), and `qa-390-farm-no-yawn.png` (hidden when nobody yawns). No page errors.
- Desktop (`qa-desktop-workers-tab.png`, 1280×800): Farm View button is 0×0 (known issue), but **Workers tab sticky "Manage all (4 need it)" is visible and enabled** → Product's condition is met, not a blocker.

## 5. Bugs
**Blocker:** none.
**Major**
- M-1 Empty-nest fix (8e07b33) is not merged into m2-workers, so rc1 would bring back the M1 rc2 known issue (eggs drawn in an empty nest). Fix: merge/cherry-pick `fix/empty-nest`, then re-run smoke (the smoke check is part of that commit). Owner: Engineering.
**Minor**
- m-1 During cooldown the Manage-all pill stays full green while single Manage buttons grey out, so the disabled state relies on the countdown text alone. Ask Art & UX whether a dimmed style is wanted (post-rc1 OK).
- m-2 No `worker_yawn` telemetry event, and the test plan's names `worker_manage{single|all}` / `worker_wage` map to `worker_manage` / `worker_manage_all` / `worker_summary.wage_*`. Not needed for AC-W5. Product to accept the naming or ask for worker_yawn.
- m-3 (Python reference sim, not the build) The R9 reserve in economy_sim.py counts paid workers that are **Asleep**. The build and the R9 ruling count only Working/Tired. They give different answers for Market Hand asleep + Coop Hand Unpaid at $5.00 (build resumes, sim doesn't). This doesn't change any pacing number. Owner: Economy/Balance.
- m-4 (info) The build stops its resume check at the first worker that can't resume. Python keeps going. Today this can't change the outcome, because Coop Hand's wage is always 2× Market Hand's. Keep it in mind if wages are retuned.
**Known issues (accepted, not blockers):** desktop Farm View Manage-all button missing (post-rc1; Workers tab has Manage all, verified in DOM); desktop testing waived until public release. Doc: art-ux/m2-workers-layout.md line 11 still says the v1.0 drain (6 s/%). Sent to Art & UX.

## 6. Repro
`git worktree add /tmp/efs/m2qa 7ca3a73` (with /tmp/efs/product → product symlink so sync-economy finds the CSV), `npm test`, `npm run build`, `npm run smoke`, `npx vitest run tests/qa-independent.test.ts`, `node qa-shots.mjs`; `cd qa && python3 csv_check.py && python3 m2_expected.py`; Python AC-W1/W4: `/tmp/efs/acw1.py`.

---
## 7. Recheck at bf1962a (2026-10-15 21:55 CEST): empty-nest merge + desktop Manage all
Fresh worktree `/tmp/efs/rc1` @ **bf1962a** = 7ca3a73 + 3337c8c (merge main, empty-nest 8e07b33) + 7936db7 (desktop Manage all).
| Check | Result |
|---|---|
| `npm test` | **210/210 pass** (18 files; 192 engineering + 18 QA tests) |
| build / smoke / `sync-economy --check` | pass / OK / up to date |
| diff 7ca3a73→bf1962a | only public/assets (nest), scripts, src/main.ts, src/ui/{app,workers-ui}.ts, styles.css, one test. **No change in src/sim, src/config/balance.json or economy.csv** |
| QA tests (`qa/m2-scripts/qa-independent.test.ts`) | **18/18 pass**, 17 old + new R9 case |
| New R9: Market Hand Asleep (paid, 0%) + Coop Hand Unpaid, F10 | **$5.00 → Coop Hand resumes**; $4.99 → stays Unpaid (an Asleep worker is not reserved, as R9 rules) |
| R9 / U-5 cases rerun | all pass ($5.00/$7.49 stay, $7.50 resumes; both Unpaid: $6.00 → Market Hand only, $7.50 → both) |
| AC-W4 | worst step **5.75** min exactly (gate ≤6), F25 62.25 → PASS |
| AC-W4b | 7.75 min (≤8 soft) → PASS |
| AC-W1 build parity | build 100% / 12.67 / 30.67 vs Python 98% / 12.33 / 30.67 → PASS |
| Empty nest, 390 px + 1280×800 | coop 0: `#nestEggs` hidden, empty nest drawn (`rc1-390-empty-nest.png`, `rc1-desk-empty-nest.png`); coop ≥1: overlay shown (`rc1-390-nest-eggs.png`, `rc1-desk-nest-eggs.png`) → **PASS, M-1 closed** |
| Conflict merge kept 7ca3a73 UI | Workers UI, yawn overlay/SFX, Manage-all pill, inline ring, 44px Farm View button all present. 390 px: Farm View button shown with yawning worker; ring on every Manage + pill at "0:16" (`rc1-390-*`) → PASS |
| Desktop Manage all | <3 workers: pill and Farm View copy hidden (`rc1-desk-two-workers`). 3+ with a yawning worker: 44px button next to the Upgrades header plus the Workers-tab pill (`rc1-desk-yawn.png`). After tap: both go to cooldown, ring shown, aria-disabled, pill "Manage all 0:30" (`rc1-desk-after-manage-all`). "All rested" disabled state comes from the shared `manageAllHtml` (unit-tested). In the live game it only shows the instant every worker is at 100%, because drain starts right away. That's per spec (99% → enabled) → PASS |
The "desktop Farm View Manage all missing" known issue is **fixed** in 7936db7.

### Bugs at bf1962a
- Blocker: none. Major: none (M-1 fixed).
- Minor (unchanged, post-rc1 OK): m-1 Manage-all pill stays green during cooldown; m-2 no `worker_yawn` telemetry / naming differs from plan; m-3 the Python sim's R9 reserve counts Asleep paid workers. The build is correct per the ruling, as the new test shows. The sim should be aligned, and pacing isn't affected. m-4: info only.
- Doc: art-ux/m2-workers-layout.md line 11 still has the v1.0 drain (with Art & UX).

### Final verdict: **PASS. m2-rc1 can be tagged at bf1962a.**

- m-3/m-4 CLOSED (21:45): economy_sim.py lines 244-249 now reserve only for Working/Tired workers and stop at the first worker that cannot resume, same as the build.

## §8 Post-rc1 check — `dd15dbf` (post-rc1/polish) — **PASS**
Checked Oct 15, 21:49–22:00 CEST. Worktree of `dd15dbf` in /tmp/efs/pr with the QA test file copied in. No engineering code was changed.

| Check | Result |
|---|---|
| Tag | `m2-rc1` still points to `bf1962a` (bf1962ab39…). `dd15dbf` has a single parent, `bf1962a`. |
| Diff bf1962a..dd15dbf | 7 files, +89/−2: icon-hire.svg, app.ts (tab img), styles.css (one disabled rule), events.ts + tick.ts (worker_yawn), tests/post-rc1.test.ts (5 new tests), scripts/screenshot-post-rc1.mjs. **No test files were deleted or changed, and there are no .skip/.only.** |
| Test count 197 vs 210 | **Explained, not a regression.** The 210 in §7 was 192 engineering tests plus 18 QA tests copied into the worktree. dd15dbf has 192 + 5 new = **197/197** engineering tests. With the QA file added it's **215/215** (19 files). |
| QA independent tests | 18/18 pass (part of the 215 run) |
| Build / smoke | `npm run build` OK, `npm run smoke` OK |
| AC-W4 / AC-W4b | step 5.75 min (≤6 gate) / 7.75 min (≤8 soft). Same as rc1. |
| AC-W1 100 seeds | build 100% / F10 12.67 / F18 30.67 vs Python 98% / 12.33 / 30.67. Pass, same as rc1. |
| (1) Workers tab icon | `<img src=icon-hire.svg>` added to the tab. Shot: post-rc1-workers-tab-icon.png |
| (2) m-1 greyed state | During cooldown all three copies (the Workers tab, the Farm View nav and the desktop header) have aria-disabled=true and the background rgb(207,198,186), which matches the single Manage button. The ring is shown (display:block). The countdown ticks (0:29, then 0:24 five seconds later). When idle, the Farm View copy is green rgb(107,191,89) with no ring. Shots: post-rc1-{farm,workers,desktop}-manage-all-cooldown.png, -workers-manage-all-cooldown-later.png, -farm-manage-all-idle.png |
| (3) worker_yawn | Fields are exactly {worker_id, energy_pct, farm_level}, and energy_pct is rounded to one decimal. Extra QA tests (6/6 pass): fires once at ≤40%. Fires exactly once on a drain all the way to Asleep. Doesn't fire for Asleep workers (energy 0) or Unpaid workers (`isYawning` excludes both). Fires again after Manage refills and the worker drops back. A worker that starts already Yawning doesn't fire (load case). |
| (4) Economy unchanged | `git diff bf1962a dd15dbf -- src/config/balance.json` is empty. The src/sim changes are telemetry only (events.ts +1, tick.ts +2/−1). product/economy.csv and economy_sim.py are outside the repo, so git diff can't cover them. They haven't been modified since the §7 check: csv_check gives 0 mismatches (28 worker columns) and m2_expected is consistent. |

**Defects:** none. **Verdict: PASS.** dd15dbf is fit to merge or tag as the post-rc1 build. All Post-rc1 checks in the test plan are closed. m-3 was already closed in §7.
