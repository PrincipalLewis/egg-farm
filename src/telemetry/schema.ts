/**
 * Telemetry v0.6.2 event allowlist (G-8 / TEL-2; manifest row 11, owner Saves). Source of record: telemetry-spec v0.6.2
 * d170eb09 §3/§3.1/§3.2 + errata v5 rev. 13 a0e8f6d7 (TELERR7; supersedes rev. 10 fd3416ec / rev. 12 0cfe168a), with D-HOE-20261030-18/-19/-20/-22/-23/-24/-25/-29/-31/-32/-33.
 * Contract (D-HOE-20 + D-HOE-25 N-2): TELEMETRY_SCHEMA_VERSION, EVENT_SCHEMA, EVENT_TYPES, validateEvent(e), isPinned(e).
 * - Closed schema: an unknown event type or field fails validation. No free text: every string is an enum or an anchored pattern.
 * - Null rule (errata V-2): a field is required and non-null unless it carries optional?: true (may be absent) or nullable?: true.
 * - Flag-gated fields are optional here; "absent with the flag off" (TEL-AC10) is checked on the emitter, not by this module.
 * - validateEvent is for tests and dev only; telemetry never drops an event at runtime (dev warns on an unknown type).
 * Thresholds come from the hand-set top-level balance.json `telemetry.bbv2` block (D-HOE-31 G-17, D-HOE-32), never constants.
 */
import { balance } from '../config/balance';
import { WORKERS, WORKER_MOODS } from '../sim/workers';
import { BUY_ORDER } from '../econ/best-buy';
import { BREED_IDS } from '../config/breeds';

export const TELEMETRY_SCHEMA_VERSION = '0.6.2';
export interface TEvent { type: string; [k: string]: unknown }
type Mods = { optional?: true; nullable?: true };
export type FieldSpec = Mods & (
  | { kind: 'enum'; values: readonly (string | number | boolean)[] }
  | { kind: 'int'; min?: number; max?: number }
  | { kind: 'count' } // int >= 0
  | { kind: 'bucket'; values: readonly string[] } // a bucketed measurement, exact wire strings
  | { kind: 'bool' }
  | { kind: 'float'; min?: number; max?: number; step?: number }
  | { kind: 'str'; pattern: RegExp } // anchored pattern, never free text
  | { kind: 'arr'; of: FieldSpec; maxLen: number }
  | { kind: 'obj'; fields: Readonly<Record<string, FieldSpec>>; dynamicFields?: readonly DynamicField[] } // nested record (session_summary, breed_family_s)
);
export interface DynamicField { keyPattern: RegExp; spec: FieldSpec }
export interface EventSpec {
  pinned: boolean | ((e: TEvent) => boolean);
  fields: Readonly<Record<string, FieldSpec>>;
  dynamicFields?: readonly DynamicField[];
  /** Capped-marker variant (D-HOE-25 N-2): when e.capped === true the event is exactly {capped: true, <counterKey>: count}. */
  capped?: { counterKey: 'events' | 'episodes' };
}

// ---- builders --------------------------------------------------------------------------------------------------------
const E = (...values: readonly (string | number | boolean)[]): FieldSpec => ({ kind: 'enum', values });
const I = (min?: number, max?: number): FieldSpec => ({ kind: 'int', ...(min !== undefined && { min }), ...(max !== undefined && { max }) });
const C: FieldSpec = { kind: 'count' };
const BOOL: FieldSpec = { kind: 'bool' };
const F = (min?: number, max?: number, step?: number): FieldSpec => ({ kind: 'float', ...(min !== undefined && { min }), ...(max !== undefined && { max }), ...(step !== undefined && { step }) });
const S = (pattern: RegExp): FieldSpec => ({ kind: 'str', pattern });
const A = (of: FieldSpec, maxLen: number): FieldSpec => ({ kind: 'arr', of, maxLen });
const O = (fields: Record<string, FieldSpec>, dynamicFields?: DynamicField[]): FieldSpec => ({ kind: 'obj', fields, ...(dynamicFields && { dynamicFields }) });
const opt = (f: FieldSpec): FieldSpec => ({ ...f, optional: true });
const nul = (f: FieldSpec): FieldSpec => ({ ...f, nullable: true });
const alt = (xs: readonly string[]) => xs.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

