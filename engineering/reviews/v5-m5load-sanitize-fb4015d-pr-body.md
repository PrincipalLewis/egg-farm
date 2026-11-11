<!-- PR body for HoE: fix/saves-v5-m5load-pause-sanitize -> rc/v5. Not pushed by Saves. -->
# v5 CCR-F4: m5Load sanitises the Pause save fields (`paused`, `callLockoutS`)

**Source:** engineering/reviews/rcv5-vs-main-1a61b36-ccr.md **F-4** (minor, owner Saves) · **Decision:** D-HOE-20261030-08 · **Owner:** Senior Engineer, Saves & Persistence
**Base:** `origin/rc/v5` 1a61b36 (#82 F3) · **Head:** `fb4015d831d9211877f4cd0c0bb95240ce044105` (one commit) · **Size vs rc/v5:** 5 files, +102/−3 (105 lines ≤ 400; no SAVE_VERSION change; balance.json unchanged)
**Flag:** behind `m4.flags.pause` (default 0). **Spec:** product/workers/m5-worker-pause-spec.md v1.3.6 rule 1, rule 7 (B5 sanitiser), E2/E2b/E9/E12/E13 · sizing §9.2 G3, §13 B5, D-C5 clamp style

## Problem (F-4)
`anyFlag` in save/m5-fields.ts omitted `pause`, so with only Pause on `m5Load` returned early, and `workers.market_hand.callLockoutS`
(NaN→null in JSON, negative, 1e308, string) was never validated on load.

## What
- `save/m5-fields.ts`: `anyFlag` includes `pause`; when `m4.flags.pause` is on, `m5Load` runs `pauseLoad(state.workers)`:
  - `paused`: a non-boolean is dropped (absent = false, E9). Below `tc_pause_unlock_farm` it is dropped too (rule 1, E12: "not saved back as true").
  - `callLockoutS` (Market Hand only, **sim seconds**, so no epoch-ms clamp): non-number / non-finite / negative / 0, on any other worker, or below
    the unlock → absent (E9 "absent when 0"); otherwise capped at `tc_pause_call_lockout_s` (B5 sanitiser, E2b).
  - A valid worker keeps its object; other worker fields (energy, cdS, unpaid) are untouched; no events.
- `sim/pause.ts`: `sanitizePausedOnLoad(w, open)`, so the `paused` key is still only touched in sim/pause.ts. `tests/v5-f3-is-paused.test.ts`
  (row-8 QA-10 grep) allowlists that one export next to `isPaused`. FYI Architect/HoE (#82 owners).
- `config/m5-rules.ts`: `M5_REQUIRED_TC.pause = ['pause_unlock_farm', 'pause_call_lockout_s']`, so validateBalance rejects Pause on without the keys
  m5Load reads (no silent `?? 0` for these two; the general F-5 fix is #87's `tcNum`). The values (10, 45) come with the Economy CSV PR (row 4).
- Flag off (shipping, or an M4.1-style balance with no `m4.flags`): `m5Load` returns the same object, and `paused`/`callLockoutS` are preserved and written back (E9 downgrade).

## Trace
| ID | Test (tests/v5-m5load-pause-sanitize.test.ts unless noted) | Result |
|---|---|---|
| CCR-F4, B5, E2b | `[CCR-F4][B5][E2b] callLockoutS: NaN, ±Infinity, negative, null, string, object -> absent (= 0); huge -> cap; valid kept` (1e308, MAX_VALUE, cap+0.001 → 45; 45, 30, 0.25 kept; 0 → absent) | pass (red before the fix) |
| CCR-F4, E9 | `[CCR-F4][E9] paused: a non-boolean is false (absent); true and false are kept` (1, 0, 'true', null, NaN, {}, []) | pass (red before) |
| CCR-F4, rule 1, E12, AC-P2 | `[CCR-F4][rule 1][E12][AC-P2] below tc_pause_unlock_farm a saved pause is cleared …` (F9 cleared, F10 kept) | pass (red before) |
| CCR-F4, B5 | `[CCR-F4][B5] callLockoutS exists only on the Market Hand: dropped from any other worker` | pass (red before) |
| CCR-F4 (missing) | `[CCR-F4] missing fields stay missing; other worker fields untouched; no events` | pass |
| CCR-F4, E2, AC-P13 | `[CCR-F4][E2][AC-P13] reload round trip: a valid pause survives serialize -> validate -> m5Load unchanged` | pass |
| CCR-F4, E2 (tampered JSON) | `[CCR-F4][E2] a tampered JSON save (null / string / 1e308) is sanitised after validate` | pass (red before) |
| CCR-F4, E9, AC-P1 (flag off) | `… shipping (all flags 0): m5Load returns the same object; isPaused false; serialize writes the fields back` | pass |
| CCR-F4, E9 (M4.1-style) | `… M4.1-style balance (no m4.flags): m5Load returns the same object; …` | pass |
| CCR-F4, F-5 (pause keys) | `[CCR-F4][F-5] validateBalance requires the Pause tc keys m5Load reads while m4.flags.pause is on` | pass (red before) |
| row-8 QA-10 | tests/v5-f3-is-paused.test.ts `every src read of paused goes through isPaused` (allowlist + sanitizePausedOnLoad) | pass |
TDD: the test file was committed with the fix; before it, 6/10 failed and 4 passed (the 4 are regression guards that already hold on rc/v5):
artifacts/…/tdd-red-vitest.log.

## Not in scope / open
- E13 "flag off: `paused`/`callLockoutS` cleared on the next save": not done. Flags-off loads stay byte-identical (AC-P1, F2 rule), and `isPaused`
  is already false with the flag off. It belongs to the Pause PR with the save-side rule (HoE call).
- E9 dev/QA rc2 `rest`/`resting` → `paused: true` mapping: not done (no rc2 saves in the wild); Pause PR.
- The Pause sim itself (lockout countdown, recovery): Pause PR. This PR only makes the load path safe before a reader exists.

## Verification (load caps: targeted only, maxWorkers=1, flock + nice via lane-run)
`npm run sync-economy -- --check` exit 0 · `tsc --noEmit` exit 0 · targeted vitest (new file + v5-f2-m5-fields, v5-f2-downgrade, v5-f2-game-settle,
v5-f2-roundtrip, v5-f3-config, v5-f3-is-paused, v5-f3-qa-seam, m41-p1-live-income, v5-f1a-fields): **10 files, 146/146 passed**.
Not run (load caps): full unit suite, golden, builds, check-globals, rc0. Hosted CI covers the full suite.
**#87 interaction:** a trial merge of origin/feat/saves-v5-streak-sim-2 (694468e) into fb4015d in a scratch detached worktree has **1 conflict**, src/save/m5-fields.ts,
in the header block (imports + `anyFlag` + `tc`). Resolution: union of imports, `anyFlag` with `pause`, and #87's `const tc = tcNum`. After that, tsc 0 and 5 files 102/102
(new file, v5-f3-is-paused, v5-f3-config, v5-f2-m5-fields, v5-streak-sim). The scratch worktree was discarded; evidence is in results/x87/.
Review: per D-CEO-20261030-01, **CCR post-merge if Claude is available, otherwise recorded as 'no Claude review'**; merges on QA PASS + green CI.
Gate: `artifacts/v5-m5load-sanitize-fb4015d/results/` · Manifest: SHA256SUMS (13 files) sha256 533db9997dd999c1564298200631238b47c9fa559c2fb680a9a4c193bff55c09 ·
Bundle: scratch/bundles/fix-saves-v5-m5load-pause-sanitize-fb4015d.bundle (verify OK; requires 1a61b36).
