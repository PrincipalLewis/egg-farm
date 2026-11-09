// Breeds UI PR-B — best-buy strip Hatch target (BR-BB4, BR-AC23b / 23c). TDD: written before breeds-strip.ts.
import { describe, it, expect } from 'vitest';
import { breedsStripGoal, type BreedsGoal } from '../src/ui/breeds-strip';
import { selectGoal, type Goal } from '../src/ui/next-goal';
import { hatchCostCents } from '../src/sim/breeds-hatch';
import { fmtMoney, fmtTimeToAfford } from '../src/ui/format';
import { bbFallbackActive, BREED_IDS } from '../src/ui/breeds-adapter';
import { flagOnBalance, flagOffBalance, stateWith, breeds } from './fixtures/breeds-prB/setup';

const b = flagOnBalance(), F = 30, RATE = 100; // 100 ¢/s
const goal = (s: ReturnType<typeof stateWith>, bb = b): Goal => selectGoal(s, bb, RATE);
const ser = (g: Goal) => JSON.stringify(g);
const flockFull = breeds({ owned: Object.fromEntries(BREED_IDS.map(id => [id, { stars: 2 }])) });

describe('BR-AC23c byte-identical strip', () => {
  it('flag off: same object and same serialisation as BB-5 on 0, fallback forced on', () => {
    const bo = flagOffBalance(), s = stateWith(bo, F, breeds()), g = goal(s, bo);
    const out = breedsStripGoal(g, s, bo, RATE, true); expect(out).toBe(g); expect(ser(out)).toBe(ser(goal(s, bo)));
  });
  it('flock complete: identity even in the fallback branch', () => {
    const s = stateWith(b, F, flockFull, { coinsCents: 1e15 }), g = goal(s); expect(breedsStripGoal(g, s, b, RATE, true)).toBe(g);
  });
  it('any meaningful row offered (no fallback): identity (BB-5 target wins)', () => {
    const s = stateWith(b, F, breeds(), { coinsCents: 1e15 }), g = goal(s); expect(breedsStripGoal(g, s, b, RATE, false)).toBe(g);
  });
  it('incubator busy / below unlock / nothing eligible: identity', () => {
    for (const s of [
      stateWith(b, F, breeds({ incubator: { breed: 'leghorn', remainingMs: 1000, costCents: 1 } }), { coinsCents: 1e15 }),
      stateWith(b, 9, breeds(), { coinsCents: 1e15 }),
      stateWith(b, F, breeds({ freeHatchUsed: 0, owned: { leghorn: { stars: 2 }, sussex: { stars: 2 }, orpington: { stars: 2 } } }), { coinsCents: 1e15 }),
    ]) { const g = goal(s); expect(breedsStripGoal(g, s, b, RATE, true)).toBe(g); }
  });
  it('M5.0 stopgap (adapter stub, #100 unmerged): fallback is never active, so the strip is unchanged', () => {
    const s = stateWith(b, F, breeds(), { coinsCents: 1e15 }), g = goal(s);
    expect(bbFallbackActive(s, b)).toBe(false); expect(breedsStripGoal(g, s, b, RATE)).toBe(g);
  });
});

describe('BR-AC23b Hatch target in the fallback branch', () => {
  it('affordable: "Hatch · $X" from the sim cost, ready, no ★ / parts', () => {
    const s0 = stateWith(b, F, breeds()), cost = hatchCostCents(s0, b), s = { ...s0, coinsCents: cost };
    const out = breedsStripGoal(goal(s), s, b, RATE, true) as BreedsGoal;
    expect(out.label).toBe(`Hatch · ${fmtMoney(cost)}`); expect(out.state).toBe('ready'); expect(out.breedsTarget).toBe('hatch');
    expect(out.parts).toBeUndefined(); expect(out.label).not.toContain('★'); expect(out.key).toBeNull(); expect(out.costCents).toBe(cost);
  });
  it('unaffordable at cost − 1¢: BB-5 countdown "Hatch · in …", not a static price', () => {
    const s0 = stateWith(b, F, breeds()), cost = hatchCostCents(s0, b), s = { ...s0, coinsCents: cost - 1 - RATE * 12 };
    const out = breedsStripGoal(goal(s), s, b, RATE, true) as BreedsGoal;
    expect(out.label).toBe(`Hatch · in ${fmtTimeToAfford((cost - s.coinsCents) / RATE)}`); expect(out.state).toBe('waiting');
    expect(out.label).not.toContain('$');
  });
  it('no income: noincome, "Hatch · in —"', () => {
    const s = stateWith(b, F, breeds(), { coinsCents: 0 }); const out = breedsStripGoal(selectGoal(s, b, 0), s, b, 0, true) as BreedsGoal;
    expect(out.state).toBe('noincome'); expect(out.label).toBe('Hatch · in —');
  });
  it('free hatch still unused: "Hatch · Free" at 0¢ (sim charges 0)', () => {
    const s = stateWith(b, F, breeds({ freeHatchUsed: 0 }), { coinsCents: 0 }); const out = breedsStripGoal(goal(s), s, b, RATE, true) as BreedsGoal;
    expect(out.label).toBe('Hatch · Free'); expect(out.costCents).toBe(0); expect(out.state).toBe('ready');
  });
  it('cost is recomputed every frame (follows income / Farm)', () => {
    const s1 = stateWith(b, F, breeds()), s2 = stateWith(b, F + 5, breeds());
    const a = breedsStripGoal(goal(s1), s1, b, RATE, true) as BreedsGoal, c = breedsStripGoal(goal(s2), s2, b, RATE, true) as BreedsGoal;
    expect(a.costCents).toBe(hatchCostCents(s1, b)); expect(c.costCents).toBe(hatchCostCents(s2, b));
  });
  it('has its own aria sentence (goalAria needs a status slot it does not have)', () => {
    const s = stateWith(b, F, breeds(), { coinsCents: 1e15 }); const out = breedsStripGoal(goal(s), s, b, RATE, true) as BreedsGoal;
    expect(out.aria).toMatch(/^Next goal: Hatch, /);
  });
});
