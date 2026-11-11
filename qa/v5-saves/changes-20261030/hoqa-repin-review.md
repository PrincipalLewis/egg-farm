# HoQA review: Saves flags-0 re-pin (after-the-fact) — QA-D-1030-SAVES-REPIN

Reviewed 2026-10-30 ~12:50 CET by HoQA (read-only; no process started or killed apart from sha256sum/git/patch --dry-run and a node one-liner on temp files).
Basis: D-CEO-20261030-06 (all m4.flags = 0), QA-D-1030-SHIPFLAGS, QA-D-1030-SAVES-RC-2 (12:11), plus the earlier rulings the change set cites: QA-D-1030-SAVES-RC-1 (11:07) and QA-D-1030-SS15-NA (11:09).

## Verdict: ACCEPT-WITH-NOTES

The re-pin is what was approved. Every claimed hash matches. Backup + diff reproduces the current files byte-for-byte. The G1 ship-flag check fails closed, and S-AC5 enforces bought >= 1 and events == purchases. The dry-run verifies as 19 PASS / 0 FAIL / 0 NOT RUN / 1 N/A, hard_fail=0. No finding is Major or above. None of them blocks the official gate. F1 and F2 should be fixed before the gate is run on the final RC SHA if there's time; otherwise they go to 5.1 with the mitigations below.

## 1. Hashes

