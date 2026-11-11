# GATE 4: M4-on saves & release verification (QA Saves & Release). PLAN, ready to run
Owner: QA Engineer, Saves & Release Verification. Written 2026-10-19 ~00:30 CEST after D-CEO-20261019-01 (M4 picked). PREP ONLY: no product code was changed; everything is under qa/.
Starts when #41 (or its successor) arrives with: **full SHA, pushed branch, PR number, change list**. Command:
```
bash qa/m3-scripts/gate4-run.sh <full-sha> "pre unit saves release browser"   # ENGINES="firefox webkit chromium"
# optional: BASE=dd52bfd ALLOW_DIFF='^(src/config/balance.json|tests/|data/|src/config/)' to STOP on unexpected paths
```
Evidence lands in `qa/m3-recheck/gate4-<sha7>-evidence/` (summary.txt plus per-step logs). Report: `qa/m3-recheck/gate4-<sha7>.md`.
Rules: ports 5961–5964; every browser step runs under `flock .browser-test.lock timeout 600`, one engine at a time; vitest max 2 workers; it kills only its own vite servers (cwd under /tmp/qa-rc/<sha7>); no push, merge, tag or messages.

## The 5 M4-on save risks (status.md, Architect 14:55 Oct 17) → QA tests
File `qa/m3-scripts/gate4-m4on-saves.qa.test.ts` (copied into the worktree's tests/ at run time and removed afterwards). Each test restates, for an M4-on build, the invariant the failing original test protects.
| # | Risk (original failing test on 90a9c84) | Why the original fails with M4 on | QA test | 90a9c84 (M4 on) | dd52bfd |
|---|---|---|---|---|---|
| R1 | hidden save + N2 quota retry leaves the migration record (`hidden-save-paths` N2) | A fresh Game with M4 on is a committed tracksV7 farm, so the N2 guard (never remove a record on a migrated farm) rightly refuses. The test's setup combination can't happen | **R1a**: unmigrated v6 farm with its own aborted record, hidden, quota → retry removes only its own record and writes the hide snapshot (savedAt = hide). **R1b**: committed farm plus a stray record → record kept, LS fails visibly, mirror gets the hide snapshot (no silent loss) | PASS / PASS | original passes (flag off, RC pass) |
| R2 | idb-mirror "no write" (`idb-mirror` D2 x2) | A v6 save on an M4 build pauses the mirror until the migration commits (M4-24, by design) | **R2a**: fresh M4 farm: load save + purchase save mirrored byte-exact. **R2b**: v6 farm: mirror paused while pending, resumes after commit; a purchase lost from LS is recovered from IDB on reboot | PASS / PASS | original passes |
| R3 | save-majors BUG-2 `undefined` (`save-majors-2959ba0`) | Same mirror pause: no IDB main, so `typeof === 'undefined'` | **R3**: committed M4 farm: newer v7 only in IDB → mirror never puts, onNewerSave(7) once, read-only, no LS writes | PASS | original passes |
| R4 | AC8 extra fields (`save.test` AC8) | load() under M4 on returns the migration preview (tracksMigrated, v6State, preTracksRaw, M4 fields), by design | **R4**: v6 core fields round-trip; while pending the written bytes hold only the v6 keys; after commit they add hensLevel, eggValueLevel, tracksV7, v6BackupId, celebratedMilestones | PASS | original passes |
| R5 | saveSeq carry (`m4a-saveseq-carry`) | Hard-asserts `m4On(b) === false` and "no saveSeq" | **R5**: every M4-on save is saveSeq +1 across reload; an IDB copy with a higher seq wins over a stale LS copy on reconcile, and the next save continues the seq | PASS | original passes |
Conclusion so far: on 90a9c84 none of the 5 shows a real save bug. Each original failure is the test's flag-off premise. HoE's rewritten tests on rc/m4-on-tests should match these invariants; I'll diff them when they arrive.

## Migration fixtures
- `qa/m3-recheck/m4-downgrade-fixtures/` F1–F5: from acdbedc's real save code, QA M4-on build (+ F5 pre-M4 control). chmod 444, SHA256SUMS.
- `qa/m3-recheck/gate4-fixtures/M1-midgame-L18-dd52bfd.json`: **mid-game L18 / Collection 11 / 2 workers / Grader 3 / a partly-served customer**, written by dd52bfd's own Game.save with M4 OFF (generator `qa/m3-scripts/gate4-midgame-fixture.mjs`). sha256 `f2961fb93eb24b5c55d0b50bb0cd11452a82c65ff702255da4d30be84180d6d3`, chmod 444.
- Unit **M1** (in gate4-m4on-saves): loads into the M4-on build with no recovery; every core field, the workers and the customer equal; offline grant applied once (2850 at flag-off rules while pending, §3c); `startTracksMigration` → committed; H = F = 18, V = 10, milestones seeded, v6_backup raw = original bytes; save (seq 3) → reload (seq 4) round-trip equal. **PASS on 90a9c84.**
- `m4on-migrate.qa.test.ts` (F1–F5 unit): 7/7 PASS on 90a9c84.

## Browser scripts (3 engines, each ~1 min)
| Script | Covers | Dry run 90a9c84 Chromium |
|---|---|---|
| `m4-hidden.mjs` | Hidden-tab offline with M4 on; per-row table (elapsed, rate, script-fixed, M4 expected, credited, delta, OK/BUG) | 33/33 in CR, FF and WK (Oct 17) |
| `gate4-m4on-clock.mjs` | Closed-tab offline 30/59/60/61/671/3600/7199/7200/10800/86400 s (60 s min, floor, 2 h cap, maxEggs2h); clock **forward** +3 h (one capped grant, no 2nd on reload); clock **back** −1 h (0 grant, re-stamp, no loss, reload no grant); mid-session reload < 60 s (no grant, M4 kept, saveSeq +) | **17/17**; table rows all delta 0 (`gate4-dryrun-90a9c84/clock-chromium/`) |
| `m4on-browser-v6load.mjs <engine>` | F1–F5 + M1 injected into LS: build-id, no recovery, no loss, M4 kept or initialised, writable, reload round-trip | **154/154** (`gate4-dryrun-90a9c84/v6load/`) |

## Release checks in the gate
- `check-release-build.mjs dist-html/egg-farm.html` (release step), static build-id with no +dirty (pre step).
- check-globals = `scripts/release-globals-browser.mjs <engine>` in 3 engines (want only `eggfarmExportTelemetry`; `eggfarm` not in window).
- runtime build-id probe in 3 engines; rc0 `scripts/rc0-browser.mjs` in 3 engines; dist-html file:// open in 3 engines.
- **After publish (published-asset check, not in the runner):** download the published Latest HTML asset for the release tag (`gh release download <tag> -p '*.html' -D qa/m3-recheck/gate4-<sha7>-evidence/published/`). Then run `check-release-build.mjs` on it, confirm its sha256 equals the dist-html built here, and run `rc-html-open.mjs` in 3 engines with the expected build-id. Also load the live URL once per engine: build-id = SHA, M4 on (HENS/VALUE rows visible).
- Not in gate 4: AC7/pacing (HoP gate 1/2 for the M4-on retune). Expect unit/slow red until HoE's test fixes land.

## Time estimate (from the Oct 17 runs on this box, without lock waits)
pre + build 1 min · tsc/sync/unit 2.5 min · slow 1.5 min · R1–R5/M1/F1–F5 under 10 s · per engine: build-id ~0.5 min, globals 0.5–1.5, rc0 4–7, html 0.3, hidden 1.1, clock 1, v6load 0.6 → **~9–12 min per engine**.
**Full gate 4 ≈ 35–45 min** of wall time, plus any wait for the shared lock. The published-asset check after release is about 5 min.

## Not-run template (fill in at run time)
| Item | Reason | Risk | Owner/when |
|---|---|---|---|
| IndexedDB-injected fixtures in the browser | LS-only injection; IDB covered at unit level (R2/R3/R5) | low | — |
| <engine/step> | <timeout/lock/other> | | |