// ---- shared field types --------------------------------------------------------------------------------------------
const WORKER = E(...WORKERS); // G-10: code ids on the wire, never W1-W4
const MOOD = E(...WORKER_MOODS); // D-HOE-32/-33 B-2: WorkerMood exactly
const TOKEN = S(/^[a-z][a-z0-9_]{0,39}$/); // a code identifier (enum value not listed in a spec), never free text
const ERRNAME = S(/^[A-Za-z][A-Za-z0-9]{0,39}$/); // a DOMException / Error class name (save_failed.reason)
const BUILD = S(/^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/);
const BUY_KEY = S(new RegExp(`^(?:${alt(BUY_ORDER)})$`)); // D-HOE-29: anchored alternation of BUY_ORDER
const ZG_KEY = S(/^(?:HENS|VALUE|COLL)$/); // non-exempt BuyKeys (errata #21/#23)
const PCT = I(0, 100);
const ENTRY = E('nav', 'card', 'stall_chip', 'fatigue_chip'); // D-HOE-18 13:21 addendum
const ENTRY_POINT = E('nav', 'card', 'stall_chip', 'fatigue_chip', 'auto');
const COUNTER = I(1); // per-session monotonic int counter >= 1 (sheet_id, stall_id; D-HOE-18, D-HOE-24)
const S1 = F(0, undefined, 0.1); // seconds, 1 dp
const MONEY = F(0); // legacy dollar amounts "as emitted on main" (upgrade.cost, sell.price/value)
export const VIEWPORT_H_BUCKETS = ['<740', '740-899', '>=900'] as const; // errata V-4 exact ASCII strings
export const VIEWPORT_W_BUCKETS = ['<375', '375–767', '≥768'] as const; // spec L27 existing literals (V-4: unchanged)
/** Errata rev. 13 row #3 (C-1 CLOSED, D-PMM-2026-10-30-TAPFIELDS; SS v1.3.27 c29c9285 §8 L290-294 + note 3): the six
 *  fields shared by fatigue_cue_shown and fatigue_cue_tapped, values at each event's own emit moment. loss_per_s = int
 *  cents/s; loss_share [0,1] 3 dp; n_* int 0..4 with n_tired + n_asleep + n_paused <= 4 (RULES). suppressed_by_stall is
 *  on fatigue_cue_shown only. */
const FATIGUE_CUE_TAPPED_FIELDS: Readonly<Record<string, FieldSpec>> = { surface: E('hud_chip', 'banner', 'bubble'), loss_per_s: C, loss_share: F(0, 1, 0.001), n_tired: I(0, 4), n_asleep: I(0, 4), n_paused: I(0, 4) };
const BBV2 = (balance as { telemetry: { bbv2: { shown_min_gap_s: number; zero_gain_eta_max_s: number; dead_zone_min_s: number; zero_gain_purchase_cap: number } } }).telemetry.bbv2;
const RARITY = E('Common', 'Rare', 'Epic', 'Legendary'); // breeds §8 / D6 (rev 3.8.9; was C/R/E/L)
const BREED = E(...BREED_IDS);
const LOADOUT = S(/^P[0-3]A[0-3]B[0-3]$/);

const START_FIELDS = { reason: E('load', 'resume'), build: BUILD, session_index: I(1), farm_level: C, collection_level: C, has_coop_hand: BOOL,
  viewport_w: { kind: 'bucket', values: VIEWPORT_W_BUCKETS } as FieldSpec, viewport_h: { kind: 'bucket', values: VIEWPORT_H_BUCKETS } as FieldSpec,
  reduced_motion: BOOL, prev_hidden_ms: opt(C) };
const ON_TRUE = ['farm', 'mood', 'unpaid', 'ability_active', 'golden_on_screen', 'frenzy_active'] as const;

