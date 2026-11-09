# M5.1 Breeds UI — PR-A / PR-B seams

**Status:** locked for Features (decisions below already relayed).  
**Base:** `rc/v5` @ `f20b9183`.  
**PR-A branch / worktree:** `v5/breeds-ui-a` · `worktrees/v5-breeds-ui-a`.  
**PR-B:** Features — Present chip, BB strip, yard, a11y polish.

This doc is the parallel-work contract. PR-B must not edit `app.ts` beyond what is listed, and must not rename or move PR-A adapter symbols.

---

## 1. Mount ownership — `mountBreeds(app)`

**PR-A owns** the single `app.ts` call site. Flag-off (`!m4.flags.breeds`) → `null`.

**PR-B mounts through the registration point** — `registerBreedsExt` / `handle.registerExt` exported from `src/ui/breeds-mount.ts`. After every PR-A `syncEntry` / `render`, registered extenders get `onSync`. On dispose, `onDispose`.

**PR-B needs no `app.ts` edits.** If Features somehow cannot use the registry (should not happen), the *only* allowed extras are importing a PR-B mount and calling it once next to `mountBreeds` — do not duplicate Esc / welcome / render / dispose wiring.

### Exact `src/ui/app.ts` lines (PR-A, current worktree)

```ts
// L39
import { mountBreeds, type FlockUiFlags } from './breeds-mount';

// L204–214 — sole breeds mount behind m4.flags.breeds (inside mountBreeds → mountFlock)
  const flock = mountBreeds({
    g, b, upHeader: upHeader as HTMLElement, panelLayer, docked,
    closeOtherPanels: () => { if (!docked.matches) openPanel(null); },
    openUpgrades: () => { if (!docked.matches) openPanel('upgrades'); },
    sfx: (k) => sfx(k as any),
    rm,
    saveFlags,
    getFlags: () => flags as FlockUiFlags,
    dirty: () => { dirty = true; },
  });
  flock?.syncEntry(g.state, flags as FlockUiFlags, flags.sessions ?? 0);

// L363 — after welcome-back dismiss → pendingReveal
    … flock?.onWelcomeClosed();

// L395 — Esc closes breeds sheet before other panels
    … else if (flock?.onEsc()) { dirty = true; render(); } else openPanel(null);

// L756–757 — every renderAll tick
    flock?.syncEntry(s, flags as FlockUiFlags, flags.sessions ?? 0);
    if (flock?.isOpen) flock.render();

// L906 — dispose
  return { … dispose: () => { flock?.dispose(); zgAC.abort(); } };
```

### PR-B registration sketch (no `app.ts`)

```ts
// e.g. src/ui/breeds-hud.ts (or a thin breeds-prB.ts that imports hud/strip/yard)
import { registerBreedsExt } from './breeds-mount';
import { mountPresentChip } from './breeds-hud';
import { mountBbStrip } from './breeds-strip';
import { mountYard } from './breeds-yard';

registerBreedsExt({
  onSync(ctx) { /* mount/update chip + strip + yard from ctx */ },
  onDispose() { /* tear down */ },
});
```

Importing that module from a PR-A-owned side-effect path is **not** required: Features can call `registerBreedsExt` from any module that loads when the game boots *as long as it does not add a second `app.ts` call*. Preferred: PR-B adds one file that self-registers, and either (a) dynamic-imports it from an extender already registered by a one-line PR-A follow-up if needed, or (b) Features uses the minimal `app.ts` import listed above only if the registry self-load is impossible. **Default: zero `app.ts` edits for PR-B.**

---

## 2. Adapter ownership — `src/ui/breeds-adapter.ts`

| Owner | Rule |
|-------|------|
| **PR-A** | Creates and owns `src/ui/breeds-adapter.ts`. Thin UI-facing surface over sim (`breedsFlagOn`, `breedsOf`, `flockUnlocked`, `hatchEstimate`, `breedAsset`, trait/family formatters, etc.). |
| **PR-B** | **Adds getters only.** No renames, no moves, no signature changes to existing exports. Prefer new named exports over overloading. |

Do **not** edit `src/sim|save|econ|data` from either PR for UI concerns.

---

## 3. File split

| PR | Files |
|----|--------|
| **PR-A** | `src/ui/breeds-adapter.ts`, `src/ui/breeds-ui.ts`, `src/ui/breeds-mount.ts`, `src/ui/app.ts` (mount only), `src/ui/styles.css` (breeds block), `tests/v5-breeds-ui.test.ts`, `public/assets/char-breed-*.svg` (all 9) |
| **PR-B** | `src/ui/breeds-hud.ts` (Present chip), `src/ui/breeds-strip.ts` (BB strip), `src/ui/breeds-yard.ts` (yard), plus PR-B tests; may append CSS under `breeds-hud-*` / `breeds-strip-*` / `breeds-yard-*` |

PR-A may keep internal `mountFlock` as the sheet implementation; public entry for `app.ts` is **`mountBreeds`**.

---

## 4. CSS / `data-testid` prefixes

Global prefix: **`breeds-`** and `data-testid="breeds-*"`.

| PR | Sub-prefixes (classes / testids) |
|----|-----------------------------------|
| **PR-A** | `sheet-`, `slot-`, `hatch-`, `album-`, `reveal-` (plus top-level `breeds-entry`, `breeds-sheet`, `breeds-body`, `breeds-back`, `breeds-close`, `breeds-slots`, `breeds-album`, `breeds-farmsoon`, `breeds-hatch`, `breeds-glow`, `breeds-dot`, `breeds-reveal`, …) |
| **PR-B** | `hud-`, `strip-`, `yard-` (e.g. `breeds-hud-*`, `data-testid="breeds-hud-…"`, same for strip/yard) |

Do not collide: PR-B must not introduce `slot-` / `hatch-` / `album-` / `reveal-` / `sheet-` class roots; PR-A must not take `hud-` / `strip-` / `yard-`.

Attendance key stays `registerSheet('flock')` (overlay registry id; not a DOM class).

---

## 5. Sprites

Sprite ids = **`char-breed-*.svg` filenames** (stem → asset). Mapping helper: `breedAsset(id)` → `char-breed-${id with _ → -}.svg`.

**PR-A vendors all 9** into `public/assets/`:

1. `char-breed-ayam-cemani.svg`
2. `char-breed-brahma.svg`
3. `char-breed-cochin.svg`
4. `char-breed-cream-legbar.svg`
5. `char-breed-leghorn.svg`
6. `char-breed-orpington.svg`
7. `char-breed-rhode-island-red.svg`
8. `char-breed-sussex.svg`
9. `char-breed-silhouette.svg`

Source of truth for art: `art-ux/assets/char-breed-*.svg` (Art UI v0.2.7). PR-B consumes the same paths; do not re-vendor or rename.

---

## 6. Scope reminder

| In PR-A | In PR-B |
|---------|---------|
| Flock entry + highlight (BR-AC3 / 3b) | Present chip |
| Sheet + docked overlay + Esc | BB strip |
| Slots + settle (AC32) | Yard |
| Hatch + Farm-soon + hatchEstimate (AC31 / a / b / c / e) | A11y polish beyond PR-A minimum |
| Album / incubator | |
| Reveal + RM + pendingReveal | |
| Adapter + 9 sprites + seams | |

Flag-off must stay byte-identical to base for non-breeds paths.

---

## 7. Contact

Architect owns PR-A readiness + this seams doc. Features owns PR-B implementation against this contract. HoE escalations only if a seam must change (then update this file in the same change).
