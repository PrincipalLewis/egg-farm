// HoE/v5-refill-sim G2 (G0-API.md rev 11 sha256 a29b999d): restEligibility §14a, mutators, tick M4, m1/m4/m6/m7, manage no-op.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { balance as b, type Balance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { apply } from '../src/sim/actions';
import { step } from '../src/sim/tick';
import { WORKERS, type WorkerId } from '../src/sim/workers';
import {
  restEligibility, refillEligibility, refillableCount, restState, refillAgoSimMs, pct,
  refillWorker, setRest, setAutoRefill, takeAutoRefillToast, noteShiftSheetOpened, noteStallChipTap,
  tickRefill, chargesOf, chargesView, autoRefillOn, pausedDurationS, rc2RefillOn, refillSessionTotals,
  type RefillCtx,
} from '../src/sim/refill';

const fl = (f: Record<string, number>, tc: Record<string, number> = {}): Balance =>
  ({ ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, ...f }, tc: { ...b.m4!.tc!, ...tc }, enabled: f.__enabled ?? b.m4!.enabled } }) as Balance;
const R = fl({ rc2Refill: 1, pause: 1 });
const RA = fl({ rc2Refill: 1, autoRefill: 1, pause: 1 }, { autorefill_at_pct: 30, autorefill_reserve: 0 });
const CTX: RefillCtx = { sheetId: 1, entryPoint: 'nav' };
const base = (): GameState => ({
  ...initialState(b, 7), farmLevel: 12, tracksV7: 1,
  workers: {
    market_hand: { energy: 40, cdS: 0 },
    coop_hand: { energy: 80, cdS: 0 },
  },
});

describe('[G0 §14a] restEligibility: RestBlock disabled | locked | not_hired, first match wins', () => {
  it('disabled when m4.flags.pause is 0, even if also locked and not hired', () => {
    const bb = fl({ rc2Refill: 1, pause: 0 });
    const s: GameState = { ...base(), farmLevel: 1, workers: {} };
    expect(restEligibility(s, 'market_hand', bb)).toEqual({ ok: false, reason: 'disabled' });
  });
  it('disabled when m4.enabled is 0', () => {
    const bb = { ...R, m4: { ...R.m4!, enabled: 0 } } as Balance;
    expect(restEligibility(base(), 'market_hand', bb)).toEqual({ ok: false, reason: 'disabled' });
  });
  it('locked beats not_hired: pause on, farm below unlock, worker absent → locked', () => {
    const s: GameState = { ...base(), farmLevel: 9, workers: {} }; // unlock is 10
    expect(restEligibility(s, 'hawker', R)).toEqual({ ok: false, reason: 'locked' });
  });
  it('not_hired when pause on, farm unlocked, worker absent', () => {
    const s: GameState = { ...base(), farmLevel: 12, workers: { market_hand: { energy: 40, cdS: 0 } } };
    expect(restEligibility(s, 'hawker', R)).toEqual({ ok: false, reason: 'not_hired' });
  });
  it('ok when pause on, farm unlocked, hired — mood, Unpaid, and callLockoutS do not block', () => {
    const s: GameState = {
      ...base(), farmLevel: 12,
      workers: { market_hand: { energy: 0, cdS: 0, unpaid: true, callLockoutS: 45 } },
    };
    expect(restEligibility(s, 'market_hand', R)).toEqual({ ok: true });
  });
  it('setRest(on:false) is never blocked: resumes even when restEligibility would be disabled', () => {
    const bb = fl({ rc2Refill: 1, pause: 1 });
    const s: GameState = {
      ...base(),
      workers: { market_hand: { energy: 40, cdS: 0, paused: true, restAuto: true } },
    };
    // drop pause flag after the worker was already resting
    const off = fl({ rc2Refill: 1, pause: 0 });
    const r = setRest(s, 'market_hand', false, off, CTX);
    // pause=0: setRest is a no-op (Architect); resume "never blocked" means restEligibility does not apply to off
    expect(r.events).toEqual([]);
    expect(r.state).toBe(s);
  });
});

