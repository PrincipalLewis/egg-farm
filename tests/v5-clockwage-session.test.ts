// Hire2/v5-clockwage S4 (D-HOE-57 amendment: Hire 2 owns session_end.asleep_s) reworked per Architect review e432b209:
// M3 / ruling 4: sim-state asleep clock (one writer tickAsleepClock, one predicate asleepClockOn, integer ms, session field never saved,
// reset on session end); M4: mood 'asleep' only (Unpaid excluded); M2 / ruling 2: AC-FC12 window in the saved key clockWageWindow,
// reset at welcome-back close (also when Y = 0). failure-cost v0.3.24 AC-FC12 / AC-FC15.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { serialize, validate, checksum, SAVE_KEY } from '../src/save/save';
import { m5Load, m5Persist } from '../src/save/m5-fields';
import { M5_SAVED_FIELDS, M5_SESSION_FIELDS } from '../src/sim/m5-state';
import { asleepClockOn, tickAsleepClock, asleepSessionEnd, resetAsleepSession, clockWageWindowView } from '../src/sim/clock-wage';
import { Game } from '../src/game';
import { mem } from './helpers';
const flags = (o: Record<string, number>) => ({ ...b, m4: { ...b.m4!, enabled: 1, flags: { ...b.m4!.flags, ...o } } }) as typeof b;
const C = flags({ clockWage: 1 }), CP = flags({ clockWage: 1, pause: 1 });
const DT = 1 / b.tickHz;
const st = (o: Partial<GameState>): GameState => ({ ...initialState(b, 1), customers: [], nextCustomerInS: 1e9, farmLevel: 12, coinsCents: 100_000, coop: 0, ...o }) as GameState;
const runN = (s: GameState, n: number, bb: typeof b) => { for (let i = 0; i < n; i++) s = step(s, DT, bb); return s; };
const kvOf = () => { const kv = mem() as any; kv.removeItem = (k: string) => kv.m.delete(k); return kv; };

describe('[S4 / ruling 4] asleep clock in sim state', () => {
  it('clockWage = 1: 120 s Asleep MH -> asleepSessionMs 120000 (integer), asleep_s 120, wage_paid_asleep_cents 600; rc2Refill 0/1 alike', () => {
    for (const r of [0, 1]) { const bb = flags({ clockWage: 1, rc2Refill: r });
      const s = runN(st({ workers: { market_hand: { energy: 0, cdS: 0.5 } } }), 1200, bb);
      expect(s.asleepSessionMs).toBe(120_000); expect(Number.isInteger(s.asleepSessionMs)).toBe(true);
      expect(asleepSessionEnd(s, bb)).toEqual({ asleep_s: 120, wage_paid_asleep_cents: 600 }); }
  });
  it('flag off: identity (same object), no field, session_end payload {}', () => {
    const s = st({ workers: { market_hand: { energy: 0, cdS: 0.5 } } });
    expect(tickAsleepClock(s, 100, b)).toBe(s); expect(asleepClockOn(b)).toBe(false);
    const r = runN(s, 100, b); expect('asleepSessionMs' in r).toBe(false); expect('clockWageWindow' in r).toBe(false); expect(asleepSessionEnd(r, b)).toEqual({});
  });
  it('paused Asleep MH adds nothing', () => {
    expect(runN(st({ workers: { market_hand: { energy: 0, cdS: 0.5, paused: true } } }), 300, CP).asleepSessionMs).toBeUndefined();
  });
  it('[M4] Unpaid (energy 0) adds nothing: only mood asleep counts', () => {
    const s = runN(st({ coinsCents: 0, workers: { coop_hand: { energy: 0, cdS: 0, unpaid: true } } }), 300, C);
    expect(s.workers.coop_hand!.unpaid).toBe(true); expect(s.asleepSessionMs).toBeUndefined(); expect(s.clockWageWindow).toBeUndefined();
  });
  it('session field is never saved (M5_SESSION_FIELDS) and resetAsleepSession clears it', () => {
    expect(M5_SESSION_FIELDS).toEqual(expect.arrayContaining(['asleepSessionMs', 'asleepPaidCents']));
    const s = runN(st({ workers: { market_hand: { energy: 0, cdS: 0.5 } } }), 20, C);
    expect('asleepSessionMs' in m5Persist(s)).toBe(false); expect('asleepSessionMs' in resetAsleepSession(s)).toBe(false);
  });
});

