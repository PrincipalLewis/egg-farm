# Measurement results — HoQ 14:29 grant (ONE run), 2026-10-30

Label: RECORD ONLY - NOT EVIDENCE. UI1 cell = PROXY (FX-L17 $3,000 farm screen on rc/v5 65a7443; BBv2 not built).

Evidence: `ev-20261030-144325/` (raw logs meas-*.log, run.log, *.json, 18 screenshots); SHA256SUMS in that dir. Invalid earlier starts kept for audit: ev-20261030-1432 (build-id m4.1+unknown), ev-20261030-143423 (title screen not dismissed).

## Run
- Chromium: lock .browser-test-2.lock (1-min load <12 checked), port 5251, rc 0, 349 s incl. lock wait.
- WebKit: lock .browser-test.lock (load 5.91), port 5252, rc 0, 433 s, 14:49:14–14:56:27 CET.
- Firefox: SKIPPED — 319 s left in the 29-min cap < 480 s rule.
- One engine at a time; each browser command under `flock -w 600 … timeout 600`. .browser-test-3.lock not used.

- chromium: build_id `m4.1+65a7443` (asserts +65a7443); bid checks 11/11 ok; qaPicker_present on dist-qa = False
- webkit: build_id `m4.1+65a7443` (asserts +65a7443); bid checks 11/11 ok; qaPicker_present on dist-qa = False

## Launch / close (ms, 3 reps)
| engine | launch | close |
|---|---|---|
| chromium | 208.3 / 163.3 / 152 | 48.4 / 37.9 / 34.5 |
| webkit | 96.6 / 58.6 / 61.3 | 8.7 / 4.8 / 5.4 |

## Per-cell medians (ms, 3 reps) and WK/Cr ratio, launch excluded
| size | metric | Chromium | WebKit | WK/Cr |
|---|---|---|---|---|
| 360x640 | load_ms | 591.1 | 730.7 | 1.24 |
| 360x640 | shot_ms | 34.5 | 24.1 | 0.7 |
| 360x640 | check_ms | 1.4 | 1.8 | 1.29 |
| 360x640 | axe_ms | 77.4 | 107 | 1.38 |
| 390x844 | load_ms | 567.8 | 695.5 | 1.22 |
| 390x844 | shot_ms | 35.5 | 27.2 | 0.77 |
| 390x844 | check_ms | 1.5 | 1.9 | 1.27 |
| 390x844 | axe_ms | 74.4 | 110.3 | 1.48 |
| 1280x800 | load_ms | 617.1 | 737.7 | 1.2 |
| 1280x800 | shot_ms | 59.6 | 56.3 | 0.94 |
| 1280x800 | check_ms | 1.4 | 1.6 | 1.14 |
| 1280x800 | axe_ms | 90.7 | 123.4 | 1.36 |

## UI1 PROXY per cell (median of 9) and axe per scan
| engine | load+shot+check | axe/scan | axe inject | total cell |
|---|---|---|---|---|
| chromium | 652.8 | 77.4 | 95.3 | 730.2 |
| webkit | 765.5 | 112.1 | 67.7 | 877.6 |

WK/Cr per cell (load+shot+check+axe): 1.2×. Check outputs: overflow 0, under44 0, stars 0, axe violations 0 (recorded, not graded) in all 18 cells.

## runFor(240000) wall time (ms)
| engine | single | 48×runFor(5000)+qaPicker read+runFor(2000) | chunk min/mean/max |
|---|---|---|---|
| chromium | 80605.1 | 80583.5 | 1592.8/1664/1792 |
| webkit | 148344.2 | 146258.9 | 2926.7/3021.6/3237.4 |

runFor WK/Cr: 1.84× single, 1.81× chunked. Coins after single run: Cr 5,413,481 / WK 5,413,481.

## Stops (ops/tools/lane-kill.sh uiqa-meas <pid>)
- STOP-1 start 1: `TERM 3999102 (group)` rc 0
- STOP-2 start 2: `TERM 4002957 (group)` rc 0
- STOP-3 start 3: `TERM 4017447 (group)` rc 0
- STOP-4 start 4 (this run): `GONE 4040504` rc 0 (it had already exited after `end 1421s`)
- Survivor checks (/proc read only): none after any stop. No plain kill, no PID lists, other lanes' lock holders not touched.

## Lane-B assumption impact (NOTE ONLY; lane-B-minutes-20261030.md not changed)
- A1 (runFor 60 s/run) measured: Chromium 80.6 s wall per 240 s sim (≈0.34 s wall per sim s); WebKit 148.3 s (≈0.62).
- A2 (axe 1.5 s/scan) measured: ≈0.08 s Cr / ≈0.11 s WK (+≈0.07 s inject) — A2 is conservative.
- WK factor measured ≈1.84× on runFor, lower per cell, vs the 2.3× assumed. That question is with HoQ and was not acted on.