const SCHEMA: Record<string, EventSpec> = {
  // ---- session / core (§3, §3.1) ----
  session_start: { pinned: true, fields: { install_id: opt(S(/^[0-9A-Za-z-]{8,64}$/)), session_id: S(/^[0-9a-z]{6}$/), ...START_FIELDS } }, // install_id redacted on console export
  session_end: { pinned: true, fields: {
    reason: E('unload', 'hidden'), fg_ms: C, taps_total: C, taps_moved_eggs: C, eggs_collected_manual: C, coop_full_ms: C, eggs_lost_while_full: F(0), managed: BOOL,
    farm_level: C, collection_level: C, coop_full_flapping: opt(BOOL), golden_frozen_s: opt(S1),
    golden_spawned: opt(C), golden_collected: opt(C), golden_cents: opt(C), frenzy_extra_cents: opt(C), broody_cents: opt(C), broody_collects: opt(C),
    credited_taps: opt(C), tap_bonus_cents: opt(C), streak_extra_cents: opt(C), empty_credited: opt(C), coop_hand: opt(BOOL), // errata rev. 16 V-2b "+ §8.1" (streak §8.1, ST-AC20)
    breed_hatches: opt(C), breed_spend_cents: opt(C), breed_present_eggs: opt(C), breed_away_eggs: opt(C), breed_broody_cents: opt(C), breeds_owned: opt(C),
    breed_slots_used: opt(I(0, 3)), breed_loadout_end: opt(LOADOUT), breed_family_s: opt(O({ P: F(0), A: F(0), B: F(0) })), present_active_s: opt(S1), present_lost_count: opt(C),
    ability_uses: opt(C), calls_ready_unused_s: opt(F(0)), ability_blocked_taps: opt(C), // D-HOE-23 (b): all blocked taps incl. post-cap
    wage_paid_asleep_cents: opt(C), asleep_s: opt(S1), refills_manual: opt(C), refills_auto: opt(C), charge_starved_s: opt(S1),
    shortage_s: opt(C), // D-HOE-18 13:16: whole seconds
    paused_worker_s: opt(F(0)), all_paused_s: opt(F(0)), // rc2Refill = 0 only (V-6)
    zero_gain_purchase_dropped: opt(C), // D-HOE-32 M-2
  } },
  session_summary: { pinned: true, fields: { // §3.3; ts = session_start.ts, no fgMs
    fgMs: opt(C), start: O(START_FIELDS), end: nul(O({ reason: E('unload', 'hidden'), fg_ms: C, taps_total: C, taps_moved_eggs: C, eggs_collected_manual: C })),
    counts: O({}, [{ keyPattern: /^[a-z][a-z0-9_]{0,39}$/, spec: C }]), coop_full_ms: C, eggs_lost_while_full: F(0), coop_full_episodes: C, coop_full_flapping: BOOL,
    first_upgrade: nul(O({ fgMs: C, upgrade: E('collection', 'farm', 'hens', 'eggValue'), newLevel: C, cost: MONEY, taps_before: C })), upgrades: C } },
  tap: { pinned: false, fields: { count: I(1), eggs: C, empty: C, full_at_start: BOOL, credited: opt(C), empty_credited: opt(C), bonus_cents: opt(C), open: opt(E(true)) } },
  upgrade: { pinned: true, fields: { upgrade: E('collection', 'farm', 'hens', 'eggValue'), newLevel: C, cost: MONEY, coinsBefore: C, track: opt(E('farm', 'hens', 'egg_value', 'collection')),
    is_first_upgrade: BOOL, taps_before: C, zero_gain: opt(BOOL) } },
  offline_grant: { pinned: false, fields: { secondsAway: F(0), eggs: F(0), away_bp: opt(C) } },
  goal_tap: { pinned: false, fields: { target: S(/^(?:[A-Z][A-Z0-9_]{0,15}|DONE)$/), state: TOKEN } },
  telemetry_budget_shrunk: { pinned: false, fields: { ringEff: I(200) } },
  // ---- coop / workers ----
  coop_full: { pinned: e => e.phase === 'end' || e.capped === true, capped: { counterKey: 'episodes' }, fields: { phase: E('start', 'end'), durationMs: opt(C),
    farm_level: opt(C), coop_cap: opt(C), coop_hand_state: opt(E(...WORKER_MOODS, 'none')), exit_reason: opt(E('tap', 'coop_hand', 'cap_upgrade', 'reload', 'hidden', 'other')), eggs_lost: opt(F(0)) } },
  coop_hand_tip: { pinned: false, fields: { phase: E('shown', 'tap'), farm: opt(C) } },
  worker_hire: { pinned: true, fields: { worker: WORKER, cost: MONEY, farm: C } },
  worker_manage: { pinned: true, fields: { worker: WORKER, energyBefore: PCT } },
  worker_manage_all: { pinned: true, fields: { workers: A(WORKER, WORKERS.length), energyBefore: A(PCT, WORKERS.length) } },
  worker_state: { pinned: false, fields: { worker: WORKER, state: MOOD } },
  worker_yawn: { pinned: false, fields: { worker_id: WORKER, energy_pct: F(0, 100, 0.1), farm_level: C } },
  worker_summary: { pinned: false, fields: { windowMs: C, coop_hand_eggs: opt(F(0)), market_hand_eggs: opt(C), market_hand_cents: opt(F(0)), open: opt(E(true)) },
    dynamicFields: [{ keyPattern: new RegExp(`^wage_(?:${alt(WORKERS)})_cents$`), spec: C },
      { keyPattern: new RegExp(`^wage_(?:${alt(WORKERS)})_asleep_cents$`), spec: C }] }, // D-HOE-22: clockWage = 1 only (emitter rule)
  worker_paused: { pinned: true, fields: { worker: WORKER, farm: C, energy_pct: PCT, mood: MOOD, unpaid: BOOL, ability_active: BOOL, golden_on_screen: BOOL, frenzy_active: BOOL } },
  worker_resumed: { pinned: true, fields: { worker: WORKER, farm: C, energy_pct: PCT, paused_duration_s: C, cause: E('manage', 'manual', 'auto_full') } },
  // ---- market / customers ----
  sell: { pinned: false, fields: { id: C, k: C, N: C, price: MONEY, value: MONEY, by: E('player', 'market_hand') } },
  customer_arrive: { pinned: false, fields: { id: C, N: C } },
  customer_served: { pinned: false, fields: { id: C, N: C, partial: BOOL } },
  customer_partial: { pinned: false, fields: { id: C, N: C, filled: C } },
  customer_lost: { pinned: false, fields: { reason: E('timeout', 'full_queue'), id: opt(C), N: opt(C) } },
  grader_tier: { pinned: false, fields: { tier: I(1), mult: F(0), cost: MONEY } },
  // ---- save / integrity ----
  save_corrupt: { pinned: false, fields: { reason: E('missing', 'empty', 'parse', 'wrong_type', 'version', 'missing_state', 'checksum', 'invalid_state'), had_backup: BOOL,
    restored_from_backup: BOOL, build: BUILD, copy_failed: opt(E(true)), recovered_from: E('bak', 'idb', 'v6_backup', 'none', 'deferred'), store: E('ls', 'idb'),
    tried: A(TOKEN, 8), restored_version: opt(I(1)), migrated: BOOL } },
  save_failed: { pinned: false, fields: { reason: ERRNAME } },
  save_reset: { pinned: true, fields: {} },
  save_newer_version: { pinned: false, fields: { version: I(1), build: BUILD, live: opt(E(true)) } },
  save_savedat_invalid: { pinned: false, fields: {} },
  save_restore: { pinned: false, fields: { source: E('idb') } },
  save_recovery_export: { pinned: false, fields: { case: E('R', 'F', 'Q', 'D') } },
  save_recovery_notice_shown: { pinned: false, fields: { notice: E('M1', 'M2', 'M3', 'M4', 'M5', 'storage', 'cantsave'), source: nul(E('bak', 'idb', 'v6_backup', 'none', 'deferred')),
    variant: opt(E('level', 'age', 'fallback')), store: nul(E('ls', 'idb')) } },
  save_recovery_notice_dismissed: { pinned: false, fields: {} }, // same fields, filled below
  tab_guard_blocked_write: { pinned: false, fields: {} },
  tab_guard_takeover: { pinned: false, fields: { reason: E('new_tab', 'stale', 'play_here') } },
  save_migrated: { pinned: true, fields: { from: I(1), to: I(1), migration: E('tracksV7_marker', 'breeds_sanitise'), refund_cents: C, farm_level: C,
    backup_stores: A(E('ls', 'idb'), 2), reason: opt(E('invalid_root', 'invalid_values')) } }, // D-HOE-21/-25 N-5: reason only on breeds_sanitise
  save_migration_aborted: { pinned: true, fields: { store: E('ls', 'idb'), reason: TOKEN, path: E('tracksV7_marker'), attempt_count: I(1), stuck_on_v6: opt(E(true)) } },
  save_backup_idb_unavailable: { pinned: true, fields: { reason: TOKEN, path: E('tracksV7_marker') } },
  // ---- onboarding / UI ----
  onboarding_step: { pinned: true, fields: { step: I(0), name: TOKEN, action: opt(E('shown', 'open', 'dismiss', 'done')), timeout: opt(E(true)) } },
  onboarding_skip: { pinned: true, fields: { atStep: I(0) } },
  onboarding_abandon: { pinned: true, fields: { atStep: I(0), reason: E('reload') } },
  ios_home_tip_shown: { pinned: false, fields: { browser: TOKEN } },
  ios_home_tip_dismissed: { pinned: false, fields: {} },
  zero_gain_confirm: { pinned: false, fields: { upgrade_id: E('collection', 'hens', 'eggValue'), outcome: E('confirm', 'cancel') } },
  // ---- M4 / M5.0 (V-2b) ----
  milestone_reached: { pinned: true, fields: { id: TOKEN, track: E('hens', 'egg_value'), level: I(1), mult: F(0) } },
  balanced_tier: { pinned: true, fields: { id: TOKEN, tier: I(1), min_level: C } },
  collectible_spawned: { pinned: false, fields: { collectible_id: I(1), skin: E('golden_egg', 'broody_hen'), farm_level: C, collection_level: C,
    slot_id: S(/^(?:S[1-8]|Y(?:[0-9]|1[01]))$/), layout: E('phone-360', 'phone-375', 'docked', 'docked-compact'), interval_s: C, deferred_ms: C, restored: opt(BOOL) } },
  collectible_collected: { pinned: false, fields: { collectible_id: I(1), skin: E('golden_egg', 'broody_hen'), reaction_ms: C, in_warning: BOOL,
    reward_type: E('cash', 'frenzy', 'eggs', 'eggs_cash', 'broody_cash'), reward_value: C, reward_duration_s: E(30, 0), farm_level: C, nest_fill_share: opt(F(0)) } },
  collectible_expired: { pinned: false, fields: { collectible_id: I(1), skin: E('golden_egg', 'broody_hen'), reason: E('timeout', 'offline', 'reload', 'takeover', 'reset'), farm_level: C } },
  frenzy_started: { pinned: false, fields: { collectible_id: I(1), mult: F(0), duration_s: C, farm_level: C, grader_tier: C } },
  frenzy_ended: { pinned: false, fields: { collectible_id: I(1), extra_coins: C, eggs_sold: C, sold_by_player: C, sold_by_workers: C, reason: E('timeout', 'reset') } },
  streak_started: { pinned: false, fields: { farm_level: C, collection_level: C } },
  streak_peak: { pinned: false, fields: { value: F(0), duration_s: F(0), credited_taps: C, time_at_cap_s: F(0), extra_coins: C, frenzy_overlap_s: F(0), reason: TOKEN, max_tier: I(0, 4) } },
  // ---- v5 rows #1-23 (errata V-2) ----
  sales_stall: { pinned: true, fields: { phase: E('shown', 'resolved'), stall_id: COUNTER, prev_stall_id: opt(COUNTER),
    cause: E('mh_asleep', 'mh_paused', 'mh_unpaid', 'no_mh', 'ch_asleep', 'ch_unpaid', 'other'), farm_level: C, queue_len: C, sellable_eggs: C, coop_eggs: C,
    mh_state: E('working', 'tired', 'asleep', 'unpaid', 'paused', 'none'), ch_state: E('working', 'tired', 'asleep', 'unpaid', 'paused', 'none'),
    focus_s_since_last_sale: S1, session_s: S1,
    resolved_by: opt(E('chip_refill', 'chip_sell_all', 'chip_collect', 'chip_manage', 'refill_elsewhere', 'sell_elsewhere', 'collect_elsewhere', 'auto_resume', 'queue_empty',
      'basket_empty', 'paused', 'focus_lost', 'cause_changed', 'none')), time_to_resolve_s: opt(S1), chip_tapped: opt(BOOL) } },
  fatigue_cue_shown: { pinned: true, fields: { ...FATIGUE_CUE_TAPPED_FIELDS, suppressed_by_stall: BOOL } },
  fatigue_cue_tapped: { pinned: true, fields: FATIGUE_CUE_TAPPED_FIELDS }, // rev. 13 #3: no suppressed_by_stall
  shift_sheet_opened: { pinned: true, fields: { entry: ENTRY, sheet_id: COUNTER, stall_id: opt(COUNTER) } },
  refill_used: { pinned: true, fields: { worker: WORKER, energy_pct: PCT, charges_left: C, rank_by_risk: C, by: E('manual', 'auto'), sheet_id: nul(COUNTER), entry_point: ENTRY_POINT,
    stall_id: opt(COUNTER), refillable_n: C, best_worker: WORKER, lowest_worker: WORKER } },
  rest_toggled: { pinned: true, fields: { worker: WORKER, on: BOOL, energy_pct: PCT, state: E('active', 'paused', 'resting'), cause: E('manual', 'auto_full', 'manage'), // D-HOE-33
    sheet_id: nul(COUNTER), entry_point: ENTRY_POINT, stall_id: opt(COUNTER),
    farm: opt(C), mood: opt(MOOD), unpaid: opt(BOOL), ability_active: opt(BOOL), golden_on_screen: opt(BOOL), frenzy_active: opt(BOOL), paused_duration_s: opt(C) } },
  first_worker_hired: { pinned: true, fields: { worker: WORKER, farm_level: I(1), t_since_unlock_s: opt(C), via_nudge: BOOL } },
  autorefill_toggled: { pinned: true, fields: { worker: WORKER, on: BOOL, farm_level: C } },
  abilities_unlocked: { pinned: true, fields: { farm: C, hired: A(WORKER, WORKERS.length) } },
  ability_used: { pinned: true, fields: { worker: WORKER, farm: C, energy_pct: PCT, mood: MOOD, via_all: BOOL, t_since_ready_s: C, in_sheet: BOOL, combo: BOOL } },
  ability_blocked: { pinned: true, capped: { counterKey: 'events' }, fields: { worker: WORKER, reason: E('cooldown', 'asleep', 'unpaid', 'paused', 'lockout'), count: I(1) } },
  ability_ended: { pinned: true, fields: { worker: WORKER, cause: E('expired', 'paused', 'offline', 'asleep', 'unpaid'), effect_s: F(0) } },
  tip_shown: { pinned: e => e.id === 'clock_wage', fields: { id: E('clock_wage') } },
  hatch_started: { pinned: true, fields: { breed_id: BREED, rarity: RARITY, cost: C, coinsBefore: C, pity_before: C, free: BOOL, farm_level: C } },
  breed_revealed: { pinned: false, fields: { breed_id: BREED, rarity: RARITY, dupe: BOOL, stars_after: I(0, 2), offline: BOOL, wait_ms: C } },
  breed_slotted: { pinned: false, fields: { slot: I(0, 2), prev_slot: nul(I(0, 2)), breed_id: nul(BREED), prev_breed_id: nul(BREED), cause: E('manual', 'auto_reveal', 'move'),
    loadout: LOADOUT, settling: I(0, 3), count: I(1) } },
  flock_complete: { pinned: true, fields: { hatches: I(1), farm_level: C, elapsed_since_unlock_s: C, backfilled: BOOL } },
  best_buy_shown: { pinned: false, fields: { key: BUY_KEY, meaningful: BOOL, affordable: BOOL, payback_s: nul(S1), farm: C, eta_s: nul(S1) } },
  best_buy_followed: { pinned: false, fields: { key: BUY_KEY, ms_since_shown: C } },
  zero_gain_purchase: { pinned: true, fields: { key: ZG_KEY, farm: C, level: C, meaningful_eta_s: S1 } }, // D-HOE-32 M-2 / rev. 13: cap 50, NO marker; overflow -> session_end.zero_gain_purchase_dropped
  dead_zone: { pinned: true, fields: { farm: I(10, 29), s: F(BBV2.dead_zone_min_s, undefined, 0.1), reason: E('none_affordable'), open: opt(BOOL) } }, // rev. 13 #22 / V-2d
  best_buy_suppressed_zero_gain: { pinned: false, fields: { key: ZG_KEY, farm: C, level: C } },
};
SCHEMA.save_recovery_notice_dismissed = { pinned: false, fields: SCHEMA.save_recovery_notice_shown.fields };