describe('[G2][m4] refillEligibility precedence: flag_off > not_hired > unpaid > above_threshold > no_charges', () => {
  it('flag_off wins over every other reason', () => {
    const s: GameState = { ...base(), workers: {}, refillCharges: 0 };
    expect(refillEligibility(s, 'market_hand', b)).toEqual({ ok: false, reason: 'flag_off' });
  });
  it('not_hired beats unpaid / above_threshold / no_charges', () => {
    const s: GameState = { ...base(), workers: {}, refillCharges: 0 };
    expect(refillEligibility(s, 'hawker', R)).toEqual({ ok: false, reason: 'not_hired' });
  });
  it('unpaid beats above_threshold and no_charges', () => {
    const s: GameState = { ...base(), refillCharges: 0, workers: { market_hand: { energy: 80, cdS: 0, unpaid: true } } };
    expect(refillEligibility(s, 'market_hand', R)).toEqual({ ok: false, reason: 'unpaid' });
  });
  it('above_threshold beats no_charges', () => {
    const s: GameState = { ...base(), refillCharges: 0, workers: { market_hand: { energy: 80, cdS: 0 } } };
    expect(refillEligibility(s, 'market_hand', R)).toEqual({ ok: false, reason: 'above_threshold' });
  });
  it('no_charges when hired, paid, ≤ threshold, charges 0', () => {
    const s: GameState = { ...base(), refillCharges: 0, workers: { market_hand: { energy: 40, cdS: 0 } } };
    expect(refillEligibility(s, 'market_hand', R)).toEqual({ ok: false, reason: 'no_charges' });
  });
  it('ok at threshold, including Asleep and Paused; refillableCount includes them and excludes Unpaid', () => {
    const s: GameState = {
      ...base(), refillCharges: 1,
      workers: {
        market_hand: { energy: 50, cdS: 0, paused: true }, // at threshold, paused
        coop_hand: { energy: 0, cdS: 0 },                 // asleep
        hawker: { energy: 10, cdS: 0, unpaid: true },
        grader: { energy: 80, cdS: 0 },
      },
    };
    expect(refillEligibility(s, 'market_hand', R)).toEqual({ ok: true });
    expect(refillEligibility(s, 'coop_hand', R)).toEqual({ ok: true });
    expect(refillEligibility(s, 'hawker', R)).toEqual({ ok: false, reason: 'unpaid' });
    expect(refillEligibility(s, 'grader', R)).toEqual({ ok: false, reason: 'above_threshold' });
    expect(refillableCount(s, R)).toBe(2);
  });
});

describe('[G2][m1] pct is a clamped rounded integer 0..100', () => {
  it('rounds and clamps', () => {
    expect(pct(39.6)).toBe(40);
    expect(pct(-1)).toBe(0);
    expect(pct(100.4)).toBe(100);
    expect(pct(0)).toBe(0);
  });
});

