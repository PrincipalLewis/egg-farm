// HoE/v5-refill-sim G2 M2 (G0-API.md rev 12 sha256 82eeac34; Architect M2 + M2 note 22:18 CET).
// resetRefillSession is a pure function, tested on its own, and is plugged into
// resetSessionFields (#138 contract) plus Game's session_end contributor (fields(src)).
// refillSessionTotals feeds session_end (m7 gating). autoRefillOn is a pure per-worker read (D-HOE-61).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { balance as b, type Balance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { m5Persist } from '../src/save/m5-fields';
import { M5_SESSION_FIELDS } from '../src/sim/m5-state';
import { WORKERS, type WorkerId } from '../src/sim/workers';
import { resetRefillSession, refillSessionTotals, autoRefillOn, sessionEndFields } from '../src/sim/refill';
import { resetSessionFields } from '../src/sim/session';
import { Game } from '../src/game';
import { mem } from './helpers';
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

describe('[G0 §11][lighter L64] asleep_s counts MH+CH only; autoRefill/clockWage decide WHEN it is emitted (HoE 22:19)', () => {
  const RA0 = fl({ rc2Refill: 1, autoRefill: 1, clockWage: 0 }); // clockWage already 0 in shipping flags; stated for the AC
  const asleepHG = (): GameState => ({
    ...live(),
    workers: {
      market_hand: { energy: 80, cdS: 0, autoRefill: true }, // working
      coop_hand: { energy: 80, cdS: 0, autoRefill: true },   // working
      hawker: { energy: 0, cdS: 0, autoRefill: true },       // asleep
      grader: { energy: 0, cdS: 0, autoRefill: true },       // asleep
    },
  });

  it('seam: autoRefillOn is true for an asleep Hawker and Grader (Hire 2 ORs this into asleepClockOn); Refill writes no asleep_s', () => {
    const s = asleepHG(), before = JSON.stringify(s);
    expect(autoRefillOn(s, 'hawker', RA0)).toBe(true);
    expect(autoRefillOn(s, 'grader', RA0)).toBe(true);
    expect(autoRefillOn(s, 'market_hand', RA0)).toBe(true);
    // Refill's session_end view does not own or emit asleep_s (Hire 2 is the writer).
    expect('asleep_s' in refillSessionTotals(s, RA0)).toBe(false);
    expect(JSON.stringify(s)).toBe(before);
    expect('asleepSessionMs' in s).toBe(false);
    expect('asleep_s' in (s as any)).toBe(false);
  });

  // Full AC (asleep Hawker/Grader adds 0 to asleep_s, field still emitted) is on Hire 2's wip/hire2/v5-clockwage branch.
});

