// Hire2/v5-clockwage S5 (Saves-agreed): clockWageTipShown is an OPTIONAL save key, no SAVE_VERSION bump; the load sanitiser
// defaults it (non-boolean -> absent = not shown). failure-cost v0.3.24 AC-FC11 ("save flag, optional field, no version bump").
// Red first: written before clockWageLoad existed.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { serialize, validate, SAVE_VERSION, checksum } from '../src/save/save';
import { clockWageLoad, clockWageTipDue } from '../src/sim/clock-wage';
const C = { ...b, m4: { ...b.m4!, enabled: 1, flags: { ...b.m4!.flags, clockWage: 1 } } } as typeof b;
const v5raw = (st: object) => { const s = JSON.stringify(st); return `{"version":5,"savedAt":1,"sum":"${checksum(s)}","state":${s}}`; };
const load = (raw: string, bb: typeof b) => { const v = validate(raw, bb); if (!v.ok) throw new Error(v.reason); return clockWageLoad(v.file.state, bb); };

describe('[S5] clockWageTipShown optional key, v5 -> v6 round-trip', () => {
  it('SAVE_VERSION stays 6', () => expect(SAVE_VERSION).toBe(6));
  it('a v5 save (no key) loads as v6 with the key absent (tip not yet shown) and re-saves without it', () => {
    const { wageFracCents: _w, ...v5st } = initialState(b, 3) as any;
    const s = load(v5raw(v5st), C); expect('clockWageTipShown' in s).toBe(false); expect(clockWageTipDue(s, C)).toBe(true);
    expect(serialize(s, 2)).not.toContain('clockWageTipShown');
  });
  it('v6 save with clockWageTipShown: true round-trips byte-stable and the tip is never due again', () => {
    const s0: GameState = { ...initialState(b, 3), clockWageTipShown: true };
    const raw = serialize(s0, 2); expect(raw).toContain('"clockWageTipShown":true');
    const s1 = load(raw, C); expect(s1.clockWageTipShown).toBe(true); expect(clockWageTipDue(s1, C)).toBe(false);
    expect(serialize(s1, 2)).toBe(raw);
  });
  it.each([['yes'], [1], [null], [{}]])('sanitiser: clockWageTipShown = %j -> absent (default false)', v => {
    const s = load(serialize({ ...initialState(b, 3), clockWageTipShown: v as any }, 2), C);
    expect('clockWageTipShown' in s).toBe(false);
  });
  it('flag off: load is identity (same object) and the tip is never due', () => {
    const st = { ...initialState(b, 3), clockWageTipShown: 'junk' as any }; expect(clockWageLoad(st, b)).toBe(st); expect(clockWageTipDue(st, b)).toBe(false);
  });
});
