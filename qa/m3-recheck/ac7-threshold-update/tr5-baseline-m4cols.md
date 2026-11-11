# TR-5 baseline — economy.f1-m4cols.csv (HoP-approved 23:58)

Date: 2026-10-16 ~23:59 CEST  
Source: `product/balance-changelog.md` l.64 (HoP APPROVED yawn_at_pct=50 and manage_prompt_threshold=0.5 at 23:58)  
Seeds: 30 · scenario: standard · CPU only (no flock) · `timeout 600`  
Supersedes baseline against CSV `70009738d2d1…`.

## Digests (on-box, verified)

| artifact | sha256 | prefix |
|---|---|---|
| `product/farm/m4/tr5_run.py` | `d8b1f51ed26d24abbf4dca50e6d8d5468977a3d5fb73fb7c28b2d27911fadfa7` | **`d8b1f51ed26d…`** |
| `product/economy.f1-m4cols.csv` | `86f0e80e359398e3fd3061c268794054558029270cc3944ac522ef7ddbea0550` | **`86f0e80e3593…`** |

Prior CSV digests (same pacing; superseded): `70009738d2d1…` (pre-manage_prompt 0.5), `053b2ba5ad71…`, `583c0ba47fb2…`. `432089eccd99…` was an older **tr5_run.py** hash, not a CSV.

### Diff vs `scratch/csv-bak-2359/` (= `70009738d2d1…`)

Only one change; **no pacing columns** touched (column-level DictReader check):

1. `manage_prompt_threshold`: **0.4 → 0.5** (all 31 rows)

Confirmed against HoP 23:58: matches refill_threshold_pct=50 / yawn_at_pct=50 so yawn, Manage prompt and refill align.

### Workers / MK-33a verification hold

- `w2_asleep_collect_share=0.20` is **valid only if MK-33a is in the build under test**. If MK-33a slips, the share reverts to **0.15**.
- **Release checks must confirm which pair the build carries:** either **MK-33a present with 0.20**, or **MK-33a absent with 0.15**.
- `leave_attended_window_s=30` remains part of the MK-33a pair (unchanged since 70009738).
- TR-5 does not read manage_prompt_threshold or the Workers nudge columns; PASS below is unaffected by the 0.4→0.5 change.

## Verdict: **PASS** (identical to 70009738 pacing numbers — no flags)

QA gate `ac7-tr5-gate.py` on `86f0e80e…` with `tr5_run.py` / m4_sim at `d8b1f51ed26d…`:

| check | 70009738 (prior) | 86f0e80e (this) | delta |
|---|---|---|---|
| F18 median / in-band | 20.75 / 30/30 | **20.75 / 30/30** | none |
| L@30 | L21 / 30/30 | **L21 / 30/30** | none |
| gap P95 / worst | 1.50 / 1.50 | **1.50 / 1.50** | none |
| L18–29 step ratio (prev≥60 s) | 1.40x / 1.40x | **1.40x / 1.40x** | none |
| L18–25 abs level time worst | 3.50 min | **3.50 min** | none |
| L30+ step ratio HARD | n/a | **n/a** | none |
| **RESULT** | PASS | **PASS** | none |

QA gate `ac7-tr5-gate.py`: **PASS** (WARN 1.40x @ ≥1 min; HIST legacy 30 s floor still shows F17→F18 ratios — informational only).

## Logs
- `tr5-qa-m4cols-86f0e80e.log`

---

## History — 70009738d2d1 (HoP-approved 23:41; superseded 23:58)

Date: 2026-10-16 ~23:41 CEST  
Source: `product/balance-changelog.md` (HoP approved this CSV at 23:41)  
Seeds: 30 · scenario: standard · CPU only (no flock)  
Superseded by `86f0e80e3593…`.

### Digests

| artifact | sha256 | prefix |
|---|---|---|
| `product/farm/m4/tr5_run.py` | `d8b1f51ed26d24abbf4dca50e6d8d5468977a3d5fb73fb7c28b2d27911fadfa7` | **`d8b1f51ed26d…`** |
| `product/economy.f1-m4cols.csv` | `70009738d2d176f60874e737014d389474986aa7b8aa8cc333e1683d3a5613fa` | **`70009738d2d1…`** |

### Diff vs `scratch/csv-bak-2340/` (= `053b2ba5ad71…`)

Only two changes; **no pacing columns** touched:

1. `w2_asleep_collect_share`: **0.15 → 0.20** (all rows)
2. New column `leave_attended_window_s` = **30** (all rows)

### Verdict then: **PASS** (identical to 053b2ba pacing)

| check | 053b2ba (prior) | 70009738 | delta |
|---|---|---|---|
| F18 median / in-band | 20.75 / 30/30 | **20.75 / 30/30** | none |
| L@30 | L21 / 30/30 | **L21 / 30/30** | none |
| gap P95 / worst | 1.50 / 1.50 | **1.50 / 1.50** | none |
| L18–29 step ratio (prev≥60 s) | 1.40x / 1.40x | **1.40x / 1.40x** | none |
| L18–25/29 abs level time worst | 3.50 min | **3.50 min** | none |
| **RESULT** | PASS | **PASS** | none |

Logs (historical): `tr5-pm-m4cols-70009738.log`, `tr5-qa-m4cols-70009738.log`
