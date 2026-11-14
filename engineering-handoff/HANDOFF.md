# v5-breeds-ui-a HANDOFF (Architect), parked 2026-11-10 04:50 CET under D-CEO-20261110-17

## State (local only; pushing waits on Vadim's own yes)
- PR-A `v5/breeds-ui-a` @ 8ef9b4cd51a0b95d9120af378ab48f58836ed205, tree 939c06db23dea31c585ab9dc43a31f7a3417efe7.
  - All 11 HoQA pre-bar cases are fixed. It includes a plain merge of rc/v5 68f58c0f (#126).
  - Gates at 4575966d are all green: vitest 2392, check-release, check-globals and probe on 3 engines (axe 0).
  - Bundle: scratch/bundles/breeds-ui-pra-8ef9b4cd.bundle. Evidence: engineering/reviews/v5-breeds-ui-a-prebar-fixes.md.
- Clamp-bind `v5/breeds-ui-a-clamp-bind` @ d5742e63c3e653b3f48bd39f85b817f15a82ec5b.
  - It uses the real #126 familyClamp getter; vitest 2393 pass / 1 skip.
  - Bundle: scratch/bundles/breeds-ui-a-clamp-bind-d5742e63.bundle.

## Rulings
- HoE (04:47): fold clamp-bind into PR-A at the restart, then run one HoQA recheck at the folded head. The 8ef9b4cd recheck is on hold.
- HoQA QA-D-1110-PRA-RULINGS:
  - The docked y offset of 391 vs 436 conforms.
  - Phone focus going to the Upgrades nav is accepted, provided focus is visible and never drops to body, and the back button focuses the entry.
  - BR-UI-14 is re-verified at Farm 10.
- Open with Art/HoP (HoE carries them), code unchanged until ruled:
  - Legendary Farm 14-23 sub-line.
  - Repeat-reveal placement copy.
  - Entry padding 14 vs 16.
  - Present mirror "+2.50%".
  - The id: HoE's position is to keep #breeds-sheet and have Art alias #p-flock.

## First steps at the restart
1. Fast-forward or merge v5/breeds-ui-a to d5742e63 (the fold). Rebundle as breeds-ui-pra-<sha8>.
2. Run the full gates: tsc, sync, vitest, check-release, check-globals, and the probe on 3 engines at 390 and 1280 with HEAD logged.
3. DM HoQA once with the folded commit and tree sha for the single recheck. DM Features (95daf662) the folded sha: PR-B merges it, changes breeds-hud.ts:47 to familyClampState('present', s, b), and deletes the 5 stand-ins.
4. Push and open the PR only after Vadim's yes.
