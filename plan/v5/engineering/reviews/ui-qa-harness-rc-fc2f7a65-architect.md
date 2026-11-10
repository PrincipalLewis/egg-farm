# Architect review: UI QA harness-rc (adopted pre-RC drafts), run-rc fc2f7a65

- Reviewer: Senior Software Architect, Egg Farm Studio. Date: 2026-10-30, 10:05 CET.
- Scope: read-only static review of `artifacts/v5-ui/harness-rc/`. Nothing was run (no harness, no browser), no process was started or signalled, nothing was committed, and no other file was edited. All file contents were read as data.
- Inputs: my earlier reviews `ui-qa-harness-prerc-draft-2289a5d2-architect.md` (FINDINGS: M1, B1–B7, c1–c4, answers (1) and (2)) and `ui-qa-run-rc-lane-harness-rereview2-6a33b088-architect.md` (PASS).

## Verdict: **PASS** (no blocking findings)

All draft findings (M1, B1–B7, c1–c4) are fixed at the locations UI QA cites. The REFUSED class matches answer (1). The rule-21 core properties hold. Below are 3 nits, 1 note that needs HoQ acknowledgement, and 2 items for HoO. None of them blocks adoption or the RC run.

## 1. Hash verification (all match)

| item | expected | found |
|---|---|---|
| harness-rc/run-rc.sh | fc2f7a65… | fc2f7a65df155188d09e59e7f187baed620d892172b6a9f2ca3ad1304d24360d (r-x) |
| tests/run-rc-lane-helpers-REVIEW.md | b94354d9… | b94354d910d40e4d2e0cc0dd16c6d62566af2c65d2bcee5d7e2c6139e8320139 (§21 L690, §21.1 L762) |
| harness-rc/SHA256SUMS | 9fcf16ef…2f, 209 files | 9fcf16ef7bf056e2d62480c4cd8a3498fe7652056323dc691853a3ba83297f2c, 209 lines; `sha256sum -c` clean |
| tests/selftest-20261030-095127-full/SHA256SUMS | 5be387b7… | 5be387b753d47d9ca324c72e3b5177b3c1e20aa7bcc5920fe1818a40a13d4a00; `-c` clean, nested 4/5/6/7/8 sums OK |
| self-test log | FULL PASS | PART0 pin, PART1 20, PART2a 36/36, PART2b audit PASS (94 files, violation=0), PART3 15, PART4 23, PART5 16, PART6 11, PART7 29, PART8 12; `FULL RESULT PASS 2026-10-30T10:00:07+01:00` |
| lib hashes printed by the self-test | = current files | lane-proc 14de85f8, lane-step 6e850cec, lane-kill-check 19ddcad9, pw-launch 6510c5a2, mkvariant-flags bd60aa34, third-lane 2bf65afc: all equal. The run started after the last lib/test edits (09:51:01 / 09:51:17). |
| harness/ (frozen pre-run) | 6c3628c9 | `harness/SHA256SUMS -c` clean: byte-identical |
| v5-ui SHA256SUMS | c8b663b1 | unchanged |
| ops/tools | lane-run 061e7c4f, lane-kill 9c89ddc0 | unchanged; PINS.txt 08a30ce9 |

## 2. Draft findings: fix check

