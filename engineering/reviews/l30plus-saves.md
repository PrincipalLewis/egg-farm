# l30plus saves compatibility: pre-review on 6809f8e

Reviewer: Senior Engineer, Saves & Persistence. Date: 2026-10-19 03:30 CEST.
Target: econ/l30plus @ 6809f8ec84a89b4bd049a27d8406996f45d2e950, reviewed in detached worktree /workspace/wt-l30plus-review.
Landing bases: origin/main dd52bfd; PR #44 head rc/m4-retune-t3 @ 4ccb9fd (base rc/m4-on-tests-2).
Scope: src/sim/migrate-v7.ts, src/sim/tracks.ts, and what they reach in save/load (formulas.ts track helpers, sim/offline.ts, save.ts validate/migrate).
Method: code read; existing suites (save, m4a-save-migrate, m4a-v3*, saveseq, idb-mirror, save-majors, l30plus) 97/97 pass at 6809f8e. A throwaway test (tests/tmp-review/l30plus-saves.review.test.ts, not committed) has 44 cases, 42 pass. The 2 failures are the intended probes for M2. Run with vitest --pool=forks --minWorkers=1 --maxWorkers=2.
Balances tested: live with M4 off, live with M4 on, and L30+ on (live + fitM4(data/staging/economy.l30plus.csv) + maxLevel = farmMax 50, built the same way as tests/l30plus.test.ts).

## Checklist
1. **SAVE_VERSION stays 6: PASS.** src/save/save.ts:6 is unchanged, and 6809f8e touches nothing in src/save or src/game.ts (`git diff e38cf76 6809f8e -- src/game.ts src/save` is empty).
2. **tracksV7 migration and the N2 guard: PASS.** The marker logic in save.ts:102-106 is unchanged. The guard `this.state.tracksV7 === 1` is at game.ts:226 on 6809f8e's base and at :232 on main and #44. The only migration change, migrate-v7.ts:25, swaps the H/V ceiling from `b.maxLevel` to `trackMaxLevel` (costs.length-1). On the live table that is still 30, so nothing changes. On L30+ data it is 55, but wantH = F <= 50, so it never binds.
3. **v4/v5/v6 fixtures under M4 off, on and L30+ on: PASS.** Fixtures: m1-rc2-v4-12min, m2-rc1-v5-12min, m2-rc1-v5-40min, m2-rc1-v5-40min-edge. There are no v6 fixtures, so v6 copies were made by loading each fixture and re-serializing it. That is 4 fixtures x 2 versions x 3 balances = 24 cases, all passing.
   - No field is lost: every original state key is present and equal in `state` (M4 off) or `v6State` (M4 on).
   - Every numeric field is finite, and save -> load is stable.
   - With M4 on, the migrated H and V are integers, and price, eggs/s and coop are finite. The price is never below the Farm-only base price.
   - Migration on L30+ data: F19 gives H19/V18, F30 gives H30/V20.
4. **Saved track levels vs caps: PASS for clamping, data loss and NaN, with the notes below.** Marked v6 saves were tested at (F,H,V) = (19,0,0), (19,22,22), (19,30,30), (19,40,40), (30,55,55), (30,60,60), (50,55,55), (50,52,51), under live on and L30+ on.
   - Levels load unchanged; nothing is clamped in the stored state.
   - Buy cost (when unlocked), price, eggs/s, offline eggs, coop and a full Game boot with a 1 h offline grant are all finite.
   - Above the track max, trackLock gives 'max' and the cost index is clamped (formulas.ts clampT), so there is no out-of-range read.

## Findings

### Blocker
None.

