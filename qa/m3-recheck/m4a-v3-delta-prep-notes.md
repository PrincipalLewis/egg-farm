# M4-A v3 delta prep: backup protocol fix. Saves QA, 2026-10-16 (updated ~22:05 CEST)
Harness lives in **qa/m4a-v3-delta/** (moved out of /workspace/scratch-m4a per CEO rule 4; scratch-m4a is back to its original files):
- `m4a-v3-delta.mjs`: browser harness.
- `delta-lib.mjs`: pure rules plus self-test.
- `evidence/`: 677317d dry-run logs and JSON.
It uses qa/m3-scripts/m4-guard-lib.mjs (backupStatus/parseBackup/mkBackup, ADR M4-15).
Rules: m4-design @f1869c4 (ADR M4-12/15/16) + **m4a-spec v1.7 (FINAL, HoP 21:59)**. The IDB_RULE switch was removed.

## Parameters
| Param | Value / behaviour |
|---|---|
| ENGINE | browser engine |
| PORT | exit 2 if it is 4173, exit 3 if busy |
| HTML | single-file build, served at / |
| EXPECT_BUILD | required; runtime Settings id must match, otherwise exit 5 |
| DOWN_HTML / DOWN_BUILD | defaults: a01faea asset / a01faea |
| OUT | output folder |
| ONLY | default D1,D2,D3,D4,G,H,RB,ATT,S5,EXP |
| EXPLAINER_SEL | default `text=Upgrades got an upgrade!` (spec v1.8 gives the copy, no selector) |
| IDB_TIMEOUT_MS | default 1500; T-1 counts as available |
| IDB_HANG_MS | default = IDB_TIMEOUT_MS (one 1500 ms limit covers open and write); overridable |
| ATTEMPTS_KEY | `eggfarm.save.migration_attempts` (integer); overridable |

## Checks
Fixtures: v4/v5-12/v5-40 from qa/m3-fixtures, plus v6-from-a01faea from the 677317d smoke folder.
Fakes: the fake IDB is an indexedDB.open/put/add/get wrapper in the page. The fake clock is Playwright `context.clock` (install + runFor), so the timeouts are deterministic.

- **D1 LS backup failure** (stub setItem throws / LS quota full):
  - save byte-identical after load;
  - later saves are v6 with no marker;
  - no COMMITTED backup (orphans OK, M4-15);
  - progress survives a close, and the next load retries;
  - `save_migration_aborted {store:'ls'}`;
  - 0 console errors.
- **D2 normal path:**
  - F/C/H/V/refund 0 per expected-migration.json;
  - LS and IDB `v6_backup` = `{migrationId, raw}`, written once each, committed (`migrationId === state.v6BackupId`), raw == input bytes, IDB record == LS record;
  - version 6;
  - 0 errors.
- **D3 downgrade:** a01faea keeps tracksV7 and track fields byte-identical.
- **D4 orphans:** superseded by M4A-31(i) v1.8, see below.
- **G, M4A-31(g), v1.7:**
  - Unavailable: `none` (no global), `security`, `invalidstate` (private mode), `blocked`.
    - LS-only commit, backup.raw byte-identical;
    - `save_backup_idb_unavailable {reason}` ×1;
    - zero IDB writes;
    - **LS readback with matching migrationId BEFORE the first in-place write** (HoQA bar; checked against a sequence log of bk.set / bk.get / save.set).
  - Deferred: `timeout` (open gets no answer by T), `open_failed` (other open error), `read_error` (IDB get fails).
    - save byte-identical v6, never forced;
    - `save_migration_aborted {reason: idb_timeout|idb_read_error, attempt_count:1}` ×1 (open_failed: reason not named in the spec, any reason accepted);
    - the next healthy load commits and the attempts key is cleared.
  - `under`: open answers at T-1 = 1499 ms, so IDB counts as available and the commit uses both stores.
- **D1-attempts (M4A-31 d1):**
  - 3 consecutive deferred loads give attempt_count 1, 2, 3, with `stuck_on_v6:true` on the 3rd, ×1 per load;
  - the save stays byte-identical;
  - the 4th (healthy) load commits and resets the counter.
- **H, M4A-31(h) abort:** `quota`, `error` (IDB tx aborts with QuotaExceededError / UnknownError), `hang` (completion swallowed, fake clock past IDB_HANG_MS).
  - v6 byte-identical after load;
  - play continues on v6 with no marker or v6BackupId;
  - `save_migration_aborted {store:'idb'}` ×1;
  - no committed backup;
  - the next load retries with a fresh id and commits.
- **RB readback_mismatch:** with IDB unavailable and the LS readback id mismatched, the migration aborts: v6, no marker, aborted ×1.
- Refusal/refund/v6→v7 checks stay PENDING-S4 in the guard. The m4-v7-* fixture names are unchanged; they now carry `v6BackupId`, and `m4-v6-backup-record.json` is the matching committed `{migrationId, raw}` record (used by ZW-1..4 and ZW-6b2).

## Watch: migration_attempts vs ZW
`eggfarm.save.migration_attempts` is an **expected write on M4 builds**. On rc1 and flag-off **refusal** paths it must **not** be written. It stays **off** the ZW allow list (exactly lease/tab/telemetry, zero IDB writes), and the lib self-test asserts that a write to it is a FAIL. If Engineering renames the key, update ATTEMPTS_KEY here; the ZW strictness catches any name.

## Dry run on 677317d (before the v1.7/M4-15 rewrite; old record format). Evidence in qa/m4a-v3-delta/evidence/
37/59 in each engine (D1/D2/D3 only). The full D1 rerun (async IDB failure) gave 17/37 in each engine.
- **D1 LS failure:** 677317d **stops writing saves entirely** after the backup throws.
  - v5 input stays v5 on disk;
  - progress is lost on close (saveWrites 0);
  - no abort telemetry.
- **D1 IDB failure:** 677317d **commits the migration anyway** (tracksV7:1). IDB is treated as best effort.
- **D2:** migration values, LS/IDB backup ×1 and v6 all PASS, but in the old raw-string format. Against the new `{migrationId, raw}` rule this will FAIL.
- **D3:** PASS.
- **D4/G/H/RB:** written after the dry run; **not run in any browser yet** (self-test only, per instruction).

## Commands once the fix SHA arrives (CEO rules: flock every browser run, release checks first, stop servers after, write only in qa/)
```
cd /workspace/egg-farm-studio/qa/m4a-v3-delta
uptime                                   # 1-min load < 50
node delta-lib.mjs --selftest && node ../m3-scripts/m4-guard-lib.mjs --selftest
H=/workspace/egg-farm-studio/engineering/builds/eggfarm-m4a-<SHA7>.html; sha256sum $H   # read the fix diff first: event names, ATTEMPTS_KEY, hang timeout
for X in chromium:4400 firefox:4430 webkit:4460; do
  ENGINE=${X%%:*} PORT=${X##*:} HTML=$H EXPECT_BUILD=<SHA7>+m4on OUT=$PWD/evidence/<SHA7> \
    flock /workspace/egg-farm-studio/.browser-test.lock node m4a-v3-delta.mjs | tee evidence/<SHA7>-${X%%:*}.log
done
pgrep -fa "m4a-v3-delta|vite preview.*44[036]0" || echo "no servers left"   # the harness closes its own http server on exit
```
Guard (refusal side, same flock): `cd ../m3-scripts && ENGINE=.. PORT=.. DIST=<dir> EXPECT_BUILD=<sha> BUILD_KIND=rc1|flagoff|m4 S4=0 SUITE=m4 flock /workspace/egg-farm-studio/.browser-test.lock node rc1-guard-save-qa-m4.mjs /workspace/egg-farm-studio/game; pkill -f "vite preview.*--port <PORT>"`

## v1.7 details confirmed (22:03), applied to the harness, self-test only
- **One 1500 ms limit** covers open and write.
  - Open timeout → always deferred `idb_timeout`.
  - Write still pending → abort `idb_write_timeout`; asserted in H-hang.
- **Reason checks tightened:**
  - path 1 = exactly `no_global|security|blocked`; `security` covers both InvalidStateError and SecurityError;
  - deferrals = `idb_timeout|idb_read_error`;
  - "other open failure" (G-open_failed) accepts any reason and records it as `observedReason`.
- **Only deferrals count:**
  - G deferred asserts `migration_attempts` = integer 1;
  - D1-attempts asserts integer 1, 2, 3 with `stuck_on_v6` at ≥3;
  - G unavailable and **H aborts assert no increment** (key absent, no attempt_count > 0).
- **New ATT checks:**
  - **ATT-commit:** seeded attempts=2, then a healthy commit removes the key.
  - **ATT-reset:** migrate, Settings > Reset, then reload (no tap). LS and IDB `v6_backup` must both be gone (no orphan) and the attempts key gone. The confirm-button selectors are best effort; verify them on the first run.
  - **ATT-refusal:** a v7 save on the M4 build shows the newer-save dialog with zero save/backup writes, zero IDB writes, IDB backup unchanged and the attempts key absent.
- **Guard (refusal side):** ZW-3 and ZW-6 also assert the attempts key is absent. It stays off the allow list.
- Self-test: delta-lib (also with IDB_TIMEOUT_MS=1200) and m4-guard-lib pass; syntax OK. No browser run.

## m4a-spec v1.8 (HoP 22:04, Code Reviewer N8), applied; self-test only
Spec text read: product/farm-upgrades/m4a-spec.md (or product/farm/m4a-spec.md if not moved) v1.8 (§M4A-30 N8, §M4A-31(i), §11 M4A-33).
- **S5, M4A-30:** unmarked v6 **F10/C7** save (built from v6-from-a01faea, track fields stripped, valid sum). Clock setup: `savedAt = now − 3 h`.
  - Boot grant from telemetry `offline_grant` = **exactly 19,800** (2.75 × 7200 × 1.0, v6 rules), once, then the in-session commit (tracksV7:1).
  - Stored save re-aged by another 3 h (savedAt −3 h, sum recomputed), then reload: grant **exactly 24,750** (×1.25), once. A reload right after does not re-apply it.
  - Deferred boot (fake IDB timeout): grant still **19,800**, and no commit.
  - The grant field name is assumed to be `eggs` (falls back to amount/granted/offline_eggs). Confirm it on the first run.
- **EXP, M4A-33:** spec AC (a)/(b)/(c). Selector is the parameter EXPLAINER_SEL (defaults to the title copy).
  - (a) fake IDB delays the commit by 1 s with the fake clock paused at boot: absent at boot and the save is unmarked; after the clock runs 1.1 s, the explainer appears **once** and `tracks_explainer {action:'shown'}` fires once.
  - (b) deferred load and aborted (h) load: none.
  - (c) reload after the commit: none.
- **D4, M4A-31(i):**
  - (1) after a commit, LS and IDB records are **exactly** `{migrationId, raw}` (no other keys), id == v6BackupId.
  - (2) an orphan (id ffff…, raw = a *different* older save) next to an unmarked v6 whose migration defers on every load stays **byte-identical** through autosave, flushes and a reload. It is **never restored** into the save.
  - (2b) an orphan next to an already-marked save (no migration runs) stays untouched and unprotected.
  - (3) the **next migration** overwrites it with a new id, exact shape, committed, raw = the current v6.
  - (4) only Reset deletes it (ATT-reset).
  - Loading alone no longer counts as "deleting/overwriting" an orphan; the old D4 expectation is removed.
- **H, M4A-31(i):** any orphan left by the aborted attempt survives later saves and autosaves in that session untouched. The next load (failure removed) is the next migration: it overwrites the orphan with a fresh id and commits.
- Limit: orphans are seeded in LS only (no IDB orphan seeding yet). IDB status is reported.

## cf66ce5 (design v0.3.1) + m4a-spec v1.9 update — 2026-10-16 (self-test only, no browser)
- m4a-v3-delta.mjs sha256 560abae3…10f4; delta-lib.mjs 5cf1c57a…63d6. `node --check` OK; delta-lib + m4-guard-lib selftests OK.
- G: `blocked` is now a deferral (`idb_blocked`, attempt_count+1, store idb). Every deferral variant waits for an autosave (5.5 s), then a forced flush, and asserts ZERO IDB writes for the whole session and no `save_backup_idb_unavailable`. Unavailable path: reasons only `no_global|security` (private-mode errors count as security).
- D2: §3d/ADR M4-24. IDB v6_backup is never written (absent). The commit happens only after the LS v6_backup readback matches (readbackBeforeInPlace). The IDB mirror stays paused until the LS main readback is byte-equal and the backup id matches (mirrorAfterReadback, zero IDB writes before).
- QH (new): INIT `quota-tight` leaves 16 KiB free. Expect a deferral `{store:'ls', reason:'quota_headroom', attempt_count:1}`, the key = 1, main byte-identical, .bak and telemetry not dropped, no backup write, `eggfarm.save.headroom_probe` absent afterwards, and zero IDB writes. The "enough room" case is covered by D2.
- MC (new): IDB main is seeded with seedIdbCtx. Modes `idb-main-newer` (re-read returns savedAt +1 h) and `idb-main-fail` (re-read errors). Expect abort `idb_main_changed` x1, attempts not incremented, no marked/v6BackupId main written to LS, and IDB main without tracksV7.
- RB: runs with healthy IDB and with no IDB. Expect abort `{store:'ls', reason:'readback_mismatch'}`, save v6 unmarked, attempts absent.
- H (IDB backup quota/error/hang): S-4 under §3d. Reported as PENDING-S4 unless `S4=1`. TOTAL now prints pass/applicable plus the PENDING count; exit is 1 only on a FAIL.
- D4: an IDB v6_backup orphan (id eeee…) is seeded next to the LS orphan. It must stay byte-identical in D4-2/2b and through the D4-3 migration. D4-1 now expects IDB v6_backup absent.
- D1-attempts: 4 timed-out loads give 1, 2, 3, 4 (stuck_on_v6 from 3). The 5th load (IDB answers at 100 ms) commits and removes the key. A later deferral reports 1 with no stuck flag.
- Default ONLY: D1,D2,D3,D4,G,H,RB,ATT,S5,EXP,QH,MC. "Mirror resume" is checked inside D2, not as a separate section.
- Not run in any browser yet. When allowed: `flock /workspace/egg-farm-studio/.browser-test.lock env ENGINE=chromium PORT=4400 EXPECT_BUILD=cf66ce5 DIST=… node qa/m4a-v3-delta/m4a-v3-delta.mjs` (one engine at a time).
- Assumptions to confirm: QH free space of 16 KiB is enough to trip the estimate for the a01faea v6 save; idb-main-newer triggers on the 2nd IDB `main` get (boot read = 1st).

## m4a-spec v1.10 alignment (HoP 22:13, ADR M4-24) — 2026-10-16 22:2x (self-test only, no browser)
- I read product/farm-upgrades/m4a-spec.md (or product/farm/m4a-spec.md if not moved) v1.10 ((f)1, (h), (i), (j), (k)). The trial key is `eggfarm.save.headroom_probe`. The spec only says "a scratch key, method owned by the Architect", and design §3d-1 at cf66ce5 names the key, so PROBE_KEY is unchanged and now asserted in the self-test.
- PENDING-S4 unless `S4=1`:
  - D1-idb ((f)1 IDB backup-write failure)
  - H-quota/error/hang ((h) IDB rows plus `idb_write_timeout`)
  - all of D4 ((i) `{migrationId, raw}` record and orphan rule)
- EXP-b now gets its aborted load from the LS backup stub instead of `idb-error`.
- G "T-1 available" now expects an LS-only commit with IDB v6_backup absent, not a both-store commit.
- (j) QH:
  - The near-full case expects a deferral `{store:'ls', reason:'quota_headroom', attempt_count:1}`, the counter key = 1, v6 byte-identical, no v6_backup written and the trial key absent.
  - The new QH-ok case uses INIT `quota-roomy` (free = 4×save + 192 KiB). It expects the trial key to be removed and the commit to go through with no abort.
- (k): the fake IDB now also logs readwrite/versionchange transactions (`idb.tx.rw`). New `DL.attemptIdbWrites(seq)` checks for zero puts/adds/deletes/clears/rw-tx before the read-back-confirmed commit, or over the whole log when nothing committed. It is asserted explicitly in D2, G (unavailable, deferred, T-1), QH, QH-ok, MC and RB.
- Caveat: RB checks the whole session, including a forced flush after the abort. If the build legitimately resumes the IDB mirror after an abort, that row will need cutting off at the abort point.
- sha256: m4a-v3-delta.mjs fc7e5a13…e58f; delta-lib.mjs e2cdc890…c93f. `node --check` OK; delta-lib and m4-guard-lib self-tests OK.

## m4a-spec v1.12 + v1.14 additions (2026-10-16 ~23:00 CEST, HoQA request)
Backups: `m4a-v3-delta.mjs.bak-pre-v114`, `delta-lib.mjs.bak-pre-v114`, and this file `.bak-pre-v114`. Spec read: product/farm/m4a-spec.md v1.14 (M4A-4 r4 / r3 mn1/mn2, M4A-30 v1.14 single x1.0 grant + r3a/r3b, M4A-31 (d1)5 and (h)6, M4A-34 v1.11/v1.12).
New default ONLY: `D1,D2,D3,D4,G,H,RB,ATT,S5,EXP,QH,MC,AH6,OFF,MG3A,MG3B`. New env: `ECON_CSV` (default product/economy.csv: `offline_eggs_per_sec`, `offline_max_eggs_2h`), `ECON_MS_CSV` (default product/economy.m4-candidate.csv; used only for `hens_msK_level/offline_mult` while economy.csv lacks them). No expected number is hardcoded in the harness; delta-lib's self-test cross-checks the CSV read against the spec's worked values (1,368 / 2,700 / 12,375 / 24,750 / 9,902 / 12,378 / 19,800 / 24,750).
Deterministic clock: `context.clock.setFixedTime(T0)` (T0 = 2026-10-16 12:00Z): Date.now is frozen so away is exact, timers keep running (autosave, 1500 ms IDB timeout). Advancing for "+3 h" = `setFixedTime(T0 + 3 h)`. Per-load events = telemetry events after the boot baseline (`window.__tel0`, captured in INIT before the game runs).
New INIT hooks: `qa.mode` key (per-load fake mode override; `none` = healthy); mode `commit-fail` (setItem of a marked `eggfarm.save` throws QuotaExceededError → `commit_write_failed`); mode `rb-mismatch` (LS v6_backup read returns id ffff…); fake-KV `kill` = `first-save` | `after-first-save` | `bk` | `commit`: at the kill point every later setItem/removeItem of non-qa keys is dropped (process dead), `qa.killed` set so the next load is not armed, then the page is closed.

### v1.12 counting rule applied to existing rows
- D1-attempts: 4 timeouts → 1,2,3,**3** (stuck from 3) via capped `DL.attemptsOk` (ATTEMPTS_CAP=3).
- D1-stub/quota: new row "abort counts: attempt_count 1, key = 1".
- RB: attempts = 1 (was "absent"). MC: `idb_main_changed` is a **[deferral]**, attempt_count 1, key 1. H (S-4 only): abort increments to 1.

### New check IDs
- **OFF-H0-1h, OFF-H0-2h, OFF-H{ms1}-1h, OFF-H{ms1}-2h** (ms1 = first `hens_msK_level`, today 10): marked v6 save (from m4-v6-marked-real, H=F, pending 0), savedAt = T0 − away. Expect one `offline_grant` = `DL.offlineExpected` = min(floor(rate[H]×min(away,2h)×mult), floor(cap[H]×mult)); row prints expected vs actual and diff. Plus "reload at same clock pays nothing". Summary in `<OUT>/<engine>-OFF-summary.json`.
- **MG3A-<path>** for paths `i-commit`, `i-unavailable` (no IDB global), `ii-2deferrals` (2× idb-timeout, then healthy), `iii-abort-stub` (LS backup write throws), `iii-abort-readback`, `iii-abort-commitfail`, `iv-away30s` (no boot grant). F10/C7 unmarked v6, away 3 h. Rows: first-load boot grant = x1.0 value (19,800) or none for iv, later pre-commit loads pay nothing; commit on the last pre-absence load; +3 h → x1.25 value (24,750) once, reload nothing; 19,800 never paid after a commit; zero console errors.
- **MG3B-<kill>** `first-save` (r3b 1), `after-first-save` (r3b 2), `bk` (r3b 3: after v6_backup, before main commit), `commit` (right after the main commit write): kill happened; absence paid exactly once in persisted state (`DL.grantOnce`: persisted = stored savedAt == T0); point-specific row (recompute from old savedAt / nothing / unmarked v6 then retry+commit / committed survives, no re-grant); +3 h after → 24,750 once.
- **AH6-commit_write_failed, AH6-readback_mismatch**: 4 failing loads in one context → 1,2,3,3 + stuck from 3rd, reason x1/load; stored save unmarked v6 each load (byte-identity recorded as info, later v6 autosaves allowed); clean load commits and removes the key, no abort.

### Not automatable / caveats
- Kill is a fake KV (writes dropped after the kill point), not an OS process kill; in-flight IDB writes are not cut (M4-A is LS-only, so no effect). On builds where the grant write *is* the commit write, `after-first-save` and `commit` coincide; `seqHead` in the evidence shows which write was hit.
- `commit_write_failed` fake throws only on writes carrying `"tracksV7":1`; if a build writes the marker elsewhere first, re-target.
- r3b(4) "total ≤ one grant per absence" is asserted from telemetry + persisted savedAt, not from basket egg totals (customers consume basket eggs, so egg balance is not a clean oracle).
- Hens milestone mult comes from economy.m4-candidate.csv until Economy merges the hens_ms columns into economy.csv.

### Full 3-engine run (once the fix SHA arrives)
```
cd /workspace/egg-farm-studio/qa/m4a-v3-delta
uptime                                   # wait while 1-min load > ~50
node delta-lib.mjs --selftest && node ../m3-scripts/m4-guard-lib.mjs --selftest && node --check m4a-v3-delta.mjs
H=/workspace/egg-farm-studio/engineering/builds/eggfarm-m4a-<SHA7>.html; sha256sum $H
for X in chromium:4400 firefox:4430 webkit:4460; do
  ENGINE=${X%%:*} PORT=${X##*:} HTML=$H EXPECT_BUILD=<SHA7>+m4on OUT=$PWD/evidence/<SHA7> \
    flock /workspace/egg-farm-studio/.browser-test.lock sh -c 'uptime; timeout 2400 node m4a-v3-delta.mjs' 2>&1 | tee evidence/<SHA7>-${X%%:*}.log
done
pgrep -fa "m4a-v3-delta|:44[036]0" || echo "no servers left"   # harness closes its own http server
```
(`timeout` sits inside the lock so queue time on the shared lock doesn't kill the run.)

### Smoke status (23:41 CEST)
Chromium smoke on 677317d (ONLY=OFF,MG3A,MG3B,AH6, port 4400) was **NOT RUN**. It waited ~45 min in the flock queue: the lock was held by an orphaned `sleep 2700` (PID 857820, started 23:08, not ours) and about 15 other jobs were waiting. Our queued job was withdrawn. Only Node checks were run: delta-lib + m4-guard-lib self-tests OK, `node --check` OK.
sha256: m4a-v3-delta.mjs d01a4e61660285e470bd572356bc7c110fa560bc8c449a13d8c3cae30e3491d9; delta-lib.mjs 5300d869784bb639166addb48202ce1e239b73f60d43fe145c42cd7008c458ce