const deepFreeze = <T>(o: T): T => { if (o && typeof o === 'object' && !(o instanceof RegExp) && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v); } return o; };
export const EVENT_SCHEMA: Readonly<Record<string, Readonly<EventSpec>>> = deepFreeze(SCHEMA);
export const EVENT_TYPES: readonly string[] = Object.freeze(Object.keys(EVENT_SCHEMA));
const ENVELOPE: Readonly<Record<string, FieldSpec>> = { ts: C, sid: S(/^[0-9a-z]{6}$/), fgMs: C };

// ---- validation ------------------------------------------------------------------------------------------------------
function checkField(path: string, v: unknown, f: FieldSpec, out: string[]): void {
  if (v === undefined) { if (!f.optional) out.push(`${path}: required`); return; }
  if (v === null) { if (!f.nullable) out.push(`${path}: null`); return; }
  const bad = (why: string) => out.push(`${path}: ${why}`);
  switch (f.kind) {
    case 'enum': case 'bucket': if (!(f.values as readonly unknown[]).includes(v)) bad(`not in ${f.kind}`); return;
    case 'bool': if (typeof v !== 'boolean') bad('not bool'); return;
    case 'count': if (!Number.isInteger(v) || (v as number) < 0) bad('not count'); return;
    case 'int': if (!Number.isInteger(v)) { bad('not int'); return; }
      if ((f.min !== undefined && (v as number) < f.min) || (f.max !== undefined && (v as number) > f.max)) bad('out of range'); return;
    case 'float': { if (typeof v !== 'number' || !Number.isFinite(v)) { bad('not float'); return; }
      if ((f.min !== undefined && v < f.min) || (f.max !== undefined && v > f.max)) { bad('out of range'); return; }
      if (f.step !== undefined && Math.abs(v / f.step - Math.round(v / f.step)) > 1e-6) bad(`not a multiple of ${f.step}`); return; }
    case 'str': if (typeof v !== 'string' || !f.pattern.test(v)) bad('pattern'); return;
    case 'arr': if (!Array.isArray(v)) { bad('not array'); return; } if (v.length > f.maxLen) { bad('too long'); return; }
      v.forEach((x, i) => checkField(`${path}[${i}]`, x, f.of, out)); return;
    case 'obj': if (typeof v !== 'object' || Array.isArray(v)) { bad('not object'); return; }
      checkRecord(path, v as Record<string, unknown>, f.fields, f.dynamicFields, out); return;
  }
}
function checkRecord(path: string, o: Record<string, unknown>, fields: Readonly<Record<string, FieldSpec>>, dyn: readonly DynamicField[] | undefined, out: string[], skip: readonly string[] = []) {
  for (const [k, f] of Object.entries(fields)) checkField(`${path}.${k}`, o[k], f, out);
  for (const [k, v] of Object.entries(o)) { if (k in fields || skip.includes(k)) continue;
    const d = dyn?.find(x => x.keyPattern.test(k)); if (d) checkField(`${path}.${k}`, v, d.spec, out); else out.push(`${path}.${k}: unknown field`); }
}
const fatigueSum = (t: string, e: TEvent, out: string[]) => { const n = [e.n_tired, e.n_asleep, e.n_paused];
  if (n.every(Number.isInteger) && (n as number[]).reduce((a, x) => a + x, 0) > 4) out.push(`${t}: n_tired + n_asleep + n_paused > 4`); };