describe('[S4] Game: session_end, dropped hidden sim, reset at session end', () => {
  const boot = (bb: typeof b, mh: object) => {
    let t = 1_760_000_000_000; const g = new Game(bb, kvOf(), () => t, 1, 'dev', null, null, { idbBoot: 'absent' });
    g.state = { ...g.state, farmLevel: 12, coinsCents: 100_000, customers: [], nextCustomerInS: 1e9, workers: { market_hand: mh } } as GameState;
    return { g, tick: (ms: number) => { for (let i = 0; i < ms / 500; i++) { t += 500; g.frame(); } }, at: (ms: number) => { t += ms; } };
  };
  const end = (g: Game) => { g.endSession(); return g.telemetry.events().filter(e => e.type === 'session_end').at(-1) as Record<string, unknown>; };
  it('session_end carries asleep_s + wage_paid_asleep_cents with clockWage = 1, neither with 0; counters restart after session_end', () => {
    const { g, tick } = boot(C, { energy: 0, cdS: 0.5 }); tick(120_000); const e = end(g);
    expect(e.asleep_s).toBe(120); expect(e.wage_paid_asleep_cents).toBe(600); expect(g.state.asleepSessionMs).toBeUndefined();
    const off = boot(b, { energy: 0, cdS: 0.5 }); off.tick(10_000); const e0 = end(off.g);
    expect('asleep_s' in e0).toBe(false); expect('wage_paid_asleep_cents' in e0).toBe(false);
  });
  it('dropped hidden sim (>= offlineMinSeconds) adds nothing; a short kept hidden period counts', () => {
    const d = boot(C, { energy: 0, cdS: 0.5 }); d.tick(10_000);
    d.g.onHidden(); d.at(b.offline.offlineMinSeconds * 1000 + 5_000); d.g.frame(); d.g.onShown(); expect(d.g.state.asleepSessionMs).toBe(10_000);
    const k = boot(C, { energy: 0, cdS: 0.5 }); k.tick(10_000); k.g.onHidden(); k.at(5_000); k.g.onShown(); expect(k.g.state.asleepSessionMs).toBe(15_000);
  });
});

describe('[M2 / ruling 2] clockWageWindow: saved, survives reload, resets at welcome-back close', () => {
  it('registered once in M5_SAVED_FIELDS', () => { expect(M5_SAVED_FIELDS.filter(f => f === 'clockWageWindow')).toHaveLength(1); });
  it('AC-FC12: 2:00 of CH Asleep, save, reload -> view "2:00 / $12"; offline adds 0', () => {
    const kv = kvOf(); let t = 1_760_000_000_000;
    const g = new Game(C, kv, () => t, 1, 'dev', null, null, { idbBoot: 'absent' });
    g.state = { ...g.state, farmLevel: 12, coinsCents: 100_000, customers: [], nextCustomerInS: 1e9, workers: { coop_hand: { energy: 0, cdS: 1 } } } as GameState;
    for (let i = 0; i < 240; i++) { t += 500; g.frame(); } g.save();
    t += 10 * 60_000; const g2 = new Game(C, kv, () => t, 1, 'dev', null, null, { idbBoot: 'absent' });
    expect(clockWageWindowView(g2.state).coop_hand).toEqual({ asleepS: 120, cents: 1200 });
    expect(g2.state.pendingOfflineEggs).toBeGreaterThanOrEqual(0);
  });
  it('collectOffline and dismissOffline reset it (also when Y = 0); identity with clockWage off', () => {
    const s = { ...st({}), clockWageWindow: { coop_hand: { asleepMs: 5000, cents: 0 } } } as GameState;
    for (const type of ['collectOffline', 'dismissOffline'] as const) expect('clockWageWindow' in apply(s, { type }, C)).toBe(false);
    expect(apply(s, { type: 'dismissOffline' }, b).clockWageWindow).toEqual(s.clockWageWindow);
  });
  const raw = (v: number, state: object) => { const j = JSON.stringify(state); return `{"version":${v},"savedAt":1,"sum":"${checksum(j)}","state":${j}}`; };
  const load = (r: string, bb: typeof b) => { const v = validate(r, bb); if (!v.ok) throw new Error(v.reason); return m5Load(v.file.state, bb, 1, []); };
  it('red-first round-trip: v5 save (no key) -> absent; v6 with a window -> kept exactly', () => {
    const { wageFracCents: _w, ...v5 } = initialState(b, 3) as any; expect('clockWageWindow' in load(raw(5, v5), C)).toBe(false);
    const win = { market_hand: { asleepMs: 61_000, cents: 300 }, coop_hand: { asleepMs: 120_000, cents: 1200 } };
    const s1 = load(serialize({ ...initialState(b, 3), clockWageWindow: win }, 2), C); expect(s1.clockWageWindow).toEqual(win);
    expect(load(serialize(s1, 3), C).clockWageWindow).toEqual(win);
  });
  it.each([
    ['not an object', 'x', undefined], ['array', [1], undefined], ['negative ms', { coop_hand: { asleepMs: -1, cents: 0 } }, undefined],
    ['float cents', { coop_hand: { asleepMs: 1, cents: 0.5 } }, undefined], ['one good entry kept', { market_hand: { asleepMs: 'a', cents: 1 }, coop_hand: { asleepMs: 2, cents: 3 } }, { coop_hand: { asleepMs: 2, cents: 3 } }],
  ])('sanitiser: %s', (_l, v, want) => {
    const s = load(serialize({ ...initialState(b, 3), clockWageWindow: v as any }, 2), C); expect(s.clockWageWindow).toEqual(want);
  });
  it('flags 0: written back verbatim (E13), even junk', () => {
    const s = load(serialize({ ...initialState(b, 3), clockWageWindow: 'junk' as any }, 2), b); expect(s.clockWageWindow).toBe('junk');
    const kv = kvOf(); kv.setItem(SAVE_KEY, serialize({ ...initialState(b, 3), clockWageWindow: { coop_hand: { asleepMs: 9, cents: 1 } } }, 1_760_000_000_000));
    const g = new Game(b, kv, () => 1_760_000_001_000, 1, 'dev', null, null, { idbBoot: 'absent' }); g.save();
    expect(kv.getItem(SAVE_KEY)).toContain('"clockWageWindow":{"coop_hand":{"asleepMs":9,"cents":1}}');
  });
});
