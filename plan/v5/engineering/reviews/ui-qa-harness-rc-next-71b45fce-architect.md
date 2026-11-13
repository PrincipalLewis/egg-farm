# Architect static review: UI QA harness-rc-next (run-rc.sh 71b45fce), Fri 30 Oct 2026, ~12:20 CET

Scope: artifacts/v5-ui/harness-rc-next/ (staging; NOT swapped). Start doc tests/DELTA-FOR-REVIEW.md 5cee7c77.
Method: static read only. I ran no harness, browser or test, sent no signals and committed nothing. The only commands were reads, `sha256sum` and `sha256sum -c`.
This file is the only one written.

## Verdict: PASS, no blockers

One Minor finding (F2) and nits. All the items from my bb28040f review (F1, n1–n8), plus B4 on every manifest path, csr, gate (i), (k), RC-12 and RC-10 j, are fixed and statically verified.
F2 must be handled in the RC report, or with a one-line tally, before RC evidence is read. It is not a harness-correctness blocker.

## 1. Integrity / freeze

| Check | Result |
|---|---|
| run-rc.sh | 71b45fce… (selftest PART0 prints the same value) |
| SHA256SUMS | f0a7fcf7…, 221 lines, `-c` OK |
| DELTA-FOR-REVIEW | 5cee7c77 |
| REVIEW | cc438d5b |
| k-docked-diff.patch | 564e0093 |
| rc12-diff.patch | e4b8ef9d |
| REBASELINE-CASES | 434d5d09 |
| Delta vs bb28040f SUMS e646c036 (joined by path) | 21 CHANGED, 13 ADDED, 1 REMOVED (lib/__pycache__/merge-engines.cpython-313.pyc). 209−1+13 = 221. "12 added" in the claim = 12 + DELTA-FOR-REVIEW.md itself (its L46). **Matches.** |
| Unlisted files | Only tests/selftest-2026* folders. The superseded 112603 run is mixed-code (disclosure 6) and is not evidence. |
| harness-rc/ | Still run-rc bb28040f, SUMS e646c036, `-c` OK |
| harness/ | SUMS 6c3628c9, `-c` OK |
| Pins | lane-run 061e7c4f, lane-kill 9c89ddc0; PART0 matches PINS.txt 08a30ce9 |
| Self-test freshness | Self-test tests/selftest-20261030-113736-full started 11:37:36 CET. Newest file before it: rc12-diff.patch 11:33:56. Files newer than the start: tests/run-rc-lane-helpers-REVIEW.md 11:52:23, tests/DELTA-FOR-REVIEW.md 11:52:28, SHA256SUMS 11:52:34. All three are docs or the manifest ("doc-only fixup"), so no code changed after the start. |
| Self-test SUMS | 44d17e95, 813 lines, `-c` OK |
| PART0 printed hashes | All 16 printed hashes equal the current files, including the new n3 lines lib/third-lane.sh e8415ba2 and lib/wk-preflight.mjs 12b5b0ab. node-versions.txt: harness v24.22.1 /usr/local/bin/node, build v20.19.2. |
| Part results (selftest-full.log) | PART0 PASS; 1 20/0; 2a 36/36; 2b AUDIT PASS; 2c 16/0; 2d 9/0; 2e 96/96; 2f 11/0; 2g 15/0; 3 15/0; 4 23/0; 6 13/0; 7 121/0; 5 16/0; 8 12/0; FULL RESULT PASS 11:48:07 CET. Matches the claim. |

## 2. Item-by-item (file:line, run-rc.sh unless stated)

**F1, MODE allowlist (FIXED).**
- :62 refuses `prerun`.
- :64 `case ${MODE:-rc} in rc|vdry|stub|r17base|m5dry) ;; *) … exit 2`. The only code before it is `set -u -o pipefail` (lines 1-61 are otherwise comments), so it runs before any write.
- An empty or unset MODE → rc (:64, :87).
- Tests:
  - PART7 m7a (PRERUN, dry);
  - m7b (Rc, non-dry);
  - m7c (PRERUN + `--lane wk`).
