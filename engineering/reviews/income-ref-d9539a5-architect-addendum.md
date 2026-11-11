# #105 income-ref: Architect merge-forward addendum at d9539a5

Date: 2026-11-05 23:43 CET (Europe/Belgrade, UTC+1)  
Lane: architect · Prior: `engineering/reviews/income-ref-91a0144-architect.md` (**APPROVE**, 0 Blocker / 0 Major / 1 Minor m1 parent-vs-base / 1 nit) at `91a01445362ada4aeaf7215d93f8cf7f79f90312`  
Backlog: Wave A row 1 / plan income-ref before tapCoins (`engineering/v5.1-backlog.md`, `engineering/m5-build-plan.md` row 1)  
Requested exact: `d9539a54e3f0beb36168d4dc247e337d1bd878b4` = merge `rc/v5` `844f8e15774daeb1c0a855cb69b1fabd2f0ab820` into prior tip  
Writes: this addendum + `engineering/status.md` only. **No** code / PR post / GitHub approval / Ready / push / merge / messages. Architect does **not** grant publishing or merge authority.

## Verdict: prior **APPROVE CARRIES** to exact `d9539a5` — **delta PASS**

Clean merge-forward; income-ref patch byte-identical; schema/telemetry from rc untouched by the PR delta; Game.frame ≥60 s warm-up reset-at-return preserved; flags-0 no regression in focused evidence. Hosted gate SUCCESS at exact SHA independently confirmed. Pacing shards SUCCESS; aggregate FAIL = blocking row **904** NOT-WIRED ×3 only (independently confirmed). Saves QA note `qa/m3-recheck/income-ref-d9539a5.md` **PASS** claims for identity/gate/row904 **corroborated** (not assumed).  
**rc/v5 tip still `844f8e15`** — no further integration merge-forward / re-gate required at observation.  
Merge / undraft / Ready remain **HoE/HoQA**. This note is content approval for the exact tip only.

---

## Identity / provenance (Architect-measured)

| Check | Result |
|---|---|
| Live `headRefOid` / `origin/feat/v5-income-ref` / WT HEAD | `d9539a54e3f0beb36168d4dc247e337d1bd878b4` **MATCH** |
| Parents | `91a01445362ada4aeaf7215d93f8cf7f79f90312` + `844f8e15774daeb1c0a855cb69b1fabd2f0ab820` |
| PR baseOid / `origin/rc/v5` | `844f8e15774daeb1c0a855cb69b1fabd2f0ab820` **MATCH**; contains_rc **YES** |
| Subject | `Merge rc/v5 into feat/v5-income-ref (HoQA merge-forward for #105)` · AuthorDate 2026-11-05T22:38:51+01:00 |
| PR | open, **not Draft**, mergeable=true, mergeStateStatus UNSTABLE (checks: pacing aggregate fail + k10 known-red) |
| Current `rc/v5` tip (re-read) | still `844f8e15…` — **no rc move** |

WT: `/workspace/wt-v5-105-mergefwd` · Logs: `scratch/architect/review105-d9539a5/`

## Patch preservation / clean merge-tree

- `git diff 844f8e15..d9539a5` = **exactly 8 files, +286/−5** (same set as prior tip vs its then-base intent):  
  `src/config/formulas.ts`, `src/config/m5-rules.ts`, `src/game.ts`, `src/save/m5-fields.ts`, `src/sim/actions.ts`, `src/sim/income-ref.ts` (A), `src/sim/timers.ts`, `tests/v5-income-ref.test.ts` (A).
- All **8 blobs identical** to `91a0144` (`same=YES` for every path).
- `git range-diff 518de30..91a0144 844f8e15..d9539a5` → `1: 91a0144 = 1: 91a0144` (identical patch).
- No conflict markers in the 8 paths (`git grep` clean). Merge commit brings rc-only telemetry/UI/status noise into the first-parent history; **none** of that appears in the PR-vs-base delta.
- Extra paths vs base (`src/telemetry/`, `.github/`, `balance.json`, package locks, vitest configs): **empty**.

## Contracts (schema + Game.frame warmup + flags-0)

