// G-8 / TEL-2: src/telemetry/schema.ts, the v0.6.2 allowlist (telemetry-spec d170eb09 §3/§3.1/§3.2 + errata v5 rev. 13
// a0e8f6d7; D-HOE-20261030-18/-19/-20/-22/-23/-24/-25/-29/-31/-32/-33). Every test carries its AC id (QA-D-1029-V5SCAP):
// TEL-AC1/6/8/11/12/15 (card #T, product/m5-gate-acs.md), T-AC9/T-AC10 (telemetry-spec L151-152), G-8 (errata V-8).
import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { balance as b, validateBalance } from '../src/config/balance';
import { WORKERS, WORKER_MOODS, type WorkerMood } from '../src/sim/workers';
import { BUY_ORDER } from '../src/econ/best-buy';
import { BREED_IDS } from '../src/config/breeds';
import { Telemetry, isPinned as legacyIsPinned } from '../src/telemetry/telemetry';
import { mem } from './helpers';
import { TELEMETRY_SCHEMA_VERSION, EVENT_SCHEMA, EVENT_TYPES, validateEvent, isPinned, VIEWPORT_H_BUCKETS, type FieldSpec, type TEvent } from '../src/telemetry/schema';

const SRC = new URL('../src/', import.meta.url).pathname;
const files = (d: string): string[] => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : []; });
let fg = 0;
const ev = (type: string, f: Record<string, unknown> = {}): TEvent => ({ type, ts: 1_761_830_000_000, sid: 'a1b2c3', fgMs: (fg += 100), ...f });
const ok = (type: string, f: Record<string, unknown> = {}) => validateEvent(ev(type, f));
const fieldsOf = (t: string) => [...Object.keys(EVENT_SCHEMA[t]?.fields ?? {}), ...Object.keys(EVENT_SCHEMA[t]?.records ?? {})];
const dynOk = (t: string, k: string) => {
  const s = EVENT_SCHEMA[t]; if (!s) return false;
  if ((s.dynamicFields ?? []).some(d => d.keyPattern.test(k))) return true;
  return Object.values(s.records ?? {}).some(r => (r.dynamicFields ?? []).some(d => d.keyPattern.test(k)));
};
const BBV2 = (b as any).telemetry.bbv2 as Record<string, number>;
const omit = (o: Record<string, unknown>, k: string) => { const { [k]: _x, ...r } = o; return r; };

// Valid fixtures (one per type under test); each negative case changes exactly one thing.
const ABU = { worker: 'hawker', farm: 12, energy_pct: 55, mood: 'working', via_all: false, t_since_ready_s: 3, in_sheet: true, combo: true };
const REFILL = { worker: 'coop_hand', energy_pct: 40, charges_left: 1, rank_by_risk: 2, by: 'manual', sheet_id: 3, entry_point: 'fatigue_chip', refillable_n: 2, best_worker: 'market_hand', lowest_worker: 'grader' };
const REST_ON = { worker: 'market_hand', on: true, energy_pct: 35, state: 'active', cause: 'manual', sheet_id: 4, entry_point: 'fatigue_chip', farm: 12, mood: 'tired', unpaid: false, ability_active: false, golden_on_screen: false, frenzy_active: true };
const REST_OFF = { worker: 'market_hand', on: false, energy_pct: 80, state: 'resting', cause: 'auto_full', sheet_id: null, entry_point: 'auto', paused_duration_s: 30 };
const STALL = { phase: 'shown', stall_id: 1, cause: 'mh_asleep', farm_level: 9, queue_len: 3, sellable_eggs: 12, coop_eggs: 40, mh_state: 'asleep', ch_state: 'working', focus_s_since_last_sale: 8.4, session_s: 120.5 };
const BBS = { key: 'FARM', meaningful: true, affordable: false, payback_s: 412.3, farm: 12, eta_s: 41.2 };
const START = { install_id: '0b7c3f8e-1d2a-4c5b-9e6f-7a8b9c0d1e2f', build: 'v5-rc0.abc1234', session_id: 'a1b2c3', session_index: 1, reason: 'load', farm_level: 0, collection_level: 0,
  has_coop_hand: false, viewport_w: '375–767', viewport_h: '740-899', reduced_motion: false };
const END = { reason: 'unload', fg_ms: 600_000, taps_total: 300, taps_moved_eggs: 280, eggs_collected_manual: 900, coop_full_ms: 12_000, eggs_lost_while_full: 33.5, managed: true, farm_level: 12, collection_level: 5 };

describe('[TEL-AC11] export contract (D-HOE-20261030-20, -25 N-2)', () => {
  it('[TEL-AC11] TELEMETRY_SCHEMA_VERSION is 0.6.2; EVENT_TYPES = Object.keys(EVENT_SCHEMA); every entry has pinned + fields', () => {
    expect(TELEMETRY_SCHEMA_VERSION).toBe('0.6.2'); expect(EVENT_TYPES).toEqual(Object.keys(EVENT_SCHEMA));
    for (const t of EVENT_TYPES) { const s = EVENT_SCHEMA[t]; expect(['boolean', 'function']).toContain(typeof s.pinned); expect(typeof s.fields).toBe('object'); }
    expect(Object.isFrozen(EVENT_SCHEMA)).toBe(true); expect(Object.isFrozen(EVENT_SCHEMA.refill_used.fields)).toBe(true);
  });
  it('[TEL-AC11][F-3] every FieldSpec uses a D-HOE-25 N-2 kind (no obj); str anchored; arr has maxLen; records are one-level only', () => {
    const KINDS = ['enum', 'int', 'count', 'bucket', 'bool', 'float', 'str', 'arr'], bad: string[] = [];
    const walk = (p: string, f: FieldSpec) => {
      if (!KINDS.includes(f.kind)) bad.push(`${p}: kind ${f.kind}`);
      if (f.kind === 'str' && !(f.pattern.source.startsWith('^') && f.pattern.source.endsWith('$'))) bad.push(`${p}: unanchored`);
      if (f.kind === 'arr') { if (!(f.maxLen >= 1)) bad.push(`${p}: maxLen`); walk(`${p}[]`, f.of); }
    };
    for (const t of EVENT_TYPES) {
      for (const [k, f] of Object.entries(EVENT_SCHEMA[t].fields)) walk(`${t}.${k}`, f);
      for (const [rk, r] of Object.entries(EVENT_SCHEMA[t].records ?? {})) {
        for (const [k, f] of Object.entries(r.fields)) walk(`${t}.${rk}.${k}`, f);
      }
    }
    expect(bad).toEqual([]);
    expect(EVENT_SCHEMA.session_summary.records?.start).toBeTruthy();
    expect(EVENT_SCHEMA.session_summary.fields.start).toBeUndefined();
    expect(EVENT_SCHEMA.session_end.records?.breed_family_s).toBeTruthy();
    expect(EVENT_SCHEMA.session_end.fields.breed_family_s).toBeUndefined();
  });
  it('[TEL-AC11 / G-8] validateEvent returns [] for valid and string[] errors otherwise; legacy:true events are not validated (V-0)', () => {
    expect(ok('goal_tap', { target: 'FARM', state: 'ready' })).toEqual([]);
    expect(validateEvent({ type: 'goal_tap', ts: 1, sessionMs: 5, legacy: true } as any)).toEqual([]);
    expect(validateEvent({ type: 'goal_tap', ts: 1, sessionMs: 5 } as any).length).toBeGreaterThan(0);
  });
});

