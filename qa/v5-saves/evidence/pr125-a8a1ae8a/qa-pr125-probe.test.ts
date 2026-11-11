/**
 * QA probe — TASK hoqa/pr125-bar @ a8a1ae8a (Saves QA, scratch only; not product code).
 * Each test asserts the SPEC value (m5.1-breeds-spec ea922eb8 / errata 5e12a591). A failing probe = a spec miss at tip.
 * Diagnostics are printed with console.log (prefix QA-PROBE) so the evidence log carries the actual numbers.
 */
import { describe, it, expect } from 'vitest';
import { balance as b } from '../wt/src/config/balance';
import { initialState, type GameState } from '../wt/src/sim/state';
import { step, advance } from '../wt/src/sim/tick';
import { apply } from '../wt/src/sim/actions';
import { applyOffline, m4OfflineEggs } from '../wt/src/sim/offline';
import { type BreedsSave } from '../wt/src/sim/breeds';
import { sessionEndPresentFields, awayBp, presentBp } from '../wt/src/sim/breeds-traits';
import { serialize } from '../wt/src/save/save';
import { Game } from '../wt/src/game';
import { mem } from '../wt/tests/helpers';

const BR = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, breeds: 1 } } } as typeof b;
const focus = { focus: true as const };
const fresh = (o: Partial<BreedsSave> = {}): BreedsSave => ({
  owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0],
  hatches: 0, pity: 0, rng: 0x9e3779b9, freeHatchUsed: 0, flockCompleteLogged: 0, ...o,
});
const st = (o: Partial<BreedsSave> = {}, F = 12, H = 12): GameState => ({
  ...initialState(b, 7), farmLevel: F, hensLevel: H, tracksV7: 1 as const, v6BackupId: '0123456789abcdef', breeds: fresh(o),
});
const leg = (): Partial<BreedsSave> => ({ owned: { leghorn: { stars: 0 } }, slots: ['leghorn', null, null], settleMs: [0, 0, 0] });
const log = (...a: unknown[]) => console.log('QA-PROBE', ...a);

describe('P1 (a) present_active_s half-up', () => {
  it('P1a pure rounding: round(ms/100)/10 equals integer half-up for every integer ms 0..2,000,000', () => {
    let bad = 0, first: number | null = null;
    for (let ms = 0; ms <= 2_000_000; ms++) {
      const s0: GameState = { ...st(leg()), breedsCalm: { focusMs: ms, stamps: [], activeMs: ms, lostCount: 0, open: true } };
      const got = sessionEndPresentFields(s0, BR).present_active_s!;
      const want = Math.floor((ms + 50) / 100) / 10; // half-up on integer ms
      if (got !== want || Math.round(got * 10) !== got * 10) { bad++; if (first === null) first = ms; }
    }
    log('P1a mismatches', bad, 'first', first);
    expect(bad).toBe(0);
  });
  it('P1b sim reachability (BR-AC53 non-whole, BR-R12b(b) fT=min(100,F-given)): 12,249 focus-ms -> 12.2, 12,250 -> 12.3', () => {
    const run = (lastF: number) => {
      let s = st(leg()), acc = 0;
      for (let i = 0; i < 12; i++) { const r = advance(s, 1000, acc, BR, undefined, { focusMs: 1000 }); s = r.state; acc = r.accMs; }
      const r = advance(s, 300, acc, BR, undefined, { focusMs: lastF }); s = r.state;
      return { focusMs: s.breedsCalm!.focusMs, activeMs: s.breedsCalm!.activeMs, f: sessionEndPresentFields(s, BR) };
    };
    const a = run(249), c = run(250);
    log('P1b lastF=249', JSON.stringify(a), 'lastF=250', JSON.stringify(c));
    expect(a.focusMs).toBe(12249);
    expect(a.f.present_active_s).toBe(12.2);
    expect(c.f.present_active_s).toBe(12.3);
  });
});