| item | claimed | computed | result |
|---|---|---|---|
| changes-20261030/repin-flags0-20261030.diff | 0482a520…58af0 (499 lines, 24 hunks) | 0482a520ef06ef6239f1bc4163784be919f05129b70624b775bf62b974358af0; 499 lines; 24 `@@` | MATCH |
| scripts/v5-saves-gate.sh | 4ba2dda1… | 4ba2dda1929dbf711b0594e7d39c9a31adc499ea8af3f532ed70e0faeacda14a | MATCH |
| scripts/saves-browser.mjs | c36c83d0… | c36c83d0c6b653f995f9b76e05e91aa9b57c0bda40f9250dbe6c56a0f25aa32a | MATCH |
| scripts/telemetry-check.mjs | fbd82199… | fbd82199f47c844d0c21cbdbf80eef88d3a2d5cd17a67f46a47a9d23b9a3bf36 | MATCH |
| scripts/gate-na.txt (new) | 49b6f43c… | 49b6f43c2d6f61d2f78aa4d531d0602f320f26e0412a4e8a6aa121460ce3db6c | MATCH |
| scripts/SCRIPTS.sha256 (13 entries) | a78c572f… | a78c572f113929748f5870d8c18909a4226a87bf220f2a5a5c59ad2ab1d969f3; 13 lines; `-c` 13/13 OK | MATCH |
| READINESS.md | da197a2d… | da197a2dd3635a25139c2daf264ae681e3c70f9c31dfa779ef4a4cdd850c5f14 | MATCH |
| v5-saves-cases.md | 386c4716… | 386c471644c4afb0a7333f441642574bb673c3ce0599951eefc4ccd9756a7e28 | MATCH |
| backup qa/scratch/backup-repin-1222/BACKUP.sha256 | old hashes 542683b2 / a019e3eb / 7c6b2621 / bcc54543 / d7e7d2ea / e8435e4f | `-c` 18/18 OK, old values as claimed | MATCH |
| backup + diff vs current | — | `patch -p1` applied on a temp copy of the backup equals all 7 current files (diff -r clean) | MATCH (diff is complete; no unlisted edits) |
| dry-run results/SHA256SUMS | 3c13420a… | 3c13420a98f01ad9c096d7f85c8f116d600b4a15db8519bf239062731c1acf68; `-c` 137/137 OK | MATCH |
| dry-run results/STATUS.sha256 | status.log 34d547c0…, rc-balance.json 9a73bd8a… | file 14604136…; `-c`: status.log OK, rc-balance.json OK | MATCH |
| status.log | 34d547c0… | 34d547c0d21a06a63c195114a34329709659b73ebd165497420216cf391ce9cf | MATCH |
| rc-balance.json | 9a73bd8a… | 9a73bd8a6ebb936792c9c5fc667f37d295ecb9f8b74149112d50b297d228bb89; byte-identical to `git show` | MATCH |
| `git -C /workspace/egg-farm-studio/game show 3f582db:src/config/balance.json \| sha256sum` (the gate's repo, `GIT=$STUDIO/game`) | 9a73bd8a… | 9a73bd8a…; 3f582db = 3f582dbfe31a9d309e6b1d0e96a4f77711b333ec | MATCH |
| m4.flags @3f582db | 14, all 0 | 14 keys (golden, streak, tapCoins, abilities, broody, salesStopped, fatigueCue, pause, rc2Refill, autoRefill, clockWage, breeds, zeroGainUi, bestBuyV2), all 0; m4.enabled 1 | MATCH |
| FIXTURES.sha256 / SPEC.sha256 | 25e4e603… / cd39288f… | both match; `-c` OK | MATCH |
| schema doc rc1-DRAFT-SCHEMA-3f582db.md | 083fcc11… | 083fcc11c728… | MATCH |
| FO probe evidence probes/out-3f582db/SHA256SUMS (cited in cases doc) | 53020762… | 53020762…, **but `-c` FAILS on compare.txt** | see F2 |

No hash in the change set or the dry-run mismatched. The only `-c` failure is the FO probe evidence (F2). That file is outside the change set but cited by it.

## 2. Per-hunk notes (24 hunks)

Scope key: **IN** = on the RC-2 / D-CEO-06 list. **IN (prior)** = approved earlier in SAVES-RC-1 or SS15-NA and re-pinned here as one change set, as RC-2 directed. **OUT** = not on any list.

v5-saves-gate.sh (5 hunks)
1. `@@ -15` sign_results: STATUS.sha256 also signs rc-balance.json when present. **IN**: SHIPFLAGS "balance.json sha256 recorded in every run". OK.
2. `@@ -45` preflight + helpers:
   - Port preflight (refuses with exit 2 before anything is written). **IN (prior)**: RC-1, Minor.
   - U-ss15 preflight (needs SS15_MODULE or a cited N/A). **IN (prior)**: SS15-NA.
   - `na_cite`/`na`/`notrun` (NOT RUN = hard fail in both modes). **IN (prior)**: RC-1. `GATE_NO_NA=1` can only make the gate stricter.
   - `lockwho`/`LK` lock logging. **OUT of the RC-2 list.** It cites "RC-1 (4)", but the RC-1 entry in qa/decisions.md doesn't record it; Saves QA says HoQA asked for it. Accepted on review: it's read-only (/proc and .pids reads, never signals), and the wait budget is unchanged at 40 × 30 s = 1200 s. It has one latent defect (F1).
   - `step()` now calls `notrun`. Same semantics. OK.
3. `@@ -56` G1-flags-ship-set. **IN.**
   - It reads the COMMITTED file: `git -C $GIT show $FULL:src/config/balance.json` at the resolved run SHA, never the worktree. If git fails it writes an empty file, which then fails.
   - I tested the node check verbatim on temp files. Each of these FAILS with rc 1: missing file, empty file, parse error, no m4.flags key, empty flags, `null`, any flag 1 / "0" / false / null.
   - All-0 passes. HF is incremented on failure, and the summary row is `FAIL | HARD | flags≠ship-set: …` with the balance.json sha256.
   - Note: it doesn't assert the 14-key set (F5).
4. `@@ -66`:
   - Unselected engines become NOT RUN HARD. **IN (prior)**: RC-1.
   - Browser steps go through `LK`. **OUT** (lock logging, as above).
   - T steps use `--schema shipped`. **IN (prior)**: SS15-NA / D-CEO-04 re-target; schema 083fcc11 approved in RC-2.
   - U-ss15 becomes N/A from gate-na.txt, else NOT RUN HARD. **IN (prior)**.
   - "no RC html" now gives 7 NOT RUN rows (previously silent). Stricter. OK.
5. `@@ -85`:
   - B-csr8-lease and B-resetat now take the lock through `LK`. **OUT** (lock logging).
   - csr8 wrapper `( set +o pipefail; LK … | tee /dev/stderr | grep -q '^DONE fails=0$' )`. Checked; it can't turn a FAIL into a PASS:
     - The gate runs with `set -o pipefail`. The old step ran inside a fresh `bash -c`, where pipefail is off, so its status was grep's alone. `set +o pipefail` keeps exactly that behaviour, and avoids a spurious FAIL from tee's SIGPIPE when `grep -q` exits early.
     - `DONE fails=${fails}` is the last statement of csr-m41-7-b8-14.mjs (L184, after `finally` kills the server). Any exception, a timeout before DONE, a non-zero fails count, or an LK give-up (75) leaves no matching line, so grep fails and the step FAILs.
     - The only way exit status is ignored is a hang after DONE (timeout 124 → PASS). That's the same as before (F6, Info).
   - `LOCK handover` line. **OUT**; logging only, after the last release, before signing.
   - `counts:` line. **OUT**; reporting only. It's built from `grep -c` on summary.txt. `VERD` and the exit code still depend only on `$HF`, and nothing reads the counts line back (the NEEDBUILD check matches `^G1-build | PASS` only). Note that `PASS` counts include INFO steps (V-noreg-base).

saves-browser.mjs (1 hunk)
6. S-BAK-p1-B race fix. **IN (prior)**: RC-1 (1).
   - `waitSave(prev = truncated main)` returns only the game's own rewrite, and the UI is read only after `.recovery-layer` attaches.
   - If no rewrite happens, `after === trunc` → `noLoss(null)` → FAIL. Fail-closed.
   - Dry-run Firefox: PASS, layer=true.

telemetry-check.mjs (10 hunks)
7–16. **IN (prior + RC-2)**:
   - `--schema shipped|v062` (default shipped; anything else exits 2).
   - The SHIPPED table, with file:line, matches the approved 083fcc11 doc (S-AC1/2/3/5/8 and the export/privacy row are all in the doc).
   - v0.6.2 assertions go through `ckV`: recorded as N/A-by-scope and not counted under shipped; real under v062.
   - `evProblems` replaces `schemaProblems` in TS3/TS6/TS7.
   - S-AC5 (`sAc5Problems`) needs an integer `bought >= 1` and `ups.length === bought`, plus newLevel integer and coinsBefore >= cost. It's wired as a HARD `ck` in TS1 under shipped. It has 6 self-tests, including the 2 count-mismatch negatives and the 0-purchase negative, all PASS in T-chromium.
   - Dry-run S-AC5: bought=1, 1 upgrade event.
   - M5 events with their flag off FAIL (flags-0 RC).
   - TS7 is unchanged and INFO with salesStopped=0 (INFO-FAIL seam absent). That matches RC-2 "TS7 INFO".

gate-na.txt (1 hunk)
17. New. One data line only: `U-ss15-share-guard | QA-D-1030-SS15-NA / D-CEO-20261030-04 …`. The other 3 lines are `#` comments, which `na_cite` skips. **IN (prior)**. OK.

SCRIPTS.sha256 (1 hunk)
18. 3 entries changed and gate-na.txt added (13 entries). `-c` OK. **IN**.

READINESS.md (1 hunk)
19. Pin record and table. **IN** (documentation). The text matches the hashes.

v5-saves-cases.md (5 hunks)
20. FIXTURES.sha256 cite corrected from a stale 64562c33 to 25e4e603. **OUT** of the list, but a correct doc fix (verified) and harmless.
21. Telemetry re-target note and S-AC5 rule. **IN**.
22. TS7 NOT COVERED / INFO (5.1); flags-0 note. **IN** (RC-2).
23. SS-15: N/A cite, plus "live path covered by FO-1..10 and UI ss15 sample, Saves step to 5.1". **IN** (RC-2 (a)(b)).
24. FO pinned under D-CEO-06, with the one-save limitation, the 3f582db re-run citation, gate rules and lock order (Saves first, ui no lock from 13:50). **IN** (RC-2 (c), SS-15 FO-1..10, SHIPFLAGS). The FO evidence it cites has F2.

## 3. Dry-run (gate-DRYRUN-3f582db, 12:18:15–12:44:21 CET)
- summary.txt: **19 PASS** (18 HARD + V-noreg-base INFO), **0 FAIL, 0 NOT RUN, 1 N/A** (U-ss15, cited), `VERDICT: PASS (hard_fail=0) DRYRUN`.
- G1-flags-ship-set PASS "all 14 m4.flags = 0", balance.json sha256 9a73bd8a….
- Lock log: 9 acquired / 9 released (exit 0 each), 0 gave-up, 1 LOCK handover line. Waits were 160 s (S-chromium, behind lane ui), 13 s (B-resetat-AC1-3, behind `fit.cjs`, lane unknown) and 511 s (B-resetat-AC4-CLK, behind ui `rc0-browser.mjs`, then pid 3098244 `run.cjs`, lane unknown).
- The unknown holders are most likely Head of Art & UX's work, from file evidence, not proof:
  - `run.cjs`: art-ux/reviews/m5-refill-axe/run.cjs, created 12:39, results 12:43–12:44, a 3-engine axe run.
  - `fit.cjs`: art-ux/scratch/m5-refill-fit/fit.cjs.
  - Neither sid appears in any .pids file, so they weren't started through lane-run.sh (rule 21). Both processes are gone now. See F7.

## 4. Excluded hunk: qa/scratch/draft-rc1/followup-rc-engines-preflight.diff (sha256 519ef3cc…)
- It adds one RC-mode preflight line: `[ $DRY = 0 ] && [ sorted --engines != chromium,firefox,webkit ] && pf "RC mode needs all 3 engines"`. It runs before `mkdir -p "$R"`, so a narrowed or misspelled engine list (or a duplicate) refuses with exit 2 and the once-only RC results dir isn't used up. Dry-run is unaffected.
- **Safe.** It only makes the gate stricter, and it addresses a real risk: today an RC run with fewer engines still hard-fails, but it creates SHA256SUMS, so a re-run then needs HoQ's OK.
- Packaging defects (F4):
  - The .diff is in normal (not unified) format and in the reverse direction (`54d53 <`), so it was generated from the with-preflight file to the pinned file.
  - It omits the comment edit on L49 that the staged full file (`v5-saves-gate.sh.with-rc-engines-preflight`, 2cffb322…) carries.
- Recommendation: approve it as a separate follow-up change set only if it's regenerated as a forward unified diff with an RC-mode refusal self-test (narrowed → exit 2 and nothing written; all 3 → passes), plus a SCRIPTS re-pin, before the official run. If there's no time, leave it out and run the official gate with the default engine set (no `--engines` argument). Saves QA should state that in the launch line.

## 5. Findings
| id | severity | finding | action |
|---|---|---|---|
| F1 | Minor (latent) | `LK` uses `flock -E 75` and retries whenever rc == 75, but the wrapped command's own exit code passes through the same `$?`. A wrapped step that exits 75 is silently **re-run** (up to 40 times), so a FAIL(75) followed by a PASS reports PASS. Reproduced on a temp lock: the command ran twice, LK rc=0. None of the wrapped scripts can exit 75 today (saves-browser 0/1/2/3, telemetry-check 0/1/2, resetat 0/1, timeout 124), so the dry-run isn't affected. | Fix (5.1 or the next re-pin): have the inner `bash -c` map rc 75 to another code, or retry only when an "acquired" marker wasn't written. Add a self-test. |
| F2 | Minor | The FO evidence cited in v5-saves-cases.md (`probes/out-3f582db/`, SHA256SUMS 53020762) **fails `sha256sum -c`** on compare.txt. Cause: run-flagsoff.sh L10 appends `DONE` to compare.txt after it builds SHA256SUMS (the same bug class as the old status.log one). The first 18 lines hash to the signed value ce9ec079…, so the content wasn't tampered with and `VERDICT PASS (0 failing rows)` stands. Saves QA's "-c OK" claims didn't cover this directory. | Before the final-SHA FO run: move `echo DONE` ahead of signing, or exclude/sign it last, and re-verify `-c`. Re-hash the runner (28888be8 changes) in the cases doc. |
| F3 | Info (scope) | Lock logging (`lockwho`/`LK`, 30 s re-logs, acquired/released, LOCK handover) and the `counts:` line aren't on the RC-2 / D-CEO-06 list. They cite RC-1 (4), which the qa/decisions.md RC-1 entry doesn't record. Reviewed: read-only, no verdict impact, same 1200 s wait budget. | Accepted on review. Recorded here as the approval of record. |
| F4 | Info | The excluded preflight .diff is reversed, in normal format and incomplete (see §4). The content is safe. | Regenerate if adopted. |
| F5 | Info | G1-flags-ship-set accepts any non-empty object/array whose values are all 0. It doesn't assert the expected 14-key set, so a renamed or removed flag key would still pass. Absent keys are acceptable under FO (i) ("0 or absent"), so this is hardening only. | Optional: assert `Object.keys(f).length===14` or the named set at the final SHA. |
| F6 | Info | B-csr8-lease's verdict is grep-based (`DONE fails=0`), so a hang after DONE that times out (124) still passes. That's pre-existing behaviour, unchanged by `set +o pipefail`. | None for v5. |
| F7 | Info (ops) | Unregistered browser-lock holders during the dry-run: pid 3098244 `flock -w 1500 … timeout 240 node run.cjs` (sid 3098226) and pid 2867103 `timeout 120 node fit.cjs` (sid 2867096). Neither is in .pids, and file evidence points to Art (m5-refill-axe / m5-refill-fit). Using `-w 1500` can keep a waiter queued into the Saves window. | Before 13:50: ask Art and HoO that any browser-lock user other than Saves runs via lane-run and stays off `.browser-test.lock` from 13:50 until the Saves `LOCK handover` line. |
| F8 | Info | The FO probe files (flagsoff-probe.test.ts dc2ab34c, flagsoff-compare.mjs 89cd26d4, run-flagsoff.sh 28888be8) are cited by prefix only and aren't in SCRIPTS.sha256 or PLANS.sha256. All three prefixes match on disk. | 5.1: pin them in a manifest. |

## 6. Conditions carried into the official gate
1. The official run counts only on the final RC SHA, with G1-flags-ship-set PASS and its balance.json sha256 in status.log and STATUS.sha256 (SHIPFLAGS).
2. Run with the default 3 engines unless the F4 follow-up is adopted and re-pinned.
3. FO-1..10 are re-run on the final SHA, with the F2 runner fix in place first or the `-c` failure explained in the RC report.
4. The RC report lists as not covered / 5.1: TS7, the SS-15 Saves live-path step, and telemetry v0.6.2 rows (N/A-by-scope).
