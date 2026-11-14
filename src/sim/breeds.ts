/**
 * M5.1 breeds state, load sanitising and the offline settle (PR A; tick, hatch and the QA hook are PR B).
 * Spec: product/m5.1-breeds-spec.md rev 3.8.9 (ea922eb8) §4.2 BR-R8/R9/R11, §4.7 BR-R18, §4.8 E10-E12, §6.
 * Tick semantics: engineering/reviews/v5-breeds-tick-semantics.md (points 1-4, Q1/Q2/Q4 proposals).
 * Code isolation (§6): every function returns its input unchanged when m4.flags.breeds is off or `breeds` is absent,
 * so a flag-off build never writes, clears or changes breeds data (E11; D-HOE-20261030-10).
 */
import type { Balance } from '../config/balance';
import { flagOn } from '../config/flags';
import { BREED_IDS, BREEDS_RNG_SALT, breedsSanitiseEvent, ROSTER, SLOT_IDX, bc, isBreedId, unlockedSlots, type BreedId, type Rarity } from '../config/breeds';
import { mixSeed, type GameState } from './state';
import { isRngState } from './rng';
import type { SimEvent, Sink, BreedRarityName, BreedsSimEvent } from './events';
export interface BreedsSave {
  owned: Partial<Record<string, { stars: number }>>; slots: (string | null)[];
  incubator: { breed: string; remainingMs: number; costCents: number } | null;
  settleMs: [number, number, number]; hatches: number; pity: number; rng: number; freeHatchUsed: 0 | 1; flockCompleteLogged: 0 | 1;
  sinceUnlockMs?: number; sinceUnlockBackfilled?: 0 | 1;
}
export const on = (s: GameState, b: Balance) => flagOn(b, 'breeds') && !!s.breeds;
/** m4.flags.breeds alone (session_end: every breeds field is present with the flag on, absent with it off; §8). */
export const breedsFlagOn = (b: Balance) => flagOn(b, 'breeds');

// ---- §8 telemetry (HoE/breeds-telemetry-emitters, drift row 34; errata rev 15 5e12a591 #15-18) -------------------------
/** errata #15/#16: rarity enum strings on the wire (weights 70/22/7/1). */
export const RARITY_NAME: Record<Rarity, BreedRarityName> = { C: 'Common', R: 'Rare', E: 'Epic', L: 'Legendary' };
export const rarityName = (id: BreedId) => RARITY_NAME[ROSTER[id][0]];
const FAMILY_KEY = { present: 'P', away: 'A', broody: 'B' } as const;
type FamKey = 'P' | 'A' | 'B';
/** errata #17 `loadout` / §8 `breed_loadout_end`: family counts of the slotted breeds, `P<n>A<n>B<n>`. settledOnly = only slots whose
 *  settle timer is done (session_end KPI); otherwise settling breeds count too (breed_slotted). */
export function breedsLoadout(br: Pick<BreedsSave, 'slots' | 'settleMs'>, settledOnly = false): string {
  const n = { P: 0, A: 0, B: 0 };
  SLOT_IDX.forEach(i => { const id = br.slots[i]; if (isBreedId(id) && (!settledOnly || !(br.settleMs[i] > 0))) n[FAMILY_KEY[ROSTER[id][1]]]++; });
  return `P${n.P}A${n.A}B${n.B}`;
}
const settlingCount = (br: BreedsSave) => SLOT_IDX.filter(i => isBreedId(br.slots[i]) && br.settleMs[i] > 0).length;
/** §8 breed_slotted coalescing window of record: one event per slot per 1,000 ms of sim time (HoQA N2). */
export const SLOT_WINDOW_MS = 1000;
type Slotted = Extract<BreedsSimEvent, { type: 'breed_slotted' }>;
/** An open breed_slotted window for one destination slot: `ev` holds the first change's prev_* and the last change's rest. */
export interface SlotWindow { leftMs: number; ev: Slotted }
/** Session-only telemetry accumulators (never saved: m5Persist SESSION_ONLY_KEYS). Absent until the first hatch, slot change
 *  or settled slotted tick, so flag-on/no-hatch states stay byte-identical (§7). */
export interface BreedsTel { hatches: number; spendCents: number; familyMs: Record<FamKey, number>; win: (SlotWindow | null)[];
  /** session_end breed_present_eggs / breed_away_eggs / breed_broody_cents: fed by BR-R12 / BR-R13 via noteTraitEggs (BR-R14 not built). */
  presentEggs?: number; awayEggs?: number; broodyCents?: number }
