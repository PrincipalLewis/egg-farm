// v5 #4 abilities sim + fireAbility/activateAll (product/workers/m5-worker-abilities-spec.md v1.3.11;
// engineering/reviews/arch-golden-slice2-contracts-20261105.md ADDENDUM `fireAbility` API 21:29 CET).
// nowMs is injected (epoch ms); nothing here reads Date.now. Economy values come from balance.m4.tc (never literals).
import { describe, it, expect } from 'vitest';
import { balance } from '../src/config/balance';
import type { M5Flag } from '../src/config/flags';
import { initialState, type GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { saleMultipliers } from '../src/sim/payout';
import { prodEggsPerSec } from '../src/sim/tracks';
import { graderMult, WORKERS, type WorkerId } from '../src/sim/workers';
import { fireAbility, activateAll, abilityEligibility, abilityActive, comboQualifies } from '../src/sim/abilities';
import { readFileSync } from 'node:fs';

const B = (flags: Partial<Record<M5Flag, number>> = { abilities: 1 }, tcx: Record<string, number> = {}) =>
  ({ ...balance, m4: { ...balance.m4!, enabled: 1, flags: { ...(balance.m4 as any).flags, ...flags }, tc: { ...balance.m4!.tc!, ...tcx } } }) as typeof balance;
const b = B();
const tc = b.m4!.tc!, CD_MS = tc.ability_cd_s * 1000, DUR = tc.ability_s, DT = 1 / b.tickHz;
const NOW = 1_800_000_000_000;
const W = (energy = 100, extra = {}) => ({ energy, cdS: 1e9, ...extra }); // cdS huge: no wage/auto action noise
const farm = (extra: Partial<GameState> = {}): GameState => ({ ...initialState(b, 3), farmLevel: 18, hensLevel: 18, eggValueLevel: 18, graderTier: 3,
  coinsCents: 1e9, workers: { market_hand: W(), coop_hand: W(), hawker: W(), grader: W() }, ...extra });
const opts = (o = {}) => ({ inSheet: false, viaAll: false, nowMs: NOW, ...o });
const run = (s: GameState, n: number, focus: boolean, bb = b, ev: any[] = []) => { for (let i = 0; i < n; i++) s = step(s, DT, bb, ev, { focus, nowMs: NOW }); return s; };

describe('eligibility (rule 4) and blocked results', () => {
  it('ready by default (absent readyAt) at F >= unlock with the flag on', () => {
    for (const id of WORKERS) expect(abilityEligibility(farm(), id, b, NOW)).toEqual({ eligible: true });
  });
  it('first-reason order: asleep, unpaid, paused, lockout, cooldown', () => {
    const P = B({ abilities: 1, pause: 1 });
    const s = farm({ workers: { market_hand: W(0, { paused: true }), coop_hand: W(50, { unpaid: true, paused: true }), hawker: W(50, { paused: true, callLockoutS: 5 }), grader: W(50, { callLockoutS: 5 }) },
      abilities: { grader: { readyAt: NOW + 1000 } } });
    expect(abilityEligibility(s, 'market_hand', P, NOW)).toEqual({ eligible: false, reason: 'asleep' });
    expect(abilityEligibility(s, 'coop_hand', P, NOW)).toEqual({ eligible: false, reason: 'unpaid' });
    expect(abilityEligibility(s, 'hawker', P, NOW)).toEqual({ eligible: false, reason: 'paused' });
    expect(abilityEligibility(s, 'grader', P, NOW)).toEqual({ eligible: false, reason: 'lockout' });
    // pause flag off: paused / lockout inert (F3 isPaused), cooldown shows
    expect(abilityEligibility(s, 'hawker', b, NOW)).toEqual({ eligible: true });
    expect(abilityEligibility(s, 'grader', b, NOW)).toEqual({ eligible: false, reason: 'cooldown' });
  });
  it('cooldown uses wallReady on injected nowMs, E2b cap; ready exactly at readyAt', () => {
    const s = farm({ abilities: { hawker: { readyAt: NOW } } });
    expect(abilityEligibility(s, 'hawker', b, NOW - 1)).toEqual({ eligible: false, reason: 'cooldown' });
    expect(abilityEligibility(s, 'hawker', b, NOW)).toEqual({ eligible: true });
  });
  it('not hired / below unlock / flag off / bad clock: not available, no telemetry reason', () => {
    expect(abilityEligibility(farm({ workers: {} }), 'grader', b, NOW)).toEqual({ eligible: false, reason: 'not_hired' });
    expect(abilityEligibility(farm({ farmLevel: tc.ability_unlock_farm - 1 }), 'hawker', b, NOW)).toEqual({ eligible: false, reason: 'locked' });
    expect(abilityEligibility(farm(), 'hawker', B({ abilities: 0 }), NOW)).toEqual({ eligible: false, reason: 'flag_off' });
    expect(abilityEligibility(farm(), 'hawker', b, NaN)).toEqual({ eligible: false, reason: 'no_clock' });
    for (const [s, bb] of [[farm({ workers: {} }), b], [farm(), B({ abilities: 0 })]] as const) {
      const r = fireAbility(s, 'grader', bb, opts()); expect(r.ok).toBe(false); expect(r.events).toEqual([]); expect(r.state).toBe(s);
    }
  });
});

describe('fireAbility', () => {
  it('success: readyAt = nowMs + cd*1000, activeS = tc_ability_s, ability_used with combo:false, closeSheet only inSheet', () => {
    const s = farm({ abilities: { hawker: { readyAt: NOW - 7000 } } });
    const r = fireAbility(s, 'hawker', b, opts());
    expect(r.ok).toBe(true);
    expect(r.state.abilities!.hawker).toEqual({ readyAt: NOW + CD_MS, activeS: DUR });
    expect(r.events).toEqual([{ type: 'ability_used', worker: 'hawker', farm: 18, energy_pct: 100, mood: 'working', via_all: false, t_since_ready_s: 7, in_sheet: false, combo: false }]);
    expect(r.ok && r.closeSheet).toBe(false);
    const r2 = fireAbility(s, 'hawker', b, opts({ inSheet: true }));
    expect(r2.ok && r2.closeSheet).toBe(true); expect((r2.events[0] as any).in_sheet).toBe(true);
    expect(s.abilities!.hawker).toEqual({ readyAt: NOW - 7000 }); // pure
  });
  it('absent readyAt -> t_since_ready_s 0; Tired applies (rule 5), energy untouched (energy_cost 0)', () => {
    const s = farm({ workers: { ...farm().workers, coop_hand: W(20) } });
    const r = fireAbility(s, 'coop_hand', b, opts());
    expect(r.ok).toBe(true); expect((r.events[0] as any)).toMatchObject({ t_since_ready_s: 0, mood: 'tired', energy_pct: 20 });
    expect(r.state.workers.coop_hand!.energy).toBe(20);
  });
  it('blocked: emits exactly one ability_blocked{count:1}, state unchanged, no close (E14 d)', () => {
    const s = farm({ workers: { ...farm().workers, market_hand: W(0) } });
    const r = fireAbility(s, 'market_hand', b, opts({ inSheet: true }));
    expect(r).toEqual({ ok: false, reason: 'asleep', state: s, events: [{ type: 'ability_blocked', worker: 'market_hand', reason: 'asleep', count: 1 }], closeSheet: false });
    const c = fireAbility(fireAbility(s, 'hawker', b, opts()).state, 'hawker', b, opts({ nowMs: NOW + 1 }));
    expect(c.ok).toBe(false); expect(c.events).toEqual([{ type: 'ability_blocked', worker: 'hawker', reason: 'cooldown', count: 1 }]);
  });
  it('viaAll fire never emits ability_blocked (Activate-all skips silently)', () => {
    const s = farm({ workers: { ...farm().workers, market_hand: W(0) } });
    const r = fireAbility(s, 'market_hand', b, opts({ viaAll: true }));
    expect(r.ok).toBe(false); expect(r.events).toEqual([]);
  });
});

describe('combo (rule 11): direct sheet Boost within the manual-refill window', () => {
  const CB = B({ abilities: 1, rc2Refill: 1 }, { combo_window_s: 10, combo_boost_duration_s: 45 }); // test inputs; real values await Econ CSV (spec §7)
  const ctc = CB.m4!.tc!;
  it('comboQualifies: inclusive sim ms (10000 in, 10001 out), needs both flags', () => {
    expect(comboQualifies(CB, 10000)).toBe(true); expect(comboQualifies(CB, 10001)).toBe(false); expect(comboQualifies(CB, 0)).toBe(true);
    expect(comboQualifies(CB, undefined)).toBe(false); expect(comboQualifies(CB, -1)).toBe(false);
    expect(comboQualifies(B({ abilities: 1, rc2Refill: 0 }), 0)).toBe(false);
  });
  it('sheet Boost in window -> activeS = combo_boost_duration_s, combo:true; card / Activate-all / out of window -> 30 s, combo:false', () => {
    const s = farm();
    const yes = fireAbility(s, 'coop_hand', CB, opts({ inSheet: true, refillAgoSimMs: ctc.combo_window_s * 1000 }));
    expect(yes.state.abilities!.coop_hand!.activeS).toBe(ctc.combo_boost_duration_s); expect((yes.events[0] as any).combo).toBe(true);
    expect(yes.state.abilities!.coop_hand!.readyAt).toBe(NOW + CD_MS); // cooldown unchanged
    for (const o of [{ inSheet: false, refillAgoSimMs: 0 }, { inSheet: true, viaAll: true, refillAgoSimMs: 0 }, { inSheet: true, refillAgoSimMs: ctc.combo_window_s * 1000 + 1 }]) {
      const r = fireAbility(s, 'coop_hand', CB, opts(o)); expect(r.state.abilities!.coop_hand!.activeS).toBe(DUR); expect((r.events[0] as any).combo).toBe(false);
    }
    const all = activateAll(s, CB, { inSheet: true, nowMs: NOW });
    expect(all.events.every((e: any) => e.combo === false && e.via_all === true)).toBe(true);
  });
  it('combo call ends expired with effect_s = combo duration', () => {
    let s = fireAbility(farm(), 'hawker', CB, opts({ inSheet: true, refillAgoSimMs: 0 })).state; const ev: any[] = [];
    s = run(s, Math.round(ctc.combo_boost_duration_s * b.tickHz) + 1, true, CB, ev);
    expect(ev.filter(e => e.type === 'ability_ended')).toEqual([{ type: 'ability_ended', worker: 'hawker', cause: 'expired', effect_s: ctc.combo_boost_duration_s }]);
    expect(s.abilities!.hawker).toEqual({ readyAt: NOW + CD_MS });
  });
});

describe('activateAll (rule 7, E14 c, AC-M5A-7)', () => {
  it('AC-M5A-7: W1 asleep, W2 cooldown, W3 ready, W4 unpaid -> exactly W3, one ability_used{via_all:true}, no ability_blocked', () => {
    const s = farm({ workers: { market_hand: W(0), coop_hand: W(), hawker: W(), grader: W(50, { unpaid: true }) }, abilities: { coop_hand: { readyAt: NOW + 5000 } } });
    const r = activateAll(s, b, { inSheet: false, nowMs: NOW });
    expect(r.fired).toEqual(['hawker']);
    expect(r.events).toEqual([expect.objectContaining({ type: 'ability_used', worker: 'hawker', via_all: true, in_sheet: false, combo: false })]);
    expect(r.closeSheet).toBe(false);
  });
  it('order MH -> CH -> Hawker -> Grader, same tick; sheet success -> one close', () => {
    const r = activateAll(farm(), b, { inSheet: true, nowMs: NOW });
    expect(r.fired).toEqual(['market_hand', 'coop_hand', 'hawker', 'grader']);
    expect(r.events.map((e: any) => e.worker)).toEqual(r.fired);
    expect(r.events.every((e: any) => e.in_sheet === true && e.via_all === true)).toBe(true);
    expect(r.closeSheet).toBe(true);
    for (const id of WORKERS) expect(r.state.abilities![id]).toEqual({ readyAt: NOW + CD_MS, activeS: DUR });
  });
  it('0 eligible: fires nothing, no events, no close, same state', () => {
    const s = farm({ workers: { market_hand: W(0), hawker: W(0) } });
    const r = activateAll(s, b, { inSheet: true, nowMs: NOW });
    expect(r).toEqual({ state: s, events: [], fired: [], closeSheet: false });
  });
});

describe('timer system: suspension, expiry, early end (rules 6, 10)', () => {
  it('activeS counts down only on focus ticks (suspended under a closing sheet / menu); expires with effect_s = tc_ability_s', () => {
    let s = fireAbility(farm(), 'hawker', b, opts({ inSheet: true })).state;
    s = run(s, 50, false); expect(s.abilities!.hawker!.activeS).toBe(DUR); // before sheetCloseComplete: frozen
    const ev: any[] = []; s = run(s, Math.round(DUR * b.tickHz) - 1, true, b, ev);
    expect(abilityActive(s, b, 'hawker')).toBe(true); expect(ev.filter(e => e.type === 'ability_ended')).toEqual([]);
    s = run(s, 1, true, b, ev);
    expect(ev.filter(e => e.type === 'ability_ended')).toEqual([{ type: 'ability_ended', worker: 'hawker', cause: 'expired', effect_s: DUR }]);
    expect(s.abilities!.hawker).toEqual({ readyAt: NOW + CD_MS }); expect(abilityActive(s, b, 'hawker')).toBe(false);
  });
  it('early end: asleep / unpaid / paused ends that tick, readyAt unchanged, effect_s = focus seconds run', () => {
    for (const [patch, cause, bb] of [[{ energy: 0 }, 'asleep', b], [{ unpaid: true }, 'unpaid', b], [{ paused: true }, 'paused', B({ abilities: 1, pause: 1 })]] as const) {
      let s = fireAbility(farm(), 'hawker', bb, opts()).state; s = run(s, 10 * b.tickHz, true, bb);
      s = { ...s, workers: { ...s.workers, hawker: { ...s.workers.hawker!, ...patch } } };
      const ev: any[] = []; s = run(s, 1, true, bb, ev);
      const end = ev.filter(e => e.type === 'ability_ended'); expect(end).toHaveLength(1);
      expect(end[0]).toMatchObject({ worker: 'hawker', cause }); expect(end[0].effect_s).toBeCloseTo(10, 6);
      expect(s.abilities!.hawker).toEqual({ readyAt: NOW + CD_MS });
    }
  });
  it('paused flag off: a stray paused:true does not end the call', () => {
    let s = fireAbility(farm(), 'hawker', b, opts()).state;
    s = { ...s, workers: { ...s.workers, hawker: { ...s.workers.hawker!, paused: true } } };
    const ev: any[] = []; run(s, 1, true, b, ev); expect(ev.filter(e => e.type === 'ability_ended')).toEqual([]);
  });
});

describe('effects (rule 2) through the F1c registry / graderMult; suspended = no multiplier', () => {
  const act = (ids: WorkerId[], s = farm()) => { for (const id of ids) s = fireAbility(s, id, b, opts()).state; return s; };
  const prod = (a: number[]) => a.reduce((x, y) => x * y, 1);
  it('Rush: Market Hand sales only; Shout: all sales; stack x1.3225 (rule 8)', () => {
    const s0 = farm(), base = { mh: prod(saleMultipliers(s0, b, { by: 'market_hand' })), pl: prod(saleMultipliers(s0, b, { by: 'player' })) };
    const r = act(['market_hand']);
    expect(prod(saleMultipliers(r, b, { by: 'market_hand' })) / base.mh).toBeCloseTo(tc.ability_w1_price_mult, 12);
    expect(prod(saleMultipliers(r, b, { by: 'player' })) / base.pl).toBeCloseTo(1, 12);
    const rs = act(['market_hand', 'hawker']);
    expect(prod(saleMultipliers(rs, b, { by: 'market_hand' })) / base.mh).toBeCloseTo(tc.ability_w1_price_mult * tc.ability_w3_price_mult, 12);
    expect(prod(saleMultipliers(rs, b, { by: 'player' })) / base.pl).toBeCloseTo(tc.ability_w3_price_mult, 12);
    expect(prod(saleMultipliers(rs, b, { by: 'market_hand', suspended: true })) / base.mh).toBeCloseTo(1, 12);
    expect(prod(saleMultipliers(rs, B({ abilities: 0 }), { by: 'market_hand' }))).toBeCloseTo(prod(saleMultipliers(s0, B({ abilities: 0 }), { by: 'market_hand' })), 12);
  });
  it('Sweep A: laying x tc_ability_w2_lay_mult (live ctx only), suspended = 1', () => {
    const s0 = farm(), s = act(['coop_hand']);
    expect(prodEggsPerSec(s, b, {}) / prodEggsPerSec(s0, b, {})).toBeCloseTo(tc.ability_w2_lay_mult, 12);
    expect(prodEggsPerSec(s, b, { suspended: true })).toBe(prodEggsPerSec(s0, b, { suspended: true }));
  });
  it('Inspect: graderMult = 1 + (tier mult + tier_add - 1) x share(mood); tier 3 working -> x3.0 (AC-M5A-2)', () => {
    const s = act(['grader']), g = b.workers.grader;
    const exp = 1 + (g.tiers[2].mult + tc.ability_w4_tier_add - 1) * 1;
    expect(saleMultipliers(s, b, { by: 'player' })[0]).toBeCloseTo(exp, 12);
    expect(saleMultipliers(s, b, { by: 'player', suspended: true })[0]).toBe(graderMult(s.workers, 3, b));
    const tired = { ...s, workers: { ...s.workers, grader: W(20) } };
    expect(saleMultipliers(tired, b, { by: 'player' })[0]).toBeCloseTo(1 + (g.tiers[2].mult + tc.ability_w4_tier_add - 1) * g.tired_bonus_share, 12);
  });
});

describe('flags off: byte-identical step (AC-M5A-16)', () => {
  it('abilities flag 0: a stray abilities.activeS is inert (no events, no countdown, no multipliers)', () => {
    const OFF = B({ abilities: 0 }), s = farm({ abilities: { hawker: { readyAt: NOW, activeS: 12 } } }), ev: any[] = [];
    const out = run(s, 20, true, OFF, ev);
    expect(out.abilities).toEqual(s.abilities); expect(ev.filter(e => String(e.type).startsWith('ability'))).toEqual([]);
  });
  it('no Date.now in the abilities sim', () => {
    const code = readFileSync(new URL('../src/sim/abilities.ts', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/Date\.now|performance\.now/);
  });
});