### Major
- **M1. L30+ data: Hens and Egg value levels 51-55 can be bought but do nothing.** Files: src/config/formulas.ts:52 (`clampL` clamps to `p.maxLevel`, which is the Farm max, 50), :132 (`trackEggsPerSec` -> `eggsPerSec(H)` -> clampL), :138 (`trackPriceCents`: `v = clampL(V, p)`), and src/sim/offline.ts:9 (`L = clampL(hensLevel, b)`).
  - Because 6809f8e separates the track max (55, tracks.ts:26 and formulas.ts trackMaxLevel) from the Farm max (50), these effects stop at 50.
  - Evidence with L30+ on: price at V50..55 is 4778, 4778, 4778, 4778, 4778, 4778 cents. Eggs/s at H50 and H55 is 51 and 51. Offline 1 h at H50 and H55 is 45900 and 45900. Meanwhile the H54->55 buy cost is 1,338,112 coins.
  - The saved levels stay safe (no loss and no NaN), so this is a gameplay and economy issue, not a save-compat one. But a saved H/V above 50 is meaningless until it's fixed.
  - Fix: clamp track lookups with a track clamp (clampT / trackMaxLevel). That also needs eggs_per_sec and offline rows up to 55 (m4.offline already has 56 rows). Add a test: V55 price > V50 price, and H55 eggs/s and offline > H50.
  - Also, priceMatchedV (migrate-v7.ts:21) loops only to `b.maxLevel`. That's harmless today because F <= 50, but it should use trackMaxLevel('eggValue') for consistency.
