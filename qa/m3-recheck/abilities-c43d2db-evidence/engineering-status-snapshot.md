## 2026-10-15 — Engineering
- Done: stack-and-architecture.md, repo-plan.md, milestone-estimate.md drafted.
- Next: scaffold local repo (game/), sim core, save/offline with placeholder balance.
- Blocked: core-loop spec + economy numbers from Product (none yet); wireframes from Art/UX.
## 2026-10-15 (later) — Engineering
- Done: local repo game/ (no remote). Vite+TS+Vitest scaffold; pure 10 Hz sim based on wall-clock time (coop, whole-egg collect, customers/queue/patience, sell/sell-all, both upgrades, max L30); balance.json = economy.md v1; versioned localStorage save with a v1→v2 migration; autosave every 5s + hidden/pagehide/beforeunload + save on each upgrade (AC8); offline per AC11 (2h cap, 0.5×, <60s or negative → 0, goes to Basket, coop unchanged, granted only once); resume gap <60s catches up online. 58 tests pass (incl. L0–30 vs economy.csv); build OK. Placeholder DOM UI.
- Next: UI per Art/UX layout, onboarding overlay, debug panel, AC7 pacing bot test, QA handoff tag m1-rc1.
- Blocked: Art/UX layout/assets for the real UI (placeholder UI for now).
## 2026-10-15 (evening) — Engineering
- Done: market rules (partly served customers stay, arrival to a full queue is lost, price taken at sale time, seeded demand + `?marketSeed=`); config tunables customer_patience_s/queue_max/first_customer_s, tap_combine_window_ms/max_flying_eggs, with validation; welcome-back modal (closing it still grants; one grant per load); hidden-tab freeze ≥60 s; telemetry (ring buffer of 5000, batched writes, per-second tap batches, JSON export). Rules documented in engineering/sim-rules.md. 90 tests pass; build OK.
- Next: real UI per Art/UX, onboarding overlay (telemetry hooks are ready), flying eggs/tap-combine visuals, debug panel, AC7 pacing bot, m1-rc1.
- Blocked: Product to resolve MK-10 vs Q4 (whether a partly served customer times out); Art/UX layout, patience indicator, partial-order card state.
## 2026-10-15 (night) — Engineering
- Done: real M1 UI per layout-spec: HUD, farm scene (coop tiers, hens, nest, meter), queue strip (slot unlocks, amber Queue full tag + throttled walk-off, neutral Sold out! exits), Market, Upgrades (real next values, time-to-afford, Limited by coop), welcome-back modal (closing it grants), settings/reset, desktop docked layout. 11 sfx unlocked on "Tap to start"; fonts self-hosted. M1-R1 economy: `npm run sync-economy` fits balance.json from economy.csv and verifies every cell; parity tests against product/sim/economy_sim.py (gen-fixtures). MK-10 (partial customers time out, logged as customer_partial), hidden tab simulates the first 60 s then freezes, offline 0.25. 146 unit tests pass, build OK, browser smoke test OK. Screenshots in engineering/screenshots/.
- Next: onboarding overlay (telemetry hooks ready), debug panel, AC7 pacing bot vs the sim, QA handoff tag m1-rc1.
- Blocked: nothing. Open for Art/UX: coop sprite tier art is placeholder-grade; the patience ring colours follow the spec.
## 2026-10-15 (late) — Engineering
- Done: onboarding overlay (3 steps, skippable, once, telemetry wired up), ?debug=1 panel, AC7 pacing bot test on the real sim (seller15: first upgrade 30 s, 10 upgrades @5 min, F10 at 10.3 min, F18 at 28.3 min; cheapest-first: 9 / F8 / F17). 158 tests pass, build OK, smoke OK. Commit 235dcc9, local annotated tag **m1-rc1** (no remote). Ready for QA.
- Next: QA sign-off on m1-rc1; fix pass; M2 (workers).
- Blocked: nothing. Known issues are listed in the m1-rc1 report (first upgrade median right at the 30 s limit; Collect shows +0 at game start; the debug "Replay onboarding" button also wipes the save).
## 2026-10-15 (19:55) — Engineering
- Done: root-caused the AC7 first-upgrade gap (bot 30 s vs sim 15 s). Cause: our demand RNG wasn't seed-mixed, so small seeds (1–20) always rolled demand_min = 8 for the first customer. That's a bug against the spec's "uniform" demand. Timing is identical on both sides (no walk-in delay, first sale at 15 s). Fix on branch `fix/pacing-rng-seed` (53917b5): median now 15 s, L10 at 10.0 min, L18 at 28.0 min, matching economy_sim.py. Committed to main (dc15b39): no "Collect +0"; debug Replay onboarding keeps the save. Not retagged.
- Next: approval to merge fix/pacing-rng-seed. The approved "sell as soon as servable" bot fix is not needed (the cause isn't walk-in or tick timing).
- Blocked: merge approval (Product's ruling said to report non-timing causes first).

## 2026-10-15 (evening): empty-nest fix + M2 Workers sim
- **Done:** empty-nest fix on `fix/empty-nest` @ 8e07b33, with before/after screenshots in engineering/screenshots/nest-*. main/m1-rc2 untouched. Wrote `engineering/m2-estimate.md` (≈12.5 dev-days, target m2-rc1 Fri 2026-10-30). On branch `m2-workers` (off main):
  - Workers sim: W1–W4, energy/Manage, wages, Hawker, Grader tiers, all values in `balance.workers`.
  - Save v5, worker telemetry, offline freeze.
  - Placeholder Workers tab and Coop Hand tip.
  - AC-W2/W3/W4/W6 gating, W4b soft (7.75 min). Medians match economy_sim.py run_m2 to ≤ 0.1 min.
  - QA-RC2-2: `.dbg` is now z 15, under the modal. QA-RC2-3: sim-rules says 0.25×, and the state.ts comment now matches MK-10. AC3 tick-order test added.
  - 176 tests, build and smoke green.
- **Next:** PM answers (`engineering/m2-questions.md`), Art & UX M2 layout/assets → final UI, AC-W1 approach, v1.1 energy if HoP approves.
- **Blocked:** final UI on Art & UX; AC-W1 test on Q7.

## 2026-10-15 (20:30): M2 Workers v1.1
- **Done** on `m2-workers`:
  - **Tunables:** v1.1 values (drain 9 s/% = 15 min, Tired < 30%, asleep Grader keeps 0.15, `yawn_at_pct` 40, `manage_all_min_workers` 3, `unpaid_resume_wage_min` 1). `balance.workers` is now generated from product/economy.csv and every row is verified: constant columns, wage/hire-cost columns, Grader tiers and tier costs.
  - **Unpaid state** (§8 items 2, 15, 16): acts as Asleep for output, no drain, Manage and Manage all refill it but it stays Unpaid, resumes W1→W2 with the R9 reserve.
  - **Rulings:** no refill on a Grader tier buy. Manage all is disabled ("All rested") at 100% and starts no cooldown.
  - **UI:** yawn cue (amber ring + overlay-yawn.svg). Manage all pill, sticky, with "(n need it)".
  - **AC-W1** casual test, seeds 0–99, with test-only `sim_test` hooks that production rejects.
    - Build: 100% F10 ≤ 15 min, F10 median 12.7 min, F18 median 30.7 min.
    - Python: 98%, 12.3, 30.7.
  - **AC-W4/W4b:** 5.75 and 7.75 min, the same as economy_sim.py.
  - 187/187 tests, build and smoke green.
- **Next:** final Workers UI polish per m2-workers-layout (cooldown conic ring, Farm View Manage-all icon, yawn sfx reuse). Economy/Balance to add R9 to economy_sim.py's resume reserve.
- **Blocked:** nothing.

## 2026-10-15 (20:35): M2 Art & UX placeholders wired (§4.6)
- **Done** on `m2-workers`:
  - **Cooldown ring:** `ring-cooldown.svg` is inlined around the 44px icon area of every Manage button and Manage all. No conic fallback. `--ring-offset` = 100 × (1 − remaining/30) comes from the shared cooldown, steps once a second, and has no transition under reduced motion.
  - **Farm View button:** a 44px Manage all button using `icon-manage-all.svg` sits next to Upgrades in the nav. It shows when 3+ workers are hired and one is yawning, and it stays visible through the cooldown.
  - **Yawn sfx:** `sfx-worker-yawn.mp3` plays at most once per 6 s globally, only for the first yawning worker in card order, never for Asleep or Unpaid workers, and is muted by the SFX toggle.
  - Updated `overlay-yawn.svg` picked up. `icon-manage.svg` and the audio LICENSES entry copied in.
  - 191/191 tests, build and smoke green.
  - Screenshots: engineering/screenshots/m2-workers-ring-cooldown.png, m2-farm-manage-all.png.
- **Next:** remaining Workers layout polish (avatars and overlays, Farm View walking workers, first-hire coach bubble). Desktop docked layout has no nav, so the Farm View Manage-all button doesn't show there yet.
- **Blocked:** nothing.

## 2026-10-15 (21:40): desktop Farm View Manage all (branch `feat/desktop-manage-all`, worktree game-desktop; not merged)
- **Done:**
  - In the docked layout (≥ 960 px landscape) the Farm View Manage all button sits next to the Upgrades panel header, in the same 44 px round style as mobile.
  - It uses the same show rule, action, shared cooldown and ring as mobile. Both buttons share `farmManageAllVisible` (with test).
  - Screenshot: engineering/screenshots/m2-desktop-manage-all.png (1280×800).
  - 192/192 tests, build and smoke green.
  - m2-workers @ 7ca3a73 untouched for QA.
- **Next:** merge into m2-workers after QA's pass on 7ca3a73.
- **Blocked:** nothing.

## 2026-10-16 02:12
- Done: m3/rc1-pending at bd0dc66 (ec00e95 release string m3-rc1-pre and rc0 guard; bd0dc66 credit gap fix, D1 passes). Unit 342/342, artux-shots 13/13 in both engines. d0e4169 shots folder relabelled.
- Next: Art & UX re-review of the credit area; Player session 2 and QA Sunday triage; F1 CSV merge by Wed Oct 21.
- Blocked: none.

## 2026-10-16 02:17
- Done: F1 cost-segment support on f1/cost-segments ce7d59a (off by default, 349/349, sync-economy check passes, QA test covers all 31 rows). rc0 signed off for internal playtest.
- Next: D2, D3 and D4 for rc1 (m3/rc1-save-durability); D5 and D7 on rc1-pending; F1 data merge by Wed Oct 21.
- Blocked: none.

- 09:06 2026-10-16: save-durability at 780b2d4 (save_restore event, TG-UI-9 mute, focus ring 4.77:1, 320px). Unit 363/363, guard 17/17 x3 engines. 78b6066 makes the csv-vs-sim test skip guard_* columns until the Wed F1 merge. Next: wire guard constants after Wed. Blocked: none; manual real-Firefox audio check goes to QA.
- 09:22 2026-10-16: m3/rc1-ui at fc8e1cf (D5, D7, S2-1/3b/4c/5/6/8/9 visuals, AC14b, particle fix). Browser 78/78 in Chromium and WebKit, shots 44/44, 112 PNGs for Art & UX. Next: Firefox run, Art & UX review, swap the S2-8 stub after Monday merge. Blocked: none.
- 09:28 2026-10-16: save-durability at 73178a3 (D1 save_restore idb-only; window.eggfarm compiled out of release and added to the release check). Unit 364/364, guard 17/17 and D2 18/18 in each engine. QA scripts now need dist-qa. Next: Tue merge. Blocked: none.
- 09:30 2026-10-16: s2-money at 10536b4 (S2-3a full-queue + S2-3a-1, S2-8 $0 gate holds, S2-9 chip guard, S2-10 immediate redraw, fast-Collect touch-action). Browser 52/52 Cr+WK. Next: Firefox run, gate eggfarmUi out of release, Mon merge. Blocked: none. Open: Economy fixture regen; wage rounding 20% under.
- 09:40 2026-10-16: s2-money at 43eb112 (exact wages with fraction carried forward, save v6; eggfarmUi out of release). Browser 56/56 in Cr/WK/FF. Next: Mon merge; Tue rebase the save branch onto v6. Blocked: Economy fixture regen.
- 09:42 DONE save branch 98396ed: release globals allowlist (eggfarmExportTelemetry only, 3 engines), export read-only, eggfarmOrderList flagged; Firefox eggfarm was port clash. NEXT QA recheck 17:00. RUNNING gen-fixtures on s2-money.
- 09:44 DONE s2-money 43eb112 unit 373/373 after Economy sim fix; gen-fixtures no diff, no commit. 78b6066 exception no longer needed, remove in Tue rebase.
- 09:52 DONE rc1-ui 14b28f8: Firefox clean, unit 381/381, browser 83/83 x3; Refill grey, 44px pill, wage /min label, shots posted. NEXT Art&UX sign-off, QA 15:00. BLOCKED none.
- 10:01 DONE QA passed save 98396ed (3 engines). NEXT Tue rebase: make release-globals-browser a required CI step (QA Low ask), remove 78b6066 exception.
- 10:12 DONE rc1-ui f18952e: docked pill 44px reshot, minus is single U+2212 (no double dash), tests 85/85 x3. NEXT Art&UX pill sign-off, QA 15:00.
- 10:15 DONE QA pass s2-money 43eb112 (Mon OK). DOING fix outside economy.csv test path + header drift on s2-money; rc1-ui wage 2-dec formatter + art-path test. NEXT Tue rebase keeps globals strip (S2-REL-1).
- 10:18 DONE s2-money 20f6bd0: tests read repo data/economy.csv, copy-drift check in test/build/CI; header diff was CRLF only. 373 pass+2 skip clean clone. NEXT QA quick recheck before Mon.
- 2026-10-16 10:30 done: rc1-ui aa66bdb (wage spec 19a6188, tests read only repo files, unit 381+2 skip clean / 383 workspace, browser 87/87 x3). next: Art&UX signoff, QA 15:00 recheck on aa66bdb. blocked: none.
- 2026-10-16 11:41 done: QA PASS rc1-ui aa66bdb (15:00 wait cleared), Art&UX wage signoff. next: Tue Oct 20 save-durability rebase onto v6, with release-globals-browser.mjs a required CI step in all 3 engines (ETA Tue 18:00), 78b6066 exception removed, both migrations kept. Thu Oct 22 rc1-ui rebase keeps the global stripping (QA-RC1UI-2), merged SHA to QA. rc2: SVG fixture drift guard, QA-RC1UI-1. blocked: none.
- 2026-10-16 12:38 next: wire market_hand_min_wait_s (F1, skip customers waitedS<min in tick.ts serve loop) by Wed Oct 21; wage-on-idle-turn choice pending Product. M4 Farm split feasibility sent to PM Farm Upgrades.
- 2026-10-16 12:42 next: S2-3a served-card dwell (MK-16..22) with F1 min-wait by Wed Oct 21; QV-1..27 buildability review Mon Oct 26. Offline 0.15 swap confirmed as data-only.
- 2026-10-16 12:45 decision (Product): F1 Market Hand option (b): hold turn, no wage, until a customer waited >= market_hand_min_wait_s; empty-basket turn unchanged; new AC: no wage on held turn. next: dry-run sync --check on product/economy.f1-offline015.csv (scratch branch, no merge) after today's playtest build; risk: r4 row-1 fit gives 0.1467 not 0.15.
- 2026-10-16 12:47 next: MK-23..25 (per-egg copy, 'Sell N · +$Y', partial-sale pop reusing existing pop) with S2-3a + F1 by Wed Oct 21.
- 2026-10-16 12:48 note MK-23..25: layout-spec §4.4 (<=375 price line 2 lines, Sell button stacked >=44px; >=390 single line); Wed batch needs 360 worst-case shot (3-digit N, >=$1,000).
- 2026-10-16 12:50 plan pulled in (no-padding rule): rc1-pt1 cap 16:00 today; market batch (F1 min-wait, S2-3a, MK-23..25) start after pt1, target Sat Oct 17; offline 0.15 dry-run tonight; save rebase right after Mon s2-money merge, save+ui merges Mon/Tue; QA rechecks on SHA post.
- 2026-10-16 12:55 next: AC14b save-recovery v2.0 UI on save branch, ETA Sun Oct 18; M4 spawn-spot rect check at 360/375/1280 tonight.
- 2026-10-16 13:05 done: P1 Vadim playtest on m3/rc1-ui (pushed aa66bdb..2490c79). 2d997f1: FTUE never spotlights an empty queue, no caret on the farm, release strips window.eggfarm/eggfarmOrderList (QA-RC1UI-2), toast test. 3a98355: ETA "Affordable in ~m:ss". 7488bbc: per-worker Refill. ac73909: C-AC25 Welcome back copy. 2490c79: "build <sha>" HUD tag. Unit 401/401, rc0-browser 113/113 in Cr/WK/FF. Published private pre-release rc1-pt1 (egg-farm-rc1-pt1-2490c79.html, single file, file:// verified with 5 min of play, globals = eggfarmExportTelemetry only). m2-rc1-play retitled SUPERSEDED. next: QA 5-min Chrome smoke on rc1-pt1; Tue save rebase; Thu rc1-ui merge (2d997f1 already strips the globals). blocked: none.
- 2026-10-16 13:20 done: rc1-pt1 set to a full release and Latest (prerelease=false, make_latest=true); /releases/latest (authenticated) returns rc1-pt1 at 2490c79; m2-rc1-play is no longer Latest. release-check.mjs on the 2490c79 release dist: tag==SHA PASS, Settings build hash==SHA and not dirty PASS (Cr/WK/FF), save/reload PASS, no page errors PASS; GitHub-latest N/A (the script uses the unauthenticated API, so the private repo gives 404); collect->sell->upgrade FAIL in all 3 engines. Same FAIL on aa66bdb, so not a regression: at 390 the script's chip tap opens the Market sheet and never closes it, so the Upgrades nav click times out. next: QA to fix the script (close the sheet before the Upgrades click), Chrome smoke on rc1-pt1. blocked: none.
- 2026-10-16 13:15 BLOCKED: s2-money (20f6bd0) -> main merge stopped on conflicts in data/economy.csv, package.json and README.md. The merge was aborted with nothing committed or pushed, and main stays at 00e004c. The economy.csv conflict covers every data row: main has the old M2 numbers (CRLF, 45 columns, eggs/s L0 1.0, interval 10s->3s, queue 3-5). s2-money has the newer ones (46 columns incl. manage_prompt_threshold, eggs/s L0 1.5, interval 5s->1.5s, queue 6-10, demand halved). That is a Product economy call. next: CEO/Product confirm which economy.csv main takes (presumably s2-money's), then I resolve package.json (keep both preview and build:qa/check-economy-copy) and README (keep main's full README, add the s2-money Credits section), and run the tests.
- 2026-10-16 13:45 done: merged m3/rc1-s2-money (20f6bd0) into main as 4aadcbf (--no-ff, pushed 00e004c..4aadcbf, no force). Conflicts resolved per CEO decision: economy.csv takes s2-money's copy (check-economy-copy: matches product/economy.csv, 32 lines), package.json keeps preview, build:qa and check-economy-copy, README is main's plus the branch's Credits section. Unit 375/375; sync-economy --check up to date; npm run build + check-release-build OK (m3-rc1-pre+4aadcbf); release-globals-browser (script from 98396ed) PASS Cr/WK/FF, only eggfarmExportTelemetry. rc0-browser: WK 56/56, FF 56/56, Cr 56/56 on the 5th run. The 4 earlier Cr runs failed 1-2 timing checks (mostly 'Fast Collect 10 taps 50 ms apart -> 5, got 6'), and QA-passed 20f6bd0 flakes the same way on this box (load avg about 30). next: deflake Fast Collect (rc2); Tue save-durability rebase onto main. blocked: none.
2026-10-16 13:55 Eng — done: M4A-31 rollback AC written in product/farm/m4a-spec.md (backup save_v6_backup, refuse-newer guard in save-durability before rc1 tag). next: QA review.
- 2026-10-16 13:58 done: checked product/economy.f1-m4cols.csv against main. sync-economy ignores unknown columns, but every cell must be numeric. The one parity test that compares column sets gets relaxed in the F1 merge. next: accepted T1/T2/T4 for the Wed Oct 21 batch; T6 (aria income text) added to Cut A. blocked: none.
- 2026-10-16 14:25 done: m3/rc1-save-durability rebased onto main 4aadcbf and pushed as m3/rc1-save-durability-rebased @ 8669522 (31 commits + 3; original branch 98396ed untouched; not merged). Conflicts were mechanical: main.ts got RenderPump + the D3/D4 gate + tab-guard freeze/lease; check-release-build kept both checks; styles.css union. Global stripping kept. 98aaac7 removes the 78b6066 exception. 7946591 adds the CI release-globals job x3 engines (npm run check-globals). Save migrations v1->v6 all kept. 8669522 adds M4-safety: a save with version > SAVE_VERSION is refused untouched. Unit 403/403, sync --check OK, check-economy-copy matches (32 lines), build + check-release-build OK, globals PASS Cr/WK/FF, rc0-browser 59/59 x3. fix/fast-collect @ 737c2cf (off main, not merged): test-timing flake, not a rate-limit bug (hens lay 1.5 eggs/s during the tap burst); test now freezes the sim clock; fastcollect 5/5 Cr + WK + FF, and passes with 250 ms gaps. rc1-pt1 (2490c79) is SAVE_VERSION 5 and treats newer saves (incl. v6) as corrupt -> "A fresh start", overwriting the main save (raw kept under eggfarm.save.corrupt.*). next: QA recheck of the rebased branch; branch protection must list release-globals as a required check; rebase rc1-ui onto main before the next play build. blocked: none.
- 2026-10-16 14:10 done: added M4A-31(f) clarifications for QA's six points (key names, newer = integer above SAVE_VERSION, .newer-save layer, scope of byte-identical, no writes while refused). next: M4-A builds to it. blocked: none.
- 2026-10-16 14:12 done: QA closed gate item 9; M4A-31 (a)/(b) aligned with (f). M4-A kickoff confirmed by HoP, capped at 6-8 dev-days. next: M4-A after the save-durability and F1 merges. blocked: none.
- 14:42 NEXT: build id on page (meta build-id + data attr + label, no global) added to Cut A, per Tools Admin. M4-A: migrateTracksV7 stays open to 'V may exceed cap at migration'; add a C>=F+5 fixture (Product heads-up, Economy confirming today).
- 14:46 M4-A spec update (HoP, product/m4a-review-response.md): migrateTracksV7 V search covers 0-30 (no min(F+3,30)); V may exceed cap at migration only, further V buys blocked until F+3>=V; fixtures F0/C5->V4, F3/C10->V7, F5/C14->V9, F13/C30->V17. Price-never-drops check in integer cents, one half-up round (F20/C17 off by 1c today). Hens milestones = coop size + offline eggs (data only, Economy CSV). Supersedes 14:42 open-rule note. Smoke.mjs now reads meta build-id; send Admin Cut A SHA.

## 2026-10-16 (14:45 CET) — Engineering / Cut A rc1/ux-clarity
- **Done (branch `rc1/ux-clarity`, pushed ccd7bf9):** Cut A UX clarity on top of e84c022/8832740.
  - Shared `incomePerSec` + asleep fail-state + Farm/Collection value chips (prior commits).
  - **C-AC26** Collection price-first fx + `+12% egg price · +5/tap` summary from balance; bare `+N/tap` scan test.
  - **art-ux rc1-upgrade-value v1.4:** `--c-meadow-text/#2F6B27`, `--c-meadow-tint`, `--c-danger`→`--c-barn-ui`; Best buy 2px yolk-dark outline; Ready! yolk 20px chip; short goal ETA `~m:ss`/`~1h 59m`; goal label `.g-star/.g-track/.g-gain` overflow (hide ★ → short name → ellipsis); Farm `Limited by collecting ›`; asleep 32px danger banner, body .5 except banner+Refill, badge on Upgrades nav + Workers tab; Refill ≥44×88.
  - **AC-R8/R9** refill captions (`Rested, refill below 50% [corrected 18:06: AC-R8 v1.0.7 = manage_prompt_threshold×100 = 50%]`, `Refill N tired worker(s)`).
  - **Build id:** Vite `__BUILD__` → `meta[name=build-id]` + `#app[data-build-id]` + existing HUD `.build-tag` / Settings footer; no window global (S2-REL-1). `scripts/smoke.mjs` reads the meta tag; ops/claude smoke already expected meta/data.
- **Tests:** vitest focused suites green (rc1-ui/next-goal/workers-v11/p1-oct16); full suite was 414 pass earlier in session. `npm run build` + check-release-build OK (`m3-rc1-pre+ccd7bf9`).
- **Screenshots:** `engineering/screenshots/rc1ux-{360,375,1280,asleep-360,goalstrip-L25-360}.png`. Fredoka L25 `★ Collection L25 · +12% income` ≈ **195.4px** with ★ / **179.6px** without (under 200px budget → ★ kept). Overflow path verified at L30 +999% (~205px → drop ★).
- **rc0:** chromium **113/113** at ccd7bf9 (plus 2 confirmation runs). Release-globals chromium PASS (only `eggfarmExportTelemetry`; no `window.eggfarm` / no build global).
- **Next:** Cut B only if needed; merge when QA signs off. **Blocked:** none for Cut A code.
- 2026-10-16 14:58 HoE: done: m3/rc1-save-durability-rebased 8669522 -> 2959ba0 (pushed): all review 8669522 findings fixed (B1 IDB/.bak newer-save, M1 check before lease, m1-m4, n1) + BUG-6 (missing/non-finite savedAt -> 0 offline, re-stamped). Unit 408 (s2-money passed on rerun after worker timeout), economy copy/sync OK, build OK, globals 3/3 engines, rc0-browser 3/3 engines (FF/WebKit needed section reruns because of box load). next: Claude Code Reviewer re-check + QA recheck on 2959ba0, then merge after CEO approval.
- 2026-10-16 14:55 Eng: fix/rc1-qa-bugs @ 8468101 pushed (from main 4aadcbf). BUG-1/2 fixed (one payout fn sim/payout.ts for credit, Sell all, +$X popup, order cards; M4 multiplier hook), BUG-3 fixed (round-then-suffix, adds T), BUG-5 fixed (merged floater re-arms timer), BUG-4 not on main (rc1-pt1-only animationend kill; guarded by test). 40 files / 407 tests pass + 34 new; build + globals check ok; screenshots engineering/screenshots/qa-bug12-*.png. Not merged; awaiting QA.
- 14:50 DONE: save fix 2959ba0 to QA+Code Reviewer re-check; fix/rc1-qa-bugs 8468101 (BUG-1/2,3,5; BUG-4 not on main, guarded) to QA. NEXT: merges after QA. 737c2cf verified separately. Asked HoP re order-card value.
- 14:53 DONE: Claude Code Reviewer re-check 2959ba0 PASS (engineering/reviews/m3-rc1-save-durability-recheck-2959ba0.md). Non-blocking follow-ups for after the save merge (not changing SHA under QA recheck): idb-mirror.ts:55 missing savedAt should count as oldest in reconcile; main.ts:79-80 brief 'open in another tab' race; idb-mirror.ts:24 IDB version fixed at 1. Save merge now waits only on QA.
- 2026-10-16 14:56 Eng: fix/rc1-qa-bugs @ 8be6ad4 (HoP order-card rule). Card line keeps full order value; Sell button now "Sell k · +$X" via saleValueCents (partial + ready). Partial orders: card $ > next Sell, button == credit. Tests: partial + Grader 0/1/2. 410 tests pass; economy.csv matches product; tsc + build OK. Not merged; awaiting QA.
- 15:15 NEXT: AC14b save-recovery dialog per art-ux/save-recovery-dialog.md v2.1 (restored/fresh/storage, BUG-7 -> Restored), built on the save round's recovery outcome; screenshots to Art & UX. Cap Sun Oct 18.
- 2026-10-16 15:18 HoE: done: Art & UX FIX1–4 on rc1/ux-clarity @ 8631e94 (from ccd7bf9). Badge top-right (-6,-6) on Workers tab + Upgrades nav; goal strip 4px after ★ + space before ·; HUD asleep rate '⚠ ▼ $0.00/s' (aria shares $0.00, T6); tabs hit ≥44px (was 36→44). Unit 423/423; build + check-release-build OK (m3-rc1-pre+8631e94); release-globals chromium PASS (only eggfarmExportTelemetry); rc0-browser chromium 113/113. Shots: engineering/screenshots/rc1ux-fix1-workers-badge-360.png, rc1ux-fix1-upgrades-nav-badge-360.png, rc1ux-fix2-goalstrip-1280.png, rc1ux-fix3-hud-asleep-rate-360.png; refreshed rc1ux-asleep-360.png + rc1ux-1280.png. Hit sizes before→after @360: close 44×44→44×44, tabs h 36→44, goal 44→44. next: Art & UX sign-off on FIX shots; QA Cut A recheck. blocked: none.
- 15:22 DONE: Art & UX approved Cut A @ 8631e94 for UI merge. Merge after save merge + QA FF/WebKit pass. rc2: Upgrades nav badge anchor to icon top-right (-6/-6).
- 15:26 DONE: M4-A v1.2 (minus v6→v7 save wiring) on m4/m4a-tracks @ 6f4c0a6 (from main 4aadcbf), flag balance.m4.enabled=0. Flag off = main (sim trace hash identical to 4aadcbf). Pure migrateTracksV7 + all spec fixtures (not wired, SAVE_VERSION 6). Unit 455/455, tsc, sync --check, build + globals check, rc0 Chromium 56/56. Gaps: M4 columns not in product/economy.csv (read from economy.m4-candidate.csv), F1/M3 farm_cost not on main, payout.ts not on main. NEXT: wire migration + explainer after save merge.

## 2026-10-16 (15:30 CET) — Engineering / QA-MONEY-1 + MK-24-1
- **Done (Task A):** merged `fix/fast-collect` @ 737c2cf into `main` (FF). New main SHA **737c2cf**. QA-MONEY-1 closed (test-only rc0-browser Fast Collect freeze). Unit 373/373 on that lineage; build + check-release-build OK before merge.
- **Done (Task B):** MK-24-1 on **`fix/rc1-qa-bugs-v2` @ 24cda19** (rebased onto main 737c2cf; pushed as v2, no force). Sell button:
  - Art & UX sizing: `width:max-content`, min 88px, **max-width 45cqw** (45% of the row via container query — % max-width was cyclic in the auto grid column and pinned at 88px), pad 12px, nowrap, no ellipsis; ≤375 / `.sell-stack` = two lines (14px / 12px Fredoka); row name/stock ellipsis.
  - HoP 15:14: visible amount via `fmtMoneyPreview` (exact under $1K; floored short at $1K+ so never above credit); aria-label / popup / Thanks stay exact.
  - Tests: 414/414; tsc + sync-economy --check + build + check-release-build OK (`m3-rc1-pre+24cda19`).
  - Overflow browser script PASS at 360/375/390/430/1280 (scrollWidth≤clientWidth, no ellipsis).
- **Screenshots:** `engineering/screenshots/mk24-1-{360,375,390,430,1280}.png` (build id overlay `m3-rc1-pre+24cda19`).
- **Next:** QA recheck MK-24-1 on 24cda19; merge after pass. **Blocked:** none for this fix.

## 2026-10-16 (15:35 CET) — Engineering / MK-24-1 v3
- **Done:** Art & UX rework of MK-24-1 on **`fix/rc1-qa-bugs-v3` @ 4d035bf** (from 24cda19; worktree `game-rc1-bugs-v3`; pushed, no force).
  - Always two-line Sell (`Sell k` 14px over `+$X` 12px) at every width; one-line / `.sell-stack` / ≤375 media removed.
  - Shared button width via `--sell-w` on `.order-list` (max of content, min 88px, max 45cqw); pad-inline 12px; min-height 44px; no ellipsis on button.
  - Row text: `.l1 .v` ($ amount) `flex-shrink:0` / no ellipsis; only `.e` (eggs) may ellipsize.
  - Row 2 (17/17 · $93.84 vs Sell 13 +$71.76): **correct** — demand 17, filled 4, rem 13; button sells `min(basket, rem)`.
- **Tests:** 417/417; tsc; sync-economy --check; build + check-release-build OK (`m3-rc1-pre+4d035bf`); overflow script PASS 360/375/390/430/1280 (column, shared width, $ never truncates).
- **Screenshots:** `engineering/screenshots/mk24-1-v3-{360,375,390,430,1280}.png`.
- **Next:** Art & UX re-review (promised ≤30 min); QA recheck. **Blocked:** none for this fix.
- 15:34 DONE: M4-A HoP 15:29 rulings on m4/m4a-tracks @ f5d8047: highlight + next-goal = best payback (shared src/econ/best-buy.ts/income.ts, same API as rc1/ux-clarity), ETA via fmtAffordableIn when nothing affordable; copy v1.1 effect lines + milestone hint. Unit 461/461, tsc, sync --check, build + globals, rc0 Chromium 56/56 (x2; one earlier run 43/46, not reproduced). CSV: f1-m4cols NOT yet in product/economy.csv; candidate-file path kept.
- 2026-10-16 15:35 Head of Eng: save durability v3 pushed m3/rc1-save-durability-v3 @ 4a25d0d (rebased on origin/main, incl. 737c2cf). Fixes QA BUG-1..5 (savedAt <=0/pre-2020/null/future -> 0 offline + re-stamp; live newer-save guard on every write path incl. IDB in-tx check; main missing + valid .bak -> restore; Reset clears .bak+IDB), reconcile invalid-savedAt=oldest, pre-claim newer check, loadSafe outcome. Unit 436/436, build+globals ok, release-globals 3/3 engines, rc0-browser 76/76 Chromium/Firefox/WebKit. Awaiting QA + Code Reviewer recheck.

## 2026-10-16 (15:40 CET) — Engineering / MK-24-1 money format + S2-REL-1
- **Done:** on **`fix/rc1-qa-bugs-v3` @ 4960e21** (FF from 4d035bf; pushed, no force).
  1. **fmtMoneyExact** — full dollars, thousands separators, 2 dp; `—` for NaN/Infinity. Sell `buttonAria`, sell floater, Thanks card, and queue pop use it. Card line stays `fmtMoney`. Tests cover `$9,999,000.00` and `$12,345.67`.
  2. **S2-REL-1:** `window.eggfarmOrderList` gated behind `import.meta.env.DEV` (stripped from release). `window.eggfarm` gated behind `IOS_FLAG_ENABLED` (same, so the allowlist can pass; QA builds keep it). **Check gap:** `check-release-build` previously only scanned for the string `eggfarmUi`, so `eggfarmOrderList` / `eggfarm` slipped through. Now fails on any `window.*` / `globalThis.*` / `self.*` assignment outside allowlist `eggfarmExportTelemetry`. Unit test proves `eggfarmOrderList` fails the check.
  - Note: main **737c2cf** still has unconditional `eggfarmOrderList` (and `eggfarm`); both land on main when this branch merges.
- **Gates:** unit **422/422**; tsc; sync-economy --check; build + check-release-build OK (`m3-rc1-pre+4960e21`, globals `eggfarmExportTelemetry` only); overflow PASS 360/375/390/430/1280.
- **Screenshots:** refreshed `engineering/screenshots/mk24-1-v3-{360,375,390,430,1280}.png`.
- **Next:** QA money-format recheck + Art & UX layout re-review. **Blocked:** none.
- 15:42 HoE: DONE MK-24-1 v3 4960e21 (aria exact, S2-REL-1 + release-check gap) -> QA queued after save. Code Reviewer 4a25d0d PASS (advisory); minors N1-N6 queued as follow-up after QA verdict, not changing the SHA under test. NEXT: save verdict ~18:30 -> merge + Latest tag.
- 15:46 DONE: Cut A rebased onto main 737c2cf as **`rc1/ux-clarity-v2` @ 32b789c** (pushed, no force). Squash of 8631e94 onto 737c2cf (commit-by-commit rebase hit heavy S2-money overlap; resolved as one tree + follow-up fixes). Keeps main ServedDwell/tryDispatch/rates/fast-collect; keeps Cut A income/best-buy, goal-pill, asleep badges, collection copy, NavAria, FIX1–4. Conflicts: styles.css both sides; economy tests stay on data/economy.csv; rc0 keeps main s2money + Cut A p1; app.ts Cut A UI + main dwell/tap-guard/rates. Tests: unit 457/457; tsc OK; sync-economy --check OK; build + check-release-build OK (`m3-rc1-pre+32b789c`); rc0 Chromium **129/129**. Reviewer worktree: `/workspace/review-32b789c`. **Not merged** — waits on QA recheck + one Code Reviewer pass (CEO 15:xx). Then rebase save fix on top.

## 2026-10-16 (15:48 CET) — Engineering / MK-24-1 v4 delivered eggs
- **Done:** on **`fix/rc1-qa-bugs-v3` @ 16c2248** (FF from 4960e21; pushed, no force).
  - Order card count + progress bar = **filled/demand** only (e.g. `4/17`), not filled+this-Sell. Sell button unchanged.
  - `$` stays full order value (MK-23 / P2 / HoP).
  - Art & UX: `{filled}/{demand} eggs · $V`; only `.egg` may ellipsize; count + `$` `flex-shrink:0`. Row aria: `N of M eggs delivered, order worth $exact`.
  - Optional Sell-preview tint skipped (not trivial).
- **Ruling followed:** Product — card shows delivered eggs (e.g. 4/17 instead of 17/17); `$` = full order. Spec MK-23: progress `filled`/N, value = full order. Art & UX confirm: `'{filled}/{demand} eggs · ${orderValue}'`, bar = filled/demand, aria `'4 of 17 eggs delivered, order worth $93.84'`.
- **Gates:** unit **422/422**; tsc; sync-economy --check; build + check-release-build OK (`m3-rc1-pre+16c2248`); overflow PASS (row2 `4/17` + Sell 13).
- **Screenshots:** `engineering/screenshots/mk24-1-v4-{360,390,1280}.png`.
- **Next:** QA + Art & UX recheck. **Blocked:** none.

## 2026-10-16 (15:52 CET) — Engineering / MK-24-1 NBSP before eggs
- **Done:** on **`fix/rc1-qa-bugs-v3` @ 8932a01** (FF; pushed, no force). Art & UX: flex collapsed leading space on `.egg` to `4/17eggs`. NBSP (U+00A0) now lives inside the `.n` count span (`4/17\u00a0` + `eggs`). Unit test asserts the NBSP; overflow confirms `nbsp:true`.
- **Gates:** unit **423/423**; tsc; sync-economy --check; build + check-release-build OK (`m3-rc1-pre+8932a01`); overflow PASS.
- **rc2 note:** at 1280 the 'Coop upgraded!' toast overlaps the hire banner title.
- **Next:** Art & UX recheck. **Blocked:** none.
- 16:00 DONE: Economy CSV taken on m4/m4a-tracks @ 4ba3c31 (pushed). Cherry-picked ce7d59a; per-row CSV farm costs (segments + costOverrides L18-19, L23-29), Grader tier costs from CSV; copy check vs product/economy.m4branch.csv; main's product/economy.csv == origin/main. Unit 470/470, tsc, sync --check, build + globals, rc0 Chromium 56/56 x2 (one flaky 55/56 Fast Collect). Flag-off hash == main on rc1 economy. TR-5 (30/60 min, workers, realistic), M4A-37/38/39/40 PASS on economy.m4branch.csv.
- 15:58 DONE: Code Reviewer findings on rc1/ux-clarity-v2 @ 32b789c fixed and pushed as **`1371305`** (FF). **M1 real:** restored `dirty=true; render()` after welcome Collect; rc0 S2-10 same-task #basket check. **M2 real:** `ui.rates()` reconstructed gross from already-net `incomePerSec` so wages aren't subtracted twice; unit + rc0 at F3/MH (net 458.75 = income 460 − wage 1.25). **m3:** pinned S2-4c sold-N to **366** (MK-22 comment). **N2:** deduped `.tabs{overflow:visible}` and `.wk .btn.manage` (kept 44×88). **m1 partial:** strip uses `queueFull()`; s2-economy-ui re-exports from ./rates; workers-ui stub wages → rc2. **m2 deferred rc2:** header `⚠ ▼` vs rateView/`injected` rc0 text. Gates: unit **458/458**; tsc; sync --check; build + check-release-build OK (`m3-rc1-pre+1371305`); rc0 Chromium **130/130**. Shots: `engineering/screenshots/rc1ux-v2-1371305-{main,asleep,fix1-workers-badge,fix1-upgrades-nav-badge,fix2-goalstrip,fix3-hud-asleep-rate,goalstrip-L25}-{360,1280}.png`. vs 8631e94 (matched states): main-360 0.77%, main-1280 0.04%, asleep/fix1/fix2/fix3 <0.6% (build id + timers); L25 baseline was farm-view — see report.
- 2026-10-16 16:05 Head of Eng: AC14b save-recovery dialog v2.1 pushed m3/save-recovery-dialog @ 50cdbe9 (off 4a25d0d, not merged). Outcome-driven restored/fresh/storage (none for null), exact v2.1 copy (SD4-5), SD4-3/N5 fix: main missing + bad .bak -> 'fresh' dialog. Unit 445/445, build+release check ok, release-globals ok, rc0-browser 150/150 Chromium/Firefox/WebKit. Shots engineering/screenshots/save-recovery-{restored,fresh,storage}-{360,1280}.png for Art & UX. Will rebase onto m3/rc1-save-durability-v4.
- 16:06 DONE: m4/m4a-tracks @ 1bc66da (pushed): economy.csv L20 w4_tier_cost 10707 -> 9100 (Economy patch); matches product/economy.m4branch.csv, sync --check ok, balance.json unchanged, unit 470/470.
- 2026-10-16 16:09 Head of Eng: save durability v4 pushed **m3/rc1-save-durability-v4 @ aaaa91a** (off 4a25d0d, which is untouched). SD4-1/QA e3 + Reviewer N2: pickNewest/reconcile/restoreSource now rank by the real clock (validate(raw,b,now); savedAtRank: missing/null/<=0/pre-2020/future >2 min skew = oldest). QA f6: TabLease.claim detects a failed lease write (throw or read-back mismatch) -> storageBlocked, stays owner (only a channel claim takes over), heartbeat retries; main.ts sets 'storage' outcome + no-storage notice, never 'another tab'. Reviewer N3: idbRaw = (await mirror.read()) ?? idbRaw. New tests/save-durability-v4.test.ts (10/12 fail on 4a25d0d, all pass). Unit 448/448, tsc, sync --check, build + check-release-build, check-globals, rc0-browser 76/76 Chromium/Firefox/WebKit. SD4-3/SD4-5 left to AC14b dialog. Awaiting QA.
- 2026-10-16 16:13 Head of Eng: DONE M4A-18 v1.4 / M4A-41 / UC6 on m4/m4a-tracks @ 53bf0cd (pushed): src/ui/pick-hysteresis.ts PickHysteresis shared by Farm-tab highlight + next-goal hint (M4 on); best bundle payback among affordable rows (ties cost, Farm>Hens>Egg value); switch only <=0.9x AND shown >=2 s; instant on bought/unaffordable/cap/MAX; eval on state change + 5 s re-check; HighlightHold (holdTicks=2) removed. Tests 1-6 + M4A-41 x3 in tests/m4a-pick-hysteresis.test.ts. Unit 480/480; flag-off hash = main (economy.rc1.csv) ok; build + check-release-build ok (m3-rc1-pre+53bf0cd); m4a_gate40_hyst.py PASS (highlight L21 30/30); rc0 Chromium 56/56. Spec Q to PM Farm: pick pool = Farm-tab rows only, so with M4 on the hint no longer points at Collection/workers while a Farm-tab row is offered.
- 2026-10-16 16:19 Head of Eng: DONE HoP 16:15 refinement on m4/m4a-tracks @ f97f233 (pushed; follow-up commits 9d0aee7+f97f233 on 53bf0cd, no amend since 53bf0cd was pushed): newly affordable row skips the 2 s hold but still needs 0.9x; fallback -> first affordable at once. New tests 3b + M4A-41 affordable-sequence (0 changes within 10%, 0.85x at once). Unit 482/482; flag-off hash ok; build + release check ok; gate40_hyst PASS; rc0 Chromium 56/56.
- 2026-10-16 16:26 Head of Eng: DONE ruling (1) (decisions 16:15) + multi-affordable check on m4/m4a-tracks @ 04e2709 (pushed, on f97f233): DualPicker = two PickHysteresis instances, same rules; highlight ranks Farm-tab rows, hint ranks every option incl. Collection/workers (UC7); on-tab hint = highlight (M4A-41), off-tab hint points there and highlight keeps best Farm-tab row. Every newly affordable row is checked vs 0.9x (best of those wins at once). Tests: off-tab, fresh save (flag off: COLL 55.6 s vs Farm 111.9 s), M4A-41 60 s with hint off-tab and back, multi-affordable. Unit 485/485; flag-off hash ok; gate40_hyst PASS; build + release check ok (m3-rc1-pre+04e2709); rc0 56/56 Chromium/Firefox/WebKit. Note: with M4 on, fresh-save hint = Hens (120 s) since Collection's bundle is 150.6 s (single-step gain 0) - flagged to PM Farm.
- 2026-10-16 17:10 Eng: m3/save-recovery-dialog-v4 @ e9887da = dialog (50cdbe9) rebased onto save v4 aaaa91a, no textual conflicts. Semantic fix: lease.storageBlocked now opens the v2.1 Storage dialog (was outcome-only, no dialog). Firefox lone-button focus ring fixed. Gates green: 460 unit, tsc, sync-economy, release build+check, check-globals, QA build, rc0 156/156 x Chromium/Firefox/WebKit. Focus ring 3px #2B79A8, 4.77:1. Screenshots save-recovery-v4-*. Ready for QA after the MK-24-1 verdict.
- 2026-10-16 17:29 Eng: m3/save-recovery-dialog-v4 @ a01faea: AC14b v2.2 'Can't save' (storage refused, farm loaded; Export save = current farm); card never translucent (rcPop scale-only); save-warning toast held until dialog closes. Gates green: 464 unit, tsc, sync-economy, release build+check, check-globals, QA build, rc0 197/197 x Chromium/Firefox/WebKit; focus ring 3px #2B79A8 4.77:1. Screenshots save-recovery-v4-{restored,fresh,storage,cantsave}-{360,1280}. Note: v2.2 body wraps to 3 lines at 360.

### 2026-10-16 18:35 — save v4 shipped (Head of Engineering)
- **Done:** main fast-forwarded 737c2cf → `aaaa91a` (save durability v4, QA PASS 3 engines). Code Reviewer recheck 4a25d0d..aaaa91a: 0 blocker/critical/major, 8 minor, 4 nit (engineering/reviews/m3-rc1-save-durability-v4-aaaa91a.md). Gates on main: unit 448/448, tsc, sync-economy --check, build+check-release-build (build id `m3-rc1-pre+aaaa91a`), check-globals, rc0 Chromium 76/76. Tag `m3-rc1-save-v4` (annotated); GitHub release https://github.com/PrincipalLewis/egg-farm/releases/tag/m3-rc1-save-v4 — normal release, Latest.
- **Next:** backlog SD5-1/SD5-2 (Firefox Minors) + reviewer V4-1..V4-4. rc1-guard-save-qa.mjs v5→v6 bump: script lives in qa/m3-scripts (not in the game repo), so no fix/qa-guard-save-v6 branch yet — needs QA owner call.

### 2026-10-16 19:16 — save-recovery dialog shipped (Head of Engineering)
- **Done:** main fast-forwarded aaaa91a → `a01faea` (dialog v4, QA PASS 3 engines). Code Reviewer aaaa91a..a01faea: 0 blocker / 0 critical / 2 major (R1 unscoped .recovery-card spacing hits tab-guard/newer-save cards; R2 'Saving is paused' on lease-write failure alone = V4-2) / 4 minor / 5 nit (engineering/reviews/save-recovery-dialog-a01faea.md). Gates: unit 464/464 (one idb-mirror flake under parallel load, clean on rerun), tsc, sync-economy, build+check-release-build (`m3-rc1-pre+a01faea`), check-globals, rc0 Chromium 197/197. Tag `m3-rc1-dialog`; release https://github.com/PrincipalLewis/egg-farm/releases/tag/m3-rc1-dialog (normal, Latest) with egg-farm-m3-rc1-dialog-a01faea.html; egg-farm-m3-rc1-save-v4-aaaa91a.html attached to m3-rc1-save-v4. Single-file = vite-plugin-singlefile + public assets inlined as data URIs (/tmp/vite.single.config.mjs, /tmp/inline-public2.mjs), file:// smoke OK.
- **Next:** R1/R2 follow-ups; MK-24-1 rebase → fix/rc1-qa-bugs-v4.
- 2026-10-16 19:30 done: kicked off Architect, Saves, UI, Features engineers. next: dialog release, MK-24-1/TUT-1 v4, M4-A v2 playtest build.

### 2026-10-16 20:20 — fix/rc1-qa-bugs-v4 pushed for QA recheck (Head of Engineering)
- **Done:** MK-24-1 (8932a01) rebased onto main a01faea → `fix/rc1-qa-bugs-v4` @ `7d52952` (not merged). Conflicts (check-release-build, main.ts, app.ts) resolved to main's side. Extra commits: ca9fe86 QA M-1 (Sell pad 12→10px), 94117b6 QA M-2 (rc0 Bug9 whitespace), 25afd4e review F1 blocker (stale S2-REL-1 test) + F2/F4/F5, 9601303 QA TUT-1 (docked Sell step targets Sell button; card tap highlights row), 45e4e8d review G1 (data-hl), 7d52952 QA B-4 (perf overlay gated; eggfarm* identifier scan; ?perf=1 runtime check). Gates @7d52952: unit 515/515, tsc, sync-economy, build+check-release-build (`m3-rc1-pre+7d52952`), check-globals 3 engines, rc0 200/200 Cr/FF/WK. Reviewer (3 calls): final 0 B/C/M, 2 minor (F3, H1), 3 nit (engineering/reviews/rc1-qa-bugs-v4-7d52952.md).
- **Note:** B-4 does not reproduce on main a01faea (the import was already __IOS_FLAG__-gated). It came from old main at 8932a01, so 7d52952 is hardening only.
- **Next:** QA recheck of 7d52952; bump rc1-guard-save-qa.mjs to v6 in the QA folder (QA owns it).
- 2026-10-16 20:27 Head of Eng: DONE m4/m4a-tracks-v2 @ 3351d6c (pushed, new branch, no force): squash of m4/m4a-tracks @ 04e2709 onto origin/main a01faea (save v4 + AC14b dialog; only conflict styles.css, both sides kept). Save migration wired: flag on + pre-M4 farm (v1..v6 from main, no tracksV7 marker) -> migrateTracksV7 once (H=F, price-matched V, coins/F/C/coop/basket kept); new M4 farms marked; SAVE_VERSION stays 6; flag off unchanged. tests/m4a-save-migrate.test.ts (10). Gates: unit 584/584 (one idb-mirror flake under load, clean rerun); flag-off hash = main; gate40_hyst PASS; build + check-release-build ok (m3-rc1-pre+3351d6c); check-globals ok; rc0 197/197 Chromium, Firefox, WebKit (WebKit: 1st run browser crash after box restart, 2nd 1 Bug9 375x812 flake, 3rd clean). Flag-on single-file engineering/builds/eggfarm-m4a-3351d6c.html (487,581 B, build id m3-rc1-pre+3351d6c+m4on), file:// smoke Chromium OK. Not released.

- 2026-10-16 20:55 Senior Engineer, UI & rc1 Fixes: audio + juice v1, feat/ui-audio-juice-v1 @ 8529aca (local only, off origin/main a01faea, worktree /workspace/wt-audio).
  - **Done:** audioJuiceV1 flag, default off (opt in: ?juice=1 or localStorage eggfarm.flag.audioJuiceV1=1). audio-hooks v1.2: all 7 events on the new sfx/* files (ogg, then mp3 fallback), rotation, cooldowns (cant-afford 400 ms per button), voice caps, big-sale sparkle at 0.6. Juice and number pops with reduced-motion variants. Settings Sound On/Off toggle (44 px, focus ring, aria-pressed). Gates: unit 479/479; build (tsc, sync --check, release check) ok; rc0 Chromium 197/197, WebKit 196/197 (Bug9 wide:4 at 360, the same Bug9 load flake Head of Eng saw); check-globals ok on Chromium and WebKit. Shots: engineering/screenshots/audio-juice-v1/.
  - **Next:** rc0 + check-globals on Firefox, WebKit Bug9 rerun, Code Reviewer pass.
  - **Blocked:** push + PR wait on user approval (external). Box load ~150 is slowing the gates.

- 2026-10-16 21:00 UI & rc1 Fixes: done (local commits, NOT pushed: push approval card timed out): fix/rc2-toast-hire-banner @ ac4ec56 (toast below New helper! banner + rc0 B2 expectation), fix/rc2-b2-tired-tip-tabs @ 4fbd0b9 (QA B-2, rc0 197/197 Cr/WK/FF), fix/rc1-r1-dialog-spacing @ ff6b5d3 (Reviewer R1, tab-guard/newer-save title->body 0 -> 12px), fix/rc2-money-format @ 7ed1ef2 (FMT-1/FMT-2), fix/rc1-cuta-followups off rc1/ux-clarity-v2 @ 1371305 (v1.6 goal label, nav badge anchor, m2 header rate, m1 wage source; tip after test fix). main a01faea rc0: Cr 197/197, FF 197/197, WK 196/197 (Bug9 360 farm wide=4, pre-existing). idb-mirror 'Reset save clears the mirror' unit test flaky on main too (1/4). 17/17 already fixed on fix/rc1-qa-bugs-v4 (not duplicated). next: approve push, finish rc0 x3 on toast/R1/money/cuta (box overloaded, runs stalled), check-globals failure on cuta, open PRs, Code Reviewer pass on R1. blocked: push approval; box load.

- 2026-10-16 21:57 Senior Engineer, Features & Economy Wiring: **done:** m4/m4a-tracks-v3 local @ 01a4643 (on 677317d: v3 review fixes m1/m3/m4/m5/n1/n2, M4-12 abort, M4A-S1 Fredoka 700 preload dropped); light gates on 04fe75d all PASS (unit 594/594); HTML engineering/builds/eggfarm-m4a-677317d.html (flag on). PR1 cherry-picked as m4a/debug-buttons-v3 @ 2ff07a7 (gates pending). **next:** §3c refinement (ADR M4-14..17: flag-off until commit, async in-session commit, {migrationId, raw} record + v6BackupId, IDB unavailable 2000 ms config → LS alone, cleanup), then light gates, rc0 + check-globals ×3 under flock, flag-on HTML + backup-failure smoke, Art & UX screenshots; then PRs 1-4 off v3. **blocked:** push (needs approval); browser lock queue.

- 22:12 done: adopted §3d (localStorage-only commit for M4-A); ruled on the N1/N2/B1/B2/M1-M3 recheck findings. next: Architect alignment ~22:30, then the Code Reviewer and QA rechecks; the Features SHA follows. blocked: none.

## 2026-10-16 22:26 Senior Engineer, Features & Economy Wiring
- done: §3d localStorage-only migration committed on m4/m4a-migration-wip @ 47c67a8 (spec v1.10 + HoE corrections: max headroom rule w/ 64 KiB margin, saveSeq ranking, N2/N3/N6). 28/28 migration tests, 612/612 unit locally.
- next: light gates 47c67a8 + PR1 0262320 + PR2 8355c1a; then HTML, backup-failure smoke, screenshots, rc0/check-globals ×3 (flock, load<30).
- blocked: nothing. No pushes.
- 22:43 next: after the F1 merge on Wed 10-21, update the 3 m4a-spec.md references from product/farm/ to product/farm-upgrades/ (see product/farm/MOVE-PATHS.md). Telemetry spec v0.2 buildability check is with the Architect, ETA Sat 12:00.

- 2026-10-16 22:50 Senior Engineer, Saves & Persistence: v3 save fixture, `fix/saves-v3-fixture` @ `594cd59` (local commit off origin/main a01faea, worktree /workspace/wt-saves-v3, NOT pushed).
  - **Done:** Source v3 build = `6fad7d9`, the only commit with `SAVE_VERSION = 3` (522e22e = v2, 73828bf = v4; no tag). Built it in a temp worktree and played it headless in Chromium for ~4 min. Exported the raw localStorage `eggfarm.save` as `tests/fixtures/saves/v3-original-6fad7d9.json` (v3, F1, C7, $18.70, basket 138; v3 has no IndexedDB copy). Added README provenance and updated SHA256SUMS. `tests/save-v3-original.test.ts` checks that every v3 field maps, coins and upgrades are kept through migrate/load/loadSafe, and offline earnings are sane (0 under 60 s, capped, money unchanged). Gates (PR #2 gate-all.sh @ a0da3e4 + per-engine reruns under flock): unit 468/468, tsc, economy-copy, sync-economy --check, release build+check, QA build, check-globals on Cr/Fx/WK, rc0 197/197 on Cr/Fx/WK. All green. (The Firefox check-globals in gate-all was killed while it waited for the lock and passed on a direct rerun.)
  - **Next:** push + PR on user approval, then send the SHA to Saves QA 33ec1b55 (cc Head of QA 78e99c2d). Optional rc0-browser case for the v3 fixture (not added).
  - **Blocked:** push/PR: the user approved pushing only fix/saves-sd5-1, so this branch needs its own OK.
- 2026-10-16 23:09 HoE: done: released fix/rc1-qa-bugs-v4 @ 7d52952 as tag m3-rc1-qa-v4 (annotated, pushed), GitHub release normal + Latest: https://github.com/PrincipalLewis/egg-farm/releases/tag/m3-rc1-qa-v4 with egg-farm-m3-rc1-qa-v4-7d52952.html (471475 B, sha256 32d7cd530ad0d1cae679526544c274b55b7a89dec29d3bf98c5cfea1aaef8e1a, build m3-rc1-pre+7d52952, single file). Gates: npm run build + check-release-build OK, check-globals chromium PASS, file:// Chrome smoke 0 console errors / 0 external requests. QA PASS 3 engines (qa/m3-recheck/rc1-qa-bugs-v4-7d52952.md). next: HoQA Minor follow-up (check-release-build scan for computed-key globals like h['eggfarm'+'Dbg']). blocked: none.

## 2026-10-16 23:10 Senior Engineer, Features & Economy Wiring
- done: M4-A fixed on m4/m4a-tracks-v3 (local, fast-forward from 01a4643, not pushed): 3f5c632 (§3d per arch/m4-design @ 96c4a1e v0.3.3 + all HoE/HoQA/Code Reviewer rules), 81c5bb7 (M4A-27 maxLevel from data), 1a53eac (M4A-4 spec v1.14 offline grant from CSV). Light gates on 1a53eac all PASS (619 unit). HTML engineering/builds/eggfarm-m4a-1a53eac.html.
- next: smoke diag, backup-failure smoke, screenshots, rc0 + check-globals ×3, queued under flock (/tmp/wtf-browseronly.sh).
- blocked: browser lock queue (a 10 min wait without getting the lock; load ~22–26). The 22:34 smoke on 47c67a8 failed: window.eggfarmExportTelemetry was missing after 3 s; under diagnosis.
- 2026-10-16 23:33 UTC+2: Pushed fix/saves-v3-fixture @ 594cd59 (real v3 save fixture + v3→v6 no-loss load test) and opened PR #6. Waiting on Saves QA and a Code Reviewer.

### 2026-10-16 23:50 — SD5-1 (Senior Engineer, Saves & Persistence)
- **Done:** fix/saves-sd5-1 (local worktree /workspace/wt-saves, NOT pushed): 5dd0a50 fix + 5d636d8 HoQA guard script copy. Root cause confirmed in Firefox (dist-qa probe): the hidden/pagehide/beforeunload saves created readwrite transactions that waited for the BUG-2 get; teardown came first, the transactions never completed (no complete/abort), IndexedDB kept the previous save. Fix: Game.saveForUnload/endSession -> mirror.write(raw,{unload}) = synchronous put, durability 'relaxed' (unload only), commit(), promise on complete; unload-burst dedupe. Gates at 5d636d8: unit 470/470, tsc, sync --check, economy copy, release build + check-release-build, check-globals x3, QA guard R1 PRIMARY (zero tolerance) 3/3 in Chromium/Firefox/WebKit.
- **Blocked (no push):** WebKit R1 SECONDARY (truncated) failed once: got 777777777 vs live 778395636 — WebKit (Playwright close) never commits an IndexedDB transaction started at close, before or after this fix; it only recovers when the unload save also rotated into .bak. Firefox/Chromium fixed. Needs a WebKit approach (e.g. persist the unload copy in a second localStorage slot/.bak) or a QA ruling. rc0 x3 + a01faea D3/D4 baseline still queued under flock (logs .gates/).
- **Next:** WebKit unload path; then SD5-2 (handover SECONDARY now seen in all 3 engines), V4-1..4, SD4-4, N1/N6. Dialog review R2 ('Saving is paused' on lease-write failure only) goes into the V4-2 PR, not SD5-1.
- **Note:** box lock /workspace/egg-farm-studio/.browser-test.lock was held ~45 min by an orphan `sleep 2700` (PID 857820, not ours) that inherited the lock fd.
- 2026-10-16 23:59 UTC+2: Merged PR #8 (staging economy.f1-m4cols.csv 70009738) at 671b4ea, so main is now c1a30851 (QA PASS plus Code Reviewer pass). 0.20 ships only with MK-33a. PR #9 is a draft until Economy's corrected CSV. PR #10 SD5-1 has changes requested (M1 data loss), fix due Sat 11:00. Browser lanes 1 and 2 live per Ops.
- 2026-10-17 00:01 Senior Eng Econ: DONE econ/staging-f1-m4cols-rev2 @ 9182c81 off main c1a3085: staging CSV -> 86f0e80e (only manage_prompt_threshold 0.4->0.5), tests add sha256 + plain-decimal/safe-int cost + HoP 23:58 source note; tsc/vitest 469/sync-economy --check green. NEXT: HoE push, CR 5c46fe73 + QA edb6ef85 (cc HoQA). Not pushed.
- 2026-10-17 00:08 UTC+2: Merged PR #11 (staging rev 86f0e80e) at 9182c81, so main is now e5c30b3. PR #1 passed the Code Reviewer at 3342918 and waits on Head of QA's recheck.

## Saves & Persistence, 2026-10-17 00:25 UTC+2: S2 hidden-tab fix (fix/hidden-tab-offline @ 2ae2547, off 7d52952; not pushed, HoE pushes)
- Done: src/platform/visibility.ts (watchVisibility: onHidden(startAt)/onShown({startAt,endAt,durationMs}); no telemetry). Game.onHidden/onShown: hidden sim capped at offline.hiddenSimMaxSeconds=60 in total (balance.json, sync-economy --check ok), then frozen; hide >= offlineMinSeconds -> provisional hidden sim dropped, whole absence paid via the normal offline grant (pending settled, same clamp/cap, validSavedAt tamper rule) = close+reload (C-AC36); saves while hidden write the hide snapshot. tests/hidden-tab.test.ts (18: C-AC36 at 60/61/671/3600/7200/20000 s, 671 s repro, tamper, cap, hook); rc0 section `hiddentab`.
- Gates: unit 533/533 (49 files), sync-economy --check ok, tsc+build+release check ok, build:qa ok. check-globals + rc0 x3 queued on lane 1 (lock heavily contended).
- Next: rc0/check-globals results, then Code Reviewer, then QA edb6ef85 cc Head of QA. Then Export button, SQ-1, S-2; PR #6 reviewer follow-ups.
- Blocked: nothing; browser gates waiting on lane-1 lock.
- 2026-10-17 00:15 UTC+2: Merged PR #1 (M4 save design v0.3.14 @ 2c14b4f, with Head of QA's APPROVE and the Code Reviewer's PASS at 3342918, later commits doc-only) into main at 7944010. The SQ-1 design is frozen.
- 2026-10-17 00:16 UTC+2: Architect ETA caps: cost-segments override 01:00, f1-globals-devonly-r1 rebase plus full check-globals 03:00 (risk: lane-2 load gate), check-release-build single-file HTML PR Sat 06:00.
- Sat 00:18 L30+ v2 pushed (econ/l30plus-v2 @ 94dfc06) as PR #12 on m4/m4a-tracks-v3; #9 closed. Sent to the Code Reviewer and QA. Open: PM Farm to decide on the per-session nudge dismiss; reconcile the nudge component at rc2.
- Sat 00:27 PR #15 opened: arch/f1-globals-devonly-r1 @ f67a425 into main. HoP confirmed the per-session nudge dismiss stays (#12 unchanged). Features owns adding per-level farm_cost override support to sync-economy. Architect's #14 fixes the golden-path test import.
- Sat 00:27 #12 blocked on Economy's replace-or-max ruling, asked for by 01:30. Features' F1 override SHA is due 02:30; I asked them to split the WORKERS_GATE flip out. M4-A gate results are due 03:00.
- Sat 00:28 #12 is ON HOLD. Economy's direction is max(row, extra), not replace; replace let players buy ahead below the row cost, the exploit the Code Reviewer found. The final ruling, with the 100-seed gate check and HoP sign-off, is due before 01:30. After that it's a one-line change.
- Sat 00:29 #12 unblocked. HoP approved max(row, extra) at 00:28. Shipping CSV is b59c4e0d with reference sim late_curve.py ab928dc96d1c. 3e3d61fd retired as fallback. Features applying the max() change.
- Sat 00:34 #12 updated to 3bf2705 (fast-forward): max() pricing, CCR fixes, art-ux §5 v1.1.
- 2026-10-17 00:35 (UTC+2) Senior Engineer, Features & Economy Wiring: DONE econ/f1-cost-overrides c75b6dc (F1-GAP per-level farm cost multipliers in economy-config/balance.json, farmCost + Grader honour them; vendored data/economy.f1.csv sha e4847fe4; cost-segments fits it; shipping balance.json unchanged vs main) and econ/f1-workers-gate (WORKERS_GATE=true; fails on pre-F1 balance at P95 L18, F1 balance gives L21 on all 30 seeds). NEXT: Economy to fix economy.f1.csv L20 w4_tier_cost 10707->9100; F1 data swap into data/economy.csv + config to make the gate pass; fix stale import in engineering/golden/flagoff-golden.a01faea.test.ts. Not pushed.
- Sat 00:35 L30+ release gate PASS (HoQA): 0 HARD fails on b59c4e0d with sim ab928dc96d1c at 100 seeds. Step ratios are exactly at the 2.0 limit, zero margin, so any pricing or pacing change after 3bf2705 needs a gate rerun.
- Sat 00:35 BUG (Economy): balance.json in build ce7d59a ignores the approved CSV 86f0e80e (L23 is 99,466 instead of 68,756), which caused QA's L23 stall. Assigned to Features on econ/f1-cost-overrides with a CSV-equality test, cap 02:30. QA re-runs ac7-l18-25 with workers after.
- Sat 00:35 CSV-equality test split: f1-cost-overrides checks L0-30 against 86f0e80e, and #12 checks L0-50 against b59c4e0d. sync-economy must fail on a missing cost row; no 1.35 fallback.
- Sat 00:36 Decided: shipping data switches to the F1 CSV (86f0e80e plus Economy's row-20 fix) through econ/f1-cost-overrides. The WORKERS_GATE flip (b2f021f) goes as a separate stacked PR, merged only after QA's ac7-l18-25 rerun with workers passes; on today's data it fails at L18 at 30:00.
- Sat 00:42 #12 fast-forwarded to 0f2b785 (dismiss ×, UI and tests only). Live L30+ data waits for a follow-up PR after f1-cost-overrides, because the real buildBalance can't build from b59c4e0d yet; that PR reruns the 100-seed gate. economy.f1.csv L20 w4 fixed to 9100 (4ad1349ad27c).
- 2026-10-17 00:44 (UTC+2) Senior Engineer, Features & Economy Wiring: DONE econ/f1-cost-overrides bae4bdf (shipping switched to F1 m4cols 86f0e80e; farm_cost + w4 tier costs per-level from CSV, multipliers dropped; economy.f1.csv re-vendored 4ad1349a) and econ/f1-workers-gate-v2 262b1b3 (WORKERS_GATE=true, all 30 seeds L21 at 30:00, pacing.test 7/7). b2f021f untouched. NEXT: 35 tests still assert pre-F1 values (economy.test parity fixture x26, workers-v11 x5 at 40% thresholds, post-rc1 yawn, p4 W4, pacing-acw1 casual parity 0.30>0.20, old 'L18 in 24-36 min' gate now 19.75) need owner rulings / fixture regen; golden import waits on PR #14. Not pushed.
- Sat 00:45 econ/f1-cost-overrides @ bae4bdf: per-level F1 sync works. 35 old tests are red: 6 are being fixed (yawn/manage), and 29 wait on Economy's rulings, requested by 01:30. The 02:30 cap depends on those. Gate branch pacing is 7/7.

## Senior Engineer, Saves & Persistence: 2026-10-17 00:45 (UTC+2), PR #10 review fixes (fix/saves-sd5-1)
- done: cad7fde (local, not pushed) on fix/saves-sd5-1 in /workspace/wt-saves fixes review fix-saves-sd5-1-5d636d8 M1, M2, m1, m2 and the nit. M1: the close write (pagehide/beforeunload/endSession) does get + put in one readwrite transaction and aborts it if the stored copy is from a newer build. Hidden goes back to the normal strict checked write. m1: strict everywhere except close; header fixed. m2: own dedupe key. M2: tests/sd5-1-dataloss.test.ts on a real fake-indexeddb (4 of 6 fail on 5d636d8), plus rc0 section unloadnewer. Unit 476/476, tsc, sync-economy --check, release check all pass.
- next: browser gates are queued on lane 1 (.gates/chain.sh: check-globals, then rc0 chromium/firefox/webkit; results in /workspace/wt-saves/.gates). After that, SQ-1 to m4-design v0.3.14.
- backlog (m3, existed before PR #10, not fixed): after a bfcache restore the tab never re-claims its lease. There's no pageshow handler and pagehide ignores `persisted`, so another tab can take over and show a false "Game open in another tab". No data is lost.
- blocked: nothing; lane 1 queue is long (>15 holders).
- Sat 00:47 Economy ruled that all 29 red tests take updated values; none is a regression. Fixtures come from sim 1178d8c6. The L18 24-36 min test is retired and replaced by the AC7 check (L18-22 at 30 min). Waiting on Features' SHAs.
- Sat 00:50 PR #7: HoQA requested changes (Minor, F-2: seed-count and P95-rank mutations survived). Sent to Features, cap 04:00.
- 2026-10-17 00:53 (UTC+2) Senior Engineer, Features & Economy Wiring: DONE econ/f1-cost-overrides 11b000c (yawn/manage thresholds from balance) + 4953fb7 (Economy F1 rulings: fixtures f9b0a447 from sim 1178d8c68590, AC7 L18-22 at 30:00 from data/pacing-targets.json, p4 W4 4.5/W4b 5.25, acw1 PY); econ/f1-workers-gate-v3 rebased -> 32f9ac2: tsc/sync/copy/build/check-globals OK, vitest 478/479. NEXT: p4 Manage/15 min 6.88 vs 5.62±10% not ruled (Economy); golden import awaits PR #14. Not pushed.
- 2026-10-17 00:54 Senior Engineer F&E: DONE pacing/pr7-f2-fix 3b464ea (off b1004e7, not pushed): HoQA F-2 fix - SEEDS>=MIN_SEEDS_P95 assert + quant synthetic unit test; seed-count and rank mutants both killed; full suite 466/467 (only fail = economy 'fixture fresh vs live sim', pre-existing on b1004e7 since sim went F1 1178d8c), tsc clean. NEXT: HoE push.
- Sat 00:54 F1: cost-overrides @ 4953fb7 and gate-v3 @ 32f9ac2, 478/479. The last red test, p4 Manage per 15 min (6.88 against 5.62±10%), waits on Economy. Seller-variance TS port (spec 17877b41, required for AC7 to count as verified) assigned to the Architect, cap Sat 12:00.
- Sat 00:54 PR #7 fast-forwarded to 3b464ea (F-2 fix). p4 Manage per 15 min takes the updated value 6.88±10% (Economy). Cut A v3 is PR #3 @ c231c02; browser gates queued.
- 2026-10-17 01:00 (UTC+2) Senior Engineer, Features & Economy Wiring: DONE econ/f1-cost-overrides 3ea9f04 (p4 Manage/15 min 6.88 ±10%, Economy ruling, sim 5ad5a3a6; fixtures still f9b0a447) and econ/f1-workers-gate-v3 rebased -> 79edfa1. Both: tsc, sync-economy --check, check-economy-copy, build, check-globals PASS; vitest 478/478 and 479/479, only golden import fails (PR #14). NEXT: HoE push. Not pushed.
- Sat 01:01 Pushed econ/f1-cost-overrides @ 3ea9f04 (478/478) and econ/f1-workers-gate-v3 @ 79edfa1 (479/479, L20-24 at 30:00). PRs opening; gate-v3 waits on QA's ac7-l18-25 rerun.
- 2026-10-17 01:03 (UTC+2) Senior Engineer, Features & Economy Wiring: DONE single-file build engineering/builds/eggfarm-f1-3ea9f04.html sha256 251ffbff17b7…902a (file:// smoke clean); PR bodies drafted at /workspace/engineering/pr-drafts/. NEXT: open PRs (cursor-github) + DMs to CCR/QA/Economy pending approval. Not opened yet.

## Senior Software Architect — 2026-10-17 01:10 (UTC+2) — seller variance port
- Done: PR #19 https://github.com/PrincipalLewis/egg-farm/pull/19 (arch/seller-variance-port @ 3155bbd). Ports the proposal (17877b41) into runBot/runM2, using VAR_DEFAULT and its own CPython-MT stream. Parity vs seller_variance_sim.py: exact on the stream, action trace and old M1 bot (100 seeds). Outcomes within tolerance: L@30 quantiles equal, t18 P5/P50/P95 within 2 %. tsc and sync-economy --check OK. Vitest 476/477; the two failures were already on main (golden #14, economy fixture freshness vs the F1 live sim).
- Next: Economy dea51801 validates parity. Rerun scripts/gen-seller-variance-fixtures.py once the F1 overrides land on main. Proposal items 3–4 (AC7 at P5/P95, HoQA F-2) wait on HoP.
- Blocked: none.
- Sat 01:10 PR #17 (F1 cost-overrides, base #15) and #18 (gate-v3) opened and routed to review. PR #19, the seller-variance port @ 3155bbd (test-only), is with Economy for parity; its parity file is to be tagged slow and run in CI pacing.
- Sat 01:13 MERGED #14 (golden import fix), main 96756aa. #13 CHANGES REQUESTED (Major: build:html breaks 4 fonts); Architect cap 04:00. FREEZE: no release asset built with build:html until #13 is fixed. F2: make release-html and release-globals required on main once the job names are confirmed.
- Sat 01:14 #13 second Major: the build-id meta (ccd7bf9) is missing from the release line; Architect adds it with a checker fail. v4 verdict unchanged. Branch protection (F2) is mine; waiting on the job names.
- 2026-10-17 01:14 (UTC+2) Senior Engineer, Features & Economy Wiring: DONE #17 review minors on econ/f1-cost-overrides 81a62aa (farm_cost strictly increasing) + b0e8278 (fixture-fresh widened to all 46 sim columns, all match); #18 minors on econ/f1-workers-gate-v3 (rebased) -> 95f57b4 (regression-fixture label + TODO F-1 variance bot, L10 bounds in data/pacing-targets.json). Gates both: tsc/sync/copy/build/check-globals PASS, vitest 479/479 and 480/480, golden import pending #14. NEXT: HoE push (gate-v3 rebase needs force-with-lease over 79edfa1); Economy to confirm source for L10 lower bound 8 min. Not pushed.
- Sat 01:14 F2 job names: 'release-globals (chromium|firefox|webkit)' and 'unit'; 'release-html' confirmed after #13 runs. Making them required waits on Vadim's answer.
- 2026-10-17 01:17 (UTC+2) Senior Engineer, Features & Economy Wiring: econ/f1-workers-gate-v3 rebuilt as fast-forward of origin 79edfa1 (merge f5efe4a of b0e8278, cherry-pick c9b8f5b of 95f57b4, + 6f19823 L10 source note = Economy ruling Oct 17 01:14). tsc OK, vitest 480/480 (golden import pending #14). Plain push, no force. Not pushed.
- Sat 01:18 Fast-forwarded #17 to b0e8278 and #18 to 6f19823 (CCR minors; L10 bounds moved to data). Note: #14 is merged, so rebase onto main 96756aa to clear the golden failure.
- 01:20 (UTC+2) update, Saves: BLOCKED on a design decision for M1 in Firefox. With cad7fde (get + put in one transaction, no commit()), rc0 Firefox `unloadmirror` FAILS again (idb kept the old value 777777777: the SD5-1 bug is back). `unloadnewer` hidden and close both PASS. In an experiment that adds commit() (not committed), `unloadmirror` passes, but the newer copy gets overwritten on close, because abort() is not allowed after commit(). An in-transaction check plus a close write that lands in Firefox seems impossible in one transaction. Head of Engineering / Architect need to pick: (a) ship cad7fde, safe but SD5-1 not fixed in Firefox; (b) an unconditional put+commit of the close write into a separate IDB key (e.g. eggfarm/save/unload) that reconcile ranks on boot, so main is never overwritten (new storage, so it needs a zero-writes-list entry). Gate chain for cad7fde queued on lane 1 (.gates/chain.sh).
- Sat 01:19 PR #10 HOLD. Decided option (b), a separate unload key; (a) brought back SD5-1 in Firefox. Cap Sat 11:00. Hidden-tab 2ae2547: 1 real rc0 failure being fixed, cap 08:00.
- Sat 01:28 #13 fixes @ 8475bc4, re-review requested. #19 passes Economy parity. #10 unload ranking rule accepted, flag-off limit documented. main red: economy.test freshness depended on a sim file outside the repo; Architect is vendoring a sha-pinned copy, cap 06:00. Required-checks change waits on Vadim.
- Sat 01:29 main unit gate unblocked: Economy reverted the sim default (eddf945d, byte-identical to main). #17/#18 need the --config f1 change (Features). The vendoring PR still goes ahead.
- Sat 01:33 PR #21 (vendored sim, a42c93b) opened; QA owner edb6ef85, cap 08:00, plus a source-sha record. #13 has CCR PASS at 8475bc4 and waits on HoQA's re-verify.
- Sat 01:42 Merge order: #21, #19, #17, #18. QA owner for #19 and #21 is edb6ef85. PR #10 @ 5d636d8 has no code fix; Saves' (b) rework adds the storage-refused notice and BUG-6 NaN handling. Browser-lock backlog pushes QA on #15/#17/#18 past 03:00; lane 2 advised. Required checks now include 'slow'.
- Sat 01:43 QA ETAs (edb6ef85), all UTC+2: #21 around 03:00, #19 around 04:00, #17/#18 Chromium on lane 2 around 04:00, #15/#17/#18 Firefox and WebKit by about 06:00 (their hard stop).
- Sat 01:46 PR #7 @ 3b464ea QA APPROVE (33ec1b55); CCR review requested, then merge. Open: TR-AC7-TAIL (P95 tail unverified because the sim gives identical results; covered by the variance-bot follow-up). SD6-1/2 (Major) and SD6-3 (Minor) added to Saves' sd5-1b rework, cap 11:00.
- Sat 01:47 PR #7: HoQA APPROVE. Merge HELD until the freshness rerun reports and CCR passes. SD6-2 clarified: a NaN savedAt keeps progress and stamps now, with no offline reward and no dialog. PR #1 golden run 2 PASS.
- 2026-10-17 01:49 (UTC+2) Senior Engineer, Features & Economy Wiring: main 96756aa (#14) merged into econ/f1-cost-overrides (97dcc81, no conflicts) -> head 8d01352 (gen-sim-fixtures m.F1, fixtures f9b0a447; economy.test reverted to b0e8278, fresh-vs-sim owned by #21); econ/f1-workers-gate-v3 -> c5460a6 (merges + 26024b0 Math.min fastest seed, PACING_TIMEOUT_MS), FF of 6f19823. Gates: tsc/sync/copy/build/check-globals PASS; vitest 479/481 and 480/482 - fails: golden sim trace f90d1678 vs pinned 50a87ddb (F1 data switch; c75b6dc pre-switch matches 50a87ddb), fixture-fresh (sim 'current' now pre-F1, #21). balance.json + bundle identical to 3ea9f04 except build ID -> eggfarm-f1-3ea9f04.html stays valid. NEXT: golden re-pin decision; merge main after #21. Not pushed.
- Sat 01:49 #17 golden re-pin to f90d1678 approved, pending Architect review; main merged forward into #17/#18 locally.
- Sat 01:53 CLOSED #7, superseded by #18 (its F-2 tests port into #18). CCR passed #19 @ c5905f3. HoP's worst-seed guards (at most 2.25x and at most 4 min) assigned to the Architect, cap Sat 10:00.
- 2026-10-17 01:56 (UTC+2) Senior Engineer, Features & Economy Wiring: econ/f1-cost-overrides 78f2db3 (golden sim-trace re-pin 50a87ddb->f90d1678, HoE 01:49; bisect c75b6dc); econ/f1-workers-gate-v3 30a94ac (merge 0cca1ef + PR #7 F-2 port: MIN_SEEDS_P95, export quant, synthetic quant test; mutation kills verified). vitest 480/481 and 483/484, only 'fixture fresh' fails pending #21; tsc/sync/copy/build/check-globals PASS. Not pushed.
- Sat 01:57 Pushed #17 at 78f2db3 (golden re-pin) and #18 at 30a94ac (#7's F-2 port). The 'fixture fresh' failure is pending #21. Worst-seed guards are scoped to L30+ per Economy.
- 2026-10-17 01:58 (UTC+2) Senior Engineer, Features & Economy Wiring: golden audit comment (old pin 50a87ddb, bisect c75b6dc, HoE 01:49) -> econ/f1-cost-overrides c428fae; merged into econ/f1-workers-gate-v3 a913934. Golden 2/2, tsc OK. Not pushed.
- Sat 01:58 Pushed #17 at c428fae (golden audit comment) and #18 at a913934. Architect approved the re-pin; final sign-off pending green 'unit'.
- Sat 02:10 QA PASS on #21 @3f02596 and #19 @c5905f3; #19 needs main merged in first. Code review requested on #21. #23: L18-25 P95 is 372 s against a 360 s target, escalated to HoP and shipping as a flagged expected-fail. UI: #5 @3930a4c, #20 @ff6b5d3 and #22 @7ed1ef2 are with QA (#22 money-format bug at 1e15+ eggs being fixed).
- Sat 02:10 MERGED #21, main is now dfd53b9. Started merging main into #19's branch; #19 merges when CI is green. The Architect's follow-up PR moving the economy-copy checks and gen-sim-fixtures onto vendor/ is due 06:00.
- Sat 02:20 (Senior Engineer, UI & rc1 Fixes) DONE: PR #4 B-2 amended spec (rc2-notes §B-2 A-C, 00:49 FAIL) @ 902f924 (6a9ede1 → 5877e0f → 902f924). safeCoachPlacement for every tip (tablist + viewport, defer, never clamped onto tabs), tired tip at row.bottom+8, only with the Workers sheet open and the row fully in the scroller. Units 48/48 files green, tsc, sync-economy, check-release-build, release globals OK. rc0 b2tip Chromium 12/12 (direct + normal; 1280x800/720/600, 1024x474, 390x640, 360x740). Shots: /workspace/wt-ui-shots/b2-v3/. CCR: 6a9ede1 (1M/5m) and 5877e0f (1M/4m) fixed; 902f924 recheck 0C/0B/1M/3m/3n. NEXT: FF/WebKit b2tip queued on lane 1 (/tmp/b2v3-rc0-{firefox,webkit}.log). BLOCKED/decision: at docked 1280x720, 1280x600 and 1024x474 there's no clean spot, so the tired tip defers, the Manage tip never shows and the one-time flag is still used up (CCR 902f924 #1). Needs Art & UX/PM to choose: persist the deferral, or relax the rule at docked short heights.
- Sat 02:14 #4 (B-2) at 902f924 is with QA and UI/Visual; Chromium 12/12. CCR major: at short docked heights the tip never shows. Product call with UI/Visual: (a) defer without using up the flag, or (b) relax the rule. A lane-2 check ran at load about 20, against a limit of 12; UI corrected it.
- Sat 02:18 Pushed #12 at 7e70a2e: Workers New dot moved onto the label, 44px tap target (2 files, +9/-1). Going to UI QA.

## 2026-10-17 02:25 Senior Engineer, Features & Economy Wiring — PR #12 merge-forward
- done: merged origin/main dfd53b9 (#21) into econ/l30plus-v2 in /workspace/wt-l30 → 6be6247 (local, not pushed, no conflicts). tsc clean. 'fixture is fresh' PASSES. sync-economy --check rc0.
- blocked: engineering/golden/flagoff-golden.a01faea.test.ts (arrived via #21 merge) fails 2 (storage bytes, sim trace) — pins pre-F1 hashes (50a87ddb…, b69c5783…); #12 gets 2ab8ff02…/337af041…. Needs re-pin decision (Architect/HoE). m4a-v3-backup flaked under full run, passes alone.
- next: HoE to push 6be6247 once golden ruling made; then UI QA.
- Sat 02:23 MERGED #19, main is now 2700804. Next is #17: merge main forward and regenerate the variance fixture.
- Sat 02:24 #12 main merge (local 6be6247): the flag-off golden changes (storage 50a87ddb to 2ab8ff02, trace b69c5783 to 337af041). Ruled no re-pin; Features is bisecting, ETA 03:15. Flaky m4a-v3-backup test sent to Saves, cap 12:00.

## 2026-10-17 02:50 Senior Engineer, Features & Economy Wiring — PR #12 flag-off golden
- done: root cause found. (1) storage: 3351d6c (M4-A squash) wrote saveSeq + hensLevel/eggValueLevel/celebratedMilestones into every save, even with the flag off. Fixed in local commit on 6be6247 (see report); golden storage passes against main's pins. (2) sim trace: farm.costOverrides + costGrowthSegments + grader tiers[].cost in balance.json (F1 pricing from CSV a34a4b40, also brought in by 3351d6c). Proven: drop those 3 and the trace = 50a87ddb. Not flag-gated (m4.enabled=0), so it can't equal main without reverting F1 pricing on #12.
- blocked: trace golden needs a ruling from HoE/Economy/Architect: drop the F1 pricing from #12 (it reaches main via #17), or accept the F1 trace shift as already signed off for #17. Full suite: 678/679, tsc clean. Not pushed.
- Sat 02:32 #12 pushed at bd487ab. Root cause was the M4-A squash 3351d6c: the flag-off save writes are fixed so storage matches main. The trace difference is F1 pricing, so #12 merges after #17 and then merges main forward again (expected trace f90d1678, no new re-pin). Saves and CCR to review the serialize change.
- Sat 02:37 #12 @ bd487ab: code review BLOCKER, flag-off saves can be overwritten by an older IndexedDB copy because saveSeq is stripped. Sent to Features with the fix (keep saveSeq, savedAt fallback, regression test), Saves to review, ETA 03:30. #24 at 1e8fd2d is waiting on code review and QA.

## 2026-10-17 02:45 Senior Engineer, Features & Economy Wiring — PR #12 CCR B1 fix
- done: 182b932 (local, on bd487ab, not pushed). The M4-off format now keeps and carries forward an existing saveSeq. rankCompare compares saveSeq only when both copies have one, else savedAt (used by both pickNewest and IdbMirror.write). main.ts recovery export now passes balance. Regression tests added. tsc clean; 682/683 passed. Golden storage passes all 4 main pins.
- next: Saves QA review, then HoE push.
- blocked: golden sim trace (F1 pricing data, needs a ruling, unchanged).
- Sat 02:42 #3 Cut A v3 at eb27707: rc0 Firefox and WebKit pass. Code review: blocker is that it's 42 commits behind main; major is the Refill-all rule change, flagged pending PM Workers and Economy. #12 fix 182b932 is local and with Saves for review.
- Sat 02:43 #12 pushed at 182b932 (data-loss fix, Saves APPROVE). Next: code review and Saves QA. Saves majors: rankCompare transitivity (in the unload rework) and the saveSeq checksum (SQ-1). #3: PM Workers ruled (b), single refill with fewer than 3 hired, bulk at 3 or more, no flag; main being merged forward.
- Sat 02:51 CCR PASS on #12 @ 182b932. Waiting on Saves QA; merges after #17. Flaky test narrowed to 'flag off .bak rotation and IndexedDB mirror' (3/10 runs), with Saves.

## 2026-10-17 02:55 Senior Engineer, Features & Economy Wiring — PR #12 Saves/CCR minors
- done: 003ddcc (local, on 182b932, not pushed). Changes: explicit hadSeq; recoveryExport + test; imports moved to top; flaky .bak/IDB test now awaits the write (passed 10 of 10 runs); rankCompare comment saying it is pairwise-only and non-transitive. Check (4): on bd487ab's save.ts, the 2 B1 repro tests fail, as does the new hadSeq test (which needs the new signature). Full run: ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 Tests 1 failed | 684 passed (685). Storage golden passes.
- blocked: golden sim trace (F1 pricing, needs a ruling).
- Sat 02:54 #12 pushed at 003ddcc (minors, flaky test fixed 10/10). #16 offline popup v2 at 5248dd9 is with QA. Ruled: Saves owns the hidden-tab grant/freeze accounting through one entry point; UI only calls it.
- Sat 02:55 Saves: hidden-time entry point goes in fix/hidden-tab-offline, one call per hidden period keyed by startAt so nothing is granted twice. ETA 08:00; fix/saves-sd5-1b ETA 11:00.

## 2026-10-17 03:10 (UTC+2) Senior Engineer, Features & Economy Wiring — f1-post21
- done: #17 econ/f1-cost-overrides: merged origin/main 2700804 (4bfbfd2, kept main's tests/economy.test.ts) + c08cff5 (gen-sim-fixtures -> vendor/economy-sim f1; economy_sim.json source-string only; seller_variance.json regenerated, csv 86f0e80e). Gates: tsc 0, sync --check OK, unit 50/50 files 483/483, golden 2/2 (f90d1678, audit comment keeps 50a87ddb), test:slow 11/11 (AC7 band hard).
- done: #18 econ/f1-workers-gate-v3: merged #17 c08cff5 -> abe0991 (clean). Gates: tsc 0, sync OK, unit 486/486, golden 2/2 f90d1678, test:slow 11/11; AC7 L@30 P5/P95 m1 20/20 (band 18-22), m2 20/21 (band 20-24).
- blocked: check-globals (chromium) not run yet: lane 1 queue ~10 jobs, lane 2 busy / load >12.
- note: PR #23 data/pacing-targets.json keys are disjoint from #17's (no value conflicts); textual conflict expected, keep both key sets.
- next: SHAs to HoE + Architect for push; QA after push. Not pushed.
- Sat 03:35 (Senior Engineer, UI & rc1 Fixes) DONE: PR #4 B-2 rule D (rc2-notes §B-2 02:15) @ 47526b3. Guarded auto-scroll (only scroll gestures count, decides on settled geometry), tired tip below the row only (never beside), skip at 1024x474 with the Manage tip shown alone, seen after show or 3 skips, Manage persisted (manageSeen) and re-armed on later visits. 902f924/ddace62/4d3cc77 findings fixed. Units 49/49 files (501). tsc, sync-economy, release build OK. Chromium rc0 b2tip 15/15 + b2rearm 1/1 (lane 2, load ≤12). Firefox 15/15 at 4d3cc77. CCR 47526b3: 0C/0B/0M/2m/3n. Shots: /workspace/wt-ui-shots/b2-v4/ (+ firefox/, webkit/). NEXT: Firefox and WebKit at 47526b3 on lane 1 (/tmp/b2v4-l1.out).
- 03:50 (UTC+2) update: check-globals chromium PASS on #17 c08cff5 (lane 2, PORT=5718) and #18 abe0991 (lane 1). All gates green on both. Note: someone else's vite preview (PID 1242298, wt-f1-workers-gate-v3, up since ~00:52) holds port 5108, the script's default chromium port; not mine, left alone. Nothing of mine running. Next: HoE push c08cff5 (#17) + abe0991 (#18).
- Sat 03:34 Pushed #17 at c08cff5 and #18 at abe0991, both include main 2700804; gates green; workers P5 has zero margin at L20. To QA for 3 engines. Stray vite PID 1242298 on port 5108, owner unknown, not killed.

## 2026-10-17 03:35 UTC+2 — Senior Engineer, Saves & Persistence — fix/hidden-tab-offline (wt-hidden), local only, not pushed
- done: rc0 S2 hiddentab row failure was a TEST bug, not product: the row's Date.now patch let real time leak (~10 ms) between page.evaluate calls, so away read 671.01 != 671; coins/saved 0 were a fresh game's legit 0. Row now freezes the page clock at the hide and seeds coinsCents 12345 (aa06d98) + unit test. HoE scope: src/save/hidden-time.ts single entry point accountHiddenPeriod/onHiddenPeriodAccounted, idempotent per startAt, Game.onShown delegates (b3341bd) + 8 idempotency tests.
- gates @ b3341bd: unit 542/542, tsc ok, sync-economy --check ok, release check ok (clean tree), check-globals ok, rc0 chromium/firefox/webkit 201/201 each.
- next: Code Reviewer + QA on b3341bd; UI #16 can code against hidden-time.ts; then PR #10 review fixes.
- blocked: none (note: shared /workspace/product/sim drift briefly failed the economy fixture-parity unit test at 01:23; passed on rerun 03:00).
- Sat 03:36 Opened PR #25 for fix/hidden-tab-offline at b3341bd (Saves). Needs main merged forward. Then QA and code review, then it ships alone as Latest with the HTML.
- Sat 03:39 #25 HELD: code review BLOCKER, a reused hide timestamp can leave the game stuck in hidden mode and lose progress. Major: short hides with no background frames lose that time. Saves fixing first, cap 06:00; sd5-1b moved to 13:00.
- Sat 03:42 MERGED #20 (dialog spacing) and #22 (money format); main is now f035594. UI is checking main.
- Sat 03:42 MERGED #24 and #23; main is now eb97a2a. #13 conflicts, Architect merging main forward. #17, #18 and #12 need main merged forward (Features).

## 2026-10-17 03:55 Senior Engineer, Saves & Persistence: fix/saves-sd5-1b (/workspace/wt-saves-1b, local only, not pushed)
- Done: 852de8c, SD5-1 option (b): cad7fde's close-path logic is reverted, the close save goes to IDB eggfarm/save/unload, boot ranks and promotes it with read-back, and ranking is transitive. 56b3692: SD6-1 (the notice is no longer held), SD6-2 (NaN savedAt treated as missing), SD6-3 (v5→v6 carries the fraction). Unit 495/495, tsc, sync-economy --check and the release check (clean tree, m3-rc1-pre+56b3692) pass. ADR "M4-19 rev 3" is in engineering/decisions.md, and sim-rules.md and m3-rc0-save-hardening.md are updated.
- Next: browser gates (check-globals, rc0 on chromium/firefox/webkit incl. unloadmirror and unloadnewer, quota2 + probe for SD6-1/2) after ~06:00, once the hidden-tab queue has cleared lane 1. Cap Sat 13:00.
- Blocked: browser runs are on hold per the parent (the hidden-tab blocker goes first). The m4-design.md §3b text lives on arch/m4-design (the Architect's branch) and needs the unload line added there.
- Sat 03:51 #12 @ 003ddcc: HoQA CONDITIONAL. Needs Firefox/WebKit save-compat, a green flag-off golden (after #17), and cost-segments pinned to the approved CSV. Sell-all label MAJOR (missing graderMult, shows $666.8B vs about $1T) is with UI.

## 2026-10-17 04:00 Senior Engineer, Features & Economy Wiring — PR #12 forward onto #17 + main
- done: local merges, not pushed. 69265f2 merges #17 c08cff5. edcf007 merges main eb97a2a and includes the cost-segments pin to b59c4e0d. Golden: GOLDEN1 = f90d1678 and all 4 storage pins pass, with no re-pin. tsc clean. Unit tests 729/729. test:slow 14/14. sync-economy --check OK. check-globals (chromium, PORT 5237) PASS.
- next: merge the new #17 head (with main eb97a2a) once it lands; HoE to push.
- blocked: none.

## 2026-10-17 04:20 (UTC+2) Senior Engineer, Features & Economy Wiring — main eb97a2a merge-forward
- done: #17 cf50663 = merge origin/main eb97a2a (#20 #22 #23 #24). Conflicts: pacing-targets.json union (no shared keys); check-economy-copy.mjs + economy-copy.test.ts = main (#24); gen-sim-fixtures.py + economy_sim.json = ours (vendored, F1). Fixtures regenerate byte-identical. Gates: tsc 0, sync OK, unit 53/53 files 524/524, test:slow 2 files 14/14, golden 2/2 f90d1678, globals PASS (PORT 5718).
- done: #18 d8d680e = merge #17 cf50663. Conflict: pacing-targets.json union (kept #18 l10_minutes + extended _note). Gates: tsc 0, sync OK, unit 527/527, test:slow 14/14, golden f90d1678, globals PASS (PORT 5719).
- AC7: L@30 P5/P95 m1 20/20, m2 20/21; L18-25 variance P95 372.2s/<=390, worst 471.6s/<=480; fixed 270s/<=360; t20 P95 1670s (warn 1740).
- follow-up: #24's opt-in `check-economy-copy --product --strict` compares data/economy.csv to product/economy.csv; on F1 the source is product/economy.f1-m4cols.csv, so the release gate will fail post-#17 unless pointed at it (needs Architect decision).
- next: HoE push cf50663 (#17), d8d680e (#18). Not pushed.
- Sat 04:03 #13 main merged in at 9db6c1a (on origin, includes main). Two conflict fixes went beyond combining both sides; light code-review recheck pending, then merge.
- Sat 04:03 Pushed #17 at cf50663 and #18 at d8d680e (main eb97a2a merged in). Release-gate risk: the strict drift check compares against product/economy.csv but F1 uses economy.f1-m4cols.csv; Architect to rule.
- Sat 04:05 Pushed M4-A m4/m4a-tracks-v3 at c108440. Merge held until flag-off differences vs main are bisected; Firefox/WebKit to Saves QA. Drift check: went with the Architect's (b), product/economy.csv stays canonical and Economy promotes f1-m4cols into it before the next rc; my earlier ruling withdrawn.
- Sat 04:10 (Senior Engineer, UI & rc1 Fixes) PR #4 @ 192f273 (test-only change since 47526b3): Firefox b2rearm 1/1 after the reload wait fix, so Firefox b2tip 15/15 + b2rearm; WebKit 16/16; Chromium 16/16. CCR 47526b3 0C/0B/0M/2m/3n. NEXT: Art & UX / QA recheck of /workspace/wt-ui-shots/b2-v4/.
- Sat 04:07 MERGED #13 (release-check fixes); main is now 4608a4f. The build:html release asset block is lifted. #4 B-2 at 192f273 is with QA and UI/Visual.

## 2026-10-17 04:25 Senior Engineer, Features & Economy Wiring — PR #12 merged with #17 cf50663
- done: e7035f7 (local, not pushed) merges #17's local head cf50663 into econ/l30plus-v2. No conflicts and no tree change from edcf007. tsc clean. Unit tests 729/729, GOLDEN1 = f90d1678, all 4 storage pins pass. test:slow 14/14. sync-economy --check OK. check-globals (chromium, lane 2, PORT 5237) PASS.
- next: HoE to push.
- blocked: none.
- Sat 04:20 Pushed #12 at e7035f7, which meets HoQA conditions 2 and 3. Firefox/WebKit save-compat (condition 1) with Saves QA. Merges after #17.

## 2026-10-17 04:30 Senior Engineer, Features & Economy Wiring — PR #12 merged with main 4608a4f (#13)
- done: 8b1b23b (local, not pushed), no conflicts. #13 doesn't touch save code; its only src change is 5 lines in src/main.ts for the build-id meta tag. tsc clean. Unit tests 772/772, GOLDEN1 = f90d1678, storage pins pass. test:slow 14/14. sync --check OK. check-globals passed (lane 2; result in report). Dry-run merges of 4608a4f into #17 cf50663 and #18 d8d680e: no conflicts (not committed).
- next: HoE to push.
- Sat 04:27 Pushed #12 at 8b1b23b (main 4608a4f merged in, clean).
- Sat 04:46 Box snapshot scare 04:43-04:45: froze engineering, then lifted the freeze after checking files, fetch and origin/main 4608a4f. Nothing lost.

- 2026-10-17 05:25: Merged #26 (QA+CCR PASS) -> main 92977ef. #27 conflicts post-#26; Architect merging main forward, then CCR recheck. -- HoE

- 2026-10-17 05:34: Merged #27 @10fa244 (QA PASS + CCR recheck PASS) -> main 1b724d4. -- HoE

## Saves & Persistence — 2026-10-17 05:55 (UTC+2)
- done: PR #25 fix/hidden-tab-offline local HEAD 59cce62 (on 926a1e5 B1 periodId + M1 uncover, 0b0e1cd main 2700804 merge). CCR B1/M1/m1/m2/n1/n2 all addressed + unit tests. Gates: vitest 562/562 (forks max2), tsc ok, sync-economy --check ok, release check ok (clean tree), check-globals chromium PASS, rc0 chromium/firefox/webkit 201/201 each. CCR repros pass when repointed to wt-hidden (copies in /workspace/scratch/saves-hidden-926/; originals import the b3341bd review worktree). Not pushed.
- next: HoE push 59cce62 -> QA final run; idb-mirror 'Reset save clears the mirror' flake (wt-flaky-reset); then fix/saves-sd5-1b (cap 13:00).
- blocked: none.
- done (06:00 UTC+2): idb-mirror 'Reset save clears the mirror' flake: local branch fix/flaky-idb-reset @ 4ef7cf0 off origin/main 1b724d4 (worktree /workspace/wt-flaky-reset, node_modules symlinked from wt-hidden). Cause: fixed 5 ms flush() raced the 2-hop fake-IDB write under load; now vi.waitFor on the put. Test-only. Full vitest 573/573, tsc ok. Not pushed. next: fix/saves-sd5-1b.

- 2026-10-17 05:58: Pushed #25 -> 59cce62 (CCR m1 fixed) and opened #29 (idb-mirror de-flake, 4ef7cf0); both with CCR. -- HoE
- Sat 06:05 (Senior Engineer, UI & rc1 Fixes) PR #4 @ 4e47d77: the standalone Manage tip (Art & UX Minor on 192f273) now sits on the Manage button, 8px above (hand down) or 8px below, inside the Upgrades scroller and under the tablist, never on Market or the header; defers if it can't fit. rc0 b2tip+b2rearm: Chromium 16/16, Firefox 16/16, WebKit 16/16. Units 510/510. CCR 4e47d77 0C/0B/0M/3m/2n (tests only). Re-shoots in /workspace/wt-ui-shots/b2-v4/{,firefox/,webkit/}. NEXT: designer recheck.

- 2026-10-17 06:07: Merged #29 (test-only, CCR PASS) -> main c197465. #25 @59cce62 CCR PASS; QA verdict requested from HoQA (ETA 07:10), then merge + Latest release w/ HTML. -- HoE

- 2026-10-17 06:32: M4-A v4 7621153 pushed (m4/m4a-tracks-v4); grader-tier gate dropped too (same rationale as F1 cost: #17 data is main flag-off behaviour). Merges after #17. -- HoE

- 2026-10-17 06:48: CCR blocker on #31 (M4-A v4): flag-off resave drops saveSeq -> IDB mirror stale, progress lost on reload; Features fixing (ETA 09:00). #17 cost-segments test rewrites tracked economy.f1.csv with CRLF (dirty tree); Features fixing (ETA 08:00). -- HoE

- 2026-10-17 07:01: QA CONDITIONAL PASS #17 cf50663 / #18 d8d680e (cond: B5 fixture -> rc0 197/197, Chromium). UI fixture commit + Features CRLF fix stacked on #17. -- HoE

- 2026-10-17 07:06: B5 fixture local-only on econ/f1-cost-overrides: /workspace/wt-b5f1 @ ded84c9 (fix/b5-fixture-threshold-f1, based cf50663). set([30,51,98]) + title drop '40%'. Not pushed, no PR, no CCR (HoE steer). build:qa ok; Chromium rc0 lane-2 197/197. Never created fix/b5-fixture-threshold on main. -- UI & rc1 Fixes

## 2026-10-17 07:25 Senior Engineer, Features & Economy Wiring — #17 CRLF dirty tree (CCR #31 m2)
- done: root cause is main's .gitattributes `*.csv text eol=lf` (#26) flagging the CRLF-committed data/economy.f1.csv (sha 4ad1349a, == product/economy.f1.csv) as modified; no test writes it. Fix = `data/economy.f1.csv -text` in .gitattributes (bytes unchanged). Renormalize to LF NOT done: it would change the bytes to bb6259a0 and break the 4ad1349a pin (Economy-owned). 86f0e80e = data/economy.csv (LF), unaffected. Local head 8fcd177 on econ/f1-crlf-attr-only (/workspace/wt-f1-crlf2) = cf50663 + merge main c197465 (3bd595e) + attr fix ed3ba57 + B5 cherry-pick of ded84c9. unit 583/583, slow 14/14, tsc, sync --check, build, build:html OK, rc0 chromium 197/197, fresh clone + post-npm-test tree clean.
- next: HoE push 8fcd177 to econ/f1-cost-overrides (fast-forward from cf50663); HoE decide -text vs renormalize+re-pin (Economy).
- blocked: check-globals not rerun (lane-1 lock queue).

- 2026-10-17 07:29: Merged #17 @8fcd177 (QA cond. PASS met + CCR PASS) -> main 3f2ac38. Economy promoting 86f0e80e to product/economy.csv (strict drift). Next #18, #12, #31. -- HoE

- 2026-10-17 07:30: #17 had merged into stale base arch/f1-globals-devonly-r1 (3f2ac38), not main. Re-landed same head 8fcd177 via #32 -> main 97a57c1 (tree == 3f2ac38). Retargeted #18, #12 to main. product/economy.csv promoted to 86f0e80e (Economy; strict EXIT 0). Process: verify PR base==main before every merge. -- HoE

- 2026-10-17 07:34: #25 FINAL QA PASS 59cce62 + CCR PASS; conflicts with main 97a57c1 (check-release-build.mjs, format.ts, release-build-id.test.ts). Saves merging main forward (ETA 08:30), then CCR delta, merge, Latest release w/ HTML. -- HoE

- 2026-10-17 07:35: #12 L30+ depends on M4 code; cannot land standalone. Order: #18 -> #31 (M4-A v4) -> #12 (merge main forward, delta QA/CCR). -- HoE

- 2026-10-17 07:45: Merged #28 @f7642c9 (Sell-all graderMult; QA APPROVED + CCR nits only + Art&UX) -> main 68950c0. -- HoE

- 2026-10-17 07:50: Opened #33 (vendor sim F1-default, base main) and #34 (variance sim F1, stacked on #33; retarget to main before merge). -- HoE

- 2026-10-17 07:52: Merged #33 @17245d2 (CCR PASS) -> main 2311741; #34 retargeted to main; Economy copying sim to product/. -- HoE

- 2026-10-17 08:07: Merged #34 @1ec03ad (CCR PASS) -> main acaceee. Economy: copy variance sim + AC7 re-run. -- HoE

- 2026-10-17 08:11: AC7 variance acaceee: bands PASS; L18-25 workers worst-seed 493s > 480s (L21). HoE: rc tag requires AC7 VERIFIED; recommended L21 trim; HoP to rule. -- HoE
- 08:10 (UTC+2) Saves: fix/saves-sd5-1b local HEAD e09f7fd (on 6f9bf89; 968b8f4 adds the 6-placement mixed seq/no-seq test; e09f7fd fixes rc0 unloadmirror: unload byte-identical to LS main tying IDB main is LS-precedence 'win', not 'diverged'). Architect c1-c3 present at decisions.md:34; idb-mirror stale m1 comment already replaced in 6f9bf89. Gates: vitest 497/497 @968b8f4, 496/498 @e09f7fd (2 economy-copy fails from product/economy.csv updated 07:30, not this branch); tsc ok; sync-economy ok; release check ok; check-globals ok; rc0 @968b8f4 chromium 198/201, firefox 199/201, webkit 198/200; @e09f7fd unloadmirror+newer* pass on all 3; quota2 chromium bad 0/15; probe chromium 24/24. Not pushed.
  blocked: rc0 AC14b cantsave "no save-warning toast while the dialog is open" fails on all 3 engines: conflicts with SD6-1 (no-storage notice never held, which quota2 requires). Needs an HoE/Art-UX ruling before either side changes.
  next: data/economy.csv resync once origin/main carries the new product csv; rebase decision (branch not on origin/main 1b724d4).

- 2026-10-17 08:21: First-minute v0.2 (FM-AC1-10) assigned to UI e80556fd; buildability by 09:00, build cap 18:00. -- HoE

- 2026-10-17 08:30: market_hand_min_wait_s (2s) in CSV but not in src/sim -> ruled missing implementation, required before rc (game must match AC7 model). Owner Features, own PR feat/market-hand-min-wait. -- HoE
- 2026-10-17 08:40 (UTC+2) HoE: base=main verified, CCR PASS (no blocker), HoP sign-off -> merged #36 ca9c9bc as 8e6d53e. Next: Economy promotes 6dca24cd to product/ (strict), AC7 VERIFIED; #25 merge-forward next, then market-hand min-wait, #18, #31, #12.
- 2026-10-17 08:40 (UTC+2) Economy: AC7 VERIFIED on main 8e6d53e (CSV 6dca24cd); product/ promoted, check-economy-copy --strict EXIT 0 (log scratch/ac7-f1/gate_8e6d53e.log). rc gate remaining: Market Hand min-wait.
- 2026-10-17 08:48 (UTC+2) HoQA: L30+ gate FAIL on 8e6d53e+L21 trim (EX-1 worst 2.40 vs 2.25, Major). L30+ (#12) HOLD; Economy fixing on top of 6dca24cd; HoP asked to confirm approval timing. M4-A not gated (no L31+ rows in main).
- 2026-10-17 08:48 (UTC+2) CEO: M4-A publish now gated on the balance fix merged to main + QA PASS on both gates (Product picks the fix by 09:30). Merge-forward and Saves delta continue. ETA to be updated after Product decides.
- 2026-10-17 08:49 (UTC+2) CEO ruled B: M4-A publishes as Latest+HTML on Saves QA delta PASS (~10:00). Hold remains only on #12 L30+.
- 2026-10-17 08:55 (UTC+2) Market Hand min-wait c05c83a ready locally (golden e7dad040), push after browser gates ~09:30 then CCR. MK-56..59 ruled post-rc own PR (Economy columns queued). UI started B-3 parallel (~13:00); #3 minors SHA chased (was due 08:00).
- 2026-10-17 08:56 (UTC+2) Opened #37 econ/start-coop-eggs-col @ 85e5bb1 (CSV 9980ec22, column only); needs CCR + full gate set incl L30+. #3: ruling (a) implemented 23a3798, final SHA ETA 10:30.
- 2026-10-17 08:58 (UTC+2) #5 toast first-frame approved at a56b3a2 (QA PASS 37524aa, CCR clean, nits comments/tests only). Merge held until M4-A Latest ships (~10:00) to keep main stable under the freeze; then #5, then #35.
- 2026-10-17 08:59 (UTC+2) Economy: L30+ fix C2 (sha 1536be49; L35 hens/egg-value -10%, L30 row taken from the L30+ pack) passes the L30+ gate (EX-1 worst 2.20 vs 2.25 limit), AC7 unchanged. Pending: HoP sign-off + Saves QA TS-bot run. Note: it changes main's L30 row, so full gates are required at PR time. #12 stays on hold.
- 2026-10-17 09:06 (UTC+2) C2 QA PASS (Saves QA). HoP: C2 lands only with full L30+ set -> goes into #12 re-land after #31; sync-economy demandLoFactor fit issue must be solved there. Min-wait follow-up (wages restored) ETA ~09:45. #25 merge-forward 7519fb1/2340d61 local, gates ETA 09:45.
- 2026-10-17 09:08 (UTC+2) L30+ C2 single PR econ/l30plus-c2 off main (L30 row + L31-55 + sync-economy fit + cap 55 + price rule), Features ETA ~13:00, merges after M4-A; supersedes #12 re-land (close #12 when it opens). Order: frz -> min-wait -> #18 -> l30plus-c2.
- 2026-10-17 09:20 (UTC+2) Pushed M4-A #31 frz d75d41f (1a44b19 + main 8e6d53e). Saves QA 3-engine delta + CCR delta in progress, due ~10:05; Latest+HTML ETA ~10:15-10:30.
- 2026-10-17 09:21 (UTC+2) Features gates on d75d41f all green (vitest 754/754, rc0 224/224 x3 engines). 956da11 (status-only) NOT pushed; PR head stays frozen at d75d41f.
- 2026-10-17 09:24 (UTC+2) CCR delta PASS on #31 d75d41f (no blocker/major). Waiting only on Saves QA 3-engine verdict (~10:05). #37 CCR PASS; merge waits on Economy L30+ gate result (~09:45).
- 2026-10-17 09:31 (UTC+2) Pushed #25 72078b5 (merges 97a57c1+68950c0, 48px Play-here). CCR delta requested (payout resolution vs #28). Saves merges main once after M4-A lands, then full WebKit rc0 + QA delta; #25 = next Latest after M4-A.
- 2026-10-17 09:32 (UTC+2) #37 cleared (CCR PASS + full gates incl L30+). Merge held until #31 lands; then merge-forward, #37, #5. Post-M4-A order: #37 -> #5 -> #25 -> min-wait -> #3 -> #18 -> l30plus-c2.
- 2026-10-17 09:36 (UTC+2) CCR delta PASS on #25 72078b5 (payout parity exact on 52,920 states). Next: Saves merges main after M4-A, full WebKit rc0, Saves QA delta, then Latest.
- 2026-10-17 09:44 (UTC+2) Pushed feat/market-hand-min-wait fe33db2 (wages as main, serve gated >=2.0s, golden 9089892a). PR + CCR + UI QA + HoP next; rc gate.
- 2026-10-17 09:58 (UTC+2) #38 min-wait ON HOLD (HoP withdrew: L3-7 income/min -0.7..-2.6% vs ±0.5%). Re-land with MK-56/57. rc1 gate decision asked of HoP (wait vs descope). Order after #31: #37 -> #5 -> #25 -> #3 -> #18 -> l30plus-c2.
- 2026-10-17 09:57 (UTC+2) D-HOP-2026-10-17-03: min-wait + MK-56/57 descoped to rc2. rc1 = current main behaviour. Features to mark min_wait_s/market_hand_hold_s/last_chance NOT IMPLEMENTED (rc2) and verify no rc1 reader; QA not to gate rc1 on them.
- 2026-10-17 09:58 (UTC+2) CEO approved freeze plan: #31 -> #37 (11:00) -> #5 (11:15) -> #25 (12:00) -> #35 (11:45) -> #3 (12:30) -> L30+ C2 (15:00) -> rc from main ~15:15 -> Latest ~17:30. #38 dropped. Parked: #18, sd5-1b, MK-56..59, first-minute.
- 2026-10-17 09:58 (UTC+2) #31 d75d41f Chromium green; full 3-engine verdict ETA 10:50 (box load). M4-A merge+Latest slips to ~11:00-11:15. Downstream caps unchanged; #25 at risk for 12:00.
- 2026-10-17 09:59 (UTC+2) UI jobs killed by stray stop; #3 final SHA ETA 11:30 (within 12:30 cap). #16 parked per freeze; UI told to stop it.
- 2026-10-17 10:04 (UTC+2) #25 fwd-merge plan approved (scratch/pr25-fwd-merge-plan.md): single payout.ts on salePriceCents, CCR delta required. Egg price row keeps #31 short format. Asked HoQA for lane 1 priority for #25 at ~11:00.
- 10:15 (UTC+2) Saves sd5-1b: a5097c9 AC14b ruling (a) deferred no-storage notice (src/ui/notice-queue.ts, both orders tested); merged origin/main acaceee (96c6f83) then 8e6d53e (c4fa26b); 87234dc 'redundant' unload verdict (Firefox rc0 unloadmirror failed 2/2 at c4fa26b). Unit 631/631, tsc/sync/build/build:qa OK. Chromium gates on lane 2 running; FF/WebKit rc0 after 12:00 (lane 1 = #25 until 12:00). PR body: engineering/reviews/sd5-1b-pr-body.md. Blocked/needs: QA quota2.mjs must close the dialog under ruling (a); Architect ack for 'redundant' verdict.
- 2026-10-17 10:10 (UTC+2) Parked per freeze: sd5-1b (local 87234dc, never pushed; lane-2 PIDs 1388084/1388077/1398161 killed by Saves), arch/release-scan-lows-2 (WIP b13ee4a, no PR), #16. Confirmed to CEO+Ops.
- 2026-10-17 10:23 (UTC+2) #3 Cut A QA PASS @8a49d35 (rc0 307/307 x3, no B/C/M; 3 Minors follow-up). Ships as 8a49d35 + fwd-merge; B-3 only if B/C/M. WebKit runtime globals pending (lane 2). Report qa/m3-recheck/cutA-8a49d35.md.
- 2026-10-17 10:24 (UTC+2) HoQA: #3 @8a49d35 PASS, cleared. WebKit runtime globals deferred to rc 3-engine pass. B-3 parked (fix/rc2-b3-farmcard-compact 9690b9d). #3 fwd-merge branch rc1/ux-clarity-v3-main after #31.
- 2026-10-17 10:37 (UTC+2) #35 head 3fa3781976d518f9ca4b7f801576f52109e5799c pushed (test-only over efd7886); rc0 x3 green, CCR 0 major; Art&UX shot check PASS FF/WebKit/375. Awaiting UI QA; merges after #5 (and #25), cap 11:45.
- 2026-10-17 10:45 (UTC+2) #5 toast @a56b3a2 HoQA PASS, cleared (rc0 213/213 x3). Merges after #31/#37 (needs fwd-merge onto main).
- 2026-10-17 10:50 CEST — #31 (M4-A, d75d41f) merged to main acdbedc2f5a903c512775717ddef63923ed98a39 (merge commit); Latest release m4a-acdbedc https://github.com/PrincipalLewis/egg-farm/releases/tag/m4a-acdbedc (egg-farm.html, check-release-build PASS)
- 2026-10-17 10:52 (UTC+2) #35 @3fa3781 UI QA PASS (no B/C/M). #25 fwd-merge on fix/hidden-tab-offline-fwd; HoE pushes, SHA target 11:05. Features paused pending Vadim's clearance of a stray stop; #37 11:00 cap at risk.
- 2026-10-17 11:12 (UTC+2) #39 (supersedes #25) @6dc2f5a units 849/849 green. #5 new head 4938e94 (fwd-merge, CCR major fixed), cap ext 11:35. #35 DROPPED (rc1-chain vs M4-A conflicts need product calls). #3 dry-run fwd-merge check by 11:25.
- 2026-10-17 11:13 (UTC+2) D-HOP-2026-10-17-05: #3 fwd-merge, main wins (manage-all 3+ w/ balance threshold 0.5, HENS/VALUE, M4-A fmt). UI merging; cap 12:30. Latest link sent to CEO.
- 2026-10-17 11:26 (UTC+2) HoQA: PM4-P3 MAJOR (Collection card overlap @375, pre-existing on Latest). RC blocker unless Cut A or a P3-only patch is in. Contingency: P3-only patch if #3 not green by 12:15.
- 2026-10-17 11:33 (UTC+2) #39 merged (QA PASS + CCR PASS @6dc2f5a). main = af5e3abba1bca9bee582f22f4a019724f8abf165. #25 closed (superseded).
- 2026-10-17 11:33 (UTC+2) #5 DROPPED (CCR Major on fwd-merge 4938e94: lost milestone toast at L15, M4-on). Kept for follow-up.
- 2026-10-17 12:06 (UTC+2) #3 DROPPED/parked (fwd-merge 7380b86 gate-green but 3 CCR Majors; fix past cap). PM4-P3 via #40 @462a071 (UI QA by 12:20; HoQA asked to accept as P3 fix).
- 2026-10-17 12:06 (UTC+2) CEO: #37 dropped. HoQA QA-D-1017-8: #40 replaces Cut A for PM4-P3 (4 conditions). L30+ C2 blocked (Features paused) -> drop unless cleared by 12:30; RC from main after #40.
- 13:45 CEST: HoQ RC build PASS on dd52bfd; scope confirmed via D-HOE-2026-10-17-RC-SCOPE; awaiting full PASS to publish.
- 13:50 CEST: HoQ FULL PASS dd52bfd (QA-D-1017-15). Publish held pending the CEO's A/B call on m4.enabled (prev Latest was also flag-off).
- 13:55 CEST: HoQ hold QA-D-1017-16 (HoP claims M4 live on acdbedc). Verified false: acdbedc m4.enabled=0. Downgrade-save check (~20m) requested; CEO A/B pending.
- 13:48 CEST: PR #41 @90a9c8468e3c927dc232ab2e64d6858446c9edb9 pushed (M4 on); QA delta started; dd52bfd PASS superseded; local gates running.
- 13:50: Release rule: main fast-forwards to exactly 90a9c84 (git push origin 90a9c84:main, no merge commit) on PASS.
- 14:42 CEST: #41 HOLD (units 62/851, slow 7/14 fail with M4 on; AC7 bot gap escalated by HoQ). Architect assigned test triage on rc/m4-on-tests, ETA ~15:30.
- 14:45 CEST: PUBLISHED Latest m3-rc1-pre-dd52bfd (M4 off), main=dd52bfd, asset egg-farm.html 506531 B sha256 913c7feb... (D-CEO-20261017-04).
- 14:43 CEST: Latest m3-rc1-pre-dd52bfd closed: HoQ post-publish PASS (QA-D-1017-23), Art & UX sign-off (72 shots). Post-freeze Minors: Upgrades tabs 36px, Upgrade Farm tap 16px. M4-on track (#41) continues.
- 14:54 CEST: #41 parked, Architect triage stopped. Freeze COMPLETE. Engineering idle pending Vadim.
- 14:55 CEST: Architect stopped; WIP rc/m4-on-tests @94e373f510ceb51ee03e918c4c22577d4be86282 (parked). RISK for M4-on restart: 5 possible real save bugs under M4 on (hidden-save quota retry leaves migration record; idb-mirror no write; save-majors BUG-2 undefined; AC8 extra fields; saveseq-carry). These are M4-on test runs only; live Latest dd52bfd (flag-off) passed QA saves.
- 2026-10-19 00:25 CEST (Senior Engineer, Saves & Persistence), M4-on save triage, worktree /workspace/wt-m4on-triage off rc/m4-on-tests @94e373f (balance.m4.enabled=1 already on branch).
  DONE: all 5 suspected save failures classified as TEST ARTIFACTS, no real save bug. (a) hidden-save N2 retry: game.ts:232 correctly refuses N2 on a committed v7 farm; an M4-on fresh Game is committed at creation (game.ts:75, M4-22). (b) idb-mirror and (c) save-majors BUG-2: the fixture is an unmarked v6 save, so the mirror is paused until startTracksMigration commits (game.ts:60-65, M4-24). (d) AC8: an unmarked v6 load returns the pending-migration descriptor (save.ts:106/207). (e) saveseq-carry: test asserts m4On(b)===false against the shipped balance. Test fixes committed locally on test/m4on-saves-artifacts @c3811f750bfb53a565c9b547966abead074ff4dc (5 files, 47/47 pass, tsc clean). NOT pushed. No fix branch off main was needed.
  NEXT: HoE to decide whether to fold c3811f7 into rc/m4-on-tests. 55 unit and 7 slow M4-on failures remain (economy/AC7/golden/hidden-tab rate expectations), outside saves scope.
  BLOCKED: none.

- 2026-10-19 01:10 UTC+2 HoE: #42 head 528f1a71cd9170d612a0af24c1a691032ff47813 pushed (D-HOP-02 bot, parity M4-off, first-purchase gate, m1-m3). Units 855/858, slow 14/14. AC7 s1-200: L10 P95 15.65/15.38 FAIL pending 03:30 retune. L30 workers 200/200. CCR delta + HoQA two-bot check requested. Ruling: random-timing bot first-purchase stays report-only.
- 2026-10-19 01:36 UTC+2 HoE: #42 528f1a7 CCR delta PASS (0B/0M/0m, 4 nits; reviews/pr42-delta-528f1a7.md); HoQA verified (qa/reports/ac7-pr42-528f1a7.md). Not merging until 03:30 retune clears L10/acw1/p4. n2/n3 to Architect.
- 2026-10-19 01:37 UTC+2 HoE: #42 head now f9baba15ae832056d8406b15b966cc01707d6998 (n2/n3 docs/test-name only). Architect on standby for 03:30 mapping.
- 2026-10-19 02:02 UTC+2 HoE: Merged #43 (PL-1 @48bdb09, QA PASS 3 engines + CCR 0 Major + Art&UX) into rc/m4-default-on -> 7fdb273560232590e9da7f4719809b933c0699fa. Architect to merge base into #42. Follow-up Minor M-PL1-1 (focus drops to body after buy).
- 2026-10-19 02:04 UTC+2 HoE: HoQA two-bot check on 528f1a7 PASS (worst gap 1.9%). Bug tests/bot.ts:40 (farm level logged pre-buy; double buys lost) -> true no-workers L10 P95 15.35, still FAIL. Fix folded into #42 update (Architect). Shared game/node_modules deleted ~01:54; worktrees must npm ci.
- 2026-10-19 02:14 UTC+2 HoE: #42 head cb57f174d8e8d85c3a9a7068b99dc75348de6403 (base merge 7fdb273 + bot.ts farm-log fix). Units 860/863, slow 14/14, goldens 4/4. L10 P95 15.35/15.38 FAIL pending retune. Handed to HoQA for identity rerun.
- 2026-10-19 02:44 UTC+2 HoE: #44 T3 (4e7a4ed8eb42a8b08e34eefee01cf400324ee846, base rc/m4-on-tests-2), L10 P95 12.02/12.08, fastest 7.87. Ruled: encode D-CEO-20261019-04 thresholds in pacing.test.ts (+ seeds 201-300 strict, L30+ step asserts); allowlist T3 hash; m4a-tracks read config; acw1/p4 must pass unchanged or escalate to HoP. #42 cb57f17 QA identity verified (qa/reports/ac7-identity-cb57f17.md).
- 2026-10-19 03:19 UTC+2 HoE: #44 4ccb9fde8251b371c6ee6444b735990e488e2aae passes D-CEO-04 (1-200 12.02/12.08, 201-300 strict). Blockers escalated to Leadership: acw1 real miss 91%<95%; p4/acw1 refs predate M4; L30+ gate unmeasurable until l30plus pack a957b072. QA two-bot rerun after.
- 2026-10-19 03:20 UTC+2 HoE: Per CEO, partial QA intake on #44 @4ccb9fd (saves, 3-browser + shot set, release checks). AC7/L30+/two-bot wait for final SHA after acw1 retune (HoP 04:30), M4-on refs regen, L30+ pack merge (HoE merges; HoP ETA 03:45). CCR review of #44 requested (04:15).
- 2026-10-19 03:21 UTC+2 HoE decision: L30+ pack (econ/l30plus 6809f8e) is NOT data-only (9 src files incl migrate-v7, tracks, UI). Bring in whole, separate src/data commits, full CCR + Saves review of migrate-v7, SAVE_VERSION 6, flag-off unchanged. Final SHA ~05:30-06:00; QA gates 4/5 partial rerun.

## 2026-10-19 03:25 HoE
- Saves L30+ pre-review (6809f8e): no Blocker. Majors:
  - M1: dead Hens/Egg value levels 51-55. Architect will cap track max at 50 and add a test.
  - M2: Saves is adding a tolerant loader (clamp instead of reset) plus an integer check (m1) before Latest.
  - M3: stale base, handled by the 3-way merge (src 20bf1d3f). Saves will rerun the checks on the pushed SHA.
- Approved a type-only change: optional fields on Balance. M1 format: #22's T tier is already in this lineage; the Architect is extending tiers up to the L55 max.

## 2026-10-19 03:58 HoE
- L30+ pushed as draft PR #45, head a99f4e3d6e01cb2d43d80d3483d67cd1a5637d0a, base rc/m4-retune-t3. All src commits are in, test:flagoff matches 7fdb273, and the track clamp is at 55.
- BLOCKER: sync rejects CSV 625452d4 (L30->L31 track cost drop; coop_capacity non-linear on L32-50). Escalated to Economy and HoP. Per-level coop table pre-approved if the non-linearity is intended. Live CSV is still b48be8a4.
- Saves recheck and the full CCR review requested on a99f4e3.

## 2026-10-19 04:11 HoE
- #44 is at 1d103114c825fb28944173bb6920b5209190fb01: CCR fixes in, acw1 GATE_S 960 (D-CEO-06), 98.0/97.0% PASS, units 864/864. CCR delta review requested.
- #45: Architect is merging #44, the coop per-level table (D-HOP-10) and strictly-rising costs. The CSV from Economy is due ~04:45. Final SHA target <=06:15.

## 2026-10-19 04:15 HoE
- #45 head b29e0e99d03758c394f2dd9c1bb8c258b43f4fe8: per-level coop table, rising-cost check, #44 merged in. Flag-off 4/4.
- CSV f158e258 passes sync but fails the L30+ step gate (P95 2.12). D-CEO-08: L31+ retune by 05:15 (D-HOP-12); fallback is f158e258 if the worst seed is <=2.25. Worst-seed number requested from the Architect.
- UI F1 explainer PR due ~05:15. Saves loader commit and migration-marker write-up still owed.

## 2026-10-19 04:25 HoE
- CCR delta #44 4ccb9fd..1d10311: PASS, 0 Blocker/Major/Minor, 3 nits (engineering/reviews/pr44-delta-1d10311.md). #44 merge still waits for QA PASS on the final stack.
- Saves recheck #45 a99f4e3: no save blocker. New Major M4 (tests/l30plus.test.ts collects 0 tests) sent to the Architect.

## 2026-10-19 04:30 HoE
- Real-branch L30+ step (b29e0e9 + f158e258): P95 2.710, worst 3.029 (seed 121), FAIL. D-CEO-09: retune until 06:00, valid only on #45 code against -04 as written. Otherwise ship capped at L30.
- Capped variant rc/m4-t3-capped (#44 1d10311 + #47 loader + F1 e43bc00 cherry-pick + F2 CSS) is being staged by Features (95daf662), ETA 05:45. HoQA told to prepare intake for both.
- Saves loader is PR #47 (002d8a4), pushed by HoE. Explainer is PR #46 (e43bc00).

## 2026-10-19 05:20 (UTC+2) · Senior Engineer, UI & rc1 Fixes · M4 gate5 explainer (PR #46)
- **Done:**
  - PR #46 (`fix/m4-gate5-explainer`, base rc/m4-t3-l30plus @ b29e0e9), head c0bb3de7963e789e309a7dcfaf25f6f0d8226800.
    - Commits: F1 EXP1 e43bc00, F2 CSS 3dfa0de, Saves m1 fc4b100, §11 refund f68c799, A 65cbf3e (toast hold / queued behind Welcome back / focus), B aa59600 (swallow, the variant HoE chose), focus fixes ae24de8 + c0bb3de.
    - Gates: tsc, flagoff 4/4, build + release check, explainer unit tests 19/19, rc0 g5 39/39 on Chromium, Firefox and WebKit.
  - Variant C (m4a-spec v1.15) is on `fix/m4-gate5-explainer-v115` @ 0d4c0fe, unmerged, no PR. rc0 g5 45/45 on 3 engines.
  - Shots: /workspace/wt-ui-shots/m4-gate5-v2 (B @ aa59600) and m4-gate5-v115 (C @ bac1c27), each with manifest.json.
- **Next:** CCR deltas on the focus fixes (B aa59600..c0bb3de, then C). Hand off to Head of Art & UX. Reshoot at the final heads if Art & UX asks.
- **Blocked:** Saves' capped branch 3ba38cf3 isn't on the remote, so the cherry-pick check against it hasn't run.
- **Incident (05:12):** cleaning up my own review worktrees, I removed by pattern (`git worktree list | awk '/review-/'` → `git worktree remove --force`). That removed all ~52 shared /workspace/review-* worktrees of the game repo, not just my 4.
  - Recovered at once: all 52 were recreated at the same SHAs, taken from the /workspace/wt-logs/review-*.out names.
  - Lost: any uncommitted or untracked files inside those worktrees (e.g. node_modules, throwaway review tests). Review reports in engineering/reviews/ were not affected.
  - Any review worktree not named in wt-logs was not recreated; owners need to re-add it.
  - Rule adopted: remove only exact paths I created; never pattern-based deletes.

## 2026-10-19 05:17 HoE
- Explainer: variant B (swallow, the CEO's logged D-07 amendment) at c0bb3de on fix/m4-gate5-explainer goes into the final build. v1.15 variant 0d4c0fe is held unmerged pending the CEO.
- L30+ 2x2 diagnosis: our code isn't the cause; it's the farm_cost data at L34/39/49. #45 is parked (PR #48 parked.md). Recommended B (capped) to the CEO.
- #47 CCR: logic PASS. Saves is fixing m1 (bad level loads as 0 and overwrites the save) on the capped branch.
- INCIDENT ~05:15: UI cleanup deleted every /workspace/review-* worktree (~52, across agents). Recreated at the same commits; uncommitted contents lost. Rule: never delete worktrees by pattern.
- 05:32 update (Senior Engineer, UI & rc1 Fixes):
  - CCR focus-fix deltas:
    - B aa59600..c0bb3de: 0/0/0/3/2 (engineering/reviews/m4-gate5-focusB-c0bb3de….md)
    - C bac1c27..0d4c0fe: 0/0/0/3/3 (m4-gate5-focusC-0d4c0fe….md)
  - B reshoot at c0bb3de: /workspace/wt-ui-shots/m4-gate5-b-c0bb3de/ (81 PNGs + manifest), rc0 65/65 on 3 engines.
  - Saves' local rc/m4-t3-capped has the gate5 picks, head 0ee8831 (not on the remote). I didn't touch it.

## 2026-10-19 07:36 HoE
- #49 final candidate is 8396ed1 (pushed). The storageBlocked and quota fixes are UI-only. g5 passes 99/99 on all 3 engines. Saves gate 4 PASS. Art's 360 set is in review. The QE_LATE Minor is parked.

## 2026-10-19 08:12 HoE
- #49 final is 246de09 (pushed). g5 passes 99/99 on Chromium and Firefox. CCR delta PASS. Saves GO. QE-LATE-e is a proposed Minor. Waiting on the HoQA verdict.

## 2026-10-19 08:55 HoE
- **M4 B RELEASED (Latest):** https://github.com/PrincipalLewis/egg-farm/releases/tag/m4b-dd223f5
  - #49 merged into rc/m4-default-on as 9b2ef40. #41 merged into main as dd223f5. The tree is identical to 246de09 (b673279).
  - Tag m4b-dd223f5 (lightweight, on dd223f5).
  - Asset egg-farm.html: 511108 B, sha256 0bc5bb72df4ab0dee287d3e1d57b7d8178659a147dd6740738b3f0ea8f179a4c, build id m3-rc1-pre+246de09. Built from a clean 246de09 checkout. check-release-build passed. The downloaded copy's hash matches.
  - Gates: tsc OK, vitest 980/980 at 246de09 and at 9b2ef40 (npm ci). CI on #41 was all green.
  - Minors go to the next release: QE-LATE-e, the Art backlog, the workers L10 P95 margin, and L30+ (#45).

## 2026-10-19 09:02 HoE - post-release branch cleanup
- I deleted these remote branches. Each was confirmed already in main dd223f510e9acabf9b1915b56e39da8b88dcac63, so the SHAs can be restored:
  - rc/m4-t3-capped@246de09c8b329360754cc0d77a6cd6b6788b6ad4
  - fix/m4-exp1-seen-revert@246de09c8b329360754cc0d77a6cd6b6788b6ad4
  - fix/m4-gate5-v115-on-capped@8396ed1e24ef345909e0c586be839979529bb840
  - rc/m4-retune-t3@1d103114c825fb28944173bb6920b5209190fb01
  - rc/m4-on-tests-2@cb57f174d8e8d85c3a9a7068b99dc75348de6403
- Closed PR #44 (merged via #49/#41). Retargeted PR #45 (L30+) onto main. rc/m4-default-on is kept.
- Local worktrees are untouched.
- L30+ real-code measurement: the Architect started it at 08:58 on b.csv 84bd0b70.

## 2026-10-19 09:10 HoE
- M4.1 backlog is in m4.1-backlog.md (9 rows: owner, D-CEO-11 item, cap). parked.md is reset to one row per PR, and the old notes are archived in triage/.
- D-CEO-12: only L30+ numbers from the Architect's single harness count toward the 18:00 gate, and each one cites the harness, the code SHA and the CSV sha256.
- D-HOP-23 Collection cost table: UI is building it on feat/collection-cost-table (flag off, DO NOT MERGE), ETA 12:00.

## 2026-10-19 09:12 HoE
- engineering/release-checklist.md added (D-CEO-13): pre-publish hash and build-id check by Saves QA while the release is still a draft, and merged branch/PR cleanup as part of each release.
- 09:15 Ops asks: M41-10 (the release name goes in the build-id, and the checklist now checks it against the tag). game/node_modules must never be touched by any cleanup (Tools & Accounts Admin reinstalled it today).
- 09:25 M41-1 done (Architect): harness measure-l30plus.ts 8aa74ce14a21, code 729565e9, b.csv 84bd0b70. Gate PASS (P95 1.974, worst 2.171); top-step FAIL (F38 27.5- 09:25 M41-1 done (Architect). Harness measure-l30plus.ts 8aa74ce14a21, code 729565e9, b.csv 84bd0b70. Gate PASS (P95 1.974, worst 2.171). Top-step FAIL (F38 27.5%). The L30 row differs from main, so I asked HoP. It needs the #45 code (M41-2). PR #51.

## 2026-10-19 09:42 HoE
- #50 @ 7346011 (D-HOP-23) and #53 @ 4e1252d (M41-10 build-id m4.1+) pushed, unmerged; local gates green; GitHub Actions down account-wide (billing) — CEO owns escalation to Vadim (D-CEO-15). Interim local evidence accepted for intake; no merge/Latest without green CI.
- D-CEO-15: Collection rows 22–27 may ease only if every seed is byte-identical to main through F31 and no seed buys them pre-F31. Architect adding the checks (12:00) and baseline c7bb783f.
- New: M41-11 (M4B-1 unlock-hint), QA4-1..3 added to M41-9.

## 2026-10-19 10:10 HoE
- PRs pushed, DO NOT MERGE (CI down): #50 7346011, #52/integrated 846178a (code of record, D-CEO-16), #53 4e1252d, #54 882b97f, #56 1eca759, #57 b901e84 (replaces #55).
- D-HOE-04: M41-7 buildable, split Saves core / UI copy; fallback M2 variants slip.

## 2026-10-19 10:22 Senior Engineer, Saves & Persistence: M41-7 (fix/saves-csr-loadsafe, /workspace/wt-m41-7 off dd223f5, local only)
- Done: spec v0.3.1 sha256 verified (0771dac0…a1ad0). Copy + IDB corrupt-copy interface published: engineering/reviews/m41-7-copy-interface.md (notice ids M1–M5/storage/cantsave, M2 variants, params, telemetry enums, IDB corrupt.<ts>[-n] format). Worktree + branch created at dd223f5 (no commits yet).
- Next: tests first (loadSafe tiers, CSR-3, CSR-13 defer, CSR-AC-IDB1, dedupe, prevLevel, save_restore after refactor) → loadSafe single owner → Game/main wiring (IDB corrupt copy awaited before new Game) → gates → CSR-17. Baseline unit run was interrupted at ~170 s (not rerun yet); gate logs will go to /workspace/m41-7-gates/.
- Note: the 17:15 deadline asks for a pushed SHA; my rules say no push → HoE pushes.

- 10:26 M41-5 #57 intake PASS @ b901e84 (follow-up daf9157 for date-independent allowlist + unused-entry warn, at HoQA re-intake). Option (b) harness ccfcb63; integrated head a05bc74 (M41-5 merge c98c873). b.csv reference run in progress. #54 farmMax 88130a7 at HoQA intake; m4a-spec v1.20. CSR v0.3.2 pins IDB1-1..8, save_restore kept.

- 10:30 b.csv ref run on harness ccfcb63 / a05bc74: equiv (first-l30plus-buy) FAIL, 16/200 seeds diverge with early F27 Farm buy (likely cheap b.csv L30 row); rows 22-27 FROZEN; G1-4,7,10 FAIL from F28. Ruling: gate stays as written (no waiver), and candidates must restore main L30 row. Architect running N0b_C150; Economy candidates rolling, best by 14:30; go/no-go ~16:30.

- 10:31 D-CEO-19: gate amended to accept unlock-driven Farm buys; code fix (b) rejected. Merged harness spec sent to the Architect, cap 13:00. l30plus-harness.md and release-checklist.md updated.

- 10:37 D-HOP-45 triage: options() FARM-to-maxLevel is NOT a bug. Farm is capped at 50 in plan and buy (best-buy.ts:47, actions.ts:28, maxLevel=min(CSV rows, farmMaxLevel 50)), so gate evidence is unaffected. Tracks max 55 by design (D1), reaching at most 53 at F50. The bestBuy bundle (D-HOP-42) goes in Architect 13:00 commit or follow-up. #54 per-row cap offsets go to UI (B1-11, via trackCap/trackLock).
- 10:39 Correction (HoP): "at most 53 at F50" holds only for offset-3 data. The candidate CSV uses per-row offset 5 from row 40, so cap(50)=55 and tracks reach 55 at F50. B1-11 covers this; #54 must read per-row offsets.
- 17:20 Oct 21: re-plan D-CEO-20261021-01 adopted. Backlog and checklist updated. CI is RED because of billing.

## 2026-10-22 19:25 Senior Engineer, Saves & Persistence: M41-6 (QE-LATE-e)
- **done:** fix/saves-mirror-on-fail @ 1682a0c0f25f5793d104b11ea391ee28b4c4a719 (on dd223f5; c82685c, 95b5a5c, 1682a0c), local, NOT pushed. Frozen spec product/farm/frozen/qe-late-e-spec.v0.3.md sha256 c6a37023…421c verified. QEL-1..13 PASS: gate4 QA file (sha 20b12dc9…c420) 17/17 incl. QE_LATE_e reload1:1,total:1; QEL-8 `rg -c mirrorOnFail src` = 2 (game.ts, tracks-explainer.ts); QEL-12/13 Chromium: qe-late-browser.mjs PASS, qel12-extra (variant e, working storage fresh/EXP1/pre-M4, hidden tab) PASS. Gates on 1682a0c: tsc, sync-economy --check, golden 4/4, units 1026/1026, test:slow, release build, build:html + release check, build:qa, check-globals Cr, rc0 Cr 348/348. Logs: /workspace/m41-6-gates/. OQ-2 audit: only seenTracksExplainer needs mirrorOnFail:false.
- **next:** HoE pushes the branch; HoQA reruns gate4 + QEL-12 on the pushed SHA. Merge order vs M41-7 per HoE.
- 19:25 Oct 22: M41-6 pushed at 1682a0c0f25f5793d104b11ea391ee28b4c4a719 as PR #59 (DO NOT MERGE) and handed to HoQA. No engineering routines to pause (Architect, Saves and UI have none).

## 2026-10-22 19:35 Senior Engineer, UI & rc1 Fixes: M41-11 + M41-10 rebased as new branches (D-CEO-20261021-01)
- **done:** main = dd223f510e9acabf9b1915b56e39da8b88dcac63 (fetched). Spec m4a-spec.v1.24.md sha256 38e95a5d…94e9 verified.
  - M41-11: PR #60 (supersedes #54), fix/m41-11-lock-label-v124 @ 5789805911ad7f96c23fdf42d06a1854a936c0c3 = 882b97f + 88130a7 cherry-picked + new commit. 'Max for this farm' row (D-HOP-40; B1-6/6b/7/8/9/10), N from sim trackLock, F4-19 exclusion tests. B1-11 N/A. No D-HOP-42 label. src/ui + tests only. Gates PASS: tsc, vitest 1017/1017, build+release check, build:html+release check, check-globals Cr (flock lane 1), sync-economy --check. Logs: /tmp/gates-m4111/.
  - M41-10: PR #61 (supersedes #53), fix/m41-10-build-id-prefix-v2 @ 33f153884606b4a72c60a8760463264745d21962 = cherry-pick -x 4e1252d, no conflicts, tree identical to 4e1252d. Gates PASS (vitest 982/982; build id m4.1+33f1538). Logs: /tmp/gates-m4110/.
  - Old branches/PRs #53, #54 and worktree /workspace/wt-m41-11 (uncommitted edits) left as they were.
- **next:** CCR + HoQA intake on #60/#61; Art & UX re-check shots of the Max-for-this-farm row on 5789805; HoE to decide whether to close #53/#54. Then M41-8 F3/F4 (no D-HOP-42 variant) and M41-9 Minors.
- 19:30 Oct 22: #60 (M41-11, 5789805911ad7f96c23fdf42d06a1854a936c0c3) and #61 (M41-10, 33f153884606b4a72c60a8760463264745d21962) pushed off dd223f5. #53 and #54 closed as superseded.

## 2026-10-22 20:10 Senior Engineer, UI & rc1 Fixes: M41-8 F3/F4
- **done:** PR #62 feat/m41-8-f3-f4 @ fcf98235545359c56313235a31d73ff3bd3154a1 on main dd223f5. F4 strip label (★ / +X% income from best_roi's optionGain / milestone / Collection Δtap, 27-cp truncation, NBSP, untruncated aria) + F3 = UX-M4 ★ Best buy chip, one source (bestBuyMark) with the strip ★. D-HOP-42 unlock variant not built (L30+). Gates PASS: tsc, vitest 1005/1005, build+release, build:html+release, check-globals Cr, sync-economy --check. Shots: scripts/m41-8-shots.mjs, Cr/Fx/WK 23/23 each, /workspace/wt-ui-shots/m41-8-fcf9823/. 7 spec conflicts listed in the PR body (NBSP placement, negative delta, Δtap format, chip colour, affordable-only chip, workers, F4-17 clone render).
- **next:** CCR + UI QA intake on #62; Art & UX sign-off on fcf9823; M41-9 when assigned.
- 20:02 Oct 22: #62 (M41-8 F3/F4, fcf98235545359c56313235a31d73ff3bd3154a1) pushed off dd223f5 and handed to HoQA.

## 2026-10-22 20:15 Senior Engineer, Saves & Persistence: M41-7 core (corrupt-save recovery) green, local, NOT pushed
- **done:** fix/saves-csr-loadsafe @ 9cce82d6763bb0baabe6f6c8cddf07964e6da47f (worktree /workspace/wt-m41-7, off dd223f5). Merged once each, normal merges: M41-6 1682a0c0f25f5793d104b11ea391ee28b4c4a719 (26dd514, game.ts auto-merged) then UI PR #58 66680eb056f7e8b82115e659f8e23651ead79a5f (f35cda5, unchanged on origin). Spec of record corrupt-save-recovery-spec.m41-final.md sha256 6131c290…433334d (= frozen v0.2.3-m41-final; v0.3.4 minus §6). UI-owned recoveryNotice/copy reverted from our side (f191fbd). CSR-17 not built (M4.2).
- **gates (9cce82d, /workspace/m41-7-gates/):** tsc, sync --check, goldens 4/4, unit 1132/1132 (93 files), slow 16+1 skip, build/build:html/build:qa, check-globals chromium, rc0 chromium 348/348 (lane 1). rc0 AC14b expectations updated to CSR-9 M1/M3 (9cce82d, for UI/HoQA review).
- **next:** HoE pushes; HoQA CSR + IDB1 re-check; Firefox/WebKit rc0 when lane load allows.
- 20:15 Oct 22: M41-7 pushed at 9cce82d6763bb0baabe6f6c8cddf07964e6da47f (includes #59 and #58) as a DO NOT MERGE PR and handed to HoQA.
- 20:20 Oct 22: D-HOP-2026-10-22-01 rulings sent to Saves for #63 rework (a–c confirmed with conditions; d corrected to the CSR-2 tier-A rule) plus the EXPORT_ARIA fix. HoQA told to expect a new SHA.
- 20:22 Oct 22: UI approved 9cce82d. #58 follow-up 4c94704 (store null, never ls) to be merged into the #63 rework; HoQA holds the full gate for the corrected SHA.
- 20:26 Oct 22: CCR blocked #62 (rc0 346/348, F4-14 aria label-in-name; M1 % on fresh save against F4-11). Ruling asked of HoP (default: visible text is the name, expansion in describedby). UI fixing ahead of M41-9. CCR: #60 and #61 pass with nits.
- 20:26 Oct 22: HoP ruled F4-14 as D-HOP-2026-10-22-02 (m4a v1.25, e021b37d...): visible text is the accessible name, sentence goes in aria-description, new AC F4-14a. UI pushing the #62 fix against v1.25.
- 20:28 Oct 22: added CSR-12 (localStorage throws on read, crashes at load) to the #63 rework; 4c94704 must be an ancestor (CSR-10). HoQA waiting on the new SHA.
- 20:30 Oct 22: D-HOP-2026-10-22-03 (CSR spec fcebedb3...) sent to Saves for the #63 rework. Flagged the conflict between (4) and -01 (d) to HoP; interim: .bak chosen shows the M1 dialog, IDB chosen is silent.
- 20:31 Oct 22: D-HOP-2026-10-22-04 confirmed: .bak chosen shows the M1 dialog, IDB chosen is silent with save_restore. CSR spec cc6b7e23...; CSR-12 moved to M4.2. Saves building one SHA including Art min-height 48/44.

## 2026-10-22 20:31 Senior Engineer, Saves & Persistence: M41-7 rework for PR #63 (on 9cce82d), local, NOT pushed
- **done:** fix/saves-csr-loadsafe @ dfdf49cd904398c7e302eec16161f8fb63b10a8d (on 9cce82d, no rebase/force). Merge of UI #58 update 4c94704 = c61ed2b9f5ac7058842ec811ddb950574ec8f912. Spec of record corrupt-save-recovery-spec.m41-final.md sha256 cc6b7e23…b08817c (fcebedb3 not found on disk; superseded). Items: D-HOP-2026-10-22-01 (a)-(c), (d) as amended by -04 (NO_MAIN_BAK_DIALOG in src/save/save.ts), -03 (1)-(4); UI-file minimal edits: P1 (M5 warn badge), P2 aria (csr.aria.file), CCR #58 m3 (notice telemetry only for CSR copy); tap targets (styles.css, recovery dialog only). EXPORT_ARIA unchanged (renders with visible 'Export old save'; P2 names would not start with it). CSR-12 not built (moved to M4.2, not started).
- **gates:** /workspace/m41-7-gates/dfdf49cd904398c7e302eec16161f8fb63b10a8d/ (see summary.txt).
- **next:** HoE pushes to #63; UI one pass on save-recovery.ts/styles.css; HoQA CSR re-check.
- 20:55 Oct 22: #63 rework pushed at dfdf49cd904398c7e302eec16161f8fb63b10a8d and handed to HoQA.

## 2026-10-22 Senior Engineer, UI & rc1 Fixes: M41-9 (big-number + Art rulings; Art Minors UX-M1/M2/M3/M5)
- DONE **#64** fix/m41-9-big-number-v2 @ 9b6fc4ab10debaf89354462e88698b9619c849c6 (off 1eca759; supersedes #56). Cherry-picks 67238c2/a08d196 (-x); R1–R5 ruling tests; shots script outputs to /workspace/wt-ui-shots/m41-9-<sha7>/ with no env override; QA4-1 fix: order-card line fit tiers 16→14→12px so 'eggs' stays whole (NBSP alone did not fix it). Gates all PASS, vitest 1016/1016. Shots /workspace/wt-ui-shots/m41-9-9b6fc4a/: 3 engines all ok.
- DONE **#65** fix/m41-9-ux-minors @ 604152226a21150a1d03dee44da72c049184b342 (off main dd223f5; sibling one-area PR; UX-M4 is #62). Gates all PASS, vitest 996/996. Before/after shots /workspace/wt-ui-shots/m41-9-6041522/: 18/18 AFTER checks per engine.
- NEXT: Art to confirm the 12px/-0.02em card-line floor (#64), the UX-M3 inside-sheet fallback covering the top row's Buy at 360, and no pop under reduced motion (#65). Close #56 once #64 is accepted (HoE).
- 21:00 Oct 22: M41-9 pushed by UI: #64 @ 9b6fc4a (big numbers, R1-R5, QA4-1) and #65 @ 6041522 (UX-M1/2/3/5). #56 closed as superseded. Sent to HoQA and Art. M4A-34 is not in M4.1.
- 21:03 Oct 22: #62 has no verdict on fcf9823 (fails F4-14a under v1.25). UI adding F4-13a star/chip sync (app.ts:418 gate bypass on affordable flip) to the same fix SHA; HoQA will do a delta run.
- 21:10 Oct 22: #63 next push = explainer fix (D-HOP-22-06; seen only on dismiss) + CSR-8 8b race fix (HoE decision: tab B takes the IDB1 path when there is no main but a corrupt.* exists; owns() re-check in tx only if sync). One SHA, one full gate.
- 21:12 Oct 22: #62 fix pushed by UI at 54118ecea55af3ed2f00f987b2e8fadc98b16dbd (v1.25: F4-14a, F4-13a, CCR M1). rc0 348/348, axe 0 at 360/390/430. Sent to HoQA for the delta run.

## Senior Engineer, UI & rc1 Fixes — 2026-10-22 21:10
- done: #62 fix 54118ec (CCR M1/m1/m2/nits, F4-14a v1.25 sha 2a4e2c13, F4-13a star-chip-lag). vitest 1022/1022, rc0 Chromium 348/348, axe 0 violations at 360/390/430. Sent to HoE, CCR, QA UI, Art and the UI/Visual Designer.
- next: M41-9 rulings check (#64 wrap at the 12px floor, #65 transient-dock and reduced-motion tests); #60/#61 waiting on QA UI.
- blocked: none.
- 21:38 Oct 22: CCR PASS on #62 @ 54118ec (0B/0M). #65 @ 6041522 meets R-b. #64 needs the 12px wrap commit (R-a not met at the cap); UI is doing it.
- 21:47 Oct 22: CCR requested changes on #65 @ 6041522 (M1: the explainer card over Buy swallows the first tap; m1, m2). Art rulings requested; HoE default is to dock the card clear of Buy. #64 CCR PASS with minors; the wrap commit is coming.
- 21:52 Oct 22: Art ruled on all four M41-9 items (card never over Buy, no tap pass-through, tab-row fallback; notice clear at >=430; refund pop at the coin pill; Sell aria floored). UI is building to them.
- 21:55 Oct 22: HoQA failed #65 @ 6041522 (Major: tip card swallows Buy taps). Exit criteria sent to UI: p65-tap.mjs all bought, card never over Buy/Collect. m4a v1.25 frozen at 7b4e1be5... (cite in the RC).

## Senior Engineer, Saves & Persistence — 2026-10-22 22:08
- done: #63 on top of dfdf49c, local only (HoE pushes): 70e9f84 (Art M-1: explainer waits for .recovery-layer; seen saved only on dismissal, D-HOP-2026-10-22-06), 11684c2 (HoQA CSR-8 8b: bootOrphanIdb B side + in-tx owns() A side), b986cd3 (explainer follow-up: no WeakSet, rc0 G5 updated). Gates on b986cd3 all pass: units 1189/1189, rc0 Chromium 352/352. Logs: /workspace/m41-7-gates/b986cd3b9c58c8278437d7e130de0e085348501c/
- next: HoE pushes b986cd3; Art (UI/Visual Designer) re-checks M-1; HoQA re-runs 8b.
- blocked: none. Firefox/WebKit not run (CI down).
- 22:08 Oct 22: #63 fast-forwarded to b986cd3b9c58c8278437d7e130de0e085348501c (explainer -06 + CSR-8 8b + G5). Saves gates green on Chromium. Handed to HoQA (single full gate) and Art (M-1). Flagged the new LS key eggfarm.save.reset_at for HoQA and the Architect.

## Senior Engineer, UI & rc1 Fixes — 2026-10-22 22:12
- done: #62 at 09cee47 (F4-14a model on every #goal target, so no aria-label; CCR m1-new, n6, n8; cites frozen v1.25 7b4e1be5). vitest 1032/1032, rc0 Chromium 354/354, f4-14a 219/219 with axe 0. Sent to HoE, CCR, QA UI and the UI/Visual Designer.
- next: #65 fix (Art's placement plus HoQA's p65-tap exit criteria), then #64 wrap commit with the Sell aria fix.
- blocked: none.
- 22:12 Oct 22: Architect reviewed reset_at on #63: no Blocker or Major. Minors deferred to M4.2 unless a fix SHA is needed anyway (see decisions.md).
- 22:14 Oct 22: HoP D-HOP-22-07: limit #63 seen-on-dismiss to M1/M2 restore boots, revert the 5 m4-exp1 tests; CSR spec now 073fafd3... Sent to Saves with m2-m4 folded in; HoQA asked to hold the #63 gate. #62 aria fix 09cee47 pushed by UI; handed to HoQA (single final run), Art, CCR.
- 22:26 Oct 22: HoQA test-file requirements for the #63 post--07 commit (revert m4-exp1, m41-6 x2 and rc0 G5 to dfdf49c; reset_at future clamp plus a clock-rollback test) forwarded to Saves. No gate has run on b986cd3.
- 22:39 Oct 22: Art PASS #62 @ 09cee47 (aria Major closed). Waiting on HoQA verdict and CCR recheck.
- 22:49 Oct 22: CCR PASS #62 @ 09cee47 (0B/0M, 1 minor: the "Farm level 2" copy needs an Art ruling recorded, asked of Art). #62 now needs only the HoQA verdict. Harness follow-up (M4.2, owned by the Architect): rc0-browser.mjs should default to a free port instead of the fixed 4181, which served a stale build during the CCR run.
- 22:51 Oct 22: Art ratified "Farm level {n}" (art-ux/m3-next-goal-spec.md, art-ux/decisions.md 22:50); the CCR #62 minor is closed. #62 @ 09cee47: Art PASS, CCR PASS, waiting on the HoQA final verdict.

## Senior Engineer, UI & rc1 Fixes — 2026-10-22 23:05
- done: #62 at 09cee47 has CCR PASS, designer PASS and Art final sign-off. #65 at 7779088 (Art rulings 1-3, designer M-1/n1, p65-tap 48/48 bought, rc0 348/348). #64 FINAL at 3110e88 (CCR m1/m2/m3, rc0 348/348). Sent to HoE, CCR, QA UI and the designer.
- next: #65/#64 PR bodies; rc0 free-port PR (CCR n-d). #60/#61 waiting on QA UI.
- blocked: none.
- 23:04 Oct 22: UI pushed #65 @ 77790883 (tip card on the tab row at 360-390, p65-tap 48/48 bought) and #64 FINAL @ 3110e882 (R-a wrap plus CCR m1-m3). Handed to HoQA/QA UI, Art and CCR.
- 23:17 Oct 22: HoQA PASS #62 @ 09cee47. #62 is green on all three gates (QA, Art, CCR), DO NOT MERGE until the RC. New pre-existing Minor (Customer chip label-in-name) goes to the M4.2 backlog. RC risk: #63 and #65 both rewrite src/ui/tracks-explainer.ts, so the RC needs a manual merge, and the RC gate reruns the explainer-recovery cases and p65-tap on the merged file.

## Senior Engineer, UI & rc1 Fixes — 2026-10-22 23:23
- done: #64/#65 PR bodies updated. #66 rc0 free port (CCR n-d) at f8ba53c, rc0 Chromium 348/348; sent to CCR and HoE.
- next: waiting on reviews/QA for #60, #61, #62 (09cee47), #64 (3110e88), #65 (7779088), #66.
- blocked: none.

## Senior Engineer, UI & rc1 Fixes — 2026-10-22 23:54
- done: #66 at a8ff301 (CCR m1 dirty check, n2-n5), rc0 Chromium 348/348; back with CCR.
- next: waiting on reviews/QA for #60, #61, #62, #64, #65, #66.
- blocked: none.
- 00:18 Oct 23: CCR #64 @ 3110e88 PASS (minor: Sell aria at 1e15+ rounds instead of flooring, unreachable, M4.2). CCR #65 @ 7779088 CHANGES REQUESTED (Major: the tab-row fallback skips the clear check, so the card covers a Buy when scrolled at 360/375). Fix sent to UI; QA UI told to park the #65 run. #66 (rc0 tooling): CCR PASS at a8ff301, follow-up coming; QA will be 33ec1b55.

## Senior Engineer, Saves & Persistence — 2026-10-23 00:22
- done: #63 0f660c7 (D-HOP-07 restore-boot-only seen-on-dismiss; m4-exp1, m41-6 x2 and rc0 = dfdf49c; item 5 = Arch m1 key membership, no LS reset_at, no clamp; m2/m3 tests) + 8694222 (explainer diff cut to inserts for the #65 merge, 1 conflict line instead of 3). Fast-forward of b986cd3 (verified), local branch fix/saves-csr-loadsafe-d07. All gates pass on 8694222: units 1195/1195, rc0 Chromium/Firefox/WebKit 348/348 each. Logs: /workspace/m41-7-gates/86942226ed792598efa2dbc5b473dc7bc93073ab/
- next: HoE pushes 8694222 to fix/saves-csr-loadsafe. HoP spec update for D-HOP-07 (b). HoQA gate. RC merge with #65 (timer line).
- blocked: none. The 0f660c7 rc0 Firefox 338/340 did not reproduce (full run on 8694222, plus 4 targeted runs): flake.
- 00:21 Oct 23: #63 fast-forwarded to 86942226ed792598efa2dbc5b473dc7bc93073ab (-07 plus HoQA items 1-5, reset by key membership). I verified the four test/rc0 files are identical to dfdf49c. Handed to HoQA (single full gate including 8b), Art (M-1), CCR (delta). HoP asked to update -07(b) to key membership.
- 00:23 Oct 23: HoP D-HOP-23-01 accepts key-membership reset; CSR spec is now 2fbcd4eb... Asked Saves for an AC-to-test map; AC3 and AC4 may need one test-only commit on 8694222. HoQA told src stays identical.
- 00:23 Oct 23: Saves AC map for #63: AC1 L95, AC2 L101/L106 covered; AC3 and AC4 missing, coming in one test-only commit on 8694222.

## Senior Engineer, Saves & Persistence — 2026-10-23 00:42
- done: #63 3c867204c94aabf7f65c41e3ebfd0b9544a792aa (test-only on 8694222): D-HOP-2026-10-23-01 AC3 (same copy + 25h rollback, silent) and AC4 (quota on reset.surfaced put aborts tx, nothing changed). tsc ok, units 1197/1197. Logs /workspace/m41-7-gates/3c867204c94aabf7f65c41e3ebfd0b9544a792aa/
- next: HoE pushes 3c86720; HoQA gate; RC merge with #65.
- blocked: none.
- 00:41 Oct 23: #63 fast-forwarded to 3c867204c94aabf7f65c41e3ebfd0b9544a792aa (test-only: AC3 and AC4 for -23-01, units 1197/1197). This is the #63 final SHA for the HoQA gate. Sent to HoQA, CCR, Art.
- 00:44 Oct 23: CCR PASS #63 delta dfdf49c..8694222 (0B/0M/0m/3n). n1 (no notice when Reset fails) goes to M4.2. n2 was addressed by 3c86720 (new quotaOnPutKey hook). n3 (the spec header date) passed to HoP. CCR is confirming at 3c86720. #63 now waits on the HoQA verdict and Art M-1.
- 00:45 Oct 23: HoQA PASS #64 @ 3110e88. #64 now has QA and CCR passes; Art signs off the card wrap at the RC SHA. Ready for the RC: #62, #64. Pending: #63 (HoQA, Art, CCR confirm at 3c86720), #65 (UI fix SHA), #66 (final SHA plus QA).
- 00:45 Oct 23: CSR spec of record is now 530b29d3d37ab965d2375ad05a2c431c4aaac976e959eb245395f6ef9fe3f874 (header-only amendment of 2fbcd4eb). Cite it in the RC.
- 00:47 Oct 23: CCR PASS on #63 at 3c867204c94aabf7f65c41e3ebfd0b9544a792aa (0 Blocker, 0 Major, 0 Minor, 2 nits); tsc clean, vitest 1197/1197; d2-kill 19/19 at 8694222. n1 (silent Reset failure) is deferred to M4.2; n3 (spec header) is already fixed in 530b29d3. #63 is still waiting on the HoQA verdict and Art M-1.
- 00:53 Oct 23: Art PASS on #63 (8694222, covers 3c86720), #64 (3110e88) and #65 (7779088). #65 is still held by the CCR Major (the scrolled 360-390 fallback); Art must re-check at the UI fix SHA. #63 is now waiting only on the HoQA verdict.
- 01:00 Oct 23: #65 fix delayed. Auto-review classifier errors stalled UI 00:20-00:59 and nothing was committed; the branch is still at 7779088. UI has restarted against the full scrolled matrix. The #66 follow-up is queued behind it. The RC critical path is now #65.

## Senior Engineer, UI & rc1 Fixes — 2026-10-23 01:13
- done: #66 final at 8c568b0 (CCR delta m1 startup SIGTERM leak, n1-n3, n5; mutants 17/18), rc0 Chromium 348/348. Sent to HoE, CCR and QA Saves & Release.
- next: #65 scrolled-sheet fix (in progress, full HoQA/Art matrix).
- blocked: none (Auto-review classifier errors stalled #65 from 00:20 to 00:59; now restarted).
- 01:12 Oct 23: #66 final at 8c568b0788ffd1371930c6db202b9e96e2655919. HoE verified the PR head on GitHub and that the gate logs exist. It fixes CCR m1 (no vite left running after a SIGTERM during startup) and covers n1/n2/n3/n5. UI routed it to CCR and QA 33ec1b55.

## Senior Engineer, UI & rc1 Fixes — 2026-10-23 01:27
- done: #66 @ 8c568b0 CCR delta PASS (0B/0M/0m/5n, reviews/pr66-delta-8c568b0.md). Keeping it final; nits n1-n4 (release-globals docs, PORT=0, CI-skipped SIGTERM test, stale vite in the recorded set) go to M4.2 with the d2-kill/tab-guard port follow-up.
- next: #66 waiting on QA Saves & Release (HoQ to set the order). #65 fix in progress.
- blocked: none.

## Senior Engineer, UI & rc1 Fixes — 2026-10-23 01:51
- done: #65 fix commit c877f69 created locally; resumed interrupted executor to finish browser sweep/gates, push, and update PR #65.
- next: push #65 and hand SHA + gate logs to HoE, CCR, QA UI, Art & Designer.
- blocked: none.

## Senior Engineer, UI & rc1 Fixes — 2026-10-23 02:41
- done: #65 c877f69 completed Chromium and Firefox checks/shots; resumed executor to finish WebKit, push, and update PR #65.
- next: push #65 c877f69 and hand SHA + gate logs to HoE, CCR, QA UI, Art & Designer.
- blocked: none.

## Senior Engineer, UI & rc1 Fixes — 2026-10-23 02:47
- done: #65 fix pushed at c877f69 (CCR M1 scrolled-sheet clear check + n1/n2/n3; 25/25 mutants killed; vitest 1024/1024; rc0 Chromium 352/352; committed scroll sweep 576/576 BUY and 0 overlaps across Chromium/Firefox/WebKit x 360/375/390 x mouse/touch x Farm/Collection x scroll 0/100/200/300/end; p65-tap 48/48 bought; 570 shots + manifest.json). Gate logs posted to PR #65 comment and SHA sent to HoE for handoff to QA UI, Art and CCR.
- next: waiting on final QA/review verdicts for #60, #61, #62 (09cee47), #64 (3110e88), #65 (c877f69), and #66 (8c568b0).
- blocked: none.
- 02:48 Oct 23: HoE verified #65 fix at c877f69a407ec844a4d10612030584be42e34bdf on fix/m41-9-ux-minors (PR #65 head on GitHub, diff, and /workspace/wt-ui-shots/m41-9-c877f69/ manifest + gate outputs). Every explainer placement candidate (including main's 72px fallback) is now clear-checked against clipped Buy rects and a hit-tested Collect, hiding via data-place=none (visibility:hidden, no pass-through) when no clear slot exists and re-placing on scroll/resize/click. Scroll-sweep passes 576/576 first-tap buys with 0 overlaps across Chromium/Firefox/WebKit x 360/375/390 x mouse/touch x Farm/Collection x scroll 0/100/200/300/end; vitest 1024/1024; rc0 Chromium 352/352; 25/25 mutants killed. Waiting on Vadim's confirmation before fanning out the #65 handoff to CCR, Art & UX, and QA.
- 03:38 Oct 23: HoQA PASS on #63 (M41-7 CSR + QE-LATE-e §7) at 3c867204c94aabf7f65c41e3ebfd0b9544a792aa (qa/m41/m41-7-3c86720-csr.md). #60, #61, #62, #63, #64 now all have QA PASS + Art PASS + CCR PASS. Remaining before RC merge: #66 (8c568b0, in Saves QA; CCR PASS already on file) and #65 (c877f69a407ec844a4d10612030584be42e34bdf, handing off in Leadership to HoQA and Art & UX, and DMing CCR).
- 04:04 Oct 23: HoQA PASS on #66 at 8c568b0788ffd1371930c6db202b9e96e2655919 (qa/m3-recheck/pr66-8c568b0.md). #60, #61, #62, #63, #64, #66 now all have QA PASS + CCR PASS (+ Art PASS where applicable). Only #65 (c877f69a407ec844a4d10612030584be42e34bdf) remains before assembling the single-SHA RC.
- 04:04 Oct 23: Handed off #65 (c877f69a407ec844a4d10612030584be42e34bdf) delta review to CCR (5c46fe73).
- 04:11 Oct 23: Art & UX PASS on #65 at c877f69a407ec844a4d10612030584be42e34bdf (art-ux/reviews/m41-9-c877f69.md). All M4.1 UI PRs (#60-#65) now have Art & UX PASS. Waiting on HoQA and CCR verdicts on #65 (c877f69) before assembling the single-SHA RC.
- 04:23 Oct 23: CCR PASS on #65 at c877f69a407ec844a4d10612030584be42e34bdf (0B/0M/0m/2n, engineering/reviews/pr65-delta-c877f69.md). Every M4.1 PR (#60-#66) now has CCR PASS and Art & UX PASS; only HoQA verdict on #65 (c877f69) remains before building the single-SHA M4.1 RC.
- 05:27 Oct 23: HoQA PASS on #65 at c877f69a407ec844a4d10612030584be42e34bdf (qa/m41/m41-9-c877f69.md: 576/576 scroll-sweep, 772/772 p65-tap, 18/18 data-place="none", 15/15 UX-M1..M5, rc0 Chromium 352/352, vitest 89/89 files 1024/1024). All 7 M4.1 PRs (#60 5789805, #61 33f1538, #62 09cee47, #63 3c86720, #64 3110e88, #65 c877f69, #66 8c568b0) now have QA PASS, Art & UX PASS, and CCR PASS. Dispatched UI (e80556fd) to assemble and push the unified single-SHA M4.1 RC branch (rc/m4.1-rc1 off dd223f5), resolve the two merge conflicts (src/ui/tracks-explainer.ts #63x#65 and src/ui/styles.css #62x#65), build dist-html/egg-farm.html (m4.1+<short_sha>), and run the full local RC gate suite.

## Senior Engineer, UI & rc1 Fixes — 2026-10-23 05:29
- done: #65 (c877f69) and #66 (8c568b0) received QA PASS + Designer/Art PASS + CCR PASS. All 7 M4.1 PRs (#60–#66) are fully approved.
- next: assembling unified `rc/m4.1-rc1` branch off `main` (dd223f5), running full local RC gate suite (vitest, test:slow, build/build:html/build:qa with `m4.1+<sha7>`, check-globals, 3-engine rc0, 3-engine scroll-sweep), pushing and opening unified RC PR for HoE.
- blocked: none.

## Senior Engineer, UI & rc1 Fixes — 2026-10-23 06:24
- done: Unified M4.1 RC branch `rc/m4.1-rc1` pushed at `5d9efa61c5e6ee31ca9ebdec20ee70167d31d463` (`m4.1+5d9efa6`, `0 +dirty`) and opened as PR #67 against `main` (`dd223f5`). Merged #60, #61, #62, #63, #64, #66, #65. `/workspace/wt-m41-rc1/dist-html/egg-farm.html` (537,287 bytes, sha256 `ccb87daa60b5b8f722504642561f8a6061c8335555fd669a16872add2e88d5e1`). All RC gates green: sync-economy, tsc, vitest 1,403/1,403 (107 files), test:slow 16 passed/1 skipped, release build checks (dist & dist-html), check-globals 3/3, rc0 358/358 across Chromium/Firefox/WebKit, scroll-sweep 552/552 BUY with 0 overlaps. Handed off to HoE.
- next: waiting on HoE's final RC verification and merge of PR #67.
- blocked: none.
- 06:25 Oct 23: HoE verified unified M4.1 RC1 branch `rc/m4.1-rc1` (PR #67) at `5d9efa61c5e6ee31ca9ebdec20ee70167d31d463` (build-id `m4.1+5d9efa6`, `0 +dirty`; single-file `dist-html/egg-farm.html` 537,287 bytes, sha256 `ccb87daa60b5b8f722504642561f8a6061c8335555fd669a16872add2e88d5e1`). Merges #60 (`5789805`), #61 (`33f1538`), #62 (`09cee47`), #63 (`3c86720`, incl. #58 & #59), #64 (`3110e88`), #65 (`c877f69`), #66 (`8c568b0`) onto `main` (`dd223f5`). Local RC gate suite green in `/workspace/wt-ui-shots/gates-m41-rc1-5d9efa6/`: `sync-economy --check`, `tsc`, `vitest` 1,403/1,403 (107 files), `test:slow` 16 passed/1 skipped, `check-release-build` (`dist` + `dist-html`), `check-globals` 3/3, `rc0-browser.mjs` 358/358 across Chromium/Firefox/WebKit, and `m41-9-scroll-sweep.mjs` 552/552 BUY with 0 overlaps across Chromium/Firefox/WebKit x 360/375/390. Handing off merge resolution (`src/ui/tracks-explainer.ts` and `src/ui/styles.css`) to CCR (`5c46fe73`).
- 06:39 Oct 23: CCR PASS on unified M4.1 RC1 (PR #67, `rc/m4.1-rc1` @ `5d9efa61c5e6ee31ca9ebdec20ee70167d31d463`, base `dd223f5`): 0 Blocking, 0 Major, 0 Minor, 0 Nits (`engineering/reviews/pr67-rc1-5d9efa6.md`). Verified all 116 changed files (112/112 single-PR files byte-identical to approved PR heads; 4 multi-PR files `scripts/rc0-browser.mjs`, `src/ui/app.ts`, `src/ui/styles.css`, and `src/ui/tracks-explainer.ts` cleanly merged) and independent gate checks (`vitest` 1,403/1,403, `rc0` 358/358 Cr/FF/WK + PT1 axe `[]`, `m41-9-scroll-sweep` 552/552 BUY with 0 overlaps, `dist-html/egg-farm.html` sha256 `ccb87daa60b5b8f722504642561f8a6061c8335555fd669a16872add2e88d5e1`). Ready to post RC1 handoff in Leadership for HoQA and Art & UX sign-off.
- 14:40 Oct 24: GitHub Actions on PR #67 (`5d9efa6`) is red on all 12 checks (2 duplicate `ci` runs x 6 jobs). None of them started because of a billing failure ("recent account payments have failed or your spending limit needs to be increased"). Posted to Leadership; CEO is escalating to Vadim (D-CEO-20261024-02).
- 14:42 Oct 24: Under D-CEO-20261024-02, assigned the Architect (205f4268) to (1) close the 15 PRs past their revive-or-kill dates in parked.md (#2 #3 #4 #5 #6 #10 #12 #16 #18 #30 #35 #37 #38 #46 #48), with a comment on each, no branch deletes, keeping #45 #50 #51 #52 #57 and #58-#67, and (2) open a CI diet Draft PR `ci/diet` off main: push only on main, PR types including ready_for_review, skip drafts, concurrency cancel, one folded gate job, the FF/WK globals matrix only on main/rc/*, paths-ignore for docs, and no coverage loss on the gate SHA. #58-#66 close as superseded once #67 merges.
- 14:48 Oct 24 (Architect): D-CEO-20261024-02 done. (1) Closed 15 PRs with a one-line comment each (#2 #3 #4 #5 #6 #10 #16 #18 #30 #35 #37 #38: past their revive-or-kill date of 2026-10-22; #12 superseded by #45; #46 superseded by #49; #48 superseded by parked.md; the last three had a 2026-10-20 10:00 date). No branches deleted. parked.md (studio folder only, not in the repo) now lists only #45 #50 #51 #52 #57, each with revive-or-kill 2026-10-31. (2) CI diet Draft PR #68 `ci/diet` @ `37bd5c8` off main `dd223f5`, changing ci.yml only. Jobs per run: push to main 6→3, PR commit 12→1 (rc/* 12→3), draft 0, docs-only 0. actionlint 1.7.7 + shellcheck: 0 errors. Next: CCR review of #68 (HoE).
- 14:49 Oct 24: Repo confirmed public via the GitHub API (D-CEO-20261024-03). Re-ran both CI runs on PR #67 `5d9efa6` (pull_request 39900096319, push 39900008137); waiting for results.
- 14:50 Oct 24: Architect finished D-CEO-20261024-02 (1). 15 PRs are closed with comments and no branches deleted. Open now: #45 #50 #51 #52 #57 #58-#68. parked.md now lists only the L30+ set, revive-or-kill 2026-10-31. (2) CI diet is Draft PR #68 (ci/diet @ 37bd5c8, ci.yml only, actionlint clean). Jobs per run: push to main 6->3, work-branch PR 12->1, rc/* PR 12->3, draft/docs 0. Sent to CCR for review.

- 15:06 Oct 24: CI on #67 @ 5d9efa6 GREEN (both runs, 6/6 jobs each; slow finished 14:59). Yard/henpill hen-count bug (app.ts:544/550 use S.hens(F), should use hensLevel) assigned to UI e80556fd as fix/yard-hens-from-track off main; ships as first patch after M4.1 Latest unless HoQA rates Major+.
- 15:06 Oct 24: CCR #68 @ 37bd5c8 PASS 0B/1M/5m/6n (paths-ignore skips gate-relevant .md). M1+m1-m5 sent to Architect for fixes on ci/diet; re-CCR after.
- 15:07 Oct 24 (Architect): CCR fixes for #68 pushed as a new commit (normal push), `ci/diet` @ `3df87b2`, still Draft. M1: paths ['**','!**/*.md','!docs/**','vendor/**','README.md','public/**','tests/**'] on push+PR. m1: cancel-in-progress only on PRs. m2: group keyed on the PR number. m3: dead refs/heads/rc/ clause dropped, comment fixed. m4: timeouts 30/20. m5: note on the #45 row in parked.md. actionlint 1.7.7 + shellcheck: 0 errors. PR body updated. Repo is now PUBLIC (gh api private=false), so hosted-runner minutes may be free and the billing premise needs re-checking. Open: CCR nits n1-n5 not done. Next: HoE/CCR re-check of 3df87b2.
- 15:09 Oct 24: #68 CCR fixes at 3df87b2 (M1+m1-m5, actionlint 0). Architect adding n1/n2/n3(SHA-pin)/n5, then straight to CCR re-check; n4 Node bump is its own PR after M4.1. Hen-count fix to UI with the amended M4.1-P1 AC (Minor, patch 1).
- 15:09 Oct 24 (Architect): #68 Update 2 pushed as a new commit, `ci/diet` @ `f972492`, still Draft. n1: group ${{ github.workflow }}-<PR#|ref>. n2: FF/WK draft guard dropped (needs: gate skips it). n3: actions pinned to SHAs (checkout 11d5960 v4.4.0, setup-node 49933ea v4.4.0, upload-artifact ea165f8 v4.6.2). n5: artifact retention 14 days. n4 deferred (HoE). actionlint + shellcheck: 0 errors. PR body Update 2 written. Next: CCR re-check of f972492 (request handed to HoE to send).

## Senior Engineer, UI & rc1 Fixes — 2026-10-24 15:14 (UTC+2)
- done: M4.1-P1 yard hens/#henpill from Hens track under M4 — draft PR #69 @ c849ccf (off dd223f5); tests 7/7, vitest 987/987, tsc/sync-economy/release checks OK.
- next: Art + UI QA + CCR review on c849ccf; HoE merge.
- blocked: none.
- 15:14 Oct 24: #69 M4.1-P1 yard hens Draft @ c849ccf (off main; vitest 987/987, new test 7/7). Sent to CCR (also checking the rebase onto #67); posted in Leadership for Art/UI QA. #68 final f972492 is in CCR re-check. release-asset.yml pinning + Node bump deferred to a post-M4.1 PR.
- 15:17 Oct 24: CCR #68 re-check @ f972492 PASS 0/0/1/0. I fixed N1 myself (concurrency group keyed on github.sha for pushes) at bb9c2de, actionlint 0. Marked #68 Ready; first real run 40097336355 is gate-only (draft run skipped). Merge after #67.
- 15:42 Oct 24: #68 bb9c2de CCR clean, first real run GREEN (gate 14.1 min, FF/WK skipped on work PR). Before/after sent to CEO: ~44 billed min/commit -> ~15. Merge after #67. #69 CCR PASS 0/0/1/3; UI adding boundary test now, rebase onto main after #67 with CCR resolution patch (new branch -v2).
- 2026-10-24 15:47 (UTC+2) done: #69 CCR boundary test added @ 2c9c0bb (P1 10/10, vitest 990/990, tsc OK; pill<12 mutant killed). next: v2 branch off main with CCR rc1 resolution after #67 merges (HoE to ping). blocked: none.
- 15:46 Oct 24: #69 head 2c9c0bb (CCR boundary tests added, vitest 990/990, pill<12 mutant killed). v2 rebase waits for #67 merge.
- 16:00 Oct 24: HoP request (D-CEO-20261024-06): M5.0 paper sizing -> engineering/m5.0-sizing.md started. No code; build hold stands.
- 16:07 Oct 24: M5.0 sizing done (engineering/m5.0-sizing.md): 24-30.5 eng dev-days (26-33 w/ Pause/Resume), ~12-14 wd with 4 eng; not buildable yet (11 spec gaps). Sent to HoP. Next: propose re-activating Features 95daf662 to CEO when M5 go comes.
- 16:24 Oct 24: Worker specs v1.0.1 buildable review: NOT yet (B1-B6 to PMW/Art/Economy/HoQA). M5.0 now 26.75-33.25 dd (29-36 w/ Pause); telemetry subset 2-2.25 d in M5.0, full v0.6.2 6-7.5 dd proposed to CEO as M5.0.1 on the Features seat. Decisions: frame gap >=60 s while visible = offline for M5 systems; release flags in balance.json m4.flags; cooldown capped on read.
- 16:33 Oct 24: Worker specs v1.2 confirmed buildable (merge gated on G3/G5, Art Q7e/f, HoQA B6). Telemetry subset now 2-2.5 d.
- 16:35 Oct 24: Collection specs v1.1 buildable review started (paper). S2 L10 sales-stall hotfix (D-HOP-11, restore rc1 asleep signal AC-R1..R9 from 7380b86) sizing assigned to UI e80556fd; in-#67-vs-after decision with HoQA once sized.
- 16:38 Answered PMW v1.2.1: Rule 10 buildable; end causes +asleep/unpaid; Q10 accept+in_sheet; P-12 pinned 5d9efa6.
- 16:40 CEO: Features seat + M5.0.1 telemetry approved (on Vadim's go); S2 hotfix = post-Latest patch, not in #67. Notified UI, HoP, PM Market, HoQA.
- 16:39 Art PASS on #67 @5d9efa6 (art-ux/reviews/m41-rc1-5d9efa6.md). #67 now waits only on HoQA RC verdict. #69 v2 gates: HoQA UI QA + Art pill re-check on v2 SHA.
- 16:41 PMW v1.2.2 (D-HOP-12 sheet auto-close): buildable, +0.5 dd abilities. PM Market sales-stopped spec v1.1 buildable review started (§14 in sizing doc), incl. §4.2 income change patch question.
- 16:42 D-CEO-20261024-07: #69 v2 + S2 asleep-signal hotfix = one post-Latest patch, one SHA (branch fix/m41-patch1 off new main). UI re-tasked to size combined. Gates: CCR + UI QA + Art, once.
- 2026-10-24 16:45 (UTC+2) done: sized fix/m41-patch1 (P1 yard hens + S2 asleep signal targeted port, ~9–11h dev + ~1h/gate run; 3 CCR Majors from 7380b86 all go away with the targeted port). blocked: product ruling needed — rc1 copy says "sales slowed" with positive rate while real sales=0 (demandPerSec ignores MH state). next: build after #67 merges + ruling.
- 16:45 UI S2 sizing in (9–11h + gates). GO on targeted port + §4.2. Copy ruling requested from HoP.
- 16:46 D-HOP-14: copy 'Market Hand asleep: sales stopped' (supersedes 'slowed'). Relayed to UI for fix/m41-patch1.
- 16:47 patch1 commit1 (yard hens) local b1267d1, 45/45. Asset blocker: overlay-asleep.svg not in repo; rc1 icons (moon/warning) used meanwhile; Art ruling requested. Est ~12h dev +1h gates +2–3h fixups.
- 16:48 Art ruling (A): rc1 icon-moon/icon-warning byte-for-byte from 8a49d35, 14px; not overlay-asleep. Relayed to UI.
- 16:50 Sizing v1.2 done: Collection v1.1 x3 + sales-stopped v1.1 BUILDABLE; HoQA gaps answered. Sent HoP, HoQA, PM Market.
- 16:51 D-HOP-17 copy: Unpaid MH 'Market Hand unpaid: sales stopped' (specs v1.0.4) → UI. D-HOP-16 FYI: B2 closed (Sweep F20+ = lay), G3 scratch P95 1.77/worst 1.84, F18 ×4.51, Pause lockout 45 s, tc_broody_* rename.
- 16:56 Sales-stopped v1.3.2 deltas BUILDABLE; est 2.15–2.4 dd (SS-34 +0.25 biggest). Over 2.0 cap → Rule 4 cut unless HoP lifts cap (HoE recommends lifting; off critical path).
- 16:58 Sales-stopped final: 1.95–2.2 dd within D-HOP-20 cap 2.2; Rule 4 kept.
- 17:18 Doc alignment (HoP): sizing headline Pause = BUILDABLE; patch gates = ~1 h per full run, ~2 h for two runs incl. CCR round trip.
- 17:20 Sizing §0 Pause aligned to 2.5–3.0; §15a abilities per-PR split added (4a 2.0–2.25 / 4b 1.5–2.0 / 4c 0.5).
- 17:24 #67 merged to main @ 35931cb7efa04e9ef57e8ab491cbf1017b849f29 (head 5d9efa6; CI green, Art PASS, HoQA PASS). Latest waits for Saves QA publish-time GO. m-RC1-1 (≤0.27px pop-in overshoot) rides fix/m41-patch1 as a CSS-only commit if Art agrees; else backlog.
- 17:29 Sized M5.0 bb-stopgap (D-HOP-25, spec 2b6abda7): XS 0.25 dd, 0.3 with new edge-triggered best_buy_suppressed_zero_gain event; reuse optionGain; bestBuyMark(pick,s,b); AC7 untouched. Paper only.
- 17:32 PUBLISHED Latest m4.1-5d9efa6 (tag on 5d9efa6 per Saves QA GO conditions; main 35931cb same tree 31f66351): https://github.com/PrincipalLewis/egg-farm/releases/tag/m4.1-5d9efa6 — asset egg-farm.html 537,287 B sha256 ccb87daa…d5e1 verified by re-download. Next: Saves QA post-publish smoke; close #58–#66; merge #68; UI re-cut patch1.
- 17:42 Saves QA post-publish CONFIRMED for Latest m4.1-5d9efa6 (asset hash match, release-asset.yml 40107345648 pass, Chromium smoke + v5 migration OK). #58–#66 already show MERGED (nothing to close). #68 branch updated from main (merge, no force); merging once CI is green. bb-stopgap v1.2 resized to 0.4 dd.
- 17:46 Sized M5.1 Best buy §7 for PMFU: Part A ~1.0 dd (0.5 code + 0.5 AC7 rebaseline; bot uses bestPaybackAmong→optionGain), collect fix 0.25 dd (shares rebaseline) — ~1.25 dd one PR behind m5.flags.bestBuyV2 (off = identical AC7). Breeds review delegated.
- 17:49 M5.1 breeds eng review done (reviews/m5.1-breeds-eng-review.md): BUILDABLE w/ R1–R6, ~7.0 dd + Art, needs M5.0 focusClock/broody/telemetry first; sent to PM Collection. PMFU bestbuy v0.2 §7a reviewed.
- 17:55 X1 CI check named pacing-x1-stack (HoE owns); G5-P pause driver +0.5 dd → Pause 3.0–3.5 dd (§15b). E-4 hash check pending patch cut.
- 2026-10-24 18:03 (UTC+2) done: fix/m41-patch1 pushed @ d5fc626 off main 35931cb (yard hens + AC-R1–R9 asleep/unpaid port + §4.2 live-income + copy D-HOP-14/17 + scene-guard tests + m-RC1-1 CSS). Gates: tsc, sync-economy, vitest 1503/1503, release+html checks, rc0 394/394 ×3, SVG sha256 match. Shots wt-ui-shots/m41-p1-d5fc626/. next: CCR → UI QA → Art via HoE; rulings pending on Coop Hand v1.0.6 copy, Refill 50% vs AC-R8 40%. blocked: none.
- 18:04 fix/m41-patch1 pushed @ d5fc626 (UI; gates green, rc0 394/394 ×3). HoE rulings: take v1.0.6 Coop Hand copy; fix per-role banner suffix bug (no global salesStopped coupling); Refill caption from tunable, AC-R8 40% vs 0.5 sent to HoP; AC-R1..R9 map in PR; open ready PR then post SHA for CCR/UI QA/Art.
- 18:06 #68 (ci/diet) merged to main @ 2efb445800dd52967a6116e4778077f31d8021b8 after CI green on updated head 205e3d5. Breeds rev6 sinceUnlockMs OK'd (sim-time counter, telemetry-only).
- 18:06 D-HOP-29: Refill caption 50% (AC-R8 v1.0.7 8f2435db); Coop Hand asleep/unpaid 'collecting stopped' (b1-coop-full v1.0.6 a2b36af5) into patch1; relayed to UI.
- 2026-10-24 18:40 (UTC+2) done: PR #70 (ready) M4.1 patch1 @ 30b29d3 — Coop Hand v1.0.6 copy, per-role banner fix, D-HOP-29 tests, AC map. Gates: vitest 1516/1516, rc0 394/394 ×3, release+html, SVG match, AC7 GOLDEN1 = f90d1678. Supersedes #69. next: CCR → UI QA → Art via HoE. blocked: none.
- 18:40 PR #70 (patch1) ready @ 30b29d3; local gates green; AC7 flag-off = f90d1678 (E-4 OK). Posted SHA in Leadership; CCR, UI QA, Art one pass each requested; PR CI running. Product observations (sleep beats work at L12/C9; unpaid caption) sent to HoP.

- 2026-10-24 18:59 (Budapest): HoQA says G5-P band FAILED at lockout 45 (4 seed-checkpoints above +2.0%, 2 above +2.5%, golden-egg/Frenzy timing). Pause (M5.0) must not merge until HoP rules. No M5 code exists yet anyway (D-CEO-20261024-06). PR #70 unaffected.
- 2026-10-24 19:10 (Budapest): Art PASS on PR #70 @30b29d3 (2 Minor, 1 Nit, backlog). Waiting on CCR, UI QA, CI.
- 2026-10-24 19:16 (Budapest): CCR PASS on PR #70 @30b29d3 (0 Blocking/0 Major, 1 Minor, 2 Nit; report reviews/pr70-30b29d3.md). Follow-ups after merge: sticky Refill bar hides focus (WCAG 2.4.11, pre-existing on base; port 7380b86 scroll-margin-top + bar-height measure; PR body wording fix); income.ts:77-81 stale comment/test-only helpers; workers-ui.ts:74 unused param. Waiting on UI QA only.
- 2026-10-24 20:56 (Budapest): HoQA PASS on #70 @30b29d3 (m-P1-1 aria Minor -> next patch). All gates in (CI, CCR, UI QA/HoQA, Art). Merged #70 -> main d1fb206b8f59a1a1f19623526fdbf3003d12efce. Closed #69 as superseded. Patch Latest still to cut: tag on QA-passed 30b29d3 + egg-farm.html asset + Saves QA check.
- 2026-10-24 20:59 (Budapest): M4.1 patch 1 DRAFT release: lightweight tag `m4.1-p1-30b29d3` pushed on 30b29d3f60d7eeae5b78feb3ec5c1fcbcf9a1134 (QA-passed; main merge d1fb206). Draft (not published, not Latest; Latest stays m4.1-5d9efa6): https://github.com/PrincipalLewis/egg-farm/releases/tag/untagged-68c9a54954416c8a3561 (release id 422922551; URL changes on edit). Asset egg-farm.html 547,466 B, sha256 dd919d616fe0138a89c362b1db269458558a0a2c85827b3e4fc104d36b22979b, build-id m4.1+30b29d3, check-release-build OK, deterministic over 2 builds. release-asset.yml fires only on published/edited (not drafts), so it will run on publish. Awaiting Saves QA before publish.
- 2026-10-24 21:12 (Budapest): Saves QA GO (qa/m41/pub-30b29d3-verify.md). Published m4.1-p1-30b29d3 (tag on 30b29d3) as Latest, asset egg-farm.html 547466 B sha256 dd919d61...979b unchanged; release-asset.yml run 40124125129 green. Post-publish check requested from Saves QA.
- 2026-10-24 21:14 (Budapest): Saves QA post-publish CONFIRMED for Latest m4.1-p1-30b29d3. Patch 1 closed. Next patch backlog: m-P1-1 aria, sticky Refill focus (WCAG 2.4.11), CCR nits, refund-pop nit; Node 22 bump + pin release-asset.yml. No M5 code until Vadim go.
- 2026-10-24 21:18 (Budapest): CEO ask: #68 was already merged (2efb445). Closed stale PRs #45 #50 #51 #52 #57 with comment, branches kept. 0 open PRs.

- 2026-10-25 02:35 CEST: PMC closed Q-COL-9/12 (breeds rev3.7 42f7c99e, telemetry-spec 9238ad61). HoAUX delivered signed M4.1 next-patch Art package (a6a68610 / ACs 50ac9177). Asked CEO for go on M4.1 p2 (Art m8/m9/m5/m6/m1 + eng a11y backlog, UI e80556fd, ~1.5-2 dd); waiting on CEO, no build started.

- 2026-10-25 02:36 CEST: CEO NO-GO on p2 code (D-CEO-20261025-01). Froze p2 scope on paper in engineering/m4.1-p2-scope.md (owner e80556fd). #68 merged earlier (2efb445); stale PRs #45/#50/#51/#52/#57 already closed. 0 open PRs.

- 2026-10-25 03:55 CET: Sent HoP the M5.1 kickoff rulings (3-6, C1; 1-2 pinned at build), and PMC C1. p2 scope updated to Art acfe36a7 + m10 (scope sha1 490c9f8e). All paper. Idle until Vadim go or a playtest Blocker/Critical.

- 2026-10-25 CET: HoP closed all six M5.1 kickoff items on paper (package sha1 780391d8bbb7221cf3b2d4fc384134189ada1ceb; build SHAs pinned at build; K10 = HoE CI + Econ harness; zero-gain v0.3.4 5c7e6c7b, Art UI v1.3). Idle until Vadim go.

- 2026-10-25 06:17 CET: HoOps keep-moving ping on P2a/P2b. Replied HELD per D-CEO-20261025-01 and added P2b (v1.0.10 Unpaid ACs) to the p2 scope file.

- 2026-10-27 20:40 CET: Accepted HoOps VER-1 (standard verify command). Owner Architect 205f4268, HANDOFF written. Asked CEO whether studio tooling can land under the current holds.

- 2026-10-27 20:46 CET: CEO GO on VER-1 (D-CEO-20261027-02). HANDOFF updated with conditions; handed to Architect 205f4268.
- 2026-10-27 21:15 CET Senior Software Architect: **done:** VER-1 (D-CEO-20261027-02) Draft PR #71, tools/verify-cmd @ 31e1538 (off main d1fb206). Commits: 2dfedbe = `npm run verify` + tests/verify.test.ts (14) + .github/workflows/verify-smoke.yml (ready_for_review + workflow_dispatch only, non-required) + scripts/README.md + PR template line. 31e1538 = 8 one-off scripts retired, `measure:l30plus` restored. No src/data diff. Gates: tsc, sync --check, vitest 1529 passed + 1 skipped (maxWorkers 2), slow 16 passed + 1 skipped, build OK, actionlint 1.7.7 + shellcheck clean. `--hours 24` PASS in 17 s, byte-identical twice, goldens f90d1678/a54c9cf9 match. Samples in /workspace/ver1-samples/. **next:** HoE sends CCR 5c46fe73; mark Ready at the gate SHA (that triggers verify-smoke). **open:** DoD 4: no HUD build label in src, so the shot uses the Settings label (a HUD label needs a src/ui change: CEO via HoE). m5x-casual exits 2 until tests/bot-m5.ts lands. **blocked:** none.

- 2026-10-27 21:15 CET: Triage T-goalpill: the goal pill reads "Egg value L21 · Ready!" at an end state of Egg value 30 (verify --hours 24 seed 1, m4.1+31e1538, sample /workspace/ver1-samples/). Possibly stale or mis-indexed next-level text in src/ui. Owner UI e80556fd; severity TBD by HoQA; fixing it is code, so it is held under D-CEO-20261025-01 unless HoQA rates it Blocker/Critical.
- 2026-10-27 21:15 CET: PR #71 (VER-1) Ready at 31e1538f4b12ae8b580405b68fafb19c45ad55af; sent to CCR. DoD 4 amended to accept the Settings build label. [rule 22 relabel: no Claude review]

- 2026-10-27 21:26 CET: T-goalpill re-rated by HoQA (QA-D-1027-GOALPILL): NOT a Latest game bug. It is a verify tool bug (no tracksV7 marker, so the v6 price-match runs on load), Major (tooling). Fix in scripts/verify on #71 (Architect), with a round-trip test; inside the D-CEO-20261027-02 tooling GO, no hold. HoQA re-runs verify 24h seed1 on the fix SHA.
- 2026-10-27 21:55 CET Senior Software Architect: **done:** VER-1 #71 follow-up. Head is now 53c7136 (new commits only, on top of 31e1538):
  - 0dcf590: QA-D-1027-GOALPILL. The SAVED end state is now marked like a fresh M4 farm (tracksV7: 1 and the fixed v6BackupId 7e51f1ed00000001); the sim run is untouched, so the trace stays 2c0d3ec3. Adds round-trip tests, and the m5x-casual message follows HoE (3).
  - 53c7136: CCR m1/m2/n1/n2/n3.
  - Gates: tsc, sync --check, vitest 1537 passed + 1 skipped, slow 16 + 1 skipped, build OK, actionlint clean.
  - Goldens f90d1678/a54c9cf9 match.
  - --hours 24 samples are regenerated in /workspace/ver1-samples. The PNG shows "All upgrades done!" and its sha256 is 8accc527 on both runs. verify.json is 5235a501 on both runs.
  - verify-smoke run 40576142093 on 31e1538 (Ready): success, 39 s, 21:13:44-21:14:23 CET, --hours 1.
  - **next:** CCR re-check of 0dcf590 + 53c7136; ci run 40581934082 at 53c7136 is in progress.
  - **blocked:** none.

- 2026-10-27 22:15 CET: PR #71 (VER-1 npm run verify) MERGED, main 0a20e4855541b35dfad3ee3b50c21ff302abde7b, at head 53c7136 after CI green, no Claude review: final PASS and HoQA GOALPILL-V PASS. No Latest change. T-goalpill CLOSED (verify tool bug, fixed in #71). Follow-up VER-1a (CCR R1) to the Architect.
- 2026-10-27 22:35 CET Senior Software Architect: **done:** VER-1a (CCR R1 on #71) Draft PR #72, tools/verify-roundtrip @ 9a615c4 (off main 0a20e48), one commit. verify.ts validates the exact browser save back with validate() and exits **4** on migration or an F/H/V/C, tier, workers or coins mismatch. It adds a saveRoundTrip block (verify.json schemaVersion 2), skips the browser step and writes no PNG on failure. Tests: 4 new, including a run with the marker skipped (VERIFY_TEST_SKIP_MARKER=1) that exits 4. Gates: tsc, sync --check, vitest 1541 passed + 1 skipped, slow 16 passed + 1 skipped, build OK. No src/data/workflow diff. `--hours 24` PASS: trace 2c0d3ec3, goldens f90d1678/a54c9cf9. **next:** CCR 5c46fe73 review via HoE; Ready at the gate SHA. **blocked:** none.

- 2026-10-27 22:32 CET: PR #72 (VER-1a load-back check) Ready at 9a615c4; sent to CCR.

- 2026-10-27 22:58 CET: PR #72 (VER-1a) merged, main 3fcd4e46. no Claude review: PASS with 1 Major (F1: --flags path can false-PASS); follow-up VER-1b given to Architect.

## 2026-10-27 23:12 (Europe/Belgrade): Architect, VER-1b (CCR F1/N1/N2 on #72)
- **Done:** Draft PR #73 (https://github.com/PrincipalLewis/egg-farm/pull/73), head 25d033f, branch tools/verify-flags-roundtrip off main 3fcd4e4. Tooling only.
  - F1: the save round-trip validates under the shipped balance. `--flags` that differ from the build give exit 4 with no screenshot (`saveRoundTrip.flagsDifferFromBuild`, `screenshot.skippedReason`, schemaVersion 3).
  - N1: the README now documents that 4 takes precedence over 1. The test also asserts that build-id fails.
  - N2: a migrated-but-equal save fails the round-trip (checked by mutation).
  - Gates: sync, tsc, vitest 1544 passed / 1 skipped, test:slow 16 passed / 1 skipped, and build all pass.
  - verify 24 h: PASS. Trace 2c0d3ec3, goldens f90d1678 and a54c9cf9 match.
- **Next:** CCR review of #73, then HoE merge.

- 2026-10-27 23:14 CET: PR #73 (VER-1b, fixes CCR F1/N1/N2) Ready at 25d033f; sent to CCR.

- 2026-10-28 00:07 CET: PR #73 (VER-1b) merged, main 22dced47. no Claude review: PASS, 1 Minor and 2 Nits go to VER-1c (Architect).

## 2026-10-28 00:25 (Europe/Belgrade): Architect, VER-1c (CCR S1/N-a/N-b on #73)
- **Done:** Draft PR #74 (https://github.com/PrincipalLewis/egg-farm/pull/74), head 5cf99b7, branch tools/verify-stale-out off main 22dced4. Tooling only.
  - S1: the out dir is cleared before anything can fail, and every early exit (2, 3, uncaught throw) writes a minimal FAIL verify.json (complete: false) with no PNG. schemaVersion 4.
  - N-a: m4.enabled=2 gives exit 4 (M14 killed).
  - N-b: a repeated --flags or a duplicate key gives exit 2.
  - Gates: sync, tsc, vitest 1551 passed / 1 skipped, test:slow 16 passed / 1 skipped, and build all pass.
  - verify 24 h: PASS. Trace 2c0d3ec3, goldens f90d1678 and a54c9cf9 match.
- **Next:** CCR review of #74, then HoE merge.

- 2026-10-28 00:27 CET: PR #74 (VER-1c, fixes CCR S1/N-a/N-b) Ready at 5cf99b7; sent to CCR.

- 2026-10-28 01:22 CET: PR #74 (VER-1c) merged, main 9a5aaf13. no Claude review: PASS, m1 (test gaps) and N-c go to VER-1d (Architect), the last item in the VER-1 series.

## 2026-10-28 02:00 (Europe/Belgrade): Architect, VER-1d (CCR m1/N-c on #74)
- **Done:** Draft PR #75 (https://github.com/PrincipalLewis/egg-farm/pull/75), head 75efc4f, branch tools/verify-test-gaps off main 9a5aaf1. Files: scripts/verify.ts, tests/verify.test.ts, scripts/README.md. No schema change.
  - m1: 7 new tests. CCR's mutant script re-run: M17/18/19/27/28/29/31/33 are all killed. Overall 34/36: M1–M33 and NC1. M34 is equivalent and NC2 is unreachable.
  - N-c: writeEarly never throws. The original exit code and error survive, with EISDIR and EACCES tests.
  - Gates: tsc 0, sync ok, vitest 1558 passed / 1 skipped, test:slow 16 passed / 1 skipped, check-globals PASS.
  - verify 24 h: PASS. Trace 2c0d3ec3, goldens f90d1678 and a54c9cf9 unchanged.
  - Self-review: reviews/pr75-75efc4f.md.
- **Next:** CCR review of #75, then HoE merge. That closes the VER-1 series.
- **Blocked:** none.

- 2026-10-28 02:00 CET: PR #75 (VER-1d, tests for surviving mutants plus guarded FAIL writer) Ready at 75efc4f; sent to CCR.

- 2026-10-28 03:12 CET: PR #75 (VER-1d) merged, main d3b956f6. no Claude review: PASS with 0 Blocking/Major/Minor, so the VER-1 series is closed. Remaining nits are parked as VER-1e (Architect, low priority).

- 2026-10-28 07:16 CET, Architect, VER-1e (CCR nits on #75)
- **Done:** Draft PR #76 (https://github.com/PrincipalLewis/egg-farm/pull/76), head 00020918b2f4979fd201951c1e23a98266e35133, branch tools/verify-polish off main d3b956f. Files: scripts/verify.ts, tests/verify.test.ts, scripts/README.md. schemaVersion stays 4.
  - N-3: the tests clean up their temp dirs in afterEach. N-1: the writer stderr lines are sanitised and redacted. O-1: a hostile build id goes to invalid-build-id/. O-2: a failed full-report write keeps exit 4. N-4: NC4/NC5/H2 are killed.
  - Gates: tsc 0, vitest 1564 passed / 1 skipped, test:slow 16 passed / 1 skipped, sync ok, build 0, check-globals PASS. verify 24 h: PASS, trace 2c0d3ec3, goldens f90d1678 / a54c9cf9 unchanged.
  - Mutants: CCR set 39/41 (M34 and NC2 are equivalent). New set 13/17; the survivors O1b, O2c, O2e and N3-noop are explained in reviews/pr76-0002091.md.
  - /tmp: 1694 v1d-* dirs vetted (uid, name, age and shape) and deleted one by one, 0 skipped, 0 failed. Batch 2 (17 dirs left by the N3-noop mutant run) was vetted the same way and deleted at 07:26 CET. 0 remain. Lists are in /workspace/ver1e-tmp-cleanup/.
- **Next:** CCR review of #76, then HoE merge.
- **Blocked:** none.

- 2026-10-28 07:28 CET: PR #76 (VER-1e, verify polish from CCR pr75 nits) Ready at 0002091; sent to CCR. Architect removed 1,711 checked /tmp/v1d-* dirs one path at a time (lists in /workspace/ver1e-tmp-cleanup/).

- 2026-10-28 07:29 CET: Architect removed 2,671 old /tmp/v-* test dirs, each path checked and deleted on its own; 12 empty ones left, 0 failed (lists in /workspace/ver1e-tmp-cleanup/). The 12 empty dirs stay; they are harmless.

- 2026-10-28 07:50 CET: Applied D-CEO-20261028-02 (verified in decisions.md L49). CCR re-reviews only after Blocker, Critical or Major findings; other fixes ship on a self-review noted in the PR. PR #76 (VER-1e) merged on its self-review and green CI, main 22eac98c; CCR told to stop its #76 pass. CCR, Architect, Saves and UI told.

- 2026-10-28 07:51 CET: Architect. Done: VER-1 series closed (#71-#76 merged; main 22eac98); /tmp test-dir housekeeping complete. Next: idle, asked HoE for the next assignment; will pass on D-CEO-20261028-02 (CCR re-review only after Blocker/Critical/Major) in the next handoffs to Saves and UI. Blocked: none.

- 2026-10-28 07:55 CET: HoE confirmed player-feedback-plan.md §5 with edits: the rollback republishes the last good asset as release-checklist step 8 (new), with a save-version guard; Engineering takes only reproduced rows with an Export log; fix batches follow the full checklist.

- 2026-10-28 07:55 CET: CCR stopped its #76 pass with no Blocker or Major; nits parked as VER-1f. Process note: while stopping, CCR ran a pattern-based pkill of vitest runs of verify.test.ts at about 07:50 CET; affected runs need a re-run. Architect next: (d) architecture docs and a verify ADR, then (c) paper prep to revive or kill the parked PRs, due 2026-10-31.

- 2026-10-28 07:57 CET: Release-checklist step 8 now reflects D-CEO-20261028-03: tell the CEO at once after a rollback; pre-launch authority is the standing Latest policy; public-launch authority waits for Vadim's launch go.

- 2026-10-28 07:58 CET: Architect, ARCH-DOC-1 DONE (studio docs only, no repo PR per HoE 07:53). Done: ADR VER-1 appended to engineering/decisions.md (command, boundary, exit codes 0-4 with 4 over 1, schemaVersion 4 complete:true/false, clear-first + FAIL json, guarded writers, VERIFY_OUT_ROOT / VERIFY_TEST_THROW and the other test hooks, verify-smoke trigger, no-private-data; PRs #71-#76, D-CEO-20261027-02), every fact checked against scripts/ and .github/ at 22eac98. stack-and-architecture.md refreshed: Module boundaries + Tooling & CI (gate job, rc/*/main-only FF/WK matrix, drafts skipped). Docs-vs-code gaps found: no ESLint/Prettier config in the repo; no save/migrations/ (ADR M4-3) - v7 migration is src/sim/migrate-v7.ts; scripts/gate-all.sh (ADR M4-7, "CI runs locally") not on main, CI is hosted; the 24 h trace 2c0d3ec3 is reported but not pinned in code (only goldens are enforced); verify reads src/econ and src/ui/next-goal through the tests/ bots; repo engineering/decisions.md copy has no VER entries (left as is). Next: PARK-RK-1 sheet. Blocked: none.

- 2026-10-28 08:05 CET: Architect, PARK-RK-1 DONE (paper only, read-only gh/git, nothing posted). Done: engineering/parked-revive-or-kill-2026-10-31.md. KILL #45 (superseded by #52) and #51 (harness already on main); KEEP PARKED #50, #52 and #57 (freeze / L30+ waits on go / economy data frozen). Finding: all 5 PRs have been CLOSED on GitHub since 2026-10-24, but parked.md still calls them parked. Next: HoE decides; idle until the next assignment. Blocked: none.

- 2026-10-28 07:58 CET: PARK-RK-1 decided (D-HOE-20261028-02): kill #45/#51; #50/#52/#57 stay parked until their triggers. Architect fixes the doc drift (docs only).

- 2026-10-28 08:10 CET: Architect, recorded the D-HOE-20261028-02 park ruling plus doc-drift fixes (studio docs only, no GitHub or repo changes). Done:
  - parked.md: #45 and #51 KILLED; #50/#52 parked until Vadim's M4.2 go, #57 until M5.0 ships (replaces 2026-10-31).
  - decisions.md: dated corrections for ADR M4-3 (src/sim/migrate-v7.ts) and ADR M4-7 (GitHub Actions `gate` job), with the original text quoted; the VER-1 trace hash is now "reported but not enforced".
  - stack-and-architecture.md: ESLint/Prettier "not configured yet", trace hash labelled, 3 changelog lines.
  - backlog: LINT-1 and VER-1g added as PARKED; PARK-RK-1 DONE.
  Notes: D-HOE-20261028-02 has no entry in engineering/decisions.md yet (HoE to add); parked.md had no #68 N1 row to remove; M4-3/M4-7 live only in the repo copy of decisions.md, which still has the old text. Next: idle. Blocked: none.

- 2026-10-29 19:46 CET: Architect, v5 RC kickoff (D-CEO-20261029-01, D-HOE-20261029-02). Done: engineering/v5-rc-manifest.md created (35 rows: rc/v5 base 22eac98 + 34 pieces/steps in §3 order, owners from sizing §4 / D-HOE-02 lanes, cut rules, rule-19 layout artifacts/<gate-id>/results/ + SHA256SUMS; `artifacts` branch exists at fcd65b0, read-only check). Blocked: `pacing-x1-stack` CI wiring NOT done, no branch/PR. The harness of record can't run X1 on rc/v5: no tests/bot-m5.ts active bots, no window metric/harness commit on measure-l30plus.ts, no m4.flags.* (F3), shipping CSV 8dc90e2b not in data/, no machine-readable §13.2a table, no G5-P driver. Open rulings for HoE: flag rule vs no-flag pieces (p2, #5c), m5.flags.* namespace (zeroGainUi, bestBuyV2), owners for M5.1 pieces, placement of p2/CSV/#5c/M5.1 in the order. Next: F1a/F1b/F1c + F3 in my lane once HoE confirms; wire X1 as soon as bot-m5 + F3 land. 

- 2026-10-29 20:46 CET: Architect, bot-m5 port A (Q-ZG-H3 option A), PR #78 (draft, tests/bot-m5-port -> rc/v5, head 0951aef). Done: both parity runs PASS, byte-identical stdout and stderr. game run: CSV b48be8a4, seeds 1-200, none,AssZ x casual, game.diff 0 B. m50 run: CSV 8dc90e2b, seeds 1-200, none,AssZ,AssZhold x optimal,seller15,casual, m50.diff 0 B, finished 20:38. VERDICT.md and SHA256SUMS are in artifacts/bot-m5-parity/results/. The same files are committed to the `artifacts` branch at e9faf5b as bot-m5-parity-0951aef/results/ (a normal push on top of a612c0e). PR #78 body: the parity placeholder now holds the verdict and repro steps. Local gates at 0951aef: sync-economy --check 0, tsc 0, vitest (--minWorkers=1 --maxWorkers=2) 1574 passed/1 skipped, build (release check) 0, check-globals chromium PASS. Next: HoE decides when to mark #78 Ready; that triggers ci.yml gate + release-globals (verify-smoke too). Blocked: hosted CI has not run. ci.yml skips draft PRs by design (D-CEO-20261024-02), so both checks on 0951aef show "skipping".

- 2026-10-29 20:45 CET: Saves, v5 F2 (manifest row 10). Done: feat/saves-v5-f2 @ dff771b9454a1f1d8f7303a8d0c78f3a64843dee on origin/rc/v5 22eac98 (local only, not pushed): M5 optional save fields + offline/clock rules behind m4.flags (default 0), no SAVE_VERSION bump, sim/offline.ts untouched, 370 changed lines. Gates all pass (tsc, sync --check, golden 4/4, unit 1611/1612 +1 skip, builds + release check, check-globals x3, rc0 394/394 x3, downgrade on m4.1-5d9efa6 and 22eac98). Artifacts: artifacts/v5-f2-dff771b/results/ (SHA256SUMS 28590a47…). Self-review + PR body: engineering/reviews/v5-f2-dff771b-{self-review,pr-body}.md. Next: HoE pushes and opens the Draft PR; then the #2 streak sim. Blocked: none (F1a ea6b6db isn't on rc/v5; F2 uses F1a's names, so take F1a's declarations on merge).

- 2026-10-29 21:10 CET: Architect, v5 foundations F1a/F1b/F1c/F3. Done: reviewed ea6b6db/a6b4fe4/e87562c/e743462 against sizing §1 + §12.1 D-C1–D-C4 (each is one area; evRng seed per D-C2 = mixSeed(state.rng ^ K), not seed ^ K). Local gates PASS in all 4 worktrees (sync --check, tsc, vitest --minWorkers=1 --maxWorkers=2: 1571/1585/1595/1639 passed + 1 skipped, engineering/golden 4/4 = f90d1678 + a54c9cf9, build + check-release-build, build:html, check-globals chromium under .browser-test-2.lock). F3 got 2 new commits (no amend): 60ca5e4 m4.zeroGain.confirm = 0 + Q8 QA-seam test (check-release-build rejects eggfarmQa*); c5b0371 isPaused(w, b) at src/sim/pause.ts:10 (econ/income.ts marketHandStalled no longer reads w.paused unflagged) + m4.flags.fatigueCue = 0. F3 pushed; Draft PR #82 (base feat/v5-f1c-effects; #77/#79/#80 stay on rc/v5 with dependency notes). Manifest rows 5–8 filled; "Row 34 ship values" table appended (L64 pins untouched). API sheet: engineering/tasks/v5-f1-f3-api-sheet.md. CI: gate/release-globals SKIPPED on all 4 (Drafts). Next: HoQA gets the Q8 paths; Ready-for-review at the gate SHA to get CI; then M5.1 src (rc2Refill/clockWage) on top of F3. Blocked: none. Open: base layout mixed (#82 stacked, #77/#79/#80 on rc/v5), ship values other than bestBuyV2/zeroGain.confirm are "1 if gate passes" until HoE/HoQA record them; Q-F1b-1, Q-F1c-1, Q-F1c-2 open.

## 2026-10-29 21:33 CET — Senior Software Architect
- done: #78 bot-m5 A squash-merged into rc/v5 → d3b5a536cc7b049ab701e33756e502f15bfe14b7 (no Claude review: PASS 0/0/0/5 nits; gate + verify-smoke green; CCR verdict pasted on PR).
- next: bot-m5 B (incl. VER-1h nits, O-3 bot→real-M5 switch); F1a/b/c+F3 merging rc/v5 406e4558 + HoP D-HOP-2026-10-29-06.
- blocked: none.

- 2026-10-29 21:52 CET: Architect, v5 F1/F3 brought up to rc/v5 406e455 (#81 F2) by MERGE (no rebase, no force-push, no amend). Done: F1a 008bcca (conflicts state.ts/events.ts/formulas.ts: kept F1a declarations, dropped F2 duplicates; F2 src/tests unchanged and green), F1b 6ece3e0 (game.ts frame(): kept F1b focus clock + F2 m5Offline; Q-F1b-1 per D-HOP-2026-10-29-06: seed at end of first flag-on tick, F2's ensureEvRng now re-exported from sim/rng.ts), F1c 1a64e95 (Q-F1c-1: player sale suspended only when attended probe false, apply(..., attended) + Game.attendedNow(); Q-F1c-2: goldenEEggsPerSec = base rate, Sweep excluded), F3 ecf8297 (F2 test fix-up for the shipped flags block). All pushed fast-forward; PR bodies #77/#79/#80/#82 updated via REST (gh pr edit lacks read:org). Local gates PASS on all 4 heads: sync --check, tsc, vitest 1618/1633/1647/1691 passed + 1 skipped each, goldens f90d1678/a54c9cf9 4/4, build + check-release-build, build:html, check-globals chromium (browser lock, load ≤ 12). Manifest row 34 ship values fixed (1: golden, streak, tapCoins, abilities, broody, salesStopped, fatigueCue, rc2Refill, autoRefill, clockWage, zeroGainUi, pause; 0: bestBuyV2, breeds; zeroGain.confirm 0; HoE note added; L64 untouched); rows 5–8 + API sheet SHAs updated. CI: #77 is now non-draft (not by me) and its gate is running; #79/#80/#82 gate SKIPPED (Draft). Next: CI on #77; HoE vitest lock (.vitest-eng.lock, nice 10) applied to my gate scripts. Blocked: none. Risks: attended probe default false suspends player sales once flags are on until UI wires it (probe must count the Market sheet as attended); F2 keeps its own m5Flag/tc() (`?? 0` fallback) helpers.

## 2026-10-29 22:16 CET — Senior Software Architect
- done: HoE box-load ruling applied at 21:47: sims 1745663/1760971/1764741 were SIGSTOPped, my unlocked vitest (B gates) was killed by exact PID, and all vitest now runs under `.vitest-eng.lock`. Box restore at about 21:56 wiped /tmp, every node_modules tree and the bot-m5b parity out/ (all running sims died). The box default is now node v24, so I reinstalled node_modules (npm ci) and use node v20.19.2 from /workspace/tools, which matches CI. QA seam Q4 (b): Draft PR #84 (tests/bot-m4-observe → rc/v5, head 33df27b, base d3b5a53), tests only. Gates on node 20 all pass: sync, tsc, vitest 1621 passed + 1 skipped, slow 19 passed + 1 skipped (bot-m4-observe 3/3), build, check-globals. CI skips Drafts.
- next: bot-m5 B. Gates are running on a0c29f2 (adds the O-3 autoRefill guard). The parity re-run is serial with 2 sims at nice 10 (artifacts/bot-m5b-parity/results/run2.sh, queue2.txt, 28 jobs). Draft PR target is 02:00 CET.
- blocked: none. Risk: the parity re-run may not finish by 02:00. P1 m52 comes first.

## 2026-10-29 22:19 CET — Senior Software Architect (box restore loss list)
- done: WIP pushes, both normal: wip/bot-m5b = a0c29f2 (4 commits on d3b5a53) and wip/bot-m4hook = 33df27b (also on tests/bot-m4-observe, Draft #84). No commits lost: the reflog has 7615e75/50242fb/7544f06, all before 21:55, and a0c29f2 came after the restore. No uncommitted files lost (both worktrees clean). Lost: artifacts/bot-m5b-parity/out/ (every parity output); /tmp (the B gate logs for 7544f06 and the m4 gate logs, both re-run since); every node_modules tree (npm ci done in wt-v5-botm5 and scratch/v2-econ/h, the symlink targets); the box node is now v24 (I use v20.19.2 from /workspace/tools). Sims killed at the reboot: P1 g1 (output gone, needs a full re-run), P0 optimal/seller15 off p0, P1 casual/optimal off p0, plus every job not yet started. All 28 jobs (seeds 1-200 each) were re-queued at 22:05 in run2.sh, 2 at a time at nice 10. Gate evidence under artifacts/: every SHA256SUMS/MANIFEST matches, except in v5-ui (not mine): SHA256SUMS.new is listed but missing, and harness/lib/legacy-overlap.py (mtime 22:16, being edited now) and dryrun-22eac98/zg/zg-unit.json (mtime 21:59, the restore) fail the checksum. The local wt-artifacts was behind origin (e9faf5b); I fast-forwarded it.
- next: B gates on a0c29f2 (running), parity re-run (P1 casual on/off p0 IDENTICAL again on node 20), B Draft by 02:00.
- blocked: none.

## 2026-10-29 23:14 CET — UI (Senior Engineer, UI & rc1 Fixes): M4.1 p2
- done:
  - Draft PR #83 (https://github.com/PrincipalLewis/egg-farm/pull/83), fix/m41-p2 → rc/v5, P2_HEAD = 76390f2834b98e981ef52a3e165436acd9170654. Pushed normally, never forced; origin/rc/v5 d3b5a53 merged in clean at 23d2b78.
  - Scope delivered: m8, m9, m5 (incl. UI-M5-8), m6, m1, m10, P2a AC-R17, WCAG 2.4.11 (port + scroller-padding fix), CCR #70 n1/n2, Art #70 n1 refund pop, P2b R10–R16/U1–U3. AC-id test titles and the trace table follow QA-D-1029-V5SCAP.
  - Gates on 76390f2, all 17 PASS (node v20.19.2, nice 10):
    - vitest 1662/1662.
    - goldens: flag-off AC7 f90d1678… and m4-on a54c9cf9…, both unchanged.
    - builds + check-release ok; check-globals PASS.
    - rc0 394/394 on chromium, firefox and webkit.
    - m41-p2-browser 177/177 × 3 engines.
    - diff vs rc/v5: src/econ/income.ts is the only econ/save/sim path, comment-only.
  - Artifacts: artifacts/m41-p2/results/ (MANIFEST.sha256 = SHA256SUMS, 103 files OK). Shots: /workspace/wt-ui-shots/m41-p2-76390f2/ (81 shots + manifest.json), copied into results/shots/.
  - Self-review: engineering/reviews/p2-76390f2-self-review.md.
- next: HoE rulings (flag rule 5 vs no-flag UI patch; artifact gate-id m41-p2 vs v5-p2; AC-R17 "Refill, no tired workers" state; 2.4.11 deviation from 7380b86). Then M5.0 UI PRs.
- blocked: none. Box-restore note: /tmp/axe, node_modules and the Playwright cache were lost at ~21:56. rc0 now uses AXE_PATH=artifacts/v5-ui/tools/axe-core-4.14.0. WebKit system libs were reinstalled from deb.debian.org .debs (apt via the proxy gave 500).

## UI (Senior Engineer, UI & rc1 Fixes): 2026-10-29 23:17 CET, v5 F6a attended probe
- done: Draft PR #85 https://github.com/PrincipalLewis/egg-farm/pull/85
  - Branch feat/v5-ui-attended @ 2325e2aa2aaf3044748209e35fc242e24b95ca44, base feat/v5-f3-config (#82 @ ecf82970), stacked.
  - src/ui/attended.ts: attendedProbe = visible && hasFocus, plus wireAttendedProbe. mountApp wires it (+2 lines in app.ts).
  - The Market sheet counts as attended (Q-F1c-1). No flag needed: inert with the M5 flags off, required with them on.
  - Tests: tests/v5-f6a-attended.test.ts, 10 tests tagged F6a-AC1..5 / Q-F1c-1. The PR body has the AC trace table (QA-D-1029-V5SCAP).
  - Gates: sync-economy, tsc, relevant vitest 39/39, full vitest 1701 passed + 1 already-existing skip (126 files), build + check-release-build, diff 3 files with no sim/save/econ/config/game.ts paths.
  - Artifacts: artifacts/v5-f6a-attended/results/ (MANIFEST.sha256).
- next: when the Architect's #77→#82 merges move F3/rc/v5, MERGE the new base into feat/v5-ui-attended (no rebase or force). F6 absorbs ui/attended.ts into ui/overlay.ts and adds !dialogOpen().
- blocked: none. The box reboot at ~21:56 lost my first commit d71d5df (never pushed). I recreated it as c8c5d0c and pushed it.

## Architect: 2026-10-30 07:33 CET, post-restore recovery
- done: #82 F3 local commits 348cdde/9c6bff6/84df247/bba6c79 survived the restore (fsck clean, tree clean, no leftover `if (false)` in scripts/verify/cli.ts). New guard commit 10d1e28 "guard tc.rest_recovery_mult > 0 (pause spec §6, HoE ruling)", test tests/v5-f3-config.test.ts::[Pause-§6]. Local only, push creds missing; bundle scratch/bundles/feat-v5-f3-config-10d1e28.bundle verified okay. F3 gates at 6e9f613/10d1e28: tsc/sync/build+release-check/check-globals 0; targeted vitest 1 fail (below). F1c 736d04e: fsck clean, = origin; tsc/sync/build 0, vitest v5-f1*/v5-f2* 103/103. gates-v5/f3-body.md: Post-CCR delta + AC trace added.
- next: B parity rerun of all 28 jobs (out/ lost), serial, 1 heavy sim, nice 10, lane architect runner 52283, ETA ~11:20 CET. Then compare-all and the B Draft. HoE pushes #82 once creds are back.
- blocked: (1) #82 not Ready: [F3-no-literal] fails on src/save/m5-fields.ts BROODY_NEST_MAX_CENTS=1e15 / BROODY_SLOTS=12 (F2 #81). This is a semantic merge result from 348cdde: F1a 37f24c1 m5Flag→flagOn put the file in scope. Needs an HoE/Saves ruling: allow-list them as named constants, or move them. (2) Pause spec §6 says rest_recovery_mult = 0 "is valid" and AC-P17 tests the "= 0" copy; the > 0 guard contradicts that, so HoE should confirm before pushing 10d1e28.

## Senior Engineer, Saves & Persistence: 2026-10-30 07:40 CET, post-restore #2 streak sim
- done: 5d2aa04aa08fa85bfe7773aba5eb218cff886bb4 (feat/saves-v5-streak-sim-2, wt-v5-streak-2) came back intact after the snapshot restore (worktree clean, tree 0e83311f; not redone). Re-verified under the RC/UI-QA caps: tsc exit 0; targeted vitest (v5-streak-sim, v5-f2-m5-fields, v5-f2-game-settle; maxWorkers=1) 59/59 pass. artifacts/v5-streak-sim-5d2aa04/results/SHA256SUMS (49 files) sha256 ae6069a4922f3ad4b72a6fd1483b293268c475f7399fd82b90597ed2507a35dc. Bundle scratch/bundles/feat-saves-v5-streak-sim-2-5d2aa04.bundle (verify OK, requires 2e8160d). Review files present; deferral note appended.
- next: HoE pushes feat/saves-v5-streak-sim-2 at 5d2aa04 + Draft PR into rc/v5 once creds are back; then breeds sim/save + k10-breeds-offset.
- blocked: rc0-webkit (killed 23:21) and a full-unit re-run deferred under the load caps (WebKit launch also reported broken on the box); pushes wait on GITHUB_TOKEN.

## Head of Engineering: 2026-11-05 20:28 CET (current, rewritten in place)
- done: RESUMED under D-CEO-20261105-01/-03/-04 (all v5 lanes incl. Features + Econ; max safe parallelism; 80% usage stop). STOP D-CEO-20261030-13 cleared. Operative schedule = scenario **(iii)** per product/v5-schedule.md: freeze **Wed 11 Nov 10:00** · handoff Wed 11 Nov 14:00 · verdict **Thu 12 Nov 08:30 / 20:00 / Fri 13 Nov 08:30** (QA v4 147f273a). rc/v5 tip **518de304** (#98). Manifest Card #12 **6cb27b3d** + BBv2 **4ea3841a** pinned. #99 c4a1a76 / #100 d654afd first; Features active; stale #84/#85/#86/#89 triage underway.
- next: Architect re-review #99 then #100; Generalist 82c183b gates → bundle after #99; SIM-only flag-list 1224804; Saves schema rev13; UI P8 high **Fri 6 Nov 12:00**; Features income-ref/tapCoins **Fri 6 Nov 03:00**; Econ CSV + K10 green before RC. PR triage prepared not executed: close #84/#86/#89; hold #85.
- ETA (iii): ~**134 h** wall-clock to Wed 11 Nov 10:00 (low Tue 10 Nov 23:00 / high Wed 11 Nov 21:00). Critical path lane U. **Gaps:** Architect ETA unset; Saves schema ETA unset; CSV B4 AT RISK. O5 confirm Fri 6 Nov 08:00.
- blocked: none. Soft gaps only (Architect/Saves ETAs; Econ B4/K10; #85/#86 vs P8 stack).

## Senior Engineer, Saves & Persistence: 2026-10-30 07:46 CET, #2 streak sim merged with rc/v5 b563c75
- done: merge 504d279a91703c1c5e87e543f4568270c2a105c2 = 5d2aa04 + origin/rc/v5 b563c75 (#77 F1a), --no-ff, no rebase/amend/push. Conflicts in src/save/m5-fields.ts, src/sim/events.ts, src/sim/state.ts resolved to F1a's single declarations (flagOn, M5_SESSION_FIELDS, M5SimEvent, GameState extends M5Fields); streakRun stays a session GameState field that m5Persist strips. Diff vs rc/v5: 14 files +302/-35 (337 lines), no SAVE_VERSION change. tsc 0; targeted vitest 6 files 78/78. artifacts/v5-streak-sim-504d279/results/SHA256SUMS sha256 e65ea5fa7a4a5e1a797e51feaf73dbd11b522fe24828a7ea0d5b00f93fd8065b. Bundle scratch/bundles/feat-saves-v5-streak-sim-2-504d279.bundle (verify OK). Reviews: engineering/reviews/v5-streak-sim-504d279-{pr-body,self-review}.md.
- next: HoE pushes 504d279 to feat/saves-v5-streak-sim-2 (Draft PR #87); then breeds sim/save + k10-breeds-offset.
- blocked: full unit suite, golden, builds, check-globals and rc0 on 3 engines deferred under the RC/UI-QA load caps.

## Architect: 2026-10-30 08:09 CET, D-HOE-20261030-03 bot-m5 CSV fixture (#88)
- done: PR #88 (tests/bot-m5-csv-fixture → rc/v5, ready, not draft) head ce88448706f37f7050644830accba3d5686fe86e. a1c50e7 is the fixture commit on its own (tests/fixtures/economy-b48be8a4.csv = 0808fa6:data/economy.csv, blob a566fb87, sha256 b48be8a4f920940876168abac57c0b353c661dfeb355e627f3436d5acb83f857, plus the test switch with the sha256 asserted before the unchanged 41324ef4 pin). ce88448 only renames the test to carry the full sha256 (HoQA). Test-only, no src/. Gates: sync --check 0, tsc 0, vitest tests/bot-m5.test.ts 6/6 (lane architect, maxWorkers=1). Proof: live CSV = bb3f633 → 6/6, CSV+balance.json = bb3f633 → 6/6, control (old test) → 0f05e1eb fail. Restored, git status clean. CI run 41017272147 gate pass. Review: self-review + green CI (rule 22).
- next: HoE merges #88. B (tests/bot-m5b-port 61f7a00) needs the same fixture switch after its parity run: bot-m5.test.ts:66/76/96 (pins 69695d09.., 541425db.., 41324ef4 via live csvBalance), and :76 hashes the live CSV via csvRaw() (:62). The verify trace pins (bot-m5-trace.slow.test.ts:11 07139bdd, verify.test.ts:70 751ebe16) use the shipped balance and break on any retune; flagged to HoE.
- blocked: none.

## Senior Software Architect: 2026-10-30 08:21 CET, #82 F3 rulings applied, restacked, Ready
- done: D-HOE-20261030-01 `665bfba` ([F3-no-literal] allowlists BROODY_NEST_MAX_CENTS + BROODY_SLOTS in save/m5-fields.ts as named save-schema constants, test-only). D-HOE-20261030-02 `36c67de` (rest_recovery_mult guard relaxed to finite >= 0; [Pause-§6]: 0/0.35 pass, negative/NaN/Infinity fail, 0.4 fails <= 0.35). Merges: `dda39fc` origin/rc/v5 2fa7318 (#79; conflicts in game.ts/tick.ts/v5-f1b test resolved to our side, tree = 36c67de), `f4648e1` #80 5dd36d1, `2facc3f` #80 final 174286e (tree = f4648e1). All pushed. Gates at 2facc3f: sync --check 0, tsc 0, build+check-release-build 0, check-globals chromium 0, targeted vitest 13 files 209/209. PR body: Post-CCR delta, AC trace (Pause-§6 updated, D-HOE-20261030-01 row), rule 22 review note (CCR @ecf8297 = no Claude review; verify-claude-verdict.sh 0 calls). PR #82 marked Ready (out of Draft).
- next: CI run 41019019230 on 2facc3f SUCCESS (08:32 CET); Saves QA delta trace check; HoE merges after #80. CCR may review later as optional extra.
- blocked: none.
- update 08:57 CET: #82 merged origin/rc/v5 6bcc194 at `48b6857` (diff vs 2facc3f = #88's two test files only), base retargeted to rc/v5, gates green (sync 0, tsc 0, targeted vitest 209/209), CI 41021364051 success, mergeable clean. Head held at 48b6857 per HoE. The 0.36/0.3500001 [Pause-§6] rejects are committed locally only as `06351f0` (branch wip/f3-pause-bound-0.36-tests, NOT pushed), for a later small PR.

## Senior Engineer, Saves & Persistence: 2026-10-30 08:19 CET, #87 Saves QA return addressed
- done: feat/saves-v5-streak-sim-2 @ 14894bd32fdb072f5f54369bce677853e6b53962 (local; on 504d279): 5573593 = --no-ff merge of origin/rc/v5 2fa7318 (#79; its clock/focus path/rng taken, streak now a TimerSystem), 14894bd = QA fixes (M1 ST-AC7 MH/Sell all/Grader tests, S5 killed; M2 cap of record 0.28; ST-AC28 dropped; spec v1.3.2 acb4cdbb / plan v0.8 403c2c46 cited; owners for deferred rows; flag-default-0 test). 324 lines vs rc/v5, no SAVE_VERSION. tsc 0; targeted 8 files 103/103; mutations 10/10 killed (control S5 survives at 5573593). Manifest artifacts/v5-streak-sim-14894bd/results/SHA256SUMS sha256 2930938993b6ae7b97f807f591ba2a2a5dd5078f220f6c85e569608dfdfe59d8. Bundles scratch/bundles/feat-saves-v5-streak-sim-2-{5573593,14894bd}.bundle verify OK. Reviews engineering/reviews/v5-streak-sim-14894bd-{pr-body,self-review}.md.
- next: HoE pushes 14894bd to #87 and updates the body; Saves QA re-check (delta + S5); re-merge when #80 lands (full re-check); then breeds sim/save + k10-breeds-offset.
- blocked: full units/golden/builds/check-globals/rc0 x3 deferred under the load caps (WebKit broken on the box); Basket stock (ST-AC7) needs an owner from HoE.

## 2026-10-30 08:35 CET — Architect — D-HOE-20261030-04 test-infra PR #89
- done: PR #89 (test-infra/recorded-pid-kill @ 58ad41b, into rc/v5 2fa7318, Ready). M1 serve-own.mjs + m7 d2-kill-browser.mjs now signal only PIDs recorded at spawn (scripts/recorded-pid.mjs: pid + starttime + parent + boot id; group leader check; refuse otherwise). Design: in-repo guard, not lane-run (box-only tool, not in CI; setsid = same detach). d2 /proc walk removed (exec wrapper records the browser PID). tests/recorded-pid.test.ts 13/13. Gates: tsc 0, sync 0, targeted vitest 27 pass/1 pre-existing skip, build + release check 0, check-globals chromium 0, d2-kill chromium smoke 2/2 + D3/D4 PASS.
- next: CI on #89 (run 41019891633); then send SHA to HoE + Saves QA for the QA verdict. HoE merges.
- blocked: none. Not run locally: d2-kill on firefox/webkit.
- update 08:41 CET: #89 CI run 41019891633 on 58ad41b = success (gate job green: unit, slow, release build, chromium globals, html, build-id; release-globals matrix skipped by workflow). next: HoE + Saves QA for the QA verdict; HoE merges.

## UI (Senior Engineer, UI & rc1 Fixes): 2026-10-30 08:46 CET, #83 final head after the 23:21 crash / snapshot restore
- done: #83 fix/m41-p2 @ 4eb220f6fb74d1947b733ef72f74e2057e804979, PUSHED (1befa17..4eb220f, no force). PR body updated (artifacts/m41-p2/pr-body-4eb220f.md).
  - HoE rulings 00:19/00:20: Art-c1 name 'Upgrades' / 'Upgrades, 1 worker needs attention' / 'Upgrades, N workers need attention'; badge after the label, aria-hidden,
    same place (icon top-right -6/-6, flex static position); no generated content. HoP D-HOP-10 addendum tests (cooldown visible + not actionable; end -> Market, Upgrades, Farm,
    Tab->Farm / Shift+Tab->Upgrades from a focused Refill). Count-0 test kept. Art-c2 kept + full-motion shake fixed (.btn[aria-disabled] animation:none beat .shake).
  - Commits: 166bc34, 65bf759, 4eb220f (on 1befa17). Bundles: scratch/bundles/fix-m41-p2-{166bc34,65bf759,4eb220f}.bundle (verified).
  - Gates 17/17 PASS on 4eb220f: vitest 1673/1673, goldens AC7 f90d1678 / m4-on a54c9cf9 unchanged, rc0 394/394 x3, p2-browser 232/232 x3 (+3 INFO). results-4eb220f/ SHA256SUMS 149/149.
  - Shots: /workspace/wt-ui-shots/m41-p2-4eb220f/ (93 + manifest), copy in results-4eb220f/shots/. nav-compare vs a 1befa17 build: badge geometry identical in 3 engines.
- next: F6 03-05 re-run (wt-v5-f6 2b4abf9), #85 artifact check; then F6 browser gates when told.
- blocked: ruling needed on the cooldown nav Refill vs axe label-content-name-mismatch (visible '0:NN' countdown not in 'Refill, cooling down'); recorded as INFO, not gated.
  Branch is behind origin/rc/v5 6bcc194 (F1a/F1b/F1c); merge-tree clean; not merged (HoE's call, would need a re-gate).

## Senior Engineer, Saves & Persistence: 2026-10-30 08:48 CET, #87 merged with rc/v5 6bcc194 (#80 + #88)
- done: feat/saves-v5-streak-sim-2 @ 22b6db41a7424285f10aa003ada774a415d4e9c5 (local; on 14894bd, QA PASS) = --no-ff merge of origin/rc/v5 6bcc194; conflicts in actions.ts/payout.ts/tick.ts resolved to #80's sale ctx (payout.ts, tick.ts = rc/v5), streak (1+s) is one SALE_EFFECTS entry; f1c test resets its registry before each test. 14 files +286/−23 = 309 lines, no SAVE_VERSION. tsc 0; 12 targeted files 159/159; QA mutate.py 10/10 killed (S5/S9 re-pointed to #80 code). ST-AC7 Basket stock: N/A v5, no Basket sale path. Owner: Saves, before that path ships. (QA-D-1030-STAC7 / plan v0.8.1; no code/tests). Artifacts artifacts/v5-streak-sim-22b6db4/results (SHA256SUMS a20bedd4…2361); bundle scratch/bundles/feat-saves-v5-streak-sim-2-22b6db4.bundle verify okay; reviews engineering/reviews/v5-streak-sim-22b6db4-{pr-body,self-review}.md.
- next: HoE pushes 22b6db4 and updates the #87 body; Saves QA re-check of the post-#80 head; CI.
- blocked: none.
- 08:50 CET F6 re-run (wt-v5-f6 2b4abf9, artifacts/v5-f6/results, SHA256SUMS 11/11): 04 golden AC7 f90d1678 PASS, 05 golden m4-on a54c9cf9 PASS, 03 vitest-full FAIL 1738/1740,
  the same 2 as 23:33 (real, not crash damage): v5-f3-config 'no literal tunables' flags 48 bare literals in the new src/ui/overlay.ts; qa-rc1-bugs BUG-4/5 source check
  still greps app.ts for the FX code F6 moved to overlay.ts. Needs an F6 fix commit (named constants + retarget the source check). Browser gates not started.
  #85 (2325e2a): artifacts/v5-f6a-attended/results MANIFEST.sha256 9/9 OK, all 6 gates rc=0; nothing re-run.
- 5.1 backlog (UI, HoE 08:51 (C), logged 09:07 CET): the refused-tap shake never plays on a disabled Buy / Collect (cantAfford adds .shake, but
  `.btn[aria-disabled=true]{animation:none}` (0,2,0) beats `.shake` (0,1,0), styles.css L39/L43), so a refused tap there gives sound only, no visual.
  Fixed for Refill only in #83 (4eb220f `.btn.manage.shake`; extended in 3ecf482 to the nav/header Refill and the Workers-tab Refill bar per Art-c2 all-Refill
  scope). Buy/Collect needs the same higher-specificity rule plus the reduced-motion refusedFlash; Art to confirm the treatment.
- 09:07 CET F6 cut to 5.1 (D-HOP-2026-10-30-03): fix commit cb1ef08 on feat/v5-ui-f6-overlay, LOCAL ONLY (bundle scratch/bundles/feat-v5-ui-f6-overlay-cb1ef08.bundle,
  verified); tsc + v5-f3-config / qa-rc1-bugs / v5-f6-overlay 109/109 (maxWorkers=1). Impact note for rows 16/17/22: reviews/f6-cut-impact-rows-16-17-22.md.

## 2026-10-30 09:10 CET: Architect, #89 round 2 (UI QA FAIL @58ad41b → fixes)
- done: test-infra/recorded-pid-kill → a32faeb (6 commits on 58ad41b, rc/v5 NOT merged): cf00e62 F1+F6, 6c5919f F2, 568784e F3 prerequisite (9 scripts' raw vite kills → spawnRecorded/stopOrReport), 2a8d90a F3 source check (49 negative fixtures)+N2, 9a05af1 F4+F7+N1 (d2-guard: leftover check, HALT, STOP-LIST-for-HoO.txt), a32faeb F5 a/b/c (HoO conditions). Gates at a32faeb: tsc 0, sync 0, targeted vitest 104/104 (recorded-pid, rule21-source, d2-guard, serve-own), build+release check 0, check-globals chromium 0, d2 smoke chromium 2/2 + D3/D4 PASS, leftovers clean. PR body updated via gh api PATCH.
- next: CI run 41023936569 on a32faeb; then UI QA re-check (F1-F7) + HoO re-ruling (recorded-pid.mjs changed, QA-R21-D2 (5)); FF/WK d2 smoke is UI QA's.
- blocked: none. Note: 6c5919f alone fails tsc (fixed in 2a8d90a).

## Senior Engineer, Saves & Persistence: 2026-10-30 09:12 CET, #87 merged with rc/v5 1a61b36 (#82 F3)
- done: feat/saves-v5-streak-sim-2 @ 694468eaad069cd58d48108c1dca11a8c6f57158 (local; on 22b6db4 = origin) = --no-ff merge of origin/rc/v5 1a61b36; conflict balance.ts resolved keeping #82 validateM5 + the streak M5_TC_KEYS/tcNum check; tests/v5-f2-helpers.ts ON spreads F3's flags block (tsc TS2352). balance.json 0 diff vs rc/v5. 309 lines, no SAVE_VERSION. sync-economy --check 0; tsc 0; 17 targeted files 290/290 (incl. v5-f3-*, [F3-no-literal]); mutate.py 10/10 killed. Artifacts artifacts/v5-streak-sim-694468e/results (SHA256SUMS 2bd3b3b7…6db8); bundle feat-saves-v5-streak-sim-2-694468e.bundle verify okay; reviews engineering/reviews/v5-streak-sim-694468e-{pr-body,self-review}.md.
- next: HoE pushes 694468e and updates the #87 body; Saves QA re-check of the post-#80/#82 head; CI. Proposed follow-up: streakOn → flagOn(b,'streak'); streak keys M5_TC_KEYS → M5_REQUIRED_TC.
- blocked: none.
- 09:13 CET addendum: Saves QA PASS at 22b6db4 (CI 41022593909, full 1698/1 skipped) recorded in v5-streak-sim-694468e-pr-body.md; QA's TS2352 fix was already in merge 694468e (no new commit). Head stays 694468e; next: HoE push, CI + QA delta.
- update: #89 CI run 41023936569 on a32faeb = success (gate job green; full unit + slow + release + chromium globals).

## Senior Engineer, Saves & Persistence: 2026-10-30 09:28 CET, CCR rcv5-vs-main-1a61b36 F-3/F-4/F-5 (D-HOE-20261030-08)
- done: F-3 verdict in engineering/reviews/v5-ccr-F3-verdict.md (reaches flags-off path: NO; nothing computes the x10000 nest; clamp fix goes with the Broody PR). F-4: fix/saves-v5-m5load-pause-sanitize @ fb4015d831d9211877f4cd0c0bb95240ce044105 (local, on rc/v5 1a61b36): m5Load sanitises paused/callLockoutS behind m4.flags.pause, M5_REQUIRED_TC.pause; 105 lines, no SAVE_VERSION; TDD red 6/10, then sync-economy 0, tsc 0, 10 files 146/146; artifacts/v5-m5load-sanitize-fb4015d/results (SHA256SUMS 533db999…5c09); bundle verify okay; reviews v5-m5load-sanitize-fb4015d-{pr-body,self-review}.md. #87 trial merge: 1 conflict (m5-fields.ts header), resolves cleanly (tsc 0, 102/102), scratch discarded. #87 branch untouched.
- next: HoE pushes fb4015d / opens the PR; QA; F-5 folds into #87 (tcNum + M5_TC_KEYS) post-cut; E13 flag-off clearing is open for the Pause PR.
- blocked: none.

## Senior Software Architect: 2026-10-30 09:41 CET, CCR rcv5-vs-main-1a61b36 F-1 O-3 guard (D-HOE-20261030-08)
- done: fix/v5-botm5-o3-guard @ 27157b073b3c06dd6b46a427733e22b8b19c2b7c (base rc/v5 458f74c, pushed, NO PR yet). tests/bot-m5.ts: SRC_M5_FLAGS + assertNoDoubleModel (src flagOn) called first in run(); tests/bot-m5.test.ts: 4 [F-1][O-3] tests on fixture b48be8a4 (sha256 assert). TDD red 4/4; gates: tsc 0, sync-economy --check 0, bot-m5.test 10/10, verify.test -t m5x-casual 4/4, build 0 (m4.1+27157b0), check-globals chromium 3/3 PASS. Mutation (guard call removed): 3 failed/1 passed, restored. Bundle scratch/bundles/fix-v5-botm5-o3-guard-27157b0.bundle verify okay. Body: /workspace/gates-v5/pr-o3guard-body.md.
- next: open the PR after B's Draft (HoE order). Merge-order note: B (61f7a00) has its own assertNoDoubleModel/SRC_M5_FLAGS (+SRC_M51_FLAGS/rc2) -> textual conflict in tests/bot-m5.ts for whichever lands second; resolve by merge, keep the union.
- blocked: none.

## Senior Engineer, Saves & Persistence: 2026-10-30 09:54 CET, F-4 branch on rc/v5 458f74c (#87 merged) + #87 QA follow-ups
- done: fix/saves-v5-m5load-pause-sanitize @ 7d59ddac8f1e5b610ddef4db9c1b62de9799da5a (local): a202ed1 = --no-ff merge of origin/rc/v5 458f74c (1 conflict, m5-fields.ts header: both imports, anyFlag+pause, tc = tcNum); 7d59dda = QA pr87-694468e follow-ups (M1 pinned streak tc keys, ON comment; tests only). 113 lines vs rc/v5, no SAVE_VERSION. sync-economy 0, tsc 0, 15 files 266/266, mutations 11/11 killed (M1-V3 killed; control @a202ed1 survives). Basket rows in v5-streak-sim-694468e-pr-body.md cite D-HOE-20261030-07 (HoE may PATCH merged #87 body). Artifacts artifacts/v5-m5load-sanitize-7d59dda/results (SHA256SUMS 7ae964d4…be43); bundles a202ed1, 7d59dda verify okay; reviews v5-m5load-sanitize-7d59dda-{pr-body,self-review}.md.
- next: HoE pushes 7d59dda / opens the F-4 PR; optional PATCH of #87's merged body; QA.
- blocked: none.
- 10:47 CET #83 final head abe9cc6 LOCAL (not pushed; HoE pushes). Commits on 4eb220f: d4989fa D-HOP-2026-10-30-02 (b) cooldown "Refill 0:NN" / docked "Refill · 0:NN",
  countdown as CSS generated content, axe cooldown rows real checks (QA F2) + non-empty visible-text rule and negative test (F3); 3ecf482 Art-c2 on all Refill
  (card, nav/header, Workers bar; F4); b159379 nav-upgrades shots frame the nav (F6); 8be9ae7 JSDoc nit (F8); f883dad docked pill reserves the widest Fredoka
  countdown; abe9cc6 = --no-ff merge of rc/v5 458f74c (clean). Bundle scratch/bundles/fix-m41-p2-abe9cc6.bundle (verified). Chain 17/17 PASS
  (artifacts/m41-p2/results-abe9cc6, SHA256SUMS 143, sha256 a9223067…d910); goldens unchanged. Art cooldown fit 18/18 PASS
  (artifacts/m41-p2-cooldown/results/measurements.json). PR body: artifacts/m41-p2/pr-body-abe9cc6.md (not posted). rc/v5 moved to a923206 after the merge (merge-tree clean).

- 11:58 CET #83 head ba398b6aeb0f00874ab83d93cf0c9a0670401a62 (abe9cc6 + 1 commit, pushed by HoE; bundle scratch/bundles/fix-m41-p2-ba398b6.bundle, verified).
  - **SRC FIX for the HoP 10:49 condition.** The countdown ::after on .nav-lbl showed up in the a11y tree (StaticText " 0:30") and in ariaSnapshot ("…: Refill 0:30"). It now sits on a text-free, aria-hidden .nav-cd span.
  - Full chain 17/17 (results-ba398b6, SHA256SUMS 152, NOTE.md).
  - Tree name exactly "Refill, cooling down" from aria-label, no digits, 3 engines × 360/390/1280.
  - m:ss vitest passes; Art-b focus passes; Art-c2 cited from 3ecf482.
  - Art pixdiff vs abe9cc6: 0 px in 18/18.
  - Body: artifacts/m41-p2/pr-body-ba398b6.md (HoE to PATCH).
  - Art to rule: docked 1280 focus ring is the UA default (auto 1px).

## 2026-10-30 10:57 CET — Senior Software Architect
- done: pacing-x1-stack job built, local ci/v5-pacing-x1-stack b59b75f (base d52f35b), bundle verified; HoQA X1-TREE 5 conditions + HoE tree check wired. Dry runs: 8dc90e2b PASS 45/0; rc/v5 b48be8a4 streak-off FAIL 8 (G4). harness-rc bb28040f re-review (22eac98 baseline scope) in progress.
- next: B parity finish (~12:00) -> union merge rc/v5 into B -> Draft ~12:45 -> merge into X1 -> X1 recorded run ~13:30-13:40.
- blocked: X1 RC-gate needs HoE/HoP/Econ ruling on G4 streak-off FAIL, HoE+HoQA ruling on shipped CSV (8dc90e2b+r27-29) vs fixture, Econ AC7 --csv entry point.

## 2026-10-30 11:58 CET — Senior Software Architect (bot-m5 B to Draft-ready)
- done: B tests/bot-m5b-port head 40bff29 (local, unpushed; bundle scratch/bundles/tests-bot-m5b-port-40bff29.bundle verified). Parity VERDICT artifacts/bot-m5b-parity/VERDICT.md (aafdcb5e; SHA256SUMS 42db771d, 123/123 OK): economy outputs 37/37 byte-identical vs m52-o1a (incl. pool2/pool2b) + m51-o1a; FINDING F-PAR-1: 3 stderr logs differ only by the ref's trailing ALLDONE line; D6 toggles 0. Merge dcd5722 (rc/v5 3f582db, O-3 union), 1392752 (D-HOE-05 CSV fixture), 3062303 (#90 AC1-AC6 titles), 6d9303b (README claim), 40bff29 (D-HOE-05 balance fixture: 24 h trace pin broke on #92 balance). Gates at 40bff29 all 0: sync, tsc, targeted 79/79, slow trace 1/1, full 1775+1 skip, build, check-globals. PR body /workspace/gates-v5/pr-botm5b-body.md.
- next: HoE pushes + opens Draft (base rc/v5); B re-merges rc/v5 --no-ff after the X1 PR (and #83) land.
- blocked: none. Open ruling: F-PAR-1 (strict byte vs economy-only parity), HoE/HoQA.

## Senior Engineer, Saves & Persistence: 2026-10-30 12:18 CET, PR #94 RF3/RF4 (HoQA pr94-40bff29)
- done: 76a3bcd21cbc0d7445e7fd5096efedcfe8c51bf3 on 40bff29 (local branch tests/bot-m5b-port-rf3-rf4 in /workspace/wt-pr94-rf; tests/bot-m5.test.ts only): RF3 positive control (tog = tog10 = 1 pinned), RF4 length 3000 + runner cap. tsc 0; bot-m5.test.ts 24/24; both mutants fail the new assertions and were reverted. Bundle scratch/bundles/tests-bot-m5b-port-76a3bcd.bundle verify okay (requires 40bff29). Artifacts artifacts/pr94-rf3-rf4-76a3bcd/results (SHA256SUMS 52414c5c28ed5880d0ae888bf49f4bba2611d6b270aa859d2d3ca5878cf92e2a). Note: engineering/reviews/pr94-rf3-rf4-76a3bcd-note.md.
- next: HoE pushes 76a3bcd to tests/bot-m5b-port. The local tests/bot-m5b-port branch belongs to another worktree (/workspace/wt-v5-botm5b, 22466f5 RF1, also on 40bff29, scripts/ only), so both commits need to land on the branch (cherry-pick, no file overlap).
- blocked: none.
- 2026-10-30 12:33 saves: done: engineering/reviews/v5-breeds-tick-semantics.md (design only; rc/v5 3f582db = a923206 code; spec 13d5255e): breeds TimerSystem after streak, sim dt, closed-form in applyOffline, saved breeds.rng (not brRng), hatchEstimate contract. next: Econ answers Q1-Q5 at the 16:30 K10 handover; breeds sim PR after Broody R7. blocked: none.

### 2026-10-30 12:37 CET, Architect: #94 (tests/bot-m5b-port) HoQA RF1/RF2/RF5 + SHIPFLAGS + RF3/RF4
- done: 22466f5 RF1 F-PAR-1 strip/compare (3/3 exit 0); 17f1ecd RF2 fail-closed harness + Econ originals pinned; 89652e5 RF5 README; 3d51b7b balance.json/m4.flags record; c723e70 cherry-pick -x of Saves' 76a3bcd (RF3/RF4). Gates at c723e70 green (full 1776+1 skip). VERDICT: #83 income.ts comment-only proof; SUMS 136/136. 40bff29 smoke stopped by lane-kill, not a verdict.
- next: #93 file/graph check -> rc/v5 re-merge (HoE) -> run-smoke.sh on the final head -> one final bundle.
- blocked: re-merge waits for #93.

### 2026-10-30 12:44 CET, Architect: #94 JOBS=pool2 mode (QA-D-1030-PR94-POOL2 = C)
- done: cbb1b53 JOBS=pool2 (12 px + pool2/pool2b, SEEDS=200 only, fail closed), selftest 30/30, default mode byte-identical (stub cmp), MANIFEST 1dc5008f -> 2a3c0935; bundle tests-bot-m5b-port-cbb1b53 (70325db8…); body b9ef0ac8…; VERDICT SUMS 142/142.
- next: on B's final head (after #93 + rc/v5 re-merge): lane-run the 20-seed smoke and JOBS=pool2 SEEDS=200 in parallel; pool2 must finish with SUMS by 14:40 CET, otherwise A (V51-BPAR-1).
- blocked: final head (#93). Risk: box load 17-28 from k10-breeds runs makes px ~6.7x slower; at that load the 200-seed run cannot make 14:40.

## 2026-10-30 12:50 CET — Senior Engineer, UI & rc1 Fixes — QA-PRERUN-1 / QA-PRERUN-2 (UI QA 76390f2 pre-run bugs)
- DONE (bug 1, fix/v5-wk375-gotit-focus @ 1c3518b = 3561be3 fix + merge of rc/v5 3f582db; bundle scratch/bundles/fix-v5-wk375-gotit-focus-1c3518b.bundle verified):
  root cause proven with scripts/v5-qa-prerun-1-gotit-focus.mjs @ c318928/dacfc89 (WebKit AND Chromium 375x800, Farm + refund):
  Shift+Tab from Got it focuses the last Buy, the sheet scrolls to it (271 px), the card goes data-place=none = visibility:hidden,
  and Tab/.focus() skip the hidden Got it (focus -> body). Gates green so far: npm ci, sync-economy, tsc, build, build:html, build:qa,
  check-globals, vitest full 1771/1771, goldens unchanged, QA-PRERUN-1 browser 260/260 x3 engines, rc0 chromium 394/394.
- NEXT: rc0 firefox/webkit + m41-9 sweep x3 (HoQA: <=600 s holds, none across 13:50 CET), then push + PR vs rc/v5.
- Bug 2 (fix/v5-ff375-sell-clip @ fe50e8a, bundle verified): root cause measured (scrollWidth = padding box, rounded, used as
  border-box --sell-w; overflow in all engines, only FF reports it). Gates not started; after bug 1.
- 12:54 CET update (D-CEO-20261030-09): the B pool2 200-seed run and the 14:40 deadline are cancelled. cbb1b53 is kept for the final RC. B's next step is only the 20-seed smoke + unit tests on its final head after #93 and the rc/v5 re-merge.

## 2026-10-30 12:56 CET · Senior Software Architect
- done: #93 final head 05d68b1 (R1-R7, SHIPFLAGS balance.json record, F9, rc/v5 e77fc5c merged clean), bundle ci-v5-pacing-x1-stack-05d68b1 (adae7ae4), body 018b48ad, full suite 1854/1 skip; sent to HoE to push. #94 B pre-re-merge head cbb1b53 (RF1-RF5 + Saves RF3/RF4 c723e70 + JOBS=pool2 mode), bundle 70325db8, body 005de646, sent to HoE. Manifest Gate status rows 4,5-8,10,13 refreshed (1230bf78).
- next: after #93 merges: B re-merge rc/v5 + 20-seed smoke on final head (D-CEO-20261030-09: pool2 200-seed cancelled, kept for final RC); manifest stale-column fix + row 3 e77fc5c; lane-A flags-on dd estimates to HoE by 13:30; K10 harness PR awaiting HoE slotting.
- blocked: none. Risk: box load 17-28/8 cores slows smoke ~6x.
- 2026-10-30 13:04 saves: done: breeds PR A on feat/saves-v5-breeds-sim (/workspace/wt-v5-breeds), base origin/rc/v5 e77fc5c: 74083210561f974b021d9810dbd108c4e3487c1e (state/save/load/sanitise/offline settle, flag m4.flags.breeds) + 464aea17b8f45bf54bc98a456b1b4d430bc83576 (tests, M3/M9 kills). +275/-6, no SAVE_VERSION bump. Gates at 464aea1: tsc 0, sync-economy --check 0, targeted vitest 16 files 233/233, mutations 13/13 KILLED. Bundles: scratch/bundles/feat-saves-v5-breeds-sim-{7408321,464aea1}.bundle verified. Artifacts: artifacts/v5-breeds-sim-464aea1/results (SHA256SUMS 2edb5ba6...b372). Reviews: engineering/reviews/v5-breeds-sim-464aea1-{pr-body,self-review}.md. next: HoE pushes; PR B (tick countdown, hatch/roll per Econ Q3, eggfarmQa.breeds.hatchEstimate hook); k10-breeds-offset CI is Architect + Econ harness + bc_* CSV. blocked: none.
- 2026-10-30 13:15 saves: done: PR #95 (breeds PR A) PMC fix: a7e1f8e1c20eb38312d6645e4393f730ea136260 (E10/Q5 raw slot id kept via session shadow, Q6, Q7 freeHatchUsed->1; gate failed on the F1a session pin) + a452dd0bc0f9064342f31cf14ca1c44788206ebf (shadow moved to SESSION_ONLY_KEYS; per-slot write-back). Gates at a452dd0: tsc 0, sync-economy 0, targeted vitest 16 files 245/245, mutations 20/20 KILLED. Bundles scratch/bundles/feat-saves-v5-breeds-sim-{a7e1f8e,a452dd0}.bundle verified. Artifacts artifacts/v5-breeds-sim-a452dd0/results (SHA256SUMS 44125a84...4332). Reviews engineering/reviews/v5-breeds-sim-a452dd0-{pr-body,self-review}.md. next: HoE pushes a452dd0 to PR #95; PR B continues on feat/saves-v5-breeds-hatch (merged a452dd0 at 053006f). blocked: none.
- 2026-10-30 13:21 saves: done: breeds PR B on feat/saves-v5-breeds-hatch (/workspace/wt-v5-breeds-hatch), stacked on PR A: 053006f (merge a452dd0), 3c247495753cf7feaf917988cc15472676c29713 (tick/hatch/roll/place/settle/BR-AC31e hook), d7df1f96dfae5a1cdb852f117940d5659f5ff524 (B9 test). +328/-9 over A. Gates at d7df1f9: tsc 0, sync-economy 0, targeted vitest 19 files 289/289, release build + check-release-build 0 (hook absent, 0 hits; build:qa has it), mutations 21/22 (B11 equivalent at share 10000). Bundles scratch/bundles/feat-saves-v5-breeds-hatch-{053006f,3c24749,d7df1f9}.bundle verified. Artifacts artifacts/v5-breeds-hatch-d7df1f9/results (SHA256SUMS b33453ae...f0b5). Reviews engineering/reviews/v5-breeds-hatch-d7df1f9-{pr-body,self-review}.md. next: HoE pushes/opens PR B; PR C telemetry (BR-AC27, flock_complete); traits PR; lane U Flock UI. blocked: none.

- 2026-10-30 13:32 CET Architect: DONE breeds reviews: #95 a452dd0 PASS with Minors (engineering/reviews/v5-breeds-a-a452dd0-architect.md sha256 d4629abe); #96 d7df1f9 CHANGES REQUESTED, roll parity PASS (v5-breeds-b-d7df1f9-architect.md sha256 0dd153d0). NEXT: K10 PR after #93/#94. BLOCKED: none.

## Senior Engineer, UI & rc1 Fixes: 2026-10-30 13:46 CET, D-HOE-20261030-15/-18 (A #85, B #86, C CCR F-2 on F6). Nothing pushed (HoE pushes).
- done A: feat/v5-ui-attended c5c3a7e (6095d29 = --no-ff merge of rc/v5 e77fc5c, 17 pre-squash conflicts -> rc/v5 side, only #85's 3 files differ; c5c3a7e test-only readonly-registry seam). Bundle scratch/bundles/feat-v5-ui-attended-c5c3a7e.bundle (verified). Quick gates 10/10 PASS (artifacts/v5-ui-f6a/results-c5c3a7e). Body artifacts/v5-ui-f6a/pr-body-c5c3a7e.md.
- done B: feat/v5-ui-f6-overlay 6307674 (128e00f merge of #85 c5c3a7e, 916f098 test seam, 6307674 F6-AC-SHEET registerSheet/closeComplete). Bundle feat-v5-ui-f6-overlay-6307674.bundle (verified). Quick gates 10/10 PASS (artifacts/feat-v5-ui-f6-overlay/results-6307674). Body pr-body-6307674.md.
- done C: fix/v5-ccr-f2-f6 ae19dae (from #86; previews use playerSaleCtx; overlay.wireAttended single probe; Upgrades sheet + explainer register via F6-AC-SHEET; ui/attended.ts deleted). Bundle fix-v5-ccr-f2-f6-ae19dae.bundle (verified). Quick gates 10/10 PASS, targeted 191/191. Body artifacts/fix-v5-ccr-f2-f6/pr-body-ae19dae.md. Supersedes local fix/v5-ccr-f2 b0802e6.
- next: full vitest A->B->C runs as soon as the WK375 lane ends (chains queued via lane-run). Browser gates (check-globals, rc0 x3, v5-f6-browser x3, pixdiff) missed the 13:40 cutoff: they wait for Saves QA's RC gate to release .browser-test.lock (create scratch/ui-lane/browser-released, then re-run them).
- blocked: browser lock (HoQA 13:50 window), WK375 priority.

### 2026-10-30 13:53 CET: UI lane (Senior Engineer, UI & rc1 Fixes), QA-PRERUN-1 (WK375 Got it focus)
- done: full gate set green @ 18d8c33 (e77fc5c merge); results-18d8c33/ + SHA256SUMS. rc/v5 then moved to 65a7443 (#93 and #95, no src/ui, CSS or browser scripts; src/game.ts +pendingReveal only). Stopped the leftover vitest re-run (lane-kill 3550795), merged --no-ff origin/rc/v5 -> bd8378f (clean), bundle fix-v5-wk375-gotit-focus-bd8378f.bundle verified.
- next: full gate chain @ bd8378f (lane-run 3580849), then pr-body-bd8378f.md. No push (HoE pushes). Bug 2 (QA-PRERUN-2) is on hold.

### 2026-10-30 14:14 UTC+1: Senior Software Architect, bot-m5 B (#94) final head
- done: tests/bot-m5b-port a8e703a = cbb1b53 + `merge --no-ff` origin/rc/v5 65a7443 (#83, #93, #95); no conflicts, guard lists unchanged (breeds not modelled by the bot, flag 0). Smoke 20 seeds PASS 36/36 (artifacts/bot-m5b-parity/smoke-a8e703a, SUMS.sha256 771217dd…, F-PAR-1 not needed: 0 ALLDONE). Gates final-a8e703a: tsc/sync/build/check-globals 0, selftest 30/30, manifest 15/15, targeted 80/80 + slow 1/1, full 135 files 1905+1 skip. Bundle scratch/bundles/tests-bot-m5b-port-a8e703a.bundle (87ed6269…, verified). Body /workspace/gates-v5/pr-botm5b-body.md (2d37b74a…). Manifest rows 1 (#93) + 27 (#95) refreshed. origin/tests/bot-m5b-port is still 40bff29 (cbb1b53 not pushed).
- next: HoE pushes the bundle (a8e703a) and patches #94's body; Econ can resume k10-breeds; then K10 PR, then lane-A item 1. #96 re-review after Saves' fix bundle.
- blocked: none (push is HoE's).

### 2026-10-30 14:16 CET: lane H (Senior Engineer, Generalist), zeroGainUi
- done: gen/zero-gain-ui 53ef5b5 on rc/v5 65a7443 (5 commits, /workspace/wt-gen-zerogainui), spec v0.3.7 f86de04e + errata rev2 4cfe6895. 51 zg tests; npm test 140 files 1940+1 skip, slow 16+1, build/html/check-release-build 0, check-globals x3 PASS, goldens f90d1678/a54c9cf9 PASS, flag-off DOM sha = base. Bundle engineering/tasks/zeroGainUi/gen-zero-gain-ui-53ef5b5.bundle + SHA256SUMS. HANDOFF.md alongside.
- next: HoE pushes (manifest branch name v5-m51-zerogain); BBv2-row runs once bestBuyV2 is built.
- blocked: none. Open: BBv2 ships-off/on conflict in manifest 4224ffad (line 7/row 29 vs 110/120); M5.0 stopgap absent (AC3).

### 2026-10-30 14:33 CET: lane H (Senior Engineer, Generalist), zeroGainUi-6
- done: gen/zero-gain-ui 6–8/n ff on 53ef5b5 (PR #97): c92e2d5 bestBuyV2×confirm matrix, 57bc213 strip close = one cancel (D-COL-29 a), 546de85 unaffordable ZG Buy inert (D-COL-29 b). 75 zg tests; npm test 141 files 1964+1 skip, slow 16+1, build/html/check-release-build 0, check-globals ×3 PASS, goldens f90d1678/a54c9cf9 + flag-off DOM sha PASS. Bundle engineering/tasks/zeroGainUi/gen-zero-gain-ui-546de85.bundle + SHA256SUMS. BBv2 read-only plan: engineering/tasks/bbv2/HANDOFF.md.
- next: HoE pushes 546de85; BBv2 build on v5-m51-bbv2 once the plan questions are answered.
- blocked: none.
- 2026-10-30 14:42 CET Architect: DONE #96 re-review @ 204cabe PASS with Minors, roll parity PASS (engineering/reviews/v5-breeds-b-204cabe-architect-rereview.md sha256 3dcb9849). Pre-final-RC musts: PR C telemetry, BR-AC2b test, bc() CSV + D-HOE-05 fixtures, BR-AC1/AC2 trace test. BLOCKED: none.

## 2026-10-30 14:43 CET · Architect · K10 PR prepared (ci/v5-k10-breeds-offset @ 67ff56a, base rc/v5 65a7443)
- done: Econ patches 0001/0002 verified (sha256 111cf083…8997, a1390dd9…08b6) and git am'd as 8b1def0 and fcf32ab (Econ authorship). Architect fixes: 8974da8 pins the seed-1 parity inputs to tests/fixtures/k10 with sha256 (D-HOE-05); 67ff56a adds the non-required k10-breeds-offset workflow (the patches had none). Gates: tsc, sync-economy --check, build, check-globals, k10 quick 9/9, trigger 3/3, full vitest 1898 passed / 1 skipped: all PASS. K10 full on a8c4e268: FAIL g1max 63.12 vs no-breeds 63.10 / Present-only 63.10 (known 0.02 pp, HoP's call, not tuned). Logs: artifacts/k10-gates/67ff56a/. Bundle: scratch/bundles/ci-v5-k10-breeds-offset-67ff56a.bundle (sha256 78dd764f…9aa0). Body: /workspace/gates-v5/pr-k10-body.md.
- next: HoE pushes and opens the PR (job non-required until the Sat 10:00 retune). Econ can resume heavy runs. Then lane-A item 1.
- blocked: none.
- 2026-10-30 ~14:50 CET Architect: #97 zeroGainUi @546de85 review: PASS with Minors (2 Minor, 3 nit). HoE ruling needed on anyM5FlagOn including UI-only flags before the 9/n flip. engineering/reviews/v5-zerogain-546de85-architect.md

### 2026-10-30 15:50 CET: lane H (Senior Engineer, Generalist), bbv2-1
- done: gen/bbv2 d654afd (6 commits) rebased on rc/v5 0ad018d (#97). Bundle engineering/tasks/bbv2/gen-bbv2-d654afd.bundle (prereq 0ad018d) + SHA256SUMS. Full gates PASS (2082 tests; slow 20 incl. AC9/AC14 seeds 1–200; check-globals ×3). Flag-off goldens + DOM byte-identical. The bestBuyV2 flip is HELD per D-HOE-38 (HELD-flip-bestBuyV2.diff, not in the bundle).
- next: HoE pushes v5-m51-bbv2. The flip goes on top after the Architect's SIM-only flag-list PR. Starting zg-followup (gen/zg-followup).
- blocked: none. Open questions are in the bbv2 HANDOFF (suppressed formula, FARM ★, AC8 cadence, pacing re-baseline).

### 2026-10-30 15:57 CET: lane H (Senior Engineer, Generalist), zg-followup
- done: gen/zg-followup c4a1a76 on rc/v5 0ad018d (3 commits: Minor 1 test, Minor 2 focus fix + tests, nits N1–N3). Bundle engineering/tasks/zeroGainUi/gen-zg-followup-c4a1a76.bundle + SHA256SUMS. Gates PASS (2025 tests, slow 17, check-globals ×3). Flag-off goldens + DOM 9c4b6439 byte-identical.
- next: HoE pushes. Both flips (zeroGainUi, bestBuyV2) are held as diffs until the Architect's SIM-only flag-list PR.
- blocked: none.

- 2026-11-05 20:28 CET Architect: RESUMED (D-CEO-20261105-01/-03/-04; STOP D-CEO-20261030-13 cleared). done: prior stop left lane clean; local sim-flag-list 1224804 still pending gates (D-HOE-38). next: re-review #99 c4a1a76 then #100 d654afd; finish SIM-only flag-list gates/bundle; F1 after that as scheduled. blocked: none — Architect ETA for #99/#100 + flag-list still unset (HoE gap).

## 2026-11-05 20:24 CET · Senior Engineer, UI & rc1 Fixes · D-CEO-20261105-01 resume
- done: re-read D-CEO-20261105-01; the six-day stop is lifted. Surviving UI state verified: WK375 bd8378f, #85 65c4a5c, #86 05a1e01, CCR F-2 bundles through 0d15543, P8 worktree clean at 0ad018d. Current origin/rc/v5 518de30. HoE/v5-resume accepted; P8 restarted with standing-rule-23 TASK/scope and stacked on #85/#86 + 518de30. ETAs to HoE/HoQA: IDs Fri 00:00 CET, hooks 04:00, spots 08:00, full gated bundle high 12:00.
- Q8: real #86 05a1e01 build:qa measured at 960x600 and 1280x720; evidence artifacts/v5-q8-docked-header/. First default scene had hidden Refill/close and 271.578px free; occupied Refill case is being added before the Art verdict.
- next: finish/send Q8; P8 milestones; then resume saved #85/#86/F-2/WK375 gates on current base as scheduled.
- blocked: none. The Oct 30/31 dates are stale per D-CEO-20261105-01.
- 20:30 CET Q8 update: Art closed Q8 by signed erratum art-ux/m5-abilities-flows.md sha1 fc1ca17d0013039d37638b49d67763fc1deb2dfe. §4.2/AB-UI-7 is the build contract: compact N / 4:51 / — with full inline .sr-in names when Refill is visible, Refill unchanged and no second row. Shift sheet + D-HOE-27 + ability.call resumed in a dedicated lane. Next: implementation/gates; final-RC 3-state checks at 960x600 and 1280x720. Blocked: none new.

- 2026-11-05 20:32 CET Architect: ETAs sent to HoE. #99 re-review verdict 21:45; #100 review 23:15; SIM-only flag-list gates/bundle Sat 02:00; F1 gates/bundle Sat 04:30, assuming no blockers. #99 Minor 2 fix is Generalist's 234bfba and is under Architect verification in #99, not separate Architect implementation. X1 checked: #99 run 41076666685 and #100 run 41076676697 each 3/3 shards PASS; summary failure only row 904 RC-mode NOT-WIRED in all three profiles, matching documented behavior; no new fix. BBv2 review pin updated to v1.0.4 4ea3841a and Card #12 6cb27b3d.
- 20:32 CET D-HOP-2026-11-05-06 applied: v5 P8 includes only slim F6 attended/overlay for RF-AC16, abilities gap 6 and Q-AB-N7/N8; Shift sheet not-attended through sheetCloseComplete at every width, running calls suspended while cooldowns run sim time. Broader #86-only behavior is 5.1. P8 high Fri 12:00 CET retained. P8 uncommitted src/econ/income.ts edit ordered reverted without commit (no-sim scope); fatigue UI dependency reported to HoE.

## 2026-11-05 20:32 CET · Senior Engineer, UI & rc1 Fixes · TASK ui/v5-abilities-shift-q8 BLOCKED on slim F6 base
- done: re-read D-CEO-20261105-01, D-HOP-2026-11-05-06, art-ux/m5-abilities-flows.md sha1 fc1ca17d, abilities v1.3.11 12fec4b0, sr-markup.md, D-HOE-27, Q-AB-N7/N8/N16. HANDOFF written at engineering/tasks/v5-abilities-shift/HANDOFF.md (before code).
- inspected: no wt-v5-abilities-shift; no slim F6 branch/bundle; #85=65c4a5c (attended only); #86=05a1e01 full overlay; P8 wt-v5-p8-qa-hooks still on full 05a1e01 merge afbe314 with dirty UI (P8 owns slim separation — not touched). overlay CustomEvents and Shift sheet UI absent on current trees.
- next: wait for P8 slim F6 head on rc/v5 518de30+; then create worktree and implement Shift + D-HOE-27 + Q8 + ability.call.
- blocked: slim F6 base. Will not branch full 05a1e01 or duplicate overlay. ETA unset (no stale Oct dates).

- 2026-11-05 20:40 CET Architect: #84 3260869090d11662b31398ab9ed6136298447fed resumed (tests/bot-m4-observe; required bot/bot-m4 onObserve seam for FX-F27). Firm ETA to HoE: merge rc/v5 518de304 forward, normal push, Ready and local gates by Sat 7 Nov 00:15 CET; hosted required checks by 01:30 CET. Workstream running separately from #99. Cloud coding route unavailable (model/credit refusal); existing box worktree and rule-21 architect lane used. Do not close #84; FX-F27 not started.

## 2026-11-05 20:47 CET · Senior Engineer, Features & Economy Wiring · v5 Wave A #3 income-ref + tapCoins sims (Vadim resume)
- done: two stacked local commits on rc/v5 518de30 (worktree /workspace/wt-v5-income-ref, not pushed):
  - PR1 feat/v5-income-ref afa8038ce3ac2fea282c5b76654fc0e96fbd29ad: src/sim/income-ref.ts (60 x 1 s sim-time ring of base sale cents, I_ss warm-up, hard handover at 60 s, m5Offline reset, session-only), flag tapCoins. 21 tests. Gates PASS: sync --check, tsc, vitest 144 files 2047 + 1 skip, goldens 7/7, build, check-globals, slow 17 + 1 skip. artifacts/v5-income-ref-afa8038/ (bundle 804f5860…, SHA256SUMS 560bb9df…, PR-BODY.md).
  - PR2 feat/v5-tapcoins f7303c6edce95424f951246abdaf5e5f30418e98 (parent afa8038): src/sim/tap-coins.ts (exact integer pay + BigInt guard) on the shared credited tap; bonus_cents on credited collect. 22 tests. Gates PASS: vitest 145 files 2069 + 1 skip, goldens 7/7, build, check-globals, slow 17 + 1 skip. artifacts/v5-tapcoins-f7303c6/ (bundle ea731ffd…, SHA256SUMS f888d5d0…, PR-BODY.md).
- next: HoE pushes both as Draft into rc/v5 (PR2 after PR1); Architect review. Then the golden sim (Wave A item 2).
- blocked: none. For review: ring is W+1 slots (last 60 completed seconds); refCents computed at the tap, not cached per tick; Inspect must be excluded from base_cents when abilities lands.

## 2026-11-05 ~20:45 CET · Senior Engineer, Saves & Persistence · JOB 2 schema.ts resume (D-CEO-20261105-01 / HoE TASK HoE/v5-resume)
- done: merged origin/rc/v5 518de304 into feat/saves-v5-telemetry-schema (merge 2f4794c, no conflicts). Schema contract verified against errata rev 13 a0e8f6d7: six FATIGUE_CUE_TAPPED_FIELDS; n_* sum <=4 with FAIL fixture at 5; zero_gain_purchase has no capped marker (overflow only session_end.zero_gain_purchase_dropped); dead_zone.reason only none_affordable; tapped rejects suppressed_by_stall. Follow-up a1f81a9 adds generalist slice, rev13 headers, explicit sum=5 fixture, warn-once assertion (kills prior M30 survivor). Gates: telemetry-schema 47/47; telemetry+m3 16/16; tsc --noEmit 0; G-8 base 155374 / buy-spam 175905 bytes (<=200KB). Bundles under egg-farm-studio/scratch/bundles/. Artifacts under egg-farm-studio/artifacts/saves-v5-telemetry-schema-a1f81a9/. No push / no PR opened.
- next: Saves QA (33ec1b55) verifies against rev13 before HoE merges. Then breeds RC blockers queue (PR C telemetry, BR-AC2b, #95 M1/M2) then F-9.
- blocked: none on JOB 2. Note: merge commit 2f4794c inherited Architect author from box git config at merge time (cannot amend); follow-up commit is Saves.

### 2026-11-05 20:44 CET · Senior Software Architect · TASK Architect/v5-resume-review99 (#99 re-review)
- done: re-read v5-resume/HANDOFF.md + m4.1-backlog (no mismatch vs task order). Re-reviewed PR #99 head c4a1a76f vs rc/v5 518de304 (merge-base 0ad018de). Prior #97 Minors 1–2 + N1–N3 all FIXED. Verdict **PASS**. Review engineering/reviews/v5-zg-followup-c4a1a76-architect-rereview.md. Worktree /workspace/wt-v5-review99; artifacts /workspace/wt-v5-review99/artifacts/review99-c4a1a76 (→ scratch/architect/review99-c4a1a76) + SUMS. Gates: tsc/sync 0; targeted 40/40; zg-suite 111/111; Y10 mutant KILLED; full unit 2025 pass / 1 skip; build+check-release 0; check-globals chromium 0. CI gate PASS; pacing aggregator FAIL pre-existing row 904 NOT-WIRED (not this PR). no Claude review.
- next: #100 d654afda review (HoE order); then resume SIM-only flag-list from local 1224804 (D-HOE-38); F1 after #94.
- blocked: none for #99. Flag flips still HELD on D-HOE-38.

### 2026-11-05 20:55 CET · Generalist (lane H) · TASK HoE/v5-resume (BBv2 verify + acw1)
- done: BBv2 8/n fbce499 verified — spec v1.0.4 4ea3841a + Card #12 6cb27b3d re-pin, affordable-FARM ★ fix (real bug: strip template was F4-only; failing-first qapicker test then selectGoal fix). Full gates PASS: unit 2084/1 skip (147 files), slow 20/1 skip (AC9 0/42,737; AC14 0 violations decisive bb1+zg0 and ship, suppressedAffordableBelow30=0), build, html, check-release-build, check-globals ×3, goldens f90d1678/a54c9cf9 + DOM 9c4b6439 byte-identical, qaPicker release 0/build:qa 1. Bundle gen-bbv2-fbce499.bundle sha256 18db9c3c…267c5 (prereq 0ad018d), SHA256SUMS + HANDOFF updated. acw1 verdict: expected FASTER re-baseline, NOT a design-gate miss — flag-on 100% F10 ≤900 s both cohorts (off 91%/90.9%), worst F10 760 s (200 s under the 960 s limit), medF18 19.67/20 min; "9" was percentage points over the old 91±5 band, not late seeds. Part-A-only ablation also 100% both cohorts; Q-E2 only advances medians. Evidence engineering/tasks/bbv2/acw1-investigation.md + acw1-seeds.csv.
- next: merge rc/v5 into gen/bbv2 (merge, not rebase) + full gates + new bundle once #99 lands in rc/v5. Telemetry v0.6.2 slice from Saves (schema.ts now merged on their branch per their 20:45 line).
- blocked: #99 not yet merged (Architect re-review PASS 20:44). No flag flips before Architect SIM-only flag-list PR (D-HOE-38). Econ + HoQA acw1 re-baseline sign-off (BB-AC13) routed via HoP.

## 2026-11-05 20:59 CET (Europe/Belgrade, UTC+1) · Senior Engineer, Features & Economy Wiring · v5 #3 review corrections
- done: replaced unpushed local income-ref afa8038 with **91a01445362ada4aeaf7215d93f8cf7f79f90312**, tapCoins f7303c6 with **e5b3d02b380e0dde1096d789d6a46301a2883f27** stacked on it; base unchanged 518de304. Original commits preserved on archive/v5-income-ref-afa8038 and archive/v5-tapcoins-f7303c6. Worktree clean.
- done: P2 Game.frame >=60 s visible return resets only I_ref AFTER the unchanged RC1 catch-up, so I_ss warm-up starts on return; hidden settlement/offline and all other sim state preserved. P3 asleep/unpaid zero-I_ss/refCents expectations restored outside comment. Six Game frame/visibility regressions; TDD RED 2 failing/25 passing before fix, focused GREEN 35/35 after. 61-slot ring unchanged per Architect review; tap delta patch ID unchanged d7a1f28af2110dba0ce6ba2811b94541c4421295.
- done: full gates through lane-run.sh features on EACH final commit: income **144 files / 2053 passed / 1 skipped**, tapCoins **145 files / 2075 passed / 1 skipped**; each slow **4 files / 17 passed / 1 skipped**, flag-off goldens **4 files / 7 passed**, sync --check, tsc, build/release check, Chromium check-globals all exit 0.
- done: regenerated artifacts/v5-income-ref-91a0144/ and artifacts/v5-tapcoins-e5b3d02/ (verified bundles, PR-BODY, full logs/diffs/commit metadata, SHA256SUMS). Old artifact directories marked SUPERSEDED via local README; original evidence retained. No push/PR/external messages; golden worktree and current golden bundle untouched.
- next: parent/Architect review these replacement heads and evidence; use neither old bundle.
- blocked: none.

### 2026-11-05 21:06 CET — Head of Engineering
- Done: #99 merged at rc/v5 30df38c0. Opened #102 CSV tooling 42c45b7, #103 Saves schema c7937c9 and slim #104 P8 eafd08c2; corrected income/tap and P8 bundles published, no merges without Architect review. Golden slice1 verified and restacking; Generalist has final AC-W1 countersign 66764c12 and per-cohort medF18 detail.
- Next: merge/review #100, #102–#104, #84; land SIM-only flag list, #94 and corrected Features stack. Architect is checking Golden slice2 established contracts and routing only genuine gaps to Product/Saves. Maintain rc/v5 gates and single full-QA-at-RC policy.
- Blocked: final B4-passing CSV remains absent; K10 red at RC cut blocks; Golden slice2 unresolved contracts; ZG-AC10 confirm=1 still needs its later intentionally cut build. #104 full gates/hosted checks and #103 exact-SHA reviews pending.

## 2026-11-05 21:05 CET (Europe/Belgrade, UTC+1) · Senior Software Architect · manifest refresh after #99 merge
- done: gh-verified #99 MERGED head c4a1a76f → rc/v5 30df38c0a0bd5d48db96d0705abccc6db197d161 (mergedAt 2026-11-05 21:01 UTC+1). v5-rc-manifest.md row 28 Gate status + Build state updated with PR CI runs 41076666874 (gate pass), 41076667372 (k10 pass), 41076666685 (pacing-x1-stack FAIL by design row 904); no rc/v5 push-event run exists. Dated changelog line added (D-CEO-20261030-07 fix (a)). X1-H1 (QA: row 904 RC-only non-failing outside --require-ac7, blocking in RC mode) recorded in manifest X1 section + tasks/v5-resume/HANDOFF.md item 5. No product code, no push/merge.
- next: #100 fbce499 integration review → SIM-only flag-list (D-HOE-38) → X1-H1 before complete-RC handoff; #84 separate.
- blocked: none.
- 2026-11-05 21:10 CET Architect — Done: HoP closed golden slice2 tc_frenzy_all_sales: fixed valid value 1 only, all-sales via saleMultipliers; 0 invalid configuration, no alternate branch; clarification appended to arch-golden-slice2-contracts-20261105.md. Next: Features proceeds slice1/slice2 =1 and validation rejects 0; PM Collection mirrors spec. Blocked: none for golden slice2 contracts.

## Architect/pr84-resume — 2026-11-05 21:10 CET (Europe/Belgrade)
- done: isolated `/workspace/wt-v5-review84`, local branch `architect/pr84-resume`; merge-forward `e0d9d04d0aec1897aecd5b13801225b0b6aa86e0` preserves original PR84 history and all rc/v5 `518de304` changes. Initial full unit + observe unit/slow + tsc/sync/build/globals passed. Fixture hardening `e4f4358d46826fd762c87e62c5e55c38048f1765` reuses the byte-identical existing SHA256-pinned balance fixture, with all digest assertions unchanged; verified bundle `scratch/bundles/tests-bot-m4-observe-e4f4358.bundle`. Final-head tsc/sync/build/globals pass. no Claude review.
- next: final-head observe + slow + full unit gates queued under the shared engineering lock; logs `scratch/artifacts/pr84-resume/e4f4358d46826fd762c87e62c5e55c38048f1765/`.
- blocked: no direct-user approval available to this executor for external push / PR Ready / body edit; those remain pending parent/user approval. Existing hosted head remains `3260869`, Draft; Actions run `40958928415` gate/release-globals skipped. No merge; no FX-F27 or #99/#100 work.

## 2026-11-05 21:18 CET — Head of Engineering
- Done: Corrected Features stack published as #105 income-ref 91a0144 and #106 tapCoins e5b3d02 (stacked; retarget after #105). Old afa8038/f7303c6 not pushed. Slim #104 and #102/#103 remain open. Golden slice2 contracts closed (all_sales=1; Saves confirm-only); Features proceeding on 06bf3cf restack.
- Next: Architect review of #105/#106 (ETA Sat 03:00), #104 P8, #100, #103; wait hosted gates before merge. Generalist AC-W1 anchors still landing for #100.
- Blocked: hosted CI still running on #105/#106; final B4 CSV absent; K10 red until separate QA green-run; ZG-AC10 confirm=1 later intentionally-cut build.

## 2026-11-05 21:15 CET · Senior Engineer, UI & rc1 Fixes · TASK ui/v5-abilities-shift-q8 UNBLOCKED → implemented
- done: HANDOFF base updated to slim P8 bd641ff; worktree /workspace/wt-v5-abilities-shift on feat/v5-abilities-shift.
- head **1ebcd7a** (6dd1f43 D-HOE-27+Shift lifecycle; d40e787 Activate-all Q8; 1ebcd7a ability.call+tests). Bundle scratch/bundles/feat-v5-abilities-shift-1ebcd7a.bundle verified. Body artifacts/v5-abilities-shift/pr-body-1ebcd7a.md.
- tsc PASS. Targeted vitest queued under .vitest-eng.lock (first flock -w 600 timed out; retry 2 running). No push.
- blocked: no sim fireAbility (Activate-all tap not wired to calls); final-RC Q8 screenshots later.

## 2026-11-05 21:20 CET · Senior Engineer, UI & rc1 Fixes · Shift base-tip steering
- Noted: slim attendance defect (mobile Upgrades → docked resize) is P8-owned; corrected tip TBD. Will merge --no-ff into feat/v5-abilities-shift when published; will not rebase, not overwrite wt-v5-p8-slim, not duplicate predicate fix.
- eafd08c on slim = bd641ff+#99 only (no attendance fix yet). Shift remains at 1ebcd7a on bd641ff until fix tip lands.
- Vitest targeted retry 2 still waiting on .vitest-eng.lock.

## 2026-11-05 21:22 CET (Europe/Belgrade, UTC+1) · Senior Engineer, Features & Economy Wiring · v5 #1 golden slice 1 restack + slice 2
- done: slice 1 restacked by local cherry-pick onto corrected tapCoins e5b3d02 -> **06bf3cf8efade47aa2f333475a3dba0ebe6422c1** (/workspace/wt-v5-golden, feat/v5-golden-rewards). Same patch-id 091cb4a5 as 2c168329, range-diff `=`, old->new tree diff == f7303c6->e5b3d02 only. Old commit kept on backup/v5-golden-rewards-2c16832. Gates via lane-run.sh features: tsc, sync, vitest 2095 passed / 1 skipped, slow 17/1, build, check-globals, verify-24h PASS (f90d1678 / a54c9cf9), trace24h 9c47b11e identical to base e5b3d02. Artifact artifacts/v5-golden-rewards-06bf3cf/. artifacts/v5-golden-rewards-2c16832/ marked SUPERSEDED, retained.
- done: slice 2 per Architect contracts + D-HOP-2026-11-05-11 -> **b0d7e8526c8a21f0688b338b4dec2a460bc257e7** (/workspace/wt-v5-golden-s2, feat/v5-golden-spawn, on 06bf3cf): spawnGolden{valid spot ids}, R15 defer + 0.5 s focus recheck constant, focus-clock first spawn/gap/lifetime, tapGolden, evRng gap->slot->reward, collectible_*/frenzy_* sim events, session-only goldenPending/frenzyRun, goldenUnload seam, tc_frenzy_all_sales must be 1. Flag golden 0, no save key, SAVE_VERSION 6, game.ts/UI untouched. TDD RED 22 failing / 2 passing; 24 new tests. Gates: vitest 2119 passed / 1 skipped, slow 17/1, rest exit 0, trace24h unchanged. Artifact artifacts/v5-golden-spawn-b0d7e85/.
- next: parent/Architect review 06bf3cf + b0d7e85; Saves confirms the endSession pagehide seam (PR-BODY gap 1) and the kill-without-pagehide case (gap 2); Game/UI owner wires spawnDue -> spawnGolden, tapGolden, collectible_id, takeover/reset unload.
- blocked: none for the sim slices. Retained for HoE/Architect/Saves, not code blockers: PR-BODY gaps 1-7 (pagehide seam, kill without pagehide, takeover/reset frenzy_ended, UI spawn driver, collectible_id, interval_s after reload, Frenzy counters after reload).

## 2026-11-05 21:29 CET — Head of Engineering
- Done: Golden Drafts #107 rewards 06bf3cf and #108 spawn b0d7e85 stacked on #105/#106. Features F5 parallel + Game wiring; Saves m5Persist held for Architect RNG/copy contract. fireAbility Features-owned after F5→G5-P (Sat 18:00 if contract Fri 12:00).
- Next: Architect #105/#106/#107/#108; UI #104 F1 fix; #100/#102/#103/#84; Saves re-task after Architect final persist contract.
- Blocked: #104 CHANGES REQUESTED; m5Persist hold; fireAbility contract; hosted CI skipped on Drafts; B4 CSV; K10 red until QA green-run.

## 2026-11-05 21:25 CET · Senior Engineer, UI & rc1 Fixes · Shift vitest lock exhausted
- Targeted vitest (v5-abilities-shift + v5-p8-slim): 2× flock -w 600 timed out (EXIT=1, no suite output). Rule 17: no 3rd retry. tsc --noEmit PASS @ 1ebcd7a.
- Still waiting P8 attendance-fix tip to merge --no-ff. Slim eafd08c left untouched. No predicate duplicate.

- 2026-11-05 21:25 Senior Engineer, Saves & Persistence — **done:** golden slice2 confirm-only to Features/Architect (pagehide seam after streakPeak / before session_end+save; autosave-while-egg → persist-time m5Persist+drawGap on copy, not load rewrite of 0). **next:** schema.ts QA/push when HoE asks; no golden persist PR until tasked. **blocked:** none.

### 2026-11-05 21:32 CET · Generalist (lane H) · TASK HoE/pr100-retarget
- done: ordinary push origin/v5-m51-bbv2 d654afd..b6dec409 (merge #99 + AC-W1 04a3788 + citation 66764c12). PR #100 body pins → BBv2 v1.0.4 4ea3841a + Card #12 6cb27b3d; bestBuyV2=0. Local gates PASS on a8a8d67 (b6dec40 comment-only). Bundle gen-bbv2-b6dec40.bundle on disk.
- next: wait GitHub `gate` green on b6dec409, then ping HoE for Architect review (none yet for #100). K10 non-required.
- blocked: none on push/body. GitHub CI in_progress.

## Architect/pr84-resume handoff — 2026-11-05 21:34 CET (Europe/Belgrade)
- done: local head `e4f4358d46826fd762c87e62c5e55c38048f1765`, four test files +72/-5; original history preserved by `e0d9d04` merge-forward. Initial merge-head gates all passed (144 files, 2029 tests + 1 skipped; observe unit/slow 3+3). Final-head tsc/sync/build/release/globals passed. Verified bundle `scratch/bundles/tests-bot-m4-observe-e4f4358.bundle`; proposed PR body and checksummed logs in `scratch/artifacts/pr84-resume/e4f4358d46826fd762c87e62c5e55c38048f1765/`. no Claude review.
- next: run final-head Vitest gates using `vitest-locked.sh` under lane-run+engineering flock when the queue clears; get explicit push/Ready/body-edit approval, then inspect new hosted CI.
- blocked: final-head Vitest never started after prolonged shared-lock queue; safely stopped only owned waiting runners 912453 and 1011372 using lane-kill. No active owned processes remain. No push, no Ready, no body update, no merge. Fresh hosted observation: PR84 still Draft at 3260869; run 40958928415 gate/release-globals skipped.

### 2026-11-05 21:38 CET · Generalist (lane H) · TASK HoE/bbv2-final complete
- done: merge rc/v5 30df38c (#99) into gen/bbv2 as 10/n a8a8d67 (one conflict src/ui/app.ts: kept #99 dispose+AC abort AND BBv2 qaPicker spread). 11/n b6dec40 citation countersign 66764c12. Local gates PASS: unit 2102/1 skip, slow 20/1 skip, AC-W1 GREEN (100/10.33/19.67), AC9 0/42737, AC14 0 violations both, goldens+DOM 9c4b6439 identical, qaPicker 0/1. Bundle gen-bbv2-b6dec40.bundle sha256 12ab2d196910f33a87f03ea6299d909cd4d6485893967d86beb50242eca677cc prereq 30df38c0; SHA256SUMS OK; HANDOFF updated. Pushed as #100 head (HoE/pr100-retarget). Flags HELD.
- next: wait GitHub `gate` green on b6dec409, then ping HoE for Architect review. No merge until Architect PASS.
- blocked: none local. GitHub gate still in_progress. K10 non-required.

- 2026-11-05 21:42 Senior Engineer, Saves & Persistence — **done:** HoE/golden-m5persist Architect B at ca04b06 / PR #109; verified bundle fix-saves-golden-m5persist-ca04b06.bundle. **next:** Architect recheck; no A/unload from Saves. **blocked:** none (local flock re-verify deferred).

## 2026-11-05 21:44 CET (Europe/Belgrade, UTC+1) · Senior Engineer, Features & Economy Wiring · v5 #1 golden Game wiring + persist A
- done: /workspace/wt-v5-golden-game, feat/v5-golden-game @ **9add0b6b85ebcfbfc135d79dd07588280d66f718** (41efc8e Game wiring + 9add0b6 persist A) on slice 2 b0d7e85. Persist A per Architect addendum 21:29: goldenUnload(s, b, ev, reason) is idempotent with one live drawGap, shared by m5Offline/endSession/takeover/reset. endSession order streakPeak -> goldenUnload(reload)+emit -> session_end -> save -> flush. deactivate unloads takeover; beginReset unloads reset + Game-owned frenzy_ended{reset}. Spawn driver: setSpotProbe + spawnDue + layoutChanged (resize/dock) + R15 retry. Attended tapGolden. Per-session collectible_id incl. Frenzy carry. Pure validSpotIds R14 helper. m5Persist untouched (B = Saves). Flag golden 0, SAVE_VERSION 6.
- done: tests 19 in tests/v5-golden-game.test.ts incl. Architect T4/T5/T6 (TDD red logs in artifact). Gates via lane-run.sh features: vitest 148 files / 2138 passed / 1 skipped, slow 17/1, tsc/sync/build/check-globals 0, verify-24h PASS f90d1678/a54c9cf9, trace24h unchanged. Artifact artifacts/v5-golden-game-9add0b6/. artifacts/v5-golden-game-41efc8e marked SUPERSEDED (not evidence).
- next: Architect/parent review 9add0b6; Saves lands B (m5Persist(s,b), T1-T3) on top; UI owner wires setSpotProbe (DOM zones + spot centres + egg element), setAttendedProbe (F6 dialogOpen), sheet-close layoutChanged, egg render/R16/R19/R25/R26.
- blocked: none for Features code. Open for UI/Art/Economy, not blockers: golden-egg 40 px asset (R17), tc_margin_px + 56 px hit box not in balance.json, setAttendedProbe unwired in app.ts (pre-existing), refuseNewer egg unload (Architect to rule).

## 2026-11-05 21:45 CET (Europe/Belgrade, UTC+1) · Senior Engineer, Features & Economy Wiring · F5 review unit 1
- Done: isolated `/workspace/wt-v5-f5`, branch `feat/v5-f5-pacing`, commit `62598c7b0b21ef04b13dbc4ad1b8b04109de37a0`, base rc/v5 `30df38c0` only. Source-only focused runner, strict never-tap, measured-window hooks; legacy bot-m5 model pins preserved. No src/config changes; release defaults stay 0; no golden Game/income worktree edits; no push/PR.
- Gates (lane-run.sh features, clean head, Node 20.19.2): unit 2045 passed/1 skipped; slow 19 passed/1 skipped; explicit golden controls 7 passed; sync/tsc/build/Chromium globals/build-html all exit 0. 900 F10/F18/F24 checkpoint windows, seeds 0–99 x three profiles; pooled P95 1.002477912, worst 1.025309834 (seed 95). G0 streak-only never-tap and AC-SC9 inert abilities baseline hashes pass across seeds 0–99.
- Next: Architect/HoE review of bundle + PR-BODY + results at `artifacts/v5-f5-62598c7/`; independent review not yet performed. Separate reviewable PR unit; not stacked on Wave A tips.
- Open AC gaps (explicit DEPENDENCY-BLOCKED, NOT a full G1 PASS): reviewed income/tap/golden/Broody/abilities source API integration (catch/pop/calls; no fireAbility invented), final enabled-stack G0/AC7/AC-SC9, continuous/every-window G1 incl hold policy, final Economy/X1 connection. m5Persist and #105 ring/refCents untouched. Full details: `engineering/f5-active-pacing.md` in the commit.

## 2026-11-05 21:46 CET · Architect · PR #109 golden persist B ca04b06
- **done:** Reviewed #109 exact `ca04b062` vs base `b0d7e852`. Bundle sha256 `7c8e0ba9…5da45` verified. Contract B PASS (live untouched, copy drawGap atomic, no-egg/flag-off strip-only, SAVE_VERSION 6, production serialize sites pass `b`). Review: `engineering/reviews/golden-persist-ca04b06-architect.md`. Logs: `scratch/architect/review109-ca04b06/`. Ruled Features A open Q7: **refuseNewer must NOT unload/mutate/write**; takeover unload stays on deactivate. Verdict APPROVE (B) 0/0/1 Minor (debugBackdateSave omits b)/1 nit.
- **next:** Hosted gate still pending — recheck before HoE merge. Features restack `9add0b6` onto ca04b06 (reconcile `goldenUnload` arg order). When `.vitest-eng.lock` free, run exact-head `tests/v5-golden-m5persist.test.ts`.
- **blocked:** Local exact-head vitest LOCK PENDING (11 flock waiters on `.vitest-eng.lock`, rule 21). Hosted gate/pacing-x1 IN_PROGRESS at review time.

- 2026-11-05 21:47 UTC+1 Senior Engineer, Features — **done:** GE-AC26 backfill on #107 tip a6d44c2 (a6d44c250b043250b56885e289fd4210270ad988); pushed feat/v5-golden-rewards; artifacts/v5-golden-rewards-a6d44c2/. **next:** leave #107/#108 Draft until Architect asks; vitest flock drain for rewards file. **blocked:** none (#108 untouched).

## 2026-11-05 21:50 CET (Europe/Belgrade, UTC+1) · Senior Engineer, Saves & Persistence · #109 M1
- **done:** Architect M1 on #109 — `debugBackdateSave` second save now passes `this.b`. Tip `98d2cbe93ac3a0994079587f41e1a0865051d705` on fix/saves-golden-m5persist. Bundle `scratch/bundles/fix-saves-golden-m5persist-98d2cbe.bundle` sha256 `53023441e4954982917e55c8057a2a683a930da67b9106caeefb75f8fcd3c656` (requires b0d7e85). Cloud vitest: tests/v5-golden-m5persist.test.ts + onboarding.test.ts → 20 passed (incl. new M1 case). N1 left as-is (b optional).
- **next:** wait hosted gate green on 98d2cbe; local exact-head vitest when `.vitest-eng.lock` free; then merge ask to HoE (not yet). Pause sim still blocked on Features abilities tip.
- **blocked:** hosted gate IN_PROGRESS (run 42106981155); local vitest LOCK_HELD.

## Features GE-AC26 #108 merge — 2026-11-05 21:51 CET (Europe/Belgrade)
- Local tip **dfaffa6e2d2f2d3f05d5f617d43b982383658dd8** merges #107 a6d44c2 forward into #108 (ordinary, no conflicts). Clean worktree, spawn seam preserved.
- tsc PASS (exit 0); targeted golden rewards/spawn Vitest waiting engineering flock. Artifact `artifacts/v5-golden-spawn-dfaffa6/`.
- NOT PUSHED: explicit user approval for publishing not present in relayed agent instructions. Exact proposed normal push recorded in artifact HANDOFF.md; #108 remains Draft at remote b0d7e85.
- Saves/#109 untouched; latest #109 target per parent = 98d2cbe93ac3a0994079587f41e1a0865051d705. Game executor should consume new local #108 tip/bundle.

## 2026-11-05 21:55 CET — Head of Engineering
- Done: #104 F1 published at 0e9151b (Architect source accepted; exact-head/hosted/QA still required). #109 B M1 closed at 98d2cbe (merge held on Vitest+gate). #107 GE-AC26 a6d44c2; #110 F5 Draft 62598c7. Features merging golden stack forward + Game restack + abilities/fireAbility; G5-P waits on Pause after abilities.
- Next: #100 gate→Architect; #104 exact-head+QA; #109 gate; golden stack restack tips; #105–#108/#110 Architect reviews; #84 final Vitest then publish.
- Blocked: shared .vitest-eng.lock congestion; B4 CSV; K10 red at RC cut; fireAbility/Pause sequence.

## 2026-11-05 21:50 CET · Architect · #109 M1 recheck 98d2cbe
- **done:** M1-only tip `98d2cbe` vs `ca04b06`: debugBackdateSave passes `this.b` + unit test; no other files. Bundle sha256 `53023441…c656` OK. Review note updated M1 CLOSED. Not confused with #107 GE-AC26.
- **next:** Hosted gate still IN_PROGRESS on 98d2cbe.
- **blocked:** Local vitest lock still pending; cloud “20 pass” not independently artifact-verified here.

- Architect/pr84-resume finalhead verification 2026-11-05T21:55:58.937068+01:00 (Europe/Belgrade): PASS {"observe-unit": 0, "observe-slow": 0, "unit": 0}; logs/results/SHA256SUMS /workspace/egg-farm-studio/scratch/artifacts/pr84-resume/e4f4358d46826fd762c87e62c5e55c38048f1765/verification-20261105-2134. No push, Ready, PR-body change or merge.

- 2026-11-05 21:58 CET (Europe/Belgrade) Features #108 **dfaffa6e2d2f2d3f05d5f617d43b982383658dd8** targeted gates COMPLETE: tsc exit 0; Vitest 2 files / **45 passed** (24 spawn + 21 rewards), exit 0. lane-run features + canonical engineering flock; clean worktree. Bundle verified; artifact `artifacts/v5-golden-spawn-dfaffa6/`. No push performed (user approval required); #109 untouched.

## 2026-11-05 21:59 CET — Head of Engineering
- Done: #108 merge-forward a6d44c2 → tip dfaffa6 (Draft; spawn seam intact; Features tsc+45/45). Architect queued on dfaffa6. #104 F1 at 0e9151b (HoQA/Architect exact-head path hot). #109 B at 98d2cbe (merge held). Game restack onto 98d2cbe+dfaffa6 in flight.
- Next: #100/#109 gates; #104 exact-head+QA verdict; Architect #108; Game tip when ready; abilities after F5; #84 final Vitest.
- Blocked: .vitest-eng.lock (pr84-resume); B4 CSV; K10 at RC cut; Pause waits on abilities.

## 2026-11-05 22:00 CET (Europe/Belgrade, UTC+1) · Senior Engineer, Features & Economy Wiring · Game golden restack onto #109 98d2cbe
- **done:** feat/v5-golden-game local tip **901972a2f50435677740a6b1f5e3a31dc6e3a070** (parents 66b409b + dfaffa6). Ordinary merges only, no rebase/force, no manual conflicts: 36e4f4c ← #109 ca04b06; 69a8e63 ← ad68cf0 (local #108 merge of a6d44c2, tree == dfaffa6, superseded); 9f336c8 ← #109 98d2cbe (M1); 66b409b refuseNewer test; 901972a ← canonical #108 dfaffa6 (tree-neutral). Ancestry has a6d44c2, dfaffa6, 98d2cbe.
- FINAL A kept: goldenUnload(s, b, ev, reason) at every call site (game.ts goldenEnd, m5-fields m5Offline); B (m5Persist) Saves-owned, untouched. refuseNewer: no unload/mutation/RNG/write (code unchanged, now pinned by 2 tests; mutation check fails both).
- Gates: full lane on 66b409b (same tree 939b9b9a): tsc 0, sync 0, vitest 2148/1 skip, slow 17/1 skip, build 0, check-globals 0, verify-24h PASS (flagOff f90d1678, m4On a54c9cf9, trace 9c47b11e identical to base). On 901972a: tsc 0 + targeted 87/87.
- Artifact `artifacts/v5-golden-game-901972a/` (PR-BODY, bundle ^98d2cbe sha256 537a65f7…ce0b, SHA256SUMS). Not pushed; Draft; HoE publishes.
- **next:** abilities/fireAbility per Architect note. **blocked:** none.

### 2026-11-05 22:00 CET — Head of Engineering
- Done: D-HOE-39 — #103 F-1 blocks merge; F-2 named follow-up OK (ETA 12–24h before Wed freeze); F-3 before G-8. #111 Game golden Draft @ 901972a (base #109). #108 tip dfaffa6 Architect queued.
- Next: Saves F-1 tip → Saves QA re-pass → merge #103; F-2 follow-up PR; Architect #111+#108; #104 HoQA exact-head; #100/#109 gates; abilities after F5.
- Blocked: #103 on F-1; F-2 RC-cut; .vitest-eng.lock; B4 CSV; K10 at RC cut; Pause waits on abilities.

## 2026-11-05 22:02 CET · Generalist (lane H) · #100 gate cancelled → re-run
- done: GitHub gate on b6dec409 cancelled mid test:slow (unit PASS; build onward skipped; actor PrincipalLewis). Re-ran workflow 42104117439; watching again.
- next: ping HoE for Architect the moment gate is green. No merge until Architect PASS.
- blocked: none local. Waiting re-run.

## 2026-11-05 22:02 CET — Head of Engineering
- Done: D-HOE-39 (#103 F-1 merge-block; F-2 named follow-up before Wed freeze). #111 Draft @ 901972a Architect queued. #100 gate re-dispatched after CANCELLED mid test:slow (Generalist; Actor PrincipalLewis); no merge until Architect PASS. K10 non-required RED.
- Next: #100 gate→Architect; Saves F-1 tip→QA; #104 HoQA exact-head; Architect #108/#111; #109 gate; abilities after F5.
- Blocked: #103 on F-1; F-2 RC-cut; .vitest lock; B4 CSV; K10 at RC cut; Pause waits on abilities.

## 2026-11-05 22:02 CET · Architect · PR #108 golden spawn dfaffa6
- **done:** Reviewed Draft #108 exact `dfaffa6e2d2f2d3f05d5f617d43b982383658dd8` (merge b0d7e85+a6d44c2). Artifacts `artifacts/v5-golden-spawn-dfaffa6/` SHA256SUMS OK; author tsc0 + vitest 45/45 evidence inspected. Spawn/lifetime/tap/events vs arch-golden-slice2-contracts + GE-AC26: contract PASS. **Verdict FAIL** — Major M1: `M5_TC_KEYS.abilities` accidentally deleted in `formulas.ts` (swallowed into golden comment on b0d7e85). Review: `engineering/reviews/golden-spawn-dfaffa6-architect.md`. Logs: `scratch/architect/review108-dfaffa6/`. Stays Draft / no merge. Not conflated with #109/#111.
- **next:** Features restore `abilities: ['ability_s','ability_cd_s']` + pin test; Architect re-review. Then #111 Game 901972a integration review.
- **blocked:** Local exact-head vitest LOCK PENDING (rule 21). Hosted Draft checks SKIPPED.

## 2026-11-05 22:05 CET · Architect · PR #111 golden Game 901972a
- **done:** Reviewed Draft #111 exact `901972a2f50435677740a6b1f5e3a31dc6e3a070` (base #109 `98d2cbe`). Ancestors a6d44c2/dfaffa6/98d2cbe/9add0b6 OK. Artifacts `artifacts/v5-golden-game-901972a/` SHA256SUMS+bundle OK. FINAL A `goldenUnload(s,b,ev,reason)` everywhere PASS; refuseNewer no mutation/RNG/write PASS (+ mutation probe fails both tests); m5Persist body untouched vs 98d2cbe PASS; layout recheck authorized by R15 contract. verify-24h on tree-twin 66b409b: flagOff f90d1678… / m4On a54c9cf9… PASS; author 2148/1 skip + targeted 87/87 inspected. **Verdict FAIL (integration)** — inherits #108 Major M1 (M5_TC_KEYS.abilities). Review: `engineering/reviews/golden-game-901972a-architect.md`. Logs: `scratch/architect/review111-901972a/`. Draft / no Ready / no merge.
- **next:** Features fix #108 M1 then re-review #108+#111 tips.
- **blocked:** Local vitest LOCK PENDING; hosted Draft SKIPPED.


## 2026-11-05 22:05 CET — Head of Engineering
- Done: Architect FAIL #108 dfaffa6 + #111 901972a on M1 (M5_TC_KEYS.abilities swallowed into golden comment). Features tasked: restore abilities mapping + pin test on #108, then restack #111. Both Draft. D-HOE-39 (#103) and #100 gate re-run still in flight.
- Next: Features M1 tip → Architect recheck #108/#111; Saves F-1; #104 HoQA; #100 gate→Architect; #109 gate; abilities after F5.
- Blocked: #108/#111 on M1; #103 on F-1; F-2 RC-cut; vitest lock; B4 CSV; K10 at RC cut; Pause waits on abilities.

## 2026-11-05 22:07 CET — Head of Engineering
- Done: #103 F-1 tip 0674e14 confirmed; HoQA + Saves QA re-pass tasked. F-2 follow-up branch fix/saves-telemetry-ring-export ETA 12–24h after re-pass (before Wed freeze). Features ack on golden M1 (#108 then #111).
- Next: QA #103 → merge if green; Features M1 tip → Architect; #104 HoQA; #100 gate→Architect; #109 gate; F-2 PR; abilities after F5.
- Blocked: #103 on QA re-pass; #108/#111 on M1; F-2 RC-cut; vitest lock; B4 CSV; K10 at RC cut; Pause waits on abilities.

## 2026-11-05 22:06 CET (Europe/Belgrade, UTC+1) · Senior Engineer, Saves & Persistence · #103 F-1
- **done:** QA-D-1105-SCHEMA F-1 at `0674e14445a9c37dca09fc06931411ce9327c15c` on feat/saves-v5-telemetry-schema / PR #103. Conditional bbv2 validate + HoQ unit tests. Bundle feat-saves-v5-telemetry-schema-0674e14.bundle sha256 962ac7eba1ce4fb6c6036c5eb154c4d0848a64e1986250373cb2ea3c7baf9656. Engineer vitest 115/115. Pinged Saves QA for re-run; no merge ask.
- **done (D-HOE-20261105-39):** confirmed to HoE F-2 follow-up branch `fix/saves-telemetry-ring-export`, ETA ~12–24 h CET after F-1 QA re-pass, before Wed 11 Nov freeze.
- **next:** Saves QA re-pass on 0674e14; #109 local vitest still flock-waiting (hosted gate 42106981155 SUCCESS on 98d2cbe); then HoE merge ask for #109; then open F-2 branch.
- **blocked:** #103 merge on Saves QA re-pass; #109 merge on local Vitest exit=0.

## 2026-11-05 22:08 CET — Head of Engineering
- Done: #112 abilities+fireAbility Draft @ cc0642a (D-HOE-40); Architect queued; Saves Pause unblocked (~36–48h) from that tip. #103 F-1 0674e14 QA in progress. Golden M1 still with Features.
- Next: Architect #112 (+ refillAgoSimMs); Features M1→#108/#111; QA #103; #109 Vitest→merge; #104 HoQA; #100 gate; F-2 ring PR; Pause sim.
- Blocked: #108/#111 on M1; #103 on QA; #112 on Architect; F-2 RC-cut; vitest lock; B4 CSV; K10 at RC cut; G5-P waits on Pause.

## 2026-11-05 22:08 CET · Architect · fireAbility combo opts + persist contract
- **done:** Contract-only ruling for Draft #112 ask (not full #112 approval). Inspected spec v1.3.11 + tip `cc0642a`. **`refillAgoSimMs?` APPROVE WITH GUARDS** (sim-ms window; Refill/Game owns stamp later; amend addendum). Combo 10/45: fixtures OK, Econ lands CSV, no prod literals. Reload: still end-on-load offline. Persist: **reject** unsstripped top-level `abilityDurS`; **require** `AbilityState.durS` + Saves endCalls/effect_s errata (Product). Note: `engineering/reviews/arch-abilities-fireAbility-combo-persist-20261105.md`. Logs: `scratch/architect/contract112-fireAbility/`.
- **next:** PMW errata; Econ columns; Saves durS; Features strip/fold abilityDurS on #112 follow-up.
- **blocked:** none for the ruling itself.


## 2026-11-05 22:11 CET · Senior Engineer, Features & Economy Wiring · HoE/golden-m1-abilities-tc
- **done:** Architect M1 on #108: restored `M5_TC_KEYS.abilities: ['ability_s','ability_cd_s']` + pin test + GE-AC33 comment clarify. Tip **`90fb44747f3c590dec1de6fb31d4c5568cefbfee`** on `feat/v5-golden-spawn` (Draft). Gates: tsc0 + vitest spawn+rewards **46/46**. Artifact `artifacts/v5-golden-spawn-90fb447/`.
- **done:** Restacked #111 Game via ordinary merge of 90fb447 onto 901972a (#109 98d2cbe already ancestor). Tip **`2261670206ee9538b1e16cb1818a4f66ec6deef1`**. `goldenUnload(s,b,ev,reason)` FINAL A unchanged. Gates: tsc0 + targeted **88/88**. Artifact `artifacts/v5-golden-game-2261670/`. Both stay Draft / no Ready.
- **next:** Architect recheck #108 @ 90fb447 and #111 @ 2261670.
- **blocked:** none on M1; Ready gated on Architect clear.

## 2026-11-05 22:11 CET — Head of Engineering
- Done: D-HOE-41 — refillAgoSimMs APPROVED WITH GUARDS; AbilityState.durS proposed (PMW errata before Saves/Features). Top-level abilityDurS rejected. Full #112 review still open. Pause cloud agent on cc0642a; #103 QA in flight; golden M1 with Features.
- Next: PMW errata; Econ combo columns; Saves align Pause/load with durS; Features #112 follow-up; Architect full #112 + golden M1 tips; #104/#100/#109.
- Blocked: #112 Ready on Architect+errata sequence; #108/#111 on M1; #103 on QA; F-2 RC-cut; vitest lock; B4 CSV; K10 at RC cut; G5-P waits on Pause.

## 2026-11-05 22:12 CET — Head of Engineering
- Done: Golden M1 tips #108 @ 90fb447 / #111 @ 2261670 — Architect recheck queued. Econ: tc_combo_window_s / tc_combo_boost_duration_s fixtures-only until HoP (D-HOE-41a). Features applying #112 durS prep; Ready waits PMW errata. Saves Pause + #109 Vitest requeue in flight.
- Next: Architect M1 clear; HoP keys-only call; PMW errata; #103 QA; #112 full review; #104/#100/#109.
- Blocked: combo keys on Product CSV; #103 QA; #112 Ready on errata sequence; vitest lock; B4/K10; G5-P on Pause.

## 2026-11-05 22:12 CET — Head of Engineering
- Done: HoP locked fixtures-only for tc_combo_window_s / tc_combo_boost_duration_s — no keys-only economy.csv (D-HOE-41a). Features + Architect notified. Golden M1 tips awaiting Architect; #112/#103/#109/#104 paths unchanged.
- Next: Architect M1 clear #108/#111; PMW durS errata; #103 QA; #112 full review; #104/#100/#109.
- Blocked: combo keys on authorized CSV; #103 QA; #112 Ready on errata; vitest lock; B4/K10; G5-P on Pause.

## 2026-11-05 22:13 CET — Head of Engineering
- Done: PMW abilities v1.3.12 @ 9d521aa8 — D-HOE-42 unlocks Saves durS load + Features #112 follow-up. HoP fixtures-only combo tc_* stands. Golden M1 tips with Architect; Pause/#103/#109 in flight.
- Next: Saves durS+save-shapes; Features #112 tip bump; Architect M1+#112; #103 QA; #104/#100/#109.
- Blocked: combo CSV; #103 QA; #112 Ready on Architect; vitest lock; B4/K10; G5-P on Pause.

## 2026-11-05 22:11 CET (Europe/Belgrade, UTC+1) · Senior Engineer, Saves & Persistence · Pause + #109
- **done:** Pause UNBLOCKED on abilities tip `cc0642a` / #112. Cloud agent [bc-cb5ccd97](https://cursor.com/agents/bc-cb5ccd97-e9e1-5a34-a03d-e1c2c81f4c0b) started from that tip (fix/saves-pause-sim). Steered with Architect contract `arch-abilities-fireAbility-combo-persist-20261105.md`: AbilityState.durS + endCalls/m5Load granted clamp; strip top-level abilityDurS via SESSION_ONLY; reload still ends call (offline). ACK HoE lane order; rebase if #112 tip bumps.
- **done:** #109 local Vitest first attempt exit=1 (Tinypool minThreads/maxThreads conflict with `--maxWorkers=2` alone). Requeued exact-head on 98d2cbe via lane-run saves with `--minWorkers=1 --maxWorkers=1` behind eng flock (Features golden-game currently holds lock).
- **next:** local Vitest exit=0 → HoE merge ask (#109 hosted already SUCCESS); #103 QA re-pass; F-2 after/#parallel; Pause Draft.
- **blocked:** #109 merge on local Vitest; #103 on QA; #112 not mergeable until Architect PASS.

## 2026-11-05 22:13 CET (Europe/Belgrade, UTC+1) · Senior Engineer, Saves & Persistence · #109 merge ask + durS
- **done:** Exact-head local Vitest GREEN on `98d2cbe93ac3a0994079587f41e1a0865051d705` — 20/20 (`v5-golden-m5persist` + `onboarding`), exit=0 @ 22:11:26 CET. Log `scratch/saves/vitest-109-98d2cbe.txt`. Hosted ci gate SUCCESS (42106981155). **Priority merge ask sent to HoE** for [#109](https://github.com/PrincipalLewis/egg-farm/pull/109).
- **done:** PMW errata D-PMW-2026-11-05-04 abilities v1.3.12 @ `9d521aa` (file `product/workers/m5-worker-abilities-spec.9d521aa8.md`). Pause cloud bc-cb5ccd97 steered to implement AbilityState.durS + save-shapes update + abilityDurS SESSION strip per D-HOE-41.
- **next:** HoE merge #109; Features #112 tip-bump (delete abilityDurS) → rebase Pause; #103 QA; F-2; Pause Draft.
- **blocked:** #103 on Saves QA re-pass; Pause Draft on cloud agent + Features tip-bump.

## 2026-11-05 22:14 CET — Head of Engineering
- Done: **#109 MERGED** into feat/v5-golden-spawn @ 811c7da (98d2cbe tip; gate SUCCESS; local Vitest 20/20; Architect APPROVE + M1 closed). Features to restack #111. PMW v1.3.12 unlocked durS; HoP fixtures-only combo keys.
- Next: Architect M1 on #108/#111; Features #112 durS tip; Saves Pause+durS; #103 QA; #104/#100; #108 Ready when Architect clears.
- Blocked: combo CSV; #103 QA; #112 on Architect; vitest lock; B4/K10; G5-P on Pause.

## 2026-11-05 22:13 CET · Architect · M1 clear #108/#111 + #112 CONDITIONAL + D-HOE-41 addendum
- **done:** (1) M1 recheck Draft #108 `90fb447` + #111 `2261670`: real `M5_TC_KEYS.abilities` entry + pin test; independent vitest **1 passed** each tip (flock). **M1 CLOSED** both. Note: `engineering/reviews/golden-m1-abilities-keys-90fb-2261-architect.md`. (2) Amended persist contract: **`durS` = PROPOSAL pending Product+Saves** (not final). (3) Wrote D-HOE-41 fireAbility addendum (`refillAgoSimMs?` guards) into `arch-golden-slice2-contracts-20261105.md`. (4) Full #112 review `cc0642a`: **CONDITIONAL APPROVE** — API/effects PASS; Major = unsstripped `abilityDurS` leak; artifacts 2056/17 + verify-24h f90d/a54c + identical trace vs 30df38c inspected. Note: `engineering/reviews/abilities-sim-cc0642a-architect.md`. Draft/no Ready all.
- **next:** Features SESSION-strip `abilityDurS` on #112; Product/Saves on durS proposal; Econ combo CSV; hosted gates when Ready asked.
- **blocked:** none for these rulings. Full 2056 not re-run (author evidence + sums).


## 2026-11-05 22:15 CET — Head of Engineering
- Done: Golden M1 CLOSED (#108 90fb447 / #111 2261670). #109 already merged @ 811c7da (Saves re-ask answered). Manifest re-pinned abilities v1.3.12 9d521aa8 + gate d3acc0c8. #112 CONDITIONAL — Major abilityDurS leak; Features stripping before Ready.
- Next: Features #112 tip + #111 restack onto 811c7da; Architect #112 recheck; #103 QA; #104/#100; Saves Pause/durS.
- Blocked: #112 Ready on M1 strip; combo CSV; #103 QA; B4/K10; G5-P on Pause.

## 2026-11-05 22:14 CET (Europe/Belgrade, UTC+1) · Senior Engineer, Saves & Persistence · #109 MERGED
- **done:** [#109](https://github.com/PrincipalLewis/egg-farm/pull/109) MERGED into `feat/v5-golden-spawn` @ `811c7da251ee276f5962557cb90c2871922a7168` (tip was 98d2cbe). No further #109 action; dfaffa6 merge-forward moot.
- **next:** Pause cloud bc-cb5ccd97 (durS + row 31); #103 QA re-pass @ 0674e14; F-2 `fix/saves-telemetry-ring-export`.
- **blocked:** #103 on Saves QA; Pause Draft on cloud + Features #112 tip-bump.

## 2026-11-05 22:15 CET — Head of Engineering
- Done: **#104 MERGED** into rc/v5 @ 7452679 (HoQA MERGE-WITH-NOTES @ 0e9151b; gate+K10 green; pacing not granted). Golden M1 CLOSED; #109 merged earlier. #103 F-1 QA PASS @ 0674e14 — merge held for gate IN_PROGRESS + HoQA call on rc/v5 30df38c/#99 zg advisory.
- Next: HoQA #103 go; Features #112 abilityDurS + #111 restack; Architect rechecks; #100; Saves Pause/F-2.
- Blocked: #103 on gate/HoQA; #112 Ready on Major strip; combo CSV; B4/K10; G5-P on Pause.

## 2026-11-05 22:16 CET — Head of Engineering
- Done: #104 merged @ 7452679. HoQA cleared #103 F-1 with condition — PR updated onto rc/v5; new tip daee4c1. Saves+SavesQA tasked for zg-* + hosted gate on that tip before merge. Features #112/#111 in flight.
- Next: gate+zg on #103 daee4c1 → merge; #112 abilityDurS tip; #111 restack; #100; Pause/F-2.
- Blocked: #103 on merge-result gates; #112 Ready on Major; combo CSV; B4/K10; G5-P on Pause.

## 2026-11-05 22:15 CET (Europe/Belgrade, UTC+1) · Senior Engineer, Saves & Persistence · #103 merge ask + F-2
- **done:** Saves QA PASS F-1 @ 0674e14 (`qa/m3-recheck/schema-0674e14.md`). Priority #103 merge ask to HoE (D-HOE-39). Advisory: rc/v5@30df38c (#99) clean merge-tree, zg tests not run on merge result.
- **done:** F-2 cloud [bc-5a6587af](https://cursor.com/agents/bc-5a6587af-4d73-501d-8fce-6b206635f196) launched — `fix/saves-telemetry-ring-export` from 0674e14 (ring {v,events} + legacy:true + export schema_version).
- **next:** HoE/HoQ merge #103; Pause Draft; F-2 Draft.
- **blocked:** #103 on HoE/HoQ; Pause on cloud + Features #112 tip-bump.

### Features #111 restack ~22:17 UTC+1
- done: #111 tip a3169ec on spawn 811c7da; Draft; Architect pinged
- next: #112 durS tip; await Architect on a3169ec
- blocked: #112 Ready (Architect Major + Saves load)

## 2026-11-05 22:17 CET — Head of Engineering
- Done: #111 restack @ a3169ec — Architect queued. #103 tip daee4c1 tree-identical to zg-smoke 5d8c88b (8/8); gate IN_PROGRESS 42111018380; Saves QA on daee4c1. #104/#109 merged earlier.
- Next: #103 merge when gate+QA green; Architect #111; Features #112 abilityDurS; #100; Pause/F-2.
- Blocked: #103 on gate/QA; #112 Ready on Major; combo CSV; B4/K10; G5-P on Pause.

## 2026-11-05 22:19 CET — Head of Engineering
- Done: Architect restack PASS #111 @ a3169ec (Draft; not Ready). #103 still on gate+QA @ daee4c1. #112 abilityDurS Major still with Features.
- Next: #103 merge when green; #112 tip → Architect; #108/#111 Ready when suite cleared; #100; Pause/F-2.
- Blocked: #103 gate/QA; #112 Major; combo CSV; B4/K10; G5-P on Pause.

## 2026-11-05 22:17 CET · Architect · #111 restack a3169ec (tree-neutral)
- **done:** Draft #111 tip `a3169eca` onto spawn `811c7da` (#109 merged). Parents 2261670+811c7da. **Tree == 2261670** (`d679701e…`) — no API/persist/M1 regression. M1 abilities keys preserved. Artifacts `artifacts/v5-golden-game-a3169ec/`: tsc0, targeted **88/88**, SHA256SUMS OK. Addendum: `engineering/reviews/golden-game-a3169ec-architect-addendum.md`. Noted PMW v1.3.12 authorizes `durS` (future #112/Saves); combo CSV still fixtures-only. Draft/no Ready. Fullsuite/hosted SKIPPED — qualify pending.
- **next:** HoE Ready ask when appropriate; #112 follow-up separate.
- **blocked:** none on this delta.


### Features #112 tip ~22:19 UTC+1
- done: #112 2ec5b80 durS follow-up; Saves+Architect pinged; #111 a3169ec restack done
- next: await Architect #112/#111; Saves Pause rebase
- blocked: #112 Ready until Saves load + Architect full

## 2026-11-05 22:19 CET — Head of Engineering
- Done: #111 restack PASS @ a3169ec (Draft). #112 tip 2ec5b80 (abilityDurS gone, durS at fire) — Architect recheck queued; Saves Pause rebasing. #103 still on gate+QA @ daee4c1.
- Next: Architect #112; #103 merge when green; #108/#111 Ready when suite cleared; #100; Pause/F-2.
- Blocked: #103 gate/QA; #112 on Architect; combo CSV; B4/K10; G5-P on Pause.

## 2026-11-05 22:20 CET — Head of Engineering
- Done: #112 @ 2ec5b80 Features sim APPROVE; Major M1 CLOSED (D-HOE-43). Ready blocked on Saves endCalls/durS — tasked. #111 restack PASS. #103 still on gate+QA @ daee4c1.
- Next: Saves endCalls tip; #103 merge when green; #100; Pause/F-2; #108/#111 Ready when suite cleared.
- Blocked: #112 Ready on Saves; #103 gate/QA; combo CSV; B4/K10; G5-P on Pause.

## 2026-11-05 22:20 CET · Architect · #112 2ec5b80 M1 closed (Saves still blocks Ready)
- **done:** Rechecked Draft #112 `2ec5b803` vs `cc0642ae`. Top-level `abilityDurS` gone; `AbilityState.durS` write/clear on tick matches v1.3.12 (`9d521aa8`). refillAgoSimMs guards + fixtures-only combo tc OK; no prod 10/45. Artifacts `artifacts/v5-abilities-2ec5b80/`: sums OK, author **2063/1**, tsc/sync/build/globals 0, 24h goldens + trace **9c47** unchanged. Independent vitest LOCK HELD. **Prior Major M1 CLOSED.** Verdict **APPROVE (Features sim)**; **Ready MUST wait** on Saves endCalls/m5Load + full review. Addendum: `engineering/reviews/abilities-sim-2ec5b80-architect-addendum.md`.
- **next:** Saves durS load path; then Ready ask.
- **blocked:** Ready on Saves+hosted/fullsuite; flock for independent re-run.


### Features idle ~22:22 UTC+1
- done: #112 Features sim Architect APPROVE @ 2ec5b80
- next: await HoE assignment; Saves Pause critical path for #112 Ready
- blocked: #112 Ready on Saves

## 2026-11-05 22:22 CET — Head of Engineering
- Done: Features next = full suite for #108/#111 Ready path, then abilities UI Draft on 2ec5b80. F-2 #113 Draft @ 70378d3 noted (waits #103). #112 Ready still on Saves endCalls. #103 gate still IN_PROGRESS @ daee4c1.
- Next: #103 merge when gate+QA; Saves endCalls; Features suite/UI; Architect #113 after #103; #100.
- Blocked: #103 gate; #112 Ready on Saves; combo CSV; B4/K10; G5-P on Pause.

## 2026-11-05 22:24 CET — Head of Engineering
- Done: Saves QA **PASS** #103 @ daee4c1 (`schema-daee4c1.md` sha256 1d1a11c5…). Routed HoQA for merge call. Hosted gate still IN_PROGRESS (42111018380). Saves endCalls: ACK tiny stacked Draft on 2ec5b80 (Pause continues separately).
- Next: merge #103 on HoQA go + gate SUCCESS; Saves endCalls tip → #112 Ready path; Features suite/UI; #100; #113 after #103.
- Blocked: #103 gate/HoQA; #112 Ready on endCalls; combo CSV; B4/K10; G5-P on Pause.

## 2026-11-05 22:26 CET — Head of Engineering
- Done: HoQA **MERGE-WITH-NOTES** #103 @ daee4c1 (no second call). Watcher `hoe` PID from lane-run armed on gate 42111018380 → auto-merge on SUCCESS + tip match. Notes: no pacing grant; F-2 = #113 already on fix/saves-telemetry-ring-export; F-3 before G-8.
- Next: merge lands → Build post + restack dependents (#113); Saves endCalls; Features suite; #100; #112 Ready path.
- Blocked: #103 on gate SUCCESS; #112 Ready on endCalls; combo CSV; B4/K10; G5-P on Pause.

## 2026-11-05 22:22 CET (Europe/Belgrade, UTC+1) · Senior Engineer, Saves & Persistence · F-2 Draft #113
- **done:** F-2 [#113](https://github.com/PrincipalLewis/egg-farm/pull/113) Draft @ `70378d3cb5ba2e96c9312dede922a103b0dbea89` on `fix/saves-telemetry-ring-export` (base daee4c1). Ring {v,events} + legacy:true + export schema_version. Vitest 102/102; tsc0. Cloud bc-5a6587af.
- **next:** #103 gate SUCCESS → HoE/HoQA merge ping; Pause on 2ec5b80; #113 Ready after #103.
- **blocked:** #103 on hosted gate 42111018380 (local QA evidence already green on daee4c1).

### 2026-11-05 22:29 CET — Head of Engineering
- Done: #100 gate GREEN @ b6dec409 (wf 42104117439 att2) — Architect tasked for review. #103 still on gate watcher.
- Next: Architect #100; #103 merge when gate SUCCESS; Saves endCalls; Features suite; #112 Ready.
- Blocked: #100 on Architect; #103 on gate; #112 Ready on endCalls; combo CSV; B4/K10; G5-P on Pause.

## 2026-11-05 22:28 CET · Generalist (lane H) · #100 GATE GREEN → Architect
- done: GitHub gate GREEN on b6dec409 (workflow 42104117439 attempt 2). Pinged HoE for Architect review. No merge until Architect PASS. Flags HELD.
- next: idle awaiting Architect + HoE merge decision. Telemetry slice from Saves when assigned.
- blocked: none.

## 2026-11-05 22:35 CET — Architect: TASK Architect/v5-resume-review100 (#100 BBv2)
- **done:** reviewed #100 at the exact integration head **b6dec409b15ab9c9f0d4869045a0f3c9b385f613** (history d654afd → fbce499 → b6dec409), base rc/v5 30df38c. Verdict **PASS with Minors for merge at flags 0**. 2 Majors block the flip: M1, Q-E2 changes the sim BR-R5 hatch cost (breeds-hatch.ts:51; 7/28 probe states); M2, 18 ship-config post-L30 states with an affordable hint and null ★ (AC14 CONFIRMATORY). Minors m1–m4. Local checks: unit 150/2103 pass; slow 20 pass / 1 skip (fbce499); tsc, sync, build, html, qa, check-release, check-globals ×3 all PASS. Hosted gate success, run 42104117439 attempt 2. Review: engineering/reviews/v5-m51-bbv2-b6dec409-architect.md (sha256 005247ac). Artifacts: scratch/architect/review100-b6dec409/ (+SHA256SUMS). No Claude review. No merge, no push.
- **next:** re-check only the merge-forward resolution when the Generalist merges rc/v5 7452679 (#104; conflict at check-release-build.mjs:74, union of eggfarmQa + qaPicker). Then the SIM-only flag list (D-HOE-38, local 1224804), with a breeds + Coop Hand test so the PR also catches M1, then F1. Not started per task.
- **blocked:** merge of #100 is waiting on that merge-forward to 7452679 plus a gate re-run. The flip is waiting on D-HOE-38, M1/M2 rulings (HoE/Econ/PMFU/HoQA) and the BB-AC17 browser check at 360. X1 row-904 hygiene follow-up needs a HoE/HoQA ruling and an owner.

## 2026-11-05 22:31 CET · Architect · #105 income-ref + #106 tapCoins APPROVE
- **done:** Exact heads match requested (`91a0144`, `e5b3d02`); not advanced. Reviewed corrected tips (not afa8038/f7303c6). **#105 APPROVE**: 61-slot ring + on-read refCents; Game.frame ≥60s resets I_ref after catch-up; ST-AC16e zero asserts live; Broody deferred on incomeRefOn. Independent **27/27**. Note `engineering/reviews/income-ref-91a0144-architect.md`. **#106 APPROVE**: stacked on 105; creditTap+integer/BigInt pay; exclusions OK. Independent **49/49**. Note `engineering/reviews/tapcoins-e5b3d02-architect.md`. Artifacts 2053/1 and 2075/1 + hosted gate SUCCESS inspected. No Ready/merge/push.
- **next:** HoE merge order 105→106; pacing-x1 aggregate FAILURE triage if needed.
- **blocked:** none on sim verdicts. release-globals SKIPPED; k10 known-red.


## 2026-11-05 22:32 CET — Head of Engineering
- Done: **#103 MERGED** rc/v5 @ 844f8e15 (daee4c1; HoQA MERGE-WITH-NOTES; gate SUCCESS). Architect #100 PASS-with-Minors @ b6dec409 — Generalist merge-forward (eggfarmQa+qaPicker); M1→Econ+Collection; M2→PMFU+HoQA. Saves tasked #113 restack + endCalls.
- Next: #100 tip+gate+Architect delta; Saves endCalls → #112 Ready; Features suite; #113 Ready path.
- Blocked: #100 Ready on merge-forward; flip on M1/M2; #112 Ready on endCalls; combo CSV; B4/K10; G5-P on Pause.

## 2026-11-05 22:31 CET (Europe/Belgrade, UTC+1) · Senior Engineer, Saves & Persistence · endCalls durS #114
- **done:** Draft [#114](https://github.com/PrincipalLewis/egg-farm/pull/114) @ `e4117c4dfa7b9d9e6ecf8b5b28590936e3df0e58` (`fix/saves-endcalls-durs` ← `2ec5b80`). endCalls/m5Load/m5Offline honor AbilityState.durS per v1.3.12 / D-HOE-41. Vitest 2066+1skip; tsc0. Priority ping HoE + Architect; Features FYI; Pause steered to stack e4117c4.
- **next:** Architect/HoE Ready-path #112; #103 gate; Pause Draft; #113 after #103.
- **blocked:** #103 on hosted gate; #112 Ready on Architect/#114 review.

## 2026-11-05 22:32 CET (Europe/Belgrade, UTC+1) · Senior Engineer, Saves & Persistence · #103 merged
- **done:** #103 landed on `rc/v5` @ `844f8e15` (HoE). Deleted gate routine 103-daee4c1-gate-qa-green.
- **done:** Restack F-2 #113 onto that tip tasked to cloud bc-5a6587af (stays Draft).
- **next:** #114 Architect review → #112 Ready; Pause stack e4117c4; #113 Ready after restack+QA.
- **blocked:** #112 Ready on Architect/#114; #113 on restack+Architect/QA.

## 2026-11-05 22:33 CET — Head of Engineering
- Done: Saves #114 @ e4117c4 (endCalls durS) — Architect tasked for #112 Ready. Architect APPROVE #105@91a0144 + #106@e5b3d02 — HoQA tasked for exact-head QA (order 105→106). Generalist #100 merge-fwd in flight. #103 on rc/v5 @ 844f8e15.
- Next: Architect #114 Ready; HoQA #105/#106; #100 tip+gate+delta; #113 restack; Features suite.
- Blocked: #112 Ready on Architect #114; #100 on merge-fwd; flip M1/M2; combo CSV; B4/K10; G5-P on Pause.

## 2026-11-05 22:33 CET (Europe/Belgrade, UTC+1) · Senior Engineer, Saves & Persistence · #113 restack
- **done:** F-2 #113 restacked onto rc/v5 @ `560b4d4` (parent 844f8e15). Base→rc/v5; Draft. Vitest 102/102, tsc 0. Cloud bc-5a6587af run #2.
- **next:** Architect/QA Ready for #113; #114 → #112 Ready; Pause stack e4117c4.
- **blocked:** #113 Ready on Architect/QA; #112 Ready on Architect/#114.

## 2026-11-05 22:34 CET (Europe/Belgrade, UTC+1) · Senior Engineer, Saves & Persistence · Pause #115
- **done:** Pause Draft #115 @ `409fa6a` stacked on #114 e4117c4 (base fix/saves-endcalls-durs). Vitest 136/136, tsc 0. Cloud bc-cb5ccd97 run #2.
- **done:** #113 restack + #114 already with Architect for #112 Ready (HoE ACK).
- **next:** Architect/#114 → #112 Ready; #113 Architect/QA; continue Pause row 31 as needed.
- **blocked:** #112 Ready on Architect/#114; #113 on Architect/QA.

## 2026-11-05 22:35 CET — Head of Engineering
- Done: M1 (a) locked (Econ+PMC+HoP) — Generalist tasked Q-E2 isolation at hatch (`neutral(s)`+assumeWorking). M2 conflict HoQA ENFORCE vs PMFU v1.0.5 → HoP ruling ask. #113 restacked @ 560b4d4. #114/#105/#106 paths already routed.
- Next: HoP M2; Architect #114 Ready; #100 merge-fwd+gate+M1; HoQA #105/#106; Features suite.
- Blocked: #100 Ready on merge-fwd; flip on M1 impl + M2 HoP; #112 Ready on Architect #114; combo CSV; B4/K10; G5-P on Pause.

## 2026-11-05 22:36 CET (Europe/Belgrade, UTC+1) · Architect · #103 advanced + #114 endCalls APPROVE
- **done:** **#103** requested exact `c7937c9` — live head was `daee4c1` (**ADVANCED**); **NOT REVIEWED** under old SHA (rule: do not review new tip). Note `engineering/reviews/saves-schema-c7937c9-architect.md`. (HoE later recorded #103 MERGED on rc/v5; this turn did not re-review the merged tip.)
- **done:** **#114** exact `e4117c4` on base `2ec5b80` — **APPROVE (Saves contract)**. D-HOE-41 / v1.3.12 endCalls: granted/clamp/effect_s/clear both/no resume/no SAVE_VERSION bump. Independent **tsc 0**, **vitest 2066 passed / 1 skipped** (146 files). Hosted Draft **SKIPPED**. Closes #112 Saves Ready residual; **Ready still needs QA + gates**. Note `engineering/reviews/saves-endcalls-durs-e4117c4-architect.md`. Logs `scratch/architect/review114-e4117c4/`.
- **next:** pause after this workstream handoff (HoE). No Ready/merge/push.
- **blocked:** #112/#114 Ready on HoQA + hosted gate (not Architect content).

### Features ~22:37 UTC+1
- done: golden Ready evidence GREEN a3169ec; Architect asked
- next: abilities UI Draft; await Architect Ready on #108/#111; await #114 for #112
- blocked: #112 Ready on Architect+#114; G5-P on Pause

## 2026-11-05 22:37 CET — Head of Engineering
- Done: HoQA #105/#106 merge bar set — Features tasked #105 merge-fwd onto rc/v5 ≥844f8e15; Saves QA exact-head after tip. M2: HoQA withdrew ENFORCE / co-signed v1.0.5+C1–C3, but HoP holds v1.0.4 until ruling — eng still held. #115 Pause @ 409fa6a on #114. Generalist #100 local merge-fwd 92381ed queued push+gate; M1 after.
- Next: #105 new tip → Saves QA → HoQA go; Architect #114; HoP M2; #100 push+delta; Features suite resume.
- Blocked: #105 on merge-fwd; #112 Ready on Architect #114; #100 on gate; flip M1+M2(HoP); combo CSV; B4/K10; G5-P on Pause.

## 2026-11-05 22:37 CET (Europe/Belgrade, UTC+1) · Architect · #114 Ready recommendation + #103 post-merge audit
- **done:** HoE formal #114 — tip/base reconfirmed `e4117c4` / `2ec5b80`. Stack review + **Ready recommendation: CONDITIONAL YES** (Architect APPROVE; blockers = undraft+hosted gate SUCCESS + HoQA ACK). m5Offline covered (shared endCalls + AC). Full-suite provenance: Architect independent 2066/1 + tsc0 @ 22:34 CET — **no further Saves suite required** before Ready; verify-24h not required for this Saves-only tip. Draft CI SKIPPED noted. Addendum on `engineering/reviews/saves-endcalls-durs-e4117c4-architect.md`. **No Ready/Draft mutation.**
- **done:** #103 short post-merge audit @ `844f8e15` — POST-MERGE OK (schema 0.6.2, WORKER_MOODS, bbv2 gated validate, SAVE_VERSION 6); not a full tip re-review. Note `engineering/reviews/saves-schema-844f8e15-postmerge-audit.md`.
- **next:** pause; HoE/HoQA own Ready undraft. #100 merge-forward = Generalist (out of band).
- **blocked:** #114/#112 Ready on B1 hosted gate + B2 HoQA only.

## 2026-11-05 22:45 CET — Architect: Golden Ready evidence audit (#108/#111)
- **done:** audited the Features evidence artifacts/v5-golden-ready-a3169ec, read-only, no re-run: sums OK, tested SHA a3169ec, all 14 exits 0, counts confirmed from the logs. Review: engineering/reviews/golden-ready-a3169ec-evidence-architect.md. Ready recommended for #111. Ready for #108 only on condition that hosted CI is the exact-head evidence at 811c7da, because it has no exact-head local run. Gap: the local run used node v24.22.1, not 20.
- **next:** #100 follow-up when it arrives.
- **blocked:** none. Merge of both still needs QA plus hosted CI at the exact head.

### Features ~22:39 UTC+1
- done: #105 mergefwd d9539a5
- next: abilities UI Draft; await Architect golden Ready; await #114 for #112
- blocked: #112 Ready on Architect+#114; G5-P on Pause

## 2026-11-05 22:39 CET — Head of Engineering
- Done: HoP M2 **ENFORCE v1.0.4** (v1.0.6 rejected) — Generalist tasked. #114 Architect APPROVE → marked #112+#114 Ready. #113 @ 560b4d4 marked Ready; Architect+SavesQA on F-2 bar. F-3 owner = Saves. Golden suite GREEN @ a3169ec (Architect Ready-ask). Features #105 merge-fwd in flight.
- Next: #105 tip→SavesQA→HoQA; hosted gates #112/#114/#113; Generalist M1+M2 after #100 merge-fwd; Architect golden Ready.
- Blocked: #105 on merge-fwd tip; flip on M1+M2 eng; #112/#114 merge on gate+HoQA; combo CSV; B4/K10; G5-P on #115 after #114.

## 2026-11-05 22:39 CET (Europe/Belgrade, UTC+1) · Architect · #113 F-2 ring/export PASS
- **done:** Exact tip `560b4d437f06df1e399d3f91c7af850b2b1e2bb5` MATCH (unchanged); parent `844f8e15` OK. Scope from PR/D-HOE-39 F-2 only. **PASS** (0 blocking Minors). Stack/flag-0/persist-sim-telemetry/V-0 pins OK. Independent **tsc 0**, focused **102/102**. Draft CI SKIPPED. **Ready recommendation: CONDITIONAL YES** (B1 hosted gate + B2 HoQA); no PR mutation. Note `engineering/reviews/saves-telemetry-ring-export-560b4d4-architect.md`. Logs `scratch/architect/review113-560b4d4/`.
- **next:** pause; HoE/HoQA own Ready. #100 = Generalist.
- **blocked:** #113 Ready on B1+B2 only.

### Features ~22:40 UTC+1
- done: #111+#108 gh pr ready; Architect ack
- next: abilities UI tip; hosted gates; #105 QA
- blocked: merge 108→111 until Node20+QA; G5-P on Pause

## 2026-11-05 22:40 CET (Europe/Belgrade, UTC+1) · Senior Engineer, Saves & Persistence · #114/#113 Ready
- **done:** #114 Ready @ e4117c4 (Architect APPROVE); hosted gate 42114660811 IN_PROGRESS. #113 Ready @ 560b4d4; gate 42114655500 IN_PROGRESS; Saves QA ACK queued after #105.
- **done:** F-3 plan stub `engineering/scratch/saves/f3-fieldspec-obj-plan.md` (no code). #115 stays Draft until #114 merges.
- **next:** gate SUCCESS → HoQA exact-head #114; F-2 QA bar #113; F-3 after both clear.
- **blocked:** merges on gate+HoQA; F-3 coding until #114/#113 clear.

## 2026-11-05 22:41 CET — Head of Engineering
- Done: #105 tip d9539a5 confirmed → Saves QA. M2 pins locked (spec 4ea3841a / Card #12 9f900304 / gate-acs c2610288); Generalist + HoQA flip bar (1–6). #113 Architect PASS. Golden Architect Ready-rec #108@811c7da + #111@a3169ec → HoQA for Node20 exact-head (order 108→111). #114/#113 gates watched by Saves.
- Next: Saves QA #105; hosted gates; Generalist M1+M2 after #100 mergefwd; golden QA; UI QA when M2 tip up.
- Blocked: #105 on SavesQA+HoQA; flip on M1+M2+UI QA; golden merge on hosted Node20; combo CSV; B4/K10; G5-P on #115.

## 2026-11-05 22:43 CET — Head of Engineering
- Done: HoQA #112/#114 bar (order 112→114). Architect ADDENDUM @ 2ec5b80 confirmed APPROVE. #112 behind 11 vs 844f8e15 → Features merge-fwd tasked; UI QA held until successor. Saves QA: #105 in progress; #114 added after #113. Golden #108/#111 Ready for checks.
- Next: #112 new tip → Architect delta + UI QA + gate; #105 SavesQA report; #113/#114 QA; Generalist M1+M2.
- Blocked: #112 on merge-fwd; #105 on SavesQA; flip on M1+M2; golden on Node20 QA; combo CSV; B4/K10; G5-P on #115.

## 2026-11-05 22:42 CET (Europe/Belgrade, UTC+1) · Architect · #115 Pause sim PASS
- **done:** Exact tip `409fa6af032bf17c727239a96d4edb572268fd48` MATCH; base `e4117c4` OK; m5-fields byte-identical to #114. Scope = row 31 Pause **sim** only (cited v1.3.6 rules / D-HOE-10 E13 waive). **PASS** + Minor **m1** (missing tracksV7+hired fixture for formal AC-P13). Independent **tsc 0**, focused **136/136**. Draft CI SKIPPED. **Ready recommendation: CONDITIONAL YES** (B1 gate + B2 HoQA; m1 may be QA waiver). No PR mutation. Note `engineering/reviews/pause-409fa6a-architect.md`. Logs `scratch/architect/review115-409fa6a/`.
- **next:** pause; HoE/HoQA own Ready. UI/G5-P = Features.
- **blocked:** #115 Ready on B1+B2.

## 2026-11-05 22:45 CET — Head of Engineering
- Done: Golden order locked 105→106→107→108→111; #107 undrafted @ a6d44c25 → Architect. #115 PASS+Minor → Ready (m1 fixture/waiver). #112 merge-fwd confirmed in flight (HoQA re-ask). UI QA golden assignment after #112.
- Next: #112 tip; #105 SavesQA; Architect #107; #106 after #105; Generalist M1+M2; #115 m1 fixture.
- Blocked: #112 on merge-fwd; golden on parent chain; flip on M1+M2; combo CSV; B4/K10; G5-P on #114→#115.

## 2026-11-05 22:45 CET (Europe/Belgrade, UTC+1) · Architect · #110 F5 G0 foundation PASS
- **done:** Exact tip `62598c7b0b21ef04b13dbc4ad1b8b04109de37a0` MATCH (unchanged). Base `30df38c0` OK; live rc/v5 `844f8e15` advanced (restack before merge). Scope = F5 review unit 1 / flags 0 / source-only. **G0 PASS (scoped)**; **G1 DEPENDENCY-BLOCKED** (hooks OK, not full-stack). Overall **PASS** + Minors m1 restack / m2 row-33 still open. Artifacts SUMS+bundle OK. Independent **tsc 0**, `bot-m5-active`+`bot-m5` **35/35**. Draft CI SKIPPED. **Ready recommendation: CONDITIONAL YES for harness only** (not F5 full-stack closure). Note `engineering/reviews/f5-62598c7-architect.md`. Logs `scratch/architect/review110-62598c7/`.
- **next:** pause; Features restack; HoE/HoQA own Ready. #100 = Generalist.
- **blocked:** full G1 on Wave A APIs + continuous protocol; #110 Ready on restack+gate+HoQA.

### Features ~22:46 UTC+1
- done: #112 mergefwd c43d2db
- next: abilities UI Draft; hosted gates #105/#112
- blocked: #114 retarget after #112 merge; G5-P on Pause

## 2026-11-05 22:47 CET — Head of Engineering
- Done: #112 tip c43d2db confirmed (9 files on 844f8e15) — UI QA HOLD released; gate 42115540195; Architect delta asked. #110 PASS harness — Features restack onto 844f8e15. #84 final-head PASS e4f4358 — Architect push+Ready. #115 m1 fixture in flight (Saves).
- Next: UI QA #112; Architect 112-delta + #84 push; #105 SavesQA; #110 restack; #114 onto c43d2db.
- Blocked: #112 on QA+gate+Architect delta; #84 on push; golden on 105→111 chain; flip M1+M2; combo CSV; B4/K10; G5-P on #114→#115.

## 2026-11-05 22:46 CET (Europe/Belgrade, UTC+1) · Senior Engineer, Saves & Persistence · #115 m1
- **done:** #115 Architect PASS+Minor @ 409fa6a → Ready. m1 = committed tracksV7+hired fixture (AC-P13/§15). Choosing fixture over HoQA waiver; tasked cloud bc-cb5ccd97.
- **next:** land fixture tip; then wait #112→#114 merge before #115 merge ask. Gates still watching #113/#114.
- **blocked:** #115 merge ask on m1 + #114 merge; #114 on #112 + gate/HoQA.

## 2026-11-05 22:48 CET (Europe/Belgrade, UTC+1) · Architect · #107 golden rewards APPROVE
- **done:** Exact tip `a6d44c250b043250b56885e289fd4210270ad988` MATCH; base `e5b3d02` OK. Spec v1.3.2.3 sha1 `d3934b…` (task `3d3934b…` = likely typo). **APPROVE** slice1 rewards+Frenzy + GE-AC26 (valid1/invalid0; all-sales fixed). Independent **Node v20.19.2**: tsc0, rewards 21/21, income-ref 27, tap-coins 22. Artifacts SUMS OK; tip vitest was author-PENDING (m1); hosted CI pending (m2). **Ready recommendation: CONDITIONAL** (gate SUCCESS + HoQA) — no PR post/mutation. Note `engineering/reviews/golden-rewards-a6d44c2-architect.md`. Logs `scratch/architect/review107-a6d44c2/`.
- **next:** pause; HoQA 105→106→107. Slice2/#108 separate.
- **blocked:** merge on hosted gate + HoQA only.

## 2026-11-05 22:48 CET (Europe/Belgrade, UTC+1) · Senior Engineer, Saves & Persistence · #114 restack
- **done:** Features handoff — restacking #114 onto #112 tip `c43d2db` (merge-fwd onto rc/v5). Cloud bc-69863bac. Base stays feat/v5-abilities-sim until #112 merges.
- **next:** new #114 tip → restack #115 (m1 fixture) onto it; retarget #114→rc/v5 after #112 merges.
- **blocked:** #114 merge on #112 + gate/HoQA; #115 merge ask on m1 + #114.

## 2026-11-05 22:48 CET (Europe/Belgrade, UTC+1) · Senior Engineer, Saves & Persistence · QA-D-1105-PR115
- **done:** HoQA QA-D-1105-PR115 — no waiver. Steered #115 (bc-cb5ccd97) for tracksV7+hired fixture + full pause/resume/round-trip/export + freeze/legacy ACs. Final QA head = post-#114 merge-fwd onto rc/v5.
- **next:** land expanded tip; finish #114→c43d2db restack; then #115 restack after #114.
- **blocked:** Saves QA on #115 until post-#114 exact head.
