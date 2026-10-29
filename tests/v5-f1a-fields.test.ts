// v5 F1a (engineering/m5.0-sizing.md §1 F1(d)(e), §4 PR split): M5 GameState fields declared once, absent while flags are off;
// flag plumbing m4.flags.* (HoE D-C1). No behaviour change: the sim never writes an M5 field with every flag off.
import { describe, it, expect } from 'vitest';
import { balance } from '../src/config/balance';
import { M5_FLAGS, flagOn, evRngFlagOn, type M5Flag } from '../src/config/flags';
import { M5_FIELDS, M5_SAVED_FIELDS, M5_SESSION_FIELDS } from '../src/sim/m5-state';
import { initialState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import type { SimEvent } from '../src/sim/events';

const withFlags = (enabled: number, flags?: Partial<Record<M5Flag, number>>) => ({ ...balance, m4: { ...balance.m4!, enabled, ...(flags ? { flags } : {}) } });

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

describe('F1a SimEvent members', () => {
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