const emptyTel = (): BreedsTel => ({ hatches: 0, spendCents: 0, familyMs: { P: 0, A: 0, B: 0 }, win: SLOT_IDX.map(() => null) });
export const breedsTel = (s: GameState): BreedsTel => s.breedsTel ?? emptyTel();
/** One slot change (placeBreed or the auto-slot) into its destination slot's window; merged changes keep the FIRST prev_slot /
 *  prev_breed_id, take slot / breed_id / cause / loadout / settling from the last, and count them. No event here: the window
 *  emits when it closes (tick, offline grant, or the session_end flush). */
export function noteSlotChange(s: GameState, slot: number, prevSlot: number | null, prevId: BreedId | null, cause: Slotted['cause'], after: BreedsSave): GameState {
  const t = breedsTel(s), w = t.win[slot], id = after.slots[slot];
  const last = { slot, breed_id: isBreedId(id) ? id : null, cause, loadout: breedsLoadout(after), settling: settlingCount(after) };
  const ev: Slotted = w ? { ...w.ev, ...last, count: w.ev.count + 1 }
    : { type: 'breed_slotted', ...last, prev_slot: prevSlot, prev_breed_id: prevId, count: 1 };
  const win = [...t.win]; win[slot] = { leftMs: w ? w.leftMs : SLOT_WINDOW_MS, ev };
  return { ...s, breedsTel: { ...t, win } };
}
/** Advance the open windows by `dtMs` of sim time; emit (slot order) and drop each one that has run its 1,000 ms. dtMs = Infinity
 *  closes every window (offline grant, session_end). Same state object when no window is open. */
export function tickSlotWindows(s: GameState, dtMs: number, ev?: Sink): GameState {
  const t = s.breedsTel; if (!t || t.win.every(w => w === null)) return s;
  const win = t.win.map(w => { if (!w) return null; const leftMs = w.leftMs - dtMs; if (leftMs > 0) return { ...w, leftMs }; ev?.push(w.ev); return null; });
  return { ...s, breedsTel: { ...t, win } };
}
/** session_end / pagehide: close every open breed_slotted window now (flag on only; identity otherwise). */
export const flushBreedsTel = (s: GameState, b: Balance, ev?: Sink): GameState => (breedsFlagOn(b) ? tickSlotWindows(s, Infinity, ev) : s);
/** §8 trait counters for session_end breed_present_eggs / breed_away_eggs / breed_broody_cents (floored there).
 *  Fed by the BR-R12 Present tick (timers.ts) and the BR-R13 grant step (game.ts); BR-R14 Broody accrual is not built, so
 *  broodyCents has no producer yet. n <= 0 (incl. flag off) = same state object, so no breedsTel is created. */
export function noteTraitEggs(s: GameState, key: 'presentEggs' | 'awayEggs' | 'broodyCents', n: number): GameState {
  if (!(n > 0)) return s;
  const t = breedsTel(s); return { ...s, breedsTel: { ...t, [key]: (t[key] ?? 0) + n } };
}
/** Architect m1 (#127): start fresh session counters after session_end is emitted and on a bfcache restore (pageshow persisted).
 *  Drops breedsTel (absent == empty, so flag-on/no-hatch stays byte-identical); an open breed_slotted window survives. */