describe('[G2] mutators', () => {
  it('noteShiftSheetOpened increments sheetSeq from 1 and emits shift_sheet_opened; stall_id only for stall_chip', () => {
    const a = noteShiftSheetOpened(base(), R, 'nav');
    expect(a.sheetId).toBe(1);
    expect(a.events).toEqual([{ type: 'shift_sheet_opened', entry: 'nav', sheet_id: 1 }]);
    const b2 = noteShiftSheetOpened(a.state, R, 'stall_chip', 3);
    expect(b2.sheetId).toBe(2);
    expect(b2.events[0]).toEqual({ type: 'shift_sheet_opened', entry: 'stall_chip', sheet_id: 2, stall_id: 3 });
    expect(noteShiftSheetOpened(base(), b, 'nav').events).toEqual([]);
  });

  it('refillWorker spends 1 charge, sets energy 100, does not write cdS, sets refillAgoMs[id]=0, starts chargeNextMs from the cap', () => {
    const s: GameState = { ...base(), refillCharges: 2, workers: { market_hand: { energy: 20, cdS: 7 } } };
    const r = refillWorker(s, 'market_hand', R, CTX);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.workers.market_hand!.energy).toBe(100);
    expect(r.state.workers.market_hand!.cdS).toBe(7); // never written (U1)
    expect(r.state.refillCharges).toBe(1);
    expect(r.state.refillAgoMs?.market_hand).toBe(0);
    expect(r.state.chargeNextMs).toBe(150_000); // from the cap, full regen
    expect(r.state).not.toBe(s);
    const used = r.events.find(e => e.type === 'refill_used') as any;
    expect(used.by).toBe('manual');
    expect(used.energy_pct).toBe(20);
    expect(used.charges_left).toBe(1);
    expect(used.sheet_id).toBe(1);
    expect('asleep_s' in (r.state as any)).toBe(false);
  });

  it('refillWorker resumes a paused worker with rest_toggled{on:false, cause:manage} and paused_duration_s from pausedForS (no pausedAgoMs)', () => {
    const s: GameState = {
      ...base(), refillCharges: 2,
      workers: { market_hand: { energy: 20, cdS: 0, paused: true, restAuto: true } },
      pausedForS: { market_hand: 3.9 },
    } as any;
    const r = refillWorker(s, 'market_hand', R, CTX);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.workers.market_hand!.paused).toBe(false);
    expect('restAuto' in r.state.workers.market_hand!).toBe(false);
    const ev = r.events.find(e => e.type === 'rest_toggled') as any;
    expect(ev).toMatchObject({ on: false, cause: 'manage', paused_duration_s: 3, sheet_id: 1 });
    expect('pausedAgoMs' in r.state).toBe(false);
    expect(pausedDurationS(s, 'market_hand')).toBe(3);
    expect(r.events.some(e => (e as { type: string }).type === 'worker_resumed' || (e as { type: string }).type === 'worker_paused')).toBe(false);
  });

  it('setRest on:true goes through pauseWorker, sets restAuto, emits rest_toggled with on:true fields; pause=0 is a no-op', () => {
    const r = setRest(base(), 'market_hand', true, R, CTX);
    expect(r.state.workers.market_hand!.paused).toBe(true);
    expect(r.state.workers.market_hand!.restAuto).toBe(true);
    const ev = r.events[0] as any;
    expect(ev.type).toBe('rest_toggled');
    expect(ev.on).toBe(true);
    expect(ev.state).toBe('resting');
    expect(ev.cause).toBe('manual');
    for (const k of ['farm', 'mood', 'unpaid', 'ability_active', 'golden_on_screen', 'frenzy_active']) expect(k in ev).toBe(true);
    expect(ev.paused_duration_s).toBeUndefined();
    expect(restState(r.state.workers.market_hand, R)).toBe('resting');
    const src = base();
    const off = setRest(src, 'market_hand', true, fl({ rc2Refill: 1, pause: 0 }), CTX);
    expect(off.state).toBe(src);
    expect(off.events).toEqual([]);
  });

  it('setRest on:false resumes, drops restAuto, emits paused_duration_s from pausedForS; never blocked', () => {
    const s: GameState = {
      ...base(),
      workers: { market_hand: { energy: 40, cdS: 0, paused: true, restAuto: true } },
      pausedForS: { market_hand: 1 },
    } as any;
    const r = setRest(s, 'market_hand', false, R, CTX);
    expect(r.state.workers.market_hand!.paused).toBe(false);
    expect('restAuto' in r.state.workers.market_hand!).toBe(false);
    const ev = r.events[0] as any;
    expect(ev).toMatchObject({ on: false, cause: 'manual', paused_duration_s: 1 });
    expect(ev.farm).toBeUndefined();
    expect(r.state.workers.market_hand!.callLockoutS).toBeGreaterThan(0); // B5
  });

  it('setAutoRefill is a no-op unless both flags are on; emits autorefill_toggled; autoRefillOn is a pure read', () => {
    const src = base();
    const no = setAutoRefill(src, 'market_hand', true, R); // autoRefill flag off
    expect(no.state).toBe(src);
    expect(no.events).toEqual([]);
    const r = setAutoRefill(src, 'market_hand', true, RA);
    expect(r.state.workers.market_hand!.autoRefill).toBe(true);
    expect(r.events).toEqual([{ type: 'autorefill_toggled', worker: 'market_hand', on: true, farm_level: 12 }]);
    expect(autoRefillOn(r.state, 'market_hand', RA)).toBe(true);
    const before = JSON.stringify(r.state);
    autoRefillOn(r.state, 'market_hand', RA);
    expect(JSON.stringify(r.state)).toBe(before);
  });

  it('[m6] takeAutoRefillToast returns one coalesced toast and drains the queue; empty → null, same object', () => {
    const s: GameState = { ...base(), refillSession: { sheetSeq: 1, refillsManual: 0, refillsAuto: 2, chargeStarvedS: 0, shortageS: 0, chargesCappedS: 0, autoToastQueue: ['hawker', 'grader'] } };
    const r = takeAutoRefillToast(s);
    expect(r.toast).toEqual({ n: 2, worker: 'grader' });
    expect(r.state.refillSession!.autoToastQueue).toEqual([]);
    const empty = takeAutoRefillToast(r.state);
    expect(empty.toast).toBeNull();
    expect(empty.state).toBe(r.state);
  });

  it('noteStallChipTap never refills at rc2Refill=1 (chip→sheet path only)', () => {
    const s: GameState = { ...base(), refillCharges: 2, workers: { market_hand: { energy: 20, cdS: 0 } } };
    expect(noteStallChipTap(s, 'manage')).toBe(s);
    expect(s.workers.market_hand!.energy).toBe(20);
    expect(s.refillCharges).toBe(2);
  });
});

