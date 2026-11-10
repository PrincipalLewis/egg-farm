/**
 * M5.1 Breeds UI PR-B extension entry (load trigger: FINAL Architect + HoE ruling 2026-11-10 01:05 CET; seams 3d40e76e §1).
 * PR-A's mountBreeds eager-loads `import.meta.glob('./breeds-ext-*.ts', { eager: true })` behind its m4.flags.breeds guard;
 * importing this module registers the PR-B extender (Present chip, BB strip Hatch target, yard). No app.ts reference.
 * Flag off: mountBreeds returns null before it ever fires an extender, so nothing PR-B renders (byte-identical).
 *
 * CYCLE-SAFE REGISTRATION (seam mismatch, reported to the Architect). Vite hoists an eager glob to a static import at the top
 * of breeds-mount.ts, so this file is evaluated while breeds-mount.ts is still mid-evaluation (breeds-mount → breeds-ext-b →
 * breeds-hud → breeds-mount). Calling registerBreedsExt() synchronously here hits breeds-mount's uninitialised registry: a TDZ
 * ReferenceError in the release bundle (the whole game fails to load, flag off included) and a TypeError under vitest.
 * So registration runs right after the current module-graph evaluation, retried on the next macrotask while the registry is
 * still uninitialised (vitest's async module runner). Boot is click-gated (main.ts "Tap to start"), so this always lands
 * before the first mountBreeds. Remove this deferral once PR-A moves the registry into a leaf module.
 */
import { registerBreedsPrB } from './breeds-hud';

/** Retry budget while a cycle partner is still mid-evaluation. Release bundle: the first attempt (one microtask after the
 *  synchronous bundle) always succeeds. vitest's async module runner can take many macrotasks to finish the graph, so the
 *  budget is wall time, not a count; it only bounds how long a genuinely broken registry is retried before rejecting. */
const REGISTER_DEADLINE_MS = 10_000;

/** Resolves once PR-B is in PR-A's registry (tests await this instead of calling registerBreedsPrB themselves). */
export const prbRegistered: Promise<void> = new Promise((resolve, reject) => {
  let t0: number | null = null;
  const attempt = () => {
    const now = Date.now(); t0 ??= now;
    try { registerBreedsPrB(); resolve(); }
    catch (e) {
      const notReady = e instanceof ReferenceError || e instanceof TypeError;
      if (notReady && now - t0 < REGISTER_DEADLINE_MS) setTimeout(attempt, 0); else reject(e);
    }
  };
  queueMicrotask(attempt);
});