describe('[TEL-AC1] envelope {type, ts, sid, fgMs}', () => {
  it('[TEL-AC1] sid is 6-char base36, ts and fgMs ints >= 0, no sessionMs; each envelope field is required', () => {
    expect(ok('save_reset')).toEqual([]);
    for (const k of ['ts', 'sid', 'fgMs']) expect(validateEvent(omit(ev('save_reset'), k) as TEvent)).toEqual([`save_reset.${k}: required`]);
    for (const sid of ['A1B2C3', 'a1b2c', 'a1b2c3d', 'a1-2c3', 12]) expect(ok('save_reset', { sid }).length).toBe(1);
    for (const fgMs of [-1, 1.5, '3', null]) expect(ok('save_reset', { fgMs }).length).toBe(1);
    expect(ok('save_reset', { sessionMs: 4 })).toEqual(['save_reset.sessionMs: unknown field']);
  });
  it('[T-AC9] a missing or non-string type, a non-object, and an unknown type each fail', () => {
    expect(validateEvent({ ts: 1, sid: 'a1b2c3', fgMs: 0 } as any)).toEqual(['type: required']);
    expect(validateEvent(null as any)).toEqual(['event: not an object']);
    expect(ok('not_an_event')).toEqual(['not_an_event: unknown event']);
  });
});

describe('[TEL-AC11] FieldSpec kinds, each tested (D-HOE-25 N-2)', () => {
  it('[TEL-AC11] enum: a listed value passes, an unlisted value or another type fails', () => {
    expect(ok('coop_hand_tip', { phase: 'shown', farm: 3 })).toEqual([]); expect(ok('coop_hand_tip', { phase: 'open', farm: 3 }).length).toBe(1); expect(ok('coop_hand_tip', { phase: 1, farm: 3 }).length).toBe(1);
  });
  it('[TEL-AC11] int{min,max}: bounds inclusive; non-integer, NaN, Infinity, string fail', () => {
    for (const v of [0, 100]) expect(ok('ability_used', { ...ABU, energy_pct: v })).toEqual([]);
    for (const v of [-1, 101, 50.5, NaN, Infinity, '50']) expect(ok('ability_used', { ...ABU, energy_pct: v }).length).toBe(1);
  });
  it('[TEL-AC11] count: int >= 0', () => {
    expect(ok('refill_used', { ...REFILL, refillable_n: 0 })).toEqual([]);
    for (const v of [-1, 1.5, '2', true]) expect(ok('refill_used', { ...REFILL, refillable_n: v }).length).toBe(1);
  });
  it('[TEL-AC11] bucket: exact wire strings only (viewport_h, V-4)', () => {
    expect(VIEWPORT_H_BUCKETS).toEqual(['<740', '740-899', '>=900']);
    for (const v of VIEWPORT_H_BUCKETS) expect(ok('session_start', { ...START, viewport_h: v })).toEqual([]);
    for (const v of [812, '740–899', '<=739', '']) expect(ok('session_start', { ...START, viewport_h: v }).length).toBe(1);
  });
  it('[TEL-AC11] bool: true/false only', () => {
    for (const v of [true, false]) expect(ok('ability_used', { ...ABU, combo: v, in_sheet: true })).toEqual([]);
    for (const v of [0, 1, 'true', null]) expect(ok('ability_used', { ...ABU, combo: v }).length).toBe(1);
  });
  it('[TEL-AC11] float{min,max,step}: range inclusive, step 0.1 (1 dp) and 0.001 (3 dp) enforced', () => {
    expect(ok('fatigue_cue_shown', { surface: 'hud_chip', loss_per_s: 12, loss_share: 0.125, n_tired: 1, n_asleep: 1, n_paused: 0, suppressed_by_stall: false })).toEqual([]);
    for (const v of [-0.001, 1.001, 0.1234, '0.1']) expect(ok('fatigue_cue_shown', { surface: 'hud_chip', loss_per_s: 12, loss_share: v, n_tired: 1, n_asleep: 1, n_paused: 0, suppressed_by_stall: false }).length).toBe(1);
    expect(ok('sales_stall', { ...STALL, session_s: 120.55 }).length).toBe(1); expect(ok('sales_stall', { ...STALL, session_s: 0.3 })).toEqual([]);
  });
  it('[TEL-AC11 / TEL-AC12] str{pattern}: anchored patterns only, no free text', () => {
    expect(ok('breed_slotted', { slot: 0, prev_slot: null, breed_id: BREED_IDS[0], prev_breed_id: null, cause: 'manual', loadout: 'P2A1B0', settling: 1, count: 1 })).toEqual([]);
    for (const v of ['P2A1B0 ', 'lots', 'P2 A1 B0', 'p2a1b0']) expect(ok('breed_slotted', { slot: 0, prev_slot: null, breed_id: BREED_IDS[0], prev_breed_id: null, cause: 'manual', loadout: v, settling: 1, count: 1 }).length).toBe(1);
  });
  it('[TEL-AC11] arr{of,maxLen}: element spec and length enforced', () => {
    expect(ok('abilities_unlocked', { farm: 12, hired: ['market_hand', 'coop_hand'] })).toEqual([]);
    expect(ok('abilities_unlocked', { farm: 12, hired: ['W1'] }).length).toBe(1); expect(ok('abilities_unlocked', { farm: 12, hired: 'market_hand' }).length).toBe(1);
    expect(ok('abilities_unlocked', { farm: 12, hired: [...WORKERS, 'grader'] }).length).toBe(1);
  });
  it('[TEL-AC11] optional?: absent passes, null fails; default (no flags): absent and null both fail', () => {
    expect(ok('first_worker_hired', { worker: 'coop_hand', farm_level: 3, via_nudge: false })).toEqual([]);
    expect(ok('first_worker_hired', { worker: 'coop_hand', farm_level: 3, via_nudge: false, t_since_unlock_s: null }).length).toBe(1);
    expect(ok('first_worker_hired', { worker: 'coop_hand', farm_level: 3 })).toEqual(['first_worker_hired.via_nudge: required']);
    expect(ok('first_worker_hired', { worker: 'coop_hand', farm_level: 3, via_nudge: null })).toEqual(['first_worker_hired.via_nudge: null']);
  });
  it('[TEL-AC11] nullable?: null passes, absent still fails (payback_s / eta_s, D-HOE-29)', () => {
    expect(ok('best_buy_shown', { ...BBS, payback_s: null, eta_s: null })).toEqual([]);
    expect(validateEvent(omit(ev('best_buy_shown', BBS), 'eta_s') as TEvent)).toEqual(['best_buy_shown.eta_s: required']);
    expect(ok('best_buy_shown', { ...BBS, payback_s: -1 }).length).toBe(1); expect(ok('best_buy_shown', { ...BBS, payback_s: 'Infinity' }).length).toBe(1);
  });
  it('[TEL-AC11][F-3][QA-D-1105-SCHEMA] EventSpec.records keep nested wire JSON (session_summary start/end/counts/first_upgrade)', () => {
    const sum = { type: 'session_summary', sid: 'a1b2c3', ts: 5, start: { ...omit(omit(START, 'install_id'), 'session_id') }, end: null, counts: { session_start: 1, upgrade: 2 },
      coop_full_ms: 0, eggs_lost_while_full: 0, coop_full_episodes: 0, coop_full_flapping: false, first_upgrade: null, upgrades: 2 };
    expect(validateEvent(sum as any)).toEqual([]);
    expect(validateEvent({ ...sum, counts: { not_an_event: 1 } } as any).length).toBe(1);
    expect(validateEvent({ ...sum, start: { ...sum.start, viewport_h: undefined } } as any)).toEqual(['session_summary.start.viewport_h: required']);
    expect(validateEvent({ ...sum, start: { ...sum.start, extra: 1 } } as any)).toEqual(['session_summary.start.extra: unknown field']);
    expect(validateEvent({ ...sum, end: { reason: 'unload', fg_ms: 1, taps_total: 0, taps_moved_eggs: 0, eggs_collected_manual: 0 } } as any)).toEqual([]);
    expect(validateEvent({ ...sum, first_upgrade: { fgMs: 10, upgrade: 'hens', newLevel: 2, cost: 1.5, taps_before: 3 } } as any)).toEqual([]);
    expect(JSON.stringify(sum).length).toBeLessThanOrEqual(1024);
  });
  it('[TEL-AC11][F-3] session_end.breed_family_s keeps wire {P,A,B}; optional whole record; bad child fails', () => {
    expect(ok('session_end', { ...END, breed_family_s: { P: 1.2, A: 0, B: 3.4 } })).toEqual([]);
    expect(ok('session_end', END)).toEqual([]); // absent OK (optional)
    expect(ok('session_end', { ...END, breed_family_s: null }).length).toBe(1); // null not allowed (not nullable)
    expect(ok('session_end', { ...END, breed_family_s: { P: 1.2, A: 0 } }).length).toBe(1); // B required
    expect(ok('session_end', { ...END, breed_family_s: { P: 1.2, A: 0, B: 3.4, X: 1 } })).toEqual(['session_end.breed_family_s.X: unknown field']);
    expect(ok('session_end', { ...END, breed_family_s: { P: -1, A: 0, B: 0 } }).length).toBe(1);
  });
});

