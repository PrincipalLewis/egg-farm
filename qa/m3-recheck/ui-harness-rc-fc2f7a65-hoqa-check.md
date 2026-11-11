# HoQA check: UI QA harness-rc package (run-rc fc2f7a65), Oct 30 2026

Scope: `artifacts/v5-ui/harness-rc/`. This was a read-only check. Nothing was run except sha256sum/sha1sum, rg, sed and a one-line bash `return -1` semantics probe in /workspace (no lanes, no browser, no vitest, no signals, no messages).
Checked at about 10:1x CET. Note: HoO CLEARED harness-rc at 10:03 (ops-log L651). The two blockers below require a change, which under HoO's own condition means a re-test and re-clearance.

## 1. Integrity
| Item | Status | Evidence |
|---|---|---|
| run-rc.sh sha256 fc2f7a65… (r-x) | FIXED | sha256sum matches the request. sha1 312cfec2 |
| REVIEW b94354d9…, SHA256SUMS 9fcf16ef… (209 lines) | FIXED | `sha256sum -c` gives 209/209 OK and no unlisted files (excluding SUMS itself) |
| lib hashes: lane-proc 14de85f8, lane-kill-check 19ddcad9, lane-step 6e850cec, third-lane 2bf65afc, pw-launch 6510c5a2, wk-preflight 12b5b0ab | FIXED | All match. pw-launch and wk-preflight are byte-identical to harness/; wk-preflight closes only via `br.close()` (L9) |
| self-test 095127 SUMS 5be387b7… (245 files) | FIXED | `-c` clean, 245/245 |
| harness/ still 4a915d4e and byte-clean | FIXED | run-rc.sh 4a915d4e; harness/SHA256SUMS 6c3628c9 `-c` clean with no unlisted files. The pre-run is untouched |
| ops/tools vs PINS.txt 08a30ce9 | FIXED | lane-run 061e7c4f/f286a9a0 and lane-kill 9c89ddc0/be136252 equal the pins. README.md 0f68218f (HoO edit 09:18, ops-log L644) is not pinned and is not code |

