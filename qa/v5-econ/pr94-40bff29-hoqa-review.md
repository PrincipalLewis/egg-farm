# HoQA review: PR #94 (B, bot-m5 port) @ 40bff29f3405d6d7a7de429bb80bd38833cb887b

- Base: rc/v5 3f582dbfe31a9d309e6b1d0e96a4f77711b333ec (merge-base = base; diff 3f582db..40bff29 = the PR diff, 13 files +876/-46, confirmed).
- Reviewer: Head of QA. Read-only; no comment, approval or merge. Written 2026-10-30 ~12:10 CET.
- Scratch clone: /workspace/scratch-hoqa-pr94 (head 40bff29, tracked tree clean). Runs went through lane `hoqa-pr94` (lane-run.sh); both runs exited on their own, so nothing needed to be killed.
- My outputs: /workspace/scratch-hoqa-pr94-out/ (rc.txt; tsc.log e3b0c442…; vitest-b.log d180490e…; vitest-slow.log 91d9a448…; recompute-37.txt 1be55155…; smoke-out-sha256-at-review.txt).
- Rulings applied: QA-D-1030-B94 (qa/decisions.md:650).

## Verdict: CONDITIONAL PASS

The code is clean: tests, scripts and docs only, with no src/, data/ or vendor-sim change. Every one of the 17 trace rows maps to a real asserting test, and they all pass at head. I recomputed the 37 parity comparisons: all byte-identical. I also confirmed F-PAR-1 independently. Merge still needs required fixes RF1–RF5 below. The QA-D-1030-B94 smoke parity has not been met yet: the current smoke-40bff29 is on the wrong SHA, compares against the 22eac98-era references and fails open.

## Required fixes

