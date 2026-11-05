// HoE/pause-sim (manifest row 31): Pause/Resume sim behind m4.flags.pause.
// Spec citations in tree: product/workers/m5-worker-pause-spec.md v1.3.6 rule 1, rule 3 / §6, rule 7 (B5), E2/E9/E12.
// D-HOP-2026-11-06-01 (a): Pause v1.3.15 — offline egg grant ignores pause and hire. Wages, recovery, and call lockout still freeze.
// lockout tc_pause_call_lockout_s = 45 sim seconds (Market Hand). UI and the G5-P driver are out of scope.
// AC-P1 flag-off has no behavioural effect. AC-P2 / rule 1: below tc_pause_unlock_farm the toggle does nothing.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b, validateBalance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { graderMult, hawkerDemandMult } from '../src/sim/workers';
import { isPaused, pauseWorker, resumeWorker } from '../src/sim/pause';
import { collectPerSec, demandPerSec, marketHandStalled, wagesPerSec } from '../src/econ/income';
import { applyOffline } from '../src/sim/offline';
import { m5Load, m5Offline } from '../src/save/m5-fields';
import { checksum, SAVE_KEY, serialize, validate } from '../src/save/save';
import { Game } from '../src/game';
import { mem } from './helpers';
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

describe('[AC-P13][§15] committed tracksV7 save with a hired worker', () => {
  const env = JSON.parse(readFileSync(new URL('./fixtures/saves/m5-pause-committed-hired.json', import.meta.url), 'utf8'));
  const raw = env.ls['eggfarm.save'] as string;
  const hired = { energy: 100, cdS: 0 };
  const file = JSON.parse(raw);
  const t0 = file.savedAt as number;
  const GAP = 120_000;
  const boot = (save: string, now: number) => {
    const kv = mem(); kv.setItem(SAVE_KEY, save);
    const g = new Game(P, kv, () => now, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
    return { kv, g };
  };
  const bothPaused = (s: GameState) => pauseWorker(pauseWorker(s, 'market_hand', P), 'coop_hand', P);
  const bothResumed = (s: GameState) => resumeWorker(resumeWorker(s, 'market_hand', P), 'coop_hand', P);

  it('[AC-P13][§15] the fixture is a committed tracksV7 save and validate → m5Load keeps both hires', () => {
    expect(env.idb.main).toBe(raw);
    expect(file.version).toBe(6);
    expect(file.sum).toBe(checksum(JSON.stringify(file.state)));
    expect(file.state.tracksV7).toBe(1);
    expect(file.state.v6BackupId).toBe('b42507d60308d615');
    expect(file.state.farmLevel).toBeGreaterThanOrEqual(tc.pause_unlock_farm);
    expect(file.state.workers).toEqual({ market_hand: hired, coop_hand: hired });
    const v = validate(raw, P, t0);
    if (!v.ok) throw new Error(v.reason);
    const ev: SimEvent[] = [];
    expect(m5Load(v.file.state, P, t0, ev).workers).toEqual({ market_hand: hired, coop_hand: hired });
    expect(ev).toEqual([]);
  });

  it('[AC-P13][§15] loads the fixture, pauses, resumes, round-trips, and exports without throw', () => {
    const { kv, g } = boot(raw, t0);
    expect(g.state.workers).toEqual({ market_hand: hired, coop_hand: hired });
    g.state = bothPaused(g.state);
    expect(isPaused(g.state.workers.market_hand, P)).toBe(true);
    expect(isPaused(g.state.workers.coop_hand, P)).toBe(true);
    g.save();
    expect(() => g.telemetry.exportJSON()).not.toThrow();
    expect(JSON.parse(g.telemetry.exportJSON()).events).toBeInstanceOf(Array);
    expect(() => serialize(g.state, t0)).not.toThrow();
    const pausedRaw = kv.getItem(SAVE_KEY)!;
    const pausedAt = JSON.parse(pausedRaw).savedAt as number;
    const { kv: kv2, g: g2 } = boot(pausedRaw, pausedAt);
    expect(g2.state.workers.market_hand!.paused).toBe(true);
    expect(g2.state.workers.coop_hand!.paused).toBe(true);
    g2.state = bothResumed(g2.state);
    expect(isPaused(g2.state.workers.market_hand, P)).toBe(false);
    expect(isPaused(g2.state.workers.coop_hand, P)).toBe(false);
    g2.save();
    expect(() => g2.telemetry.exportJSON()).not.toThrow();
    const resumedRaw = kv2.getItem(SAVE_KEY)!;
    const round = boot(resumedRaw, JSON.parse(resumedRaw).savedAt).g;
    expect(isPaused(round.state.workers.market_hand, P)).toBe(false);
    expect(round.state.workers.coop_hand!.paused).toBe(false);
    expect(round.state.workers.market_hand!.callLockoutS).toBe(LOCK);
  });

  it('[AC-P13][§15] pause freezes online wages; an offline egg grant matches the unpaused grant', () => {
    const { g } = boot(raw, t0);
    const open = { ...g.state, workers: { market_hand: { energy: 40, cdS: 0 }, coop_hand: { energy: 40, cdS: 0 } } };
    const ev: SimEvent[] = [];
    const working = step(open, 5, P, ev);
    expect(working.coinsCents).toBeLessThan(open.coinsCents);
    expect(ev.some(e => e.type === 'wage')).toBe(true);
    const paused = bothPaused(open);
    const mixed = pauseWorker(open, 'market_hand', P);
    const none = { ...open, workers: {} };
    expect(wagesPerSec(paused, P)).toBe(0);
    const held: SimEvent[] = [];
    const still = step(paused, 5, P, held);
    expect(still.coinsCents).toBe(paused.coinsCents);
    expect(still.basket).toBe(paused.basket);
    expect(still.workers.market_hand!.energy).toBeCloseTo(40 + RECOVER * 5 / DRAIN, 6);
    expect(held.filter(e => e.type === 'wage' || e.type === 'worker_collect')).toEqual([]);
    expect(still.workers.market_hand!.cdS).toBe(paused.workers.market_hand!.cdS);
    const grant = applyOffline(open, GAP, P).eggs;
    expect(grant).toBeGreaterThan(0);
    expect(applyOffline(paused, GAP, P).eggs).toBe(grant);
    expect(applyOffline(mixed, GAP, P).eggs).toBe(grant);
    expect(applyOffline(none, GAP, P).eggs).toBe(grant);
    expect(applyOffline(paused, GAP, OFF).eggs).toBe(applyOffline(open, GAP, OFF).eggs);
    expect(applyOffline(open, GAP, OFF).eggs).toBe(grant);
    const under = b.offline.offlineMinSeconds * 1000 - 1000;
    const over = b.offline.offlineCapSeconds * 1000 + 3_600_000;
    expect(applyOffline(paused, under, P).eggs).toBe(applyOffline(open, under, P).eggs);
    expect(applyOffline(paused, over, P).eggs).toBe(applyOffline(open, over, P).eggs);
    g.state = paused;
    const coins = g.state.coinsCents, basket = g.state.basket;
    g.onHidden(t0);
    expect(g.onShown(t0 + GAP)).toBe(grant);
    expect(g.state.pendingOfflineEggs).toBe(grant);
    expect(g.state.coinsCents).toBe(coins);
    expect(g.state.basket).toBe(basket);
    expect(g.state.workers.market_hand).toMatchObject({ energy: 40, cdS: 0, paused: true });
  });

  it('[AC-P13][§15] resume does not double-credit wages or recovery for the paused gap', () => {
    const { g } = boot(raw, t0);
    const open = { ...g.state, workers: { market_hand: { energy: 40, cdS: 0 }, coop_hand: { energy: 40, cdS: 0 } } };
    const grant = applyOffline(open, GAP, P).eggs;
    expect(grant).toBeGreaterThan(0);
    g.state = bothPaused(open);
    const coins = g.state.coinsCents, basket = g.state.basket;
    g.onHidden(t0);
    expect(g.onShown(t0 + GAP)).toBe(grant);
    expect(g.state.pendingOfflineEggs).toBe(grant);
    expect(g.state.coinsCents).toBe(coins);
    expect(g.state.workers.market_hand!.energy).toBe(40);
    g.state = bothResumed(g.state);
    expect(g.state.pendingOfflineEggs).toBe(grant);
    expect(g.state.coinsCents).toBe(coins);
    expect(g.state.basket).toBe(basket);
    expect(g.state.workers.market_hand!.energy).toBe(40);
    const ev: SimEvent[] = [];
    const stepped = step(g.state, 5, P, ev);
    const twin = step(bothResumed(open), 5, P, []);
    expect(stepped.coinsCents - coins).toBe(twin.coinsCents - open.coinsCents);
    expect(stepped.coinsCents).toBeLessThan(coins);
    expect(stepped.workers.market_hand!.energy).toBeCloseTo(40 - 5 / DRAIN, 6);
    expect(stepped.workers.market_hand!.energy).toBeGreaterThan(step(bothResumed(open), GAP / 1000, P, []).workers.market_hand!.energy);
    expect(ev.some(e => e.type === 'wage')).toBe(true);
  });

  it('[AC-P13][§15] paused survives save/load', () => {
    const { kv, g } = boot(raw, t0);
    g.state = bothPaused(g.state);
    g.save();
    const stored = kv.getItem(SAVE_KEY)!;
    const body = JSON.parse(stored);
    expect(body.state.workers.market_hand.paused).toBe(true);
    expect(body.state.workers.coop_hand.paused).toBe(true);
    expect(body.sum).toBe(checksum(JSON.stringify(body.state)));
    const again = boot(stored, body.savedAt).g;
    expect(isPaused(again.state.workers.market_hand, P)).toBe(true);
    expect(isPaused(again.state.workers.coop_hand, P)).toBe(true);
    expect(again.state.workers.market_hand).toMatchObject({ energy: 100, cdS: 0, paused: true });
  });

  it('[AC-P13][§15] legacy save without a pause field loads unpaused', () => {
    expect('paused' in file.state.workers.market_hand).toBe(false);
    expect('paused' in file.state.workers.coop_hand).toBe(false);
    const v = validate(raw, P, t0);
    if (!v.ok) throw new Error(v.reason);
    expect(isPaused(v.file.state.workers.market_hand, P)).toBe(false);
    expect(isPaused(v.file.state.workers.coop_hand, P)).toBe(false);
    const ev: SimEvent[] = [];
    const worked = step(v.file.state, 1, P, ev);
    expect(ev.some(e => e.type === 'wage')).toBe(true);
    expect(worked.coinsCents).toBeLessThan(v.file.state.coinsCents);
    const { g } = boot(raw, t0);
    expect(isPaused(g.state.workers.market_hand, P)).toBe(false);
    expect(g.state.workers.market_hand!.paused).toBeUndefined();
  });
});
