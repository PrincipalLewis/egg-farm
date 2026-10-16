import type { WorkerId, WorkerMood } from './workers';
/** Events the pure sim reports to an optional sink (telemetry lives outside the sim). */
export type SimEvent =
  | { type: 'customer_arrive'; id: number; N: number }
  | { type: 'customer_served'; id: number; N: number; partial: boolean }
  | { type: 'customer_partial'; id: number; N: number; filled: number }
  | { type: 'customer_lost'; reason: 'timeout' | 'full_queue'; id?: number; N?: number }
  | { type: 'sell'; id: number; k: number; N: number; price: number; value: number; by: 'player' | 'market_hand' }
  | { type: 'upgrade'; upgrade: 'collection' | 'farm' | 'hens' | 'eggValue'; newLevel: number; cost: number; coinsBefore: number; track?: 'farm' | 'hens' | 'egg_value' | 'collection' }
  | { type: 'collect'; eggs: number }
  | { type: 'worker_collect'; eggs: number }
  | { type: 'worker_hire'; worker: WorkerId; cost: number; farm: number }
  | { type: 'worker_manage'; worker: WorkerId; energyBefore: number }
  | { type: 'worker_manage_all'; workers: WorkerId[]; energyBefore: number[] } // one tap = one Manage action (AC-W5)
  | { type: 'worker_state'; worker: WorkerId; state: WorkerMood }
  | { type: 'worker_yawn'; worker_id: WorkerId; energy_pct: number; farm_level: number } // once per entry into Yawning (<= yawn_at_pct)
  | { type: 'wage'; worker: WorkerId; cents: number }
  | { type: 'grader_tier'; tier: number; mult: number; cost: number }
  | { type: 'milestone_reached'; id: string; track: 'hens' | 'egg_value'; level: number; mult: number }
  | { type: 'balanced_tier'; id: string; tier: number; min_level: number };
export type Sink = SimEvent[] | undefined;
