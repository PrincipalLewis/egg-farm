# GATE 4 (saves & release): PR #44 rc/m4-retune-t3 @ 4ccb9fde8251b371c6ee6444b735990e488e2aae
QA Saves & Release. Run 03:21–04:28 CEST on 19 Oct (runner `qa/m3-scripts/gate4-run.sh`, own `npm ci` in /tmp/qa-rc/4ccb9fd); marker add-on 04:23.
Evidence: `qa/m3-recheck/gate4-4ccb9fd-evidence/` (summary.txt, gate4-4ccb9fd.out, per-step logs, marker/). Nothing pushed, merged or tagged.

## Verdict: PASS for gate 4 on 4ccb9fd as shipped (farm max 30). One Major is noted for any L30+ / rollback scope: it isn't fixed in 4ccb9fd (fix a399d27 is NOT in its history).

### Tree / changes vs dd52bfd (not flag-only)
`m4.enabled = 1` at the SHA. Pushed on origin/rc/m4-retune-t3; origin/main is still dd52bfd. 37 commits, 50 files. **src:** `balance.json` (flag + T3 retune: hens/egg-value costs for L0–L11, from CSV b48be8a4) and `src/ui/app.ts` (PL-1 keyboard guard: Escape only closes, a held Enter/Space doesn't repeat buys). **Nothing changed in src/save, src/sim or src/game.ts.** Other: data/economy.csv + vendor CSV (T3), jsdom devDep, rc0 script fixes, M4-on test triage (about 35 test files rewritten for M4-on expectations), new AC7/D-CEO-04 slow tests, docs.

| Step | Result | Balance-sensitive? |
|---|---|---|
| Static + runtime build-id CR/FF/WK | `m3-rc1-pre+4ccb9fd`, no +dirty | no |
| check-release-build (dist-html) | PASS | no |
| check-globals CR/FF/WK | PASS (only eggfarmExportTelemetry) | no |
| dist-html file:// CR/FF/WK | PASS | no |
| tsc, sync-economy --check | PASS | sync: yes |
| unit | 862/864: 2 FAIL, both balance (below) | yes |
| test:slow | 16/16 (+1 skipped) | yes |
| rc0 CR/FF/WK | 249/249 each | partly (price/label rows) |
| R1–R5 save risks + M1 L18 dd52bfd migration + F1–F5 acdbedc migration (unit) | 16/16 PASS | no (R*), M1/F* grant values yes |
| Hidden-tab M4 on CR/FF/WK | 33/33 each, every row delta 0 | **yes** (offline rate) |
| Offline/clock/reload M4 on | CR 17/17, WK 17/17, FF 16/17 (script artifact, below) | **yes** (offline rate/cap) |
| Browser old-save load F1–F5 + M1 CR/FF/WK | 154/154 each | no (grant amounts are logged, not asserted) |
| Marker add-on (below) | 8/11 on 4ccb9fd: the 3 FAILs are the L31+/F50 cases (Major M-1); 11/11 on a399d27 | no |

**Unit failures, not save bugs (balance / pacing reference, Severity: owned by HoP/Economy, not gate 4):** `tests/p4.test.ts` (M4-on W4 3.0 vs the Economy flag-off ref 4.5 ±0.3) and `tests/pacing-acw1.test.ts` (91% vs ≥95% reach F10 in 15 min). Both are listed as REAL MISSES in engineering/status.md:120. Neither is an M4-off assumption. No M4-off-assumption failures remain on this SHA.
**FF clock 16/17: script artifact, Minor.** The "closed 59 s" row booted 0.01 s past 60 s under load (awayS 60.01), so the game correctly granted 300 = floor(60.01 × 5). The script now judges every row on the game-measured awayS (fixed in gate4-m4on-clock.mjs).

### Marker / migrate-once / explainer / rollback / F50 / flag-off (HoQ add, `qa/m3-scripts/gate4-marker.qa.test.ts`)
Fixture `gate4-fixtures/pre-v7-F30-C30-732e70e.json` (from 732e70e, chmod 444). Run on 4ccb9fd and on a399d27 (the Saves loader fix). **a399d27 is NOT in 4ccb9fd's history:** its merge-base is 4ccb9fd itself, it sits on top as a child, and no remote branch contains it.
| # | Check | 4ccb9fd | a399d27 |
|---|---|---|---|
| 1 | Migration exactly once: commit → 3 reloads, never pending again, `startTracksMigration()='none'`, coins 123,456,789 unchanged (refund 0), H30/V20, backup id = v6BackupId, backup raw = original bytes | PASS | PASS |
| 2 | Interrupted load: the pending session writes v6-only bytes and no backup; reload is still pending; commits once with the same result (H30/V20, same coins) | PASS | PASS |
| 3 | seenTracksExplainer: **not implemented in src on either SHA** (no field; `onTracksCommitted` not wired in the UI). The 3 explainer cases (once, existing only, never fresh, EXP1) **can't be tested yet**. Done instead: the EXP1 predicate `tracksV7===1 && v6_backup.migrationId===v6BackupId && !seenTracksExplainer` is false for a fresh farm, true after commit and after reload-before-seen; a set flag survives M4-on and M4-off load+save | predicate PASS | predicate PASS |
| 4 | Rollback with M4 off: committed F30 save | PASS (no loss, marker/H/V kept, loads back M4-on without re-migrating) | PASS |
| 4 | Rollback with M4 off: **L31+ (F40 C35 H40 V32)** | **FAIL, Major M-1**: validate `invalid_state` → recovery case R restores `.bak` = F30/C30, **H0 V0**. The player loses 10 farm levels and all track levels | PASS (loads as stored, kept on resave) |
| 5 | Pre-v7 F50 loads, migrates, round-trips (M4 on) | **FAIL M-1**: invalid_state → **case F fresh farm** | PASS (F50 kept, H30/V20 at live max 30, coins finite, round-trip) |
| 5 | Marked F50 H55 V55 loads and round-trips | **FAIL M-1** (fresh farm) | PASS |
| 6 | Flag off: a dd52bfd-written M1 save re-saved by this build with M4 off is **byte-identical** (426 = 426 bytes, no saveSeq) | PASS | PASS |
**M-1 (Major, data loss on rollback / L31+ saves):** repro: `cp qa/m3-scripts/gate4-marker.qa.test.ts <4ccb9fd wt>/tests/ && npx vitest run --maxWorkers=2 tests/gate4-marker.qa.test.ts` (cases 4 L31+, 5a, 5b); log `marker/marker-4ccb9fd.log`. Cause: save.ts validate rejects farm/collection > maxLevel (30). **Not reachable on 4ccb9fd alone** (farm max 30 can't create L31+ saves), so it doesn't block 4ccb9fd as shipped. It **does block** any final SHA that ships L30+, or any rollback from one, unless a399d27 (#47) is in.

### Canonical EXP1 fixture (for UI QA)
`gate4-fixtures/EXP1-committed-unseen-4ccb9fd.json`, chmod 444, sha256 `de6b02970cd2991630355e6f5a5e499768ae7d06a50f23c74d56cbb9ba6e7961` (SHA256SUMS updated). Built by the real flow: the 732e70e pre-v7 save loaded by the 4ccb9fd Game (M4 on, IDB mirror boot ok) → `startTracksMigration()` committed → localStorage captured inside `onTracksCommitted` (before any UI), IndexedDB `main` captured after the post-commit mirror write.
- LS keys: `eggfarm.save`, `eggfarm.save.bak`, `eggfarm.save.v6_backup`, `eggfarm.install_id`, `eggfarm.telemetry`.
- `eggfarm.save.state`: tracksV7 1, v6BackupId `b42507d60308d615`, H30/V20, saveSeq 3, seenTracksExplainer absent.
- **Backup slot** `eggfarm.save.v6_backup` = `{"migrationId":"b42507d60308d615","raw":"<the original pre-v7 save bytes, unchanged>"}`, and its id equals v6BackupId. `.bak` holds the pre-commit v6 copy.
- IDB `main` is byte-equal to LS `eggfarm.save`.
- **"Strip the flag + clear backups" is NOT equivalent.** Removing `eggfarm.save.v6_backup` breaks the migrated-player test (backup id = v6BackupId), so the farm looks like a fresh M4 farm (tracksV7 + id, no backup). The explainer must then NOT show, and the rollback copy is gone. UI QA should use this fixture, or strip only `seenTracksExplainer` and keep both backup slots.

## Not run
| Item | Reason |
|---|---|
| Explainer UI cases (shows once, existing saves only, never on a fresh farm, EXP1 reload) | Feature not in 4ccb9fd (explainer F1 lands on the final SHA) |
| IndexedDB-injected browser fixtures | LS-only injection; IDB covered at unit level (R2/R3/R5, EXP1) |
| AC7/pacing gates | Owned by HoP gate; p4/acw1 noted only |
| Published-asset check | Only after a release |

## Balance-sensitive (rerun if the CSV changes)
unit + slow, sync-economy --check, rc0 (price/label rows), hidden-tab M4, offline/clock/reload M4, M1/F1–F5 grant values. **Not balance-sensitive:** build-id, check-release-build, check-globals, html-open, R1–R5, marker 1/2/4/6, EXP1 shape, browser old-save load (pass/fail).
