# CSR-12: localStorage read throws → blank screen after "Tap to start" (pre-existing; M4.2 MAJOR)
Saves & Release QA · 2026-10-22 ~20:50 CEST · Chromium (google-chrome headless, Playwright) · oracle: spec m41-final sha256 cc6b7e23…8817c, line 75 (CSR-12)

- **Severity:** MAJOR (QA recommendation; HoQA confirms). **Scope:** **M4.2** per D-HOP-2026-10-22-03(8). This is **not an M4.1 gate** and does not hold the RC.
- **Pre-existing:** yes. It reproduces identically on dd223f5 (control) and on 9cce82d (PR #63).
- **Expected (spec line 75):** if localStorage throws on read, the player gets the existing v2.2 "Can't save" / storage outcome, and the game never autosaves a fresh farm over data it couldn't read.
- **Actual:** after "Tap to start" the page goes **blank** (cream background, no DOM content, no dialog, no game). `main()` rejects with an unhandled `SecurityError` / `InvalidStateError`. There's no Can't-save dialog and no recovery UI. **Data safety holds:** no write to `eggfarm.save*`, zero IDB puts/deletes, and a valid IDB save (F20, 447 B) survives byte-identical. So this is a dead-end screen, not data loss.

## Repro (exact)
1. Clean profile. Optionally seed IndexedDB `eggfarm` v1 / store `save` / key `main` with a valid v6 save (fixture `qa/m41/csr-fixtures/raw/BAK-valid-F20-seq4-older.json`), or seed nothing.
2. Before any app script (Playwright `addInitScript`), make `Storage.prototype.getItem` throw for `localStorage` only: `throw new DOMException('…', 'SecurityError')` (variant ii: `'InvalidStateError'`). setItem/removeItem stay allowed.
3. Open the build (`vite preview --outDir dist-qa`). The start screen renders. Click **Tap to start**.
4. Wait 12 s (more than 2 autosave intervals of 5 s). Result: a blank page, plus 1 unhandled rejection in the console.
Script: `flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node qa/m3-scripts/csr12-ls-throw-probe.mjs <worktree> 5961 <outdir> [preview|dev] <sha7>` (≈70 s per SHA plus lock wait).

## Crash stack (top frames, src file:line at 9cce82d; dd223f5 in brackets)
```
SecurityError: <DOMException from localStorage.getItem>
  at newerStoredVersion   src/save/save.ts:95    [dd223f5: save.ts:95]   kv.getItem(SAVE_KEY)
  at loadSafeInner        src/save/save.ts:332   [save.ts:272]
  at loadSafe             src/save/save.ts:325   [save.ts:268]
  at new Game             src/game.ts:57         [game.ts:51]
  at boot / main()        src/main.ts:103        [main.ts:95]    const g = new Game(balance, localStorage, …)  (not in try/catch, so main() rejects)
```
These src lines come from the same call made under vitest in each clean worktree. The browser (vite dev, `…/9cce82d-dev/result.json` → `throwStacks`) shows the same chain with vite-transformed positions: `newerStoredVersion save.ts:126 ← loadSafeInner save.ts:361 ← loadSafe save.ts:354 ← new Game game.ts:78 ← boot main.ts:184`. The earlier reads at boot (`newerStoredVersion` pre-checks main.ts:75/88/100, `readLease`, `Telemetry`, `installId`) are all inside try/catch. Only the `loadSafe` read is unguarded.

## Evidence (qa/m41/csr-acs-9cce82d/csr12-probe/)
| Run | build-id (runtime) | Outcome, all 4 cases (SecurityError / InvalidStateError × IDB valid save / no save) | LS reads | LS writes (all) | writes to eggfarm.save* | IDB puts / deletes | IDB main after |
|---|---|---|---|---|---|---|---|
| 9cce82d preview (`9cce82d-preview/`) | `m3-rc1-pre+9cce82d` | blank after Tap to start, 1 unhandled rejection | 12 | 7 (`eggfarm.lease` x6, `eggfarm.install_id` x1) | **0** | **0 / 0** | F20 kept (447 B) / none |
| 9cce82d dev (`9cce82d-dev/`, for stacks) | `m3-rc1-pre+9cce82d+dirty` (the dev server always marks dirty; worktree porcelain 0) | same | 12 | 7 | 0 | 0 / 0 | same |
| **dd223f5 control** preview (`dd223f5-preview/`) | `m3-rc1-pre+dd223f5` | **same blank** | 13 | 7 | 0 | 0 / 0 | same |
| dd223f5 dev (`dd223f5-dev/`) | `m3-rc1-pre+dd223f5` | same | 13 | 7 | 0 | 0 / 0 | same |
Each case has a `<variant>-<precondition>.png` (full page; all blank cream) and a `.console.log` (`[pageerror]` with an empty message, then `[unhandledrejection] SecurityError: qa: localStorage read blocked`), plus `result.json`.

## Suggested fix direction (Saves; M4.2)
Guard the `new Game` / `loadSafe` read in `main()` the way the other boot reads are guarded. On a KV read failure, route to the existing storage outcome (`storageBlockedRecovery` / v2.2 Can't-save, export of the current, unread state disabled) with a read-only Game, so no autosave can happen. Add the probe's 4 cases to the CSR browser set.

## Re-check on dfdf49c (2026-10-22 ~21:05 CEST; partial, stopped by the CEO/HoQA run freeze after 3 of 4 cases)
`m3-rc1-pre+dfdf49c`: SecurityError × (IDB valid save, no save) and InvalidStateError × IDB valid save all give the **same blank screen**, 1 unhandled rejection, 12 LS reads, 7 LS writes (lease/install_id), 0 save writes, 0 IDB puts. **Still present.** Evidence: `qa/m41/m41-7-dfdf49c/csr/csr12-probe/dfdf49c-preview/`.