describe('[TEL-AC8 / T-AC10] capped marker variant {capped, <counterKey>} (D-HOE-23 (a), D-HOE-32 M-2)', () => {
  it('[TEL-AC8] ability_blocked: {capped:true, events:50} only; no worker/reason/count on the marker; episodes is the wrong key', () => {
    expect(ok('ability_blocked', { capped: true, events: 50 })).toEqual([]);
    expect(ok('ability_blocked', { capped: true, episodes: 50 })).toEqual(['ability_blocked.events: required', 'ability_blocked.episodes: unknown field']);
    expect(ok('ability_blocked', { capped: true, events: 50, worker: 'hawker' })).toEqual(['ability_blocked.worker: unknown field']);
    expect(ok('ability_blocked', { worker: 'hawker', reason: 'cooldown', count: 3 })).toEqual([]);
    expect(ok('ability_blocked', { worker: 'hawker', reason: 'cooldown', count: 0 }).length).toBe(1);
    expect(ok('ability_blocked', { worker: 'hawker', reason: 'cooldown', count: 3, capped: false }).length).toBe(1);
  });
  it('[T-AC10] coop_full: {capped:true, episodes:100}, no phase; events is the wrong key', () => {
    expect(ok('coop_full', { capped: true, episodes: 100 })).toEqual([]);
    expect(ok('coop_full', { capped: true, events: 100 }).length).toBe(2); expect(ok('coop_full', { capped: true, episodes: 100, phase: 'end' }).length).toBe(1);
  });
  it('[D-HOE-32 M-2 / rev. 13 #21] zero_gain_purchase: pinned, NO capped marker (rejected); overflow only in session_end.zero_gain_purchase_dropped int >= 0', () => {
    expect(EVENT_SCHEMA.zero_gain_purchase.capped).toBeUndefined();
    expect(ok('zero_gain_purchase', { capped: true, events: 50 })).toEqual(['zero_gain_purchase.key: required', 'zero_gain_purchase.farm: required', 'zero_gain_purchase.level: required', 'zero_gain_purchase.meaningful_eta_s: required', 'zero_gain_purchase.capped: unknown field', 'zero_gain_purchase.events: unknown field']);
    expect(isPinned(ev('zero_gain_purchase', { key: 'HENS', farm: 30, level: 4, meaningful_eta_s: 12.5 }))).toBe(true);
    expect(ok('session_end', { ...END, zero_gain_purchase_dropped: 7 })).toEqual([]);
    for (const v of [-1, 0.5]) expect(ok('session_end', { ...END, zero_gain_purchase_dropped: v }).length).toBe(1);
    expect(BBV2.zero_gain_purchase_cap).toBe(50);
  });
});

