// HoE/workers-drift-d1d2: Workers spec ↔ rc/v5 drift audit (product/workers/drift-audit-rc-v5-eed62687-20261109.md, sha1 09c2663c).
// Spec: product/workers/m5-worker-pause-spec.md v1.3.15 (sha1 4c081f64) rule 8 / AC-P12 (gate PAU-AC8), rule 10, AC-P4, AC-P11, AC-P13.
// D1 (Major): Manage on a paused worker ends the pause; Manage all / needManage skip paused workers.
// D2 (Minor): a paused worker is not in the R9 Unpaid-resume coin reserve.
// Folded test gaps (audit N4): AC-P4 exact tier-2 values, AC-P11 pair-spam bound, AC-P13 59.9 s hidden boundary.
// QA-D-1109-TELAC-FILL A-2: best_buy_suppressed_zero_gain is graded must-be-0 in every v5 config (no emitter in v5).
// Every behaviour below is flag-gated (m4.flags.pause): the flag-off cases pin the pre-fix behaviour (E13 byte-identity).
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { balance as b } from '../src/config/balance';
import { M5_FLAGS } from '../src/config/flags';
import { initialState, type GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { graderMult, needManage, resumeNeedCents } from '../src/sim/workers';
import { isPaused, pauseWorker, resumeWorker } from '../src/sim/pause';
import { Game } from '../src/game';
import { mem } from './helpers';
import type { SimEvent } from '../src/sim/events';
import type { Balance } from '../src/config/balance';

const tc = b.m4!.tc!;
const withFlags = (flags: Record<string, number>, bb: Balance = b) => ({ ...bb, m4: { ...bb.m4!, flags: { ...bb.m4!.flags, ...flags } } }) as Balance;
const P = withFlags({ pause: 1 });
const OFF = b;
const LOCK = tc.pause_call_lockout_s;
const RECOVER = tc.rest_recovery_mult;
const DRAIN = b.workers.energy.drain_s_per_pct;
const CD = b.workers.energy.manage_cooldown_s;
const farm = (extra: Partial<GameState> = {}, bb = P): GameState => ({
  ...initialState(bb, 3), farmLevel: 12, hensLevel: 12, eggValueLevel: 12, coinsCents: 1e9, graderTier: 3, ...extra,
});
const W = (energy = 80, extra: object = {}) => ({ energy, cdS: 1.5, ...extra });

describe('[PAU-AC8][AC-P12][D1] Manage on a paused worker refills to 100 and ends the pause (pause rule 8)', () => {
  it('[PAU-AC8][D1] Manage on a paused Coop Hand at 40% refills to 100, resumes it, and starts the shared cooldown', () => {
    const s = farm({ workers: { coop_hand: W(40, { paused: true }) } });
    const ev: SimEvent[] = [];
    const n = apply(s, { type: 'manage', worker: 'coop_hand' }, P, ev);
    expect(n.workers.coop_hand!.energy).toBe(100);
    expect(isPaused(n.workers.coop_hand, P)).toBe(false);
    expect(n.workers.coop_hand!.paused).toBe(false);
    expect(n.workers.coop_hand!.callLockoutS).toBeUndefined(); // Coop Hand: no G2 lockout
    expect(n.workers.coop_hand!.cdS).toBe(1.5); // G4: cdS untouched by the resume
    expect(n.manageCdS).toBe(CD);
    expect(ev).toEqual([{ type: 'worker_manage', worker: 'coop_hand', energyBefore: 40 }]);
  });
  it('[PAU-AC8][D1] a Manage resume of the Market Hand is a resume: the B5 call lockout starts (same path as resumeWorker)', () => {
    const s = farm({ workers: { market_hand: W(40, { paused: true }) } });
    const n = apply(s, { type: 'manage', worker: 'market_hand' }, P);
    expect(n.workers.market_hand).toMatchObject({ energy: 100, paused: false, callLockoutS: LOCK });
    expect(n.workers.market_hand).toEqual(resumeWorker({ ...s, workers: { market_hand: { ...s.workers.market_hand!, energy: 100 } } }, 'market_hand', P).workers.market_hand);
  });
  it('[PAU-AC8][D1] the normal Manage rule still applies to a paused worker: above the threshold or on cooldown it is a no-op (same object)', () => {
    const high = farm({ workers: { coop_hand: W(60, { paused: true }) } });
    expect(apply(high, { type: 'manage', worker: 'coop_hand' }, P)).toBe(high);
    const cd = farm({ workers: { coop_hand: W(40, { paused: true }) }, manageCdS: 5 });
    expect(apply(cd, { type: 'manage', worker: 'coop_hand' }, P)).toBe(cd);
  });
  it('[PAU-AC8][D1][E13] flag off: Manage on a stray paused:true worker refills and keeps paused:true (pre-fix behaviour, byte-identical)', () => {
    const s = farm({ workers: { coop_hand: W(40, { paused: true }) } }, OFF);
    const n = apply(s, { type: 'manage', worker: 'coop_hand' }, OFF);
    expect(n.workers.coop_hand).toEqual({ energy: 100, cdS: 1.5, paused: true });
  });
  it.todo('[PAU-AC8][D1] Manage on a paused worker emits worker_resumed{cause:"manage"} — BLOCKED: needs a SimEvent variant in src/sim/events.ts (out of write scope) and a paused_duration_s source (no pause start is stored)');
});

describe('[PAU-AC8][AC-P12][D1] Manage all skips paused workers and N (needManage) counts only unpaused ones', () => {
  const three = (extra: object = {}) => farm({ workers: { market_hand: W(40, { paused: true }), coop_hand: W(25), hawker: W(90) }, ...extra });
  it('[PAU-AC8][D1] needManage with 1 paused and 1 unpaused tired worker is N = 1', () => {
    expect(needManage(three().workers, P)).toEqual(['coop_hand']);
  });
  it('[PAU-AC8][D1] Manage all refills only the unpaused worker; the paused one keeps its energy and stays paused', () => {
    const s = three(); const ev: SimEvent[] = [];
    const n = apply(s, { type: 'manageAll' }, P, ev);
    expect(n.workers.coop_hand!.energy).toBe(100);
    expect(n.workers.market_hand).toEqual(s.workers.market_hand);
    expect(n.manageCdS).toBe(CD);
    expect(ev).toEqual([{ type: 'worker_manage_all', workers: ['coop_hand'], energyBefore: [25] }]);
  });
  it('[PAU-AC8][D1] only paused workers need it → N = 0: Manage all is a no-op and starts no cooldown (ruling 4)', () => {
    const s = farm({ workers: { market_hand: W(40, { paused: true }), coop_hand: W(30, { paused: true }), hawker: W(90) } });
    expect(needManage(s.workers, P)).toEqual([]);
    expect(apply(s, { type: 'manageAll' }, P)).toBe(s);
  });
  it('[PAU-AC8][D1][E13] flag off: a stray paused:true worker is still counted and refilled (pre-fix behaviour)', () => {
    const off = three();
    expect(needManage(off.workers, OFF)).toEqual(['market_hand', 'coop_hand']);
    const n = apply(off, { type: 'manageAll' }, OFF);
    expect(n.workers.market_hand).toEqual({ energy: 100, cdS: 1.5, paused: true });
  });
});

describe('[D2][rule 10] a paused worker is not in the R9 Unpaid-resume coin reserve', () => {
  // Farm 12: Market Hand need = 0.25 × 12 × 1 min = 300 c; Coop Hand need = 0.5 × 12 × 1 min = 600 c.
  const MH = resumeNeedCents('market_hand', 12, P), CH = resumeNeedCents('coop_hand', 12, P);
  const s = (coins: number, mh: object, bb = P) => farm({ coinsCents: coins, workers: { market_hand: W(80, mh), coop_hand: W(60, { unpaid: true, cdS: 0 }) } }, bb);
  it('[D2] the farm-12 needs are 300 c (MH) and 600 c (CH)', () => { expect([MH, CH]).toEqual([300, 600]); });
  it('[D2] a paused Market Hand does not block an Unpaid Coop Hand at 601 c (need 600)', () => {
    const ev: SimEvent[] = [];
    const n = step(s(601, { paused: true }), 0.1, P, ev);
    expect(n.workers.coop_hand!.unpaid).toBe(false);
    expect(ev).toContainEqual({ type: 'worker_state', worker: 'coop_hand', state: 'working' });
    expect(n.workers.market_hand!.paused).toBe(true);
  });
  it('[D2] boundary: 599 c is below the Coop Hand need, so it stays Unpaid with the Market Hand paused', () => {
    expect(step(s(599, { paused: true }), 0.1, P).workers.coop_hand!.unpaid).toBe(true);
  });
  it('[D2] control: an unpaused Market Hand still reserves 300 c, so 601 c keeps the Coop Hand Unpaid (needs 900)', () => {
    expect(step(s(601, {}), 0.1, P).workers.coop_hand!.unpaid).toBe(true);
    expect(step(s(900, {}), 0.1, P).workers.coop_hand!.unpaid).toBe(false);
  });
  it('[D2][E13] flag off: a stray paused:true Market Hand still reserves (pre-fix behaviour)', () => {
    expect(step(s(601, { paused: true }, OFF), 0.1, OFF).workers.coop_hand!.unpaid).toBe(true);
  });
});

describe('[AC-P4][G6] Grader at tier 2 (×2.0): paused 1.00, asleep 1.15, working 2.00 (audit N4)', () => {
  it('[AC-P4] exact tier-2 values', () => {
    expect(b.workers.grader.tiers[1].mult).toBe(2);
    expect(graderMult({ grader: W(100, { paused: true }) }, 2, P)).toBe(1);
    expect(graderMult({ grader: W(0, { paused: true }) }, 2, P)).toBe(1); // paused asleep: not even the asleep 15%
    expect(graderMult({ grader: W(0) }, 2, P)).toBeCloseTo(1.15, 12);
    expect(graderMult({ grader: W(100) }, 2, P)).toBe(2);
  });
});

describe('[AC-P11][G4] no free action from 20 Pause/Resume pairs (audit N4)', () => {
  // 20 pairs over 60 s: each pair is 1.5 s paused + 1.5 s unpaused (30 s unpaused in total). The sim has no debounce
  // (AC-P7 is UI, row 32), so the toggles are applied directly at tick boundaries.
  const DT = 1 / b.tickHz;
  const base = () => farm({ basket: 1e6, customers: Array.from({ length: 6 }, (_, i) => ({ id: i + 1, demand: 1e6, filled: 0, waitedS: 0 })),
    workers: { market_hand: W(100, { cdS: 0.7 }) } });
  const mhActions = (ev: SimEvent[]) => ev.filter(e => e.type === 'wage' && e.worker === 'market_hand').length;
  const ticks = (s: GameState, sec: number, ev: SimEvent[]) => { for (let i = 0; i < Math.round(sec / DT); i++) s = step(s, DT, P, ev); return s; };
  it('[AC-P11] spam actions ≤ an unpaused Market Hand over the same unpaused time + 1, and every action logs its wage', () => {
    const ev: SimEvent[] = []; let s = base();
    for (let k = 0; k < 20; k++) { s = pauseWorker(s, 'market_hand', P); s = ticks(s, 1.5, ev); s = resumeWorker(s, 'market_hand', P); s = ticks(s, 1.5, ev); }
    const ctl: SimEvent[] = []; ticks(base(), 30, ctl);
    const spam = mhActions(ev), control = mhActions(ctl);
    expect(spam).toBeGreaterThan(0);
    expect(spam).toBeLessThanOrEqual(control + 1);
    const sells = ev.filter(e => e.type === 'sell' && e.by === 'market_hand').length;
    expect(sells).toBeGreaterThan(0);
    expect(spam).toBeGreaterThanOrEqual(sells / 6); // ≤ 6 customers served per action: no sale without a charged action
  });
});

describe('[AC-P13][QA S1] hidden-gap boundary while paused (audit N4)', () => {
  const boot = () => { let t = 1_700_000_000_000; const g = new Game(P, mem(), () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
    g.state = farm({ workers: { market_hand: W(50, { paused: true }) } }); return { g, at: () => t, add: (ms: number) => { t += ms; } }; };
  it('[AC-P13] a 59.9 s hidden gap while paused is simulated live: +1.66% ±0.05', () => {
    const { g, at, add } = boot(); g.onHidden(at()); add(59_900); g.onShown(at());
    const gain = g.state.workers.market_hand!.energy - 50;
    expect(Math.abs(gain - 1.66)).toBeLessThanOrEqual(0.05);
    expect(gain).toBeCloseTo(RECOVER * 59.9 / DRAIN, 6);
    expect(g.state.workers.market_hand!.paused).toBe(true);
  });
  it('[AC-P13] exactly 60.0 s hidden counts as offline: +0 recovery, still paused', () => {
    const { g, at, add } = boot(); g.onHidden(at()); add(60_000); g.onShown(at());
    expect(g.state.workers.market_hand).toMatchObject({ energy: 50, paused: true });
  });
});

describe('[QA-D-1109-TELAC-FILL A-2] best_buy_suppressed_zero_gain is must-be-0 in every v5 config (no emitter in v5)', () => {
  const T = 'best_buy_suppressed_zero_gain';
  const walk = (d: string): string[] => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  it('[QA-D-1109-TELAC-FILL A-2] static: only the telemetry schema names the event; no src emitter', () => {
    const src = new URL('../src', import.meta.url).pathname;
    const hits = walk(src).filter(p => /\.(ts|js|mjs)$/.test(p) && readFileSync(p, 'utf8').includes(T)).map(p => p.slice(src.length + 1));
    expect(hits).toEqual(['telemetry/schema.ts']);
  });
  // v5 configs: flags-0 (shipped), each M5 flag on alone, and the v5 ship-set (D-HOE-20261030-16: every flag 1 except bestBuyV2 0).
  const configs: [string, Balance][] = [['flags-0', b], ...M5_FLAGS.map(f => [`${f}=1`, withFlags({ [f]: 1 })] as [string, Balance]),
    ['ship-set', withFlags({ ...Object.fromEntries(M5_FLAGS.map(f => [f, 1])), bestBuyV2: 0 })]];
  const session = (cfg: Balance, seed: number, sec: number) => {
    let t = 1_700_000_000_000;
    const g = new Game(cfg, mem(), () => t, seed, 'dev', null, null, { newId: () => '0123456789abcdef' });
    g.state = { ...g.state, farmLevel: 12, hensLevel: 12, eggValueLevel: 12, coinsCents: 5e6, basket: 40, coop: 40 };
    for (const a of [{ type: 'hire', worker: 'market_hand' }, { type: 'hire', worker: 'coop_hand' }, { type: 'hire', worker: 'hawker' },
      { type: 'buyCollection' }, { type: 'buyFarm' }, { type: 'buyTrack', track: 'hens' }, { type: 'buyTrack', track: 'eggValue' }, { type: 'collect' }, { type: 'sellAll' }] as const)
      g.dispatch(a as never);
    g.debugAdvance(sec * 1000); t += sec * 1000; g.dispatch({ type: 'manageAll' }); g.dispatch({ type: 'buyFarm' });
    return g.telemetry.events().filter(e => e.type === T).length;
  };
  it('[QA-D-1109-TELAC-FILL A-2] flags-0 seeds 1–200: 0 emissions', () => {
    let n = 0; for (let seed = 1; seed <= 200; seed++) n += session(b, seed, 30); expect(n).toBe(0);
  });
  it.each(configs)('[QA-D-1109-TELAC-FILL A-2] %s seeds 1–3: 0 emissions', (_name, cfg) => {
    let n = 0; for (let seed = 1; seed <= 3; seed++) n += session(cfg, seed, 60); expect(n).toBe(0);
  });
});
