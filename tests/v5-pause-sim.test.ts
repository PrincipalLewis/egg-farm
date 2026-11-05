// HoE/pause-sim (manifest row 31): Pause/Resume sim behind m4.flags.pause.
// Spec citations in tree: product/workers/m5-worker-pause-spec.md v1.3.6 rule 1, rule 3 / §6, rule 7 (B5), E2/E9/E12;
// lockout tc_pause_call_lockout_s = 45 sim seconds (Market Hand). UI and the G5-P driver are out of scope.
// AC-P1 flag-off has no behavioural effect. AC-P2 / rule 1: below tc_pause_unlock_farm the toggle does nothing.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { validateBalance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { graderMult, hawkerDemandMult } from '../src/sim/workers';
import { pauseWorker, resumeWorker } from '../src/sim/pause';
import { collectPerSec, demandPerSec, marketHandStalled, wagesPerSec } from '../src/econ/income';
import { m5Load, m5Offline, m5Persist } from '../src/save/m5-fields';
import { SAVE_KEY, serialize } from '../src/save/save';
import { Game } from '../src/game';
import { mem } from './helpers';
import { ON } from './v5-f2-helpers';
import type { SimEvent } from '../src/sim/events';

const tc = b.m4!.tc!;
const P = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, pause: 1 } } } as typeof b;
const OFF = b;
const LOCK = tc.pause_call_lockout_s;
const RECOVER = tc.rest_recovery_mult; // 0.25
const DRAIN = b.workers.energy.drain_s_per_pct; // 9 → +1 energy per 36 s at 0.25x
const farm = (extra: Partial<GameState> = {}, bb = P): GameState => ({
  ...initialState(bb, 3), farmLevel: 12, hensLevel: 12, eggValueLevel: 12, coinsCents: 1e9, graderTier: 3, ...extra,
});
const W = (energy = 80, extra: object = {}) => ({ energy, cdS: 1.5, ...extra });
const run = (s: GameState, dt: number, bb = P, ev: SimEvent[] = []) => step(s, dt, bb, ev);

describe('[AC-P1] flag off: paused and callLockoutS have no behavioural effect', () => {
  it('pauseWorker / resumeWorker return the same state; a stray paused:true drains, works and does not recover', () => {
    const s = farm({ workers: { hawker: W(50, { paused: true }), market_hand: W(80, { paused: true, callLockoutS: 20, cdS: 0 }) } }, OFF);
    expect(pauseWorker(s, 'hawker', OFF)).toBe(s);
    expect(resumeWorker(s, 'market_hand', OFF)).toBe(s);
    const ev: SimEvent[] = [];
    const n = run(s, 36, OFF, ev);
    const plain = run(farm({ workers: { hawker: W(50), market_hand: W(80, { cdS: 0 }) } }, OFF), 36, OFF);
    expect(n.workers.hawker!.energy).toBeCloseTo(50 - 36 / DRAIN, 9);
    expect(n.workers.hawker!.energy).toBeCloseTo(plain.workers.hawker!.energy, 9);
    expect(n.workers.market_hand!.callLockoutS).toBe(20); // no countdown
    expect(ev.some(e => e.type === 'wage')).toBe(true);
    expect(plain.workers.market_hand!.energy).toBeCloseTo(n.workers.market_hand!.energy, 6);
  });
  it('income of a working paused helper matches the unpaused helper while pause = 0', () => {
    const paused = farm({ workers: { market_hand: W(100, { paused: true }), coop_hand: W(100, { paused: true }), hawker: W(100, { paused: true }), grader: W(100, { paused: true }) } }, OFF);
    const open = farm({ workers: { market_hand: W(100), coop_hand: W(100), hawker: W(100), grader: W(100) } }, OFF);
    expect(wagesPerSec(paused, OFF)).toBe(wagesPerSec(open, OFF));
    expect(collectPerSec(paused, OFF)).toBe(collectPerSec(open, OFF));
    expect(demandPerSec(paused, OFF)).toBe(demandPerSec(open, OFF));
    expect(graderMult(paused.workers, paused.graderTier, OFF)).toBe(graderMult(open.workers, open.graderTier, OFF));
  });
});

