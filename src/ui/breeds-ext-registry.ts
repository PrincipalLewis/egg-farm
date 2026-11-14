/**
 * Leaf registry for PR-B `breeds-ext-*.ts` modules.
 * NO imports from breeds-mount, breeds-ui, breeds-adapter, or app
 * (type-only imports only — erased at emit) so eager glob cannot TDZ.
 */
import type { Balance } from '../config/balance';
import type { Game } from '../game';

export type BreedsExtCtx = {
  g: Game;
  b: Balance;
  s: Game['state'];
  flockOpen: boolean;
  docked: boolean;
  /** Same path as the Flock entry button. */
  openFlock: () => void;
  /** Steady-state sim income in ¢/s (adapter `incomeRate`). */
  incomeRate: () => number;
  /**
   * Rolling window income in ¢/s — same `IncomeRate` instance BB-5 / time-to-afford use
   * (`new IncomeRate(60_000)` in app.ts). PR-B strip countdown must call this, not `incomeRate()`.
   */
  rollingIncomeRate: () => number;
  /** Same reduced-motion source PR-A uses for reveal / glow. */
  reducedMotion: boolean;
};

export type BreedsExt = {
  onSync?(ctx: BreedsExtCtx): void;
  onDispose?(): void;
};

const _ext: BreedsExt[] = [];

export function registerBreedsExt(ext: BreedsExt): void {
  _ext.push(ext);
}

/** Test-only: wipe the registry between cases. */
export function clearBreedsExtForTests(): void {
  _ext.length = 0;
}

export function breedsExtCountForTests(): number {
  return _ext.length;
}

/** Snapshot for mountBreeds to iterate (read-only view). */
export function breedsExtList(): readonly BreedsExt[] {
  return _ext;
}
