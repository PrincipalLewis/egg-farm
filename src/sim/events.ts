/** Events the pure sim reports to an optional sink (telemetry lives outside the sim). */
export type SimEvent =
  | { type: 'customer_arrive'; id: number; N: number }
  | { type: 'customer_served'; id: number; N: number; partial: boolean }
  | { type: 'customer_lost'; reason: 'timeout' | 'full_queue'; id?: number; N?: number; filled?: number }
  | { type: 'sell'; id: number; k: number; N: number; price: number }
  | { type: 'upgrade'; upgrade: 'collection' | 'farm'; newLevel: number; cost: number; coinsBefore: number }
  | { type: 'collect'; eggs: number };
export type Sink = SimEvent[] | undefined;
