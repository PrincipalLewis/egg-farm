// Architect probe (NOT committed): #108 x #107 timer order + m5Persist/abilities union on the reconstructed resolution.
import { it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { balance as shipping } from '../src/config/balance';
import { initialState, nextRand, type GameState } from '../src/sim/state';
import { TIMER_SYSTEMS, stepTimers } from '../src/sim/timers';
import { m5Persist, m5Load, m5Offline } from '../src/save/m5-fields';
import { ON } from './v5-f2-helpers';
const tc: any = ON.m4!.tc!;
const B = { ...ON, m4: { ...ON.m4!, flags: { ...ON.m4!.flags, golden: 1, abilities: 1, streak: 1, tapCoins: 1, pause: 1 } } } as typeof ON;
const [seed, streak, breeds, incomeRef, frenzy, golden, abilities] = [...TIMER_SYSTEMS] as any[];
expect(TIMER_SYSTEMS.length).toBe(7);
const ORD: Record<string, any[]> = {
  P_note: TIMER_SYSTEMS as any[],
  Q_abil_before_golden: [seed, streak, breeds, incomeRef, frenzy, abilities, golden],
  R_golden_first: [seed, streak, breeds, incomeRef, golden, frenzy, abilities],
  S_abil_first: [seed, streak, breeds, incomeRef, abilities, frenzy, golden],
};
let rs = 987654321; const rnd = () => { const [x, u] = nextRand(rs); rs = x; return u; };
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
it('timer order: state + event multiset invariant across orders', () => {
  const out: any = { n: 0, stateDiff: {}, multisetDiff: {}, seqDiff: {}, multiFire: 0, fired: { frenzy_ended: 0, collectible_expired: 0, ability_ended: 0 } };
  for (const k of Object.keys(ORD)) { out.stateDiff[k] = 0; out.multisetDiff[k] = 0; out.seqDiff[k] = 0; }
  const DESP = tc.egg_despawn_s;
  for (let i = 0; i < 20000; i++) {
    const W = () => ({ energy: pick([0, 5, 60, 100]), cdS: 1e9, ...(rnd() < 0.15 ? { unpaid: true } : {}) });
    const ab: any = {}; for (const id of ['market_hand', 'coop_hand', 'hawker', 'grader']) if (rnd() < 0.6) ab[id] = { readyAt: 0, ...(rnd() < 0.7 ? { activeS: pick([0.01, 0.05, 0.1, 3]), ...(rnd() < 0.5 ? { durS: pick([12, 20]) } : {}) } : {}) };
    const s: GameState = { ...initialState(shipping, 7), farmLevel: pick([5, 8, 12, 20]), evRngState: Math.floor(rnd() * 2 ** 32) >>> 0,
      workers: { market_hand: W(), coop_hand: W(), hawker: W(), grader: W() } as any, abilities: ab,
      ...(rnd() < 0.6 ? { frenzyRemainingS: pick([0.01, 0.05, 0.1, 5]), frenzyRun: { extraCents: 3, eggsSold: 1, byPlayer: 1, byWorkers: 0 } } : {}),
      ...(rnd() < 0.5 ? { goldenEgg: { ageS: DESP - pick([0.01, 0.05, 0.1, 4]), slotId: 'S1', intervalS: 150 } } : {}),
      ...(rnd() < 0.7 ? { nextSpawnRemainingS: pick([0, 0.01, 0.05, 30]) } : {}) } as any;
    const dt = pick([0.05, 0.1, 1 / 30]), clock = { focus: rnd() < 0.8, nowMs: 1_800_000_000_000 } as any;
    const res: Record<string, { st: string; ev: any[] }> = {};
    for (const [k, sys] of Object.entries(ORD)) { const e: any[] = []; const st = stepTimers(s, dt, B, clock, e as any, sys); res[k] = { st: JSON.stringify(st), ev: e }; }
    const base = res.P_note; out.n++;
    const types = new Set(base.ev.map((e: any) => e.type)); if (['frenzy_ended', 'collectible_expired', 'ability_ended'].filter(t => types.has(t)).length >= 2) out.multiFire++;
    for (const e of base.ev) if (e.type in out.fired) out.fired[e.type]++;
    const ms = (ev: any[]) => ev.map(e => JSON.stringify(e)).sort().join('|');
    for (const k of Object.keys(ORD)) { if (res[k].st !== base.st) out.stateDiff[k]++; if (ms(res[k].ev) !== ms(base.ev)) out.multisetDiff[k]++; if (JSON.stringify(res[k].ev) !== JSON.stringify(base.ev)) out.seqDiff[k]++; }
  }
  writeFileSync(process.env.ARCH_OUT + '/probe-order.json', JSON.stringify(out, null, 1));
  for (const k of Object.keys(ORD)) { expect(out.stateDiff[k]).toBe(0); expect(out.multisetDiff[k]).toBe(0); }
});
it('save union: m5Persist with egg + running calls (durS) + frenzy; load and offline', () => {
  const r: any = {};
  const s: GameState = { ...initialState(shipping, 7), farmLevel: 12, evRngState: 123456789, nextSpawnRemainingS: 0, frenzyRemainingS: 12,
    goldenEgg: { ageS: 9, slotId: 'S3', intervalS: 150 }, goldenPending: { intervalS: 150, deferS: 1, recheckS: 0 },
    frenzyRun: { extraCents: 4, eggsSold: 1, byPlayer: 1, byWorkers: 0 },
    abilities: { hawker: { readyAt: 1_800_000_100_000, activeS: 7, durS: 20 }, grader: { readyAt: 0, activeS: 3 } } } as any;
  const before = JSON.stringify(s);
  const p1: any = m5Persist(s, B), p2: any = m5Persist(s, B);
  const [x, u] = nextRand(123456789), gap = tc.egg_gap_min_s + u * (tc.egg_gap_max_s - tc.egg_gap_min_s);
  r.persist = { noEgg: !('goldenEgg' in p1), noPending: !('goldenPending' in p1), noFrenzyRun: !('frenzyRun' in p1), gapOk: p1.nextSpawnRemainingS === gap, rngOneDraw: p1.evRngState === x,
    frenzyKept: p1.frenzyRemainingS === 12, abilitiesKept: JSON.stringify(p1.abilities) === JSON.stringify(s.abilities), inputUnchanged: JSON.stringify(s) === before, idempotent: JSON.stringify(p1) === JSON.stringify(p2) };
  const ev: any[] = []; const L: any = m5Load(JSON.parse(JSON.stringify(p1)), B, 1_800_000_000_000, ev);
  r.load = { gap: L.nextSpawnRemainingS === gap, rng: L.evRngState === x, noEgg: !('goldenEgg' in L), events: ev.map(e => [e.type, e.worker, e.cause, e.effect_s, e.reason]), callsCleared: !('activeS' in L.abilities.hawker) && !('durS' in L.abilities.hawker) && L.abilities.hawker.readyAt !== undefined };
  const noEgg: any = { ...s }; delete noEgg.goldenEgg; const pn: any = m5Persist(noEgg, B); r.noEggNoDraw = pn.evRngState === 123456789 && pn.nextSpawnRemainingS === 0;
  const off = B as any; const OFFG = { ...off, m4: { ...off.m4, flags: { ...off.m4.flags, golden: 0 } } }; const pf: any = m5Persist(s, OFFG); r.goldenOffStripOnly = !('goldenEgg' in pf) && pf.evRngState === 123456789 && pf.nextSpawnRemainingS === 0;
  const oe: any[] = []; const O: any = m5Offline(s, B, oe);
  r.offline = { events: oe.map(e => [e.type, e.worker, e.cause, e.effect_s, e.reason]), gap: O.nextSpawnRemainingS === gap, rng: O.evRngState === x, noEgg: !('goldenEgg' in O), inputUnchanged: JSON.stringify(s) === before };
  const sv: any = m5Persist(O, B); r.persistAfterOfflineNoSecondDraw = sv.evRngState === O.evRngState && sv.nextSpawnRemainingS === O.nextSpawnRemainingS;
  writeFileSync(process.env.ARCH_OUT + '/probe-save-union.json', JSON.stringify(r, null, 1));
  expect(Object.values(r.persist).every(Boolean)).toBe(true);
  expect(r.load.gap && r.load.rng && r.load.noEgg && r.load.callsCleared && r.noEggNoDraw && r.goldenOffStripOnly && r.persistAfterOfflineNoSecondDraw).toBe(true);
});