| Contract | Result | Evidence |
|---|---|---|
| `schema.ts` / `telemetry.ts` at tip == rc tip | **PASS** | blobs `e1a5e5dc…` / `ea14b423…` identical; PR delta does not touch `src/telemetry/` |
| No income-ref telemetry keys invented | **PASS** | no `income_ref`/`iref`/`refCents` in schema |
| Ring W+1 / on-read `refCents` / hard handover / BASE suspended sales | **PASS (unchanged)** | `income-ref.ts` blob identical; prior rulings stand |
| Visible `Game.frame` gap ≥60 s: catch-up then **`resetIncomeRef` at return** | **PASS (unchanged)** | `game.ts` L433–436: advance then `gap >= maxMs && incomeRefOn ? resetIncomeRef` |
| Hidden offline ≥60 s via `m5Offline` → reset | **PASS (unchanged)** | `m5-fields.ts` + tests |
| Session-only iref fields never saved | **PASS (unchanged)** | `M5_SESSION_FIELDS` path |
| Shipping `m4.flags.*` all **0** | **PASS** | read at tip this turn |
| Flag-off identity smoke | **PASS** | independent `m4a-flag-off` 2/2 |

Prior **m1** (parent `518de30` vs GitHub base `30df38c`) **CLOSED** by this merge-forward (base now `844f8e15`). Nit n1 (spec on-read wording) unchanged, non-blocking.

## Independent Architect gates (Node **v20.19.2**, flock `.vitest-eng.lock`, nice 10, architect lane)

| Gate | Result |
|---|---|
| `tsc --noEmit` | **exit 0** (LOCK 23:42:32 CET) |
| `tests/v5-income-ref.test.ts` | **27/27** |
| `tests/telemetry-schema.test.ts` (rc merge surface) | **50/50** |
| Combined focused | **77/77**, vitest_exit 0 (~0.65 s) |
| `tests/m4a-flag-off.test.ts` | **2/2**, exit 0 |
| `--maxWorkers=1` | **omitted** — tinypool `minThreads/maxThreads` RangeError (same local-review exception as prior Architect runs); serialization via flock lane only |

Author/Saves full-suite figures are **not** re-run here; bounded delta + patch identity justify focused set.

## Hosted (Architect re-verified, not agent-asserted)

| Run | headSha | Conclusion | Notes |
|---|---|---|---|
| **42114562185** (ci / gate) | `d9539a5…` **exact** | **success** | gate job SUCCESS (~15m); unit/slow/build/globals-in-gate/html OK. Standalone `release-globals` job **skipped** on PR (≠ pass; noted). |
| **42114562232** (pacing-x1-stack) | `d9539a5…` **exact** | **failure** (aggregate) | shards casual / optimal / seller15 all **success**. Aggregate FAIL lines **only**: `blocking row 904` optimal/seller15/casual **NOT-WIRED**. Rows: 45 PASS, 0 FAIL, 1 WARN, 12 NOT-WIRED (3 blocking). No pacing grant. |
| k10-breeds-offset | (separate run) | failure | KNOWN-RED non-required (D-HOP-2026-10-30-52/53) — does not block content carry |

## Saves QA note (read-only corroboration)

`qa/m3-recheck/income-ref-d9539a5.md` recommends **PASS**. Spot-checked evidence hashes match claimed:

- `identity.txt` sha256 `8dc7930a…821c`
- `row904.txt` sha256 `57f0ff1d…84d3`
- `gh-runs-final.txt` sha256 `a011046c…c18c`
- Report body-excl-sha section `bc1f1f34…aa8cd`

Identity / 8-file diff / gate SUCCESS / row-904-only aggregate FAIL agree with Architect’s independent `gh` + git measurements. Saves’ local full vitest/build counts are **their** evidence; Architect did not re-execute that full set this turn.

## Remaining (not closed by this addendum)

1. HoE/HoQA merge decision at exact `d9539a5` (Architect content carry ≠ merge authority).  
2. If `rc/v5` advances past `844f8e15` before merge → **new** merge-forward + exact-head recheck + re-gate (do not auto-carry).  
3. Broody extends `incomeRefOn`; Inspect exclusion with abilities — deferred as before.  
4. Pacing aggregate will keep failing on RC-only row 904 until that row is wired or policy-waived — not a sim regression of this tip.

No Ready / GitHub review event / push / merge / messages / code changes by Architect.
