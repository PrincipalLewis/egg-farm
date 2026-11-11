# Recheck: fix/rc1-qa-bugs-v4 @ 7d52952 (rebased on main a01faea)
Date: 2026-10-16, finished 22:51 CEST. QA ports 4311-4315 (never :4173), one engine at a time under `.browser-test.lock`. Nothing pushed, merged or tagged.
Evidence: `qa/m3-recheck/rc1-qa-bugs-v4-7d52952/` (summary.txt, logs, screenshots). Harness: `rc1-qa-bugs-v4-prep/run.sh`.

**Overall: PASS. No FAILs.** 1 Minor observation (B-4 computed-key gap). B-1 is NOT IN BUILD.

**Build ID:** `m3-rc1-pre+7d52952` was verified at runtime (guard release + qa) in Chromium, Firefox and WebKit. The extra step serves dist and dist-qa with id m3-rc1-pre+7d52952 in every engine. Note: the HUD shows no build tag at runtime, so the guard relies on the bundle id plus a check that the served worktree HEAD is 7d52952.

| Item | Chromium | Firefox | WebKit | Severity if failed |
|---|---|---|---|---|
| TUT-1 docked 1024x474 / 1280x720 / 1366x768: Sell step targets a real Sell button, sells, and advances step 2 to 3 (rc0 tut1docked) | PASS 3/3 | PASS 3/3 | PASS 3/3 | Major |
| TUT-1 card tap highlights its order row (solid outline, clears after ~1.2s, sheet stays closed) | PASS 3/3 | PASS 3/3 | PASS 3/3 | Major |
| M-1 "Sell 181.2B" label inside padding (pl/pr 10px, btn 88px, content 68px) | PASS (info) | **PASS (gate)**: text 64px ≤ 68px at 360/375/390/430/1280 | PASS (info): 65px ≤ 68px | Minor |
| M-2 rc0 (line-172 whitespace fix, see m2-rc0-line.txt) | 200/200 | 200/200 | 200/200 | Major |
| MK-24-1 layout 360/375/390/430/1280 (mixed + need) | ALL PASS | ALL PASS | ALL PASS | Major |
| MK-24-1 aria exact (e.g. "Sell 181.2B · +$1,000,224,000,000.00") + order card "4/17 eggs · $93.84" | PASS | PASS | PASS | Major |
| Globals: only `eggfarmExportTelemetry` | PASS | PASS | PASS | Major |
| check-release-build (npm run build) | PASS, exit 0 | (n/a) | (n/a) | Blocker |
| Unit tests | 513 passed + 2 skipped (515) | (n/a) | (n/a) | Blocker |
| B-4 release, ?perf=1, ?perf=1&debug=1&ios=1: window eggfarm* == [eggfarmExportTelemetry], no .perf-ov | PASS | PASS | PASS | Major |
| B-4 bundle scan: no eggfarmPerf/perf-ov/FrameSampler | PASS | PASS | PASS | Major |
| B-4 negative test (temp dist copy): pristine 0; aliased `w.eggfarmPerf` caught (1); aliased `s.eggfarmOrderList` caught (1); allowed eggfarmExportTelemetry 0 | PASS | (n/a) | (n/a) | Major |
| B-1 coop full (copy, ⚠ chip, aria "Coop full", ~54px badge) | NOT-IN-BUILD | NOT-IN-BUILD | NOT-IN-BUILD | n/a |
| B-1 baseline: coop badge live-rect, 8 samples, inside coop box + viewport, no overlap | PASS (360, 1280) | PASS, badge ~39.6px | PASS, badge ~39.7px | n/a |

## Observation (Minor)
B-4: `check-release-build` lets through a write with a computed key: `const h=globalThis; h["eggfarm"+"Dbg"]=1` exits 0. This is a gap in the static scan, not a regression. The runtime ?perf=1 globals check in 3 engines would still catch a real leaked global. Suggest Engineering either documents the gap or adds a runtime check to the gate.

## B-1
Not in this build. Baseline badge "Full!" is ~39.6-39.7px wide (AC expects ~54px after B-1) and sits at 360: l257 t250 r297 b270 in box 8..352. The copy file `art-ux/b1-coop-full-copy.md` is now marked **SIGNED OFF by Head of Art & UX (2026-10-16 19:44)**, v1.0 (file mtime 20:57). My earlier read showed it pending.

## 21:09 Firefox build-ID STOP
The 21:09 run (firefox; guard rc0 extra) stopped with guard release exit=1, then guard qa exit=3. In qa-guard.mjs, exit 3 means "port taken" on 4311 (it is not a build-ID mismatch). Exit 1 is an uncaught exception, after which the server on 4311 was evidently not torn down, so the qa guard found the port occupied. This happened under heavy box load (~150). The guard logs from that attempt were overwritten by the 21:11 rerun, so the exception text is lost. The rerun at 21:11 passed both guards (BUILD OK 7d52952 firefox), followed by rc0 200/200 and extra NO FAILS. Not a product issue.

## Not run
- B-1 ACs B1-B9 (not in build).
- Art & UX v1.6/v1.6.1 goal-label wrap (not in build).
- M-1 at Firefox desktop widths other than 1280; real devices (Playwright engines only).
- WebKit is Playwright WebKit on Linux, not Safari/iOS.
