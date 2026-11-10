<!-- PR body for HoE: fix/saves-v5-m5load-pause-sanitize -> rc/v5 (head 7d59dda). Not pushed by Saves. -->
# v5 CCR-F4: m5Load sanitises the Pause save fields (`paused`, `callLockoutS`)

**Source:** engineering/reviews/rcv5-vs-main-1a61b36-ccr.md **F-4** (minor, owner Saves) · **Decision:** D-HOE-20261030-08 · **Owner:** Senior Engineer, Saves & Persistence
**Base:** `origin/rc/v5` 458f74c (#87 merged), merged in by a202ed1 (no rebase) · **Head:** `7d59ddac8f1e5b610ddef4db9c1b62de9799da5a`
(fb4015d CCR-F4 fix on 1a61b36 → a202ed1 merge of rc/v5 458f74c → 7d59dda #87 QA follow-ups) · **Size vs rc/v5 458f74c:** 7 files, +109/−4 (113 lines ≤ 400; no SAVE_VERSION change; balance.json unchanged)
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

## Merge of rc/v5 458f74c (#87) at a202ed1
- One conflict, `src/save/m5-fields.ts` header: kept both import sets (`sanitizePausedOnLoad` from sim/pause; `streakAfter`, `endStreak` from sim/streak),
  `anyFlag` includes `pause`, and kept #87's `const tc = tcNum`.
- Consistency: `pauseLoad` reads `tc_pause_unlock_farm` / `tc_pause_call_lockout_s` through the throwing `tcNum`, and `M5_REQUIRED_TC.pause` makes
  validateBalance reject Pause on without them. So a missing key is a load error (never a silent 0), the same rule as #87's streak keys. The doc comment says so.
- Nothing else changed in the merge. rc/v5 458f74c has the same tree as #87's 694468e.

## Saves QA #87 follow-ups (qa/m3-recheck/pr87-694468e.md; commit 7d59dda, tests/comments only, no src)
- **M1:** ST-AC18 now pins the 7 streak tc keys as a literal list in tests/v5-streak-sim.test.ts (`M5_TC_KEYS.streak` must equal it, and validateBalance must
  reject a streak-on balance missing any of them). Mutant V3 (drop `'streak_cap'` from `M5_TC_KEYS` in src/config/formulas.ts) is now **KILLED**
  (1 test: `ST-AC18 [QA pr87-694468e M1] …`). Control: the same mutant at a202ed1 (before this commit) **survives** v5-streak-sim (results/mutations/control-M1-at-a202ed1.log).
- **Nit:** tests/v5-f2-helpers.ts ON comment now says shipping has the full F3 flags block with every flag 0.
- **Nit (Basket cite):** engineering/reviews/v5-streak-sim-694468e-pr-body.md Basket rows now cite **D-HOE-20261030-07**. #87 is merged, so **HoE may PATCH #87's merged
  body** from that file. No test name or code comment references the Basket row, so nothing else changed.

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
| QA pr87-694468e M1 | tests/v5-streak-sim.test.ts `ST-AC18 [QA pr87-694468e M1]: the 7 streak tc keys are pinned here (spec §5 / G3), not derived from src M5_TC_KEYS` | pass; kills V3 |
| row-8 QA-10 | tests/v5-f3-is-paused.test.ts `every src read of paused goes through isPaused` (allowlist + sanitizePausedOnLoad) | pass |
TDD: the test file was committed with the fix; before it, 6/10 failed and 4 passed (the 4 are regression guards that already hold on rc/v5):
artifacts/…/tdd-red-vitest.log.

## Not in scope / open
- E13 "flag off: `paused`/`callLockoutS` cleared on the next save": not done. Flags-off loads stay byte-identical (AC-P1, F2 rule), and `isPaused`
  is already false with the flag off. It belongs to the Pause PR with the save-side rule (HoE call).
- E9 dev/QA rc2 `rest`/`resting` → `paused: true` mapping: not done (no rc2 saves in the wild); Pause PR.
- The Pause sim itself (lockout countdown, recovery): Pause PR. This PR only makes the load path safe before a reader exists.

## Verification (load caps: targeted only, maxWorkers=1, flock + nice via lane-run; load 3.93 at start)
`npm run sync-economy -- --check` exit 0 · `tsc --noEmit` exit 0 · targeted vitest @7d59dda (v5-m5load-pause-sanitize, v5-streak-sim, v5-f2-m5-fields, v5-f2-downgrade,
v5-f2-game-settle, v5-f2-roundtrip, v5-f3-config, v5-f3-is-paused, v5-f3-qa-seam, v5-f1a-fields, v5-f1b-clock-rng, v5-f1b-focus-wiring, v5-f1c-effects,
m41-p1-live-income, verify): **15 files, 266/266 passed**.
Mutations @7d59dda (QA's streak mutate.py set + M1-V3, over the same 15 files): **11/11 killed** (S1a 1, S1b 32, S2 6, S3 2, S4 1, S5 1, S6 4, S7 7, S8 1, S9 2,
M1-V3 1 failing tests); tree clean; the scratch worktree was removed. Control M1-V3 @a202ed1: survives (as QA reported).
Before the merge: fb4015d gate 10 files 146/146; TDD red 6/10 (artifacts/v5-m5load-sanitize-fb4015d/results).
Not run (load caps): full unit suite, golden, builds, check-globals, rc0. Hosted CI covers the full suite.
Review: per D-CEO-20261030-01, **CCR post-merge if Claude is available, otherwise recorded as 'no Claude review'**; merges on QA PASS + green CI.
Gate: `artifacts/v5-m5load-sanitize-7d59dda/results/` · Manifest: SHA256SUMS (45 files) sha256 7ae964d4e4237f6970155f0ddaf65f08f5c5b00ba257850a55a36e40df35be43 ·
Bundles: scratch/bundles/fix-saves-v5-m5load-pause-sanitize-{fb4015d,a202ed1,7d59dda}.bundle (each verify OK; a202ed1/7d59dda require 458f74c + 1a61b36).