- **M2. Downgrade hazard: a farm above level 30 is rejected as corrupt by any build with maxLevel 30.** File: src/save/save.ts:190 (`s.farmLevel > b.maxLevel || s.collectionLevel > b.maxLevel` -> invalid_state).
  - Evidence: the probe cases F50 H55 V55 and F50 H52 V51 under live on return ok=false.
  - The rule predates this change, but L30+ is the first change that lets saves pass 30. A rollback to any current Latest (maxLevel 30) would put L31-50 players on the corrupt path. That path quarantines the save and restores .bak or starts a new farm. Nothing is deleted, but the player sees a reset.
  - Decision needed from HoE: either accept it (no rollback past L30+ once it's shipped), or ship a tolerant validate (clamp or keep F > maxLevel and freeze buying) in a Latest before L30+.
- **M3. Base drift: 6809f8e is 188 commits behind main and conflicts with it.** The merge-base is e38cf76, and 6809f8e is not in #44.
  - `git diff origin/main 6809f8e` shows it would revert main's work if landed as a tree: it deletes src/sim/payout.ts, removes offline.hiddenSimMaxSeconds, and replaces F1 `farm.costTable` with `costOverrides`.
  - A trial merge of origin/main (aborted, nothing committed) conflicts in data/economy-config.json, scripts/sync-economy.ts and src/config/balance.ts.
  - The save and game paths themselves merge cleanly. Even so, the save-compat verdict above holds only for 6809f8e's tree, and items 1-4 must be re-run on the merge-forward SHA.

### Minor
- **m1. Track fields are not validated on load.** File: src/save/save.ts:176 (`NUM_FIELDS` has no hensLevel or eggValueLevel); :189-190 only check the Farm and Collection fields.
  - Evidence with live on and a marked save: hensLevel 2.5 gives offline NaN; 'x' gives NaN eggs/s and NaN offline; -3, null and 1e9 load and get clamped silently.
  - The checksum stops random corruption, so this only bites on hand-edited or debug saves. But L30+ widens the level range, so it's a good moment to add `Number.isInteger(h) && h >= 0` (missing -> 0) for both tracks, with a migration test that pre-M4 saves (no fields) still load.

### Nit
- **n1.** src/sim/tracks.ts:25 still says "'max' = balance.maxLevel from economy.csv". It is now trackMaxLevel (the track's CSV cost rows).
- **n2.** src/sim/tracks.ts:7 says the migration is "NOT wired into save.ts". That has been stale since save.ts:102-106.
- **n3.** src/sim/migrate-v7.ts:25 mixes double quotes ("hens") into a file that otherwise uses single quotes.

## Verdict
No save-format or save-compat Blocker: SAVE_VERSION is 6, the marker and N2 guard are intact, and old saves load without loss or NaN. Before landing, M1 (dead levels 51-55) needs a fix and M2 needs an HoE decision. Re-run this checklist on the forward-merged SHA (M3).
Nothing pushed or committed. The throwaway test exists only in the review worktree.

## v6->v7 migration marker (M4A-29..33) — Saves, 2026-10-19 04:20 CEST, at PR #45 a99f4e3 + fixture 732e70e

**1. Marker.** Persisted field `state.tracksV7: 1` (sim/state.ts:22) plus `state.v6BackupId` (state.ts:23). SAVE_VERSION stays 6 (save/save.ts:6; writeVersion save.ts:53).
- Detected/checked: `migrate()` save.ts:104 `tracks = m4On(b) && !state.tracksV7`; when true save.ts:106 returns the migrated state + `tracksMigrated:true, v6State`.
- Boot: game.ts:60-65 keeps the v6 state live, flag off, mirror paused (`tracksPending`).
- Set (commit): `startTracksMigration()` game.ts:197/:209 builds `{...migrateTracksV7, tracksV7:1, v6BackupId:id}`, game.ts:213 `commitWrite`, then game.ts:218-220 resumes mirror, emits `save_migrated {from:6,to:6,migration:'tracksV7_marker'}`, calls `onTracksCommitted` (declared game.ts:136).
- Set (fresh farm on M4 build): game.ts:75 — marker + id, **no backup, no migration**.
- Other checks: game.ts:232 (quota retry never deletes backup once marked), save.ts:44 rank (committed = tracksV7 + v6BackupId), save.ts:153 saveSeq, save.ts:158 flagOffShape keeps tracks on marked saves.
- Caveat: `tracksV7===1` does NOT mean "migrated player" — fresh M4 farms carry it too (game.ts:75).

**2. Runs once — proven by test** `tests/tmp-review/v7-marker.review.test.ts` (throwaway):
`npx vitest run tests/tmp-review/v7-marker.review.test.ts --pool=forks --poolOptions.forks.minForks=1 --poolOptions.forks.maxForks=2` → 3/3 passed.
Fixture F30/C30 → first load tracksMigrated=true, H30 V20; save (version 6) → reload: tracksMigrated undefined, H/V unchanged (30/20), second save→reload state deep-equal (idempotent). Not covered: the Game-level commit path (covered by existing game tests).

**3. seenTracksExplainer.** Not in src on any branch (only m4-design.md:37/43 in arch branches). Spec governs (decisions.md:257, m4a-spec §11 / M4-AC-EXP1 upgrades.md:370; M4A-33 decisions.md:128): **existing saves only, shown when the migration commits in-session; new saves never see it.** So:
- Trigger = `Game.onTracksCommitted` (in-session "upgraded now" event), not `tracksV7` (fresh farms have it).
- Gate = `!seenTracksExplainer`; set true when shown. Must be independent of tracksV7 (separate persisted flag, default false/absent).
- Reload after commit before shown: onTracksCommitted won't fire again; if needed, a persisted "migrated & not yet seen" check = `tracksV7===1 && v6_backup record id === state.v6BackupId` (fresh farms have no backup record) && !seenTracksExplainer.
- Position on optional field (SAVE_VERSION stays 6): **no objection**, conditions: loader/validator preserve it (today migrate() spreads `...d.state`, save.ts:101, and main a01faea:35 does the same — proven in test: survives reload and flag-off resave); migration must not reset it; checksum/export-import round-trip it; add a real test in the PR.

**4. Rollback.** Proven by test (this build, M4 off): a marked save loads and resaves keeping tracksV7, H/V and seenTracksExplainer. By reading: pre-M4 main a01faea migrate spreads state (keeps unknown fields) and SAVE_VERSION=6, so it loads marked saves; but its validate (a01faea save.ts:117) rejects farm/collection > maxLevel → L31+ saves fail there. fix/saves-level-tolerance a399d27 (local, unpushed) removes that rejection (load as stored, effective clamp) — not yet re-tested against this fixture; rollback builds need that fix to load L31+ saves.

**5. Recommendation: amend the spec (marker-based, SAVE_VERSION stays 6); do not bump to 7.** Any build with SAVE_VERSION 6 treats version 7 as newer: validate→`version` (save.ts:202, proven in test) and newerStoredVersion→read-only refusal (save.ts:85-89, game.ts:55), so a bump would lock rollback builds out. Spec M4A-29..33 should name `tracksV7` + `v6BackupId` + v6_backup record as the "v7 step".

## recheck on PR #45 a99f4e3

Reviewer: Senior Engineer, Saves & Persistence. Date: 2026-10-19 ~04:25 CEST.
Target: draft PR #45 rc/m4-t3-l30plus @ a99f4e3d6e01cb2d43d80d3483d67cd1a5637d0a (incl. 732e70e migrate-v7 fixture, 408a589 track clamp), detached worktree /workspace/wt-l30plus-45. #44 base: 4ccb9fde. origin/main is an ancestor of a99f4e3.
Data: live data/economy.csv sha256 b48be8a4…f857. **The branch has no L30+ staging CSV** (data commit blocked). Staging used: data/staging/economy.l30plus.csv taken from 6809f8e (sha256 77a68a6131895ba15a8ad3c2dbfdffdb688fd6fa1137eb14087dcfce45d907bc, the file tests/l30plus.test.ts:3 names), placed untracked in the worktree. M1 was cross-checked on product/economy.l30plus-candidate.csv (3e3d61fd…3611) and product/economy.l30plus-polish.csv (b59c4e0d…1658): identical results.
Method: throwaway test from the pre-review, reused and extended (tests/tmp-review/l30plus-saves.review.test.ts, untracked, 56 cases, 54 pass; the 2 failures are the M2 downgrade probes, intended). Balance built as on #44 (farm.costTable, not costOverrides). tsc clean. Full vitest --pool=forks --minWorkers=1 --maxWorkers=2: 878/880 tests, 85/88 files (see below).

### Checklist
1. **SAVE_VERSION stays 6: PASS.** src/save/save.ts:6. `git diff 4ccb9fd a99f4e3 -- src/save src/game.ts` is empty.
2. **tracksV7 migration and guard: PASS.** Marker path save.ts:102-106 unchanged; guard `this.state.tracksV7 === 1` at src/game.ts:232. migrate-v7.ts:25 uses trackMaxLevel (now the track's own max, 55 on L30+); wantH = F <= 50 so it never binds. Migration on L30+: F19 -> H19/V18, F30 -> H30/V20 (unchanged from pre-review). The 732e70e fixture test passes.
3. **v4/v5/v6 saves, M4 off / on / L30+ on: PASS.** 4 fixtures x {raw, v6} x 3 balances = 24/24: no key lost, all numbers finite, save->load stable, migrated H/V integers, price >= Farm-only base.
4. **Track levels below/at/above cap (0..60): PASS for NaN/data loss.** (F,H,V) up to (30,60,60) and (50,55,55) on live-on and L30+: levels load unchanged, buy cost/price/eggs-s/offline/coop finite, full Game boot + 1 h offline finite. Above max: trackLock 'max' (tracks.ts:27), lookups clamped by clampT (formulas.ts:119).

### Re-verify items
- **M1 (dead L51-55): RESOLVED by 408a589.** formulas.ts:118 trackMaxLevel = costs.length-1 (Farm-max cap dropped); :147 trackEggsPerSec clamps at the Hens track max; :153 trackPriceCents uses clampT; offline.ts:9 clamps at trackMaxLevel('hens'). Staging 77a68a (F50, M4 on): price V50..55 = 4778, 4929, 5082, 5238, 5397, 5558 cents; eggs/s H50 51 -> H55 56; offline 1 h H50 45900 -> H55 50400; H56/H60 finite (clamped to 55). Same numbers on candidate 3e3d61 and polish b59c4e. Live b48be8a4: track max stays 30; V30/55/60 price 2243, eps 31, offline 27900 (frozen at 30, finite, as intended for a 31-row table).
- **M3 (base drift): RESOLVED.** src/sim/payout.ts present and unchanged vs #44 (4ccb9fd); `--diff-filter=D` is empty; offline.hiddenSimMaxSeconds kept (balance.json:161, game.ts:280); F1 farm.costTable and farmCostFromCsv kept (economy-config.json only adds farmMaxLevel 50, hvExtraSecondLevelMult 1.1). The removed lines in src are all the intended clampL -> track-max swaps.
- **Does the 408a589 clamp persist a clamped level? NO.** All clamps are read-time only (clampT, offline.ts:9). Boot + save + load round-trips keep H/V at 31, 40, 55, 60 on live-on and L30+ (8/8). No data loss.
- **m1 (non-integer levels): STILL OPEN** (fix/saves-level-tolerance, not touched here). save.ts:197 NUM_FIELDS / :210 still validate only Farm/Collection. Probe (live on): hensLevel 2.5 -> offline NaN; 'x' -> eggs/s NaN, offline NaN; -3/null/1e9 load and are clamped silently.

### New findings
- **Major M4. The branch's own L30+ suite does not run.** tests/l30plus.test.ts:19 builds the balance with `farm.costOverrides` (6809f8e era); on #44 validateBalance requires `farm.costTable` with maxLevel+1 entries (formulas.ts:92) -> "costTable must have 51 entries, got 31", suite collects 0 tests. And tests/l30plus.test.ts:14 reads data/staging/economy.l30plus.csv, which is not in the branch, so on a clean checkout/CI it fails with ENOENT first. Fix: use `costTable: R.slice(0, farmMax+1).map(r => r.farm_cost)` (as in my throwaway test and tests/l30plus-track-max.test.ts) and either commit the staging CSV with the data commit or skip the suite until it lands. Owner: Architect.
- **M2 (downgrade: F>30 rejected by a 30-cap build): still present on this SHA** (save.ts:210), as expected; fix in fix/saves-level-tolerance. The 2 failing throwaway probes confirm it.
- Other full-run failures, not save-related and pre-existing on #44 (engineering/status.md:113,120): tests/p4.test.ts (1) and tests/pacing-acw1.test.ts (1), M4-on balance misses. One unhandled error: tests/pl1-key-guard.test.ts could not load jsdom from the shared node_modules I symlinked (environment, not code).
- Nits: n1 resolved-ish (tracks.ts:27 now uses trackMaxLevel; check the :25 comment); n2 tracks.ts:7 stale comment, n3 migrate-v7.ts:25 double quotes: still there.

### Verdict
No save-compat Blocker on a99f4e3: SAVE_VERSION 6, marker and guard intact, v4/v5/v6 saves lossless and finite with M4 off/on/L30+, levels up to 60 safe and never persisted clamped. M1 and M3 are resolved. Open before landing: M4 (L30+ suite broken + missing staging CSV), M2 and m1 (fix/saves-level-tolerance). Nothing committed or pushed; worktree and throwaway test are local only.

## save-side check PR #46 e43bc00 — Saves, 2026-10-19 04:35 CEST
Worktree /workspace/wt-pr46-e43bc00 (detached). PR diff vs b29e0e9: game.ts +2 (`tracksMigratedWithBackup`), state.ts +2 (`seenTracksExplainer?: boolean`), app.ts +3, tracks-explainer.ts, styles, tests/m4-exp1-explainer.test.ts. No save.ts change.
Tests run (forks 1/2): throwaway tests/tmp-review/pr46-save.review.test.ts (12) + m4-exp1-explainer (6) + save (9) + save-fixtures (4): **31/31 pass**. Rollback test on detached copies of main a01faea and #44 4ccb9fd: **1/1 pass each** (temp worktrees removed).

**Blocker: none. Major: none.**
- **Minor m1 (by reading, not tested):** `showTracksExplainer` (tracks-explainer.ts:13) sets the flag then calls `g.save()`, which returns early when readOnly / inactive (tab guard) / held (game.ts `save()`). In those states the flag stays in memory only, so the card can show again on the next load; and a second, inactive tab passes `tracksMigratedWithBackup` (app.ts:702) and shows the card too. Suggest: only show when the game can write (or retry persist on next save), plus a test.
- **Minor m2:** export/import round-trip is N/A — there is no save export/import in src at this head (ZW-2 is still backlog). Checksum: proven to cover it (whole `state` JSON is summed, save.ts:141/205; flipping true→false gives reason `checksum`). Old saves/exports without the field load fine (falsy). When ZW-2 lands it must carry the full state.
- **Nit n1:** the PR has no save-side test for preservation; suggest adding (flag survives migrate, M4-off resave, checksum, old fixtures).
- **Nit n2:** reload path depends on the v6_backup record; if it's gone (cleared storage) the card won't show on reload — acceptable per spec.
Verified OK (test): field optional, default absent/false; SAVE_VERSION 6; v4/v5 fixtures + 732e70e load with M4 on/off; migration keeps the flag (state and v6State); M4-off resave keeps it on marked and unmarked saves; main and #44 builds load a flagged save and keep it + tracksV7 on resave. Verified OK (reading): trigger is `g.onTracksCommitted` (app.ts:701, fired game.ts:222) plus reload fallback `tracksMigratedWithBackup` (marker + committed backup), never `tracksV7` alone, so fresh M4 farms don't see it.
