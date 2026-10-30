/**
 * M5.1 breeds state, load sanitising and the offline settle (PR A; tick, hatch and the QA hook are PR B).
 * Spec: product/m5.1-breeds-spec.md rev 3.8.6 (13d5255e) §4.2 BR-R8/R9/R11, §4.7 BR-R18, §4.8 E10-E12, §6.
 * Tick semantics: engineering/reviews/v5-breeds-tick-semantics.md (points 1-4, Q1/Q2/Q4 proposals).
 * Code isolation (§6): every function returns its input unchanged when m4.flags.breeds is off or `breeds` is absent,
 * so a flag-off build never writes, clears or changes breeds data (E11; D-HOE-20261030-10).
 */
import type { Balance } from '../config/balance';
import { flagOn } from '../config/flags';
import { BREED_IDS, BREEDS_RNG_SALT, BREEDS_SANITISE_EVENT, SLOT_IDX, bc, isBreedId, unlockedSlots, type BreedId } from '../config/breeds';
import { mixSeed, type GameState } from './state';
import { isRngState } from './rng';
import type { SimEvent } from './events';
export interface BreedsSave {
  owned: Partial<Record<string, { stars: number }>>; slots: (string | null)[];
  incubator: { breed: string; remainingMs: number; costCents: number } | null;
  settleMs: [number, number, number]; hatches: number; pity: number; rng: number; freeHatchUsed: 0 | 1; flockCompleteLogged: 0 | 1;
  sinceUnlockMs?: number; sinceUnlockBackfilled?: 0 | 1;
}
const on = (s: GameState, b: Balance) => flagOn(b, 'breeds') && !!s.breeds;
const int0 = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : 0);
/** Q2 (tick-semantics note; HoE may re-rule): `breeds` is created at the END of the first flag-on tick (TIMER_SYSTEMS,
 *  like seedEvRng / Q-F1b-1), never at load. §6 migration shape; backfilled = 1 when created at F >= bc_unlock_farm (BR-AC2e). */
export function ensureBreeds(s: GameState, b: Balance): GameState {
  if (!flagOn(b, 'breeds') || 'breeds' in s) return s;
  const br: BreedsSave = { owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0], flockCompleteLogged: 0,
    hatches: 0, pity: 0, rng: mixSeed((s.rng ^ BREEDS_RNG_SALT) >>> 0), freeHatchUsed: 0 };
  if (s.farmLevel >= bc(b, 'unlock_farm')) br.sinceUnlockBackfilled = 1;
  return { ...s, breeds: br };
}
export const isFlockComplete = (br: BreedsSave, b: Balance) => BREED_IDS.every(id => (br.owned[id]?.stars ?? -1) >= bc(b, 'star_cap'));
/** BR-R11 reveal + auto-slot, ONE pure function for step (PR B) and applyOffline. New -> 0★, duplicate -> +1★; first empty
 *  UNLOCKED slot gets it with a full settle. Q4: `slotsOpen` is the slot count at the START of the frame (PR B passes it);
 *  a slot unlocked in the same frame is never auto-filled. Offline the Farm level can't change, so it's unlockedSlots(F). */
export function revealHatch(br: BreedsSave, b: Balance, slotsOpen: number): { br: BreedsSave; revealed: BreedId | null } {
  const inc = br.incubator; if (!inc || inc.remainingMs > 0 || !isBreedId(inc.breed)) return { br, revealed: null };
  const id = inc.breed, prev = br.owned[id];
  const owned = { ...br.owned, [id]: { stars: prev ? Math.min(bc(b, 'star_cap'), prev.stars + 1) : 0 } };
  const slots = [...br.slots], settleMs = [...br.settleMs] as BreedsSave['settleMs'];
  if (!slots.includes(id)) { const i = slots.findIndex((x, k) => x === null && k < slotsOpen); if (i >= 0) { slots[i] = id; settleMs[i] = bc(b, 'settle_s') * 1000; } }
  return { br: { ...br, owned, slots, settleMs, incubator: null }, revealed: id };
}
/** BR-R18: closed-form offline settle, called ONLY from applyOffline (once per gap: the caller re-stamps savedAt / the hide
 *  snapshot; an invalid savedAt never reaches here). `awayMs` is capped to offlineCapSeconds like the egg grant; gaps under
 *  offlineMinSeconds do nothing. settleMs does NOT run offline (BR-R4). sinceUnlockMs (telemetry only) gets the same capped ms
 *  from unlock until flock_complete freezes it. No rng draw. */