- Each m7 case also asserts that no new path appears under v5-ui and that there is no v5-rc-ui/76390f2 or /22eac98 (selftest-main-halt.sh:121-127).

**PART7 negatives for my gaps:**
- (b) non-rc MODE with `--lane wk`: :90. Tests m7d (stub) and m7e (r17base). vdry and m5dry hit the same line; they are untested but covered by construction.
- (c) a refused rc wk run creates no lock: m7f is refused at main_selfcheck (:149). It checks that `v5-rc-ui/76390f2/results.wk-run.lock` is absent (:138).
  - Note: refusals at :164 (WK-DONE exists) and :165 (no worktree) come after `mkdir` + `exec 8>` at :163. Those refusals leave the empty lock file and its parent dir. This is lock-then-check by design (race-free), so it is not a finding. No test covers it (nit n6).
- (d) unknown MODE: m7a, m7b, m7c.
- (f) r17base refusals:
  - n7 a/b/c (selftest-main-halt :146-149): the uiqa-run-22eac98 lane with MODE=stub, with another sha, or with MODE=rc → exit 2, and nothing written.
  - m7j: an existing BASELINE.json refuses (:124). It runs on a sed copy with a scratch baseline dir, and the scratch dir is unchanged.

**n8, env overrides (FIXED for the three named).**
- :66 refuses V5_BASE, R17_BASE_DIR and PRERUN_DIR when set (`${!_v+x}`, so even an empty value refuses) in MODE=rc.
- Tests m7g, m7h (MODE unset → rc) and m7i.
- Residual: see nit n4.

**Node pin + RC-10 j (FIXED).**
- :72 harness `node -v` major must be v24, else exit 2.
- :73 QA_BUILD_NODE_DIR is allowed only when QA_DRYRUN=1.
- :74-75 the build dir defaults to /workspace/tools/node-v20.19.2-linux-x64 and must have bin/node.
- :80 build major must be v20.
- :78 `BP="env PATH=$BUILD_NODE_DIR/bin:$PATH"`.
- Every npm ci and game build uses $BP: :227 npm-ci, :239-240 build/build-qa (r17base and m5dry), :255 builds, :279 variant builds, :304-305 minbase/base, :346 npm-ci-base.
- Tests:
  - M8 m8a: harness v20 refused.
  - m8b: build v24 via fake dir refused.
  - m8c: missing build dir refused.
  - m8d: non-dry override refused.
  - toolchain.txt and TOOLCHAIN-DISCLOSURE asserts (selftest-main-halt :165-170).
- What runs on harness v24 (no $BP): pw-install :229; sync-check vite-node :245; tsc :246; vitest :253; zg-unit and e4 golden vite-node :341-354; vite preview server :377; probes and check scripts.
- None of these produce a shipped or dist artifact, so nothing product-facing is built on v24. But tsc, vitest and sync-check are product tests run on v24 while CI uses 20. **HoQA item H3.**

**n1 (FIXED).** :109 honours QA_PRERUN_GUARD_EXTRA only when QA_DRYRUN=1.

**n2 (FIXED).** The WK fallback launch line at header :37 is fully `ops/tools/lane-run.sh uiqa-rc-<sha7> -- env QA_MAIN_LANE=… ENGINES=webkit …`.

**n3 (FIXED).** See section 1.

**n5, cleanup-143 assert tightened (FIXED).** selftest-main-halt.sh:67 now asserts exit == 143 AND no exit.note (the fallback was not taken). PART7 121/0.

**lib/lane-step.sh:22-27 (sha 6c7f27e2), HoO helper review. Satisfied; details for HoO in section 5.**
- It waits only on its own `$!`. The /proc poll reads `/proc/$c/stat` of its own child only, matching pid, start time and not-zombie (:21, :26). After that comes ONE `wait "$c"` (:27).
- No forwarding signal: `trap ':' TERM` at :18, and the file contains no kill, ps or pgrep.
- The exit file is always 0..255:
  - :33 maps anything else to 255 plus a .note;
  - :34 writes it.
  - -1 can no longer be written.
