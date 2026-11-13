> **SUPERSEDED (21:51 CET):** the PR head moved to `6ece3e0a` (rc/v5 406e455 #81 F2 merged in, plus D-HOP-2026-10-29-06 follow-ups). The verdict of record is in **pr79-6ece3e0-ccr.md**. This file reviews the old head only and is kept as evidence.

# PR #79 @ a6b4fe4: v5 F1b (evRng/brRng, focus clock, wall-clock timers). CCR review: **PASS** (0B/0M/0m/2n)

- PR https://github.com/PrincipalLewis/egg-farm/pull/79, head `a6b4fe495ed06df286ab56a73523912c32e18706` (matches the head given). PR base is `rc/v5` 22eac98, but the PR carries #77's commit: its real base is **#77 ea6b6db** (own diff = one commit a6b4fe4). Reviewed against ea6b6db.
- **State: OPEN, Draft** (not Ready), unlike #77. CI on a6b4fe4: `gate` and `release-globals` skipped (draft); no verify-smoke run.
- **Stacking:** must merge after #77 (or it brings #77 in with it). #80 and #82 sit on top.
- Reviewer: Claude Code Reviewer, read-only, own detached worktree `/workspace/review-pr79-a6b4fe4`. Review ran 21:12–21:45 CET. Evidence in /workspace/.pr79-ev; the RNG analysis script and its output are kept as pr79-a6b4fe4-ccr-rng-analysis.ts.txt / .out.txt. Mutants ran in a scratch clone (/workspace/.pr82-ev/mut) and are listed here.
- The Architect's self-review (pr79-a6b4fe4.md) was read as data only. Claude calls used: 0/15.

## 0. File list
`git diff --stat ea6b6db a6b4fe4`: 7 files, +249/−5. New src/sim/rng.ts (33), src/sim/clock.ts (33), src/sim/timers.ts (22); src/sim/tick.ts +10/−3; src/game.ts +9/−1; src/sim/m5-state.ts +2/−2 (`brRngState`, session list); tests/v5-f1b-clock-rng.test.ts (139). No data/, scripts/, workflow or balance.json diff.

## 1. evRng = mixSeed(state.rng ^ K): is it sound? **Yes.**
Code: rng.ts:14 `deriveEvRngState = mixSeed((rng ^ 0x6576526e) >>> 0)`, called only from `ensureEvRng` (rng.ts:18-20) when `evRngState` is absent/invalid, and only from the `seedEvRng` timer system (timers.ts:15) while golden or broody is on. `mixSeed` (state.ts:47-51) is murmur3 fmix32 of `seed ^ 0x9e3779b9`, `|| 1`, so it is a bijection on uint32 except 0→1 and never returns 0 (the seeded state is always a valid xorshift32 state). Measured (pr79-a6b4fe4-ccr-rng-analysis):

| Question | Result |
|---|---|
| Does seeding or drawing consume/reseed the main rng? | **No.** `ensureEvRng`/`evDraw`/`brDraw` read `s.rng` at most once and never write it. 2 h of 10 Hz play (72 000 ticks, all 4 workers hired, collects/sells/buys) × seeds 1/7/42, with **all 13 flags on** and an evDraw + brDraw every tick, vs flags off: `rng` equal, state (minus ev/br fields) byte-equal, event log byte-equal. Mutants R1 (seeding also advances `rng`) and R2 (evDraw writes `rng`) are killed by the PR's tests. |
| Correlation with the main stream | All three streams are xorshift32, i.e. points on the same single 2³²−1 cycle; fmix32 puts the ev/br start at an effectively random lag. 8 seeds × 10⁶ draws per stream: **0 state overlaps** between main and ev or br (no lag < 10⁶), max |Pearson r| over lags 0/1/2/5 = 0.0095 at n = 10⁵ (≈3σ of pure noise across 64 samples). Expected overlap for 10⁶-draw sessions ≈ 2·10⁶/2³² ≈ 5·10⁻⁴: negligible. |
| Does it change over time as state.rng advances? | **Only until it is seeded.** The value depends on the rng at the first flag-on tick (consecutive-tick seeds 4db5c514, b64f15e1, 1e33889e… are unrelated), then it is frozen: 3 000 more ticks leave it unchanged, and invalid values (0, −1, NaN, 2³², 1.5) are re-derived (tested, mutant R3 killed). |
| Save/load | `evRngState` is saved today already (serialize = whole state; validate keeps it): a mid-run serialize → validate restores the same value, and the continuous run equals the split run. A pre-M5 save loaded into a golden build seeds from the loaded rng on its first tick, and two loads of the same save give the same seed. |
| Offline catch-up | `applyOffline` touches neither `rng` nor `evRngState` (90 min grant). The hidden < 60 s sim (game.ts:398, no clock) seeds exactly like a live tick: the same seed with and without a clock. Deterministic per save. |

- Determinism caveat, not a defect: the seed is taken at the **end** of the first flag-on tick (tick.ts:56 → timers.ts:15), after that tick's customer draws. See N-2.
- brRng = mixSeed(evRngState ^ 0x62724e67) (rng.ts:16); `brDraw` never writes `evRngState` (tested; mutant R4 killed). See O-1/O-2 for its save behaviour.

## 2. Focus clock and wall-clock timers
- `focusFrameMs` (clock.ts:19-22): 0 when not attended, gap ≤ 0 / NaN, or gap ≥ offlineMinSeconds (60 s); else min(gap, 1000). `focusTicks` = ceil(focusMs/tick − 1e-9); `tickClock` marks the first nFocus ticks (mutant R6 `<=` killed). Game passes `{ focusMs, nowMs: this.now() }` only on the visible path (game.ts:405-408); the hidden path (:398), `advanceMs` (:317) and the uncover path (:369) pass no clock, so every catch-up tick is unfocused.
- `wallRemainingMs` clamps to [0, cap] on every read; non-finite → ready (mutant R5, no upper clamp, killed). The sim never calls Date.now: `grep Math.random|Date.now|performance.now|new Date` over src/sim, src/config, src/econ finds only the comment at clock.ts:8.
- `stepTimers` runs only when `anyM5FlagOn(b)` (tick.ts:56). Mutant G2 (`anyM5FlagOn` always true) **survives, equivalent**: the only system, `seedEvRng`, is itself gated by `evRngFlagOn`. Mutant G1 (seed regardless of flag) is killed by the F1a test.

## 3. Goldens, trace, gates (own worktree)

| Gate | Result |
|---|---|
| tsc --noEmit | 0 |
| npm test | **1585 passed, 1 skipped** (117 files) |
| engineering/golden suites | pass (a54c9cf9) |
| test:slow | **16 passed, 1 skipped** (523 s under box load ~15) |
| build / check-release-build | 0 |
| check-globals | 3/3 PASS |
| build:html | 0 |
| verify --hours 24 --seed 1 | **PASS**, trace **2c0d3ec3** (479 715 events), goldens **f90d1678 / a54c9cf9**, round-trip pass |
| verify --hours 1 | PASS, trace 198992ff078e (= base) |
| gitleaks `ea6b6db..a6b4fe4` | no leaks |

- 24 h verify.json vs base 22eac98: apart from build id/sha/label lines, only the html `bytes` differ (547 466 → 548 505, the new code). `git status` clean after the gates.

## 4. Module boundaries
sim/timers → config/flags, sim/clock, sim/rng; sim/rng → sim/state; sim/tick → sim/timers, sim/clock; game → sim/clock. Value-import graph over src: 0 cycles, no config→sim or sim→ui/econ/save edges.

## Findings
No Blocking, Major or Minor findings.

### N-1. The attended probe is called on every visible frame even with every flag off
- File: src/game.ts:407 (`!this.readOnly && this.attendedProbe()`), against the comment at src/game.ts:385-387 ("Only read while M5 flags are on").
- Repro: tests/v5-f1b-clock-rng.test.ts "F1b Game wiring" itself asserts `calls >= 120` on the shipped (all-off) balance.
- Impact: none today (default probe returns false). Once UI wires `() => !dialogOpen()`, that DOM query runs every frame in flag-off builds. Fix: compute `focusMs` only when `anyM5FlagOn(this.b)`, or correct the comment.

### N-2. GE-AC33's reference holds only because no customer is drawn on tick 0
- Files: src/sim/rng.ts:13 (comment "at tick 0 this is mixSeed(mixSeed(7) ^ salt)"), src/sim/timers.ts:15 run at src/sim/tick.ts:56, after the arrival draws (:45, :48).
- Repro (pr79-a6b4fe4-ccr-ac33.ts.txt): shipped balance (`first_customer_s` 10) → AC33 holds. Same with `customers.first_customer_s = 0` → tick 0 draws rng and `evRngState ≠ mixSeed(mixSeed(7) ^ 0x6576526E)`.
- Impact: none with shipped data; the self-review records it (Q-F1b-1). Seeding at the start of step() (before arrivals) would make AC33 exact unconditionally; otherwise the spec should say "post-tick rng".

### Observations
- **O-1 (brRng, by design D-C4):** with broody on and golden not drawing, `evRngState` never advances, so every page session re-derives the **same** brRng seed and replays the same Broody draw sequence (measured: `brReloadReplays: true`). `broodyHenIdx` is saved, so a reload doesn't re-pick, but the re-pick after each collect follows the same list every session. Sizing §12 D-C4 accepts "reproducibility per page session"; flagged so PM Collection knows it is predictable.
- **O-2 (F2 dependency):** `brRngState` is declared session-only, but until F2 strips `M5_SESSION_FIELDS` it is written by serialize and restored by validate, so "re-derived on load" (rng.ts:15) is not what would happen. Nothing writes it in production at this head (no Broody system), so no effect today. Same as #77 O-1.
- **O-3:** Draft, so CI hasn't run gate/verify-smoke on a6b4fe4. My local gates stand in for it; CI should be green before merge.

## Verdict: **PASS**. 0 Blocking / 0 Major / 0 Minor / 2 Nits / 3 observations
The `mixSeed(state.rng ^ K)` derivation is sound: it never consumes or perturbs the main stream, shows no measurable correlation, is frozen once seeded, survives save/load (it is saved) and offline catch-up unchanged, and is deterministic per save. Flag-off goldens and the 24 h trace are byte-identical. 9 targeted mutants on #79 code (R1–R6, G1–G3): 8 killed, 1 equivalent (G2); script/output pr82-c5b0371-ccr-mutants.*.txt. Claude calls used: 0/15.
