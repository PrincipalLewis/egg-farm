# M5.1 Breeds UI PR-A — Ready

**Branch:** `v5/breeds-ui-a` · **Head/Tree:** tip of branch (`git rev-parse HEAD` / `HEAD^{tree}`)  
**Base:** `rc/v5` @ `d65391b` (#111 golden-game mergefwd; merge commit, not rebase)  
**Worktree:** `worktrees/v5-breeds-ui-a`  
**Spec:** `product/m5.1-breeds-spec.md` rev 3.8.9 · Checklist `c9d8b631` · Art UI v0.2.7  
**Seams:** `engineering/design/breeds-ui-seams.md`  
**Pre-bar fixes (HoQA `breeds-pra-bd5b068a.md`):** BR-UI-02/03/06/07/13/14/17/19/21/34/35 — `engineering/reviews/v5-breeds-ui-a-prebar-fixes.md` (commits `fe01485`, `8abcf165`, `9b616704`)  
**AC trace:** `engineering/reviews/v5-breeds-ui-a-ac-trace.md`  
**HoQA bundle:** `scratch/bundles/breeds-ui-pra-<sha8>.bundle` matching tip SHA8 (verified)  
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
- **`familyClampState(family, s, b) → {rawBp,clampedBp,atCap} | undefined`** (clamp-bind): delegates to sim `familyClamp(s,b,family)` from `src/sim/breeds-family.ts` (#126). Signature changed from PR-A's `(family, br?, b?, farmLevel?)`; `slotCardHtml(s, br, b, slot, open)` gains `s`; `activeTotalsText` clamp fn is `(f, s, b)`. UI "max" / "(max)" iff `rawBp > clampedBp`. **PR-B uses `familyClampState`** — rebind call sites to the 3-arg form.
- **`presentGateOpen`:** stays stubbed `true` until Saves commit 1.
- Hatch: label-in-name (accessible name = visible text; `Ready in m:ss` via `aria-describedby`).

## Dependencies

| Dep | Status | Notes |
|---|---|---|
| Saves `#126` / `saves/breeds-sim-prB-traits` c0 | **Merged** to `rc/v5` @ `68f58c0f`; merged into PR-A @ `4575966d` | sim `familyClamp(s,b,family)` now available; PR-A adapter still returns `undefined` (bind lives on clamp-bind). |
| **`v5/breeds-ui-a-clamp-bind`** (this branch) | PR-A `8ef9b4cd` + bind | Real getter; PR-A stub removed. Bundle `scratch/bundles/breeds-ui-a-clamp-bind-<sha8>.bundle`. |
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

## Pre-bar gates @ `9b616704` (tree `ba859431`)

tsc 0 · sync-economy 0 · vitest 160/2362 · build + check-release ok · build:html · check-globals 3 engines PASS · probe (390/1280 + 360/1024×474/1280×720 Chromium; axe 4.14.0) 3 engines fails=0. Logs `scratch/logs/breeds-pra-prebar/gates-9b616704/`.

New PR-A UI exports: `traitPctTrim`, `activeTotalsText`, `revealCopy`. No PR-B seam signature change (describedby now `hatch-sub[ hatch-fs]`).

## Post-merge gates @ `4575966d` (tree `b568a351`; PR-A + origin/rc/v5 `68f58c0f`)

tsc 0 · sync-economy 0 · vitest 162 files / 2392 tests PASS · build + check-release `m4.1+4575966 ok` · build:html · check-globals chromium/firefox/webkit PASS · build:qa · probe 3 engines fails=0. Logs `scratch/logs/breeds-pra-prebar/gates-4575966d/`.

## Merge conflicts

Mergefwd `origin/rc/v5` (`68f58c0f`, #118/#120/#124/#126) into PR-A @ `4575966d`: **no conflict hunks** (app.ts + status.md auto-merged; plain merge, no rebase).


Mergefwd `origin/rc/v5` (`d65391b`) into PR-A: **no conflict hunks** (app.ts auto-merged: kept `mountBreeds` + added golden `layoutChanged`).

## Not pushed
