# M5.1 Breeds UI PR-A (Flock entry / sheet / hatch / album / reveal) — DRAFT

**Branch:** `v5/breeds-ui-a` · **Base:** `rc/v5` @ `f20b9183`  
**Worktree:** `worktrees/v5-breeds-ui-a`  
**Spec:** `product/m5.1-breeds-spec.md` rev 3.8.9 `ea922eb8` · Checklist `product/collection/breeds-ui-build-checklist.md` `c9d8b631` · Art UI v0.2.7  
**Seams:** `engineering/design/breeds-ui-seams.md` (sha256 `95f4589569f643c62e53bba3d15a54a7794df9a89364540ef2a148dede6a8539`)

## Flag / QA boot (HoQA)

- **Committed `balance.json` stays at `m4.flags.breeds = 0`.** No PR-A commit changes that file.
- **Vitest:** `tests/helpers/breeds-on.ts` → `breedsOnBalance()` deep-clones the loaded balance and sets **only** `m4.flags.breeds = 1`, asserting the rest is deep-equal to the original. Breeds UI tests use this fixture (not a mutated singleton).
- **QA web boot:** `?qaBreeds=1` (read inside `IOS_FLAG_ENABLED` / `__IOS_FLAG__` in `src/main.ts`) clones balance at boot and sets `m4.flags.breeds = 1` for that session. Dead-code-eliminated in production. `scripts/check-release-build.mjs` rejects the marker `get("qaBreeds")` (same family as `?debug` / `?perf` / `?ios`). Covered by `tests/v5-breeds-qa-seam.test.ts` (synthetic) and `tests/release-bundle.test.ts` (full vite qa vs production — run at Ready gates).
- Existing **`eggfarmQa.breeds.hatchEstimate`** (`src/debug/breeds-qa.ts`) remains the BR-AC31e income override hook (also QA-only).

## Scope (PR-A)

Flock entry + BR-AC3b highlight, sheet (phone menu / docked overlay), slots + settle, Hatch AC31/a/b, Farm-soon AC31c/e, album/incubator, reveal + RM + `pendingReveal`, adapter, 9 sprites, `mountBreeds` + `registerBreedsExt` for PR-B.

**Out (PR-B Features):** Present chip, BB strip, yard, a11y polish beyond PR-A minimum.

## AC → test trace

*(table filled in a follow-up commit — see `engineering/reviews/v5-breeds-ui-a-ac-trace.md`)*

## Gates

Focused vitest while iterating. Full gate set once at Ready (D-CEO-20261110-02 / burn cut D-CEO-20261110-04).

## Not pushed / no Ready until HoE says so
