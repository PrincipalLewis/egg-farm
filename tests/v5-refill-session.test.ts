// HoE/v5-refill-sim G2 M2 (G0-API.md rev 9 sha256 bcc52937; Architect M2 + M2 note 22:18 CET).
// resetRefillSession is a pure function, tested on its own. Hook-up into resetSessionFields waits for
// v5/session-rotate-hook (same pattern as clockWage's resetAsleepSession). No registerSessionEnd, no custom rotate wiring.
// refillSessionTotals feeds session_end (m7 gating). autoRefillOn is a pure per-worker read (D-HOE-61).
import { describe, it, expect } from 'vitest';
import { balance as b, type Balance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { m5Persist } from '../src/save/m5-fields';
import { M5_SESSION_FIELDS } from '../src/sim/m5-state';
import { WORKERS, type WorkerId } from '../src/sim/workers';
import { resetRefillSession, refillSessionTotals, autoRefillOn } from '../src/sim/refill';
import type { RefillSession } from '../src/sim/m5-state';

const fl = (f: Record<string, number>): Balance =>
  ({ ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, ...f } } }) as Balance;
const R = fl({ rc2Refill: 1 }), RA = fl({ rc2Refill: 1, autoRefill: 1 }), A_ONLY = fl({ autoRefill: 1 });
const SESS = (): RefillSession => ({
  sheetSeq: 4, refillsManual: 3, refillsAuto: 5, chargeStarvedS: 12_350, shortageS: 2_500, chargesCappedS: 9_000, autoToastQueue: ['market_hand'],
});
const live = (): GameState => ({
  ...initialState(b, 7), farmLevel: 12, tracksV7: 1,
  workers: { market_hand: { energy: 40, cdS: 0, autoRefill: true }, coop_hand: { energy: 80, cdS: 0 } },
  refillCharges: 1, chargeNextMs: 9_000,
  refillAgoMs: { market_hand: 4_000 },
  refillSession: SESS(),
  streakS: 0.4,
});

describe('[G2][M2] resetRefillSession: pure, clears refillSession and refillAgoMs (Architect note 22:18)', () => {
  it('deletes both keys and returns a new object; does not mutate the input or any other field', () => {
    const s = live(), before = JSON.stringify(s), out = resetRefillSession(s);
    expect(out).not.toBe(s); expect(JSON.stringify(s)).toBe(before);
    expect('refillSession' in out).toBe(false); expect('refillAgoMs' in out).toBe(false);
    expect(out.refillCharges).toBe(1); expect(out.chargeNextMs).toBe(9_000);
    expect(out.streakS).toBe(0.4); expect(out.workers).toBe(s.workers);
  });
  it('identity when both keys are already absent (flag-off / clean session)', () => {
    const s = { ...initialState(b, 7), farmLevel: 12, tracksV7: 1 } as GameState;
    expect(resetRefillSession(s)).toBe(s);
    expect(resetRefillSession(live()).refillCharges).toBe(1); // saved keys stay
  });
  it('clears one key when only that key is present', () => {
    const onlyAgo = resetRefillSession({ ...live(), refillSession: undefined } as GameState);
    expect('refillAgoMs' in onlyAgo).toBe(false); expect('refillSession' in onlyAgo).toBe(false);
    const { refillAgoMs: _a, ...noAgo } = live();
    const onlySess = resetRefillSession(noAgo as GameState);
    expect('refillSession' in onlySess).toBe(false); expect('refillAgoMs' in onlySess).toBe(false);
  });
  it('the two keys stay on M5_SESSION_FIELDS and are stripped by m5Persist (never saved); reset is not a persist)', () => {
    expect(M5_SESSION_FIELDS).toContain('refillSession'); expect(M5_SESSION_FIELDS).toContain('refillAgoMs');
    const s = live();
    expect('refillSession' in m5Persist(s)).toBe(false); expect('refillAgoMs' in m5Persist(s)).toBe(false);
    expect('refillSession' in s).toBe(true); // persist does not mutate; reset is a separate call
  });
});

