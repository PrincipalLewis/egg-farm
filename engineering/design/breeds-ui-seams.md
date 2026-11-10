# M5.1 Breeds UI — PR-A / PR-B seams

**Status:** locked for Features (glob + registry leaf TDZ fix 2026-11-10; rollingIncomeRate).  
**Base:** `rc/v5` @ `f20b9183`.  
**PR-A branch / worktree:** `v5/breeds-ui-a` · `worktrees/v5-breeds-ui-a`.  
**PR-B:** Features — Present chip, BB strip, yard (`feat/v5-breeds-ui-prB`).

This doc is the parallel-work contract. **PR-B makes no `app.ts` edit.**

---

## 1. Mount ownership — `mountBreeds(app)` + `breeds-ext-*.ts`

**PR-A owns** the single `app.ts` call site. Flag-off (`!m4.flags.breeds`) → `null` (**no** extension glob).

**Leaf registry (TDZ fix):** `src/ui/breeds-ext-registry.ts` owns `registerBreedsExt`, the ext list, and `BreedsExtCtx` / `BreedsExt`. It has **no** imports from `breeds-mount`, `breeds-ui`, `breeds-adapter`, or `app` (type-only imports of `Game` / `Balance` only). **Ext modules import ONLY this leaf.** `breeds-mount` re-exports the registry API for compatibility.

**Flag-on:** `mountFlock` then eager-loads every module matching (after importing the registry):

```ts
import.meta.glob(['./breeds-ext-*.ts', '!./breeds-ext-registry.ts'], { eager: true })  // resolved from src/ui/
```

**Naming rule:** extension modules live under `src/ui/` as **`breeds-ext-*.ts`** (e.g. `breeds-ext-prB.ts`). Each module calls `registerBreedsExt(...)` from `./breeds-ext-registry` at import time. Zero matches in PR-A is fine — tsc/build stay green. Eager glob must not create an import cycle (registry leaf).

**PR-B mounts only via that glob + leaf `registerBreedsExt`.** No `app.ts` side-effect import.

### Ext ctx (`BreedsExtCtx`) passed to `onSync`

| Field | Meaning |
|-------|---------|
| `g`, `b`, `s` | Game, Balance, state |
| `flockOpen`, `docked` | sheet / layout |
| `openFlock()` | same path as the Flock entry button |
| `incomeRate()` | adapter `incomeRate(s,b)` → **steady-state** sim income ¢/s |
| `rollingIncomeRate()` | app `IncomeRate(60_000).centsPerSec(now)` — **same source as BB-5** countdown / time-to-afford. PR-B strip must use this. |
| `reducedMotion` | boolean from PR-A's `opts.rm()` (settings + `prefers-reduced-motion`) |

### Exact `src/ui/app.ts` lines (PR-A)

```ts
// L39
import { mountBreeds, type FlockUiFlags } from './breeds-mount';

// L204–214 — sole breeds mount
  const flock = mountBreeds({ … });
  flock?.syncEntry(g.state, flags as FlockUiFlags, flags.sessions ?? 0);

// L363 onWelcomeClosed · L395 Esc onEsc · L756–757 sync/render · L906 dispose
```

---

## 2. Adapter ownership — `src/ui/breeds-adapter.ts`

| Owner | Rule |
|-------|------|
| **PR-A** | Owns the file. Includes `presentMirror(bp, gateOpen)`, `incomeRate(s,b)`, `familyClamp` stub (`undefined` ⇒ no label). |
| **PR-B** | **Adds getters only.** No renames / signature changes to existing exports. |

**`familyClamp`:** HoE stub — `undefined` means no "max" label. Real sim getter owned by Saves on `saves/breeds-sim-prB-traits` (commit 0; ETA TBD). Dependency — swap inside `familyClamp` only.

**`presentMirror`:** PR-A uses it on Present settled slot cards (gate stub `true` until Saves calm-gate). PR-B HUD imports the same helper.

---

## 3. File split

| PR | Files |
|----|--------|
| **PR-A** | `breeds-adapter.ts`, `breeds-ui.ts`, `breeds-mount.ts`, `app.ts` (mount only), styles, tests, 9 sprites, this seams doc |
| **PR-B** | `breeds-ext-prB.ts` (or `breeds-ext-*.ts` that registers), `breeds-hud.ts`, `breeds-strip.ts`, `breeds-yard.ts`, PR-B tests |

---

## 4. CSS / `data-testid` prefixes

Global: **`breeds-`** / `data-testid="breeds-*"`.  
PR-A: `sheet-`, `slot-`, `hatch-`, `album-`, `reveal-` (+ `breeds-hud-mirror` from `presentMirror` html).  
PR-B: `hud-`, `strip-`, `yard-`.

---

## 5. Sprites

PR-A vendors all 9 `char-breed-*.svg`. PR-B consumes same paths.

---

## 6. Scope reminder

| In PR-A | In PR-B | Dependency |
|---------|---------|------------|
| Entry, highlight, sheet, slots, hatch, Farm-soon, album, reveal, adapter, glob host | Present chip, BB strip, yard | Saves `familyClamp` / Present calm-gate on `saves/breeds-sim-prB-traits` |

Flag-off must stay byte-identical for non-breeds paths; ext glob must not run when flag off.

---

## 7. Contact

Architect owns PR-A + this doc. Features owns PR-B against this contract. HoE escalations only if a seam must change (update this file in the same change).
