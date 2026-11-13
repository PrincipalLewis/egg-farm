### 60-min window, streak cap 0.40, full stack (200 seeds); ratio = per-seed active / mean managed-idle at same F
| player | F0-2 mean / P95 / max | F3-7 mean / P95 / max | F8-14 mean / P95 / max | F15-19 mean / P95 / max | F20-30 mean / P95 / max | overall mean / P95 / max | P95 ≤ 2.0 |
|---|---|---|---|---|---|---|---|
| optimal | n/a (idle = 0, no workers) | n/a (idle = 0, no workers) | 1.72 / 1.78 / 1.80 | 1.71 / 1.76 / 1.79 | 1.71 / 1.73 / 1.75 | 1.71 / 1.76 / 1.80 | PASS |
| seller15 | n/a (idle = 0, no workers) | n/a (idle = 0, no workers) | 1.71 / 1.76 / 1.79 | 1.71 / 1.75 / 1.77 | 1.71 / 1.73 / 1.75 | 1.71 / 1.75 / 1.79 | PASS |
| casual05 | n/a (idle = 0, no workers) | n/a (idle = 0, no workers) | 1.57 / 1.62 / 1.70 | 1.57 / 1.61 / 1.68 | 1.57 / 1.61 / 1.66 | 1.57 / 1.62 / 1.70 | PASS |
| visit20 | n/a (idle = 0, no workers) | n/a (idle = 0, no workers) | 1.23 / 1.26 / 1.28 | 1.23 / 1.25 / 1.27 | 1.24 / 1.26 / 1.27 | 1.23 / 1.26 / 1.28 | PASS |
| visit45 | n/a (idle = 0, no workers) | n/a (idle = 0, no workers) | 1.16 / 1.20 / 1.24 | 1.16 / 1.20 / 1.23 | 1.17 / 1.21 / 1.24 | 1.16 / 1.20 / 1.24 | PASS |
| visit90 | n/a (idle = 0, no workers) | n/a (idle = 0, no workers) | 1.10 / 1.13 / 1.21 | 1.10 / 1.13 / 1.20 | 1.11 / 1.14 / 1.22 | 1.10 / 1.13 / 1.22 | PASS |

### 10-min window (approved rule; reproduces m4-active-checks ALL row), 200 seeds: mean [P95] [worst]
| cap | player | F10 | F18 | F24 |
|---|---|---|---|---|
| 0.3 | optimal | 1.53 [1.63] [1.70] | 1.62 [1.71] [1.80] | 1.55 [1.62] [1.66] |
| 0.3 | casual | 1.41 [1.52] [1.61] | 1.43 [1.55] [1.65] | 1.42 [1.52] [1.66] |
| 0.4 | optimal | 1.64 [1.73] [1.82] | 1.72 [1.82] [1.93] | 1.65 [1.72] [1.77] |
| 0.4 | casual | 1.50 [1.62] [1.69] | 1.52 [1.65] [1.73] | 1.51 [1.61] [1.76] |