/** BR-AC53 scripted session, breeds-only detector (streak/tapCoins off). Taps are dispatched between ticks (as Game does). */
function ac53(tapBeforeTick: boolean) {
  let s = st(leg());
  const taps = new Set<number>();
  // focus-ms timeline: 300 s idle; burst i: 30 taps 1 s apart; 120 s gap; end 120 s after last tap of burst 3.
  let t = 300_000;
  for (let burst = 0; burst < 3; burst++) { for (let k = 0; k < 30; k++) taps.add(t + k * 1000); t += 29_000 + 120_000; }
  const end = t; // 747,000
  let fm = 0;
  while (fm < end) {
    const next = fm + 100;
    if (tapBeforeTick && taps.has(next)) s = apply(s, { type: 'collect' }, BR);
    s = step(s, 0.1, BR, undefined, focus); fm = next;
    if (!tapBeforeTick && taps.has(fm)) s = apply(s, { type: 'collect' }, BR);
  }
  return { focusMs: s.breedsCalm!.focusMs, activeMs: s.breedsCalm!.activeMs, f: sessionEndPresentFields(s, BR) };
}
describe('P2 (b) present_lost_count / BR-AC53', () => {
  it('P2a BR-AC53 (taps applied after the tick that reaches their focus second) -> 660.0 / 3', () => {
    const r = ac53(false); log('P2a', JSON.stringify(r));
    expect(r.focusMs).toBe(747_000);
    expect(r.f.present_lost_count).toBe(3);
    expect(r.f.present_active_s).toBe(660);
  });
  it('P2b BR-AC53 (taps applied before that tick, i.e. counted on it) -> 660.0 / 3', () => {
    const r = ac53(true); log('P2b', JSON.stringify(r));
    expect(r.f.present_lost_count).toBe(3);
    expect(r.f.present_active_s).toBe(660);
  });
  it('P2c no settled Present: both fields present and 0 even after 30 fast taps', () => {
    let s = st({}); for (let i = 0; i < 300; i++) { s = step(s, 0.1, BR, undefined, focus); if (i % 10 === 9) s = apply(s, { type: 'collect' }, BR); }
    const f = sessionEndPresentFields(s, BR); log('P2c', JSON.stringify(f), 'stamps', s.breedsCalm?.stamps.length);
    expect(f).toEqual({ present_active_s: 0, present_lost_count: 0 });
  });
  it('P2d BR-AC47 steady 1/s taps 0..59 s: lost_count = 1', () => {
    let s = st(leg()), fm = 0;
    while (fm < 80_000) { s = step(s, 0.1, BR, undefined, focus); fm += 100; if (fm <= 59_000 && fm % 1000 === 0) s = apply(s, { type: 'collect' }, BR); }
    log('P2d', JSON.stringify(sessionEndPresentFields(s, BR)));
    expect(s.breedsCalm!.lostCount).toBe(1);
  });
});

