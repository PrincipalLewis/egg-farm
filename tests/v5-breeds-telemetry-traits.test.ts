// #127 restack (HoE/v5-127-restack): session_end breed_present_eggs / breed_away_eggs now read counters fed by #125's traits.
// breed_present_eggs = coop eggs BR-R12 added this session (post-cap); breed_away_eggs = the BR-R13 part of the offline grant,
// credited to the session in which the grant is applied (spec §8 L700). breed_broody_cents: no producer (BR-R14 not built).
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { initialState, type GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { coopCap, offlineMult } from '../src/sim/tracks';
import { m4OfflineEggs } from '../src/sim/offline';
import { awayBp } from '../src/sim/breeds-traits';
import { sessionEndBreedsFields, awayBonusEggs } from '../src/telemetry/breeds-session';
import type { BreedsSave } from '../src/sim/breeds';
import { mem } from './helpers';

const T0 = Date.UTC(2026, 10, 10, 12);
const BR = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, breeds: 1 } } } as typeof b;
const OFF = b;
const focus = { focus: true as const };
const fresh = (o: Partial<BreedsSave> = {}): BreedsSave => ({ owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0], hatches: 0, pity: 0, rng: 0x9e3779b9,
  freeHatchUsed: 0, flockCompleteLogged: 0, ...o });
const st = (o: Partial<BreedsSave> = {}, F = 12, H = 12): GameState => ({ ...initialState(b, 7), farmLevel: F, hensLevel: H, tracksV7: 1 as const, v6BackupId: '0123456789abcdef', breeds: fresh(o) });
const leghorn = { owned: { leghorn: { stars: 0 } }, slots: ['leghorn', null, null] as BreedsSave['slots'] };
const sussex = { owned: { sussex: { stars: 0 } }, slots: ['sussex', null, null] as BreedsSave['slots'] };
const boot = (bb: typeof b) => new Game(bb, mem(), () => T0, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ends = (g: Game) => g.telemetry.events().filter(x => x.type === 'session_end') as any[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const grant = (g: Game, ms: number): number => (g as any).grantOffline(ms);

describe('breed_present_eggs (BR-R12 tick -> breedsTel.presentEggs)', () => {
  it('one focused tick: presentEggs = the extra coop eggs vs the same tick unfocused (no Present term)', () => {
    const s = st(leghorn), a = step(s, 0.1, BR, undefined, focus), z = step(s, 0.1, BR);
    expect(a.coop).toBeGreaterThan(z.coop);
    expect(a.breedsTel!.presentEggs).toBeCloseTo(a.coop - z.coop, 9);
    expect(z.breedsTel?.presentEggs).toBeUndefined(); // unfocused: no Present eggs (breedsTel exists only for breed_family_s)
  });
  it('accumulates over focused ticks; session_end floors it; coop at cap adds 0 (post-cap)', () => {
    let s = st(leghorn); for (let i = 0; i < 3_000; i++) s = step(s, 0.1, BR, undefined, focus);
    const n = s.breedsTel!.presentEggs!; expect(n).toBeGreaterThan(1);
    expect(sessionEndBreedsFields(s, BR)).toMatchObject({ breed_present_eggs: Math.floor(n) });
    const full = st(leghorn); full.coop = coopCap(full, BR);
    expect(step(full, 0.1, BR, undefined, focus).breedsTel?.presentEggs).toBeUndefined();
  });
  it('Game session: session_end.breed_present_eggs > 0 with a settled Present breed over attended frames, then resets (m1)', () => {
    const g = boot(BR); let t = T0; (g as any).now = () => t; g.state = st(leghorn); g.setAttendedProbe(() => true); // eslint-disable-line @typescript-eslint/no-explicit-any
    for (let i = 0; i < 300; i++) { t += 1_000; g.frame(); }
    g.endSession(); expect(ends(g)[0].breed_present_eggs).toBeGreaterThan(0); expect(g.state.breedsTel).toBeUndefined();
  });
});

describe('breed_away_eggs (BR-R13 grant -> breedsTel.awayEggs, credited in the grant session)', () => {
  it('1 h grant with Sussex (Away 1500 bp): awayEggs = grant − the same grant at awayBp 0; on that session_end', () => {
    const g = boot(BR), s0 = st(sussex); g.state = s0;
    const eggs = grant(g, 3_600_000), base = m4OfflineEggs(3600, s0.hensLevel, BR, offlineMult(s0, BR), 0);
    expect(awayBp(s0, BR)).toBe(1500); expect(eggs).toBeGreaterThan(base);
    expect(g.state.breedsTel!.awayEggs).toBe(eggs - base);
    g.endSession(); expect(ends(g)[0].breed_away_eggs).toBe(eggs - base);
  });
  it('sub-60 s gap, no Away slotted, or a 0-egg grant: awayEggs 0 and no breedsTel created', () => {
    const g1 = boot(BR); g1.state = st(sussex); grant(g1, BR.offline.offlineMinSeconds * 1000 - 1); expect(g1.state.breedsTel).toBeUndefined();
    const g2 = boot(BR); g2.state = st(); grant(g2, 3_600_000); expect(g2.state.breedsTel).toBeUndefined();
    expect(awayBonusEggs(st(sussex), 3_600_000, BR, 0, 1500)).toBe(0);
  });
});

describe('breed_broody_cents stays 0: BR-R14 Broody nest accrual not built (no producer, HoE/v5-broody-accrual)', () => {
  it('Broody-family slotted, long focused session + 1 h grant: breed_broody_cents 0 (present, not absent, flag on)', () => {
    const g = boot(BR); let t = T0; (g as any).now = () => t; // eslint-disable-line @typescript-eslint/no-explicit-any
    g.state = st({ owned: { cochin: { stars: 0 } }, slots: ['cochin', null, null] }); grant(g, 3_600_000);
    for (let i = 0; i < 60; i++) { t += 1_000; g.frame(); }
    g.endSession(); expect(ends(g)[0].breed_broody_cents).toBe(0);
  });
});

describe('flag-off byte-identity: the wiring adds nothing', () => {
  it('flag off: focused ticks with Present slotted and a 1 h grant with Away slotted create no breedsTel; state JSON = no-wiring path', () => {
    let s = st(leghorn); for (let i = 0; i < 500; i++) s = step(s, 0.1, OFF, undefined, focus);
    expect(s.breedsTel).toBeUndefined();
    const g = boot(OFF); g.state = st(sussex); grant(g, 3_600_000); expect(g.state.breedsTel).toBeUndefined();
    g.endSession(); expect(Object.keys(ends(g)[0]).sort()).toEqual(['farm_level', 'sessionMs', 'taps_moved_eggs', 'taps_total', 'ts', 'type']);
    expect(Object.keys(ends(g)[0]).every(k => !k.startsWith('breed'))).toBe(true);
    expect(awayBonusEggs(st(sussex), 3_600_000, OFF, 1_000, 1500)).toBe(0);
  });
  it('flag on, nothing slotted: 1,000 focused ticks + a grant never create breedsTel (§7 flag-on/no-trait == pre-wiring)', () => {
    let s = st(); for (let i = 0; i < 1_000; i++) s = step(s, 0.1, BR, undefined, focus);
    expect(s.breedsTel).toBeUndefined();
    const g = boot(BR); g.state = st(); grant(g, 3_600_000); expect(g.state.breedsTel).toBeUndefined();
  });
});