describe('[G2][M2][T-AC9] sessionEndFields spreads refillSessionTotals; #138 hook + contributor (QA-D-1029-V5SCAP)', () => {
  it('flag off: sessionEndFields has no refill keys (present_* may still appear)', () => {
    const s = live();
    const f = sessionEndFields(s, b);
    expect('shortage_s' in f).toBe(false);
    expect('refills_manual' in f).toBe(false);
    expect('charge_starved_s' in f).toBe(false);
    expect('charges_capped_s' in f).toBe(false);
    expect('asleep_s' in f).toBe(false);
  });
  it('rc2Refill + autoRefill: spreads shortage_s, refills_*, charge_starved_s; never charges_capped_s or asleep_s', () => {
    const f = sessionEndFields(live(), RA);
    expect(f.shortage_s).toBe(2);
    expect(f.refills_manual).toBe(3);
    expect(f.refills_auto).toBe(5);
    expect(f.charge_starved_s).toBe(12.4);
    expect('charges_capped_s' in f).toBe(false);
    expect('asleep_s' in f).toBe(false);
  });
  it('[T-AC9] session_end track() literals are plain keys or spreads only (no comma-bearing calls)', () => {
    const gameSrc = readFileSync(join(__dirname, '../src/game.ts'), 'utf8');
    const telSrc = readFileSync(join(__dirname, '../src/telemetry/telemetry.ts'), 'utf8');
    // Game does not emit session_end itself; Telemetry.endSession is the single emit path.
    // (A comment in Game.endSession mentions track('session_end') — that is not a call.)
    expect(gameSrc).toMatch(/this\.telemetry\.endSession\(/);
    expect(gameSrc).not.toMatch(/this\.telemetry\.track\('session_end'/);
    expect(gameSrc).not.toMatch(/\.track\('session_end'/);
    // T-AC9: the one track literal is `{ ...extra, reason, fg_ms }` — spreads and plain keys only.
    expect(telSrc).toMatch(/track\('session_end', \{\s*\.\.\.extra,\s*reason,\s*fg_ms\s*\}/);
    expect(telSrc).not.toMatch(/track\('session_end', \{[^}]*\(/);
  });

  it('[G2][M2][QA-D-1029-V5SCAP] resetSessionFields clears refill session keys; saved and page-lifetime stay; pausedForS is #138\'s reset only', () => {
    const s: GameState = {
      ...live(),
      streakS: 0.4,
      irefRingCents: [1, 2],
      pausedForS: { market_hand: 5_000, sumS: 5_500, allS: 2_500 },
    };
    const charges = s.refillCharges;
    resetSessionFields(s);
    expect('refillSession' in s).toBe(false);
    expect('refillAgoMs' in s).toBe(false);
    expect(s.refillCharges).toBe(charges);
    expect(s.streakS).toBe(0.4);
    expect(s.irefRingCents).toEqual([1, 2]);
    // #138 CCR MAJOR-1: zeros sumS/allS only, keeps per-worker durations. We do not add a second reset.
    expect(s.pausedForS).toEqual({ market_hand: 5_000 });
    const ref = s.pausedForS;
    resetSessionFields(s); // idempotent
    expect('refillSession' in s).toBe(false);
    expect(s.pausedForS).toBe(ref);
    expect(s.pausedForS).toEqual({ market_hand: 5_000 });
  });

  it('[G2][M2][QA-D-1029-V5SCAP] rotate (hide >= 60 s then shown) resets refill session fields on the surviving state', () => {
    const T0 = Date.UTC(2026, 10, 10, 12);
    const kv = mem(); let t = T0;
    const g = new Game(RA, kv, () => t, 7);
    for (let i = 0; i < 20; i++) { t += 1000; g.frame(); }
    g.state = {
      ...g.state,
      farmLevel: 15,
      refillCharges: 1,
      chargeNextMs: 9_000,
      refillAgoMs: { market_hand: 4_000 },
      refillSession: SESS(),
      streakS: 0.4,
      pausedForS: { market_hand: 5_000, sumS: 5_500, allS: 2_500 },
    };
    g.onHidden(t); t += 60_000; g.frame(); g.onShown(t);
    const ends = g.telemetry.events().filter(e => !e.legacy && e.type === 'session_end');
    expect(ends).toHaveLength(1);
    expect(ends[0]).toMatchObject({ shortage_s: 2, refills_manual: 3, refills_auto: 5, charge_starved_s: 12.4 });
    expect('charges_capped_s' in ends[0]).toBe(false);
    expect('refillSession' in g.state).toBe(false);
    expect('refillAgoMs' in g.state).toBe(false);
    expect(g.state.refillCharges).toBe(1);
    expect(g.state.streakS).toBe(0.4);
    expect(g.state.pausedForS).toEqual({ market_hand: 5_000 });
  });

  it('[G2][M2][QA-D-1029-V5SCAP] fields(src) reads from src when given and from live state otherwise', () => {
    const T0 = Date.UTC(2026, 10, 10, 12);
    const liveSess: RefillSession = {
      sheetSeq: 1, refillsManual: 9, refillsAuto: 8, chargeStarvedS: 12_350, shortageS: 5_000, chargesCappedS: 1, autoToastQueue: [],
    };
    const srcSess: RefillSession = {
      sheetSeq: 1, refillsManual: 1, refillsAuto: 2, chargeStarvedS: 1_000, shortageS: 3_000, chargesCappedS: 1, autoToastQueue: [],
    };
    const ev = (g: Game) => g.telemetry.events().filter(e => !e.legacy && e.type === 'session_end')[0];

    const gSrc = new Game(RA, mem(), () => T0, 7);
    gSrc.state = { ...gSrc.state, refillSession: liveSess, refillCharges: 2 };
    const src = { ...gSrc.state, refillSession: srcSess };
    gSrc.telemetry.endSession('unload', T0, src);
    const fromSrc = ev(gSrc);
    expect(fromSrc.shortage_s).toBe(3);       // floor(3000/1000) from src, not live 5
    expect(fromSrc.refills_manual).toBe(1);
    expect(fromSrc.refills_auto).toBe(2);
    expect(fromSrc.charge_starved_s).toBe(1); // 1000 ms → 1.0 s from src, not live 12.4

    const gLive = new Game(RA, mem(), () => T0, 7);
    gLive.state = { ...gLive.state, refillSession: liveSess, refillCharges: 2 };
    gLive.telemetry.endSession('unload', T0); // no src: contributor falls back to this.state
    const fromLive = ev(gLive);
    expect(fromLive.shortage_s).toBe(5);
    expect(fromLive.refills_manual).toBe(9);
    expect(fromLive.refills_auto).toBe(8);
    expect(fromLive.charge_starved_s).toBe(12.4);
  });
});

describe('[G2][G0-exclusive] sessionEndFields pause totals exclusive by rc2Refill (both flag states)', () => {
  const tracked = (s: GameState): GameState => ({
    ...s,
    pausedForS: { market_hand: 5000, sumS: 5500, allS: 2500 },
  });

  it('[G2][G0-exclusive] flag-off (rc2Refill=0, pause=1): spreads pauseSessionEnd (paused_worker_s / all_paused_s); no refill keys', () => {
    const bb = fl({ rc2Refill: 0, pause: 1 });
    const f = sessionEndFields(tracked(live()), bb);
    expect(f.paused_worker_s).toBe(5);
    expect(f.all_paused_s).toBe(2);
    expect('shortage_s' in f).toBe(false);
    expect('refills_manual' in f).toBe(false);
    expect('charge_starved_s' in f).toBe(false);
  });

  it('[G2][G0-exclusive] rc2Refill=1 (pause=1): refill totals present; paused_worker_s / all_paused_s absent', () => {
    const bb = fl({ rc2Refill: 1, autoRefill: 1, pause: 1 });
    const f = sessionEndFields(tracked(live()), bb);
    expect(f.shortage_s).toBe(2);
    expect(f.refills_manual).toBe(3);
    expect(f.refills_auto).toBe(5);
    expect(f.charge_starved_s).toBe(12.4);
    expect('paused_worker_s' in f).toBe(false);
    expect('all_paused_s' in f).toBe(false);
    expect('charges_capped_s' in f).toBe(false);
  });
});