describe('[G2][M2][m7] refillSessionTotals(s, b): session_end view, telemetry never reaches into state', () => {
  it('flag off (and autoRefill-only): returns {} so session_end stays unchanged', () => {
    const s = live();
    expect(refillSessionTotals(s, b)).toEqual({});
    expect(refillSessionTotals(s, A_ONLY)).toEqual({});
    expect(s.refillSession).toEqual(SESS()); // no mutate
  });
  it('rc2Refill=1, autoRefill=0: only shortage_s, whole seconds floor(ms/1000); zeros when the session key is absent', () => {
    expect(refillSessionTotals(live(), R)).toEqual({ shortage_s: 2 }); // 2500 ms → 2
    const { refillSession: _r, ...bare } = live();
    expect(refillSessionTotals(bare as GameState, R)).toEqual({ shortage_s: 0 });
    // 1999 ms floors to 1? 1999/1000 floor = 1; 999 → 0
    expect(refillSessionTotals({ ...live(), refillSession: { ...SESS(), shortageS: 1_999 } }, R)).toEqual({ shortage_s: 1 });
    expect(refillSessionTotals({ ...live(), refillSession: { ...SESS(), shortageS: 999 } }, R)).toEqual({ shortage_s: 0 });
  });
  it('rc2Refill && autoRefill: also refills_* and charge_starved_s (S1 = round(ms/100)/10); charges_capped_s is never emitted (7.2)', () => {
    const t = refillSessionTotals(live(), RA);
    expect(t).toEqual({ shortage_s: 2, refills_manual: 3, refills_auto: 5, charge_starved_s: 12.4 }); // 12350 ms → 12.4
    expect('charges_capped_s' in t).toBe(false);
    const { refillSession: _r, ...bare } = live();
    expect(refillSessionTotals(bare as GameState, RA)).toEqual({ shortage_s: 0, refills_manual: 0, refills_auto: 0, charge_starved_s: 0 });
  });
  it('after resetRefillSession, totals are the flag-on zeros (next sheet starts from a clean session)', () => {
    expect(refillSessionTotals(resetRefillSession(live()), RA)).toEqual({ shortage_s: 0, refills_manual: 0, refills_auto: 0, charge_starved_s: 0 });
    expect(refillSessionTotals(resetRefillSession(live()), R)).toEqual({ shortage_s: 0 });
  });
});

describe('[G2][D-HOE-61] autoRefillOn(s, id, b): pure per-worker read; writes no clockWage state and no asleep_s', () => {
  it('false when rc2Refill=0, even if the key is true and autoRefill=1; false when autoRefill=0', () => {
    const s = live();
    expect(autoRefillOn(s, 'market_hand', b)).toBe(false);
    expect(autoRefillOn(s, 'market_hand', A_ONLY)).toBe(false);
    expect(autoRefillOn(s, 'market_hand', R)).toBe(false); // rc2 on, auto flag off: switch reads false (keys preserved, feature off)
    expect(s.workers.market_hand?.autoRefill).toBe(true); // no write
    expect('asleep_s' in (s as any) || 'asleepSessionMs' in (s as any)).toBe(false);
  });
  it('true only when both flags are on and workers.{id}.autoRefill === true; covers all four workers; unhired is false', () => {
    const s: GameState = {
      ...live(),
      workers: {
        market_hand: { energy: 40, cdS: 0, autoRefill: true },
        coop_hand: { energy: 80, cdS: 0 },
        hawker: { energy: 10, cdS: 0, autoRefill: true },
        grader: { energy: 50, cdS: 0, autoRefill: false as any }, // sanitiser would drop this; the read still requires === true
      },
    };
    const on: Record<WorkerId, boolean> = {
      market_hand: autoRefillOn(s, 'market_hand', RA),
      coop_hand: autoRefillOn(s, 'coop_hand', RA),
      hawker: autoRefillOn(s, 'hawker', RA),
      grader: autoRefillOn(s, 'grader', RA),
    };
    expect(on).toEqual({ market_hand: true, coop_hand: false, hawker: true, grader: false });
    expect(WORKERS).toEqual(['market_hand', 'coop_hand', 'hawker', 'grader']);
    const noHawker = { ...s, workers: { ...s.workers, hawker: undefined } };
    expect(autoRefillOn(noHawker, 'hawker', RA)).toBe(false);
    expect(JSON.stringify(s.workers)).toBe(JSON.stringify({
      market_hand: { energy: 40, cdS: 0, autoRefill: true },
      coop_hand: { energy: 80, cdS: 0 },
      hawker: { energy: 10, cdS: 0, autoRefill: true },
      grader: { energy: 50, cdS: 0, autoRefill: false },
    }));
  });
});