- A lost or odd status can only become non-zero (255, or 143 if TERM interrupts a live-child wait), which means fail or HALT, never a pass or a continue.
- Nothing in lane-step makes the exit file drive a continue, so HoO's 10:05 condition holds.

**n6, dead prerun branches (FIXED).** :172 `LR=$R/legacy/` (no prerun arm). The m5dry tail at :495-498 no longer has a prerun arm. :62 keeps the refusal. PART7 M6.

**n7, PROCEDURE (FIXED).**
- docs/r17-badge-baseline-22eac98-PROCEDURE.md:13-15: the baseline opens NO port (run_legacy is not called); the T block 5231-35 is only reserved.
- :21 gives the dry path artifacts/v5-ui/dryrun-rc-22eac98/run-rc-r17base/ (NOT EVIDENCE), matching :105.
- Note: the launch lines (PROCEDURE :9, header :3/:37) name `artifacts/v5-ui/harness-rc/run-rc.sh`, the post-swap path. Until the swap, that launch runs bb28040f. HoQA item H4.

**B4 on EVERY manifest path (FIXED).** The writers are in lib/manifest.sh (efba9542), sourced at :147.
- r17base: :331 final done line to summary, then :332 `mf_flat $R || exit 9`.
- m5dry: :495-497 gaps and done line, then :498 mf_flat.
- rc main and rc wk: the tallies and "end" line come first, then :518 `mf_rc $R || exit 9`. mf_rc steps:
  1. mf_partials re-check;
  2. per-engine manifests;
  3. the final "results:" line;
  4. per-dir SUMS;
  5. SHA256SUMS.all;
  6. `-c` on every manifest, else HALT.
- The wk lane then writes WK-DONE.json, holding sha256(SUMS.all), at :521-523, after the sums.
- run-rc.log and MERGED.json are written after the sums and are excluded by `mf_x` (manifest.sh), so a later `-c` stays clean.
- prerun: no manifest path exists in harness-rc-next (refused at :62). It lives only in frozen harness/, out of scope.
- `-c` self-test per path: tests/manifest-b4.test.sh (PART2c 16/0).
  - rc main: last summary line is the results line; summary is listed; log, MERGED and wk are not listed; per-engine counts; final `-c` after the later writes.
  - rc wk: WK-DONE hash == sha(SUMS.all); `-c` passes.
  - m5dry and r17base: mf_flat `-c` passes.
  - Negatives: the old order fails `-c`; a stale partial → HALT; an unreadable file → HALT; a tamper → `-c` fails.
- Caveat (nit n7): the test drives the library in the correct order on synthetic dirs. That run-rc's tails call it in that order is confirmed by my static read above, not by the test.

**csr focus fix (FIXED).** csr/focus-ring.mjs `ringDecision`:
- :focus-visible must match, else FAIL.
- A missing unfocused baseline → FAIL.
- PASS needs an outline (style != none, width > 0) that differs from the unfocused outline, OR a box-shadow that differs from the unfocused box-shadow.
- An identical drop shadow never counts.
- csr-spot.mjs: STY (:49) records unfocused baselines before any Tab, skipping the active element; LATE fills autofocused elements (:55); FOCUS reads `a.matches(':focus-visible')` (:56); judge (:58); the asserts at :75 and :99 use visibleRing.
- tests/csr-focus-ring.test.mjs (PART2d 9/0) includes the required negative (drop shadow, no ring, :focus-visible true → FAIL), plus proof that the legacy rule passed that element.
- Nit n3.

**Gate (i) (FIXED).** run-rc :130-131: in MODE=rc with browser or unit steps, `r17base_ok` = lib/r17base-gate.py plus `sha256sum -c` of the baseline SUMS. It runs before main_selfcheck (:149) and before any write (first write :163/:166). lib/r17base-gate.py is read-only and REFUSES on:
- a HALT, HALTED.json or REFUSED.txt marker anywhere;
- any name containing NOT-EVIDENCE;
- a BASELINE kind or sha mismatch, or `missing` != [];
- fewer than 15/15 cells (3 engines × 5 sizes);
- a cell not in SUMS, with fewer than 7 scenes, with no box having w>0 and h>0, or with run/p2base-<cell>/exit != 0.

