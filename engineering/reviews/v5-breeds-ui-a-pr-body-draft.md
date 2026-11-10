# M5.1 Breeds UI PR-A — Ready-candidate DRAFT

**Branch:** `v5/breeds-ui-a` · **Base:** `rc/v5` @ `f20b9183` (rebase when breeds-drift lands)  
**Worktree:** `worktrees/v5-breeds-ui-a`  
**Spec:** `product/m5.1-breeds-spec.md` rev 3.8.9 · Checklist `c9d8b631` · Art UI v0.2.7  
**Seams:** `engineering/design/breeds-ui-seams.md`  
**AC trace:** `engineering/reviews/v5-breeds-ui-a-ac-trace.md`

## Flag / QA (HoQA) — flag-on mechanism

Committed **`balance.json` stays `m4.flags.breeds = 0`** (release / flag-0 byte-identical).

Flag-on for tests and QA uses **two** mechanisms only:

1. **`tests/helpers/breeds-on.ts`** — `breedsOnBalance()` (and `breedsOn()` alias) returns a Balance copy with **only** `m4.flags.breeds = 1`. Isolation assert in `tests/helpers/breeds-on.test.ts` guarantees no other flag/balance mutation. All PR-A vitest mounts import this helper; they never edit committed `balance.json`.
2. **`?qaBreeds=1`** — QA boot under `IOS_FLAG_ENABLED` (DCE’d out of release). `check-release-build` rejects a surviving `get("qaBreeds")` marker. Seam covered by `tests/v5-breeds-qa-seam.test.ts`.

`eggfarmQa.breeds.hatchEstimate` unchanged (BR-AC31e).

## PR-B seam (HoE)

- **No `app.ts` edit for PR-B.** Flag-on `mountBreeds` runs `import.meta.glob('./breeds-ext-*.ts', { eager: true })`.
- Ext ctx: `openFlock()`, `incomeRate()` (¢/s), `reducedMotion`.
- `presentMirror` in `breeds-adapter.ts` (Present slot cards).
- **`familyClamp` stub on this Ready head:** returns `undefined` ⇒ no "max" label (HoE B — PR-A merges onto `rc/v5` with the stub).
- **`presentGateOpen`:** stays stubbed `true` in slot mirror until Saves commit 1.

## Dependencies

| Dep | Status | Notes |
|---|---|---|
| Saves `#126` / `saves/breeds-sim-prB-traits` c0 `d4b5fdcd` | Draft, **not** on `rc/v5` | `familyClamp(s,b,family)→{rawBp,clampedBp,atCap}`; BC `lay_cap_bp_lt18=700`, `lay_cap_bp=1500`, `lay_cap_farm=18`, `away_cap_bp=3000`, `broody_cap_bp=2000`. Stacked on `#124` `baf410f`. |
| Follow-up **`v5/breeds-ui-a-clamp-bind`** | Ready separately | Binding commit *after* `#126` merges. Adapter calls sim; label iff `rawBp > clampedBp`. Bundle: `scratch/bundles/breeds-ui-a-clamp-bind-bfd4d0fa.bundle`. **Not** part of this PR-A Ready head. |
| Saves Present calm-gate (`presentGateOpen`) | commit 1 of `#126` | Keep stubbed open in PR-A. |
| breeds-drift (D1–D6) | **not** on `rc/v5` (`f20b918`) | Rebase PR-A when it lands. |

## Scope

PR-A: Flock entry + highlight, sheet, slots/settle, Hatch, Farm-soon, album, reveal+RM, adapter, 9 sprites, glob host.  
Out → PR-B: Present chip, BB strip, yard.

## Gates

Focused vitest green (44/44 on Ready head). **Final gate set not run** — awaiting HoE Ready authorization. After final gates: write HoQA full branch bundle to `scratch/bundles/breeds-ui-pra-<sha8>.bundle` and `git bundle verify` it.

## Not pushed
