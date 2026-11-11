# AC7 / HoP 23:15 (+23:30) threshold update (QA)

Date: 2026-10-16 ~23:35 CEST  
Sources: `product/ac7-qa-threshold-changes.md` (incl. HoP 23:30 line)  
Build / tables: live `product/economy.f1-m4cols.csv` + `economy.f1.csv`; game SHA `ce7d59a` for browser suite when flock allows  
Evidence: `qa/m3-recheck/ac7-threshold-update/`  
**TR-5 baseline:** [`tr5-baseline-m4cols.md`](./tr5-baseline-m4cols.md) — **PASS** on HoP-approved CSV **`86f0e80e3593…`** (bot `d8b1f51ed26d…`); supersedes `70009738d2d1…`; only `manage_prompt_threshold` 0.4→0.5; pacing numbers unchanged.

## Files changed (qa/ only)

### Edited (backed up `*.bak-ac7-20261016`)
| file | change |
|---|---|
| `qa/m4-ac-testability.md` | TR-5 text → ≥29/30 P95, gap worst≤4; HoP runner list |
| `qa/m3-test-plan.md:107,146` | P95 standard; point at QA `ac7-tr5-gate.py` |

### Added
| file | role |
|---|---|
| `qa/m3-scripts/ac7-tr5-gate.py` | QA TR-5: P95 bands, gap guards, L18–25 ≤8 min abs, L30+ hard ratio (prev≥1 min), L18–29 warn-only + over-2.25 tables |
| `qa/m3-scripts/ac7-l18-25-gate.ts` | L@30 P95 + L18–25 step abs (sibling; `f1-pacing.ts` not edited) |
| `qa/m3-scripts/ac7-active-idle-gate.py` | 2× active/idle P95≤2.0 / F22–24 ≤2.15 |
| `qa/m3-scripts/ac7-fh3-gate.sh` | AC-FH3 casual first_hire ≥30 seeds |

### Not edited
`pacing.test.ts`, `f1-pacing.ts`, `product/farm/m4/tr5_run.py`, anything outside `qa/`.

## Economy answers (2026-10-16 ~23:35) — closed

1. **Abs ≤8 min** covers **L18–25** only. L26–29 step ratios are warn-only; hard ratio from **L30**. Gap P95≤3 / worst≤4 at every level. **`ac7-tr5-gate.py` matches** (confirmed; labels clarified; no logic change required).
2. **Digests (current):** `tr5_run.py` = **`d8b1f51ed26d…`**; CSV = **`86f0e80e3593…`** (HoP-approved 23:58 per `product/balance-changelog.md` l.64; supersedes `70009738d2d1…`). Diff vs `scratch/csv-bak-2359/`: only `manage_prompt_threshold` 0.4→0.5; no pacing columns. **MK-33a pair:** release checks must confirm **MK-33a present + share 0.20** or **MK-33a absent + share 0.15**. Do not verify features against share=0.20 unless MK-33a is in the build. `nudge_coopfull_*` still unapproved for feature verification.

3. **WARN floor ≥1 min** at every level range. QA gate WARN line uses ≥1 min; 30 s kept as `[HIST]` only. (PM `tr5_run.py` still on 30 s WARN — PM-owned.)


## Before / after flips (TR-5 hard bars)

| gate | measured (m4cols, N=30) | OLD (80%+median) | NEW (HoP 23:30) | flip |
|---|---|---|---|---|
| F18 band | 20.75, 30/30 | PASS | PASS | none |
| L@30 | L21, 30/30 | PASS | PASS | none |
| gap | P95/worst 1.50 | PASS | PASS | none |
| L18–25 abs level time | worst 3.50 | N/A | PASS | new PASS |
| L30+ step ratio | n/a | N/A | PASS (n/a) | new PASS |
| L18–29 step ratio | P95 1.40x (**WARN ≥1 min**); 6.50x is HIST 30 s only | N/A | **WARN-only** (not FAIL) | warn only |
| RESULT | — | PASS | **PASS** | none |

No PASS↔FAIL flips on hard TR-5 bars for this table. The 6.50x ratio is recorded as **WARN**, not FAIL, per HoP 23:30.

## Step-ratio >2.25x table (verbatim; legacy 30 s floor — see also baseline doc)

Under HoP **≥1 min** floor: **no rows**. Under **≥30 s** (PM WARN / prior Economy note):

