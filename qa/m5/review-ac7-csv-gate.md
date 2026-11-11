# QA review: Economy AC7 --csv package (rebased on rc/v5 518de304) — PASS-WITH-NOTES
2026-11-05 20:28 CET. Reviewer: Head of QA. Task HoQA/ac7-csv-gate. Decision id QA-D-1105-AC7CSV.

## Package under review
- Checkout: `/workspace/scratch-econ-ac7csv-rebase` branch `econ/ac7-gate-csv-arg-rebased`
- Base: `rc/v5` `518de304fbe9f4c8f3dd04b8fffe38ee7698b94f`
- Local-only commits (verified parent chain `518de304` → `7e6fe4b9` → `eac3ed09`):
  - `7e6fe4b9b1c777d70f5c0c04e9e90152bec32d71` — import studio script verbatim
  - `eac3ed09b8deb2783540cc400ec8b931470bdbf1` — add `--csv <path>` + `CSV-RECORD`
- `git show --stat` on both: **only** `qa/m3-scripts/ac7-active-idle-gate.py` changed
- Script sha256: `3ba1909db39a1385696275f3d1bee2c30cd20fb85ed9d907744909f8850272f6` (matches claim)
- Rebase record: `scratch/ac7-csv-arg/rebase-518de30/REBASE.md` sha256 `e712f12bbb60ed7cb9bdd36053f9931ada9ad511abb1547bf9aba2a8a01ecd83` (matches claim)
- Nothing pushed / no PR (confirmed local-only). Live studio `qa/m3-scripts/ac7-active-idle-gate.py` remains sha256 `03d8e825…f38f` (argv[1]-only).

## Diff review (`--csv` behaviour)
- No `--csv`: `m4_active.CSV` / `R` / `SP` untouched; stdout path unchanged; still emits `CSV-RECORD` of the default CSV on stderr (audit).
- `--csv <path>`: rebinds `a.CSV`, `a.R`, `a.SP` from that file; missing / unreadable / unparsable → `ERROR: --csv …` on stderr, **exit 2**, never falls back to f1. Meets HoQA / HoE 2026-10-30 requirement.
- Every run writes `CSV-RECORD path=<realpath> sha256=<hex>` to stderr before the seed check.
- Silent wrong-CSV risk: a readable, parsable but incorrect path is accepted and recorded under **its** sha256. That is correct for the gate-of-record (caller must pass the shipped CSV; the record makes a wrong file detectable in the RC report). There is no silent fallback to a stale built-in after `--csv` is given.
- Pre-existing caveat (not introduced here; see QA-D-1030-X1COV): `ALL` hard-codes `st_cap=0.30` and does not read `tc_*` from the CSV. Flags-0 X1 is unaffected; flag-on streak/tapCoins pacing remains a separate sim item.

## Evidence run this turn (HoQA, not Economy's word)

### py_compile
`python3 -m py_compile qa/m3-scripts/ac7-active-idle-gate.py` → OK.

### Error paths (all exit 2, stderr `ERROR: --csv …`, empty stdout)
| case | exit | note |
|---|---|---|
| `--csv` (no path) | 2 | `ERROR: --csv needs a path` |
| missing file | 2 | FileNotFoundError |
| directory (`/tmp`) | 2 | IsADirectoryError |
| empty file | 2 | IndexError from parse |
| unreadable (mode 000) | 2 | PermissionError |

Also checked: `N=5` (no `--csv`) → exit 2, `ERROR: need >=30 seeds` on **stdout**, after `CSV-RECORD` of default `product/economy.f1.csv` 4ad1349a… on stderr.

Evidence dir: `qa/scratch/ac7-csv-gate-20261105/`.

### TypeScript gate (the package's normal QA TS coverage)
Ran (via `ops/tools/lane-run.sh hoqa-ac7csv`):
```
npx vitest run tests/pacing-x1-ac7.test.ts tests/pacing-x1.test.ts
```
in the rebased checkout (node_modules temporarily linked from `/workspace/wt-v5-income-ref` at the same `518de304` base; symlink removed after).