| # | Sev | Fix |
|---|---|---|
| RF1 | Major | **Re-seal the parity evidence.** `sha256sum -c SHA256SUMS` in artifacts/bot-m5b-parity is currently **122/123, FAILED: VERDICT.md**. VERDICT.md was edited at 12:01, after SHA256SUMS was written at 11:38; it is now 1caab987…, while the PR body cites aafdcb5e…. results/fpar1/ (fpar1.txt and the 3 `*.stripped` files) is not covered by SHA256SUMS. fpar1.txt holds only results, not the command. The command VERDICT names (`head -n -1 REF \| cmp - PORT`) strips ANY last line and does not check that the line is exactly `ALLDONE\n`. Fix: commit the strip/compare script to the evidence. It must assert that the last 8 bytes are exactly `ALLDONE\n`, preceded by `\n`, and that `ALLDONE` occurs exactly once. Record its command line, output and hashes in fpar1.txt, regenerate SHA256SUMS over everything (including fpar1/ and the final VERDICT.md), and update the PR body hashes. |
| RF2 | Major | **Head smoke parity per QA-D-1030-B94, failing closed.** The smoke orchestration is NOT in the PR. It lives in artifacts/bot-m5b-parity/smoke-40bff29/ (smoke.sh, ref.sh, compare-smoke.py). Defects: (a) smoke.sh/ref.sh have no `set -e`. Each job's rc is only logged (`log "END … rc=$?"`), `wait $a; wait $b` statuses are discarded, and both scripts exit 0 from the final `log`. (b) compare-smoke.py prints `NOT IDENTICAL: N` but never calls `sys.exit(bad)`, so it exits 0 on mismatch. Only a missing file fails, through an uncaught exception. (c) compare-smoke.py compares against `artifacts/m52-o1a` / `artifacts/m51-o1a`, i.e. the 22eac98/scratch references, not the `ref/` set that ref.sh regenerates at the same SHA. Its m51 ps-o1a rows compare CLOCK=1 references against a clock-unset port, so they cannot all be IDENTICAL by design. (d) It runs on 40bff29, not B's final head after the rc/v5 re-merge with #83/#93. Fix: run the smoke on the final head and compare the full files (including nw-base/nw-auto json and ps-o1a) against references regenerated with Econ's originals at that SHA. Every rc has to propagate, and the run must exit non-zero on any mismatch or missing file. Pin the sha256 of smoke.sh, ref.sh, the compare script and the four Econ originals (sha256, not only sha1-8) in the smoke SHA256SUMS. The port drivers it runs (scripts/bot-m5px.ts, scripts/bot-m5lx.ts) are committed in the PR. Any mismatch fails B. |
| RF3 | Minor (vacuity) | **Trace row 13 (D6) can pass vacuously.** tests/bot-m5.test.ts:192-202 asserts `per30m_all === tog/tAll*1800` and `<= 12`. Every seed has tog = 0 (VERDICT D6 tables: 0 on all 20 sidecars × 200 seeds). A toggle counter that never increments (tests/bot-m5.ts:143) would still pass, both here and in the 200-seed "D6 PASS". Add a positive control: a constructed mood sequence or an injected state that flips Asleep<->Unpaid, asserting tog/tog10 > 0 and the per-30-min value. |
| RF4 | Minor (vacuity) | **Trace row 3 can pass on an empty series.** tests/bot-m5.test.ts:94-95 uses `Math.min(...seen) >= 0` and `Math.max(...seen) <= 2`. With `seen = []`, these evaluate to Infinity / -Infinity and both pass. Add `expect(seen).toHaveLength(3000)`, and read the cap from `M5PX_RC2.on` instead of the literal 2. |
| RF5 | Minor (claims) | **Correct the parity wording in VERDICT and the PR body.** The claim "37/37 economy outputs byte-identical to the m52/m51 references" overstates what was shown. 35 comparisons are against references, covering 23 distinct reference files: m52 12 jsonl + pool2 + pool2b, and m51 9 json. The other 2 (orig-noclock vs P0) are an internal cross-check. Only P0 (6 m52 p0 jsonl, plus 2 orig-noclock) used the committed drivers on non-scratch src (22eac98). P1/P2 (29) used the uncommitted `-h` drivers on Econ scratch tick.ts 55cc4183. The m51 references were never reproduced by committed code (the scripts/README.md bot-m5 B line says so). Also clarify a contradiction. README/VERDICT call "the m52 +1 runs" clock-wage-on results, yet the head port without clock wage reproduces m52 `*.p1.jsonl` lines 1-20 byte for byte (see item 4). Either the +1 runs don't depend on clock wage or the statement is wrong. |

## 1) Boundary: no src/, data/ or sims change: CONFIRMED

