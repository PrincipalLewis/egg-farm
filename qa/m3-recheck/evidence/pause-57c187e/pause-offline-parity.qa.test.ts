// QA one-off probe (Saves QA, HoQA/PR115-57c187e). NOT committed. Runs against the detached wt at 57c187e.
// D-HOP-2026-11-06-01 (a) / AC-P13 parity matrix + online freeze + double-pay + save/load checks.
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { balance as b } from '../wt/src/config/balance';
import { m4On } from '../wt/src/config/formulas';
import type { GameState } from '../wt/src/sim/state';
import { step } from '../wt/src/sim/tick';
import { pauseWorker, resumeWorker, isPaused } from '../wt/src/sim/pause';
import { applyOffline } from '../wt/src/sim/offline';
import { wagesPerSec } from '../wt/src/econ/income';
import { SAVE_KEY, serialize } from '../wt/src/save/save';
import { Game } from '../wt/src/game';
import { mem } from '../wt/tests/helpers';
import type { SimEvent } from '../wt/src/sim/events';

const EV = '/workspace/egg-farm-studio/qa/m3-recheck/evidence/pause-57c187e';
const P = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, pause: 1 } } } as typeof b;
const OFF = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, pause: 0 } } } as typeof b;
const LOCK = b.m4!.tc!.pause_call_lockout_s, RECOVER = b.m4!.tc!.rest_recovery_mult, DRAIN = b.workers.energy.drain_s_per_pct;
const env = JSON.parse(readFileSync(new URL('../wt/tests/fixtures/saves/m5-pause-committed-hired.json', import.meta.url), 'utf8'));
const raw = env.ls['eggfarm.save'] as string; const t0 = JSON.parse(raw).savedAt as number;
const newId = () => '0123456789abcdef';
const boot = (bb: typeof b, save: string | null, clock: { t: number }) => {
  const kv = mem(); if (save) kv.setItem(SAVE_KEY, save);
  return { kv, g: new Game(bb, kv, () => clock.t, 7, 'dev', null, null, { newId }) };
};
const base = (bb: typeof b): GameState => {
  const s = boot(bb, raw, { t: t0 }).g.state;
  return { ...s, workers: { market_hand: { energy: 40, cdS: 0, callLockoutS: 20 }, coop_hand: { energy: 40, cdS: 0 } } } as GameState;
};
const variants = (s: GameState, bb: typeof b): Record<string, GameState> => {
  // pause via the real API with P; with OFF the API is a no-op, so set the raw field (stray paused:true is ignored when flag off, AC-P1/E13)
  const pz = (x: GameState, id: 'market_hand' | 'coop_hand') => bb === P ? pauseWorker(x, id, P)
    : ({ ...x, workers: { ...x.workers, [id]: { ...x.workers[id]!, paused: true } } } as GameState);
  return {
    open: s,
    allPaused: pz(pz(s, 'market_hand'), 'coop_hand'),
    mixedMH: pz(s, 'market_hand'),
    mixedCH: pz(s, 'coop_hand'),
    noneHired: { ...s, workers: {} } as GameState,
  };
};
const GAPS: Record<string, number> = { 'u59.9s(<min)': 59_900, '60s': 60_000, '600s(under-cap)': 600_000, '2h(=cap)': 7_200_000, '3h(over-cap)': 10_800_000 };
const rows: any[] = [];