describe('[TEL-AC8] dynamicFields (worker_summary wage_<worker>_*_cents; D-HOE-22, D-HOE-25 N-2, G-10)', () => {
  it('[TEL-AC8] every code worker id has wage_<id>_cents and wage_<id>_asleep_cents (int >= 0); W1-W4 and unknown keys fail', () => {
    for (const w of WORKERS) { expect(ok('worker_summary', { windowMs: 60_000, [`wage_${w}_cents`]: 12, [`wage_${w}_asleep_cents`]: 0 })).toEqual([]);
      expect(dynOk('worker_summary', `wage_${w}_asleep_cents`)).toBe(true); }
    for (const k of ['wage_W1_asleep_cents', 'wage_bob_cents', 'wage_market_hand_asleep', 'wage__cents', 'xwage_hawker_cents', 'wage_hawker_cents_x']) expect(ok('worker_summary', { windowMs: 1, [k]: 1 })).toEqual([`worker_summary.${k}: unknown field`]);
    for (const v of [-1, 1.5, null]) expect(ok('worker_summary', { windowMs: 1, wage_grader_asleep_cents: v }).length).toBe(1);
  });
  it('[T-AC9] export-only open:true on tap / worker_summary, live:true on save_newer_version; open:false fails', () => {
    expect(ok('tap', { count: 2, eggs: 3, empty: 0, full_at_start: false, open: true })).toEqual([]); expect(ok('worker_summary', { windowMs: 5, wage_coop_hand_cents: 9, open: true })).toEqual([]);
    expect(ok('save_newer_version', { version: 7, build: 'dev', live: true })).toEqual([]); expect(ok('tap', { count: 2, eggs: 3, empty: 0, full_at_start: false, open: false }).length).toBe(1);
  });
});

