// Hire2/v5-clockwage seam S1/S2 (tick.ts workerActions; agreed with Saves, Architect review pending): clock wage through step().
// failure-cost v0.3.24 AC-FC1/2/3/7a(event shape)/18/19.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import type { SimEvent } from '../src/sim/events';
const flags = (o: Record<string, number>) => ({ ...b, m4: { ...b.m4!, enabled: 1, flags: { ...b.m4!.flags, ...o } } }) as typeof b;
const C = flags({ clockWage: 1 }), CP = flags({ clockWage: 1, pause: 1 });
const DT = 1 / b.tickHz;
const st = (o: Partial<GameState>): GameState => ({ ...initialState(b, 1), customers: [], nextCustomerInS: 1e9, farmLevel: 12, coinsCents: 100_000, coop: 0, ...o }) as GameState;
const wages = (ev: SimEvent[]) => ev.filter(e => e.type === 'wage');
const runN = (s: GameState, n: number, bb: typeof b, ev: SimEvent[]) => { for (let i = 0; i < n; i++) s = step(s, DT, bb, ev); return s; };

describe('[S2 / AC-FC7a] flag off: wage event shape byte-identical', () => {
  it('a Working MH wage event is exactly {type, worker, cents} with clockWage = 0, and carries state with clockWage = 1', () => {
    const s = st({ workers: { market_hand: { energy: 100, cdS: 0.05 } } });
    const off: SimEvent[] = []; step(s, DT, b, off);
    const w0 = wages(off)[0]!; expect(Object.keys(w0)).toEqual(['type', 'worker', 'cents']); expect(JSON.stringify(w0)).toBe('{"type":"wage","worker":"market_hand","cents":5}');
    const on: SimEvent[] = []; step(s, DT, C, on); expect(wages(on)[0]).toEqual({ type: 'wage', worker: 'market_hand', cents: 5, state: 'working' });
  });
  it('flag off: an Asleep MH is charged nothing and its cdS stays frozen', () => {
    const ev: SimEvent[] = []; const s = runN(st({ workers: { market_hand: { energy: 0, cdS: 0.5 } } }), 100, b, ev);
    expect(wages(ev)).toHaveLength(0); expect(s.workers.market_hand!.cdS).toBe(0.5);
  });
});
describe('[S1] clock wage through step()', () => {
  it('AC-FC1: MH 120 charges / 600 cents in 120 s, state asleep, no sales', () => {
    const ev: SimEvent[] = []; const s = runN(st({ workers: { market_hand: { energy: 0, cdS: 0.5 } } }), 1200, C, ev);
    expect(wages(ev)).toHaveLength(120); expect(wages(ev).every(e => e.type === 'wage' && e.state === 'asleep')).toBe(true);
    expect(100_000 - s.coinsCents).toBe(600); expect(ev.some(e => e.type === 'sell')).toBe(false);
  });
  it('AC-FC2: CH 60 charges / 1,200 cents, no collecting', () => {
    const ev: SimEvent[] = []; const s = runN(st({ coop: 50, workers: { coop_hand: { energy: 0, cdS: 1.0 } } }), 1200, C, ev);
    expect(wages(ev)).toHaveLength(60); expect(100_000 - s.coinsCents).toBe(1200); expect(ev.some(e => e.type === 'worker_collect')).toBe(false);
  });
  it('both asleep in one step: both charged (ws synced to the whole workers object)', () => {
    const ev: SimEvent[] = []; const s = runN(st({ workers: { market_hand: { energy: 0, cdS: 1 }, coop_hand: { energy: 0, cdS: 2 } } }), 20, C, ev);
    expect(wages(ev).map(e => e.type === 'wage' && e.worker)).toEqual(['market_hand', 'coop_hand', 'market_hand']);
    expect(s.workers.market_hand!.cdS).toBeCloseTo(1, 9); expect(s.workers.coop_hand!.cdS).toBeCloseTo(2, 9);
  });
  it('AC-FC3: a paused asleep MH is charged 0', () => {
    const ev: SimEvent[] = []; runN(st({ farmLevel: 12, workers: { market_hand: { energy: 0, cdS: 0.5, paused: true } } }), 1200, CP, ev);
    expect(wages(ev)).toHaveLength(0);
  });
  it('AC-FC18b: wake by Refill keeps cdS; first Working action at +0.4 s', () => {
    let s = st({ customers: [{ id: 1, demand: 99, filled: 0, waitedS: 0 }], basket: 50, workers: { market_hand: { energy: 0, cdS: 0.4 } } });
    s = { ...s, workers: { market_hand: { ...s.workers.market_hand!, energy: 100 } } };
    expect(s.workers.market_hand!.cdS).toBe(0.4);
    const ev: SimEvent[] = []; const at: number[] = [];
    for (let i = 1; i <= 14; i++) { const n = ev.length; s = step(s, DT, C, ev); if (ev.slice(n).some(e => e.type === 'wage')) at.push(i); }
    expect(at).toEqual([4, 14]);
  });
  it('AC-FC18c: 11 Asleep↔Working toggles → exactly 120 charges', () => {
    const ev: SimEvent[] = []; let s = st({ workers: { market_hand: { energy: 0, cdS: 0.5 } } });
    for (let i = 1; i <= 1200; i++) { if (i > 1 && (i - 1) % 100 === 0) s = { ...s, workers: { market_hand: { ...s.workers.market_hand!, energy: s.workers.market_hand!.energy > 0 ? 0 : 100 } } }; s = step(s, DT, C, ev); }
    expect(wages(ev)).toHaveLength(120);
  });
  it('AC-FC19 a/b/c: reserve counts only energy > 0; resumed asleep CH is re-billed in the same step', () => {
    const ch = { energy: 0, cdS: 0, unpaid: true };
    expect(step(st({ coinsCents: 899, workers: { market_hand: { energy: 80, cdS: 5 }, coop_hand: ch } }), DT, C).workers.coop_hand!.unpaid).toBe(true);
    expect(step(st({ coinsCents: 900, workers: { market_hand: { energy: 80, cdS: 5 }, coop_hand: ch } }), DT, C).workers.coop_hand!.unpaid).toBe(false);
    expect(step(st({ coinsCents: 599, workers: { market_hand: { energy: 0, cdS: 5 }, coop_hand: ch } }), DT, C).workers.coop_hand!.unpaid).toBe(true);
    const r = step(st({ coinsCents: 600, workers: { market_hand: { energy: 0, cdS: 5 }, coop_hand: ch } }), DT, C);
    expect(r.workers.coop_hand!.unpaid).toBe(false); expect(r.coinsCents).toBe(580); expect(r.workers.coop_hand!.cdS).toBe(2);
  });
  it('AC-FC19d: back to Unpaid within 40 s, coins never negative', () => {
    let s = st({ coinsCents: 600, workers: { market_hand: { energy: 0, cdS: 0.1 }, coop_hand: { energy: 0, cdS: 0, unpaid: true } } }); // MH charging from the start (15 cents/s, spec 600 ÷ 15)
    let flip = -1;
    for (let i = 1; i <= 500; i++) { s = step(s, DT, C); expect(s.coinsCents).toBeGreaterThanOrEqual(0); if (i > 1 && s.workers.coop_hand!.unpaid && flip < 0) flip = i; }
    expect(flip).toBeGreaterThan(0); expect((flip - 1) * DT).toBeLessThanOrEqual(40 + 1e-9); // resume is on step 1
  });
});
