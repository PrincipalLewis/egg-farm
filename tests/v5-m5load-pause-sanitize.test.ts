// CCR-F4 (engineering/reviews/rcv5-vs-main-1a61b36-ccr.md F-4; D-HOE-20261030-08; QA-D-1029-V5SCAP): m5Load sanitises the Pause
// save fields `workers.{id}.paused` and `workers.market_hand.callLockoutS` (product/workers/m5-worker-pause-spec.md v1.3.6 rule 1,
// rule 7 B5 sanitiser, E2/E2b/E9/E12/E13; sizing §9.2 G3, §13 B5). D-C5 style: bad -> absent (= default), clamped to the tunable.
import { describe, it, expect } from 'vitest';
import { balance as b, validateBalance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { serialize, validate } from '../src/save/save';
import { m5Load } from '../src/save/m5-fields';
import { isPaused } from '../src/sim/pause';
import type { SimEvent } from '../src/sim/events';
const NOW = Date.UTC(2026, 9, 30, 9);
/** Pause tc columns from the CSV draft of record 8dc90e2b (tc_pause_unlock_farm 10, tc_pause_call_lockout_s 45); not in balance.json until row 4. */
const PTC = { pause_unlock_farm: 10, pause_call_lockout_s: 45 };
const PZ = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, pause: 1 }, tc: { ...b.m4!.tc!, ...PTC } } } as typeof b;
const CAP = PTC.pause_call_lockout_s;
const W = (mh: object, rest: object = {}) => ({ market_hand: { energy: 40, cdS: 0.7, ...mh }, coop_hand: { energy: 60, cdS: 1.2, ...rest } });
const st = (workers: object, farmLevel = 12): GameState => ({ ...initialState(b, 7), farmLevel, workers } as GameState);
const load = (s: GameState, bal = PZ) => { const ev: SimEvent[] = []; const o = m5Load(s, bal, NOW, ev); return { o: o as any, ev }; };

describe('[CCR-F4] m5Load sanitises Pause fields while m4.flags.pause is on (QA-D-1029-V5SCAP)', () => {
  it('[CCR-F4][B5][E2b] callLockoutS: NaN, ±Infinity, negative, null, string, object -> absent (= 0); huge -> cap; valid kept', () => {
    for (const bad of [NaN, Infinity, -Infinity, -1, -0.5, null, '30', {}, true])
      expect(load(st(W({ paused: false, callLockoutS: bad }))).o.workers.market_hand, String(bad)).toEqual({ energy: 40, cdS: 0.7, paused: false });
    for (const [v, want] of [[1e308, CAP], [Number.MAX_VALUE, CAP], [CAP + 0.001, CAP], [CAP, CAP], [30, 30], [0.25, 0.25]] as const)
      expect(load(st(W({ callLockoutS: v }))).o.workers.market_hand.callLockoutS, String(v)).toBe(want);
    expect('callLockoutS' in load(st(W({ callLockoutS: 0 }))).o.workers.market_hand).toBe(false); // absent when 0 (E9)
  });
  it('[CCR-F4][E9] paused: a non-boolean is false (absent); true and false are kept', () => {
    for (const bad of [1, 0, 'true', null, NaN, {}, []]) {
      const { o } = load(st(W({ paused: bad })));
      expect('paused' in o.workers.market_hand, String(bad)).toBe(false); expect(isPaused(o.workers.market_hand, PZ)).toBe(false);
    }
    expect(load(st(W({ paused: true }, { paused: false }))).o.workers).toEqual(W({ paused: true }, { paused: false }));
  });
  it('[CCR-F4][rule 1][E12][AC-P2] below tc_pause_unlock_farm a saved pause is cleared (not saved back as true), lockout too', () => {
    const { o } = load(st(W({ paused: true, callLockoutS: 30 }, { paused: true }), PTC.pause_unlock_farm - 1));
    expect(o.workers).toEqual(W({}, {}));
    expect(load(st(W({ paused: true, callLockoutS: 30 }), PTC.pause_unlock_farm)).o.workers.market_hand).toMatchObject({ paused: true, callLockoutS: 30 });
  });
  it('[CCR-F4][B5] callLockoutS exists only on the Market Hand: dropped from any other worker', () => {
    expect(load(st(W({}, { callLockoutS: 20 }))).o.workers.coop_hand).toEqual({ energy: 60, cdS: 1.2 });
  });
  it('[CCR-F4] missing fields stay missing; other worker fields untouched; no events', () => {
    const { o, ev } = load(st(W({ unpaid: true }))); expect(o.workers).toEqual(W({ unpaid: true })); expect(ev).toEqual([]);
    expect(load(st({})).o.workers).toEqual({});
  });
  it('[CCR-F4][E2][AC-P13] reload round trip: a valid pause survives serialize -> validate -> m5Load unchanged', () => {
    const s = st(W({ paused: true, callLockoutS: 35 }, { paused: true }));
    const v = validate(serialize(s, NOW), PZ, NOW); if (!v.ok) throw new Error(v.reason);
    expect(load(v.file.state).o.workers).toEqual(s.workers);
  });
  it('[CCR-F4][E2] a tampered JSON save (null / string / 1e308) is sanitised after validate', () => {
    const raw = serialize(st(W({ paused: 'yes', callLockoutS: 1e308 }, { paused: null, callLockoutS: '9' })), NOW);
    const v = validate(raw, PZ, NOW); if (!v.ok) throw new Error(v.reason);
    expect(load(v.file.state).o.workers).toEqual(W({ callLockoutS: CAP }, {}));
  });
});

describe('[CCR-F4][E9][AC-P1] flag off / M4.1-style load: Pause fields are ignored and preserved (byte-identical)', () => {
  const M41 = (() => { const { flags: _f, zeroGain: _z, ...m4 } = b.m4 as any; return { ...b, m4 } as typeof b; })(); // rc/m4.1 shape: no flags block
  for (const [name, bal] of [['shipping (all flags 0)', b], ['M4.1-style balance (no m4.flags)', M41]] as const)
    it(`${name}: m5Load returns the same object; isPaused false; serialize writes the fields back`, () => {
      const s = st(W({ paused: true, callLockoutS: 1e308 }, { paused: 'x' }));
      const { o, ev } = load(s, bal); expect(o).toBe(s); expect(ev).toEqual([]);
      expect(isPaused(o.workers.market_hand, bal)).toBe(false);
      const v = validate(serialize(o, NOW), bal, NOW); if (!v.ok) throw new Error(v.reason);
      expect((v.file.state.workers as any).market_hand).toMatchObject({ paused: true, callLockoutS: 1e308 });
      expect(JSON.stringify(v.file.state.workers)).toBe(JSON.stringify(s.workers)); // same worker bytes (the M4 tracks migration may add other keys)
    });
});

describe('[CCR-F4][F-5] validateBalance requires the Pause tc keys m5Load reads while m4.flags.pause is on', () => {
  it('missing tc_pause_call_lockout_s / tc_pause_unlock_farm is a load error, never a silent 0', () => {
    const on = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, pause: 1 } } } as typeof b;
    expect(() => validateBalance(on)).toThrow(/tc\.pause_(unlock_farm|call_lockout_s) is required while flags\.pause is on/);
    expect(() => validateBalance(PZ)).not.toThrow();
    expect(() => validateBalance(b)).not.toThrow();
  });
});
