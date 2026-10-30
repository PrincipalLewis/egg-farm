/** BR-AC31e (rev 3.8.3 R-B4; name per build plan 5667ac63): eggfarmQa.breeds.hatchEstimate, dev/QA builds only.
 *  main.ts imports this chunk only under IOS_FLAG_ENABLED (__IOS_FLAG__ = mode !== 'production'), so release never has it
 *  (check-release-build rejects any eggfarm* identifier not on its allowlist). Sets the default and the assumeWorking income
 *  ($/s, each optional; null/undefined = the real estimators) used for the next Farm step's ETA and returns both ETAs.
 *  Display-only: never changes cost, incubation, rng, Best buy or bots. */
import type { Game } from '../game';
import { hatchEstimate, type HatchEstimate } from '../sim/breeds-hatch';
export function installBreedsQa(w: any, g: Game) {
  const hook = (o?: { defaultPerS?: number; assumeWorkingPerS?: number } | null): HatchEstimate => {
    if (o !== undefined) g.breedsEstimateOverride = o; return hatchEstimate(g.state, g.balance, g.breedsEstimateOverride ?? {}); };
  w.eggfarmQa = { ...(w.eggfarmQa ?? {}), breeds: { ...(w.eggfarmQa?.breeds ?? {}), hatchEstimate: hook } };
}