/** Cross-field rules from the errata rows (the FieldSpec kinds can't say "iff"). */
const RULES: Readonly<Record<string, (e: TEvent, out: string[]) => void>> = {
  shift_sheet_opened: (e, out) => { if ((e.stall_id !== undefined) !== (e.entry === 'stall_chip')) out.push('shift_sheet_opened.stall_id: present iff entry stall_chip'); },
  refill_used: (e, out) => { if (e.sheet_id === null && e.by !== 'auto') out.push('refill_used.sheet_id: null only for by:auto');
    if (e.stall_id !== undefined && e.entry_point !== 'stall_chip') out.push('refill_used.stall_id: only with entry_point stall_chip'); },
  rest_toggled: (e, out) => {
    if (e.sheet_id === null && e.cause !== 'auto_full') out.push('rest_toggled.sheet_id: null only for cause auto_full');
    if (e.stall_id !== undefined && e.entry_point !== 'stall_chip') out.push('rest_toggled.stall_id: only with entry_point stall_chip');
    if (e.on === true) { for (const k of ON_TRUE) if (e[k] === undefined) out.push(`rest_toggled.${k}: required with on:true`);
      if (e.paused_duration_s !== undefined) out.push('rest_toggled.paused_duration_s: only with on:false'); }
    if (e.on === false) { if (e.paused_duration_s === undefined) out.push('rest_toggled.paused_duration_s: required with on:false');
      for (const k of ON_TRUE) if (e[k] !== undefined) out.push(`rest_toggled.${k}: only with on:true`); }
  },
  sales_stall: (e, out) => { for (const k of ['resolved_by', 'time_to_resolve_s', 'chip_tapped']) {
    if (e.phase === 'resolved' && e[k] === undefined) out.push(`sales_stall.${k}: required with phase resolved`);
    if (e.phase === 'shown' && e[k] !== undefined) out.push(`sales_stall.${k}: only with phase resolved`); } },
  fatigue_cue_shown: (e, out) => fatigueSum('fatigue_cue_shown', e, out),
  fatigue_cue_tapped: (e, out) => fatigueSum('fatigue_cue_tapped', e, out),
  dead_zone: (e, out) => { if (e.open === false) out.push('dead_zone.open: present only as open:true'); },
  ability_used: (e, out) => { if (e.combo === true && e.in_sheet === false) out.push('ability_used.combo: true only with in_sheet'); },
  session_summary: (e, out) => { const c = e.counts; if (c && typeof c === 'object') for (const k of Object.keys(c)) if (!(k in EVENT_SCHEMA)) out.push(`session_summary.counts.${k}: unknown event`); },
};

