// Hire2/v5-clockwage S4 (D-HOE-57 amendment: Hire 2 owns session_end.asleep_s) reworked per Architect review e432b209:
// M3 / ruling 4: sim-state asleep clock (one writer tickAsleepClock, one predicate asleepClockOn, integer ms, session field never saved,
// reset on session end); M4: mood 'asleep' only (Unpaid excluded); M2 / ruling 2: AC-FC12 window in the saved key clockWageWindow,
// reset at welcome-back close (also when Y = 0). failure-cost v0.3.24 AC-FC12 / AC-FC15.
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { balance as b } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { serialize, validate, checksum, SAVE_KEY } from '../src/save/save';
import { m5Load, m5Persist } from '../src/save/m5-fields';
import { M5_SAVED_FIELDS, M5_SESSION_FIELDS } from '../src/sim/m5-state';
import { asleepClockOn, tickAsleepClock, asleepSessionEnd, resetAsleepSession, clockWageWindowView } from '../src/sim/clock-wage';
import * as sessionSim from '../src/sim/session';
import { stubAutoRefillOn } from '../src/sim/auto-refill-on';
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
    expect(tickAsleepClock(s, 100, b)).toBe(s); expect(asleepClockOn(s, b)).toBe(false);
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
  it('session_end merges present_* (breeds #125) and asleep_* (clockWage); each family stays behind its own flag', () => {
    const both = flags({ clockWage: 1, breeds: 1 });
    const { g, tick } = boot(both, { energy: 0, cdS: 0.5 }); tick(120_000);
    g.state = { ...g.state, breedsCalm: { focusMs: 0, stamps: [], pendingCount: 0, activeMs: 12_300, lostCount: 3, open: true } };
    const e = end(g);
    expect(e).toEqual(expect.objectContaining({ asleep_s: 120, wage_paid_asleep_cents: 600, present_active_s: 12.3, present_lost_count: 3 }));
    const cwOnly = end(boot(C, { energy: 0, cdS: 0.5 }).g);
    expect('present_active_s' in cwOnly).toBe(false); expect('present_lost_count' in cwOnly).toBe(false);
    const brOnly = flags({ breeds: 1 });
    const { g: gb } = boot(brOnly, { energy: 0, cdS: 0.5 });
    gb.state = { ...gb.state, breedsCalm: { focusMs: 0, stamps: [], pendingCount: 0, activeMs: 12_300, lostCount: 3, open: true } };
    const eb = end(gb);
    expect(eb).toEqual(expect.objectContaining({ present_active_s: 12.3, present_lost_count: 3 }));
    expect('asleep_s' in eb).toBe(false); expect('wage_paid_asleep_cents' in eb).toBe(false);
  });
  it('dropped hidden sim (>= offlineMinSeconds) is a rotation (counters reset); a short kept hidden period counts and does not reset', () => {
    const d = boot(C, { energy: 0, cdS: 0.5 }); d.tick(10_000);
    d.g.onHidden(); d.at(b.offline.offlineMinSeconds * 1000 + 5_000); d.g.frame(); d.g.onShown();
    expect('asleepSessionMs' in d.g.state).toBe(false);
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

describe('[D-HOE-61 / G0 rev 10 §11] emission OR; counted set is always MH+CH', () => {
  afterEach(() => stubAutoRefillOn(null));

  it('stub autoRefillOn=true, clockWage off: tickAsleepClock accumulates asleep_s, charges no wages, no window', () => {
    stubAutoRefillOn(() => true);
    const bb = flags({ autoRefill: 1, clockWage: 0 });
    const s0 = st({ workers: { market_hand: { energy: 0, cdS: 0.5 } } });
    expect(asleepClockOn(s0, bb)).toBe(true);
    const s = runN(s0, 1200, bb);
    expect(s.asleepSessionMs).toBe(120_000);
    expect(asleepSessionEnd(s, bb)).toEqual({ asleep_s: 120 });
    expect(s.coinsCents).toBe(s0.coinsCents);
    expect('clockWageWindow' in s).toBe(false);
    expect('asleepPaidCents' in s).toBe(false);
  });

  it('stub autoRefillOn=false, clockWage off, M5 off: unchanged (identity, no field)', () => {
    stubAutoRefillOn(() => false);
    const s = st({ workers: { market_hand: { energy: 0, cdS: 0.5 } } });
    expect(tickAsleepClock(s, 100, b)).toBe(s);
    expect(asleepClockOn(s, b)).toBe(false);
    const r = runN(s, 100, b);
    expect('asleepSessionMs' in r).toBe(false);
    expect(asleepSessionEnd(r, b)).toEqual({});
  });

  it('counted set is always unpaused asleep MH+CH (clockWage off; only MH autoRefillOn): both count', () => {
    stubAutoRefillOn((_s, id) => id === 'market_hand');
    const bb = flags({ autoRefill: 1, clockWage: 0 });
    const s = st({ workers: { market_hand: { energy: 0, cdS: 0.5 }, coop_hand: { energy: 0, cdS: 0.5 } } });
    const r = tickAsleepClock(s, 1000, bb);
    expect(r.asleepSessionMs).toBe(2000); // both, not just MH
    expect(asleepSessionEnd(r, bb)).toEqual({ asleep_s: 2 });
  });

  it('G0 §11: autoRefill=1 (stub) and clockWage=0, an asleep Hawker or Grader adds 0 and asleep_s is still emitted', () => {
    stubAutoRefillOn(() => true);
    const bb = flags({ autoRefill: 1, clockWage: 0 });
    for (const id of ['hawker', 'grader'] as const) {
      const s0 = st({ workers: { [id]: { energy: 0, cdS: 0.5 } }, graderTier: 1 });
      const r = tickAsleepClock(s0, 10_000, bb);
      expect(r).toBe(s0);
      expect('asleepSessionMs' in r).toBe(false);
      expect(asleepSessionEnd(r, bb)).toEqual({ asleep_s: 0 });
      expect('wage_paid_asleep_cents' in asleepSessionEnd(r, bb)).toBe(false);
    }
  });

  it('paused and Unpaid still add nothing when autoRefillOn is true', () => {
    stubAutoRefillOn(() => true);
    const P = flags({ clockWage: 0, pause: 1, autoRefill: 1 });
    expect(tickAsleepClock(st({ workers: { market_hand: { energy: 0, cdS: 0.5, paused: true } } }), 1000, P).asleepSessionMs).toBeUndefined();
    expect(tickAsleepClock(st({ workers: { coop_hand: { energy: 0, cdS: 0, unpaid: true } } }), 1000, P).asleepSessionMs).toBeUndefined();
  });

  it('tickAsleepClock is the single writer of asleepSessionMs in src/', () => {
    const root = join(__dirname, '../src');
    const files: string[] = [];
    const walk = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.ts')) files.push(p);
      }
    };
    walk(root);
    const writes: string[] = [];
    for (const f of files) {
      readFileSync(f, 'utf8').split('\n').forEach((row, i) => {
        if (!/asleepSessionMs\s*:/.test(row) && !/asleepSessionMs\s*=[^=]/.test(row)) return;
        if (/^\s*(\/\/|\*|\/\*)/.test(row)) return;
        if (/asleepSessionMs\?:/.test(row)) return; // type
        if (/asleepSessionMs:\s*_/.test(row)) return; // destructure drop
        if (/\((?:s|out)\.asleepSessionMs\s*\?\?/.test(row) && !/\+\s*dtMs/.test(row)) return; // read
        if (/'asleepSessionMs'/.test(row)) return;
        const rel = f.slice(root.length + 1);
        if (rel === 'sim/clock-wage.ts' && /\(out\.asleepSessionMs\s*\?\?\s*0\)\s*\+\s*dtMs/.test(row)) return; // the one writer
        writes.push(`${rel}:${i + 1}:${row.trim()}`);
      });
    }
    const cw = readFileSync(join(root, 'sim/clock-wage.ts'), 'utf8');
    expect(cw).toMatch(/export function tickAsleepClock\(s: GameState, dtMs: number, b: Balance\)/);
    expect(cw).toMatch(/asleepSessionMs:\s*\(out\.asleepSessionMs\s*\?\?\s*0\)\s*\+\s*dtMs/);
    expect(writes).toEqual([]);
  });
});

describe('[session rotation] resetSessionFields hook', () => {
  const boot = (bb: typeof b, mh: object) => {
    let t = 1_760_000_000_000; const g = new Game(bb, kvOf(), () => t, 1, 'dev', null, null, { idbBoot: 'absent' });
    g.state = { ...g.state, farmLevel: 12, coinsCents: 100_000, customers: [], nextCustomerInS: 1e9, workers: { market_hand: mh } } as GameState;
    return { g, tick: (ms: number) => { for (let i = 0; i < ms / 500; i++) { t += 500; g.frame(); } }, at: (ms: number) => { t += ms; } };
  };

  it('resetSessionFields in place clears asleep counters; no-op (same keys) when absent', () => {
    const s = runN(st({ workers: { market_hand: { energy: 0, cdS: 0.5 } } }), 20, C);
    expect(s.asleepSessionMs).toBeGreaterThan(0);
    const orig = s;
    sessionSim.resetSessionFields(s);
    expect(s).toBe(orig);
    expect('asleepSessionMs' in s).toBe(false);
    expect('asleepPaidCents' in s).toBe(false);
    const empty = st({});
    sessionSim.resetSessionFields(empty);
    expect('asleepSessionMs' in empty).toBe(false);
  });

  it('asleep totals reset once per rotation (hide >= session_hidden_end_s then shown)', () => {
    const { g, tick, at } = boot(C, { energy: 0, cdS: 0.5 });
    tick(10_000);
    expect(g.state.asleepSessionMs).toBe(10_000);
    const sid = g.telemetry.clock.sid;
    g.onHidden(); at(60_000); g.frame(); g.onShown();
    expect(g.telemetry.clock.sid).not.toBe(sid);
    expect('asleepSessionMs' in g.state).toBe(false);
    expect('asleepPaidCents' in g.state).toBe(false);
    const ends = g.telemetry.events().filter(e => e.type === 'session_end');
    expect(ends).toHaveLength(1);
    expect(ends[0]).toEqual(expect.objectContaining({ asleep_s: expect.any(Number), wage_paid_asleep_cents: expect.any(Number) }));
    expect(ends[0].asleep_s).toBeGreaterThanOrEqual(10);
    // A second rotation resets once more (still empty, and only one additional session_end).
    const sid2 = g.telemetry.clock.sid;
    g.onHidden(); at(60_000); g.frame(); g.onShown();
    expect(g.telemetry.clock.sid).not.toBe(sid2);
    expect('asleepSessionMs' in g.state).toBe(false);
    expect(g.telemetry.events().filter(e => e.type === 'session_end')).toHaveLength(2);
  });

  it('hide under 60 s does not reset asleep totals and does not rotate', () => {
    const { g, tick, at } = boot(C, { energy: 0, cdS: 0.5 });
    tick(10_000);
    const sid = g.telemetry.clock.sid;
    g.onHidden(); at(5_000); g.onShown();
    expect(g.telemetry.clock.sid).toBe(sid);
    expect(g.state.asleepSessionMs).toBe(15_000);
    expect(g.telemetry.events().filter(e => e.type === 'session_end')).toHaveLength(0);
  });
});