export function breedsOffline(s: GameState, awayMs: number, b: Balance): { state: GameState; reveal: BreedId | null } {
  const o = b.offline;
  if (!on(s, b) || !Number.isFinite(awayMs) || awayMs < o.offlineMinSeconds * 1000) return { state: s, reveal: null };
  const ms = Math.floor(Math.min(awayMs, o.offlineCapSeconds * 1000)), br0 = s.breeds as BreedsSave;
  let br: BreedsSave = br0, reveal: BreedId | null = null;
  if (br.incubator) { br = { ...br, incubator: { ...br.incubator, remainingMs: Math.max(0, br.incubator.remainingMs - ms) } };
    const r = revealHatch(br, b, unlockedSlots(s.farmLevel, b)); br = r.br; reveal = r.revealed; }
  if (s.farmLevel >= bc(b, 'unlock_farm') && br.flockCompleteLogged !== 1) br = { ...br, sinceUnlockMs: int0(br.sinceUnlockMs) + ms };
  return br === br0 ? { state: s, reveal } : { state: { ...s, breeds: br }, reveal };
}
/** §4.8 E10-E12 on load (flag on only). Unknown owned ids are kept and ignored (E10); one save_migrated if anything changed. */
export function sanitizeBreedsOnLoad(s: GameState, b: Balance, ev: SimEvent[]): GameState {
  if (!on(s, b)) return s;
  const br0: any = s.breeds, cap = bc(b, 'star_cap'), maxMs = bc(b, 'hatch_time_s') * 1000, open = unlockedSlots(s.farmLevel, b);
  if (typeof br0 !== 'object' || Array.isArray(br0)) return s; // not ours to repair: ignored like an unknown key
  const owned: any = {};
  for (const [k, v] of Object.entries(br0.owned ?? {})) {
    const st = (v as any)?.stars; owned[k] = isBreedId(k) ? { stars: Number.isFinite(st) ? Math.min(cap, Math.max(0, Math.floor(st))) : 0 } : v; }
  const seen = new Set<string>(), slots = SLOT_IDX.map(i => { const x = br0.slots?.[i];
    if (!isBreedId(x) || i >= open || seen.has(x)) return null; seen.add(x); return x; });
  let incubator = br0.incubator ?? null, coinsCents = s.coinsCents;
  if (incubator && !isBreedId(incubator.breed)) { coinsCents += int0(incubator.costCents); incubator = null; }
  else if (incubator) { const r = incubator.remainingMs;
    incubator = { ...incubator, remainingMs: Number.isFinite(r) ? Math.min(maxMs, Math.max(0, Math.round(r))) : maxMs }; }
  const settleMs = SLOT_IDX.map(i => Math.min(bc(b, 'settle_s') * 1000, int0(br0.settleMs?.[i]))) as BreedsSave['settleMs'];
  const br: any = { ...br0, owned, slots, incubator, settleMs };
  if ('sinceUnlockMs' in br0 && int0(br0.sinceUnlockMs) !== br0.sinceUnlockMs) br.sinceUnlockMs = 0; // under-reports, never over
  for (const k of ['hatches', 'pity'] as const) if (int0(br0[k]) !== br0[k]) br[k] = int0(br0[k]);
  if (br0.freeHatchUsed !== 0 && br0.freeHatchUsed !== 1) br.freeHatchUsed = br0.hatches > 0 ? 1 : 0;
  if (!isRngState(br0.rng)) br.rng = mixSeed((s.rng ^ BREEDS_RNG_SALT) >>> 0); // only future rolls; a running hatch keeps its breed (BR-R9)
  if (br0.flockCompleteLogged !== 0 && br0.flockCompleteLogged !== 1) br.flockCompleteLogged = isFlockComplete(br, b) ? 1 : 0;
  if ('sinceUnlockBackfilled' in br0 && br0.sinceUnlockBackfilled !== 0 && br0.sinceUnlockBackfilled !== 1) br.sinceUnlockBackfilled = 1;
  if (JSON.stringify(br) === JSON.stringify(br0) && coinsCents === s.coinsCents) return s;
  ev.push({ ...BREEDS_SANITISE_EVENT });
  return { ...s, breeds: br, coinsCents };
}