export function resetBreedsTel(s: GameState): GameState {
  const t = s.breedsTel; if (!t) return s;
  if (t.win.some(w => w !== null)) return { ...s, breedsTel: { ...emptyTel(), win: t.win } };
  const { breedsTel: _t, ...o } = s; return o as GameState;
}
/** §8 breed_family_s: one tick of sim dt for every slot that is settled at the start of the tick (the BR-R4 gate's view). */
export function addFamilyMs(s: GameState, br: BreedsSave, dtMs: number): GameState {
  const add = { P: 0, A: 0, B: 0 }; let any = false;
  SLOT_IDX.forEach(i => { const id = br.slots[i]; if (isBreedId(id) && !(br.settleMs[i] > 0)) { add[FAMILY_KEY[ROSTER[id][1]]] += dtMs; any = true; } });
  if (!any) return s;
  const t = breedsTel(s), f = t.familyMs;
  return { ...s, breedsTel: { ...t, familyMs: { P: f.P + add.P, A: f.A + add.A, B: f.B + add.B } } };
}
/** §8 hatch_started -> session_end breed_hatches / breed_spend_cents (= Σ hatch_started.cost this session). */
export function noteHatch(s: GameState, costCents: number): GameState {
  const t = breedsTel(s); return { ...s, breedsTel: { ...t, hatches: t.hatches + 1, spendCents: t.spendCents + costCents } };
}
const int0 = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : 0);
const isPlainObject = (v: unknown): boolean => !!v && typeof v === 'object' && !Array.isArray(v);
/** §6 default breeds blob (ensureBreeds + D2 invalid_root re-create). */
function defaultBreeds(s: GameState, b: Balance): BreedsSave {
  const br: BreedsSave = { owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0], flockCompleteLogged: 0,
    hatches: 0, pity: 0, rng: mixSeed((s.rng ^ BREEDS_RNG_SALT) >>> 0), freeHatchUsed: 0 };
  if (s.farmLevel >= bc(b, 'unlock_farm')) br.sinceUnlockBackfilled = 1;
  return br;
}
/** Q2 (tick-semantics note; HoE may re-rule): `breeds` is created at the END of the first flag-on tick (TIMER_SYSTEMS,
 *  like seedEvRng / Q-F1b-1), never at load. §6 migration shape; backfilled = 1 when created at F >= bc_unlock_farm (BR-AC2e). */
export function ensureBreeds(s: GameState, b: Balance): GameState {
  if (!flagOn(b, 'breeds') || 'breeds' in s) return s;
  return { ...s, breeds: defaultBreeds(s, b) };
}
export const isFlockComplete = (br: BreedsSave, b: Balance) => BREED_IDS.every(id => (br.owned[id]?.stars ?? -1) >= bc(b, 'star_cap'));
/** BR-R11 reveal + auto-slot, ONE pure function for step (PR B) and applyOffline. New -> 0★, duplicate -> +1★; first empty
 *  UNLOCKED slot gets it with a full settle. Q4: `slotsOpen` is the slot count at the START of the frame (PR B passes it);
 *  a slot unlocked in the same frame is never auto-filled. Offline the Farm level can't change, so it's unlockedSlots(F). */
/** §8 telemetry (ctx.ev): breed_revealed exactly once per hatch, here at completion (tick path, or applyOffline with offline:true);
 *  wait_ms = sim ms from start to completion = bc_hatch_time_s x 1000 - remainingMs (Σ tick dt, plus the offline decrement, which is
 *  capped at what was left). Then flock_complete once per save (flockCompleteLogged 0 -> 1, which also freezes sinceUnlockMs);
 *  ctx.preMs = the offline ms that elapsed before completion, counted into sinceUnlockMs first. `slot` = the auto-slot index or -1. */
export interface RevealCtx { ev?: Sink; offline?: boolean; farm?: number; preMs?: number }
export function revealHatch(br: BreedsSave, b: Balance, slotsOpen: number, ctx: RevealCtx = {}): { br: BreedsSave; revealed: BreedId | null; slot: number } {
  const inc = br.incubator; if (!inc || inc.remainingMs > 0 || !isBreedId(inc.breed)) return { br, revealed: null, slot: -1 };
  const id = inc.breed, prev = br.owned[id], stars = prev ? Math.min(bc(b, 'star_cap'), prev.stars + 1) : 0;
  const owned = { ...br.owned, [id]: { stars } };
  const slots = [...br.slots], settleMs = [...br.settleMs] as BreedsSave['settleMs'];
  let slot = -1;
  if (!slots.includes(id)) { const i = slots.findIndex((x, k) => x === null && k < slotsOpen); if (i >= 0) { slots[i] = id; settleMs[i] = bc(b, 'settle_s') * 1000; slot = i; } }
  let out: BreedsSave = { ...br, owned, slots, settleMs, incubator: null };
  ctx.ev?.push({ type: 'breed_revealed', breed_id: id, rarity: rarityName(id), dupe: !!prev, stars_after: stars, offline: !!ctx.offline,
    wait_ms: Math.max(0, Math.round(bc(b, 'hatch_time_s') * 1000 - inc.remainingMs)) });
  if (out.flockCompleteLogged !== 1 && isFlockComplete(out, b)) {
    const F = ctx.farm ?? 0, sinceUnlockMs = int0(out.sinceUnlockMs) + (F >= bc(b, 'unlock_farm') ? int0(ctx.preMs) : 0);
    out = { ...out, flockCompleteLogged: 1, ...(('sinceUnlockMs' in out || sinceUnlockMs > 0) && { sinceUnlockMs }) };
    ctx.ev?.push({ type: 'flock_complete', hatches: out.hatches, farm_level: F, elapsed_since_unlock_s: Math.floor(sinceUnlockMs / 1000),
      backfilled: out.sinceUnlockBackfilled === 1 });
  }
  return { br: out, revealed: id, slot };
}
/** BR-R18: closed-form offline settle, called ONLY from applyOffline (once per gap: the caller re-stamps savedAt / the hide
 *  snapshot; an invalid savedAt never reaches here). `awayMs` is capped to offlineCapSeconds like the egg grant; gaps under
 *  offlineMinSeconds do nothing. settleMs does NOT run offline (BR-R4). sinceUnlockMs (telemetry only) gets the same capped ms
 *  from unlock until flock_complete freezes it. No rng draw. */