Tests:
- PART2f 11/0.
- PART7 M8 fixtures empty, missing-cell, halt and not-evidence are refused with the 15/15 message, and the fixture is unchanged.
- The `good` fixture passes the gate (then refused by main_selfcheck).

Consequence (disclosure 3): a WebKit-skipped or bb28040f-built baseline is refused, so a re-baseline is needed. HoQA item H2.

**(k) (FIXED).**
- lib/farm-view.mjs `farmViewOk`: at mq `(min-width:960px) and (orientation:landscape)` it requires:
  - no modal;
  - #yard visible;
  - #p-upgrades either not rendered or in docked shape: [hidden], static, inside a static #panel-layer, no aria-modal, close hidden.
  - Any other shape → refuse.
- Below the breakpoint the rule is unchanged (!sheetOpen).
- Facts come from qa-page.mjs:39-44; p2.mjs:22 assertFarm.
- Badge target: p2.mjs:26-34 navBadge uses `#p-upgrades .tabs [data-tab=workers]` when docked (target recorded), the nav icon otherwise.
- PART2g 15/0.

**RC-12 R1, no silent PASS (MET; see F2).**
- p2.mjs:35-40 dockedBadgeCheck → r17-rules.mjs:76-88 dockedBadgeFindings checks count vs game, count vs nav badge, badge after label, aria-hidden, and the Workers name rule. Any failure, or a thrown check, writes `rt:'finding'` with reasons and the game file:line.
- On success it writes `rt:'docked-badge-ok'`. No `ok()` PASS is emitted for these DOM checks.
- Docked badge-pos (p2.mjs:62-64):
  - pos.ok === false → finding, with DOCKED_POS_TRACE (r17-rules :89-91);
  - 'UNVERIFIED' → counted as unv (qa-page.mjs:23);
  - a genuine within-tolerance box → PASS.
- A missing docked tab: navBadge returns `{missing:true}` → the count and/or name check produces a finding. The explicit `present` check only fires on a null b (nit n2).
- p2-r17-rules.test.mjs:92-108 and PART2e 96/96.

**RC-12 R2.**
- :167 toolchain.txt; :170-171 TOOLCHAIN-DISCLOSURE.txt (both node -v, build npm -v and path, package-lock sha, scope wording).
- Asserted at selftest-main-halt :167-170, including the negative.

**Stale strings: string-only (CONFIRMED).**
- run-rc :171 "(npm disclosure OPEN pending HoQ)" is a printf into TOOLCHAIN-DISCLOSURE.txt. Its only readers are the self-test asserts at :166-170, which match the node, npm-version, lock-sha and scope lines, not the `ruling:` line.
- REBASELINE-CASES.txt:33: no code reads the file (grep: only a comment in p1/p1.mjs:13).
- :79 "/node=" lives only in the path half of BNPM_V. :171 uses `${BNPM_V%%@*}` (the version) and `${BNPM_V#*@}` (printed text), and no assert parses the path.
- Nothing branches on any of them. They will still appear in every RC's evidence file (H5).

**Rule 21 (CLEAN).**
- No pkill, killall, pgrep, ps, setsid, nohup, disown or kill-over-output on code lines.
- /proc reads: recorded PIDs' stat only (lane-proc :8/:15, lane-kill-check :30), lane-step's own child (:20-21), and /proc/loadavg (third-lane :10, run-rc :175/:199). No walks.
- Stops go only via lane-kill.
- Audit 2-audit-full.log: files=135, violation=0, AUDIT PASS.
- No Claude references.
- Disclosure 4: two short direct `node` runs outside a lane (focus-ring test, r17-rules import). They are non-long-running, but this is an H/HoO note.