- `git diff --quiet 3f582db 40bff29 -- src data` → no change. The 13 files are scripts/README.md, scripts/bot-m5-diverge.ts (new), scripts/bot-m5lx.ts (new), scripts/bot-m5px.ts (new), scripts/bot-m5x.ts, scripts/verify.ts, scripts/verify/cli.ts, scripts/verify/sim.ts, tests/bot-m5-trace.slow.test.ts, tests/bot-m5.test.ts, tests/bot-m5.ts, tests/fixtures/balance-883d1b0d.json (new) and tests/verify.test.ts.
- data/economy.csv is untouched. vendor/economy-sim/** (economy_sim.py, seller_variance_sim.py) is untouched.
- Note: scripts/verify/sim.ts (-3) is the VER-1 verify harness, not an economy sim. It deletes the empty `UNAVAILABLE` map (base sim.ts:32-33) and its guard in runVerify (base :77). scripts/verify.ts:63 drops the matching early exit. The map was `{}`, so this is behaviour-neutral. It is covered by verify.test.ts:170 (row 16) and :212 (`--profile m5x-casual runs`).
- Fixture provenance verified: tests/fixtures/balance-883d1b0d.json is byte-equal to `a923206:src/config/balance.json` (sha256 883d1b0d…). tests/fixtures/economy-b48be8a4.csv equals `0808fa6:data/economy.csv` (b48be8a4…).

## 2) The 17 AC trace rows

All 17 map to real assertions. None is skipped: no `skip`/`skipIf`/`todo`/`only` on any B row (the `skipIf`s at verify.test.ts:489/512/524/536/583 are pre-existing, non-B tests). All pass at head (see item 6).

| # | Row | file:line | Asserts | Vacuous / skip risk |
|---|---|---|---|---|
| 1 | REQ-d M5.2 parity | tests/bot-m5.test.ts:75-83 | sha256 of seeds 1-2 rows == 4 pinned m5px.ts hashes (on/off × p0/p1), fixture sha asserted (:71) | none (pins captured from orig-noclock, b48be8a4 CSV) |
| 2 | REQ-d M5.1 parity | :84-90 | sha256(stdout) == 541425db…; auto refills {0, 10.269} | none |
| 3 | M5.1 charge invariants | :91-98 | charges in [0,2]; refM==0, refA>0; series run == plain run | **RF4: empty `seen` passes** |
| 4 | Q4 + AC7 hash | :102-110 | mutating hook leaves pin 41324ef4; calls>1000; 5 kinds seen | none |
| 5 | Q4 M5.1/M5.2 | :111-119 | pressureSeed with/without a freezing hook byte-equal (on, off); refill seen; >100 distinct clones | weak "fresh clone" check (size>100), acceptable |
| 6 | VER-1h N-1 own keys | :128-135 | 4 prototype names × windowGate/pressureSeed/refillGate throw BotUsageError | none |
| 7 | VER-1h N-1/N-2 env | :136-142 | 10 bad envs throw; MAX_SEED exact bound | none |
| 8 | VER-1h N-1/N-2 CLI | :143-151 | the 3 CLIs exit 2 (incl. CLOCK=1 refusal) | "before simulating" not asserted (N2) |
| 9 | O-3 M5.0 model | :155-161 | 6 flags throw /double-count/; 3 non-throw controls | none |
| 10 | O-3 rc2 | :162-168 | rc2Refill/autoRefill throw with rc2; non-rc2 and clockWage controls | none |
| 11 | L35 FDT | :176-183 | null on identical; field/second/tick mapping; line-count case | none |
| 12 | L35 FDT CLI | :184-191 | exit 0 / 1 (+ JSON) / 2 | none |
| 13 | L35 D6 | :192-202 | formula and <=12 on casual seeds 1-2 | **RF3: tog is 0, so it passes vacuously** |
| 14 | VER-1h N-5 0.25 h | tests/verify.test.ts:70-78 | fixture sha; trace 751ebe16; events 1801; checkpoint eggs | none (pre-#92 fixture by design, N4) |
| 15 | VER-1h N-2/N-3 | :79-86 | seed bound per profile; repeated --profile throws | none |
| 16 | VER-1h N-4 | :170-174 | `verify` exits 2 + stderr on missing --hours / unknown flag | "before building" not asserted (N2) |
| 17 | VER-1h N-5 24 h | tests/bot-m5-trace.slow.test.ts:17-29 | fixture sha; trace 07139bdd; events 391661; checkpoints == independent onEvents sums | none; slow suite runs in CI (ci.yml:37-38 `npm run test:slow`) |

## 3) Parity evidence (artifacts/bot-m5b-parity)

- References are intact. artifacts/m51-o1a: `MANIFEST.sha256 -c` gives 13/13 OK (the remaining lines are comments; manifest a840b84d…). artifacts/m52-o1a: 16/16 OK (manifest 94e19f2d…).
- **I recomputed the 37 economy comparisons with sha256 (my own script, not compare.py): 37/37 IDENTICAL.** Breakdown: P1 vs m52 14/14, P1 vs m51 9/9 json, P0 vs m52 6/6, orig-noclock vs P0 2/2, P2 vs m52 2/2, P2 vs m51 4/4 json. Per-file hashes are in /workspace/scratch-hoqa-pr94-out/recompute-37.txt. On the scope of this claim, see RF5.
- `sha256sum -c SHA256SUMS` (42db771d…, 123 entries): **122 OK, 1 FAILED (VERDICT.md)**, and results/fpar1/ is uncovered. See RF1.
- **F-PAR-1 is confirmed.** In each case the reference's last 8 bytes are exactly `ALLDONE\n`, preceded by `\n`, and `ALLDONE` appears once (line 4). After removing exactly those 8 bytes, `cmp` against the port shows 0 differing bytes. The port logs contain no ALLDONE.
  - p1/nw-auto.log: reference 0aa48dc3… (5484 B), stripped f28d63bf… (5476 B) = port f28d63bf….
  - p1/g1.log: reference c42caebd… (6490 B), stripped d8716582… (6482 B) = port d8716582….
  - p2/nw-auto.log: same as p1/nw-auto.log.
  - Control: nw-base.log has no trailer and is raw-identical.
  - HoQA concurs with HoE's F-PAR-1 PASS-with-note, provided RF1 puts the exact-trailer check in the evidence.

## 4) src 22eac98 → 3f582db, and whether the references hold at head

22eac98 is the rc/v5 fork point on main (#76, 2026-10-28), so the parity src predates ALL v5 src work. That is 10 commits: #81 F2, #77 F1a, #79 F1b, #80 F1c, #82 F3, #87 streak #2, #91, #92, plus the test-only #78/#88/#90. In total, 25 files under src/, data/ and scripts/sync-economy.ts change, +727/-75. #92 itself changes only data/economy.csv and src/config/balance.json.

I walked the static import closure of scripts/bot-m5px.ts and scripts/bot-m5lx.ts. **21 changed files are on the drivers' path.** Line ranges are at 3f582db (from `git diff -U0 22eac98 3f582db`):

- scripts/sync-economy.ts: 9, 152-174, 176, 186, 192 (F3: keepFlags/keepZeroGain, M5_MAPPED_COLS into m4.tc, `flags`/`zeroGain` kept from prev balance.json)
- src/config/balance.json: 144-146 (#92 farm_cost L27-29: 160000/175000/190000), 165-183 (F3 m4.flags all 0 + zeroGain), 386-442 (#92 and F3 M5 tc keys, streak_cap 0.4 → 0.28)
- src/config/balance.ts 2-3, 44-46; src/config/flags.ts 1-19; src/config/formulas.ts 5, 47-51, 144-153; src/config/m5-rules.ts 1-57 (new)
- src/econ/income.ts 13, 42, 45-46 (marketHandStalled reads isPaused())
- src/sim/actions.ts 7-8, 19-20, 24-25, 29-30, 58-61, 63-70 (sellTo: playerSaleCtx/streak extra; collect: creditTap)
- src/sim/payout.ts 7-12, 14-16, 19-21, 23 (saleMultipliers += F1c timed-effect factors)
- src/sim/tick.ts 6-7, 12-14, 28-29, 56-57, 62, 93, 100-101, 104-105 (anyM5FlagOn → fx/stepTimers; prodEggsPerSec(…, fx))
- src/sim/tracks.ts 12, 14-19 (prodEggsPerSec × layFactor); src/sim/workers.ts 9-11 (paused/callLockoutS fields)
- src/sim/events.ts 10, 20-40; src/sim/state.ts 2, 4-5, 9-10, 33-34
- new: src/sim/clock.ts 1-33, effects.ts 1-41, m5-state.ts 1-68, pause.ts 1-13, rng.ts 1-33, streak.ts 1-68, timers.ts 1-28

Changed but **not** on the drivers' path: src/game.ts, src/save/m5-fields.ts, src/save/save.ts. data/economy.csv is not on the path either, because the drivers take `CSV=`. Head's data/economy.csv is a8c4e268, the same as the o1a parity CSV.

Assessment:
- **Inputs:** the drivers rebuild balance from the CSV (a8c4e268 in both runs). From live balance.json they keep only `m4.enabled`, the flags and zeroGain. On rc/v5 all flags are 0. So #92 does not change the drivers' input: its balance.json farm_cost L27-29 values are derived from the same a8c4e268 CSV.
- **Sim:** by design, every economy-path change on the bot's tick path is gated on an m4.flags flag (anyM5FlagOn, effects/streak with flags 0) or is an optional-arg default. That is an argument from the diff, not a proof. Empirically, the Architect's in-progress smoke at 40bff29 (src = 3f582db) has written all 12 `out/pr.*.jsonl` (seeds 1-20; hashes in smoke-out-sha256-at-review.txt). I compared each against lines 1-20 of the corresponding m52-o1a reference: **12/12 byte-identical (p0 and p1)**.
- **m52-o1a jsonl (12):** these still hold at head for seeds 1-20, as just shown. Seeds 21-200 are unverified at head.
- **m51-o1a (9 json + logs), and pool2/pool2b** (built from the P1 scratch outputs): **not valid references at head.** They were produced with CLOCK=1 on Econ scratch tick.ts 55cc4183 (`__clockWage`), which is on neither 22eac98 nor 3f582db. At head, bot-m5lx.ts refuses CLOCK=1 (scripts/bot-m5lx.ts:10). The VERDICT P0 control shows 6/10 m51 files differ without clock wage.
- Hence QA-D-1030-B94 stands: references must be regenerated at the final SHA with Econ's originals (ref.sh does this at 40bff29). The 22eac98-era m51/m52 sets are corroboration only.

## 5) Smoke drivers (seeds 1-20)

- The port-side drivers are committed in the PR: scripts/bot-m5px.ts (12 lines), scripts/bot-m5lx.ts (16 lines) and scripts/bot-m5-diverge.ts. bot-m5-diverge.ts exits 0 on identical, 1 on a difference and 2 on usage or a missing file. bot-m5px.ts/bot-m5lx.ts exit 2 on BotUsageError; other errors are rethrown, so node exits 1. They use no `|| true`.
- The orchestration and comparison are **not committed**. They are in artifacts/bot-m5b-parity/smoke-40bff29/: smoke.sh, ref.sh, compare-smoke.py. The reference side uses Econ's original m5p/m5px/m5l/m5lx copied untracked into /workspace/wt-v5-botm5b-ref (ref.log shows porcelain `?? m5*.ts`, sha1 9eed2879/c20ad937/e930c8c7/7123fc25).
- **These do not fail closed.** See RF2 (a)–(d). I did not touch the running smoke.

## 6) Tests at head (node v20.19.2, lane hoqa-pr94, nice 10, vitest maxWorkers=1 under the eng lock)

- `tsc --noEmit`: rc 0.
- `vitest run tests/bot-m5.test.ts tests/verify.test.ts`: **79/79 passed**, rc 0, 103.8 s.
- `vitest run --config vitest.slow.config.ts tests/bot-m5-trace.slow.test.ts`: **1/1 passed** (24 h trace 07139bdd), rc 0.
- These match the PR body's gates (79/79, 1/1). I did not rerun the full suite, the build or check-globals.

## Notes (non-blocking)

- N1 (Minor): the B parity pins build from the fixture CSV but take the live src/config/balance.json as `prev` (tests/bot-m5.test.ts:18-19), so a future flag flip in balance.json would move or throw them. This is disclosed in the PR and acceptable for v5.
- N2 (Minor): rows 8 and 16 assert exit status only. Their titles' claims, "before simulating" and "before building anything", are not asserted.
- N3: rows 14 and 17 pin a pre-#92 balance (883d1b0d). They test the verify trace machinery, not the v5 economy; this is intended under D-HOE-20261030-05.
- N4: the PR is a Draft, so hosted CI (rc0 on 3 engines, gate, release-globals) has not run. It must be green on the final head.
- N5: B must re-merge rc/v5 after #83 and #93. Per QA-D-1030-B94, RF2 runs on that final head, not on 40bff29.
