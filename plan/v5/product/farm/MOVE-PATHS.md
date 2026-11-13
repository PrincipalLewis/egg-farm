# product/farm/ → product/farm-upgrades/ : reference list (outside product/)

**Status: HELD.** The move to `product/farm-upgrades/` happens **after the F1 merge on Wed Oct 21** (HoP; decisions.md line 48). Nothing has moved yet.
- `product/farm/m4/` (m4_sim.py, tr5_run.py) **moves too**. Every `product/farm/m4/...` path below has to change.
- Ownership of the F1 files in product/farm/ (f1_nonfarm.py, f1-nonfarm-*.csv, economy.f1-alt*.csv, make_f1alt.py, f1-nonfarm-tweak.md) is **still to be confirmed with Economy**.
- Each department updates its own files (box etiquette: write only in your own folders). Line numbers were taken 2026-10-16 22:40.
- Inside product/ (Product updates these at move time): product/sim/m4/m4a_gate40.py:11, m4a_gate40_hyst.py:15 and m4a_gates_3839.py:5 (sys.path to product/farm/m4); product/f1-proposal.md; product/research/slices/upgrades.md; product/workers/rc1-asleep-state-spec.md.

⚠️ CRITICAL = this breaks a run or a permission if it isn't updated in the same window as the move.

## Engineering (3)
| file:line | path |
|---|---|
| engineering/status.md:107 | product/farm/m4a-spec.md |
| engineering/reviews/m3-rc1-save-durability-rebased-8669522.md:3 | product/farm/m4a-spec.md |
| engineering/reviews/m4-m4a-tracks-v3-677317d.md:3 | product/farm/m4a-spec.md |

## QA (14)
| file:line | path |
|---|---|
| ⚠️ **CRITICAL** qa/m3-scripts/combined/run-combined.sh:132 | product/farm/m4/tr5_run.py (executed by the combined suite) |
| qa/m3-test-plan.md:146 | product/farm/m4/tr5_run.py |
| qa/m4-ac-testability.md:5 | product/farm/m4/tr5_run.py |
| qa/m4-ac-testability.md:14 | product/farm/m4/tr5_run.py |
| qa/m4-ac-testability.md:28 | product/farm/m4/tr5_run.py |
| qa/m4-ac-testability.md:70 | product/farm/m4a-spec.md |
| qa/balance-report.md:56 | product/farm/farm_stress_sim.py |
| qa/balance-report.md:85 | product/farm/farm_stress_sim.py |
| qa/m3-recheck/m4a-v3-delta-prep-notes.md:114 | product/farm/m4a-spec.md |
| qa/m3-recheck/m4a-v3-delta-prep-notes.md:149 | product/farm/m4a-spec.md |
| qa/m3-recheck/pr1-m4-design-review-cf66ce5.md:2 | product/farm/m4a-spec.md |
| qa/scratch/pr1-96c4a1e/engineering/m4-design.md:5 | product/farm/m4a-spec.md (scratch copy) |
| qa/scratch/pr1-cf66ce5/engineering/m4-design.md:5 | product/farm/m4a-spec.md (scratch copy) |
| qa/scratch/pr1-e845cf3/engineering/m4-design.md:5 | product/farm/m4a-spec.md (scratch copy) |

## Ops (6)
| file:line | path |
|---|---|
| ⚠️ **CRITICAL** ops/claude/proposed/qa.settings.json:20 | product/farm/m4/tr5_run.py* (Bash allowlist) |
| ⚠️ **CRITICAL** ops/claude/proposed/gamer.settings.json:20 | product/farm/m4/tr5_run.py* (Bash allowlist) |
| ops/claude/README.md:45 | product/farm/m4/tr5_run.py* |
| ops/ownership-map.md:6 | product/farm/m4a-spec.md |
| ops-log.md:224 | product/farm/m4a-spec.md (historical log) |
| ops-log.md:300 | product/farm/m4a-spec.md (historical log) |

## Art & UX (6)
| file:line | path |
|---|---|
| art-ux/m3-next-goal-spec.md:18 | product/farm/rc1-upgrade-clarity-spec.md |
| art-ux/m4-tracks-copy.md:2 | product/farm/m4a-spec.md, product/farm/m4a-eng-addendum.md |
| art-ux/m4-tracks-explainer.md:2 | product/farm/m4a-eng-addendum.md |
| art-ux/rc1-upgrade-value.md:3 | product/farm/f1-nonfarm-tweak.md, product/farm/f1_nonfarm.py |
| art-ux/rc1-upgrade-value.md:9 | product/farm/rc1-upgrade-clarity-spec.md |

## Other: shared root logs (Product updates the paths only; historical text stays as is)
- decisions.md (7 lines): 26, 47, 48 (the move decision itself), 192, 206, 208, 225
- status.md (12 lines, 21 refs): 64, 78, 83, 105, 214, 246, 258, 330, 332, 340, 341, 345

## Move-day notes (2026-10-16 22:42)
- F1 exploration files (Economy-owned, rejected alts): f1_nonfarm.py, economy.f1-alt1/2/3.csv, f1-nonfarm-A/B/C.csv -> product/sim/f1/archive/ (NOT farm-upgrades/). Economy fixes f1-proposal.md paths after.
- Ops: allowlists already accept old+new tr5_run.py path. DM Head of Operations when move lands (they update README.md:45, ownership-map.md:6, drop old entries).
- L30+ dependency: M4A-27 load clamp caps level at 30; Engineering must raise it before any L30+ content.
