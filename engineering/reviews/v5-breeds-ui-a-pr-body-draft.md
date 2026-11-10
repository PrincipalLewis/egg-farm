# M5.1 Breeds UI PR-A — Ready-candidate DRAFT

**Branch:** `v5/breeds-ui-a` · **Base:** `rc/v5` @ `f20b9183` (rebase when breeds-drift lands)  
**Worktree:** `worktrees/v5-breeds-ui-a`  
**Spec:** `product/m5.1-breeds-spec.md` rev 3.8.9 · Checklist `c9d8b631` · Art UI v0.2.7  
**Seams:** `engineering/design/breeds-ui-seams.md`  
**AC trace:** `engineering/reviews/v5-breeds-ui-a-ac-trace.md`

## Flag / QA (HoQA)

- Committed **`balance.json` stays `m4.flags.breeds = 0`**.
- Vitest: `tests/helpers/breeds-on.ts` → `breedsOnBalance()` (only breeds=1; isolation assert).
- QA boot: `?qaBreeds=1` under `IOS_FLAG_ENABLED` (DCE in release); `check-release-build` rejects `get("qaBreeds")`.
- `eggfarmQa.breeds.hatchEstimate` unchanged (BR-AC31e).

## PR-B seam (HoE)

- **No `app.ts` edit for PR-B.** Flag-on `mountBreeds` runs `import.meta.glob('./breeds-ext-*.ts', { eager: true })`.
- Ext ctx: `openFlock()`, `incomeRate()` (¢/s), `reducedMotion`.
- `presentMirror` in `breeds-adapter.ts` (Present slot cards).
- **`familyClamp` stub:** `undefined` ⇒ no label. **Dependency:** Saves `saves/breeds-sim-prB-traits` (commit 0; ETA TBD).

## Scope

PR-A: Flock entry + highlight, sheet, slots/settle, Hatch, Farm-soon, album, reveal+RM, adapter, 9 sprites, glob host.  
Out → PR-B: Present chip, BB strip, yard.

## Gates

Focused vitest green while iterating. **Final gate set not run** — awaiting HoE Ready authorization (D-CEO-20261110-02 / burn cut).

## Not pushed
