// Flag off (shipping default) = main, bit for bit: bot pacing for 2 models x 6 seeds, a 10 Hz action trace with events,
// and an offline grant hash identically to origin/main 4aadcbf (golden computed there with the same code, 2026-10-16).
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { apply } from '../src/sim/actions';
import { step } from '../src/sim/tick';
import { applyOffline } from '../src/sim/offline';
import { runBot } from './bot';
const GOLDEN_MAIN_4AADCBF = '50a87ddbf89c44751ef33a008541022e146c48c0fed8e16d5114e6d787809de0';
describe('M4-A flag off = main', () => {
  it('balance.m4.enabled ships 0', () => { expect(balance.m4!.enabled).toBe(0); });
  it('sim trace hash equals main', () => {
    const out: unknown[] = [];
for (const model of ['seller15', 'cheapest']) for (let seed = 1; seed <= 6; seed++) {
  const r = runBot(balance, seed, model as any, 1800); out.push([model, seed, r.firstUpgradeS, Array.from({ length: 31 }, (_, i) => [r.farmAt(i * 60), r.upgradesAt(i * 60)])]);
}
// raw 10 Hz trace with every action type, events included
    let s: any = { ...initialState(balance, 7), coinsCents: 5_000_000 }; const ev: any[] = [];
for (let i = 0; i < 6000; i++) {
  s = step(s, 0.1, balance, ev);
  if (i % 3 === 0) s = apply(s, { type: 'collect' }, balance, ev);
  if (i % 50 === 0) s = apply(s, { type: 'sellAll' }, balance, ev);
  if (i % 97 === 0) s = apply(s, { type: 'buyFarm' }, balance, ev);
  if (i % 131 === 0) s = apply(s, { type: 'buyCollection' }, balance, ev);
  if (i % 400 === 0) for (const w of ['market_hand', 'coop_hand', 'hawker', 'grader'] as const) s = apply(s, { type: 'hire', worker: w }, balance, ev);
  if (i % 700 === 0) s = apply(s, { type: 'buyGraderTier' }, balance, ev);
}
const off = applyOffline(s, 5_400_000, balance);
const { hensLevel, eggValueLevel, celebratedMilestones, ...core } = s;
out.push(core, ev, off.eggs);
    expect(createHash('sha256').update(JSON.stringify(out)).digest('hex')).toBe(GOLDEN_MAIN_4AADCBF);
  }, 120_000);
});