export function breedsOffline(s: GameState, awayMs: number, b: Balance, ev?: Sink): { state: GameState; reveal: BreedId | null } {
  const o = b.offline;
  if (!on(s, b) || !Number.isFinite(awayMs) || awayMs < o.offlineMinSeconds * 1000) return { state: s, reveal: null };
  const ms = Math.floor(Math.min(awayMs, o.offlineCapSeconds * 1000)), br0 = s.breeds as BreedsSave;
  let br: BreedsSave = br0, reveal: BreedId | null = null, slot = -1;
  if (br.incubator) { const preMs = Math.min(Math.max(0, br.incubator.remainingMs), ms);
    br = { ...br, incubator: { ...br.incubator, remainingMs: Math.max(0, br.incubator.remainingMs - ms) } };
    const r = revealHatch(br, b, unlockedSlots(s.farmLevel, b), { ev, offline: true, farm: s.farmLevel, preMs }); br = r.br; reveal = r.revealed; slot = r.slot; }
  if (br !== br0 && s.breedsRawSlots) s = dropRawSlots(s, br0.slots, br.slots); // E10 / PMC Q5: the auto-slot index drops its raw id
  if (s.farmLevel >= bc(b, 'unlock_farm') && br.flockCompleteLogged !== 1) br = { ...br, sinceUnlockMs: int0(br.sinceUnlockMs) + ms };
  if (slot >= 0) s = noteSlotChange(s, slot, null, null, 'auto_reveal', br); // §8 breed_slotted (offline auto-slot)
  s = tickSlotWindows(s, Infinity, ev); // the capped away ms (>= offlineMinSeconds) outlasts every 1,000 ms window
  return br === br0 ? { state: s, reveal } : { state: { ...s, breeds: br }, reveal };
}
/** §4.8 E10-E12 on load (flag on only). Unknown owned ids are kept and ignored (E10); one save_migrated if anything changed.
 *  D2: null/array/primitive root → defaults + one event (reason invalid_root). D1: full save_migrated shape. */
