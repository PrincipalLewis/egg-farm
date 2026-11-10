/** The ONE import point for the #5b/#11 sim read API (SIM-API.md). Today it re-exports the local stub; when Saves' risk-helpers
 *  module merges, change these lines to re-export from it (and src/econ/income.ts for the at-risk helpers). No UI file imports the stub directly. */
export type { StallCause, StallResolvedBy, StallView, FatigueCueView, FatigueSurface } from './stall-sim-stub';
export { stallView, fatigueCueView, resetStallTimers, noteStallChipTap, noteFatigueCueShown, noteFatigueCueTap, workerAtRisk, workersAtRisk, costliestAtRisk, fatigueShare } from './stall-sim-stub';