## 3. Matrix (lane × MODE × QA_DRYRUN), harness-rc-next 71b45fce

`exit 2 @:N` = refused before any write.
Shared pre-checks, in order:
1. :62/:64 MODE;
2. :66 rc env;
3. :72-80 node;
4. :83 SEG;
5. :85 SHA;
6. per-MODE checks;
7. :110 prerun guard;
8. :131 gate (i), rc only;
9. :149 main_selfcheck (recorded leader of `$QA_MAIN_LANE`; uiqa-run-22eac98 = r17base on 22eac98 only; uiqa-selftest-rc-* = DRY only);
10. :153/:158 QA_CI_ACK (rc: exact 40-char SHA);
11. first write :163 (wk lock) or :166.

| MODE | SEG | QA_DRYRUN | Outcome | Out dir R (:105) | Locks / ports |
|---|---|---|---|---|---|
| prerun | any | any | exit 2 @:62 | — | — |
| PRERUN, Rc, foo (unknown) | any | any | exit 2 @:64 (m7a/b/c) | — | — |
| empty / unset | main | unset | = rc (row below) | | |
| any | any | any (harness node ≠ v24) | exit 2 @:72 (m8a) | — | — |
| any | any | any (build node missing / ≠ v20) | exit 2 @:75 / :80 (m8b/c) | — | — |
| any | any | 0 (QA_BUILD_NODE_DIR set) | exit 2 @:73 (m8d) | — | — |
| rc + V5_BASE / R17_BASE_DIR / PRERUN_DIR in env | any | any | exit 2 @:66 (m7g/h/i) | — | — |
| rc | main | unset | RC; gate (i) @:131 first; B2 ACK @:158 | v5-rc-ui/<sha7>/results/ | A (.browser-test.lock) FF; B (-2) Cr then WK after wk-preflight; ports 5201/5211 in run_legacy only |
| rc | main | 1 | dry RC | v5-ui/dryrun-rc-<sha7>/run-rc/ | same |
| rc | wk | unset / 1 | ENGS=webkit only (:112); steps browser, shots, manifest; wk lock @:163 after the input checks | R/wk/, lock ${R%/}.wk-run.lock | W (-2), port 5221 in run_legacy only |
| vdry / stub | main | unset | exit 2 @:93 | — | — |
| vdry / stub | main | 1 | dry, no browsers (stub) or variant builds (vdry) | dryrun-rc-<sha7>/run-rc-vdry or -stub-* | — |
| vdry / stub / r17base / m5dry | wk | any | exit 2 @:90 (m7d/e) | — | — |
| r17base (baseline uses THIS row) | main | unset | sha must be V5_BASE @:123; existing BASELINE refused @:124 (m7j); lane uiqa-run-22eac98; build via $BP (v20) | v5-rc-ui/r17-badge-base-22eac98/ | T (.browser-test-3.lock) + third-lane gate; NO port |
| r17base | main | 1 | dry baseline, NOT EVIDENCE (PROCEDURE :21) | dryrun-rc-22eac98/run-rc-r17base/ | T, no port |
| m5dry | main | any | needs PIECE @:99; QA_STRICT=0; mf_flat | dryrun-rc-m5-<piece>-<sha7>/ | per piece |

No row writes under artifacts/v5-rc-ui/prerun-p2 (the :109-110 / :114-115 realpath guard).

## 4. Findings and nits

