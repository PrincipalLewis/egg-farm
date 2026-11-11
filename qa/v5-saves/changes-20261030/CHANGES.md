# Saves QA changes 2026-10-30 (HoQ OK)
1. spec/PLANS.sha256: test-plan-streak-tap-coins.md line only, sha256 84f8a58f… -> 403c2c46… (file sha1 5fb68dc9 -> 1ebd7fc3, D-HOP-08 L68). `-c` 7/7 OK. PLANS.sha256 sha256 9c61baa5… -> b1f81b78…
2. scripts/v5-saves-gate.sh (aabf3614 -> 1e1d63cf): L72 signing moved into sign_results(); status.log excluded from SHA256SUMS (and SHA256SUMS.check.txt / STATUS.sha256), the -c line + du are the last status.log writes, then status.log is signed alone in STATUS.sha256. New `--selftest-sign <dir>` mode runs only sign_results. say() moved to the top (same body).
   New scripts/selftest-gate-sums.sh (e2c14c0c): 9/9 PASS (P1-P5 positive, N1-N3 negative, L1 = pre-fix L72 reproduces the bug).
   SCRIPTS.sha256 72977983… -> a045b620… (`-c` 11/11 OK). telemetry-check self-test 25/25. bash -n OK.
3. READINESS.md: PLANS / SCRIPTS hashes and script table updated.
Backups: qa/scratch/*.orig-20261030-073448

## 4. Rule-21 lock-window timer fix (HoQ OK 2026-10-30; standing rule 21, D-CEO-20261029-04)
scripts/v5-saves-gate.sh 1e1d63cf… -> 542683b2381ca9471b5098abf52827183eac0c5e50dbd6f4cde359afe7b163b1 (diff: v5-saves-gate.sh.timer.diff; backup qa/scratch/v5-saves-gate.sh.orig-20261030-073843).
- Removed `winwarn &` + `stopwin(){ pkill -P $WINPID; kill $WINPID; }`. The only pkill/kill in the gate; no killall/pgrep anywhere in it.
- Timer = this script in `--win-timer ST SUM WARN WINDOW GATEPID` mode: ONE bash process (printf builtin timestamps, only `sleep` as a child, same group).
  Same WARNING/OVERRUN lines, same targets (status.log + summary.txt + gate stderr via /proc/GATEPID/fd/2, best effort). GATE_WARN_S / GATE_WINDOW_S env overrides unchanged.
- startwin: `ops/tools/lane-run.sh saves-qa -- bash <gate> --win-timer …` (own session/process group; PID in .pids/saves-qa.pids). If lane-run fails: ERROR "ask HoO", exit 3.
- stopwin (main path before sign_results, and trap EXIT; runs once): `lane-kill.sh saves-qa <recorded PID>`; accepts only TERM/GONE for that PID, waits ≤5 s for the
  group to empty (read-only /proc scan), then requires lane-kill to report exactly `GONE <PID>`. Otherwise (GONE with group members, REFUSED, survivors) it prints
  `ERROR lock-window timer … STOP and ask HoO (rule 21). Do NOT pkill/killall or kill by name/pattern.` to stderr + status.log (if not yet signed) and exits 3. No fallback kill.
- Timer still stopped before sign_results(), so status.log stays signed last. New self-test hooks `--selftest-timer <dir> <hold_s>` and `--selftest-stopwin <dir> <pid>` (gate's own code path).
New scripts/selftest-gate-timer.sh 2cc81b6519759a111b4cef03c094f6f56c0e7f68a32b0c6b407dd127f601eca5: **10/10 PASS** (selftest-gate-timer.out.txt, evidence selftest-gate-timer/):
T1 lane-run PID in pidfile (this boot) · T2 own session+group, group = timer bash + sleep only · T3 WARNING in status.log/summary/stderr (WARN 2 s) · T4 stopwin via lane-kill, exit 0 ·
T5 PID + group gone, lane-kill `GONE PID` · T6 past OVERRUN (6 s): no OVERRUN line, status.log unchanged = STATUS.sha256 · T7 -c SHA256SUMS + STATUS.sha256 OK ·
N1 leader gone + surviving member -> exit 3 "ask HoO", member NOT signalled · N2 unrecorded PID -> REFUSED -> exit 3 "ask HoO" · G1 no pkill/killall/pgrep/kill in gate code.
Re-runs: selftest-gate-sums 9/9 PASS; telemetry-check --selftest-only 25/25 (SELFTEST: OK); bash -n OK (bash-n.txt).
SCRIPTS.sha256 a045b620… -> bcc54543d61f5e7fb1585f79a4b873218b282dfaea7ddf8d2183a15e32339db9 (+selftest-gate-timer; `-c` 12/12 OK; SCRIPTS.sha256.timer.diff). READINESS.md updated (READINESS.md.timer.diff).
Other kill usages (not changed, for HoQ): gate-invoked qa/m3-scripts/csr-m41-7-b8-14.mjs:183 and csr-m41-7-resetat.mjs:146 `process.kill(-srv.pid)` on their own spawned
vite preview group; v5-saves/scripts/lib.mjs:22/25/30/33 `srv.kill('SIGTERM')` on own spawned child servers (saves-browser/telemetry-check). Not via lane-run/lane-kill.
Not gate-invoked: m3-scripts/rc0-ac14f-kill.mjs:18 and rc1-d2-qa.mjs:17 walk /proc children and SIGKILL them (tree walk, legacy); ~30 other m3 scripts `process.kill(-srv.pid)`.

## HoE-25 cases + G-8 probe (2026-10-30 13:5x-14:0x CET, TASK saves-qa/hoe25-cases-g8; D-HOE-20261030-25 + -28; errata of record rev 7 fd7d5921, rev 5 cea3d717 superseded)
m5-save-cases-DRAFT.md 921f28fd… -> 3f223251… (170 cases, 19 expected FAIL); probes/telemetry/g8-schema-ts.mjs 1dcb106f… -> 83caed53…; g8-selftest.sh bb2044c3… -> aa620af1… (48/48 PASS; 3f582db/e77fc5c fail closed);
READINESS.md updated; SCRIPTS.sha256 unchanged (724346bf…, -c 14/14 OK: SCRIPTS.sha256.hoe25.check.txt). Diff: hoe25-cases-g8.diff (vs the pre-task originals). Backups + HANDOFF: qa/scratch/hoe25-1352/.

## wk102 rebase + PENDING-RULING tags (2026-10-30 ~14:0x CET, TASK saves-qa/wk102-pending)
PMW shapes v1.0.2 34123ece (v1.0.1 5d1a8f85 frozen). m5-save-cases-DRAFT.md -> 503f4bfd… (G5 re-cited; PENDING-RULING on 4 rows/sub-cases); pmw-workers-shapes-REVIEW.md -> 1f85afdc… (rebase section, F-14 new); READINESS.md updated. Diff: wk102-pending.diff. Backups + HANDOFF: qa/scratch/wk102-1405/.

## hoe29 rulings (2026-10-30 ~14:1x CET, TASK saves-qa/hoe29-rulings; D-HOE-20261030-29, decisions.md sha1 f14390a5)
m5-save-cases-DRAFT.md 503f4bfd… -> 011999aa… (177 cases, 24 expected FAIL, 0 PENDING-RULING); READINESS.md (hoe29 section, PMW v1.0.2 FINAL, rev 9 dead_zone TODO). Diff: hoe29-rulings.diff. Backups + HANDOFF: qa/scratch/hoe29-1412/.

## wk104 re-cite (2026-10-30 ~14:3x CET, TASK saves-qa/wk104-recite)
PMW shapes v1.0.4 963a490b FINAL (cites/wording only vs frozen v1.0.2 34123ece). m5-save-cases-DRAFT.md -> 955695d0…; pmw-workers-shapes-REVIEW.md -> 506851d2… (F-14, G-6 wording resolved; F-5 closed by D-HOE-29; F-2 open); READINESS.md updated. Diff: wk104-recite.diff. Backups + HANDOFF: qa/scratch/wk104-1429/.

## wk104-f2close (2026-10-30 ~14:3x CET, TASK saves-qa/wk104-f2close)
pmw-workers-shapes-REVIEW.md -> 12add7ab…: F-2 CLOSED against rc2 v1.3.16 e4d98651 L142 (present since v1.3.10 c31d5cf7; absent in v1.3.8 acfb03e3); 0 open findings. READINESS.md updated. Backups + HANDOFF: qa/scratch/wk104f2-1431/.
