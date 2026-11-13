// Hire2/v5-clockwage S5 (Saves-agreed): clockWageTipShown is an OPTIONAL save key, no SAVE_VERSION bump; the load sanitiser
// defaults it (non-boolean -> absent = not shown). failure-cost v0.3.24 AC-FC11 ("save flag, optional field, no version bump").
// Red first: written before clockWageLoad existed.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { serialize, validate, SAVE_VERSION, checksum } from '../src/save/save';
import { clockWageLoad, clockWageTipDue } from '../src/sim/clock-wage';
import { m5Load } from '../src/save/m5-fields';
import { M5_SAVED_FIELDS, M5_SESSION_FIELDS } from '../src/sim/m5-state';
const C = { ...b, m4: { ...b.m4!, enabled: 1, flags: { ...b.m4!.flags, clockWage: 1 } } } as typeof b;
const v5raw = (st: object) => { const s = JSON.stringify(st); return `{"version":5,"savedAt":1,"sum":"${checksum(s)}","state":${s}}`; };
// Saves S5 review (1): the sanitiser runs inside m5Load (every load path), not as a second call.
const load = (raw: string, bb: typeof b) => { const v = validate(raw, bb); if (!v.ok) throw new Error(v.reason); return m5Load(v.file.state, bb, 1, []); };

describe('[S5] clockWageTipShown optional key, v5 -> v6 round-trip', () => {
  it('pin: registered once in M5_SAVED_FIELDS (saved, not session); exact saved list', () => {
    expect(M5_SAVED_FIELDS).toEqual(['evRngState', 'nextSpawnRemainingS', 'frenzyRemainingS', 'broodyNestCents', 'broodyHenIdx', 'abilities', 'abilitiesUnlocked', 'abilitiesCoachSeen', 'breeds', 'refillCharges', 'chargeNextMs', 'clockWageTipShown', 'clockWageWindow']);
    expect((M5_SESSION_FIELDS as readonly string[]).includes('clockWageTipShown')).toBe(false);
  });
  it('m5Load sanitises with clockWage alone on and alongside other M5 flags (both m5Load branches)', () => {
    const junk = { ...initialState(b, 3), farmLevel: 12, clockWageTipShown: 'yes' as any };
    expect('clockWageTipShown' in m5Load(junk, C, 1, [])).toBe(false);
    const CP = { ...C, m4: { ...C.m4!, flags: { ...C.m4!.flags, pause: 1 } } } as typeof b;
    expect('clockWageTipShown' in m5Load(junk, CP, 1, [])).toBe(false);
    expect(m5Load({ ...junk, clockWageTipShown: true }, CP, 1, []).clockWageTipShown).toBe(true);
  });
  it('SAVE_VERSION stays 6', () => expect(SAVE_VERSION).toBe(6));
  it('a v5 save (no key) loads as v6 with the key absent (tip not yet shown) and re-saves without it', () => {
    const { wageFracCents: _w, ...v5st } = initialState(b, 3) as any;
    const s = load(v5raw(v5st), C); expect('clockWageTipShown' in s).toBe(false); expect(clockWageTipDue(s, C)).toBe(true);
    expect(serialize(s, 2)).not.toContain('clockWageTipShown');
  });
  it('v6 save with clockWageTipShown: true round-trips (state-stable) and the tip is never due again', () => {
    const s0: GameState = { ...initialState(b, 3), clockWageTipShown: true };
    const raw = serialize(s0, 2); expect(raw).toContain('"clockWageTipShown":true');
    const s1 = load(raw, C); expect(s1.clockWageTipShown).toBe(true); expect(clockWageTipDue(s1, C)).toBe(false);
    const raw2 = serialize(s1, 2); expect(raw2).toContain('"clockWageTipShown":true'); expect(load(raw2, C)).toEqual(s1); // validate() normalises other keys, so compare state, not bytes
  });
  it.each([['yes'], [1], [null], [{}]])('sanitiser: clockWageTipShown = %j -> absent (default false)', v => {
    const s = load(serialize({ ...initialState(b, 3), clockWageTipShown: v as any }, 2), C);
    expect('clockWageTipShown' in s).toBe(false);
  });
  it('flag off: load is identity (same object; like every M5 field of an off flag) and the tip is never due', () => {
    const st = { ...initialState(b, 3), clockWageTipShown: 'junk' as any }; expect(clockWageLoad(st, b)).toBe(st); expect(m5Load(st, b, 1, [])).toBe(st); expect(clockWageTipDue(st, b)).toBe(false);
  });
});