describe('[TEL-AC6] rc2 events (D-HOE-18/-19/-24/-32; rc2 v1.3.15)', () => {
  it('[TEL-AC6] refill_used: refillable_n, best/lowest_worker code ids, entry_point incl. fatigue_chip; no stall_id off stall_chip', () => {
    expect(ok('refill_used', REFILL)).toEqual([]); expect(ok('refill_used', { ...REFILL, entry_point: 'stall_chip', stall_id: 2 })).toEqual([]);
    expect(ok('refill_used', { ...REFILL, by: 'auto', entry_point: 'auto', sheet_id: null })).toEqual([]);
    for (const [k, v] of [['best_worker', 'W1'], ['lowest_worker', 'W4'], ['entry_point', 'banner'], ['stall_id', 0], ['sheet_id', 'abc'], ['by', 'manage']] as const)
      expect(ok('refill_used', { ...REFILL, [k]: v }).length, `${k}=${v}`).toBeGreaterThan(0);
    expect(ok('refill_used', { ...REFILL, sheet_id: null })).toEqual(['refill_used.sheet_id: null only for by:auto']);
    expect(ok('refill_used', { ...REFILL, stall_id: 2 })).toEqual(['refill_used.stall_id: only with entry_point stall_chip']);
    expect(validateEvent(omit(ev('refill_used', REFILL), 'refillable_n') as TEvent)).toEqual(['refill_used.refillable_n: required']);
  });
  it('[TEL-AC6] shift_sheet_opened: entry allowlisted incl. fatigue_chip; stall_id present iff entry = stall_chip', () => {
    expect(ok('shift_sheet_opened', { entry: 'fatigue_chip', sheet_id: 1 })).toEqual([]); expect(ok('shift_sheet_opened', { entry: 'stall_chip', sheet_id: 2, stall_id: 1 })).toEqual([]);
    expect(ok('shift_sheet_opened', { entry: 'fatigue_chip', sheet_id: 1, stall_id: 1 })).toEqual(['shift_sheet_opened.stall_id: present iff entry stall_chip']);
    expect(ok('shift_sheet_opened', { entry: 'stall_chip', sheet_id: 2 })).toEqual(['shift_sheet_opened.stall_id: present iff entry stall_chip']);
    expect(ok('shift_sheet_opened', { entry: 'auto', sheet_id: 1 }).length).toBe(1);
  });
  it('[TEL-AC6 / D-HOE-33 B-2] rest_toggled: cause incl. manage, entry_point, state active|paused|resting, mood = WorkerMood; on:true/on:false field sets', () => {
    expect(ok('rest_toggled', REST_ON)).toEqual([]); expect(ok('rest_toggled', REST_OFF)).toEqual([]);
    for (const s of ['active', 'paused', 'resting']) expect(ok('rest_toggled', { ...REST_ON, state: s })).toEqual([]);
    for (const s of ['normal', 'refillable', 'tired', 'working', 'rest']) expect(ok('rest_toggled', { ...REST_ON, state: s }).length).toBe(1);
    expect(ok('rest_toggled', { ...REST_OFF, cause: 'manage', entry_point: 'card', sheet_id: 5 })).toEqual([]);
    expect(ok('rest_toggled', { ...REST_ON, cause: 'other' }).length).toBe(1);
    expect(ok('rest_toggled', { ...REST_OFF, farm: 12 })).toEqual(['rest_toggled.farm: only with on:true']);
    expect(validateEvent(omit(ev('rest_toggled', REST_ON), 'golden_on_screen') as TEvent)).toEqual(['rest_toggled.golden_on_screen: required with on:true']);
    expect(validateEvent(omit(ev('rest_toggled', REST_OFF), 'paused_duration_s') as TEvent)).toEqual(['rest_toggled.paused_duration_s: required with on:false']);
    expect(ok('rest_toggled', { ...REST_ON, sheet_id: null })).toEqual(['rest_toggled.sheet_id: null only for cause auto_full']);
  });
  it('[D-HOE-32/-33 B-2] mood enums are exactly the WorkerMood values (rest_toggled, worker_paused, ability_used, worker_state)', () => {
    const all: Record<WorkerMood, true> = { working: true, tired: true, asleep: true, unpaid: true }; expect([...WORKER_MOODS].sort()).toEqual(Object.keys(all).sort());
    for (const [t, k] of [['rest_toggled', 'mood'], ['worker_paused', 'mood'], ['ability_used', 'mood'], ['worker_state', 'state']] as const) {
      const f = EVENT_SCHEMA[t].fields[k]; expect(f.kind).toBe('enum'); expect([...(f as any).values].sort()).toEqual([...WORKER_MOODS].sort()); }
  });
  it('[TEL-AC6] session_end.shortage_s is an int of whole seconds >= 0', () => {
    expect(ok('session_end', { ...END, shortage_s: 12 })).toEqual([]); for (const v of [2.5, -1, '3']) expect(ok('session_end', { ...END, shortage_s: v }).length).toBe(1);
  });
  it('[TEL-AC4] sales_stall stall_id / prev_stall_id int >= 1 (D-HOE-24); resolved-only fields only on phase resolved', () => {
    expect(ok('sales_stall', STALL)).toEqual([]); expect(ok('sales_stall', { ...STALL, prev_stall_id: 1, stall_id: 2 })).toEqual([]);
    for (const v of [0, 'S1', 1.5]) expect(ok('sales_stall', { ...STALL, stall_id: v }).length).toBe(1);
    expect(ok('sales_stall', { ...STALL, phase: 'resolved', resolved_by: 'chip_manage', time_to_resolve_s: 4.2, chip_tapped: true })).toEqual([]);
    expect(ok('sales_stall', { ...STALL, phase: 'resolved' })).toEqual(['sales_stall.resolved_by: required with phase resolved', 'sales_stall.time_to_resolve_s: required with phase resolved', 'sales_stall.chip_tapped: required with phase resolved']);
    expect(ok('sales_stall', { ...STALL, chip_tapped: true })).toEqual(['sales_stall.chip_tapped: only with phase resolved']);
  });
  it('[TEL-AC5] fatigue_cue_shown n_tired + n_asleep + n_paused <= 4', () => {
    const f = { surface: 'banner', loss_per_s: 3, loss_share: 0.2, n_tired: 2, n_asleep: 2, n_paused: 0, suppressed_by_stall: true };
    expect(ok('fatigue_cue_shown', f)).toEqual([]); expect(ok('fatigue_cue_shown', { ...f, n_paused: 1 })).toEqual(['fatigue_cue_shown: n_tired + n_asleep + n_paused > 4']);
  });
  it('[TEL-AC5 / rev. 13 #3, C-1] fatigue_cue_tapped: exactly the six fields of SS §8 L290-294; sum <= 4; no suppressed_by_stall', () => {
    const t = { surface: 'hud_chip', loss_per_s: 120, loss_share: 0.333, n_tired: 2, n_asleep: 1, n_paused: 1 };
    expect(Object.keys(EVENT_SCHEMA.fatigue_cue_tapped.fields).sort()).toEqual(['loss_per_s', 'loss_share', 'n_asleep', 'n_paused', 'n_tired', 'surface']);
    expect(Object.keys(EVENT_SCHEMA.fatigue_cue_shown.fields).sort()).toEqual(['loss_per_s', 'loss_share', 'n_asleep', 'n_paused', 'n_tired', 'suppressed_by_stall', 'surface']);
    expect(ok('fatigue_cue_tapped', t)).toEqual([]);
    for (const s of ['banner', 'bubble']) expect(ok('fatigue_cue_tapped', { ...t, surface: s })).toEqual([]);
    expect(ok('fatigue_cue_tapped', { ...t, surface: 'hud_icon' })).toEqual(['fatigue_cue_tapped.surface: not in enum']);
    expect(ok('fatigue_cue_tapped', { ...t, suppressed_by_stall: false })).toEqual(['fatigue_cue_tapped.suppressed_by_stall: unknown field']);
    expect(ok('fatigue_cue_tapped', { surface: 'hud_chip', loss_per_s: 3 })).toEqual(['fatigue_cue_tapped.loss_share: required', 'fatigue_cue_tapped.n_tired: required', 'fatigue_cue_tapped.n_asleep: required', 'fatigue_cue_tapped.n_paused: required']);
    // sum <= 4: Saves QA FAIL fixture at exactly 5 (2+2+1), and the boundary at 4
    expect(ok('fatigue_cue_tapped', { surface: 'hud_chip', loss_per_s: 120, loss_share: 0.333, n_tired: 2, n_asleep: 2, n_paused: 1 })).toEqual(['fatigue_cue_tapped: n_tired + n_asleep + n_paused > 4']);
    expect(ok('fatigue_cue_tapped', { ...t, n_tired: 4, n_asleep: 0, n_paused: 0 })).toEqual([]);
    expect(ok('fatigue_cue_tapped', { ...t, n_tired: 0, n_asleep: 0, n_paused: 4 })).toEqual([]);
    for (const k of ['n_tired', 'n_asleep', 'n_paused']) { expect(ok('fatigue_cue_tapped', { ...t, n_tired: 0, n_asleep: 0, n_paused: 0, [k]: 5 }).length).toBeGreaterThan(0); expect(ok('fatigue_cue_tapped', { ...t, [k]: -1 }).length).toBe(1); expect(ok('fatigue_cue_tapped', { ...t, [k]: 1.5 }).length).toBe(1); }
    // loss_per_s int cents/s >= 0 (Math.round(fatigueLoss * 100)); loss_share [0,1] at 3 dp
    expect(ok('fatigue_cue_tapped', { ...t, loss_per_s: 0 })).toEqual([]); expect(ok('fatigue_cue_tapped', { ...t, loss_per_s: Math.round(1.2345 * 100) })).toEqual([]);
    for (const v of [-1, 1.5, '120']) expect(ok('fatigue_cue_tapped', { ...t, loss_per_s: v }).length).toBe(1);
    for (const v of [0, 1, 0.15, 0.12, 0.001]) expect(ok('fatigue_cue_tapped', { ...t, loss_share: v })).toEqual([]);
    for (const v of [-0.001, 1.001, 0.1234]) expect(ok('fatigue_cue_tapped', { ...t, loss_share: v }).length).toBe(1);
    expect(isPinned(ev('fatigue_cue_tapped', t))).toBe(true);
  });
});

describe('[TEL-AC8] abilities and workers (D-HOE-23, D-HOE-25 N-8)', () => {
  it('[TEL-AC8] ability_used: combo bool required, t_since_ready_s int >= 0 (wall-clock s), in_sheet required; combo only with in_sheet', () => {
    expect(ok('ability_used', ABU)).toEqual([]);
    for (const k of ['combo', 'in_sheet', 't_since_ready_s']) expect(validateEvent(omit(ev('ability_used', ABU), k) as TEvent)).toEqual([`ability_used.${k}: required`]);
    for (const v of [-1, 2.5]) expect(ok('ability_used', { ...ABU, t_since_ready_s: v }).length).toBe(1);
    expect(ok('ability_used', { ...ABU, in_sheet: false })).toEqual(['ability_used.combo: true only with in_sheet']);
  });
  it('[TEL-AC8 / D-HOE-23] first_worker_hired: t_since_unlock_s optional int >= 0; farm_level int >= 1', () => {
    expect(ok('first_worker_hired', { worker: 'coop_hand', farm_level: 1, via_nudge: false, t_since_unlock_s: 0 })).toEqual([]);
    for (const v of [-1, 1.5]) expect(ok('first_worker_hired', { worker: 'coop_hand', farm_level: 1, via_nudge: false, t_since_unlock_s: v }).length).toBe(1);
    expect(ok('first_worker_hired', { worker: 'coop_hand', farm_level: 0, via_nudge: false }).length).toBe(1);
    expect(ok('first_worker_hired', { worker: 'W2', farm_level: 3, via_nudge: false }).length).toBe(1);
  });
  it('[TEL-AC8] session_end.ability_blocked_taps int >= 0 (all blocked taps incl. post-cap, D-HOE-23 (b))', () => {
    expect(ok('session_end', { ...END, ability_blocked_taps: 731 })).toEqual([]); for (const v of [-1, 0.5]) expect(ok('session_end', { ...END, ability_blocked_taps: v }).length).toBe(1);
  });
  it('[TEL-AC8] tip_shown id is clock_wage only', () => { expect(ok('tip_shown', { id: 'clock_wage' })).toEqual([]); expect(ok('tip_shown', { id: 'other' }).length).toBe(1); });
});