**Result: 2 files passed, 33/33 tests passed, EXIT 0.** Log: `qa/scratch/ac7-csv-gate-20261105/vitest-pacing-x1.log`.

`pacing-x1-ac7.test.ts` specifically asserts:
- fixture `a7dd71b-…` back-transformed to the live sys.path line hashes to `3ba1909d…` (verified independently: match True)
- Econ script PASSES behavioural CSV-RECORD check against shipped fixture CSV
- studio `03d8e825` script FAILS that check even when RESULT: PASS
- wrong sha / missing script FAIL; R3/R4/R7 plumbing still green

### Live Python gate (30 seeds, shipped CSV)
```
python3 qa/m3-scripts/ac7-active-idle-gate.py 30 --csv data/economy.csv
```
via `lane-run.sh hoqa-ac7csv-gate`.

- exit 0
- stderr: `CSV-RECORD path=…/data/economy.csv sha256=a8c4e26836bf7af98cb51f8e3e8a646750e82a4cdc18be450afe2f86eeeeb07f`
- RESULT: **PASS (5/5 levels)** — F10/F18/F22/F23/F24 all PASS (table identical to Economy's rebase record)

### Not run (explicit)
- Full `npm test` / full vitest suite / `tsc --noEmit` / `sync-economy --check` / `build`
- No push, no PR, no edit to product/, engineering/, status.md, or the live studio gate script

## L68 / streak-cap 0.28 → 0.27 request — NOT applied
- File with sha1 `1ebd7fc3…` is `artifacts/v5-ui/specs/test-plan-streak-tap-coins.1ebd7fc3.md` (**outside** the qa/ write scope). Live `qa/m5/test-plan-streak-tap-coins.md` is sha1 `5bfc664b…`; ST-AC21 (the L68 row of the frozen 1ebd7fc3 plan) is now **L71**.
- Cap-of-record with breeds = 1 is **0.27** (D-HOP-2026-10-30-27 / D-HOP-27; breeds spec §9; m5-gate-acs STK-AC6). Cap with breeds = 0 remains 0.28.
- Shipped `data/economy.csv` on this tree still has `tc_streak_cap = 0.28` (sha256 `a8c4e268…`). The breeds `bc_*` + 0.27 CSV is still **PENDING (Econ)** per breeds RC-PIN-2b.
- A single-token `0.28 → 0.27` on ST-AC21 alone is **not** consistent: the same row still says fill `66.8 %` (= 0.187/0.28) and `MAX +28%`; at 0.27 those become `69.3 %` and `MAX +27%` (already noted in m5-gate-acs). Dozens of other ST-AC rows in the same plan still cite 0.28.
- **Needed edit (for HoP / PMC, not applied here):** a coordinated ST-AC rewrite at cap 0.27 for the breeds-on ship-set (ST-AC3/5/9/21/25 at minimum, plus fill%/MAX% on ST-AC21), after Econ lands the 0.27 CSV — not a one-line L68 patch on 1ebd7fc3.

## Findings
| sev | id | note |
|---|---|---|
| Note | N1 | `ERROR: need >=30 seeds` prints to stdout; `--csv` errors print to stderr. Pre-existing shape; cosmetic. |
| Note | N2 | Uncaught `int(args[0])` on a non-int leftover arg would traceback (exit 1) rather than exit 2. Edge case; not hit by the gate-of-record invocation `30 --csv <path>`. |
| Note | N3 | Hard-coded `st_cap=0.30` / no `tc_*` read (QA-D-1030-X1COV). Out of scope for this package; do not block merge of `--csv`. |
| Note | N4 | L68 0.28→0.27 deferred; needs coordinated plan + CSV, see above. |

## Verdict
**PASS-WITH-NOTES** for the rebased AC7 `--csv` package. Safe to open/merge once HoE/HoP want it on a branch: behavioural TS coverage 33/33 green, error paths exit 2 with no fallback, live gate PASS 5/5 with correct `CSV-RECORD` on `data/economy.csv` `a8c4e268…`. Notes N1–N3 are non-blocking. L68 cap edit is **rejected as a single-line change** and returned as a needed coordinated edit.