/** Errors for one exported event; [] = valid. A stored pre-0.6.2 event tagged legacy:true is not validated (errata V-0). */
export function validateEvent(e: TEvent): string[] {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return ['event: not an object'];
  if ((e as { legacy?: unknown }).legacy === true) return [];
  const t = e.type; if (typeof t !== 'string') return ['type: required'];
  const spec = EVENT_SCHEMA[t]; if (!spec) return [`${t}: unknown event`];
  const out: string[] = [];
  for (const [k, f] of Object.entries(ENVELOPE)) if (!(k in spec.fields)) checkField(`${t}.${k}`, e[k], f, out);
  const env = ['type', ...Object.keys(ENVELOPE)];
  if (spec.capped && e.capped === true) checkRecord(t, e, { capped: E(true), [spec.capped.counterKey]: C }, undefined, out, env);
  else { checkRecord(t, e, spec.fields, spec.dynamicFields, out, env); RULES[t]?.(e, out); }
  return out;
}
/** §3.2 + errata V-3, event-based (D-HOE-19 F-10): tip_shown{id:'clock_wage'} and coop_full end/capped pin; unknown types don't. */
export function isPinned(e: TEvent): boolean {
  const p = EVENT_SCHEMA[e.type]?.pinned; return typeof p === 'function' ? p(e) : p === true;
}
