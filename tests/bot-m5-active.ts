/** F5 source-side measurement unit. Reuses bot-m5's buying/timing policies, not its
 * historical Economy mechanics model. This is NOT the final full-stack G1 certificate. */
import type { Balance } from '../src/config/balance';
import type { GameState } from '../src/sim/state';
import { runSource } from './bot-m5';
import { quantile } from './pacing-guards';
export const F5_PROFILES = ['optimal', 'seller15', 'casual'] as const;
export type ActiveProfile = typeof F5_PROFILES[number];
export const F5_SEEDS = Array.from({ length: 100 }, (_, i) => i);
export const F5_FARMS = [10, 18, 24] as const;
export interface WindowKey { seed: number; profile: ActiveProfile; farm: number }
export interface ActiveWindow extends WindowKey { seconds: 600; activeCents: number; idleCents: number; ratio: number | null }
/** Same-state, same-seed, frozen purchases, 600 s as in the existing windowGate port.
 * Net coins after wages (manage is allowed), not nominal per-sale multipliers.
 * The idle policy is the existing PROFS.idle, not the G0 never-tap control. */
export function activeWindow(b: Balance, seed: number, profile: ActiveProfile, start: GameState): ActiveWindow {
  const play = (pf: string) => runSource(b, seed, pf, 600, { start: structuredClone(start), noBuy: true }).final.coinsCents - start.coinsCents;
  const activeCents = play(profile), idleCents = play('idle');
  return { seed, profile, farm: start.farmLevel, seconds: 600, activeCents, idleCents,
    ratio: idleCents > 0 ? activeCents / idleCents : null };
}
/** Explicit integration dependencies, not a claim that enabling inert flags closes G1. */
export const F5_DEPENDENCIES = [
  'income-ref + tapCoins Wave A merge and source action integration',
  'golden spawn/tap catch policy through reviewed source API (no model overlay)',
  'Broody nest pop source API',
  'abilities fireAbility source API (do not invent)',
  'final RC ship flags + continuous/every-window coverage and Economy cross-check',
];
const key = (w: WindowKey) => `${w.seed}|${w.profile}|${w.farm}`;
/** Nearest-rank P95 over all measured windows; worst seed is the seed of the largest
 * individual window (equivalent to max of seed maxima). Use raw values at the boundary.
 * No finite-value filtering: missing/invalid windows remain visible failures. */
export function summarizeActiveWindows(windows: ActiveWindow[], expected: WindowKey[]) {
  const failures: string[] = [], valid: ActiveWindow[] = [];
  if (!windows.length) failures.push('no measured windows');
  for (const w of windows) {
    if (w.seconds !== 600 || !(Number.isFinite(w.activeCents) && w.activeCents >= 0)
      || !(Number.isFinite(w.idleCents) && w.idleCents > 0)
      || w.ratio === null || !Number.isFinite(w.ratio) || w.ratio < 0 || w.ratio !== w.activeCents / w.idleCents) failures.push(`invalid window ${key(w)}`);
    else valid.push(w);
  }
  const missing = expected.filter(e => !windows.some(w => key(w) === key(e)));
  if (missing.length) failures.push(`${missing.length} missing checkpoint windows`);
  const p95 = valid.length ? quantile(valid.map(w => w.ratio!), .95) : null;
  const worstWindow = valid.reduce<ActiveWindow | null>((a, w) => !a || w.ratio! > a.ratio! ? w : a, null);
  const worst = worstWindow?.ratio ?? null;
  if (p95 !== null && p95 > 2.0) failures.push(`P95 ${p95} > 2.0`);
  if (worst !== null && worst > 2.25) failures.push(`worst ${worst} > 2.25`);
  const groups = Object.fromEntries([...new Set(valid.map(w => `${w.profile}|${w.farm}`))].map(group => {
    const rows = valid.filter(w => `${w.profile}|${w.farm}` === group);
    const p95 = quantile(rows.map(w => w.ratio!), .95), worst = Math.max(...rows.map(w => w.ratio!));
    if (p95 > 2.0) failures.push(`${group} P95 ${p95} > 2.0`);
    if (worst > 2.25) failures.push(`${group} worst ${worst} > 2.25`);
    return [group, { windows: rows.length, p95, worst }];
  }));
  return { status: 'DEPENDENCY-BLOCKED' as const, measuredWindows: windows.length, p95, worst, worstSeed: worstWindow?.seed ?? null, groups,
    failures, missing, dependencies: F5_DEPENDENCIES,
    coverage: 'sampled 600s windows at F10/F18/F24 reach; NOT every rolling 10-minute window; NOT full-stack G1' };
}