| seed | level pair | t(prev level) min | t(this level) min | ratio |
|---|---|---|---|---|
| 0 | F17->F18 | 0.75 | 3.25 | 4.33x |
| 1 | F17->F18 | 0.75 | 3.25 | 4.33x |
| 2 | F17->F18 | 0.50 | 3.00 | 6.00x |
| 3 | F17->F18 | 0.50 | 3.25 | 6.50x |
| 4 | F17->F18 | 0.50 | 3.25 | 6.50x |
| 5 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 6 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 7 | F17->F18 | 0.75 | 3.25 | 4.33x |
| 8 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 9 | F17->F18 | 0.50 | 3.25 | 6.50x |
| 10 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 11 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 12 | F17->F18 | 0.50 | 3.25 | 6.50x |
| 13 | F17->F18 | 0.50 | 3.25 | 6.50x |
| 14 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 15 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 16 | F17->F18 | 0.50 | 3.25 | 6.50x |
| 17 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 18 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 19 | F17->F18 | 0.50 | 3.25 | 6.50x |
| 20 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 21 | F17->F18 | 0.75 | 3.25 | 4.33x |
| 22 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 23 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 24 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 25 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 26 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 27 | F17->F18 | 0.75 | 3.25 | 4.33x |
| 28 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 29 | F17->F18 | 0.75 | 3.00 | 4.00x |

P95 (legacy 30 s) = **6.50x**, worst = **6.50x** — informational WARN for Economy, **not FAIL**.

## Other gates (status)

| gate | status |
|---|---|
| TR-5 QA + PM on m4cols / f1 | **done** (CPU, no flock) — PASS |
| active/idle QA gate | see log below |
| AC-FH3 | see log below |
| f1-pacing.ts / l18-25 / run-combined | still queued on browser flock (batch.log); not required for TR-5 baseline |

## Evidence folder
`qa/m3-recheck/ac7-threshold-update/`

## Other CPU gate results (no flock)

### Active/idle
```
QA ac7-active-idle-gate | CSV /workspace/egg-farm-studio/product/economy.f1.csv | 30 seeds | need index 29 | ALL stack focus=0.10 | player=optimal vs idle
| F | P95 limit | mean | P95 | worst | verdict |
|---|---|---|---|---|---|
| F10 | 2.00 | 1.431 | 1.528 | 1.586 | PASS |
| F18 | 2.00 | 1.480 | 1.590 | 1.637 | PASS |
| F22 | 2.15 | 1.516 | 1.633 | 1.672 | PASS |
| F23 | 2.15 | 1.515 | 1.633 | 1.670 | PASS |
| F24 | 2.15 | 1.521 | 1.641 | 1.675 | PASS |
RESULT: PASS (5/5 levels)
```

### AC-FH3
```
# First-hire nudge, casual model, economy.m4-candidate.csv, 30 seeds

| case | F3 unlock -> first hire: median / P95 / worst (min) | worker by L10 | L@30:00 median [min-max] | in band L20-24 | F18 median (min) | AC-FH3 (med <=3, P95 <=8, >=90% by L10) |
|---|---|---|---|---|---|---|
| nudge | 0.67 / 1.00 / 1.00 | 100% | L21 [19-21] | 29/30 | 25.0 | PASS |
| no_nudge | 8.33 / 38.67 / 42.00 | 53% | L20.5 [18-21] | 24/30 | 25.7 | FAIL |
| instant | 0.00 / 0.33 / 0.33 | 100% | L21 [19-21] | 29/30 | 24.8 | PASS |
| never hires | — | 0% | L17 [16-17] | 0/30 (no-worker band L18-22: 0/30) | 34.7 | FAIL |
RESULT: PASS (nudge AC-FH3)
```

## Workers / MK-33a + manage_prompt (CSV `86f0e80e…`)

HoP approved revision `86f0e80e3593` at 23:58 (`balance-changelog.md` l.64). Diff from `70009738…`: only `manage_prompt_threshold` 0.4→**0.5** (aligns yawn / Manage / refill at 50%). No pacing column changes. TR-5 PASS identical to `70009738` baseline.

- **`w2_asleep_collect_share=0.20` is valid only if MK-33a is in the build under test**; if MK-33a slips, share reverts to **0.15**.
- **Release checks must confirm which pair the build carries:** either **MK-33a present with 0.20**, or **MK-33a absent with 0.15**.
- `leave_attended_window_s=30` unchanged since 70009738 (MK-33a pair).
- `nudge_coopfull_*` — still do not verify until HoP explicitly ties them to a feature check.

