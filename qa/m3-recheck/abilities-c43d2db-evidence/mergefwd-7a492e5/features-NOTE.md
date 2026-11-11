# #112 abilities sim merge-forward onto rc/v5 f8036e8 (HoE/rcmove-112-110, HoQA QA-D-1105-RCMOVE)

- PR: https://github.com/PrincipalLewis/egg-farm/pull/112
- Branch: feat/v5-abilities-sim
- Prior head: c43d2db5dd56f90096a6ba5c509d33ccef69117d
- rc/v5 tip used: f8036e8f0826ca76fcc0ee13092d575533d4969b (#105 income-ref merged)
- New head: 7a492e5fea47f9bb92ae2d07e82820c64471ec5a
- Merge parents: c43d2db5dd56f90096a6ba5c509d33ccef69117d + f8036e8f0826ca76fcc0ee13092d575533d4969b
- Merge msg: Merge origin/rc/v5 (f8036e8, #105) into feat/v5-abilities-sim
- Author: Senior Engineer, Features & Economy Wiring
- Push: plain push (c43d2db..7a492e5), no force
- Draft: false (Ready/open, base rc/v5, MERGEABLE)
- Merged PR: NO
- #110/#114/#116/#106/#107: untouched

## Conflict resolution
Single conflict: src/sim/timers.ts (both sides appended a TimerSystem).
Kept both: `[seedEvRng, streak, breeds, incomeRef, abilities]` + both imports.
Order: abilities last per Architect review (engineering/reviews/abilities-sim-cc0642a-architect.md: "abilitiesTick last in TIMER_SYSTEMS");
incomeRef stays exactly as on rc/v5 (no income-ref revert). See timers-vs-rcv5.diff.

## Delta checks
- Two-dot file set vs f8036e8f0826ca76fcc0ee13092d575533d4969b == same 9 files as prior bar (vs 844f8e15) -> SAMESET
- Per-file +/- hunks identical to prior bar for 8/9 files; timers.ts differs only in the TIMER_SYSTEMS line now including incomeRef (expected)
- No income-ref files in diff (income-ref.ts, v5-income-ref.test, game.ts, m5-fields.ts, config/*, actions.ts: 0 lines)
- git merge-tree --write-tree rc/v5 head: clean

## git diff f8036e8f0826ca76fcc0ee13092d575533d4969b..7a492e5fea47f9bb92ae2d07e82820c64471ec5a --stat
```
 src/sim/abilities.ts           | 119 +++++++++++++++++++
 src/sim/effects.ts             |   8 +-
 src/sim/events.ts              |   2 +-
 src/sim/m5-state.ts            |   6 +-
 src/sim/payout.ts              |   3 +-
 src/sim/timers.ts              |   5 +-
 src/sim/workers.ts             |   7 +-
 tests/v5-abilities-sim.test.ts | 260 +++++++++++++++++++++++++++++++++++++++++
 tests/v5-f1a-fields.test.ts    |   2 +-
 9 files changed, 402 insertions(+), 10 deletions(-)
```

## Local gates (timers.ts overlaps #105's 8 files) — gates.log
- tsc --noEmit: OK
- vitest tests/v5-abilities-sim.test.ts (29) + v5-f1a-fields.test.ts (10) + v5-income-ref.test.ts (27): 66/66 pass
- Hosted gate + pacing shards: pending at new head