## 2. Architect findings (prerc-draft review) and earlier pre-RC items
| Item | Status | Evidence |
|---|---|---|
| M1 HALT reason reaches HALTED.json/summary/lanes | FIXED | lib/lane-proc.sh:34 (`local hp=$BASHPID`; tee -a HALT summary.txt >> lanes.txt, comment moved after the pipe). Asserted by PART7 "M3 (Architect M1)" ×3 |
| B1 POSSIBLY UNRECORDED START / never-recorded leader in the stop list | FIXED | lane-proc.sh lrun writes run/.started and run/<n>/starting; stoplist reads run/*/starting |
| B2 MODE=rc QA_CI_ACK must name the exact SHA | FIXED | run-rc.sh:129 (see §3) |
| B3 r17base_ok / RBD selection | FIXED | run-rc.sh:133-135 (MODE=rc refuses without a clean baseline); :390-393 RBD and artc2 merge |
| B4 r17base SUMS order (done line, then SUMS, then -c) | FIXED | run-rc.sh:296-297 |
| B5 repo-test audit scope = full vitest include set + import closure + pinned signatures | FIXED | tests/snapshot-repo-scripts.sh:57-95 (`included()`, `IMP`/`resolve`, `known{}` signature pins; a changed signature gives "NEEDS REASON") |
| B6 pw-watchdog test not vacuous | FIXED | tests/selftest-pw-watchdog.sh:22 (`PWWD_TMO:-20`). PART8 negative assertion "stop-list assertion FAILS on a list that names a …-B PID" PASS |
| B7 survivor REUSED check | FIXED | lib/lane-kill-check.sh lkrequery appends `@ survivor <pid> start <f22>`; stoplist compares start times. No new signal |
| c1 lane-name refusals | FIXED | lane-proc.sh main_selfcheck (~L104-110). PART7 M5 ×3 PASS (wrong sha7, uiqa-run-76390f2, selftest lane without QA_DRYRUN) |
| c2 browser self-test parts gated | FIXED | tests/selftest-full.sh:47, :50, :53 (tl_wait before PART5/PART8; HALT check) |
| c3 artc2 merge | FIXED | run-rc.sh:393 → p2/artc2-merge.mjs (pure file merge using artC2Coverage) |
| c4 WebKit preflight in r17base | FIXED | run-rc.sh:282-284 (failure ⇒ WebKit SKIPPED and cells UNVERIFIED; PROCEDURE L16) |
| n5 /proc allows scoped per file and full form | FIXED | tests/audit-no-pattern-kill.sh:45-56. Each allow is per file and per variable; none is a bare `/proc/$` |
| advisory (1) REFUSED.txt before the first step | FIXED | lane-proc.sh on_main_exit REFUSED branch (~L86-89). PART7 M4 ×4 PASS |
| L2-3 documented launch line | FIXED | run-rc.sh:2-3 (lane-run uiqa-rc-<sha7> -- env QA_MAIN_LANE=… QA_CI_ACK=… run-rc.sh <sha>) |
| L26 bare-TERM comment / exact lane-kill strings | FIXED | run-rc.sh:26-27 |
| 201/206 count | FIXED | tests/NOT-EVIDENCE/README.md:15 and RETALLY.txt:5-7 ("201 + 5 = 206", HoQ 09:1x) |
| §20.4 ACCEPTED mark | FIXED | REVIEW:618 "EXCLUDED — ACCEPTED by HoQ 09:09 CET" |
| Exact wording 'excluded locally, covered by CI' | FIXED | run-rc.sh:212-213 summary line; :218 `--exclude`; :219 A3 tripwire |
| n4 per-part pinned counts with rc ANDed | FIXED | tests/selftest-full.sh:31-39 (part/partc: rc AND exact line), :40-55 pins |

## 3. verify.test.ts conditions
| Item | Status | Evidence |
|---|---|---|
| MODE=rc halts/refuses unless QA_CI_ACK names the exact RC SHA | FIXED | run-rc.sh:129 `tr -c '0-9a-f' '\n' <<< "$QA_CI_ACK" \| grep -qx "$SHA" \|\| exit 2`, before the first write (L136). It refuses rather than halting, which is stricter |
| **MODE=prerun refused** | **OPEN, BLOCKER B-1** | It is refused only on the main segment (run-rc.sh:73 is an `elif` under `if [ "$SEG" = wk ]`, L69). `MODE=prerun … run-rc.sh --lane wk` is still accepted: L71 explicitly allows prerun STEPS legacy,manifest, and L88 sets `R=…/v5-rc-ui/prerun-p2/` and L91 `R=…/prerun-p2/wk/`. L92 then `mkdir`s and **creates `prerun-p2/wk.wk-run.lock` and flocks it before main_selfcheck (L122)**. That is a write into the live pre-run's evidence dir, on the same lock path harness/'s own WK fallback uses. Today it stops at L94 (exit 3) only because /tmp/qa-v5rc-76390f2/dist-qa does not exist. Any harness-rc build of 76390f2 in that worktree would let a full harness-rc WK segment write prerun-p2/wk/. main_selfcheck accepts QA_MAIN_LANE=uiqa-rc-76390f2 for it. The header still advertises this command (run-rc.sh:36 `ENGINES=webkit MODE=prerun ./run-rc.sh --lane wk`), which is the exact command an operator would reach for if the pre-run's WebKit fails. No self-test covers prerun refusal. **Fix:** refuse MODE=prerun before the SEG branch (move L73 above L69, or add `[ "$MODE" = prerun ] && exit 2` at the top). Delete the L36 fallback line. Add a PART7 negative case (MODE=prerun with and without --lane wk: exit 2, no write). Re-freeze, re-SUMS and re-run the self-test |
| (related nit) --lane wk lock written before main_selfcheck in every mode | OPEN (nit) | run-rc.sh:92 vs :122. The A2 rule "refuse before any write" is not met for WK segments (in MODE=rc it only writes into the RC's own results dir) |

## 4. TP1-R17c and Art-c2
| Item | Status | Evidence |
|---|---|---|
| TP1-R17c pinned to product/decisions.md L1454, PASS/FAIL only, no INFO/exception path | FIXED (code) | p2/r17-rules.mjs:37-50 (TP1_R17C_PIN 'D-HOP-2026-10-30-02 addendum, product/decisions.md L1454 (fallback (a) withdrawn)'; refillCooldownTextOk returns only PASS/FAIL; fit360 false ⇒ FAIL route HoP; a cited exception ⇒ FAIL "withdrawn"). Line sha1 4b972918… matches the current L1454. plan/plan.md:1,55 and plan/case-index.md:1,35 are re-pinned |
| r17 rules unit-test evidence (REVIEW §21 claims 83/83) | **OPEN, BLOCKER B-2 (evidence)** | tests/p2-r17-rules.test.log is **stale**: it is byte-identical to harness/'s log (RESULT 79/79, mtime 09:00), although the test file now has 68 `t('` vs 64, with new cases at L66-73 (exception → FAIL, no INFO, fit360 → HoP, pin L1454). No 83/83 log exists anywhere in harness-rc. The code is right by reading, but the SUMS-signed evidence contradicts the claim. **Fix:** run the node unit test (no browser) under a lane, commit the log, and refresh the SUMS |
| Art-c2 covers card, nav and header in full and reduced motion | FIXED | p2/p2.mjs:104 ARTC2_SEL card/nav/header (header `[data-act=manageAll].desk-manage-all`, L59/65); :109-110 red() reads every colour, redInset per layer; :114-130 runs 'no-preference' and 'reduce'; an unrendered surface ⇒ 'na' record; :258 own try/catch ⇒ UNVERIFIED. r17-rules.mjs:52-66 artC2Ok/artC2Coverage |
| decisions.md file sha1 citation | OPEN (nit) | plan/case-index cite file sha1 cd74613a "09:3x". The file has since grown (now 39bd9ad2). The pinned line hash is still valid; cite the line sha1 instead |

## 5. Lanes, ports, third-lane gate
| Item | Status | Evidence |
|---|---|---|
| Ports A 5201-05, B 5211-15, W 5221-25, T 5231-35; pre-run 5171-5195 unchanged | FIXED | run-rc.sh:347 `P0=$((5201+10*PO))`; PO A=0 (:447), B=1 (:448), W=2 (:445), T=3 (:280-298); header :7. harness/ is unchanged (byte-clean) |
| Locks | FIXED / nit | :166 lanelock B\|W→LOCK2, T→LOCK3; :85 LOCK3. REVIEW §21 table L702-711 says W uses .browser-test.lock (doc mismatch). Header :21 "lane-3 lock retired" is stale |
| Third-lane gate (load < 8, not during the pre-run WK phase) | FIXED | lib/third-lane.sh TL_MAXLOAD=8; tl_wkphase reads prerun-p2 only (PRERUN.json/HALT, webkit/wk- step dirs, lanes.txt "lane W (webkit segment", engines/webkit.*); tl_wait polls every 15 s up to 1800 s, then HALT. run-rc.sh:167 (lane T: tl_wait or run_halt) |

## 6. lane-step change
| Item | Status | Evidence |
|---|---|---|
| Keeps the interrupted-wait status, exits 0-255, kill semantics unchanged | FIXED | lib/lane-step.sh:23-27 (second wait value used only if 0..255, else a `.note` is written and the interrupted value is kept). `trap ':' TERM` and no kill (audit WIRING ok). PART7 "cleanup: lane-step wrote the child's exit status (143…)" PASS |
| `e` from the first wait not range-checked | OPEN (nit) | lane-step.sh:22. It is theoretical: the first wait has not returned −1 in any observed case |
| Pre-run harness/lib/lane-step.sh latent −1 | JUSTIFIED | harness/ stays frozen (QA-D-1030-HARNESS-RC-2, qa/decisions.md L622). HoO ops-log L651 leaves it to HoQ on condition that no decision reads that exit code. Probe: bash `return -1` gives 255, so lrun reports 255 on a TERMed step only. The halt logic does not depend on it. Recommend HoQA accept it as a documented limitation |

## 7. Kill-path audit (harness-rc, excluding self-test output, fixtures, logs, md)
| Item | Status | Evidence |
|---|---|---|
| No name/pattern/ps/pgrep/awk/pkill/killall/plain kill or detach | FIXED | rg found only: comments (run-rc.sh:24-25, lane-proc.sh:99); the audit's own rule strings (audit-no-pattern-kill.sh:21-57); a static grep pattern (snapshot-repo-scripts.sh:17, :74); lib/run-chain.p1-30b29d3.sh.orig:32 `kill $SP` (inert .orig, not referenced, audit INERT); and tests/repo-scripts/2fa7318/serve-own.mjs (repo snapshot; pw-launch redirects it to lib/serve-lane.mjs, audit "redirected=3") |
| Signals only via lane-kill with pidfile PIDs; Playwright only via API | FIXED | 2-audit-full.log: violation=0 comment=8 inert=5 vendor=0 not_called=0 redirected=3 allowed=7, AUDIT PASS. PART8: "no lane-kill call ever named the browser PID", browser closed via Playwright |
| UI QA scratch probe /workspace/qa-v5-scratch/ws.sh (plain kill to its own $!, 6×, disclosed) | JUSTIFIED | Outside the package. HoO ruled it acceptable at 10:03 (ops-log L651); recorded in qa/decisions.md L622. It must not repeat |

## 8. Self-test retally (selftest-20261030-095127-full), from raw part logs
| Part | Claimed | Raw count | Status |
|---|---|---|---|
| PART0 pins | PASS | selftest-full.log: run-rc fc2f7a65 + lib hashes printed | FIXED |
| P1 lane-kill-check | 20/0 | PASS=20 FAIL=0 (1-lane-kill-check.test.log) | FIXED |
| P2a forms | 36/36 | "RESULT forms caught 36/36 ; other failures 0" | FIXED |
| P2b audit | 89 files, 0 violations | **files=94**, violation=0, AUDIT PASS (2-audit-full.log:1) | FIXED (count nit: the claim says 89, the log says 94) |
| P3 lifecycle | 15/0 | 15/0, 09:56:33 | FIXED |
| P4 halt | 23/0 | 23/0, 09:57:56 | FIXED |
| P5 pw-browser | 16/0 | 16/0, 09:58:38; no HALT in 5-pw-browser/run | FIXED |
| P6 step-guard | 11/0 | 11/0, 09:58:45 | FIXED |
| P7 main-halt | 29/0 | 29/0, 09:59:06 (assertions listed: m1/m2, M3 incl. M1 ×3, M4 ×4, M5 ×3, cleanup 143) | FIXED |
| P8 pw-watchdog | 12/0 | 12/0, 10:00:07 | FIXED |
| Run window | 09:51-10:00 | Started 09:51:27; audit 09:51:30; FULL RESULT PASS 10:00:07 | FIXED |
| Browser launches gated | yes | third-lane.log: 09:57:56 OPEN load 2.47 → PART5; 09:59:06 OPEN load 3.45 → PART8. Cross-checked independently against prerun-p2: its WebKit phase started at 10:00:47 (run/wk-preflight mtime; lanes.txt:7 WK-PREFLIGHT 10:00:51), after the last self-test browser part ended (10:00:07). No overlap | FIXED |
| Superseded run 093827 | disclosed | REVIEW §21.1: PART7 28/29 (the exit file read −1) → lane-step fix (harness-rc only) | JUSTIFIED |

## Other nits (non-blocking)
- Stale header lines in run-rc.sh: :21 says "lane-3 lock retired" (LOCK3 is in use); :23 gives lane names as uiqa-<sha7> (the code uses uiqa-rc-); :36 has the prerun fallback (part of B-1).
- docs/r17-badge-baseline-22eac98-PROCEDURE.md:12 says the worktree is /tmp/qa-v5-22eac98, but the code uses /tmp/qa-v5rc-<sha7> (run-rc.sh:89).
- REVIEW §20.4 (L612-613) still cites the harness/ line numbers L188-190/L166-167; in harness-rc these are :212-219 and the setup lines.
- REVIEW §21 lane W lock entry (see §5). The P2b file count claim is 89, but the log says 94.
- The m9 repo-script snapshot refresh on the final RC SHA is still an RC-time item (tests/repo-scripts holds only 2fa7318).

## Verdict: **HoQA check FAIL**: 2 blockers, both small
- **B-1:** MODE=prerun is not refused on the `--lane wk` path. Harness-rc can write into the live `prerun-p2/` (it already creates `prerun-p2/wk.wk-run.lock` before main_selfcheck), and the header documents the command. Fix with a top-level refusal, drop run-rc.sh:36, and add a PART7 negative case.
- **B-2:** The TP1-R17c unit-test evidence is missing. tests/p2-r17-rules.test.log is the stale 79/79 harness/ log, while §21 claims 83/83. Re-run the node test (no browser, under a lane) and commit the log.

Everything else is FIXED or JUSTIFIED. After the fixes: re-freeze, refresh SHA256SUMS, re-run selftest-full (PART7 with the new case), then the Architect's final PASS on the adopted hashes and HoO re-clearance (HoO's 10:03 clearance says any change needs a re-test and re-clearance).