describe('[rule 1][AC-P2] toggle only at or above tc_pause_unlock_farm, hired workers, flag on', () => {
  it('below the unlock, missing worker, and a second pause are no-ops (same object)', () => {
    const low = farm({ farmLevel: tc.pause_unlock_farm - 1, workers: { hawker: W() } });
    expect(pauseWorker(low, 'hawker', P)).toBe(low);
    const s = farm({ workers: { hawker: W() } });
    expect(pauseWorker(s, 'grader', P)).toBe(s);
    const on = pauseWorker(s, 'hawker', P);
    expect(on.workers.hawker!.paused).toBe(true);
    expect(pauseWorker(on, 'hawker', P)).toBe(on);
  });
  it('at the unlock a hired worker pauses; resume clears it', () => {
    const s = farm({ farmLevel: tc.pause_unlock_farm, workers: { coop_hand: W() } });
    const on = pauseWorker(s, 'coop_hand', P);
    expect(on.workers.coop_hand).toMatchObject({ paused: true, energy: 80 });
    const off = resumeWorker(on, 'coop_hand', P);
    expect(off.workers.coop_hand!.paused).toBe(false);
    expect(off.workers.coop_hand!.callLockoutS).toBeUndefined();
  });
});

describe('[rule 3][§6] paused energy recovers at rest_recovery_mult and does not drain', () => {
  it('36 s at 0.25x of a 9 s/pct drain is +1 energy; an unpaused twin loses 4', () => {
    const s = farm({ workers: { hawker: W(50, { paused: true }), grader: W(50) } });
    const n = run(s, 36);
    expect(n.workers.hawker!.energy).toBeCloseTo(50 + RECOVER * 36 / DRAIN, 9);
    expect(n.workers.grader!.energy).toBeCloseTo(50 - 36 / DRAIN, 9);
    expect(n.workers.hawker!.paused).toBe(true);
  });
  it('recovery caps at 100; rest_recovery_mult 0 freezes energy (no drain)', () => {
    expect(run(farm({ workers: { hawker: W(99, { paused: true }) } }), 36).workers.hawker!.energy).toBe(100);
    const z = { ...P, m4: { ...P.m4!, tc: { ...P.m4!.tc!, rest_recovery_mult: 0 } } } as typeof P;
    expect(run(farm({ workers: { hawker: W(40, { paused: true }) } }), 36, z).workers.hawker!.energy).toBe(40);
  });
  it('unpaid + paused still recovers and stays unpaid (no wage resume while paused)', () => {
    const s = farm({ workers: { market_hand: W(40, { paused: true, unpaid: true, cdS: 0 }) }, coinsCents: 1e9 });
    const ev: SimEvent[] = [];
    const n = run(s, 36, P, ev);
    expect(n.workers.market_hand).toMatchObject({ unpaid: true, paused: true });
    expect(n.workers.market_hand!.energy).toBeCloseTo(40 + RECOVER * 36 / DRAIN, 9);
    expect(ev.some(e => e.type === 'wage')).toBe(false);
  });
});

describe('[pause output] paused workers do no wage, collect, sell, or price/demand work', () => {
  it('Market Hand: no wage, no sell, cdS frozen; the player is not stalled', () => {
    const s = farm({
      workers: { market_hand: W(100, { paused: true, cdS: 0 }) },
      customers: [{ id: 1, demand: 4, filled: 0, waitedS: 0 }], basket: 8,
    });
    const ev: SimEvent[] = [];
    const n = run(s, 1, P, ev);
    expect(ev.filter(e => e.type === 'wage' || e.type === 'sell')).toEqual([]);
    expect(n.basket).toBe(8); expect(n.coinsCents).toBe(s.coinsCents);
    expect(n.workers.market_hand!.cdS).toBe(0);
    expect(marketHandStalled(s, P)).toBe(false);
    expect(demandPerSec(s, P)).toBeGreaterThan(0);
    expect(wagesPerSec(s, P)).toBe(0);
    const live = run(farm({ workers: { market_hand: W(100, { cdS: 0 }) }, customers: s.customers, basket: 8 }), 1, P);
    expect(live.basket).toBeLessThan(8);
  });
  it('Coop Hand: no collect while paused; working collect rate drops to the tap', () => {
    const s = farm({ workers: { coop_hand: W(100, { paused: true, cdS: 0 }) }, coop: 40, basket: 0 });
    const ev: SimEvent[] = [];
    const n = run(s, 2, P, ev);
    expect(ev.some(e => e.type === 'worker_collect')).toBe(false);
    expect(n.basket).toBe(0); expect(n.workers.coop_hand!.cdS).toBe(0);
    expect(collectPerSec(s, P)).toBe(collectPerSec(farm({ workers: {} }), P));
    const hired = farm({ workers: { coop_hand: W(100) } });
    expect(collectPerSec(hired, P)).toBeGreaterThan(collectPerSec(s, P));
  });
  it('paused Grader price mult is 1 and paused Hawker demand mult is 1', () => {
    const s = farm({ workers: { grader: W(100, { paused: true }), hawker: W(100, { paused: true }) } });
    expect(graderMult(s.workers, s.graderTier, P)).toBe(1);
    expect(hawkerDemandMult(s.workers, P)).toBe(1);
    const live = farm({ workers: { grader: W(100), hawker: W(100) } });
    expect(graderMult(live.workers, live.graderTier, P)).toBeGreaterThan(1);
    expect(hawkerDemandMult(live.workers, P)).toBeGreaterThan(1);
  });
});

