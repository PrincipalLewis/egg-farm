// Saves risk-helpers PR (TASK HoE/v5-risk-helpers; engineering/tasks/v5-ui-ss-fatigue/SIM-API.md, pinned, unchanged).
// Spec: product/market/sales-stopped-spec.md v1.3.27 (cfff3817) §4.1-§4.8, §5, §7, §8, §11; gate card FC-AC1-7 (product/m5-gate-acs.md).
// Every test name starts with its AC id. Sim-level: step() fixtures on the 10 Hz tick with an explicit focus clock.
import { describe, it, expect } from 'vitest';
import { balance } from '../src/config/balance';
import type { M5Flag } from '../src/config/flags';
import { initialState, type GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { WORKERS } from '../src/sim/workers';
import type { SimEvent } from '../src/sim/events';
import { m5Persist, m5Offline, M5_SESSION_KEYS } from '../src/save/m5-fields';
import { M5_SAVED_FIELDS } from '../src/sim/m5-state';
import { serialize, SAVE_VERSION } from '../src/save/save';
import { validateEvent } from '../src/telemetry/schema';
import {
  incomePerSec, workerAtRisk, workersAtRisk, costliestAtRisk, fatigueShare,
  stallView, fatigueCueView, resetStallTimers, setUiGates, noteStallChipTap, noteFatigueCueShown, noteFatigueCueTap,
  type StallCause, type StallResolvedBy, type StallView, type FatigueCueView, type FatigueSurface,
} from '../src/econ/income';
import { fatigueShareOf, cueStep, type CueHold } from '../src/econ/stall';

type B = typeof balance;
const withFlags = (flags: Partial<Record<M5Flag, number>>, tc: Record<string, number> = {}): B =>
  ({ ...balance, m4: { ...balance.m4!, enabled: 1, flags: { ...(balance.m4 as any).flags, ...flags }, tc: { ...(balance.m4 as any).tc, ...tc } } }) as B;
const OFF = withFlags({});
const ON = withFlags({ salesStopped: 1 });
const ON_FC = withFlags({ salesStopped: 1, fatigueCue: 1 });
const ON_P = withFlags({ salesStopped: 1, pause: 1 });
const ON_FC_P = withFlags({ salesStopped: 1, fatigueCue: 1, pause: 1 });

/** F17 stall fixture (SS-1): MH asleep, basket 100, three customers waiting, coop empty. */
const fx = (b: B, o: Partial<GameState> = {}): GameState => ({
  ...initialState(b, 1), farmLevel: 17, hensLevel: 17, eggValueLevel: 17, tracksV7: 1, basket: 100, coop: 0, coinsCents: 1_000_000,
  customers: [1, 2, 3].map(id => ({ id, demand: 3, filled: 0, waitedS: 0 })), nextCustomerId: 4, nextCustomerInS: 5,
  workers: { market_hand: { energy: 0, cdS: 0 } }, ...o,
} as GameState);
/** n ticks of 0.1 s; focus on unless told otherwise. Returns the state; events go to ev. */
/** The UI's per-frame gates (SIM-API Changes): farm screen active, onboarding done. */
const G = { farmScreenActive: true, onboardingDone: true };
function run(s: GameState, b: B, ticks: number, ev: SimEvent[], focus = true, each?: (s: GameState, i: number) => GameState): GameState {
  for (let i = 0; i < ticks; i++) { setUiGates(s, b, G); s = step(s, 0.1, b, ev, { focus }); if (each) s = each(s, i); }
  return s;
}
const stalls = (ev: SimEvent[]) => ev.filter(e => e.type === 'sales_stall') as any[];
const cues = (ev: SimEvent[], t = 'fatigue_cue_shown') => ev.filter(e => e.type === t) as any[];
const valid = (e: any) => { const { type, ...rest } = e; return validateEvent({ type, ts: 1_761_830_000_000, sid: 'a1b2c3', fgMs: 1, ...rest } as any); };
/** First tick index (1-based) at which stallView(s).shown is true; -1 if never within `ticks`. */
function firstShown(s: GameState, b: B, ticks: number, ev: SimEvent[] = []): number {
  for (let i = 1; i <= ticks; i++) { setUiGates(s, b, G); s = step(s, 0.1, b, ev, { focus: true }); if (stallView(s, b).shown) return i; }
  return -1;
}

describe('risk helpers (income.ts, signatures from income-ts-out-of-scope.patch)', () => {
  it('[SS-24 / §4.8 workerAtRisk] Tired/Asleep: income(w at 100%) - income(s); Working, Unpaid, unhired: 0', () => {
    const s = fx(ON, { workers: { market_hand: { energy: 0, cdS: 0 }, coop_hand: { energy: 80, cdS: 0 }, hawker: { energy: 10, cdS: 0 } } });
    const healed = { ...s, workers: { ...s.workers, market_hand: { energy: 100, cdS: 0 } } };
    expect(workerAtRisk('market_hand', s, ON)).toBeCloseTo(incomePerSec(healed, ON) - incomePerSec(s, ON), 12);
    expect(workerAtRisk('market_hand', s, ON)).toBeGreaterThan(0);
    expect(workerAtRisk('coop_hand', s, ON)).toBe(0); // Working
    expect(workerAtRisk('grader', s, ON)).toBe(0); // not hired
    const u = fx(ON, { workers: { market_hand: { energy: 0, cdS: 0, unpaid: true } } });
    expect(workerAtRisk('market_hand', u, ON)).toBe(0); // Unpaid excluded (§4.8)
    const r = workersAtRisk(s, ON); expect(Object.keys(r)).toEqual(WORKERS);
  });
  it('[§4.8 HoE ruling 03:25] workerAtRisk is never negative (clamped at 0), for every role and level', () => {
    for (const F of [3, 4, 8, 17, 40]) for (const energy of [0, 10]) {
      const s = fx(ON, { farmLevel: F, hensLevel: F, eggValueLevel: F, graderTier: 1, workers: Object.fromEntries(WORKERS.map(id => [id, { energy, cdS: 0 }])) as any });
      for (const id of WORKERS) expect(workerAtRisk(id, s, ON)).toBeGreaterThanOrEqual(0);
    }
  });
  it('[SS-48 / SS-G36] costliestAtRisk = max workerAtRisk, ties in code id order; null when nobody is at risk', () => {
    const s = fx(ON, { workers: { market_hand: { energy: 0, cdS: 0 }, hawker: { energy: 10, cdS: 0 } } });
    const r = workersAtRisk(s, ON), best = WORKERS.reduce((a, id) => (r[id] > r[a] ? id : a), WORKERS[0]);
    expect(costliestAtRisk(s, ON)).toBe(best);
    expect(costliestAtRisk(fx(ON, { workers: { market_hand: { energy: 100, cdS: 0 } } }), ON)).toBeNull();
  });
  it('[FC-AC3 / SS-31] fatigueShare excludes a Paused worker of every role (Pause flag on)', () => {
    for (const id of WORKERS) {
      const s = fx(ON_P, { workers: { [id]: { energy: 0, cdS: 0, paused: true } } as any });
      expect(workerAtRisk(id, s, ON_P)).toBe(0);
      expect(fatigueShare(s, ON_P)).toBe(0);
    }
  });
  it('[FC-AC6 / SS-15 share guard] denominator <= 0: 1 when loss > 0, else 0; never NaN/Infinity; result in [0,1]', () => {
    expect(fatigueShareOf(0.5, -0.5)).toBe(1); expect(fatigueShareOf(0.5, -2)).toBe(1); expect(fatigueShareOf(0, -1)).toBe(0); expect(fatigueShareOf(0, 0)).toBe(0);
    expect(fatigueShareOf(1, 3)).toBeCloseTo(0.25, 12);
    for (const [l, i] of [[1e-300, -1e-300], [5, 1e308], [0, 5], [1e15, 1e15]]) { const v = fatigueShareOf(l, i); expect(Number.isFinite(v)).toBe(true); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
    const s = fx(ON, { workers: { market_hand: { energy: 0, cdS: 0 } } }), v = fatigueShare(s, ON);
    expect(v).toBeGreaterThan(0); expect(v).toBeLessThanOrEqual(1);
  });
  it('[FC-AC4 / SS-32] base rates only: Frenzy, streak and running calls leave the share unchanged', () => {
    const s = fx(ON, { workers: { market_hand: { energy: 0, cdS: 0 }, hawker: { energy: 10, cdS: 0 } } });
    const t = { ...s, frenzyRemainingS: 20, streakS: 0.28, streakHoldS: 3, abilities: { hawker: { activeS: 10, durS: 30 } } } as GameState;
    expect(fatigueShare(t, ON)).toBe(fatigueShare(s, ON));
  });
});

describe('stall timers + chip state (§4.3-§4.6)', () => {
  it('[SS-1] mh_asleep shows at 8.0 s +/- 0.1 of focus time with no sale, not before 7.9 s; shown payload is schema-valid', () => {
    const ev: SimEvent[] = []; const i = firstShown(fx(ON), ON, 200, ev);
    expect(i).toBe(80);
    const at = run(fx(ON), ON, 80, []), v = stallView(at, ON);
    expect(v).toMatchObject({ shown: true, trigger: 'sell', cause: 'mh_asleep', stallId: 1 }); expect(v.noSaleS).toBeCloseTo(8, 6);
    const sh = stalls(ev); expect(sh).toHaveLength(1);
    expect(sh[0]).toMatchObject({ phase: 'shown', stall_id: 1, cause: 'mh_asleep', farm_level: 17, queue_len: at.customers.length, sellable_eggs: 100, coop_eggs: Math.floor(at.coop), mh_state: 'asleep', ch_state: 'none', session_s: 8, focus_s_since_last_sale: 8 });
    expect('prev_stall_id' in sh[0]).toBe(false); expect(valid(sh[0])).toEqual([]);
  });
  it('[SS-4][E12] mh_unpaid with coins $0', () => {
    const s = fx(ON, { coinsCents: 0, workers: { market_hand: { energy: 60, cdS: 0, unpaid: true } } });
    expect(firstShown(s, ON, 100)).toBe(80); expect(stallView(run(s, ON, 80, []), ON).cause).toBe('mh_unpaid');
  });
  it('[SS-5][E13] no_mh at F3 shows at 20 s; never at F2', () => {
    const s3 = fx(ON, { farmLevel: 3, hensLevel: 3, eggValueLevel: 3, workers: {} });
    expect(firstShown(s3, ON, 300)).toBe(200); expect(stallView(run(s3, ON, 200, []), ON).cause).toBe('no_mh');
    expect(firstShown({ ...s3, farmLevel: 2 }, ON, 290)).toBe(-1);
  });
  it('[SS-6][SS-33] ch_asleep / ch_unpaid (T-COLLECT): basket 0, coop >= 1, queue >= 1, shows at 8 s', () => {
    const a = fx(ON, { basket: 0, coop: 50, workers: { coop_hand: { energy: 0, cdS: 0 } } });
    expect(firstShown(a, ON, 120)).toBe(80); expect(stallView(run(a, ON, 80, []), ON)).toMatchObject({ trigger: 'collect', cause: 'ch_asleep' });
    const u = fx(ON, { basket: 0, coop: 50, coinsCents: 0, workers: { coop_hand: { energy: 60, cdS: 0, unpaid: true } } });
    expect(stallView(run(u, ON, 80, []), ON).cause).toBe('ch_unpaid');
  });
  it('[SS-30] mh_paused at 20 s of truly zero sales; a player sale at 15 s resets the hold', () => {
    const s = fx(ON_P, { workers: { market_hand: { energy: 50, cdS: 0, paused: true } } });
    expect(firstShown(s, ON_P, 300)).toBe(200); expect(stallView(run(s, ON_P, 200, []), ON_P).cause).toBe('mh_paused');
    const ev: SimEvent[] = []; let t = run(s, ON_P, 150, ev);
    t = apply(t, { type: 'sell', customerId: t.customers[0].id }, ON_P, ev);
    expect(firstShown(t, ON_P, 300)).toBe(200); // a full 20 s of focus time after the sale (the next tick counts)
  });
  it('[SS-7] no false stall: MH Working or Tired (3 s cadence) never triggers over 60 s', () => {
    for (const energy of [100, 20]) { const ev: SimEvent[] = []; const s = fx(ON, { workers: { market_hand: { energy, cdS: 0 } } });
      let n = 0; run(s, ON, 600, ev, true, x => { if (stallView(x, ON).shown) n++; return x; }); expect(n).toBe(0); expect(stalls(ev)).toHaveLength(0); }
  });
  it('[SS-14] Rush Hour seam: buyers outside s.customers never form Q; |Q| = 0 means no T-SELL', () => {
    const s = { ...fx(ON, { customers: [] }), rushLane: [{ id: 99, demand: 5 }] } as unknown as GameState;
    expect(firstShown({ ...s, nextCustomerInS: 1e9 }, ON, 120)).toBe(-1);
    expect(stallView(run(fx(ON), ON, 80, []), ON).cause).toBe('mh_asleep');
  });
  it('[§4.3 gates][SIM-API Changes] onboardingDone false: no chip and timers held at 0; before the first setUiGates: no chip', () => {
    let s = fx(ON); for (let i = 0; i < 200; i++) { setUiGates(s, ON, { farmScreenActive: true, onboardingDone: false }); s = step(s, 0.1, ON, [], { focus: true }); }
    expect(stallView(s, ON)).toMatchObject({ shown: false, noSaleS: 0 });
    const ev: SimEvent[] = []; let u = fx(ON); for (let i = 0; i < 200; i++) u = step(u, 0.1, ON, ev, { focus: true });
    expect(stallView(u, ON).shown).toBe(false); expect(stalls(ev)).toHaveLength(0);
  });
  it('[§4.3 gates][§4.5 C6, HoE d] leaving the farm screen hides the chip (focus_lost), timers keep running; return re-shows with prev_stall_id', () => {
    const ev: SimEvent[] = []; let s = run(fx(ON), ON, 80, ev); expect(stallView(s, ON).shown).toBe(true);
    for (let i = 0; i < 20; i++) { setUiGates(s, ON, { farmScreenActive: false, onboardingDone: true }); s = step(s, 0.1, ON, ev, { focus: true }); }
    expect(stallView(s, ON).shown).toBe(false); expect(stallView(s, ON).noSaleS).toBeCloseTo(10, 6);
    expect(stalls(ev).at(-1)).toMatchObject({ phase: 'resolved', resolved_by: 'focus_lost' });
    s = run(s, ON, 1, ev); expect(stalls(ev).at(-1)).toMatchObject({ phase: 'shown', stall_id: 2, prev_stall_id: 1 });
  });
  it('[SS-19] cause other only from an injected fault (MH Working that never sells)', () => {
    const s = fx(ON, { workers: { market_hand: { energy: 100, cdS: 1e9 } } });
    expect(stallView(run(s, ON, 80, []), ON).cause).toBe('other');
  });
});

describe('clears, re-arm, resolved_by (§4.5, §8)', () => {
  const shown = (b: B = ON, o: Partial<GameState> = {}, ev: SimEvent[] = []) => run(fx(b, o), b, 80, ev);
  const lastResolved = (ev: SimEvent[]) => stalls(ev).filter(e => e.phase === 'resolved').at(-1);
  it('[SS-8 C1][SS-34a] a sale hides on the next tick: sell_elsewhere; after a sell_all chip tap: chip_sell_all, chip_tapped', () => {
    for (const tap of [false, true]) {
      const ev: SimEvent[] = []; let s = shown(ON, {}, ev); if (tap) noteStallChipTap(s, 'sell_all');
      s = apply(s, { type: 'sellAll' }, ON, ev); s = step(s, 0.1, ON, ev, { focus: true });
      expect(stallView(s, ON).shown).toBe(false);
      expect(lastResolved(ev)).toMatchObject({ resolved_by: tap ? 'chip_sell_all' : 'sell_elsewhere', chip_tapped: tap, stall_id: 1 });
      expect(valid(lastResolved(ev))).toEqual([]);
    }
  });
  it('[SS-8 C2/C3] queue empty -> queue_empty; basket empty -> basket_empty', () => {
    let ev: SimEvent[] = []; let s = shown(ON, {}, ev); s = step({ ...s, customers: [] }, 0.1, ON, ev, { focus: true });
    expect(stallView(s, ON).shown).toBe(false); expect(lastResolved(ev).resolved_by).toBe('queue_empty');
    ev = []; s = shown(ON, {}, ev); s = step({ ...s, basket: 0.5 }, 0.1, ON, ev, { focus: true });
    expect(stallView(s, ON).shown).toBe(false); expect(lastResolved(ev).resolved_by).toBe('basket_empty');
  });
  it('[SS-8 C4][SS-2][E4] Refill hides at once: refill_elsewhere; after the chip refill tap: chip_refill; timers reset', () => {
    for (const tap of [false, true]) {
      const ev: SimEvent[] = []; let s = shown(ON, {}, ev); if (tap) noteStallChipTap(s, 'refill');
      s = apply(s, { type: 'manage', worker: 'market_hand' }, ON, ev); s = step(s, 0.1, ON, ev, { focus: true });
      const v = stallView(s, ON); expect(v.shown).toBe(false); expect(v.noSaleS).toBe(0);
      expect(lastResolved(ev)).toMatchObject({ resolved_by: tap ? 'chip_refill' : 'refill_elsewhere', chip_tapped: tap });
    }
  });
  it('[SS-8 C4] Unpaid MH auto-resume hides with auto_resume', () => {
    const ev: SimEvent[] = []; let s = run(fx(ON, { coinsCents: 0, workers: { market_hand: { energy: 60, cdS: 0, unpaid: true } } }), ON, 80, ev);
    s = step({ ...s, coinsCents: 1_000_000, workers: { market_hand: { energy: 60, cdS: 0 } } }, 0.1, ON, ev, { focus: true });
    expect(stallView(s, ON).shown).toBe(false); expect(lastResolved(ev).resolved_by).toBe('auto_resume');
  });
  it('[SS-8 C5][SS-30] pausing the asleep MH under 20 s of no sale hides with paused; re-shows as mh_paused at 20 s', () => {
    const ev: SimEvent[] = []; let s = shown(ON_P, {}, ev);
    s = step({ ...s, workers: { market_hand: { ...s.workers.market_hand!, paused: true } } }, 0.1, ON_P, ev, { focus: true });
    expect(stallView(s, ON_P).shown).toBe(false); expect(lastResolved(ev).resolved_by).toBe('paused');
  });
  it('[SS-8 C6][SS-13] focus loss hides (focus_lost) and freezes; focus return re-shows at once with a new stall_id + prev_stall_id', () => {
    const ev: SimEvent[] = []; let s = shown(ON, {}, ev);
    s = run(s, ON, 30, ev, false); const v = stallView(s, ON); expect(v.shown).toBe(false); expect(v.noSaleS).toBeCloseTo(8, 6);
    expect(lastResolved(ev)).toMatchObject({ resolved_by: 'focus_lost', chip_tapped: false, stall_id: 1 });
    s = step(s, 0.1, ON, ev, { focus: true }); expect(stallView(s, ON)).toMatchObject({ shown: true, stallId: 2 });
    expect(stalls(ev).at(-1)).toMatchObject({ phase: 'shown', stall_id: 2, prev_stall_id: 1 });
  });
  it('[SS-36] a manage chip tap followed by the sheet opening (C6) closes the pair with chip_manage, timers frozen', () => {
    const ev: SimEvent[] = []; let s = shown(withFlags({ salesStopped: 1, rc2Refill: 1 }), {}, ev); const b = withFlags({ salesStopped: 1, rc2Refill: 1 });
    noteStallChipTap(s, 'manage'); s = step(s, 0.1, b, ev, { focus: false });
    expect(lastResolved(ev)).toMatchObject({ resolved_by: 'chip_manage', chip_tapped: true }); expect(stallView(s, b).noSaleS).toBeCloseTo(8, 6);
  });
  it('[SS-8 C7] no_mh hides when the Market Hand is hired (resolved none)', () => {
    const ev: SimEvent[] = []; let s = run(fx(ON, { farmLevel: 3, hensLevel: 3, eggValueLevel: 3, workers: {} }), ON, 200, ev);
    expect(stallView(s, ON).cause).toBe('no_mh');
    s = apply(s, { type: 'hire', worker: 'market_hand' }, ON, ev); s = step(s, 0.1, ON, ev, { focus: true });
    expect(stallView(s, ON).shown).toBe(false); expect(lastResolved(ev).resolved_by).toBe('none');
  });
  it('[SS-9][SS-34b] after a clear the chip does not re-show before max(full hold, 5 s since hide)', () => {
    const ev: SimEvent[] = []; let s = shown(ON, {}, ev);
    s = apply(s, { type: 'manage', worker: 'market_hand' }, ON, ev); s = step(s, 0.1, ON, ev, { focus: true }); // C4 hide
    s = run(s, ON, 20, ev); // 2 s later MH falls asleep again with no sale in between
    s = { ...s, workers: { market_hand: { energy: 0, cdS: 0 } }, basket: 100, customers: [7, 8].map(id => ({ id, demand: 3, filled: 0, waitedS: 0 })) };
    expect(firstShown(s, ON, 200)).toBe(80);
  });
  it('[E6] a cause change while shown logs resolved(cause_changed) plus a new shown, without hiding', () => {
    const ev: SimEvent[] = []; let s = shown(ON, { coinsCents: 0, workers: { market_hand: { energy: 60, cdS: 0, unpaid: true } } }, ev);
    s = step({ ...s, workers: { market_hand: { energy: 0, cdS: 0, unpaid: true } } }, 0.1, ON, ev, { focus: true });
    s = step({ ...s, workers: { market_hand: { energy: 0, cdS: 0 } } }, 0.1, ON, ev, { focus: true });
    // Unpaid -> Asleep is not a C4 (still off): swap in place
    const st = stalls(ev); expect(stallView(s, ON)).toMatchObject({ shown: true, cause: 'mh_asleep' });
    expect(st.map(e => [e.phase, e.cause, e.resolved_by])).toEqual([['shown', 'mh_unpaid', undefined], ['resolved', 'mh_unpaid', 'cause_changed'], ['shown', 'mh_asleep', undefined]]);
  });
  it('[SS-19] every shown has exactly one resolved with the same stall_id; time_to_resolve_s = focus time +/- 0.1; all payloads valid', () => {
    const ev: SimEvent[] = []; let s = shown(ON, {}, ev); s = run(s, ON, 25, ev); s = apply(s, { type: 'sellAll' }, ON, ev); s = run(s, ON, 1, ev);
    const st = stalls(ev); expect(st.filter(e => e.phase === 'shown')).toHaveLength(1);
    const r = st.filter(e => e.phase === 'resolved'); expect(r).toHaveLength(1); expect(r[0].stall_id).toBe(1); expect(r[0].time_to_resolve_s).toBeCloseTo(2.6, 1);
    for (const e of st) expect(valid(e)).toEqual([]);
  });
});

describe('Pause / offline / reload (§7.1, §7.2, §7.5)', () => {
  it('[SS-10] Paused MH with a player sale every 19 s for 60 s: 0 shows; after Resume at energy 0 it shows at 8 s, not earlier', () => {
    const ev: SimEvent[] = []; let s = fx(ON_P, { workers: { market_hand: { energy: 50, cdS: 0, paused: true } } }); let n = 0;
    s = run(s, ON_P, 600, ev, true, (x, i) => { if (stallView(x, ON_P).shown) n++; return (i + 1) % 190 === 0 && x.customers.length ? apply(x, { type: 'sell', customerId: x.customers[0].id }, ON_P, ev) : x; });
    expect(n).toBe(0);
    s = { ...s, basket: 100, customers: [7, 8].map(id => ({ id, demand: 3, filled: 0, waitedS: 0 })), workers: { market_hand: { energy: 0, cdS: 0 } } }; // Resume (paused -> false) at energy 0
    expect(firstShown(s, ON_P, 200)).toBe(80);
  });
  it('[SS-11][SS-13][§7.2] a >= 60 s gap (m5Offline) resets through resetStallTimers: full 8 s hold after return; < 60 s keeps frozen values', () => {
    let s = run(fx(ON), ON, 60, []); expect(stallView(s, ON).noSaleS).toBeCloseTo(6, 6);
    const kept = run(s, ON, 300, [], false); expect(stallView(kept, ON).noSaleS).toBeCloseTo(6, 6); // hidden < 60 s: frozen (E15)
    s = m5Offline(kept, ON, []); expect(stallView(s, ON).noSaleS).toBe(0);
    expect(firstShown(s, ON, 200)).toBe(80);
    const t = run(fx(ON), ON, 60, []); resetStallTimers(t); expect(stallView(t, ON)).toMatchObject({ noSaleS: 0, noCollectS: 0, shown: false });
  });
  it('[SS-43] nothing persisted: the session record is stripped by m5Persist/serialize; M5_SAVED_FIELDS unchanged; SAVE_VERSION 6', () => {
    const s = run(fx(ON_FC), ON_FC, 120, []); expect(stallView(s, ON_FC).shown).toBe(true);
    expect((M5_SESSION_KEYS as readonly string[]).includes('stallSession')).toBe(true);
    expect('stallSession' in m5Persist(s)).toBe(false);
    const raw = serialize(s, 0); expect(raw).not.toMatch(/stall|fatigue|cue/i);
    // clockWageTipShown + clockWageWindow are Hire 2 saved keys (Saves-approved); stallSession stays session-only.
    expect(M5_SAVED_FIELDS).toEqual(['evRngState', 'nextSpawnRemainingS', 'frenzyRemainingS', 'broodyNestCents', 'broodyHenIdx', 'abilities', 'abilitiesUnlocked', 'abilitiesCoachSeen', 'breeds', 'clockWageTipShown', 'clockWageWindow']);
    expect((M5_SAVED_FIELDS as readonly string[]).includes('stallSession')).toBe(false);
    expect(SAVE_VERSION).toBe(6);
  });
  it('[SS-44][SS-45] a reloaded state (session stripped) starts a new episode: stall_id 1, no prev_stall_id, no resolved for an old id; one fatigue_cue_shown', () => {
    const ev: SimEvent[] = []; const loaded = m5Persist(run(fx(ON_FC), ON_FC, 120, []));
    run(loaded, ON_FC, 120, ev);
    const st = stalls(ev); expect(st[0]).toMatchObject({ phase: 'shown', stall_id: 1 }); expect('prev_stall_id' in st[0]).toBe(false);
    expect(st.filter(e => e.phase === 'resolved')).toHaveLength(0);
    expect(cues(ev).filter(e => e.surface === 'hud_chip')).toHaveLength(1);
  });
});

describe('Rule 2 hysteresis, fatigue cue, notes (§4.8, §5, §8 F-4c)', () => {
  const TC = { min: 0.15, hold: 5, clear: 0.12, clearHold: 2 };
  const drive = (shares: number[], h?: CueHold) => { let st: CueHold = h ?? { on: false, aboveS: 0, belowS: 0 }; const on: boolean[] = [];
    for (const x of shares) { st = cueStep(st, x, 0.1, TC).next; on.push(st.on); } return { st, on }; };
  it('[FC-AC2 / SS-24] shows within 6 s at 0.15, never at 0.14; stays at 0.13; clears within 3 s at 0.11', () => {
    expect(drive(Array(60).fill(0.15)).on.indexOf(true) + 1).toBe(50);
    expect(drive(Array(600).fill(0.14)).on.includes(true)).toBe(false);
    const up = drive(Array(60).fill(0.15)).st;
    expect(drive(Array(600).fill(0.13), up).on.every(Boolean)).toBe(true);
    expect(drive(Array(30).fill(0.11), up).on.indexOf(false) + 1).toBe(20);
  });
  it('[SS-26] a 60 s trace oscillating 0.12-0.15 makes 0 extra transitions', () => {
    const tr = Array.from({ length: 600 }, (_, i) => (i % 20 < 10 ? 0.12 : 0.15)); const { on } = drive(tr);
    expect(on.filter((x, i) => i > 0 && x !== on[i - 1]).length).toBeLessThanOrEqual(1);
  });
  /** A Tired-heavy farm with sales still flowing (no stall): MH Working, Hawker and Grader asleep. */
  const tiredFarm = (b: B) => fx(b, { customers: [], nextCustomerInS: 1e9, graderTier: 1, workers: { market_hand: { energy: 100, cdS: 0 }, hawker: { energy: 0, cdS: 0 }, grader: { energy: 0, cdS: 0 } } });
  it('[SS-49][F-4c] fatigue_cue_shown{hud_chip} fires once per episode at eligibility (fatigueCue = 1), with the six fields + suppressed_by_stall', () => {
    const s0 = tiredFarm(ON_FC); expect(fatigueShare(s0, ON_FC)).toBeGreaterThanOrEqual(0.15);
    const ev: SimEvent[] = []; const s = run(s0, ON_FC, 120, ev);
    const c = cues(ev); expect(c).toHaveLength(1); expect(c[0]).toMatchObject({ surface: 'hud_chip', suppressed_by_stall: false, n_asleep: 2, n_tired: 0, n_paused: 0 });
    expect(valid(c[0])).toEqual([]); expect(fatigueCueView(s, ON_FC)).toMatchObject({ shown: true, suppressedByStall: false }); expect(fatigueCueView(s, ON_FC).episodeId).not.toBeNull();
  });
  it('[FC-AC1][SS-23] fatigueCue = 0: no fatigue_cue_shown{hud_chip}; banner/bubble notes still emit; salesStopped = 0: nothing at all', () => {
    const ev: SimEvent[] = []; let s = run(tiredFarm(ON), ON, 120, ev); expect(cues(ev)).toHaveLength(0);
    noteFatigueCueShown(s, 'hud_chip'); noteFatigueCueShown(s, 'banner'); s = run(s, ON, 1, ev);
    expect(cues(ev).map(e => e.surface)).toEqual(['banner']);
    const off: SimEvent[] = []; let o = run(tiredFarm(OFF), OFF, 120, off); noteFatigueCueShown(o, 'bubble'); noteFatigueCueTap(o, 'hud_chip'); noteStallChipTap(o, 'sell_all'); resetStallTimers(o); setUiGates(o, OFF, G); o = run(o, OFF, 1, off);
    expect('stallSession' in o).toBe(false);
    expect(off.filter(e => /sales_stall|fatigue_cue/.test(e.type))).toHaveLength(0);
    expect(stallView(o, OFF)).toEqual({ shown: false, trigger: null, cause: null, stallId: null, noSaleS: 0, noCollectS: 0 });
    expect(fatigueCueView(o, OFF)).toMatchObject({ shown: false, episodeId: null, suppressedByStall: false });
  });
  it('[FC-SV11 / SIM-API] noteFatigueCueShown is idempotent per (episodeId, surface)', () => {
    const ev: SimEvent[] = []; let s = run(tiredFarm(ON_FC), ON_FC, 120, ev);
    for (let i = 0; i < 3; i++) { noteFatigueCueShown(s, 'hud_chip'); noteFatigueCueShown(s, 'bubble'); noteFatigueCueShown(s, 'banner'); s = run(s, ON_FC, 2, ev); }
    expect(cues(ev).map(e => e.surface).sort()).toEqual(['banner', 'bubble', 'hud_chip']);
  });
  it('[SS-48][SS-G37] noteFatigueCueTap logs one fatigue_cue_tapped per call with the six fields and no suppressed_by_stall', () => {
    const ev: SimEvent[] = []; let s = run(tiredFarm(ON_FC), ON_FC, 120, ev);
    noteFatigueCueTap(s, 'hud_chip'); noteFatigueCueTap(s, 'hud_chip'); s = run(s, ON_FC, 1, ev);
    const t = cues(ev, 'fatigue_cue_tapped'); expect(t).toHaveLength(2); expect('suppressed_by_stall' in t[0]).toBe(false); expect(valid(t[0])).toEqual([]);
  });
  it('[FC-AC5 / SS-12][SS-47] suppressedByStall while the stall chip shows; the episode continues and is not re-fired after the stall clears', () => {
    const ev: SimEvent[] = []; let s = run(fx(ON_FC), ON_FC, 120, ev); // MH asleep: stall chip at 8 s, cue eligible at 5 s
    expect(stallView(s, ON_FC).shown).toBe(true); const cv = fatigueCueView(s, ON_FC); expect(cv.shown).toBe(true); expect(cv.suppressedByStall).toBe(true);
    s = step({ ...s, customers: [] }, 0.1, ON_FC, ev, { focus: true }); // C2
    expect(fatigueCueView(s, ON_FC)).toMatchObject({ shown: true, suppressedByStall: false });
    expect(cues(ev).filter(e => e.surface === 'hud_chip')).toHaveLength(1);
  });
  it('[SS-12 (C4 exception)][SS-G39] rc2Refill = 0: a Refill C4 clear with share < 0.12 force-clears the cue display; the episode ends only by hysteresis', () => {
    const ev: SimEvent[] = []; let s = run(fx(ON_FC), ON_FC, 120, ev); const ep = fatigueCueView(s, ON_FC).episodeId; expect(ep).not.toBeNull();
    noteStallChipTap(s, 'refill'); s = apply(s, { type: 'manage', worker: 'market_hand' }, ON_FC, ev); s = run(s, ON_FC, 1, ev);
    expect(fatigueCueView(s, ON_FC)).toMatchObject({ shown: false, episodeId: ep });
    s = run(s, ON_FC, 25, ev); expect(fatigueCueView(s, ON_FC).episodeId).toBeNull(); // share < 0.12 held 2 s
    expect(cues(ev).filter(e => e.surface === 'hud_chip')).toHaveLength(1);
  });
  it('[HoE ruling 3, 03:25] no open episode: noteFatigueCueShown(banner|bubble) logs nothing', () => {
    const ev: SimEvent[] = []; let s = run(fx(ON_FC, { workers: { market_hand: { energy: 100, cdS: 0 } } }), ON_FC, 10, ev);
    expect(fatigueCueView(s, ON_FC).episodeId).toBeNull(); noteFatigueCueShown(s, 'banner'); noteFatigueCueShown(s, 'bubble'); s = run(s, ON_FC, 2, ev);
    expect(cues(ev)).toHaveLength(0);
  });
  it('[SS-31] n_paused counts a Paused worker; it is not in the loss', () => {
    const b = ON_FC_P, ev: SimEvent[] = []; const s0 = { ...tiredFarm(b), workers: { market_hand: { energy: 100, cdS: 0 }, hawker: { energy: 0, cdS: 0 }, grader: { energy: 0, cdS: 0 }, coop_hand: { energy: 0, cdS: 0, paused: true } } } as GameState;
    run(s0, b, 120, ev); expect(cues(ev)[0]).toMatchObject({ n_paused: 1, n_asleep: 2 });
  });
});

describe('flag-off byte identity and gate 2 (SS-21, SS-23, E14)', () => {
  const drive = (b: B, seed: number) => { const ev: SimEvent[] = []; let s = fx(b, { ...initialState(b, seed), farmLevel: 17, hensLevel: 17, eggValueLevel: 17 } as any);
    for (let i = 0; i < 1200; i++) { setUiGates(s, b, G); s = step(s, 0.1, b, ev, { focus: i % 300 < 250 }); if (i % 7 === 0) s = apply(s, { type: 'collect' }, b, ev); if (i % 113 === 0) s = apply(s, { type: 'sellAll' }, b, ev); }
    return { s, ev }; };
  const strip = (s: GameState) => { const { stallSession: _x, ...r } = s as any; return JSON.stringify(r); };
  it('[SS-21 gate 1][SS-23] flag off: no session record, no new events, views constant', () => {
    for (const seed of [1, 2, 3]) { const { s, ev } = drive(OFF, seed); expect('stallSession' in s).toBe(false); expect(ev.some(e => /sales_stall|fatigue_cue/.test(e.type))).toBe(false); }
  });
  it('[SS-21 gate 2][FC-AC7] flag on vs off: sim/economy state byte-identical (session record aside), same non-telemetry events', () => {
    for (const seed of [1, 2, 3]) { const a = drive(OFF, seed), c = drive(ON_FC, seed);
      expect(strip(c.s)).toBe(strip(a.s));
      expect(JSON.stringify(c.ev.filter(e => !/sales_stall|fatigue_cue/.test(e.type)))).toBe(JSON.stringify(a.ev)); }
  });
  it('[SS-23][E14] tc_stall_hold_s = 0: no chip and no sales_stall; Rule 2 unaffected', () => {
    const b = withFlags({ salesStopped: 1, fatigueCue: 1 }, { stall_hold_s: 0 }), ev: SimEvent[] = [];
    const s = run(fx(b), b, 300, ev); expect(stallView(s, b).shown).toBe(false); expect(stalls(ev)).toHaveLength(0);
    expect(cues(ev)).toHaveLength(1);
  });
  it('[SIM-API] exported types exist with the pinned members', () => {
    const c: StallCause[] = ['mh_asleep', 'mh_paused', 'mh_unpaid', 'no_mh', 'ch_asleep', 'ch_unpaid', 'other'];
    const r: StallResolvedBy[] = ['chip_refill', 'chip_sell_all', 'chip_collect', 'chip_manage', 'refill_elsewhere', 'sell_elsewhere', 'collect_elsewhere', 'auto_resume', 'queue_empty', 'basket_empty', 'paused', 'focus_lost', 'cause_changed', 'none'];
    const f: FatigueSurface[] = ['hud_chip', 'banner', 'bubble'];
    const v: StallView = { shown: false, trigger: null, cause: null, stallId: 3, noSaleS: 0, noCollectS: 0 };
    const q: FatigueCueView = { share: 0, shown: false, episodeId: null, suppressedByStall: false };
    expect([c.length, r.length, f.length, Object.keys(v).length, Object.keys(q).length]).toEqual([7, 14, 3, 6, 4]);
  });
});