| id | location | result |
|---|---|---|
| M1 | lane-proc.sh:34; selftest-main-halt.sh:42-44 | Fixed. The tee to HALT, summary.txt and lanes.txt is live, and the comment now comes after it. Three assertions check that the reason reaches HALTED.json `.reason`, summary.txt and lanes.txt. PART7 29/29. |
| B1 | run-rc.sh:148-149 (ZG), 343-344 (vite), 355 (p62); lane-proc.sh:56-57 | Fixed. `lrmark` runs before each direct lane-run and writes `run/<name>/starting` + `run/.started`; `lrrec` runs after it with the PID. The stop list reports a marker without a pid as a possibly unrecorded start. Files only. |
| B2 | run-rc.sh:126-129 | Fixed. This is a pure input check that exits 2 before any write. The full 40-char SHA must be one non-hex-delimited token, so a sha7 or a longer hex run does not match. See nit d2. |
| B3 | run-rc.sh:133-135, 390 | Fixed, and stricter than I asked. `r17base_ok` checks: BASELINE.json present, no HALT/HALTED.json, `sha256sum -c` clean, sha == V5_BASE. MODE=rc with browser/unit refuses (exit 2). Other modes fall back to in-run p2base and log why. See note d3. |
| B4 | run-rc.sh:295-298 | Fixed. The done line is written first, then SHA256SUMS over everything except the live run-rc.log, then `-c`, which halts on failure. |
| B5 | snapshot-repo-scripts.sh:55-117 | Fixed. Scope is vitest's full include set at the SHA minus configDefaults and the vite.config test.exclude. The audit follows each test's relative import closure, including `new URL(…)`; imported hits are listed `via`. Known reasons are signature-pinned, and a changed signature becomes `NEEDS REASON`. A dry run at 1a61b36 scanned 127 files: 10 rows, 0 NEEDS REASON, serve-own/verify EXCLUDED. |
| B6 | selftest-pw-watchdog.sh:22, 32-36 | Fixed. The watchdog is 20 s. The stop-list assertion is literal, and a synthetic negative line shows it can fail. |
| B7 | p2.mjs:102-110, 258 | Fixed. `red()` checks every colour; `redInset` requires one layer that is both inset and red. secArtC2 has its own try/catch, so it records UNVERIFIED and p2b/r16/explore/minors still run. The selectors are honestly labelled as not browser-verified. |
| c1 | selftest-main-halt.sh:65-70 | Fixed. n2 negatives cover a wrong sha7, harness/'s `uiqa-run-76390f2` namespace, and selftest lanes without QA_DRYRUN. |
| c2 | selftest-full.sh:53-55 | Fixed. PART8 is gated by `tl_wait`; a closed gate gives NOT-LAUNCHED and FAIL. |
| c3 | run-rc.sh:393 | Fixed. The comment states that artc2-merge is a short foreground node file merge. |
| c4 | run-rc.sh:282-284 | Fixed. r17base runs the WebKit preflight through `guard` + `lrun` on lane T / lock 3. On failure WebKit is skipped and its baseline cells stay missing, so those RC cells are UNVERIFIED. |
| REFUSED (answer 1) | lane-proc.sh:63, 85-95; run-rc.sh:181 | Correct. `run/.started` is touched by `lrun` and `lrmark` before any lane-run fork. If rc != 0, there is no HALT, no TERM, and no `.started`, the result is REFUSED.txt only: no HALT, no stop list, dir not locked. A TERM goes through `run_halt`, so it is always a HALT. A stale `.started` in a reused dir can only turn a refusal into a HALT, which is the safe direction. The M4 self-test checks REFUSED rc=3, no HALT/HALTED/stop list, no `.started`, and an exact `GONE <pid>` rc0 re-query. |

## 3. Extra changes

- **lane-step.sh -1 wait fix (lines 18-28): correct, and lane-kill semantics are kept.**
  - `trap ':' TERM` is unchanged. The loop re-waits while the same child is alive (start-time match, not a zombie). No signal is forwarded or sent, and the only /proc read is `/proc/$c/stat` for its own `$!`.
  - The only change: if the second `wait` returns a value outside 0..255 (the bash 5.2 `-1` seen in run 093827 PART7), lane-step keeps the interrupted wait's 128+n and writes `<exitfile>.note`. The exit file and exit code therefore stay in 0..255.
  - Side effect: if a status is really lost, the recorded code can be 143 instead of the child's own code. That only affects a step that was already TERM'd. The watchdog path overwrites it with 124 anyway, and the 127 and 75 HALT checks are not weakened in practice.
  - The leader still lives exactly as long as its child, so `lstop`'s grace check and the stop list behave as before.
- **TP1-R17c re-pin**
  - `p2/r17-rules.mjs:37-49` pins `product/decisions.md` L1454, the D-HOP-2026-10-30-02 addendum. I checked the line: fallback (a) is withdrawn; (b) is the only outcome; a 360px misfit routes to HoP.
  - `refillCooldownTextOk` matches: the visible text must start with "Refill"; a cited exception never passes; a misfit is FAIL with route HoP.
- **Adoption-only differences:** consistent.
  - Lanes are `uiqa-rc-<sha7>` (must equal the SHA), `uiqa-run-22eac98` (MODE=r17base on 22eac98 only) and `uiqa-selftest-rc-*` (QA_DRYRUN only); `main_selfcheck` refuses anything else.
  - MODE=prerun is refused in harness-rc.
  - Scratch paths are `/tmp/qa-v5rc-*` and `dryrun-rc-*`.