describe('[TEL-AC8 / BB-AC16] BBv2 rows #19-23 (errata rev. 10, D-HOE-29/-31/-32)', () => {
  it('[BB-AC16] key is str{pattern}, an anchored alternation of BUY_ORDER; zero-gain rows HENS|VALUE|COLL only', () => {
    for (const k of BUY_ORDER) expect(ok('best_buy_shown', { ...BBS, key: k })).toEqual([]);
    for (const k of ['farm', 'FARMX', 'XFARM', 'W5', '']) expect(ok('best_buy_shown', { ...BBS, key: k }).length).toBe(1);
    expect(ok('zero_gain_purchase', { key: 'HENS', farm: 30, level: 4, meaningful_eta_s: 12.5 })).toEqual([]);
    for (const k of ['FARM', 'W1']) { expect(ok('zero_gain_purchase', { key: k, farm: 30, level: 4, meaningful_eta_s: 12.5 }).length).toBe(1); expect(ok('best_buy_suppressed_zero_gain', { key: k, farm: 30, level: 4 }).length).toBe(1); }
    expect(ok('zero_gain_purchase', { key: 'HENS', farm: 30, level: 4, meaningful_eta_s: null }).length).toBe(1);
    expect(ok('zero_gain_purchase', { key: 'HENS', farm: 30, level: 4, farm_eta_s: 1 }).length).toBe(2); // rev. 10 rename
    expect(ok('best_buy_followed', { key: 'HENS', ms_since_shown: 0 })).toEqual([]); expect(ok('best_buy_followed', { key: 'HENS', ms_since_shown: 1.5 }).length).toBe(1);
  });
  it('[BB-AC16 / D-HOE-31 / rev. 13 #22] dead_zone: pinned; farm 10..29; s >= telemetry.bbv2.dead_zone_min_s, 1 dp; reason none_affordable only; open?: bool, present only as true', () => {
    const d = { farm: 10, s: BBV2.dead_zone_min_s, reason: 'none_affordable' };
    expect(ok('dead_zone', d)).toEqual([]); expect(ok('dead_zone', { ...d, farm: 29, open: true })).toEqual([]);
    expect((EVENT_SCHEMA.dead_zone.fields.open as any).kind).toBe('bool'); expect((EVENT_SCHEMA.dead_zone.fields.open as any).optional).toBe(true);
    expect((EVENT_SCHEMA.dead_zone.fields.reason as any).values).toEqual(['none_affordable']);
    for (const r of ['cap', 'max', 'idle']) expect(ok('dead_zone', { ...d, reason: r })).toEqual(['dead_zone.reason: not in enum']);
    for (const f of [9, 30, 0]) expect(ok('dead_zone', { ...d, farm: f })).toEqual(['dead_zone.farm: out of range']);
    expect(ok('dead_zone', { ...d, s: BBV2.dead_zone_min_s - 0.1 }).length).toBe(1); expect(ok('dead_zone', { ...d, s: 31.25 }).length).toBe(1);
    expect(ok('dead_zone', { ...d, open: false })).toEqual(['dead_zone.open: present only as open:true']); expect(ok('dead_zone', { ...d, open: 1 })).toEqual(['dead_zone.open: not bool']);
    expect((EVENT_SCHEMA.dead_zone.fields.s as any).min).toBe(BBV2.dead_zone_min_s); expect(isPinned(ev('dead_zone', d))).toBe(true);
  });
  it('[D-HOE-31 G-17] the four telemetry.bbv2 thresholds live in the top-level balance.json telemetry block (not under m4)', () => {
    expect(BBV2).toEqual({ shown_min_gap_s: 5, zero_gain_eta_max_s: 60, dead_zone_min_s: 30, zero_gain_purchase_cap: 50 });
    expect((b as any).m4?.telemetry?.bbv2).toBeUndefined();
    expect(readFileSync(join(SRC, 'telemetry/schema.ts'), 'utf8')).not.toMatch(/\bs:\s*F\(\s*30\b/);
  });
  const withoutBbv2 = (bestBuy: 0 | 1 | 'absent') => {
    const x = structuredClone(b) as any;
    delete x.telemetry.bbv2;
    if (bestBuy === 'absent') delete x.m4.flags.bestBuyV2; else x.m4.flags.bestBuyV2 = bestBuy;
    return x;
  };
  it('[F-1][QA-D-1105-SCHEMA] missing telemetry.bbv2 still validates when bestBuyV2 is off or absent', () => {
    expect(() => validateBalance(withoutBbv2(0), false)).not.toThrow();
    expect(() => validateBalance(withoutBbv2('absent'), false)).not.toThrow();
    expect(() => validateBalance(structuredClone(b), false)).not.toThrow(); // shipping block still validates
  });
  it('[F-1][QA-D-1105-SCHEMA] a present bbv2 value <= 0 is still rejected', () => {
    for (const v of [0, -1]) {
      const x = structuredClone(b) as any;
      x.telemetry.bbv2.shown_min_gap_s = v;
      expect(() => validateBalance(x, false)).toThrow(/balance\.telemetry\.bbv2\.shown_min_gap_s must be > 0/);
    }
  });
  it('[F-1][QA-D-1105-SCHEMA] bestBuyV2 on requires the block, and a partial block still fails', () => {
    expect(() => validateBalance(withoutBbv2(1), false)).toThrow(/balance\.telemetry\.bbv2\.shown_min_gap_s must be > 0/);
    const partial = structuredClone(b) as any;
    delete partial.telemetry.bbv2.dead_zone_min_s;
    partial.m4.flags.bestBuyV2 = 0;
    expect(() => validateBalance(partial, false)).toThrow(/balance\.telemetry\.bbv2\.dead_zone_min_s must be > 0/);
  });
});

describe('[TEL-AC15 / TEL-AC11] retired and never-allowlisted types', () => {
  it('[TEL-AC15] boost_used is retired: not in EVENT_SCHEMA, validation fails; ability_used{in_sheet} is valid', () => {
    expect(EVENT_SCHEMA.boost_used).toBeUndefined(); expect(ok('boost_used')).toEqual(['boost_used: unknown event']); expect(ok('ability_used', ABU)).toEqual([]);
  });
  it('[TEL-AC11 / G-4] no manage_used alias, no refill, no first_hire_nudge_*; the non-events collect/worker_collect/wage are absent', () => {
    for (const t of ['manage_used', 'refill', 'first_hire_nudge_shown', 'first_hire_nudge_dismissed', 'collect', 'worker_collect', 'wage', 'hire', 'manage']) expect(EVENT_SCHEMA[t], t).toBeUndefined();
  });
});

describe('[TEL-AC11] isPinned(e) is event-based (§3.2 + errata V-3, D-HOE-19 F-10)', () => {
  const BASE = ['session_start', 'session_end', 'upgrade', 'save_migrated', 'save_migration_aborted', 'save_backup_idb_unavailable', 'onboarding_step', 'onboarding_skip',
    'onboarding_abandon', 'worker_hire', 'worker_manage', 'worker_manage_all', 'save_reset', 'session_summary'];
  const V3 = ['sales_stall', 'fatigue_cue_shown', 'fatigue_cue_tapped', 'shift_sheet_opened', 'refill_used', 'rest_toggled', 'first_worker_hired', 'autorefill_toggled',
    'abilities_unlocked', 'ability_used', 'ability_ended', 'ability_blocked', 'worker_paused', 'worker_resumed', 'hatch_started', 'flock_complete', 'milestone_reached',
    'balanced_tier', 'zero_gain_purchase', 'dead_zone'];
  it('[TEL-AC11] the always-pinned types are exactly §3.2 + the 20 V-3 types; coop_full and tip_shown pin by predicate', () => {
    const always = EVENT_TYPES.filter(t => EVENT_SCHEMA[t].pinned === true).sort(); expect(always).toEqual([...BASE, ...V3].sort());
    expect(EVENT_TYPES.filter(t => typeof EVENT_SCHEMA[t].pinned === 'function').sort()).toEqual(['coop_full', 'tip_shown']);
  });
  it('[TEL-AC11] coop_full pins end and capped, not start; tip_shown pins {id:clock_wage} only; unknown types are not pinned', () => {
    expect(isPinned(ev('coop_full', { phase: 'end' }))).toBe(true); expect(isPinned(ev('coop_full', { capped: true, episodes: 100 }))).toBe(true); expect(isPinned(ev('coop_full', { phase: 'start' }))).toBe(false);
    expect(isPinned(ev('tip_shown', { id: 'clock_wage' }))).toBe(true); expect(isPinned(ev('tip_shown', { id: 'x' }))).toBe(false); expect(isPinned(ev('boost_used'))).toBe(false);
    for (const t of ['breed_revealed', 'breed_slotted', 'best_buy_shown', 'best_buy_followed', 'best_buy_suppressed_zero_gain', 'tap', 'worker_summary']) expect(isPinned(ev(t)), t).toBe(false);
  });
  it('[TEL-AC11] every type today\'s telemetry.ts isPinned(type) pins is pinned by the schema (no pin lost when the subset swaps over)', () => {
    for (const t of EVENT_TYPES) if (legacyIsPinned(t)) expect(isPinned(ev(t, t === 'coop_full' ? { phase: 'end' } : {})), t).toBe(true);
  });
});

describe('[T-AC9] every emit site in src matches the schema', () => {
  const src = files(SRC).map(f => [f.slice(SRC.length), readFileSync(f, 'utf8')] as const);
  it('[T-AC9] every literal track(name) is allowlisted and its literal payload keys are schema fields', () => {
    const bad: string[] = []; let n = 0;
    for (const [f, t] of src) for (const m of t.matchAll(/track\??\.?\(\s*'([a-z0-9_]+)'(?:\s*,\s*\{([^{}]*)\})?/g)) { n++;
      if (!EVENT_SCHEMA[m[1]]) { bad.push(`${f}: ${m[1]}`); continue; }
      for (const k of (m[2] ?? '').split(',').map(x => x.trim()).filter(x => !x.startsWith('...')).map(x => x.match(/^([A-Za-z_$][\w$]*)/)?.[1]).filter(Boolean) as string[])
        if (!fieldsOf(m[1]).includes(k) && !dynOk(m[1], k)) bad.push(`${f}: ${m[1]}.${k}`);
    }
    expect(n).toBeGreaterThanOrEqual(25); expect(bad).toEqual([]);
  });
  it('[T-AC9] every SimEvent variant forwarded by Game is allowlisted (or a listed non-event) with every field on the schema', () => {
    const evs = readFileSync(join(SRC, 'sim/events.ts'), 'utf8'), NOT = ['collect', 'worker_collect', 'wage'], bad: string[] = []; let n = 0;
    for (const m of evs.matchAll(/\|\s*\{\s*type:\s*'([a-z0-9_]+)';([^}]*)\}/g)) { n++;
      if (NOT.includes(m[1])) continue; if (!EVENT_SCHEMA[m[1]]) { bad.push(m[1]); continue; }
      for (const k of m[2].split(';').map(x => x.trim().match(/^([A-Za-z_]\w*)\??:/)?.[1]).filter(Boolean) as string[]) if (!fieldsOf(m[1]).includes(k)) bad.push(`${m[1]}.${k}`); }
    expect(n).toBeGreaterThanOrEqual(29); expect(bad).toEqual([]); // 29 SimEvent variants on rc/v5 65a7443 (the parser must find them all)
  });
  it('[T-AC9] every worker_summary key the code sums is a schema field or dynamic key', () => {
    for (const w of WORKERS) expect(dynOk('worker_summary', `wage_${w}_cents`)).toBe(true);
    for (const k of ['coop_hand_eggs', 'market_hand_eggs', 'market_hand_cents', 'windowMs']) expect(fieldsOf('worker_summary')).toContain(k);
  });
});

describe('[T-AC9] dev builds warn on unknown events; nothing is dropped', () => {
  it('[T-AC9] Telemetry.track of an unknown type console.warns once in dev and still records the event; known types do not warn', () => {
    const w = vi.spyOn(console, 'warn').mockImplementation(() => {}); const tl = new Telemetry(mem(), { ring_size: 50, flush_interval_s: 5, tap_batch_ms: 1000 });
    tl.track('goal_tap', { target: 'FARM', state: 'ready' }); expect(w).not.toHaveBeenCalled();
    tl.track('not_an_event', { a: 1 }); expect(tl.events().map(e => e.type)).toContain('not_an_event'); expect(w).toHaveBeenCalledTimes(1);
    tl.track('not_an_event', { a: 2 }); expect(w).toHaveBeenCalledTimes(1); // warn-once (kills M30: drop of warned.add)
    expect(tl.events().filter(e => e.type === 'not_an_event')).toHaveLength(2); w.mockRestore();
  });
});

// G-8 (D-HOE-19 G-1, D-HOE-31, D-HOE-32 M-2): worst-case pinned store for ONE current session (never compacted, §3.3).
// 1 h at the documented maxima; every event validates; the serialized pinned set must stay <= 200 KB (no silent raise).
function worstCaseSession(buySpam: boolean): TEvent[] {
  let t = 0; const out: TEvent[] = []; const p = (type: string, f: Record<string, unknown>) => { t += 10; out.push({ type, ts: 1_761_830_000_000 + t, sid: 'z9y8x7', fgMs: t, ...f }); };
  p('session_start', START);
  for (let i = 1; i <= 100; i++) p('coop_full', { phase: 'end', durationMs: 4_000, farm_level: 30, coop_cap: 400, exit_reason: 'coop_hand', eggs_lost: 120.5 });
  p('coop_full', { capped: true, episodes: 100 });
  for (let i = 0; i < 50; i++) p('ability_blocked', { worker: WORKERS[i % 4], reason: 'cooldown', count: 9 }); p('ability_blocked', { capped: true, events: 50 });
  for (let i = 0; i < 120; i++) p('dead_zone', { farm: 10 + (i % 20), s: 30.1, reason: 'none_affordable' }); // 1 per dead_zone_min_s for 1 h
  const zg = buySpam ? BBV2.zero_gain_purchase_cap : 5;
  for (let i = 0; i < zg; i++) p('zero_gain_purchase', { key: 'HENS', farm: 30, level: 200 + i, meaningful_eta_s: 59.9 }); // over the cap: nothing emitted, no marker (rev. 13)
  // buy-spam: every reachable level bought in this one session (Farm/Collection to maxLevel, Hens/Value to the track cap
  // min(F+3, max) <= maxLevel + 3), each a pinned upgrade, plus 50 zero-gain purchases (rev. 13: NO capped marker).
  const ups = buySpam ? 2 * b.maxLevel + 2 * (b.maxLevel + 3) : 60;
  for (let i = 0; i < ups; i++) p('upgrade', { upgrade: 'hens', newLevel: 100 + i, cost: 123456789.12, coinsBefore: 99_999_999_999, track: 'hens', is_first_upgrade: i === 0, taps_before: 5000, zero_gain: true });
  for (let i = 0; i < 40; i++) { p('shift_sheet_opened', { entry: 'stall_chip', sheet_id: i + 1, stall_id: i + 1 });
    p('refill_used', { ...REFILL, sheet_id: i + 1, entry_point: 'stall_chip', stall_id: i + 1 }); p('rest_toggled', { ...REST_ON, sheet_id: i + 1 }); p('rest_toggled', { ...REST_OFF, sheet_id: i + 1, entry_point: 'card', cause: 'manual' });
    p('ability_used', { ...ABU }); p('ability_ended', { worker: 'hawker', cause: 'expired', effect_s: 30 });
    p('sales_stall', { ...STALL, stall_id: i + 1 }); p('sales_stall', { ...STALL, stall_id: i + 1, phase: 'resolved', resolved_by: 'chip_refill', time_to_resolve_s: 3.1, chip_tapped: true });
    p('fatigue_cue_shown', { surface: 'hud_chip', loss_per_s: 120, loss_share: 0.333, n_tired: 2, n_asleep: 1, n_paused: 1, suppressed_by_stall: false }); p('fatigue_cue_tapped', { surface: 'hud_chip', loss_per_s: 120, loss_share: 0.333, n_tired: 2, n_asleep: 1, n_paused: 1 }); }
  for (let i = 0; i < 24; i++) p('hatch_started', { breed_id: BREED_IDS[i % BREED_IDS.length], rarity: 'C', cost: 12_508_785, coinsBefore: 99_999_999, pity_before: 7, free: false, farm_level: 30 });
  for (let i = 0; i < 40; i++) p('milestone_reached', { id: `hens_${i}`, track: 'hens', level: 10 * (i + 1), mult: 1.5 });
  for (let i = 0; i < 20; i++) { p('worker_manage', { worker: 'hawker', energyBefore: 20 }); p('autorefill_toggled', { worker: 'grader', on: i % 2 === 0, farm_level: 30 }); }
  p('abilities_unlocked', { farm: 12, hired: [...WORKERS] }); p('first_worker_hired', { worker: 'coop_hand', farm_level: 3, via_nudge: false, t_since_unlock_s: 30 }); p('flock_complete', { hatches: 24, farm_level: 30, elapsed_since_unlock_s: 99_999, backfilled: false });
  p('tip_shown', { id: 'clock_wage' });
  p('session_end', { ...END, coop_full_flapping: true, ability_blocked_taps: 9999, shortage_s: 3600, zero_gain_purchase_dropped: buySpam ? 550 : 0 });
  return out;
}
describe('[G-8] worst-case pinned size <= 200 KB (D-HOE-19 G-1, D-HOE-31, D-HOE-32 M-2)', () => {
  for (const spam of [false, true]) it(`[G-8] worst-case 1 h session${spam ? ' + buy-spam fixture' : ''}: every event valid and pinned; serialized <= 200 KB`, () => {
    const s = worstCaseSession(spam), errs = s.flatMap(validateEvent); expect(errs).toEqual([]); expect(s.every(isPinned)).toBe(true);
    expect(s.filter(e => e.type === 'dead_zone').length).toBe(120); expect(s.filter(e => e.type === 'zero_gain_purchase').length).toBe(spam ? 50 : 5); expect(s.some(e => e.type === 'zero_gain_purchase' && 'capped' in e)).toBe(false);
    const bytes = JSON.stringify(s).length; console.log(`G-8 pinned bytes (${spam ? 'buy-spam' : 'base'}): ${bytes}`); expect(bytes).toBeLessThanOrEqual(200 * 1024);
  });
});