describe('[B5][E9] Market Hand callLockoutS is 45 sim seconds from resume and counts down in sim time', () => {
  it('resume sets tc_pause_call_lockout_s on the Market Hand only and replaces a partial lockout', () => {
    const s = farm({ workers: { market_hand: W(40, { paused: true, callLockoutS: 5 }), coop_hand: W(40, { paused: true }) } });
    const n = resumeWorker(resumeWorker(s, 'coop_hand', P), 'market_hand', P);
    expect(n.workers.coop_hand!.callLockoutS).toBeUndefined();
    expect(n.workers.coop_hand!.paused).toBe(false);
    expect(n.workers.market_hand!.paused).toBe(false);
    expect(n.workers.market_hand!.callLockoutS).toBe(LOCK);
    expect(LOCK).toBe(45);
    expect(resumeWorker(n, 'market_hand', P)).toBe(n); // not paused: same object
  });
  it('counts down on sim dt, including a no-focus tick; hits 0 as absent, never negative', () => {
    const s = farm({ workers: { market_hand: W(80, { callLockoutS: LOCK }) } });
    const ev: SimEvent[] = [];
    const n = step(s, 10, P, ev, { focus: false, nowMs: 0 });
    expect(n.workers.market_hand!.callLockoutS).toBeCloseTo(LOCK - 10, 9);
    expect(run(n, 35).workers.market_hand!.callLockoutS).toBeUndefined();
    expect('callLockoutS' in run(s, LOCK + 5).workers.market_hand!).toBe(false);
  });
  it('pause does not clear a running lockout; the countdown continues while that worker is paused', () => {
    const s = pauseWorker(farm({ workers: { market_hand: W(80, { callLockoutS: 12 }) } }), 'market_hand', P);
    expect(s.workers.market_hand!.callLockoutS).toBe(12);
    expect(run(s, 4).workers.market_hand!.callLockoutS).toBeCloseTo(8, 9);
  });
  it('[offline][hidden>=60] m5Offline and a hidden gap of 60 s freeze the lockout and recovery; a 5 s hide does not', () => {
    const ws = { market_hand: W(50, { paused: true, callLockoutS: 20 }) };
    const s = farm({ workers: ws });
    const ev: SimEvent[] = [];
    const off = m5Offline(s, P, ev);
    expect(off.workers.market_hand).toMatchObject({ energy: 50, callLockoutS: 20, paused: true });
    expect(ev).toEqual([]);
    const kv = mem(); let t = 1_700_000_000_000;
    const g = new Game(P, kv, () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
    g.state = farm({ workers: { market_hand: { ...W(50, { paused: true, callLockoutS: 20 }) } } });
    g.onHidden(t); t += 120_000; g.onShown(t);
    expect(g.state.workers.market_hand).toMatchObject({ energy: 50, callLockoutS: 20, paused: true });
    const g2 = new Game(P, mem(), () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
    g2.state = farm({ workers: { market_hand: { ...W(50, { paused: true, callLockoutS: 20 }) } } });
    const t0 = t; g2.onHidden(t0); t += 5_000; g2.onShown(t);
    expect(g2.state.workers.market_hand!.callLockoutS).toBeCloseTo(15, 6);
    expect(g2.state.workers.market_hand!.energy).toBeCloseTo(50 + RECOVER * 5 / DRAIN, 6);
  });
});

describe('[CCR-F4] pause sim reads rest_recovery_mult while the flag is on', () => {
  it('missing rest_recovery_mult is a validateBalance error (no silent 0)', () => {
    const { rest_recovery_mult: _r, ...tcNo } = b.m4!.tc as Record<string, number>;
    const on = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, pause: 1 }, tc: tcNo } } as typeof b;
    expect(() => validateBalance(on)).toThrow(/tc\.rest_recovery_mult is required while flags\.pause is on/);
  });
});