describe('[G2][M4] tickRefill: integer ms, regen, rest auto-end, auto-refill, accumulators', () => {
  it('regens one charge after exact regen ms; nextChargeMs is null at the cap; materialises refillCharges', () => {
    const s: GameState = { ...base(), refillCharges: 1, chargeNextMs: 100 };
    const out = tickRefill(s, 100, R);
    expect(out.refillCharges).toBe(2);
    expect('chargeNextMs' in out).toBe(false);
    expect(chargesView(out, R).nextChargeMs).toBeNull();
  });
  it('M4: 999 ms of shortage floors to shortage_s 0; 1000 ms floors to 1', () => {
    const s: GameState = { ...base(), refillCharges: 1, workers: { market_hand: { energy: 10, cdS: 0 } } };
    const a = tickRefill(s, 999, R);
    expect(refillSessionTotals(a, R).shortage_s).toBe(0);
    const c = tickRefill(s, 1000, R);
    expect(refillSessionTotals(c, R).shortage_s).toBe(1);
  });
  it('Rest auto-ends at energy 100 with rest_toggled{cause:auto_full, entry_point:auto, sheet_id:null}', () => {
    const ev: any[] = [];
    const s: GameState = {
      ...base(),
      workers: { market_hand: { energy: 100, cdS: 0, paused: true, restAuto: true } },
      pausedForS: { market_hand: 8 },
    } as any;
    const out = tickRefill(s, 100, R, ev);
    expect(out.workers.market_hand!.paused).toBe(false);
    expect('restAuto' in out.workers.market_hand!).toBe(false);
    expect(ev[0]).toMatchObject({ type: 'rest_toggled', on: false, cause: 'auto_full', entry_point: 'auto', sheet_id: null, paused_duration_s: 8 });
  });
  it('auto-refill (fixture at_pct=30, reserve=0) picks auto-on, ≤ at_pct, not paused, not Unpaid; does not touch refillAgoMs; Asleep included', () => {
    const ev: any[] = [];
    const s: GameState = {
      ...base(), refillCharges: 2, refillAgoMs: { market_hand: 4000 },
      workers: {
        market_hand: { energy: 0, cdS: 3, autoRefill: true }, // asleep, auto on
        coop_hand: { energy: 10, cdS: 0, autoRefill: true, paused: true }, // paused: skipped
        hawker: { energy: 10, cdS: 0, unpaid: true, autoRefill: true },
      },
    };
    const out = tickRefill(s, 100, RA, ev);
    expect(out.workers.market_hand!.energy).toBe(100);
    expect(out.workers.market_hand!.cdS).toBe(3); // never written
    expect(out.refillAgoMs?.market_hand).toBe(4100); // age advanced, auto does not reset
    expect(out.refillCharges).toBe(1);
    expect(out.workers.coop_hand!.energy).toBe(10); // paused, skipped
    const used = ev.find(e => e.type === 'refill_used');
    expect(used).toMatchObject({ by: 'auto', sheet_id: null, entry_point: 'auto', worker: 'market_hand' });
    expect(out.refillSession!.autoToastQueue).toEqual(['market_hand']);
    expect(out.refillSession!.refillsAuto).toBe(1);
  });
  it('step() at rc2Refill=1 does not tick manageCdS; flag off still does', () => {
    const s: GameState = { ...base(), manageCdS: 10, refillCharges: 2 };
    const on = step(s, 0.1, R);
    expect(on.manageCdS).toBe(10);
    const off = step(s, 0.1, b);
    expect(off.manageCdS).toBeCloseTo(9.9, 5);
    expect('refillSession' in off).toBe(false);
  });
  it('src/sim/refill.ts contains no Date.now, performance.now, or Math.random (M4)', () => {
    const src = readFileSync(join(__dirname, '../src/sim/refill.ts'), 'utf8');
    expect(src).not.toMatch(/Date\.now|performance\.now|Math\.random/);
    expect(src).not.toMatch(/pausedAgoMs/);
  });
});

