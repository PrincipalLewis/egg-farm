# Final RC pass — Saves & Release QA (lane 1) CHECKLIST
Source: qa/rc-pass-plan.md (HoQA 12:23) "Saves & Release QA (lane 1)" + HoQA carry-overs. Runner: `bash qa/m3-scripts/rc-pass.sh <full RC sha>`.
**Do not start until HoE sends the RC SHA** (expected cut from main dd52bfd). Freeze rule: PASS unless Blocker/Critical/Major.
Evidence: qa/m3-recheck/rc-pass-<sha7>-evidence/ (summary.txt = timestamped log). Worktree /tmp/qa-rc/<sha7>. Ports 5961-5964 (never 4173).
Browser steps: one engine at a time, each step under `flock .browser-test.lock timeout 600`. Unit/gates: no lock, vitest <= 2 workers.

## 0. Preflight (step `pre`)
- [ ] Full 40-char SHA from HoE; `git branch -r --contains` shows it pushed; origin/main == RC SHA (script stops otherwise).
- [ ] npm ci; build (dist), build:qa (dist-qa), build:html (dist-html) incl. check-release-build; static build-id = `m3-rc1-pre+<sha7>`, no +dirty; tracked tree clean.
- [ ] CSV diff vs dd52bfd (csv-changed.txt). **If any CSV changed: full L30+ gate (HoP rule)** — automatic; set L30_CSV= if the RC ships a different L30+ pack. Note: #37 (9980ec22, data-only column) changes data/*.csv — if #37 is in the RC, L30+ gate runs automatically (already PASS on b59c4e0d+column at 12:3x).

## 1. Unit + gates (step `unit`)
- [ ] sync-economy --check, tsc.
- [ ] vitest full (2 workers). dd52bfd baseline 851/851 (852 with #37).
- [ ] test:slow: vendor pins + **AC7 on the TS variance bot** (seller-variance.slow 100 seeds vs Python; ac7-worst-seed hard asserts: L18-25 slowest P95 <=390 s / worst <=480 s; workers t20 P95 warn 1740). Baseline 14/14, P95 361.0 / worst 378.3, t20 P95 1670.
- [ ] **Payout preview == credited, M4 on and off** (unit: qa-rc1-bugs, payout-parity, sellall-label-grader, m4a-tracks*, hidden*). Baseline 142/142.

## 2. AC7 (step `ac7`)
- [ ] TS bot WITH workers, 100 seeds (ac7-l18-25-gate-workers.ts, official per HoP 00:35): baseline PASS L@30 21/21, step 4.50.
- [ ] Python cross-check, variance sim, 100 seeds: **no-workers time-to-L20 P95 vs 1740 s line** (TS doesn't compute it). Baseline 1737 s (3 s margin). >1740 = WARN to HoQA/HoP (recorded near-edge risk, not auto-FAIL).
- [ ] INFO only: pre-F1 no-workers gate (ac7-l18-25-gate.ts) — FAILs on dd52bfd too (step 10.0); ignore unless it changes.

## 3. L30+ gate (step `l30`) — only if CSV changed or L30_CSV set
- [ ] l30plus-gate.py --seeds 100, pins csv/late_curve ab928dc96d1c, OVERALL PASS (EX-1 L30-40 P95 2.00 / worst 2.20 <= 2.25 on b59c4e0d and C2).
- [ ] If C2 is in the RC (only if Vadim cleared Features by 12:30): also L29/L30 save load+price check (l30fix-C2-1536be49/qa-l30fix-c2-saves.test.ts). Otherwise N/A.

## 4. Saves (step `saves`)
- [ ] Save/load, **migration from old saves** (v5/v6/v7 + m4a migrate), **offline earnings**, hidden-save paths, quota retry, mirror, saveSeq unit subset. Baseline 219/219.
- [ ] **Clock change**: rc0 BUG-1/5 rows (savedAt 0 / negative / null / +1 h future → 0 offline, re-stamped) + rc0 newer-save rows; covered in each engine's rc0.
- [ ] Build dist-qa-m4 (m4.enabled=1, +dirty by design), balance.json restored, tree clean.

## 5. Browser, per engine (step `browser`, ENGINES order chromium firefox webkit)
Per engine: runtime build-id (served dist) == `m3-rc1-pre+<sha7>` → release globals → rc0 smoke → dist-html file:// open.
- [ ] Chromium: build-id, globals, rc0, html-open.
- [ ] **Firefox: build-id, globals, rc0 (#39 code carry-over), html-open, hidden-tab ACs flag-off 32/32 + M4-on (invariants; 12 known flag-off-count rows FAIL by design = 20/32).**
- [ ] **WebKit: runtime globals — no eggfarmPerf / no debug globals (only eggfarmExportTelemetry)**, build-id, rc0, html-open.
- [ ] HTML artifact loads (file://) in all 3, build label == RC SHA (#app data-build-id + meta), 0 console errors, no eggfarm/eggfarmPerf.
- WebKit rc0 took 563 s on 6dc2f5a (cap 600). If exit 124: rerun chunked `RC0_CHUNKS`-style with `ONLY=<subset>` (rc0-browser.mjs supports ONLY) under separate flock calls.

## Expected timing (measured on dd52bfd, 12:40-12:56 CEST, box shared)
| Step | Time |
|---|---|
| pre (npm ci + 3 builds) | ~0.5 min (warm cache; allow 2 min) |
| unit (sync+tsc+vitest 145 s + slow 131 s + payout 5 s) | ~5 min |
| ac7 (workers 192 s + Python 37 s + INFO 106 s) | ~5.5 min |
| l30 | ~0.5 min |
| saves | ~0.2 min |
| Firefox browser (measured, under lock) | 7.3 min (rc0 249/249 277 s; hidden 2x66 s) |
| Chromium browser (est.) | 5-22 min (rc0 was 1280 s under load at 09:54, ~5 min idle) |
| WebKit browser (est.) | 10-12 min (rc0 563 s on 6dc2f5a) |
| **Total** | **~35 min idle box, ~55 min under load**, plus lock waits for lane 2 |

## Pre-verification on dd52bfd (done, 12:40-12:56 CEST)
- DRY run all non-browser steps: all exit 0 (unit 851/851, slow 14/14, payout 142/142 after subset fix, saves 219/219, Python t20 1737 s, L30+ b59c4e0d PASS). Evidence rc-pass-dd52bfd-evidence/.
- Real Firefox lane under lock: build-id OK, globals PASS, rc0 249/249, html-open PASS, hidden 32/32 flag-off, M4-on 20/32 (same 12 rows as #39 WebKit/Chromium M4-on). So the #39 Firefox carry-over already PASSes on dd52bfd; it reruns on the RC SHA.
- Not pre-verified: Chromium and WebKit browser lanes (left the lock free for lane 2; same scripts already used on #31/#39).

## Out of my lane (plan lane 2 / Art & UX): PM4-P3 overlaps, sprite diff, core-loop UI, screenshot set + manifest.json.
## Sign-off: all ACs above PASS, no open Blocker/Critical/Major → file qa/m3-recheck/rc-pass-<sha7>.md (verdict, severity, repro, evidence, not-run list).