- **Ports:**
  - harness-rc uses `P0=5201+10*PO`: A (PO 0) 5201-05, B (PO 1) 5211-15, W (PO 2) 5221-25, T (PO 3) 5231-35.
  - harness/ uses A 5171-75, B 5181-85, W 5191-95. No overlap; no 4173.
  - The self-tests open no port.
- **Third lane (lib/third-lane.sh):** reads files only: `/proc/loadavg` and the pre-run dir's run/, steps.tsv, lanes.txt, run-rc.log and engines/. It starts and signals nothing, and never touches `uiqa-run-76390f2`. The gate is checked before every lane-T launch; if it is not open within 1800 s, run_halt fires with nothing launched. Its `awk` is a numeric compare, not a process walk.

## 4. Core properties (re-run statically on harness-rc)

- Signals: only PIDs that lane-run recorded, only via `lkcall` → `ops/tools/lane-kill.sh`, with exact-string results (`TERM <pid> (group)` / `GONE <pid>`); anything else HALTs.
- No ps, pgrep, pkill, killall, fuser, killpg, `kill`, `process.kill` or /proc enumeration in harness-rc code.
  - The rg grep over run-rc.sh, lib/, p2/ and tests/*.sh hit only the audit's own pattern table and the "pins OK … lane-kill" echo lines.
  - The /proc allows are scoped per file, one known PID each (n5).
- No setsid, nohup, disown or `detached: true`.
- Nothing references Claude.
- GONE with group survivors, or a still-alive leader or recorded PID, leads to HALT + STOP-LIST-for-HoO.txt + `*.HALTED-NOT-EVIDENCE` renames + HALTED.json.
- The audit (v2) covers harness-rc plus the repo-scripts snapshot: 94 files, violation=0.

## 5. Findings (non-blocking)

- **d1 (Nit, doc):** the REVIEW §21 lane table says lane W uses `.browser-test.lock`, but `run-rc.sh:166` `lanelock()` puts W on `.browser-test-2.lock` (shared with B, as the code comment says). Fix the table row. The code is the intended behaviour.
- **d2 (Nit):** MODE=rc with QA_DRYRUN=1 can never pass. Line 125 overwrites QA_CI_ACK with "HARNESS DRY-RUN, NOT EVIDENCE", and B2 at :129 then always refuses (exit 2). This fails safe, and the dry paths are vdry/stub. State it in the header/REVIEW, or skip B2 when QA_DRYRUN=1.
- **d3 (Note, needs HoQ ack):** B3 is now a hard RC precondition. MODE=rc refuses unless a finished, clean 22eac98 baseline exists, which puts the r17base third-lane run on the RC critical path. A HALTed baseline blocks the RC until it is redone. The check also fires for `unit`-only steps, which don't use the baseline. I accept it as stricter-than-asked, provided HoQ acknowledges the dependency. Optionally narrow the trigger to `has browser`.
- **d4 (Nit, evidence anchoring):** `harness-rc/SHA256SUMS` (209 files) does not cover `tests/selftest-20261030-095127-full/` or the SUPERSEDED 093827 folder. The FULL PASS is anchored only by that folder's own SUMS, 5be387b7, which the REVIEW does not record. Record `5be387b7…` in REVIEW §21.1, or list the folder's SUMS file in the top SUMS.

## 6. For HoO (not harness code)

- **Rule-21 breach, disclosed by UI QA (REVIEW §21.1):**
  - The scratch probe `/workspace/qa-v5-scratch/ws.sh` sent TERM with a plain `kill` to its own `$!` PIDs, outside lane-run/lane-kill.
  - UI QA says it was not repeated and all probes exited by 09:50:44.
  - This is a process breach, not a harness finding. It should go to HoO for a ruling.
- **Frozen harness/lane-step.sh** keeps the latent `-1` exit-status quirk, and I agree it should stay untouched.
  - It can only turn a TERM'd step's recorded exit into -1/255.
  - In the watchdog path lrun overwrites it with 124 afterwards. Kill safety is unaffected.
  - A `-1` in a pre-run exit file means "status lost after TERM", nothing more.