import { Game } from '../src/game';
import { mem } from './helpers';
import { clockWageTipNow, CLOCK_WAGE_TIP } from '../src/ui/clock-wage-ui';
describe('[S5 / AC-FC11 / AC-FC15] yawn tip once per save, tip_shown{id:clock_wage} once, survives reload', () => {
  const kvOf = () => { const kv = mem() as any; kv.removeItem = (k: string) => kv.m.delete(k); return kv; };
  it('first MH/CH yawn triggers; Game marks + tracks once; a reload of that save never shows it again', () => {
    const kv = kvOf(); let t = 1_760_000_000_000; const g = new Game(C, kv, () => t, 1, 'dev', null, null, { idbBoot: 'absent' });
    const yawnE = C.workers.energy.yawn_at_pct;
    g.state = { ...g.state, farmLevel: 12, workers: { market_hand: { energy: yawnE, cdS: 1 } } } as GameState;
    expect(clockWageTipNow(g.state, C)).toBe(true); expect(g.markClockWageTip()).toBe(true); expect(g.markClockWageTip()).toBe(false);
    expect(g.telemetry.events().filter(e => e.type === 'tip_shown')).toEqual([expect.objectContaining({ type: 'tip_shown', id: 'clock_wage' })]);
    expect(clockWageTipNow(g.state, C)).toBe(false); t += 1000; g.save();
    const g2 = new Game(C, kv, () => t + 1000, 1, 'dev', null, null, { idbBoot: 'absent' });
    expect(g2.state.clockWageTipShown).toBe(true); expect(g2.markClockWageTip()).toBe(false);
    expect(CLOCK_WAGE_TIP).toBe('Sleeping workers still get paid. Refill to wake them.');
  });
  it('clockWage off: never due, no event', () => {
    const g = new Game(b, kvOf(), () => 1_760_000_000_000, 1, 'dev', null, null, { idbBoot: 'absent' });
    g.state = { ...g.state, farmLevel: 12, workers: { market_hand: { energy: b.workers.energy.yawn_at_pct, cdS: 1 } } } as GameState;
    expect(clockWageTipNow(g.state, b)).toBe(false); expect(g.markClockWageTip()).toBe(false);
    expect(g.telemetry.events().some(e => e.type === 'tip_shown')).toBe(false);
  });
});

import { SAVE_KEY } from '../src/save/save';
describe('[S5 / Saves review (2)] tracks-v7 pending path (game.ts persisted(): only v6Keys are written)', () => {
  // An unmarked v6 farm on an M4 build boots PENDING under tracksOff(b) = m4.enabled 0, so clockWage is OFF for that whole
  // session: the tip can't be marked, and nothing new needs to survive the v6Keys write-back. A key already in the v6 save
  // is in v6Keys and is kept.
  const kvOf = () => { const kv = mem() as any; kv.removeItem = (k: string) => kv.m.delete(k); return kv; };
  const unmarked = (extra: object) => { const { hensLevel: _h, eggValueLevel: _e, celebratedMilestones: _c, tracksV7: _t, ...r } = { ...initialState(b), farmLevel: 12, coinsCents: 1e9, ...extra } as any;
    const j = JSON.stringify(r); return `{"version":6,"savedAt":1760000000000,"sum":"${checksum(j)}","state":${j}}`; };
  const boot = (kv: any) => new Game(C, kv, () => 1760000000500, 1, 'dev', null, null, { idbBoot: 'absent', newId: () => '0000000000000001' });
  it('pending session: clockWage is off, markClockWageTip is refused, the v6 write carries no key', () => {
    const kv = kvOf(); kv.setItem(SAVE_KEY, unmarked({}));
    const g = boot(kv); expect(g.tracksMigrationPending).toBe(true); expect(g.balance.m4!.enabled).toBe(0);
    g.state = { ...g.state, workers: { market_hand: { energy: C.workers.energy.yawn_at_pct, cdS: 1 } } } as GameState;
    expect(clockWageTipNow(g.state, g.balance)).toBe(false); expect(g.markClockWageTip()).toBe(false);
    g.save(); expect(kv.getItem(SAVE_KEY)).not.toContain('clockWageTipShown');
  });
  it('pending session: a clockWageTipShown already in the v6 save is in v6Keys and survives the write-back', () => {
    const kv = kvOf(); kv.setItem(SAVE_KEY, unmarked({ clockWageTipShown: true }));
    const g = boot(kv); expect(g.tracksMigrationPending).toBe(true);
    const before = kv.getItem(SAVE_KEY); g.state = { ...g.state, coinsCents: g.state.coinsCents + 1 }; g.save();
    const after = kv.getItem(SAVE_KEY)!; expect(after).not.toBe(before); expect(JSON.parse(after).state.coinsCents).toBe(1e9 + 1); // a real v6Keys write happened
    expect(after).toContain('"clockWageTipShown":true'); expect(after).not.toContain('tracksV7');
  });
});
