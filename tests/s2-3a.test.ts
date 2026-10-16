// S2-3a (decisions.md 2026-10-16 02:21; product/market/s2-3a-proposal.md MK-16..MK-22)
import { describe, it, expect } from 'vitest';
import { balance as b, validateBalance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { advance } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { save } from '../src/save/save';
import { Game } from '../src/game';
import { ServedDwell } from '../src/ui/served-dwell';
import { mem } from './helpers';

const busy = (seed = 7) => ({ ...initialState(b, seed), farmLevel: 12, collectionLevel: 9, coinsCents: 1e7, basket: 1500,
  workers: { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 }, hawker: { energy: 100, cdS: 0 } } });

/** Fraction of 100 ms frames over `secs` with a customer card on screen (waiting, or dwelling when dwellMs > 0). */
function visibility(dwellMs: number, secs = 60, seed = 7) {
  let s: any = busy(seed); const d = new ServedDwell(dwellMs); let t = 0, vis = 0, frames = 0;
  while (t < secs * 1000) {
    const ev: any[] = []; s = advance(s, 100, 0, b, ev).state; t += 100;
    for (const e of ev) { if (e.type === 'sell') d.sold(e.id, e.value); if (e.type === 'customer_served') d.served(e.id, t); }
    frames++; if (s.customers.length > 0 || (dwellMs > 0 && d.active(t).length > 0)) vis++;
  }
  return vis / frames;
}

describe('S2-3a config', () => {
  it('served_dwell_ms comes from balance data (1500) and must be > 0', () => {
    expect(b.feel.served_dwell_ms).toBe(1500);
    expect(() => validateBalance({ ...b, feel: { ...b.feel, served_dwell_ms: 0 } } as any)).toThrow(/served_dwell_ms/);
  });
});

describe('MK-16/18 ServedDwell', () => {
  it('a served card stays exactly served_dwell_ms with the coins it paid, then expires once', () => {
    const d = new ServedDwell(b.feel.served_dwell_ms); d.sold(4, 1200); d.sold(4, 350); d.served(4, 10_000);
    expect(d.active(10_000)).toEqual([{ id: 4, cents: 1550, until: 11_500 }]);
    expect(d.active(11_499).length).toBe(1);
    const gone: number[] = []; expect(d.active(11_500, x => gone.push(x.id))).toEqual([]); expect(gone).toEqual([4]);
    expect(d.active(11_600, x => gone.push(x.id))).toEqual([]); expect(gone).toEqual([4]);
  });
  it('a customer who leaves part-served never shows a Thanks card', () => {
    const d = new ServedDwell(1500); d.sold(9, 100); d.gone(9); d.served(10, 0); expect(d.active(0)[0].cents).toBe(0);
  });
});

describe('MK-20 the sim is untouched by the dwell (deterministic)', () => {
  it('same seed -> identical state and event stream whatever served_dwell_ms is', () => {
    const run = (bb: any) => { const ev: any[] = []; const r = advance(busy(3), 120_000, 0, bb, ev); return JSON.stringify([r.state, ev]); };
    expect(run({ ...b, feel: { ...b.feel, served_dwell_ms: 1 } })).toBe(run(b));
    expect(run(b)).toBe(run(b));
  });
});

describe('MK-17/21 visibility re-run (L12, 1,500 eggs, Market Hand Working)', () => {
  it('before: ~15% visible; after: >= 40% over 60 s for several seeds', () => {
    const before = visibility(0, 120), after = visibility(b.feel.served_dwell_ms, 120);
    expect(before).toBeLessThan(0.25);
    expect(after).toBeGreaterThanOrEqual(0.4);
    for (const seed of [1, 2, 3, 99]) expect(visibility(b.feel.served_dwell_ms, 60, seed), `seed ${seed}`).toBeGreaterThanOrEqual(0.4);
  });
});

describe('MK-22 first customer as soon as the player returns', () => {
  it('closing the welcome-back modal (Collect or dismiss) brings a customer on the next tick', () => {
    for (const type of ['collectOffline', 'dismissOffline'] as const) {
      const kv = mem(); save(kv, { ...initialState(b), farmLevel: 12, nextCustomerInS: 3.9 }, 0);
      const g = new Game(b, kv, () => 3_600_000); expect(g.state.pendingOfflineEggs).toBeGreaterThan(0);
      expect(g.state.nextCustomerInS).toBe(3.9); // unchanged while the modal is open
      const ev: any[] = []; g.on(e => ev.push(e)); g.dispatch({ type }); g.debugAdvance(1000 / b.tickHz);
      expect(ev.some(e => e.type === 'customer_arrive'), type).toBe(true);
    }
  });
  it('no grant pending -> timer untouched; settling a stale grant at load does not trigger it', () => {
    const s = { ...initialState(b), nextCustomerInS: 2.5 };
    expect(apply(s, { type: 'collectOffline' }, b).nextCustomerInS).toBe(2.5);
    const kv = mem(); save(kv, { ...s, pendingOfflineEggs: 50 }, 0); const g = new Game(b, kv, () => 30_000);
    expect(g.state.basket).toBe(50); expect(g.state.nextCustomerInS).toBe(2.5);
  });
});
