/**
 * Golden QA hooks (product/m5-gate-acs.md card #2; engineering/m5-build-plan.md; X5 / sizing §13).
 * `eggfarmQa.tc.spawn` / `tc.state` and `frenzy.start` are the ACS names (sim side). X5 also names
 * `eggfarmQa.golden.{state,seed,spawnNow,forceReward,setAge}` — same functions, aliased.
 * Overlay / audio / DOM sides are parked for the UI stage. main.ts imports this chunk only under
 * IOS_FLAG_ENABLED (dev / build:qa); check-release-build rejects eggfarmQa in a release bundle.
 * Vitest uses this module directly. Setters go through Game, never the DOM.
 */
import type { Game } from '../game';
import type { GoldenReward } from '../sim/events';

export function installGoldenQa(w: any, g: Game) {
  const state = () => g.qaGoldenState();
  const spawn = (slotId?: string) => g.qaSpawnNow(slotId);
  const start = () => g.qaFrenzyStart();
  const seed = (u32: number) => g.qaSeed(u32);
  const spawnNow = spawn;
  const forceReward = (type: GoldenReward) => g.qaForceReward(type);
  const setAge = (ageS: number) => g.qaSetAge(ageS);
  const qa = w.eggfarmQa ?? {};
  w.eggfarmQa = {
    ...qa,
    tc: { ...(qa.tc ?? {}), spawn, state },
    frenzy: { ...(qa.frenzy ?? {}), start },
    golden: { ...(qa.golden ?? {}), state, seed, spawnNow, forceReward, setAge },
  };
}