export function sanitizeBreedsOnLoad(s: GameState, b: Balance, ev: SimEvent[]): GameState {
  if (!flagOn(b, 'breeds') || !('breeds' in s)) return s; // absent key: ensureBreeds at end of first flag-on tick (not load)
  const br0: any = s.breeds, cap = bc(b, 'star_cap'), maxMs = bc(b, 'hatch_time_s') * 1000, open = unlockedSlots(s.farmLevel, b);
  if (!isPlainObject(br0)) { // D2 / E12 invalid_root: re-create, skip value inspection
    ev.push(breedsSanitiseEvent('invalid_root', 0, s.farmLevel));
    return { ...s, breeds: defaultBreeds(s, b) };
  }
  const ownedSrc: any = isPlainObject(br0.owned) ? br0.owned : {}; // D3 / OQ-4
  const owned: any = {};
  for (const [k, v] of Object.entries(ownedSrc)) {
    const st = (v as any)?.stars; owned[k] = isBreedId(k) ? { stars: Number.isFinite(st) ? Math.min(cap, Math.max(0, Math.floor(st))) : 0 } : v; }
  const slotsSrc: any[] = Array.isArray(br0.slots) && br0.slots.length === SLOT_IDX.length ? br0.slots : SLOT_IDX.map(() => null); // D3 / OQ-4
  const seen = new Set<string>(), slots = SLOT_IDX.map(i => { const x = slotsSrc[i];
    if (!isBreedId(x) || i >= open || seen.has(x)) return null; seen.add(x); return x; });
  let incubator = br0.incubator ?? null, coinsCents = s.coinsCents;
  if (incubator && !isBreedId(incubator.breed)) { coinsCents += int0(incubator.costCents); incubator = null; }
  else if (incubator) { const r = incubator.remainingMs;
    incubator = { ...incubator, remainingMs: Number.isFinite(r) ? Math.min(maxMs, Math.max(0, Math.round(r))) : maxMs,
      costCents: int0(incubator.costCents) }; } // D3 / OQ-8
  const settleMs = SLOT_IDX.map(i => Math.min(bc(b, 'settle_s') * 1000, int0(br0.settleMs?.[i]))) as BreedsSave['settleMs'];
  const br: any = { ...br0, owned, slots, incubator, settleMs };
  if ('sinceUnlockMs' in br0 && int0(br0.sinceUnlockMs) !== br0.sinceUnlockMs) br.sinceUnlockMs = 0; // under-reports, never over
  for (const k of ['hatches', 'pity'] as const) if (int0(br0[k]) !== br0[k]) br[k] = 0; // PMC Q7: invalid pity -> 0 (hatches likewise, telemetry count only)
  // D3 / Q7: missing → 0; present-invalid → 1 (rev 3.8.9; was conservative missing→1)
  if (!('freeHatchUsed' in br0)) br.freeHatchUsed = 0;
  else if (br0.freeHatchUsed !== 0 && br0.freeHatchUsed !== 1) br.freeHatchUsed = 1;
  if (!isRngState(br0.rng)) br.rng = mixSeed((s.rng ^ BREEDS_RNG_SALT) >>> 0); // only future rolls; a running hatch keeps its breed (BR-R9)
  if (br0.flockCompleteLogged !== 0 && br0.flockCompleteLogged !== 1) br.flockCompleteLogged = isFlockComplete(br, b) ? 1 : 0;
  if ('sinceUnlockBackfilled' in br0 && br0.sinceUnlockBackfilled !== 0 && br0.sinceUnlockBackfilled !== 1) br.sinceUnlockBackfilled = 1;
  // E10 / PMC Q5: unknown unlocked-slot id null at runtime, raw kept; D4 / OQ-6: locked slots never keep raw (E12 wins).
  const raw = SLOT_IDX.map(i => { const x = slotsSrc[i]; return i < open && typeof x === 'string' && !isBreedId(x) ? x : null; });
  const out: GameState = { ...s, breeds: br, coinsCents, ...(raw.some(x => x !== null) && { breedsRawSlots: raw }) };
  if (JSON.stringify(breedsSaveView(out)) === JSON.stringify(br0) && coinsCents === s.coinsCents) return out; // E10 alone is not a sanitise
  ev.push(breedsSanitiseEvent('invalid_values', coinsCents - s.coinsCents, s.farmLevel));
  return out;
}
/** E10 / PMC Q5: drop the raw-id shadow at every slot index whose runtime value changed (auto-slot, a placement's target and
 *  source), plus `also` (an explicit placement, even null over null). Same state object when nothing is dropped. */
export function dropRawSlots(s: GameState, before: readonly (string | null)[], after: readonly (string | null)[], also = -1): GameState {
  const raw0 = s.breedsRawSlots; if (!raw0) return s;
  const raw = raw0.map((v, i) => (i === also || before[i] !== after[i] ? null : v));
  return raw.every((v, i) => v === raw0[i]) ? s : { ...s, breedsRawSlots: raw };
}
/** The saved `breeds` (E10 / PMC Q5): a slot that is null at runtime and still has a raw unknown id writes that id back.
 *  A real change clears it: dropRawSlots runs on the auto-slot (tick and offline) and on placeBreed (PR B). */
export function breedsSaveView(s: GameState): BreedsSave | undefined {
  const x = s.breeds, raw = s.breedsRawSlots; if (!x || !raw) return x;
  const slots = x.slots.map((v, i) => (v === null && raw[i] ? raw[i] : v));
  return slots.every((v, i) => v === x.slots[i]) ? x : { ...x, slots };
}
