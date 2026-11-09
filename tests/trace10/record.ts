// trace10 stream records S1-S4 (design §5, §6.2, §7). Every record is a positional JSON array (fixed field order):
// [tag, seed, tick i, ...]. Body lines are canonical JSON (encode.ts) + "\n". Footer: ["END", stream, n, seeds[], sha256(body)].
import type { GameState } from '../../src/sim/state';
import type { SimEvent } from '../../src/sim/events';
import type { WorkerId } from '../../src/sim/workers';
import { canon, canonValue, sha256 } from './encode';

export type StreamId = 's1' | 's2' | 's3' | 's4';
export const STREAMS: readonly StreamId[] = ['s1', 's2', 's3', 's4'];
export const STREAM_FILE: Record<StreamId, string> = { s1: 's1-ticks.jsonl', s2: 's2-events.jsonl', s3: 's3-state.jsonl', s4: 's4-rng.jsonl' };
export const STREAM_TAG: Record<StreamId, string> = { s1: 'T', s2: 'E', s3: 'S', s4: 'R' };
/** WIDS order of tests/bot-m5.ts L38 (§6.2 field 9). */
export const WIDS: readonly WorkerId[] = ['market_hand', 'coop_hand', 'hawker', 'grader'];
/** Field indices inside an S record: ["S", seed, i, seq, at, digestHex, ...fields 0-18]. */
export const S_FIELD0 = 6, S_FARM = S_FIELD0 + 1;

export type Rec = unknown[];
/** Serialise one record; reports non-finite numbers through `onNonFinite` (producer -> INVALID). */
export const line = (r: Rec, onNonFinite?: (v: number) => void) => canon(r, onNonFinite) + '\n';

// ---- S1 ----
export const tickRec = (seed: number, i: number, t: number): Rec => ['T', seed, i, t];

// ---- S2 ----
/** S2 fields for a SimEvent (§5.1). Unknown kinds: the whole event, canonical sorted keys - recorded, never dropped. */
export function simEventFields(e: SimEvent): [string, ...unknown[]] {
  const x = e as any;
  switch (e.type) {
    case 'sell': return ['sell', e.id, e.k, e.N, e.price, e.value, e.by];
    case 'collect': return ['collect', e.eggs, x.credited ?? null, x.bonus_cents ?? null];
    case 'worker_collect': return ['worker_collect', e.eggs];
    case 'worker_state': return ['worker_state', e.worker, e.state];
    case 'worker_yawn': return ['worker_yawn', e.worker_id, e.energy_pct, e.farm_level];
    case 'wage': return ['wage', e.worker, e.cents];
    case 'customer_arrive': return ['customer_arrive', e.id, e.N];
    case 'customer_served': return ['customer_served', e.id, e.N, e.partial];
    case 'customer_partial': return ['customer_partial', e.id, e.N, e.filled];
    case 'customer_lost': return ['customer_lost', e.reason, x.id ?? null, x.N ?? null];
    default: return ['other:' + e.type, canonValue(e)];
  }
}
export const eventRec = (seed: number, i: number, seq: number, f: readonly unknown[]): Rec => ['E', seed, i, seq, ...f];

// ---- S3 (§6.2) ----
const workerTuple = (s: GameState, id: WorkerId) => { const w = s.workers[id]; return w ? [w.energy, w.cdS, w.unpaid ?? null, w.paused ?? null, w.callLockoutS ?? null] : null; };
/** Fields 0-18 in the fixed §6.2 order (18 = sfull, sha256 of the canonical ENTIRE state, sorted keys: no key escapes). */
export function stateFields(s: GameState, onNonFinite?: (v: number) => void): unknown[] {
  const a = s as any;
  return [s.coinsCents, s.farmLevel, s.collectionLevel, s.hensLevel, s.eggValueLevel, s.coop, s.basket, s.graderTier, s.manageCdS,
    WIDS.map(id => workerTuple(s, id)), [s.wageFracCents.market_hand ?? null, s.wageFracCents.coop_hand ?? null],
    s.customers.map(c => [c.id, c.demand, c.filled, c.waitedS]), s.nextCustomerInS, s.nextCustomerId, s.coopFullS,
    s.rng, a.evRngState ?? null, a.brRngState ?? null, sha256(canon(s, onNonFinite))];
}
export function stateRec(seed: number, i: number, seq: number, at: string, s: GameState, onNonFinite?: (v: number) => void): Rec {
  const f = stateFields(s, onNonFinite); return ['S', seed, i, seq, at, sha256(canon(f, onNonFinite)), ...f];
}

// ---- S4 (§7) ----
export const RNG_SOURCES = ['engine', 'ev', 'br', 'runner', 'variance', 'breeds-hatch'] as const;
export const rngRec = (seed: number, i: number, seq: number, source: string, ...f: unknown[]): Rec => ['R', seed, i, seq, source, ...f];

// ---- footers ----
export const footerRec = (stream: StreamId, bodyLines: readonly string[], seeds: readonly number[]): Rec =>
  ['END', stream, bodyLines.length, [...seeds].sort((x, y) => x - y), sha256(bodyLines.join(''))];