describe('QA probe: offline grant parity (D-HOP-2026-11-06-01 a / AC-P13)', () => {
  it('m4 on in shipping balance (grant path)', () => { rows.push({ m4On: m4On(b), pauseFlagShipping: b.m4!.flags.pause, capS: b.offline.offlineCapSeconds, minS: b.offline.offlineMinSeconds }); });
  for (const [flagName, bb] of [['flag1', P], ['flag0', OFF]] as const) {
    for (const [gName, gap] of Object.entries(GAPS)) {
      it(`${flagName} gap ${gName}: applyOffline / hide-show / reload grants equal across all-paused, mixed, none-hired, and equal the unpaused grant`, () => {
        const vs = variants(base(bb), bb);
        const out: Record<string, any> = {};
        for (const [vn, s] of Object.entries(vs)) {
          const direct = applyOffline(s, gap, bb).eggs;
          // hide/show path (real Game.onHidden/onShown → accountHiddenPeriod → settleHiddenPeriod)
          const c = { t: t0 }; const { g } = boot(bb, raw, c); g.state = s;
          const coins0 = s.coinsCents;
          g.onHidden(c.t); c.t += gap; const shown = g.onShown(c.t);
          const hs = { shown, pending: g.state.pendingOfflineEggs, coinsDelta: g.state.coinsCents - coins0,
            mh: g.state.workers.market_hand ? { ...g.state.workers.market_hand } : null };
          // reload path: save the variant at t0, boot at t0+gap
          const c2 = { t: t0 }; const b1 = boot(bb, raw, c2); b1.g.state = s; b1.g.save();
          const saved = b1.kv.getItem(SAVE_KEY)!; c2.t = JSON.parse(saved).savedAt + gap;
          const re = boot(bb, saved, c2).g;
          const rl = { pending: re.state.pendingOfflineEggs, offline: (re as any).offline?.eggs ?? 0, mh: re.state.workers.market_hand ? { ...re.state.workers.market_hand } : null };
          out[vn] = { direct, hideShow: hs, reload: rl };
        }
        const ref = out.open.direct;
        rows.push({ flag: flagName, gap: gName, ref, out });
        for (const vn of Object.keys(out)) {
          expect(out[vn].direct, `${vn} direct`).toBe(ref);
          if (gap >= 60_000) {
            expect(out[vn].hideShow.shown, `${vn} hide/show`).toBe(ref);
            expect(out[vn].hideShow.pending, `${vn} hide/show pending`).toBe(ref);
            expect(out[vn].hideShow.coinsDelta, `${vn} hide/show coins (no wage offline)`).toBe(0);
          } else expect(out[vn].hideShow.shown).toBe(0);
          expect(out[vn].reload.pending, `${vn} reload pending`).toBe(ref);
        }
        if (gap < 60_000) expect(ref).toBe(0); else expect(ref).toBeGreaterThan(0);
      });
    }
  }
  it('flag0 grant == flag1 grant per gap; cap clamps (2h == 3h > 600s > 60s)', () => {
    const g = (bb: typeof b, ms: number) => applyOffline(variants(base(bb), bb).allPaused, ms, bb).eggs;
    const o = (bb: typeof b, ms: number) => applyOffline(base(bb), ms, bb).eggs;
    const tbl: any = {};
    for (const [n, ms] of Object.entries(GAPS)) { tbl[n] = { flag1_allPaused: g(P, ms), flag1_open: o(P, ms), flag0_allPaused: g(OFF, ms), flag0_open: o(OFF, ms) }; expect(new Set(Object.values(tbl[n])).size).toBe(1); }
    rows.push({ crossFlag: tbl });
    expect(tbl['2h(=cap)'].flag1_open).toBe(tbl['3h(over-cap)'].flag1_open);
    expect(tbl['2h(=cap)'].flag1_open).toBeGreaterThan(tbl['600s(under-cap)'].flag1_open);
    expect(tbl['600s(under-cap)'].flag1_open).toBeGreaterThan(tbl['60s'].flag1_open);
  });
  it('hidden >= 60 s while paused (flag1): recovery +0, lockout frozen, paused kept; 59.9 s hidden: +1.66% ±0.05', () => {
    for (const gap of [60_000, 600_000, 7_200_000]) {
      const s = variants(base(P), P).allPaused; const c = { t: t0 }; const { g } = boot(P, raw, c); g.state = s;
      g.onHidden(c.t); c.t += gap; g.onShown(c.t);
      expect(g.state.workers.market_hand).toMatchObject({ energy: 40, callLockoutS: 20, paused: true, cdS: 0 });
      expect(g.state.workers.coop_hand).toMatchObject({ energy: 40, paused: true, cdS: 0 });
    }
    const s = variants(base(P), P).allPaused; const c = { t: t0 }; const { g } = boot(P, raw, c); g.state = s;
    g.onHidden(c.t); c.t += 59_900; g.onShown(c.t);
    const de = g.state.workers.market_hand!.energy - 40;
    rows.push({ hidden59_9_energyDelta: de, lockoutAfter: g.state.workers.market_hand!.callLockoutS });
    expect(Math.abs(de - 1.66)).toBeLessThanOrEqual(0.05);
  });
});

