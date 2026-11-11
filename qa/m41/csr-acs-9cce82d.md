# M41-7 CSR AC run: PR #63 @ 9cce82d (Saves & Release QA). Input to qa/m41/m41-7-<newsha>.md

- **SHA under test:** 9cce82d6763bb0baabe6f6c8cddf07964e6da47f, detached clean worktree `qa/wt-m41-7-9cce82d-acs` (own `npm ci`; porcelain 0 before and after the run). Pushed on `origin/fix/saves-csr-loadsafe`.
- **Ancestors:** dd223f5 Y, 1682a0c Y, 66680eb Y, **4c94704 N** (PR #58's final head, the store-passthrough fix, is on origin/feat/m41-7-csr-copy but is NOT in 9cce82d).
- **Spec of record (oracle, since 20:28 CEST):** product/farm/corrupt-save-recovery-spec.m41-final.md, sha256 `cc6b7e23f9a0d8798257e038d8243edd9cd13718af019039e097eb7c8b08817c` (D-HOP-2026-10-22-04; supersedes fcebedb3 and 6131c290). Snapshot qa/m41/csr-spec.m41-final.cc6b7e23.md. Relative to 6131c290, only the line-24 header and the inserted -03 rulings paragraph (with the -04 amendment) changed. The fcebedb3 bytes aren't on the box, so no byte diff against it was possible (see plan §0). The first run below used the 6131c290 oracle; see **§Reclassification** for the cc6b7e23 result.
- **Fixtures:** qa/m41/csr-fixtures/ (SHA256SUMS sha256 `afe2249a41bbf0c2…`, verified OK by the runner).
- **Run:** 2026-10-22 20:19–20:22 CEST. Node v20.19.2, vitest 2.1.9 (max 2 workers), Chromium headless on :5961 under one flock hold (91 s incl. wait). Runtime build-id `m3-rc1-pre+9cce82d`, no +dirty (dist-qa built before the QA test file was copied in).
- **Single command (rerun on the new SHA):** `bash qa/m3-scripts/csr-m41-7-acs.sh <full-sha> [1|0]` (1 = include the Chromium DOM subset). Evidence lands in `qa/m41/csr-acs-<sha7>/`.
- **Scope:** CSR ACs only. NOT run (per HoQA): the full local gate set, gate4 a–f, QE-LATE browser rerun, Firefox/WebKit.

## Reclassification under spec cc6b7e23 (D-HOP-2026-10-22-03/-04). vitest re-run 2026-10-22 20:29 CEST on 9cce82d, same worktree, porcelain 0 after
Fixtures regenerated: 77 scenarios (new: RUL-d-bak-only), 121 files, SHA256SUMS sha256 `e2d2eee7…e446`. New oracle items: `triedPairs` (exact [source,result] list) on all 51 matrix cases + CSR11 + CSR13-defer; per-store exact LS/IDB corrupt.* counts (CSR3-identical, CSR7-cap3, CSR11, matrix); `idbBytesNotInLs`; RUL-d re-oracled.
**vitest 149/155 pass, 6 fail** (was 148/154).

| Item | 6131c290 oracle | cc6b7e23 oracle | Change |
|---|---|---|---|
| tried[] fixed order bak→idb, v6_backup only if no valid tier-A copy (51 matrix + CSR11) | lenient (stop-at-winner) PASS | **exact PASS 52/52** | none; 9cce82d already conforms |
| Defer: v6_backup not listed (CSR13-defer) | not asserted | **PASS** (`[bak invalid, idb unavailable]`) | newly asserted, passes |
| Per-store copies (CSR3-identical LS1+IDB1, CSR7-cap3 LS3+IDB1, CSR11 LS2+IDB1, IDB bytes never in LS) | LS ≤3 only | **PASS** | newly asserted, passes |
| RUL-d-bak-only (no main, .bak only → M1, case R) | not covered | **PASS** | new test |
| RUL-d-idb-newer (IDB chosen → silent, save_restore x1) | PASS | **PASS** | unchanged |
| RUL-d-bak-newer (.bak F20 seq6 vs IDB F17 seq4) | FAIL (expected silent .bak) | **FAIL: KNOWN K1'**. 9cce82d loads IDB F17 silently with save_restore x1; the oracle wants .bak F20 + **M1 dialog** (case R), 0 save_restore | still fails, now against M1 |
| RUL-d-tie (.bak F20 vs IDB F19, equal rank) | FAIL | **FAIL: KNOWN K1'**. 9cce82d loads IDB F19 silently; the oracle wants .bak F20 + **M1** | still fails, now against M1 |
| CSR10-store-unset x3 | FAIL K2 | FAIL K2 (pending the SHA that merges 4c94704) | unchanged |
| CSR12-ls-throws-securityerror | H1 inconclusive | **M4.2 (D-HOP-22-03(8)), not an M4.1 gate.** The browser probe confirms a pre-existing blank screen, see §CSR-12 | rescoped |

**K1' (replaces K1), known, pending the new SHA:** with no LS main and a valid .bak + valid IDB, 9cce82d always picks IDB. Under -04, .bak must win when newer or tied, with the dd223f5 M1 Restored dialog. Severity if still present on the new SHA: **Critical** (wrong source restored; F17/F19 instead of F20). Fixture IDs: `scenarios/RUL-d-bak-newer.json`, `scenarios/RUL-d-tie.json`.

## CSR-12 browser probe (2026-10-22 20:30–20:55 CEST; Chromium; :5961 under the flock). Full write-up: `qa/m41/csr12-ls-throw-m42-major.md`
- **9cce82d** (`m3-rc1-pre+9cce82d`, clean preview build) has the **same outcome as the dd223f5 control** (`m3-rc1-pre+dd223f5`) in all 4 cases (SecurityError / InvalidStateError × valid IDB save / no save): **a blank page after Tap to start**, 1 unhandled rejection, no Can't-save dialog. There is **no fresh-farm autosave**: 0 writes to eggfarm.save*, 0 IDB puts/deletes, and IDB main F20 kept byte-identical. LS writes are only `eggfarm.lease` x6 + `eggfarm.install_id` x1. LS reads: 12 on 9cce82d, 13 on dd223f5.
- Crash: `newerStoredVersion` save.ts:95 ← `loadSafeInner` save.ts:332 ← `loadSafe` save.ts:325 ← `new Game` game.ts:57 ← `main()` main.ts:103 (unguarded).
- **Class: pre-existing MAJOR, filed for M4.2** (D-HOP-2026-10-22-03(8)); not an M4.1 gate. Evidence: `qa/m41/csr-acs-9cce82d/csr12-probe/{9cce82d,dd223f5}-{preview,dev}/` (screenshots, console logs, result.json with write logs and throw stacks).

## Result summary, first run (6131c290 oracle; recommendation only; HoQA issues verdicts)
vitest **148/154 pass, 6 fail**; Chromium DOM subset **155 PASS / 4 FAIL**. None of the fails is a new bug in 9cce82d:

| # | Failing item | Class | Detail |
|---|---|---|---|
| K1 | RUL-d-bak-newer, RUL-d-tie (D-HOP-2026-10-22-01 (d)) | **KNOWN, expected on 9cce82d** (HoQA) | No LS main, valid .bak + valid IDB: IDB always wins. bak-newer (.bak F20 seq6 vs IDB F17 seq4) loads F17 with `save_restore {source:'idb'}`; tie (same rank + savedAt) loads IDB F19 with save_restore. Want .bak (F20) and no save_restore. RUL-d-idb-newer passes. Retest on the new SHA. |
| K2 | CSR-10 notice store unset x3 (bak / none / v6_backup) | **KNOWN, pending the SHA that merges 4c94704** | `noticePayload()` at 9cce82d save-recovery.ts:110 does `store: r.store ?? (n.id === 'cantsave' ? null : 'ls')`, so an unset store becomes 'ls'. Passthrough (store 'ls' / 'idb' given) passes 6/6. In the real boots every recovering path set `store`, so the browser check notice.store == save_corrupt.store passed in all 8 dialog scenarios. |
| H1 | CSR12-ls-throws-securityerror | **Harness, inconclusive** (not a finding) | With a KV whose getItem throws, `new Game` throws SecurityError; dd223f5 does the same. In a real browser the `localStorage` getter itself throws first, so the unit harness can't decide this. Needs a browser probe with storage blocked; not run. |
| L1 | Dialog geometry at 360/1280 (4 Chromium checks) | **Pre-existing, identical on dd223f5** | At 360: card 309.96 (spec 312), primary 47.69 (≥48), export link 43.71 (≥44). At 1280: card 442.89 (spec 440); primary 48.32 and link 44.29 pass. dd223f5 measures the same to 0.03 px, so it isn't a regression. Needs a tolerance ruling (Q-8). |

Everything else passes. Ruling items (a), (b), (c) all pass. The known finding **KF-IDB-ONLY is fixed**: at dd223f5 an IDB-only truncated copy gave a silent new game and save/main was overwritten. At 9cce82d it is kept as `corrupt.<ts>` and the M3 dialog shows.

## Per-AC results @ 9cce82d (vitest unless marked [C] = Chromium)
| AC | Tests | Result |
|---|---|---|
| CSR-1 trigger | 12 reason triggers (empty, whitespace, parse, wrong_type x3, version 0 / 1.5, missing_state, checksum, invalid_state x2), 6 sanitizeLevel L1–L6, 4 valid controls (C1/C2/C3, N5 `workers: []`), missing main and no sources, missing main + invalid .bak, newer main refused, v6_backup v7 = invalid (version) not newer | PASS 25/25 |
| CSR-2 order | 51-case matrix {.bak, IDB, v6b} x {valid, invalid, absent} + IDB {missing, unavailable, absent} + rank idb-newer / bak-newer / tie | PASS 51/51 |
| CSR-3 B1 | corrupt LS + valid IDB gives M1, recovered_from idb, no save_restore; IDB bytes == corrupt main count as invalid and are kept once [C: M1 copy, F17, save_corrupt x1] | PASS 2/2, [C] PASS |
| CSR-4 / 5 | v6_backup restore puts the tracks migration in pending; record byte-identical at boot | PASS (the commit-time new migrationId is not asserted here, see plan) |
| CSR-6 / 11 | fresh is last resort, M3; every source invalid gives M3, tried 3x invalid, LS corrupt.* ≤ 3, v6_backup untouched [C: M3 copy, Export link, save_corrupt x1, store ls] | PASS |
| CSR-7 | cap 3 (3 prior + main + .bak + IDB), v6_backup never copied | PASS 2/2 |
| CSR-8 lease | — | NOT RUN (two-tab browser case; plan B-CSR8) |
| CSR-9 copy | M1, M3, M4, M5 strings via csrCopy, **M5 secondary 'Export save file' with current-farm aria** [C: M1/M2/M3 copy, Esc does not close, focus on primary] | PASS 4/4; [C] PASS except L1 |
| CSR-9a | levels 17→12, prev from .bak 15, age 3 h, fallback (pre-2020 savedAt), level equal falls to age, 12.5/null/−1/"17" with and without .bak, 31 > max accepted [C: level "…Farm level 12.", age "…3 days ago." by the live clock] | PASS 14/14, [C] 2/2 |
| CSR-9b | {age} boundaries 4:59 / 5:00 / 59:59 / 1 h / 1:59:59 / 47:59 / 48 h / 24 h / negative, plus formatAge exported | PASS 10/10 |
| CSR-9c | — | NOT RUN (explainer after M2; plan) |
| CSR-10 | save_corrupt fields recovered_from / store / tried / reason in every scenario; notice store passthrough | PASS; **unset store FAIL = K2** |
| CSR-12 | IDB absent → skipped, tried idb absent no_global | PASS; LS read throws = **pre-existing M4.2 Major** (browser probe, blank screen, no writes) |
| CSR-13 / 13a / 13b | IDB unknown + valid .bak → .bak, zero IDB puts after a save; defer M4, no save write, v6b untouched; defer with all-quota KV | PASS 3/3 |
| CSR-14 | preserve quota gives storage + copy_failed; restored + storage blocked gives **M5**; restore write fails, play continues | PASS 3/3 |
| CSR-15 | 242-mutation corpus, 130 invalid (non-newer): 0 silent | PASS |
| CSR-16 | fresh / restore rotation scenarios boot | PASS (rotation timing is not asserted in the generic checker; plan) |
| CSR-AC-IDB1 / IDB1-1..8 | 4 IDB1 fixtures: recovery M3, store idb, reason per fixture, IDB corrupt.* x1 deep-equal, copy put before first main put, fresh coins 0, no save_repaired [C: all 4, dialog M3, store idb, IDB corrupt.* == seeded main]; IDB1-1 cap 3 parsed (ts, n) order; IDB1-6 LS trigger → store ls; IDB1-7 valid IDB, LS missing → save_restore{idb} x1, never save_restored | PASS 7/7, [C] 4/4 |
| Ruling (a) | delete of IDB main only in the tx of a committed corrupt.* put (4 fixtures); injected QuotaExceededError (abort) and DataCloneError (sync throw) → no committed delete, main byte-identical, zero puts to main, copy_failed true | PASS 6/6 |
| Ruling (b) | valid LS + invalid IDB → no recovery, no event, no notice, F20, IDB corrupt.* x1 byte-equal; two boots → still 1 (dedupe); 3 prior → cap 3, evicts `corrupt.1792378700000-2` and keeps `-10` (parsed order) | PASS 3/3 |
| Ruling (c) | no LS main, no .bak, IDB unknown (hidden valid F17 farm) → new game, no recovery, zero IDB puts, IDB main untouched | PASS |
| Ruling (d) | bak-newer / idb-newer / tie (first run) | **1/3: K1 expected**. Under cc6b7e23: 2/4 (bak-only, idb-newer PASS; bak-newer, tie = K1') |

Negative control on dd223f5 (same test file, `qa/m41/csr-baseline/`): vitest 18/154 pass. That includes RUL-c and RUL-d-idb-newer, which hold today, and KF-IDB-ONLY reproduces. Chromium 59 PASS / 85 FAIL: IDB1 x4 silent, B1 silent with save_restore, legacy copy, no notice events.

## Anomalies / notes
- `idbMainOverwritten: true` in valid-control scenarios is the normal mirror write of a valid save, not a finding.
- The harness boot adapter auto-detects `bootPreserveIdb` (9cce82d main.ts order: openForBoot → newer → claim → `bootPreserveIdb` awaited → `new Game(…, idbCopy==='failed' ? null : mirror, value, {idbBoot, idbAbsentReason, idbCopy})`). The lease is always owned and the M5 storageBlocked flag is injected into `recoveryNotice` the same way main.ts does. Re-check the adapter against main.ts on the new SHA.
- My servers: preview on :5961 started and stopped by the browser script; :5961 free after. One flock hold per run.

## Repro
```
bash qa/m3-scripts/csr-m41-7-acs.sh 9cce82d6763bb0baabe6f6c8cddf07964e6da47f 1
# vitest only: cd qa/wt-m41-7-9cce82d-acs && cp ../m3-scripts/csr-m41-7.qa.test.ts tests/ && npx vitest run --maxWorkers=2 --minWorkers=1 tests/csr-m41-7.qa.test.ts; rm tests/csr-m41-7.qa.test.ts
```
