// M4.1 patch 1 (3/4) evidence: planner / live-income values for a fixed set of states.
// Run at 2302778 (before the §4.2 fix) to write tests/fixtures/m41-p1/income-before.json:
//   ./node_modules/.bin/vite-node scripts/m41-p1-income-states.ts -- --write
// tests/m41-p1-live-income.test.ts recomputes the same values after the fix and compares.
import { writeFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { incomePerSec, demandPerSec, secondsToAffordSteady } from '../src/econ/income';
import { bestBuy, options, optionGain, BUY_ORDER } from '../src/econ/best-buy';
import { bestRoiDelta, goalLabelSpec, goalLabelParts } from '../src/ui/goal-label';
type W = GameState['workers'];
const W = (mh: unknown, rest: Record<string, unknown> = {}) => ({ ...(mh ? { market_hand: mh } : {}), ...rest }) as W;
const awake = { energy: 100, cdS: 0 }, tired = { energy: 30, cdS: 0 }, asleep = { energy: 0, cdS: 0 }, unpaid = { energy: 60, cdS: 0, unpaid: true };
const others = { coop_hand: { energy: 80, cdS: 0 }, hawker: { energy: 70, cdS: 0 } };
const othersAsleep = { coop_hand: { energy: 0, cdS: 0 }, hawker: { energy: 0, cdS: 0 } };
/** name -> partial state. MH none / working / tired / asleep / unpaid / paused(fixture flag) at several farms. */
export const STATES: Record<string, Partial<GameState>> = {
  'F1 no MH': { farmLevel: 1, collectionLevel: 1, coinsCents: 5_000 },
  'F6 MH working': { farmLevel: 6, collectionLevel: 4, coinsCents: 1e6, workers: W(awake) },
  'F6 MH tired': { farmLevel: 6, collectionLevel: 4, coinsCents: 1e6, workers: W(tired) },
  'F6 MH asleep': { farmLevel: 6, collectionLevel: 4, coinsCents: 1e6, workers: W(asleep) },
  'F6 MH unpaid': { farmLevel: 6, collectionLevel: 4, coinsCents: 1e6, workers: W(unpaid) },
  'F6 MH paused asleep': { farmLevel: 6, collectionLevel: 4, coinsCents: 1e6, workers: W({ ...asleep, paused: true }) },
  'F12 MH asleep + CH/Hawker': { farmLevel: 12, collectionLevel: 9, coinsCents: 5e7, workers: W(asleep, others) },
  'F12 MH unpaid + CH/Hawker asleep': { farmLevel: 12, collectionLevel: 9, coinsCents: 5e7, workers: W(unpaid, othersAsleep) },
  'F20 all + grader, MH asleep': { farmLevel: 20, collectionLevel: 15, coinsCents: 1e9, graderTier: 1, workers: W(asleep, { ...others, grader: { energy: 90, cdS: 0 } }) },
  'F15 H12 V8 MH asleep (demand-bound)': { farmLevel: 15, collectionLevel: 14, hensLevel: 12, eggValueLevel: 8, coinsCents: 3e8, workers: W(asleep, others) },
  'F15 H12 V8 MH working (demand-bound)': { farmLevel: 15, collectionLevel: 14, hensLevel: 12, eggValueLevel: 8, coinsCents: 3e8, workers: W(awake, others) },
  'F25 H20 V15 MH unpaid': { farmLevel: 25, collectionLevel: 22, hensLevel: 20, eggValueLevel: 15, coinsCents: 2e10, graderTier: 2, workers: W(unpaid, { ...others, grader: { energy: 0, cdS: 0 } }) },
  'F20 all + grader, MH working': { farmLevel: 20, collectionLevel: 15, coinsCents: 1e9, graderTier: 1, workers: W(awake, { ...others, grader: { energy: 90, cdS: 0 } }) },
};
/** v5 F3: shipped balance with m4.flags.pause = 1 (the 'paused' fixture states model the m5 Pause build). */
export const pauseOn = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, pause: 1 } } } as typeof b;
export const build = (o: Partial<GameState>): GameState => ({ ...initialState(b, 1), ...o }) as GameState;
const r6 = (x: number | null | undefined) => x == null || !Number.isFinite(x) ? x ?? null : Math.round(x * 1e6) / 1e6;
export function planner(s: GameState) {
  const pick = bestBuy(s, b);
  const gains = Object.fromEntries(BUY_ORDER.map(k => { const g = optionGain(s, b, k); return [k, g ? { gain: r6(g.gain), cost: g.cost, payback: r6(g.payback) } : null]; }));
  const goal = (['HENS', 'VALUE', 'COLL'] as const).map(k => { const d = bestRoiDelta(s, b, k); return { k, x: d?.x ?? null, label: goalLabelParts(goalLabelSpec(k, s, b, pick?.key === k)).text }; });
  return { income_working: r6(incomePerSec(s, b, { assumeWorking: true })), demand_working: r6(demandPerSec(s, b, { assumeWorking: true })),
    pick: pick ? { key: pick.key, cost: pick.cost, gain: r6(pick.gain), payback: r6(pick.payback), bundleScore: r6(pick.bundleScore), bundlePayback: r6(pick.bundlePayback) } : null, options: options(s, b).map(o => o.key), gains, goal };
}
/** `bb` (v5 F3): the paused states are read with m4.flags.pause = 1, because isPaused() ignores `paused` while the flag is 0. */
export const live = (s: GameState, bb: typeof b = b) => ({ income_live: r6(incomePerSec(s, bb)), demand_live: r6(demandPerSec(s, bb)), eta_1000: r6(secondsToAffordSteady(s, bb, 100_000)) });
if (process.argv.includes('--write')) {
  const out = Object.fromEntries(Object.entries(STATES).map(([n, o]) => { const s = build(o); return [n, { ...planner(s), ...live(s, /paused/.test(n) ? pauseOn : b) }]; }));
  writeFileSync(new URL('../tests/fixtures/m41-p1/income-before.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
  console.log(`wrote ${Object.keys(out).length} states`);
}
