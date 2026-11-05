// v5 F1a (engineering/m5.0-sizing.md §1 F1(d)(e), §4 PR split): M5 GameState fields declared once, absent while flags are off;
// flag plumbing m4.flags.* (HoE D-C1). No behaviour change: the sim never writes an M5 field with every flag off.
import { describe, it, expect } from 'vitest';
import { balance } from '../src/config/balance';
import { M5_FLAGS, flagOn, evRngFlagOn, type M5Flag } from '../src/config/flags';
import { M5_FIELDS, M5_SAVED_FIELDS, M5_SESSION_FIELDS } from '../src/sim/m5-state';
import { initialState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import type { SimEvent, M5SimEvent } from '../src/sim/events';

const withFlags = (enabled: number, flags?: Partial<Record<M5Flag, number>>) => ({ ...balance, m4: { ...balance.m4!, enabled, ...(flags ? { flags: { ...(balance.m4 as any).flags, ...flags } } : {}) } }) as typeof balance;

describe('F1a M5 fields', () => {
  it('[F1(e)] saved and session lists are disjoint and unique', () => {
    expect(new Set(M5_FIELDS).size).toBe(M5_FIELDS.length);
    for (const f of M5_SAVED_FIELDS) expect((M5_SESSION_FIELDS as readonly string[]).includes(f)).toBe(false);
  });
  it('[F1(e)][AC-M5A-16] initialState carries no M5 field (flag-off saves stay byte-identical)', () => {
    const s = initialState(balance, 7) as any;
    for (const f of M5_FIELDS) expect(f in s).toBe(false);
  });
  it('[F1(e)][AC-M5A-16] 10 min of 10 Hz play with every flag off never creates an M5 field', () => {
    let s: any = { ...initialState(balance, 3), coinsCents: 5_000_000 };
    for (let i = 0; i < 6000; i++) {
      s = step(s, 0.1, balance);
      if (i % 3 === 0) s = apply(s, { type: 'collect' }, balance);
      if (i % 50 === 0) s = apply(s, { type: 'sellAll' }, balance);
      if (i % 97 === 0) s = apply(s, { type: 'buyFarm' }, balance);
    }
    for (const f of M5_FIELDS) expect(f in s).toBe(false);
    for (const w of Object.values(s.workers) as any[]) { expect('paused' in w).toBe(false); expect('callLockoutS' in w).toBe(false); }
  });
});

// F1(d) spec pin. Sim-side fields of every M5SimEvent member, from the spec telemetry tables: golden egg §8 (collectible_*,
// frenzy_*), broody §8 (collectible_* skin broody_hen, nest_fill_share), streak §8 (streak_started, streak_peak + max_tier),
// abilities §7 (abilities_unlocked, ability_used/blocked/ended). UI-only fields that Game adds when forwarding
// (collectible_id, layout, Broody restored) are not sim fields (API sheet §4). The type-level Eq below makes tsc fail if a
// member or field is renamed, added or dropped in src/sim/events.ts; the runtime test pins the member names.
const M5_EVENT_SPEC = {
  collectible_spawned: ['skin', 'farm_level', 'collection_level', 'slot_id', 'interval_s', 'deferred_ms'],
  collectible_collected: ['skin', 'reaction_ms', 'in_warning', 'reward_type', 'reward_value', 'reward_duration_s', 'farm_level', 'nest_fill_share'],
  collectible_expired: ['skin', 'reason', 'farm_level'],
  frenzy_started: ['mult', 'duration_s', 'farm_level', 'grader_tier'],
  frenzy_ended: ['extra_coins', 'eggs_sold', 'sold_by_player', 'sold_by_workers', 'reason'],
  streak_started: ['farm_level', 'collection_level'],
  streak_peak: ['value', 'duration_s', 'credited_taps', 'time_at_cap_s', 'extra_coins', 'frenzy_overlap_s', 'reason', 'max_tier'],
  abilities_unlocked: ['farm', 'hired'],
  ability_used: ['worker', 'farm', 'energy_pct', 'mood', 'via_all', 't_since_ready_s', 'in_sheet'],
  ability_blocked: ['worker', 'reason', 'count'],
  ability_ended: ['worker', 'cause', 'effect_s'],
} as const;
type Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Spec = typeof M5_EVENT_SPEC;
type SimFields<K> = Exclude<keyof Extract<M5SimEvent, { type: K }>, 'type'>;
const _membersPinned: Eq<M5SimEvent['type'], keyof Spec> = true;
const _fieldsPinned: { [K in keyof Spec]: Eq<SimFields<K>, Spec[K][number]> } = {
  collectible_spawned: true, collectible_collected: true, collectible_expired: true, frenzy_started: true, frenzy_ended: true,
  streak_started: true, streak_peak: true, abilities_unlocked: true, ability_used: true, ability_blocked: true, ability_ended: true,
};
type CollectExtra = Exclude<keyof Extract<SimEvent, { type: 'collect' }>, 'type' | 'eggs'>;
const _collectPinned: Eq<CollectExtra, 'credited' | 'bonus_cents'> = true;

describe('F1a SimEvent members', () => {
  it('[F1(d)] M5SimEvent members and sim fields are pinned to the spec telemetry tables (11 members; collect + credited/bonus_cents)', () => {
    expect(_membersPinned && _collectPinned && Object.values(_fieldsPinned).every(v => v === true)).toBe(true);
    expect(Object.keys(M5_EVENT_SPEC)).toEqual(['collectible_spawned', 'collectible_collected', 'collectible_expired', 'frenzy_started', 'frenzy_ended',
      'streak_started', 'streak_peak', 'abilities_unlocked', 'ability_used', 'ability_blocked', 'ability_ended']);
  });
  const M5_TYPES = new Set(['collectible_spawned', 'collectible_collected', 'collectible_expired', 'frenzy_started', 'frenzy_ended', 'streak_started', 'streak_peak', 'abilities_unlocked', 'ability_used', 'ability_blocked', 'ability_ended']);
  it('[F1(d)] 10 min of play with every flag off emits no M5SimEvent and no collect.credited / bonus_cents', () => {
    const ev: SimEvent[] = []; let s: any = { ...initialState(balance, 5), coinsCents: 5_000_000 };
    for (let i = 0; i < 6000; i++) {
      s = step(s, 0.1, balance, ev);
      if (i % 3 === 0) s = apply(s, { type: 'collect' }, balance, ev);
      if (i % 50 === 0) s = apply(s, { type: 'sellAll' }, balance, ev);
      if (i % 97 === 0) s = apply(s, { type: 'buyFarm' }, balance, ev);
    }
    expect(ev.some(e => e.type === 'collect')).toBe(true);
    for (const e of ev) { expect(M5_TYPES.has(e.type)).toBe(false); if (e.type === 'collect') { expect('credited' in e).toBe(false); expect('bonus_cents' in e).toBe(false); } }
  });
});

describe('F1a flag plumbing (m4.flags.*)', () => {
  it('[D-C1] M5_FLAGS is exactly the 14 ruled names, in order (D-HOE-20261029-02; fatigueCue D-HOP-2026-10-29-05)', () => {
    expect([...M5_FLAGS]).toEqual(['golden', 'streak', 'tapCoins', 'abilities', 'broody', 'salesStopped', 'fatigueCue', 'pause',
      'rc2Refill', 'autoRefill', 'clockWage', 'breeds', 'zeroGainUi', 'bestBuyV2']);
  });
  it('[D-C1] flag names are unique camelCase', () => {
    expect(new Set(M5_FLAGS).size).toBe(M5_FLAGS.length);
    for (const f of M5_FLAGS) expect(f).toMatch(/^[a-z][A-Za-z0-9]*$/);
  });
  it('[D-C1] absent block = every flag off', () => {
    const b = withFlags(1); delete (b.m4 as any).flags;
    for (const f of M5_FLAGS) expect(flagOn(b, f)).toBe(false);
  });
  it('[D-C1][AC-M5A-16] a flag is on only at exactly 1 AND m4.enabled', () => {
    expect(flagOn(withFlags(1, { golden: 1 }), 'golden')).toBe(true);
    expect(flagOn(withFlags(0, { golden: 1 }), 'golden')).toBe(false);
    expect(flagOn(withFlags(1, { golden: 0 }), 'golden')).toBe(false);
    expect(flagOn(withFlags(1, { golden: 2 }), 'golden')).toBe(false);
    expect(flagOn(withFlags(1, { golden: 1 }), 'broody')).toBe(false);
  });
  it('[D-C2][D-C4] evRng is live for golden or broody only', () => {
    expect(evRngFlagOn(withFlags(1, { golden: 1 }))).toBe(true);
    expect(evRngFlagOn(withFlags(1, { broody: 1 }))).toBe(true);
    expect(evRngFlagOn(withFlags(1, { streak: 1, abilities: 1 }))).toBe(false);
  });
});
