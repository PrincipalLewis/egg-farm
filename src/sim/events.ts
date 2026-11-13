import type { WorkerId, WorkerMood } from './workers';
import type { BreedId } from '../config/breeds';
/** Events the pure sim reports to an optional sink (telemetry lives outside the sim). */
export type SimEvent =
  | { type: 'save_migrated'; migration: 'breeds_sanitise'; from: 6; to: 6; reason: 'invalid_root' | 'invalid_values'; refund_cents: number; farm_level: number; backup_stores: [] } // M5.1 breeds E12 / D1 (BR-AC26)
  | { type: 'customer_arrive'; id: number; N: number }
  | { type: 'customer_served'; id: number; N: number; partial: boolean }
  | { type: 'customer_partial'; id: number; N: number; filled: number }
  | { type: 'customer_lost'; reason: 'timeout' | 'full_queue'; id?: number; N?: number }
  | { type: 'sell'; id: number; k: number; N: number; price: number; value: number; by: 'player' | 'market_hand' }
  | { type: 'upgrade'; upgrade: 'collection' | 'farm' | 'hens' | 'eggValue'; newLevel: number; cost: number; coinsBefore: number; track?: 'farm' | 'hens' | 'egg_value' | 'collection' }
  | { type: 'collect'; eggs: number; credited?: boolean; bonus_cents?: number } // M5: credited with m4.flags.streak or tapCoins; bonus_cents only on a credited tap with tapCoins (#3)
  | { type: 'worker_collect'; eggs: number }
  | { type: 'worker_hire'; worker: WorkerId; cost: number; farm: number }
  | { type: 'worker_manage'; worker: WorkerId; energyBefore: number }
  | { type: 'worker_manage_all'; workers: WorkerId[]; energyBefore: number[] } // one tap = one Manage action (AC-W5)
  | { type: 'worker_state'; worker: WorkerId; state: WorkerMood }
  /** Pause §12 (v1.3.18): emitted only by sim/pause.ts pauseWorker, only with pause = 1 and rc2Refill = 0 (exclusive emission);
   *  every field but energy_pct is sampled from the pre-pause state (pauseToggleFields). */
  | { type: 'worker_paused'; worker: WorkerId; farm: number; energy_pct: number; mood: WorkerMood; unpaid: boolean; ability_active: boolean; golden_on_screen: boolean; frenzy_active: boolean }
  | { type: 'worker_yawn'; worker_id: WorkerId; energy_pct: number; farm_level: number } // once per entry into Yawning (<= yawn_at_pct)
  | { type: 'wage'; worker: WorkerId; cents: number }
  | { type: 'grader_tier'; tier: number; mult: number; cost: number }
  | { type: 'milestone_reached'; id: string; track: 'hens' | 'egg_value'; level: number; mult: number }
  | { type: 'balanced_tier'; id: string; tier: number; min_level: number }
  | M5SimEvent
  | BreedsSimEvent
  | SalesStallEvent;
/** M5.1 breeds §8 telemetry (rev 3.8.9 ea922eb8 L692-695; errata rev 15 5e12a591 #15-18). Emitted only with m4.flags.breeds on. */
export type BreedRarityName = 'Common' | 'Rare' | 'Epic' | 'Legendary';
export type BreedsSimEvent =
  | { type: 'hatch_started'; breed_id: BreedId; rarity: BreedRarityName; cost: number; coinsBefore: number; pity_before: number; free: boolean; farm_level: number }
  | { type: 'breed_revealed'; breed_id: BreedId; rarity: BreedRarityName; dupe: boolean; stars_after: number; offline: boolean; wait_ms: number }
  | { type: 'breed_slotted'; slot: number; prev_slot: number | null; breed_id: BreedId | null; prev_breed_id: BreedId | null; cause: 'manual' | 'auto_reveal' | 'move'; loadout: string; settling: number; count: number }
  | { type: 'flock_complete'; hatches: number; farm_level: number; elapsed_since_unlock_s: number; backfilled: boolean };
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
  | { type: 'ability_used'; worker: WorkerId; farm: number; energy_pct: number; mood: WorkerMood; via_all: boolean; t_since_ready_s: number; in_sheet: boolean; combo: boolean }
  | { type: 'ability_blocked'; worker: WorkerId; reason: AbilityBlockReason; count: number }
  | { type: 'ability_ended'; worker: WorkerId; cause: AbilityEndCause; effect_s: number }
  /** Pause §12 (v1.3.16 471fb534): emitted only by sim/pause.ts resumeWorker, only with pause = 1 and rc2Refill = 0 (exclusive emission).
   *  paused_duration_s: integer floor >= 0 of sim seconds paused (D-PMW-2026-11-10-02, QA-D-1110-PAUDUR). */
  | { type: 'worker_resumed'; worker: WorkerId; farm: number; energy_pct: number; paused_duration_s: number; cause: 'manual' | 'manage' };
/** Saves risk-helpers (sales-stopped-spec §8; econ/stall.ts): emitted only with m4.flags.salesStopped on. Fields = schema.ts rows. */
type StallTag = import('../econ/stall').WorkerStateTag;
export type SalesStallEvent =
  | { type: 'sales_stall'; phase: 'shown' | 'resolved'; stall_id: number; prev_stall_id?: number; cause: import('../econ/stall').StallCause; farm_level: number; queue_len: number; sellable_eggs: number; coop_eggs: number; mh_state: StallTag; ch_state: StallTag; focus_s_since_last_sale: number; session_s: number; resolved_by?: import('../econ/stall').StallResolvedBy; time_to_resolve_s?: number; chip_tapped?: boolean }
  | { type: 'fatigue_cue_shown'; surface: import('../econ/stall').FatigueSurface; loss_per_s: number; loss_share: number; n_tired: number; n_asleep: number; n_paused: number; suppressed_by_stall: boolean }
  | { type: 'fatigue_cue_tapped'; surface: import('../econ/stall').FatigueSurface; loss_per_s: number; loss_share: number; n_tired: number; n_asleep: number; n_paused: number };
export type Sink = SimEvent[] | undefined;