describe('[G2][OPEN-6] manage / manageAll are no-ops at rc2Refill=1; flag-off is unchanged', () => {
  it('manage at rc2Refill=1 leaves energy, manageCdS, and events unchanged', () => {
    const s: GameState = { ...base(), manageCdS: 0, workers: { market_hand: { energy: 20, cdS: 0 } } };
    const ev: any[] = [];
    const out = apply(s, { type: 'manage', worker: 'market_hand' }, R, ev);
    expect(out).toBe(s);
    expect(out.workers.market_hand!.energy).toBe(20);
    expect(ev).toEqual([]);
  });
  it('manageAll at rc2Refill=1 is a no-op', () => {
    const s: GameState = {
      ...base(), manageCdS: 0,
      workers: {
        market_hand: { energy: 20, cdS: 0 },
        coop_hand: { energy: 20, cdS: 0 },
        hawker: { energy: 20, cdS: 0 },
      },
    };
    const ev: any[] = [];
    const out = apply(s, { type: 'manageAll' }, R, ev);
    expect(out).toBe(s);
    expect(ev).toEqual([]);
  });
  it('flag off: manage still refills and starts the cooldown (byte-identical path vs d65391b)', () => {
    const s: GameState = { ...base(), manageCdS: 0, workers: { market_hand: { energy: 20, cdS: 0 } } };
    const ev: any[] = [];
    const out = apply(s, { type: 'manage', worker: 'market_hand' }, b, ev);
    expect(out.workers.market_hand!.energy).toBe(100);
    expect(out.manageCdS).toBe(b.workers.energy.manage_cooldown_s);
    expect(ev[0].type).toBe('worker_manage');
  });
});

describe('[G2] gaps left as it.todo with notes', () => {
  it.todo('shiftOrder(s,b): hired, workerAtRisk desc → energy asc → WORKERS index (AC-RF3 / AC-LR5) — needs #128 workerAtRisk, OPEN, not in this tree. Auto-refill currently uses a temporary energy-asc + WORKERS-index stand-in; rank_by_risk is 1-based among hired in WORKERS order until shiftOrder lands.');
  it.todo('restState etaTiredS / etaAsleepS (§12.7): apply the Rest multiplier at rc2Refill=1 — G0 does not specify the eta formula; will not invent. restState(w,b) currently returns the D-HOE-33 enum only.');
});
