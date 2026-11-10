# M5.1 Breeds UI PR-A — Ready

**Branch:** `v5/breeds-ui-a` · **Head:** `443b7ad0ccb962cc9637570b136c1cd13536d8d1` · **Tree:** `e6bde68408f3ce098d81b2bc3c90e330a1d9e339`  
**Base:** `rc/v5` @ `d65391b` (#111 golden-game mergefwd; merge commit, not rebase)  
**Worktree:** `worktrees/v5-breeds-ui-a`  
**Spec:** `product/m5.1-breeds-spec.md` rev 3.8.9 · Checklist `c9d8b631` · Art UI v0.2.7  
**Seams:** `engineering/design/breeds-ui-seams.md`  
**AC trace:** `engineering/reviews/v5-breeds-ui-a-ac-trace.md`  
**HoQA bundle:** `scratch/bundles/breeds-ui-pra-443b7ad0.bundle` (verified)  
**Gate artifacts:** `artifacts/v5-breeds-ui-0ae9d907/` + SHA256SUMS

## Flag / QA (HoQA) — flag-on mechanism

Committed **`balance.json` stays `m4.flags.breeds = 0`** (release / flag-0 byte-identical).

Flag-on for tests and QA uses **two** mechanisms only:

1. **`tests/helpers/breeds-on.ts`** — `breedsOnBalance()` (and `breedsOn()` alias) returns a Balance copy with **only** `m4.flags.breeds = 1`. Isolation assert in `tests/helpers/breeds-on.test.ts` guarantees no other flag/balance mutation. All PR-A vitest mounts import this helper; they never edit committed `balance.json`.
2. **`?qaBreeds=1`** — QA boot under `IOS_FLAG_ENABLED` (DCE’d out of release). `check-release-build` rejects a surviving `get("qaBreeds")` marker. Seam covered by `tests/v5-breeds-qa-seam.test.ts` + `tests/release-bundle.test.ts`.

`eggfarmQa.breeds.hatchEstimate` unchanged (BR-AC31e).

## PR-B seam (HoE)

- **No `app.ts` edit for PR-B.** Flag-on `mountBreeds` runs `import.meta.glob(['./breeds-ext-*.ts', '!./breeds-ext-registry.ts'], { eager: true })`.
- **Leaf registry:** `src/ui/breeds-ext-registry.ts` owns `registerBreedsExt` / `BreedsExtCtx` (ext modules import ONLY this leaf — TDZ fix).
- Ext ctx: `openFlock()`, `incomeRate()` (steady-state ¢/s), `rollingIncomeRate()` (BB-5 `IncomeRate` window), `reducedMotion`.
- `presentMirror` in `breeds-adapter.ts`.
- **`familyClampState(family) → {rawBp,clampedBp,atCap} | undefined`:** UI-facing name (no clash with Saves sim `familyClamp`). Stub returns `undefined` on this Ready head. **PR-B uses `familyClampState`.**
- **`presentGateOpen`:** stays stubbed `true` until Saves commit 1.
- Hatch: label-in-name (accessible name = visible text; `Ready in m:ss` via `aria-describedby`).

## Dependencies

| Dep | Status | Notes |
|---|---|---|
| Saves `#126` / `saves/breeds-sim-prB-traits` c0 `d4b5fdcd` | Draft, **not** on `rc/v5` | sim `familyClamp(s,b,family)`. Stacked on `#124`. |
| Follow-up **`v5/breeds-ui-a-clamp-bind`** | Separate | `familyClampState` delegates to sim; bundle `scratch/bundles/breeds-ui-a-clamp-bind-29edfc8b.bundle`. **Not** on this Ready head (HoE B). |
| Saves Present calm-gate (`presentGateOpen`) | commit 1 of `#126` | Keep stubbed open in PR-A. |
| breeds-drift (D1–D6) | **not** on `rc/v5` | Rebase/mergefwd when it lands. |

## Gates (final, once @ `0ae9d907`; docs tip after)

| Gate | Result |
|---|---|
| sync-economy --check | PASS |
| tsc --noEmit | PASS |
| full vitest | PASS (see artifacts) |
| build + check-release-build | PASS |
| release-bundle test | PASS |
| flag-0 goldens | PASS |
| check-globals chromium | PASS |
| rc0 3 engines | Hosted CI (release-globals matrix + golden-game-browser) |

## Merge conflicts

Mergefwd `origin/rc/v5` (`d65391b`) into PR-A: **no conflict hunks** (app.ts auto-merged: kept `mountBreeds` + added golden `layoutChanged`).

## Not pushed
