import type { WorkerId, WorkerMood } from './workers';
/** Events the pure sim reports to an optional sink (telemetry lives outside the sim). */
export type SimEvent =
  | { type: 'save_migrated'; migration: 'breeds_sanitise'; from: 6; to: 6 } // M5.1 breeds E12 (BR-AC26)
  | { type: 'customer_arrive'; id: number; N: number }
  | { type: 'customer_served'; id: number; N: number; partial: boolean }
  | { type: 'customer_partial'; id: number; N: number; filled: number }
  | { type: 'customer_lost'; reason: 'timeout' | 'full_queue'; id?: number; N?: number }
  | { type: 'sell'; id: number; k: number; N: number; price: number; value: number; by: 'player' | 'market_hand' }
  | { type: 'upgrade'; upgrade: 'collection' | 'farm' | 'hens' | 'eggValue'; newLevel: number; cost: number; coinsBefore: number; track?: 'farm' | 'hens' | 'egg_value' | 'collection' }
  | { type: 'collect'; eggs: number; credited?: boolean; bonus_cents?: number } // M5: credited/bonus_cents only with m4.flags.streak/tapCoins
  | { type: 'worker_collect'; eggs: number }
  | { type: 'worker_hire'; worker: WorkerId; cost: number; farm: number }
  | { type: 'worker_manage'; worker: WorkerId; energyBefore: number }
  | { type: 'worker_manage_all'; workers: WorkerId[]; energyBefore: number[] } // one tap = one Manage action (AC-W5)
  | { type: 'worker_state'; worker: WorkerId; state: WorkerMood }
  | { type: 'worker_yawn'; worker_id: WorkerId; energy_pct: number; farm_level: number } // once per entry into Yawning (<= yawn_at_pct)
  | { type: 'wage'; worker: WorkerId; cents: number }
  | { type: 'grader_tier'; tier: number; mult: number; cost: number }
  | { type: 'milestone_reached'; id: string; track: 'hens' | 'egg_value'; level: number; mult: number }
  | { type: 'balanced_tier'; id: string; tier: number; min_level: number }
  | M5SimEvent;
/** M5.0 sim events (F1(d)); emitted only with their m4.flags.* on. Field names follow telemetry-spec v0.6.2 as quoted in the
 *  feature specs. Game adds the UI-only fields when forwarding to telemetry: `collectible_id` (per-session counter shared by
 *  golden egg and Broody), `layout`, and for Broody `slot_id` Y0..Y11 / `restored`. */
export type CollectibleSkin = 'golden_egg' | 'broody_hen';
export type GoldenReward = 'cash' | 'frenzy' | 'eggs' | 'eggs_cash';
export type AbilityEndCause = 'expired' | 'paused' | 'offline' | 'asleep' | 'unpaid'; // final (sizing §13 AB-1)
export type AbilityBlockReason = 'cooldown' | 'asleep' | 'unpaid' | 'paused' | 'lockout';
export type M5SimEvent =
  | { type: 'collectible_spawned'; skin: CollectibleSkin; farm_level: number; collection_level: number; slot_id: string; interval_s: number; deferred_ms: number }
  | { type: 'collectible_collected'; skin: CollectibleSkin; reaction_ms: number; in_warning: boolean; reward_type: GoldenReward | 'broody_cash'; reward_value: number; reward_duration_s: number; farm_level: number; nest_fill_share?: number }
  | { type: 'collectible_expired'; skin: CollectibleSkin; reason: 'timeout' | 'offline' | 'reload' | 'takeover' | 'reset'; farm_level: number }
  | { type: 'frenzy_started'; mult: number; duration_s: number; farm_level: number; grader_tier: number }
  | { type: 'frenzy_ended'; extra_coins: number; eggs_sold: number; sold_by_player: number; sold_by_workers: number; reason: 'timeout' | 'reset' }
  | { type: 'streak_started'; farm_level: number; collection_level: number }
  | { type: 'streak_peak'; value: number; duration_s: number; credited_taps: number; time_at_cap_s: number; extra_coins: number; frenzy_overlap_s: number; reason: string; max_tier: number }
  | { type: 'abilities_unlocked'; farm: number; hired: WorkerId[] }
  | { type: 'ability_used'; worker: WorkerId; farm: number; energy_pct: number; mood: WorkerMood; via_all: boolean; t_since_ready_s: number; in_sheet: boolean }
  | { type: 'ability_blocked'; worker: WorkerId; reason: AbilityBlockReason; count: number }
  | { type: 'ability_ended'; worker: WorkerId; cause: AbilityEndCause; effect_s: number };
export type Sink = SimEvent[] | undefined;