describe('[durS] 45 s combo is not scored as tc_ability_s; durS is stripped with activeS on end', () => {
  const NOW = Date.UTC(2026, 9, 29, 12);
  const AB = ON; // abilities on
  const durS = 45;
  const left = 20; // ran 25 s of a 45 s combo; scoring the leftover against tc_ability_s (30) would report effect_s 10
  const readyAt = NOW + 60_000;
  const withCombo = (): GameState => farm({
    abilities: { hawker: { readyAt, activeS: left, durS } },
  }, AB);
  const load = (s: GameState) => { const ev: SimEvent[] = []; return { s: m5Load(s, AB, NOW, ev) as GameState, ev }; };

  it('m5Persist and serialize keep durS and activeS on the ability entry; neither is rewritten to tc_ability_s; input is not mutated', () => {
    const s = withCombo();
    const p = m5Persist(s) as GameState;
    expect(p.abilities!.hawker).toEqual({ readyAt, activeS: left, durS });
    expect(s.abilities!.hawker!.durS).toBe(durS);
    const saved = JSON.parse(serialize(s, NOW)).state;
    expect(saved.abilities.hawker).toEqual({ readyAt, activeS: left, durS });
    expect('abilityDurS' in saved).toBe(false);
  });
  it('[combo 45] m5Load / m5Offline use durS for effect_s (25), then strip durS with activeS and keep readyAt', () => {
    const live = withCombo();
    const { s, ev } = load(live);
    expect(ev).toEqual([{ type: 'ability_ended', worker: 'hawker', cause: 'offline', effect_s: durS - left }]);
    expect(s.abilities!.hawker).toEqual({ readyAt });
    expect(live.abilities!.hawker!.durS).toBe(durS); // load does not mutate the input
    const oev: SimEvent[] = [];
    const o = m5Offline(withCombo(), AB, oev) as GameState;
    expect(oev).toEqual([{ type: 'ability_ended', worker: 'hawker', cause: 'offline', effect_s: durS - left }]);
    expect(o.abilities!.hawker).toEqual({ readyAt });
  });
  it('[combo 45] a 45 s call that has not ticked (activeS 45) reports effect_s 0 and drops durS', () => {
    const s = farm({ abilities: { grader: { readyAt: NOW, activeS: durS, durS } } }, AB);
    const ev: SimEvent[] = [];
    const o = m5Offline(s, AB, ev) as GameState;
    expect(ev).toEqual([{ type: 'ability_ended', worker: 'grader', cause: 'offline', effect_s: 0 }]);
    expect(o.abilities!.grader).toEqual({ readyAt: NOW });
  });
  it('[combo 45] a saved call with no durS still scores against tc_ability_s (effect_s 10 for 20 s left)', () => {
    const { s, ev } = load(farm({ abilities: { hawker: { readyAt, activeS: left } } }, AB));
    expect(ev).toEqual([{ type: 'ability_ended', worker: 'hawker', cause: 'offline', effect_s: tc.ability_s - left }]);
    expect(s.abilities!.hawker).toEqual({ readyAt });
  });
  it('[combo 45][hidden>=60] a persisted 45 s combo ends at effect_s 25 and durS does not come back', () => {
    const kv = mem(); let t = NOW;
    const g = new Game(AB, kv, () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
    const evs: any[] = []; g.on(e => evs.push(e));
    g.state = withCombo();
    g.save();
    const stored = JSON.parse(kv.getItem(SAVE_KEY)!).state;
    expect(stored.abilities.hawker).toEqual({ readyAt, activeS: left, durS });
    expect(stored.abilityDurS).toBeUndefined();
    g.onHidden(t); t += 120_000; g.onShown(t);
    expect(evs.filter(e => e.type === 'ability_ended')).toEqual([
      { type: 'ability_ended', worker: 'hawker', cause: 'offline', effect_s: durS - left }]);
    expect(g.state.abilities!.hawker).toEqual({ readyAt });
  });
});