describe('QA probe: online freeze, resume no double-pay, save/load', () => {
  it('online paused 30 s: wage 0, no wage/collect/sell events, cdS frozen, energy +0.25x recovery (rule 3), lockout counts down (rule 7)', () => {
    const s = variants(base(P), P).allPaused; const ev: SimEvent[] = [];
    let n = s; for (let i = 0; i < 300; i++) n = step(n, 0.1, P, ev);
    expect(wagesPerSec(s, P)).toBe(0);
    expect(ev.filter(e => e.type === 'wage' || e.type === 'worker_collect' || (e.type === 'sell' && (e as any).by === 'market_hand'))).toEqual([]);
    expect(n.workers.market_hand!.cdS).toBe(0); expect(n.workers.coop_hand!.cdS).toBe(0);
    expect(n.workers.market_hand!.energy).toBeCloseTo(40 + RECOVER * 30 / DRAIN, 6);
    expect(n.workers.market_hand!.callLockoutS ?? 0).toBeCloseTo(0, 6); // 20 s lockout ran out during 30 s online
    rows.push({ online30: { coinsDelta: n.coinsCents - s.coinsCents, mhEnergy: n.workers.market_hand!.energy, mhLock: n.workers.market_hand!.callLockoutS ?? null } });
  });
  it('resume after a paused 2h hide: no back-pay; next 5 s equals an open twin; MH lockout = 45', () => {
    const open = base(P); const s = variants(open, P).allPaused;
    const c = { t: t0 }; const { g } = boot(P, raw, c); g.state = s; const coins = s.coinsCents;
    g.onHidden(c.t); c.t += 7_200_000; g.onShown(c.t);
    const r = resumeWorker(resumeWorker(g.state, 'market_hand', P), 'coop_hand', P);
    expect(r.coinsCents).toBe(coins); expect(r.workers.market_hand!.energy).toBe(40); expect(r.workers.market_hand!.callLockoutS).toBe(LOCK);
    const ev: SimEvent[] = []; const a = step(r, 5, P, ev);
    const twin = step(resumeWorker(resumeWorker(open, 'market_hand', P), 'coop_hand', P), 5, P, []);
    expect(a.coinsCents - r.coinsCents).toBe(twin.coinsCents - open.coinsCents);
    expect(a.workers.market_hand!.energy).toBeCloseTo(twin.workers.market_hand!.energy, 9);
    rows.push({ resume: { stepCoins: a.coinsCents - r.coinsCents, twinCoins: twin.coinsCents - open.coinsCents } });
  });
  it('paused + callLockoutS survive save/load (<60 s reload and 2h reload); legacy fixture loads unpaused', () => {
    for (const gap of [10_000, 7_200_000]) {
      const c = { t: t0 }; const b1 = boot(P, raw, c); b1.g.state = pauseWorker(base(P), 'market_hand', P); b1.g.save();
      const saved = b1.kv.getItem(SAVE_KEY)!; c.t = JSON.parse(saved).savedAt + gap;
      const re = boot(P, saved, c).g;
      expect(isPaused(re.state.workers.market_hand, P)).toBe(true);
      expect(Math.abs(re.state.workers.market_hand!.energy - 40)).toBeLessThanOrEqual(0.1);
      expect(Math.abs((re.state.workers.market_hand!.callLockoutS ?? 0) - 20)).toBeLessThanOrEqual(0.5);
      expect(isPaused(re.state.workers.coop_hand, P)).toBe(false);
    }
    const lg = boot(P, raw, { t: t0 }).g;
    expect(isPaused(lg.state.workers.market_hand, P)).toBe(false); expect(isPaused(lg.state.workers.coop_hand, P)).toBe(false);
    expect(() => serialize(lg.state, t0)).not.toThrow();
    writeFileSync(`${EV}/probe-matrix.json`, JSON.stringify(rows, null, 1));
  });
});