describe('P3 (c) offline_grant.away_bp', () => {
  const mkGame = (bal: typeof b, T0: number) => {
    const g = new Game(bal, mem(), () => T0, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
    const tracks: any[] = []; (g as any).telemetry.track = (type: string, fields?: object) => { tracks.push({ type, fields }); };
    return { g, tracks };
  };
  it('P3a eggs=0 grant with gap >= 60 s (hens track rate forced to 0) still carries away_bp', () => {
    const B0 = { ...BR, m4: { ...BR.m4!, offline: { ...BR.m4!.offline!, eggsPerSec: BR.m4!.offline!.eggsPerSec.map(() => 0) } } } as typeof b;
    const { g, tracks } = mkGame(B0, Date.UTC(2026, 10, 10, 4));
    g.state = st({ owned: { sussex: { stars: 0 } }, slots: ['sussex', null, null], settleMs: [0, 0, 0] });
    const eggs = (g as any).grantOffline(3_600_000);
    const og = tracks.filter(t => t.type === 'offline_grant'); log('P3a eggs', eggs, JSON.stringify(og));
    expect(eggs).toBe(0); expect(og.length).toBe(1); expect(og[0].fields.away_bp).toBe(1500);
  });
  it('P3b away_bp reported equals the bp applied to the grant (dupe Sussex hatch completes during the absence)', () => {
    const { g, tracks } = mkGame(BR, Date.UTC(2026, 10, 10, 5));
    const s0 = st({ owned: { sussex: { stars: 0 } }, slots: ['sussex', null, null], settleMs: [0, 0, 0],
      incubator: { breed: 'sussex', remainingMs: 1000, costCents: 0 } });
    g.state = s0;
    const applied = awayBp(s0, BR);
    const eggs = (g as any).grantOffline(3_600_000);
    const og = tracks.find(t => t.type === 'offline_grant');
    const expEggs = m4OfflineEggs(3600, s0.hensLevel, BR, 1, applied);
    log('P3b applied bp', applied, 'eggs', eggs, 'expEggs@applied', expEggs, 'reported', JSON.stringify(og?.fields), 'awayBp after', awayBp(g.state, BR));
    expect(og.fields.away_bp).toBe(applied);
  });
  it('P3c sub-60 s reload gap: is an offline_grant emitted? (diagnostic: records behaviour)', () => {
    const { g, tracks } = mkGame(BR, Date.UTC(2026, 10, 10, 6));
    g.state = st({});
    (g as any).grantOffline(2_000);
    const og = tracks.filter(t => t.type === 'offline_grant'); log('P3c 2 s gap offline_grant events', JSON.stringify(og));
    expect(og.length).toBe(0); // offline needs >= offlineMinSeconds (60 s); a 2 s gap is not an offline grant
  });
});

describe('P4 BR-R13 float order', () => {
  it('P4a impl equals spec order floor(min(min(a,cap)*rate*(1e4+bp)/1e4, max)*mult) over H x bp x a x mult', () => {
    const o = BR.offline, t = BR.m4!.offline!; let n = 0, bad = 0; const ex: unknown[] = [];
    for (let H = 0; H < t.eggsPerSec.length; H++) for (const mult of [1, 1.1, 1.25, 1.5, 2]) for (let bp = 0; bp <= 3000; bp += 25)
      for (let a = 60; a <= 7300; a += 7) {
        const spec = Math.floor(Math.min(Math.min(a, o.offlineCapSeconds) * t.eggsPerSec[H] * (10000 + bp) / 10000, t.maxEggs2h[H]) * mult);
        const got = m4OfflineEggs(a, H, BR, mult, bp); n++;
        if (got !== spec) { bad++; if (ex.length < 5) ex.push({ H, mult, bp, a, spec, got }); }
      }
    log('P4a cases', n, 'mismatches', bad, JSON.stringify(ex));
    expect(bad).toBe(0);
  });
  it('P4b BR-AC17 Away 3000 @ H=30, 60 min and 3 h', () => {
    const t = BR.m4!.offline!; const H = 30;
    const s = st({ owned: { brahma: { stars: 2 } }, slots: ['brahma', null, null], settleMs: [0, 0, 0] }, 28, H);
    const bp = awayBp(s, BR);
    const g60 = applyOffline(s, 3_600_000, BR).eggs, g3h = applyOffline(s, 3 * 3_600_000, BR).eggs;
    const mult = 1; void mult;
    const flagOff = applyOffline({ ...s, breeds: fresh() }, 3 * 3_600_000, BR).eggs;
    log('P4b bp', bp, 'g60', g60, 'g3h', g3h, 'flagOffCap', flagOff, 'spec60(mult1)', Math.floor(Math.min(3600 * t.eggsPerSec[H] * 13000 / 10000, t.maxEggs2h[H])));
    expect(bp).toBe(3000); expect(g3h).toBe(flagOff);
  });
});

describe('P5 BR-AC50 reload: calm ring not saved', () => {
  it('saves with 0 and 6 stamps are byte-identical', () => {
    const base = st(leg());
    const a = { ...base, breedsCalm: { focusMs: 6000, stamps: [], activeMs: 0, lostCount: 0, open: true } };
    const c = { ...base, breedsCalm: { focusMs: 6000, stamps: [1000, 2000, 3000, 4000, 5000, 6000], activeMs: 5000, lostCount: 1, open: false } };
    const sa = serialize(a as GameState, 1_700_000_000_000, 1, BR), sc = serialize(c as GameState, 1_700_000_000_000, 1, BR);
    log('P5 identical', sa === sc, 'has breedsCalm', sa.includes('breedsCalm'));
    expect(sa).toBe(sc); expect(sa.includes('breedsCalm')).toBe(false);
  });
});

describe('P6 BR-R12 Present bp only while settled (BR-AC4b)', () => {
  it('settling Present slot: presentBp 0 and no activeMs', () => {
    let s = st({ owned: { leghorn: { stars: 0 } }, slots: ['leghorn', null, null], settleMs: [300_000, 0, 0] });
    expect(presentBp(s, BR)).toBe(0);
    for (let i = 0; i < 50; i++) s = step(s, 0.1, BR, undefined, focus);
    log('P6 activeMs while settling', s.breedsCalm?.activeMs);
    expect(s.breedsCalm?.activeMs ?? 0).toBe(0);
  });
});