**F2 (Minor). RC-12 findings are recorded but not tallied or surfaced.**
- `rt:'finding'` records go only to the probe jsonl, plus a `FINDING …` stdout line in the step log.
- No consumer counts them: grep over run-rc.sh, m5/, shots/ and lib/*.py finds no reader of 'finding'. The probe tally (qa-page.mjs:21-23, run-rc :499-517) counts only pass/fail/unv.
- So an engine can show `fail=0` in summary.txt while carrying docked-badge findings. This is not a silent PASS (no PASS is emitted for those checks), but the findings can be silently missed.
- Fix: add a `findings=N` count per engine to the summary "results:" line before mf_rc, or require the RC report to list every rt:'finding' and the baseline's findings.

**Nits:**
- n1: lane-step.sh:31 .note text is stale. Since :27 sets e=e2, it says "recorded the interrupted wait value $e" when e == e2 is out of range; :33 then records 255. The behaviour is correct; reword the text.
- n2: r17-rules.mjs:77 `present` is checked only for a null b. navBadge returns `{missing:true}` for a missing docked tab (p2.mjs:28), which produces count/name findings instead. Add `|| b.missing`.
- n3: focus-ring.mjs `shadowDiff` passes ANY box-shadow change (for example a transitioning or pressed shadow sampled 120 ms after Tab, csr-spot :58). Outline and shadow visibility and contrast are not checked. Acceptable, but the focus screenshots must be eyeballed.
- n4: other env overrides are still honoured in MODE=rc: BASE_SHA :118, P2_HEAD :120, ZG_BASE_SHA :133, FLAG_FILE :134, MANIFEST :136, SHIP_VALUES :137 (SHIP_VALUES is designed input), MATRIX, MAXLOAD and PARALLEL :103. Either refuse them like :66, or echo their effective values into summary.txt.
- n5: the p2.mjs RC docked path still records `rt:'na'` ("…(docked)") when the nav is not visible and the layout is not docked (:59-61, same as bb28040f p2:46). Under QA_STRICT=1, an undocked missing nav should FAIL.
- n6: no test covers the :164/:165 refusals that leave the empty wk lock file (lock-then-check by design).
- n7: manifest-b4.test.sh exercises lib/manifest.sh, not run-rc's tails; the tail order is verified statically here. Also, the manifests/SHA256SUMS.<engine> files are excluded from SHA256SUMS.all by name and verified only at write time.
- n8: the stale strings (see H5).

## 5. Items for HoO (lane-step helper review)
1. lib/lane-step.sh 6c7f27e2 :26-27: a 0.5 s poll, then a single `wait`.
   - Each poll forks `sleep`, `sed` and `cut` inside the lane group. They are transient. A lane-kill TERM hits them too; the sleep dies, the loop continues, and `trap ':'` runs. They live 0.5 s at most and the leader cannot exit while they live, so the post-exit group re-query is not polluted.
   - Stop latency is now up to 0.5 s after the child exits.
2. A same() false-negative while the child is alive (for example an unreadable /proc) degrades to the old `wait` on a live child. A TERM then records 143; the leader exits; the re-query sees the child, so HALT. This is safe: fail or HALT only.
3. The exit file is always 0..255 (:33). No -1 is possible. No path turns a lost status into 0. Your 10:05 condition holds: nothing lets the exit file drive a continue.
4. Disclosure 4: two direct `node` invocations outside a lane while building the tests (short, not long-running). For your rule-21 log.

## 6. Items for HoQA / HoQ
- H1: F2, decide on the findings tally or the RC-report rule.
- H2: the re-baseline is required. The bb28040f-built (or WebKit-skipped) baseline fails gate (i), and a WebKit preflight failure now blocks the RC. Confirm that is intended.
- H3: tsc, vitest, sync-check and the e4/zg sims run on harness node v24; CI uses 20. Builds are v20 via $BP, so no shipped or dist artifact is built on v24. Confirm v24 gate runs are acceptable, or route these gates via $BP too.
- H4: the swap. The launch lines (PROCEDURE :9, run-rc header :3/:37) point at harness-rc/. Swap atomically, re-run SUMS `-c` after the swap, and do not launch the baseline from the documented line before the swap (it would run bb28040f).
- H5: the stale `ruling: … (npm disclosure OPEN pending HoQ)` line (:171) will be written into every run's TOOLCHAIN-DISCLOSURE.txt, along with REBASELINE-CASES:33. Fix the text, or annotate the evidence as ACCEPTED (RC-12 R2).
- H6: RC-12 R1 interpretation (disclosure 7) still needs HoQ confirmation.
- H7: n4 residual env overrides in MODE=rc.
