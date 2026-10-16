// S2-4a / S2-4b (playtest session 2): greyed taps never spend or save; the UI tick keeps running when rAF stalls.
import { describe, it, expect, vi } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { farmCost, collectionCost } from '../src/sim/state';
import { tryDispatch, wouldApply } from '../src/ui/tap-guard';
import { RenderPump } from '../src/ui/render-pump';
import { mem } from './helpers';

const SAVE = 'eggfarm.save';
const atL11 = (coinsCents: number) => {
  const kv = mem(); let t = 1_000_000; const g = new Game(b, kv, () => t);
  g.state = { ...g.state, farmLevel: 11, collectionLevel: 9, coinsCents, basket: 0,
    workers: { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 }, hawker: { energy: 100, cdS: 0 } } };
  g.save(); t += 5000; return { g, kv, tick: (ms: number) => { t += ms; } };
};

describe('S2-4a: tapping a greyed (unaffordable) control', () => {
  const cost = farmCost(11, b) * 100;
  it('greyed Farm L12: no dispatch, money, level and save unchanged', () => {
    const { g, kv } = atL11(cost - 89_300); const spy = vi.spyOn(g, 'dispatch');
    const before = { ...g.state }, saved = kv.getItem(SAVE);
    expect(tryDispatch(g, { type: 'buyFarm' }, b)).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    expect(g.state).toEqual(before); expect(g.state.coinsCents).toBe(cost - 89_300); expect(g.state.farmLevel).toBe(11);
    expect(kv.getItem(SAVE)).toBe(saved);
  });
  it('every greyed control in the sheet is a no-op on money and save (collection, hire, tier, manage, manage all, sell, sell all)', () => {
    const { g, kv } = atL11(100); const saved = kv.getItem(SAVE), before = { ...g.state };
    for (const a of [{ type: 'buyCollection' }, { type: 'buyFarm' }, { type: 'hire', worker: 'grader' }, { type: 'buyGraderTier' },
      { type: 'manage', worker: 'market_hand' }, { type: 'manageAll' }, { type: 'sell', customerId: 999 }, { type: 'sellAll' }] as const)
      expect(tryDispatch(g, a as any, b), a.type).toBe(false);
    expect(g.state).toEqual(before); expect(kv.getItem(SAVE)).toBe(saved);
  });
  it('a button drawn greyed but affordable NOW buys exactly once at the listed price (stale DOM no longer decides)', () => {
    const { g, kv } = atL11(cost + 26_800);
    expect(wouldApply(g.state, { type: 'buyFarm' }, b)).toBe(true);
    expect(tryDispatch(g, { type: 'buyFarm' }, b)).toBe(true);
    expect(g.state.farmLevel).toBe(12); expect(g.state.coinsCents).toBe(26_800);
    expect(JSON.parse(kv.getItem(SAVE)!).state.coinsCents).toBe(26_800); // purchase saved immediately
  });
  it('money only ever drops through a purchase, hire or wage (no other path lowers coins over 60 s of play)', () => {
    const { g } = atL11(cost - 50_000); const ev: any[] = []; g.on(e => ev.push(e));
    let prev = g.state.coinsCents;
    for (let i = 0; i < 600; i++) { g.debugAdvance(100); const d = g.state.coinsCents - prev; prev = g.state.coinsCents;
      if (d < 0) expect(-d).toBeLessThanOrEqual(ev.filter(e => e.type === 'wage').reduce((a, e) => a + e.cents, 0)); ev.length = 0; }
    expect(collectionCost(9, b)).toBeGreaterThan(0);
  });
});

describe('S2-4b: the UI (header + open sheet) refreshes while rAF is stalled', () => {
  const env = () => { let now = 0; const timers: { cb: () => void; ms: number; at: number }[] = []; const rafs: (() => void)[] = [];
    return { now: () => now, raf: (cb: () => void) => rafs.push(cb), setInterval: (cb: () => void, ms: number) => timers.push({ cb, ms, at: ms }),
      advance(ms: number, rafWorks: boolean) { const end = now + ms;
        while (now < end) { now += 16; if (rafWorks) { const q = rafs.splice(0); q.forEach(f => f()); } for (const t of timers) while (t.at <= now) { t.at += t.ms; t.cb(); } } } }; };
  it('rAF running: ticks every frame; timer adds nothing extra', () => {
    const e = env(); let n = 0; new RenderPump(() => n++, e).start(); e.advance(1000, true);
    expect(n).toBeGreaterThanOrEqual(60); expect(n).toBeLessThanOrEqual(64);
  });
  it('rAF stalled (occluded/throttled window): the fallback keeps ticking at >= 3 Hz', () => {
    const e = env(); let n = 0; new RenderPump(() => n++, e).start(); e.advance(85_000, false);
    expect(n).toBeGreaterThanOrEqual(85 * 3);
  });
  it('the sheet shows live money: a render tick after 85 s of stalled rAF reflects the sim, not the value from when it stalled', () => {
    const { g } = atL11(131_800); g.state = { ...g.state, basket: 3000, nextCustomerInS: 0.1 };
    const e = env(); let shown = -1; new RenderPump(() => { g.debugAdvance(250); shown = g.state.coinsCents; }, e).start();
    e.advance(85_000, false);
    expect(shown).toBe(g.state.coinsCents); expect(shown).toBeGreaterThan(131_800 + 100_000);
  });
  it('a throwing render does not kill the loop', () => {
    const e = env(); let n = 0; const errs: unknown[] = [];
    new RenderPump(() => { n++; if (n === 3) throw new Error('boom'); }, { ...e, onError: x => errs.push(x) }).start(); e.advance(500, true);
    expect(errs.length).toBe(1); expect(n).toBeGreaterThan(20);
  });
});
