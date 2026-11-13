/**
 * M5.1 breeds PR B: the tick countdown, the hatch action + roll, slot placement, the settle gate and the BR-R7b estimate.
 * Spec rev 3.8.8 (254acea3) §4.1 BR-R2..R4, §4.2 BR-R5..R11, §4.8 E1/E4-E7/E15; tick semantics note points 1-4;
 * D-HOE-20261030-14 (Q1-Q4). Roll = Econ's confirmed harness roll() (spec d43e2ce3, h/breeds.ts 76c07ecf L39-45).
 * Every export is identity / no-op unless m4.flags.breeds is on and `breeds` exists (§6 code isolation).
 */
import type { Balance } from '../config/balance';
import { BP_HALF, BP_ONE, FARM_SOON_HATCH_MULT, BREED_IDS, CENTS_PER_DOLLAR, RARITY_WEIGHT, ROSTER, bc, isBreedId, unlockedSlots, type BreedId, type Rarity } from '../config/breeds';
import { farmCost } from '../config/formulas';
import { incomePerSec } from '../econ/income';
import { nextRand, type GameState } from './state';
import { on, revealHatch, isFlockComplete, dropRawSlots, rarityName, noteSlotChange, tickSlotWindows, addFamilyMs, noteHatch, type BreedsSave } from './breeds';
import type { Sink } from './events';
const br = (s: GameState) => s.breeds as BreedsSave;
/** Tick (note point 1), at the end of step after streak, on SIM dt (never focus): (a) settle timers of slots filled before this
 *  tick, (b) incubator, reveal + auto-slot (full settle, not decremented this tick), (c) sinceUnlockMs (frozen after flock_complete).
 *  Q4 (D-HOE-20261030-14): `slotsFarm` = the Farm level at the START of the frame, so a slot unlocked by a purchase in this
 *  frame can't take the auto-slot (E15: reveal first, then the unlock). No clock (bots, hidden sim) = the current level. */
/** §8 telemetry (ev): open breed_slotted windows advance by dt first (a window opened this tick is not counted down this tick);
 *  breed_family_s adds dt for each slot settled at the start of the tick; revealHatch emits breed_revealed / flock_complete and the
 *  auto-slot opens a window (cause auto_reveal). Session-only `breedsTel` only; the saved `breeds` blob is unchanged by telemetry. */
export function breedsTick(s: GameState, dt: number, b: Balance, slotsFarm?: number, ev?: Sink): GameState {
  if (!on(s, b)) return s;
  const dtMs = Math.round(dt * 1000); let x = br(s);
  s = addFamilyMs(tickSlotWindows(s, dtMs, ev), x, dtMs);
  if (x.settleMs.some(v => v > 0)) x = { ...x, settleMs: x.settleMs.map(v => Math.max(0, v - dtMs)) as BreedsSave['settleMs'] };
  let slot = -1;
  if (x.incubator) {
    x = { ...x, incubator: { ...x.incubator, remainingMs: x.incubator.remainingMs - dtMs } };
    if (x.incubator!.remainingMs <= 0) { const r = revealHatch(x, b, unlockedSlots(Math.min(s.farmLevel, slotsFarm ?? s.farmLevel), b), { ev, farm: s.farmLevel }); x = r.br; slot = r.slot; }
  }
  if (s.farmLevel >= bc(b, 'unlock_farm') && x.flockCompleteLogged !== 1) x = { ...x, sinceUnlockMs: (x.sinceUnlockMs ?? 0) + dtMs };
  if (slot >= 0) s = noteSlotChange(s, slot, null, null, 'auto_reveal', x); // §8 breed_slotted cause auto_reveal
  return dropRawSlots({ ...s, breeds: x }, br(s).slots, x.slots); // E10 / PMC Q5: the auto-slot index drops its raw id
}
/** BR-R10 eligibility: not owned or below the star cap, and the rarity's Farm gate is open (Rare/Epic F14, Legendary F24). */
export function eligible(x: BreedsSave, F: number, b: Balance): BreedId[] {
  const gate = (r: Rarity) => r === 'C' || (r === 'L' ? F >= bc(b, 'legendary_farm') : F >= bc(b, 'rare_farm'));
  return BREED_IDS.filter(id => (x.owned[id]?.stars ?? -1) < bc(b, 'star_cap') && gate(ROSTER[id][0]));
}
/** BR-R9/R10 roll, draws from breeds.rng ONLY (never state.rng, never brRng). Free hatch: 1 draw, uniform over eligible
 *  Commons. Paid: pity (consecutive non-Rare+ >= bc_pity_rare_after - 1 narrows to eligible Rare+; E6: none eligible = normal
 *  pool, keep counting), then 1 rarity draw over the rarities with an eligible breed (empty ones drop their weight, no
 *  redraw), then 1 uniform breed draw in that rarity. Returns null (no draw) when nothing is eligible. */
export function rollBreed(x: BreedsSave, F: number, b: Balance, free: boolean): { id: BreedId; rng: number } | null {
  let el = eligible(x, F, b), rng = x.rng, u: number;
  if (free) { const cm = el.filter(id => ROSTER[id][0] === 'C'); if (!cm.length) return null; [rng, u] = nextRand(rng); return { id: cm[Math.floor(u * cm.length)], rng }; }
  if (!el.length) return null;
  const rp = el.filter(id => ROSTER[id][0] !== 'C'); if (x.pity >= bc(b, 'pity_rare_after') - 1 && rp.length) el = rp;
  const rs = (['C', 'R', 'E', 'L'] as const).filter(r => el.some(id => ROSTER[id][0] === r));
  [rng, u] = nextRand(rng); let w = u * rs.reduce((a, r) => a + bc(b, RARITY_WEIGHT[r]), 0), pick: Rarity = rs[rs.length - 1];
  for (const r of rs) { w -= bc(b, RARITY_WEIGHT[r]); if (w <= 0) { pick = r; break; } }
  const l = el.filter(id => ROSTER[id][0] === pick); [rng, u] = nextRand(rng); return { id: l[Math.floor(u * l.length)], rng };
}
/** BR-R5 cost in cents: max(min, min(planRef x cost_s, house-round(farmStep x share_bp))). planRef = planner income
 *  (assumeWorking, ignoreQE2) on the breed-neutral state, rounded once (no traits exist yet, so the state is neutral).
 *  ignoreQE2 keeps planRef bestBuyV2-invariant (D-ECON-20261105-M1-QE2-HATCH (a); HoP / PMC). */
export function hatchCostCents(s: GameState, b: Balance): number {
  return hatchCostFrom(Math.round(incomePerSec(s, b, { assumeWorking: true, ignoreQE2: true }) * CENTS_PER_DOLLAR), farmCost(s.farmLevel, b) * CENTS_PER_DOLLAR, b);
}
/** BR-R5 on injected integer cents (BR-AC6 / BR-AC13). BR-R17 guard: planRef x cost_s is never formed when it would exceed the
 *  Farm branch, so it can't pass 2^53 - 1 (planRef > floor(farmBranch / cost_s) <=> planRef x cost_s > farmBranch). */
export function hatchCostFrom(planRefCents: number, farmStepCents: number, b: Balance): number {
  const farmBranch = Math.floor((farmStepCents * bc(b, 'hatch_farm_share_bp') + BP_HALF) / BP_ONE);
  return Math.max(bc(b, 'hatch_min_cents'), planRefCents > Math.floor(farmBranch / bc(b, 'hatch_cost_s')) ? farmBranch : planRefCents * bc(b, 'hatch_cost_s'));
}
/** BR-R6/R7 the Hatch press: F >= unlock, incubator free, flock not complete, something eligible, coins >= this frame's cost
 *  (first hatch free, always Common). Otherwise nothing is charged and nothing starts (E1/E4/E5). */
/** §8 hatch_started (errata #15): emitted only for a press that starts a hatch (a refused / unaffordable press emits nothing);
 *  cost / coinsBefore in cents, never `track` / `cost_cents`; not an `upgrade` (no TTFU / is_first_upgrade / upgrades count). */
export function startHatch(s: GameState, b: Balance, ev?: Sink): GameState {
  if (!on(s, b) || s.farmLevel < bc(b, 'unlock_farm')) return s;
  const x = br(s), free = x.freeHatchUsed !== 1; if (x.incubator || isFlockComplete(x, b)) return s;
  const cost = free ? 0 : hatchCostCents(s, b); if (s.coinsCents < cost) return s;
  const r = rollBreed(x, s.farmLevel, b, free); if (!r) return s;
  const rare = ROSTER[r.id][0] !== 'C';
  ev?.push({ type: 'hatch_started', breed_id: r.id, rarity: rarityName(r.id), cost, coinsBefore: s.coinsCents, pity_before: x.pity, free, farm_level: s.farmLevel });
  return { ...noteHatch(s, cost), coinsCents: s.coinsCents - cost, breeds: { ...x, rng: r.rng, hatches: x.hatches + 1, pity: rare ? 0 : x.pity + 1, freeHatchUsed: 1,
    incubator: { breed: r.id, remainingMs: bc(b, 'hatch_time_s') * 1000, costCents: cost } } };
}
/** BR-R3/R4: place an owned breed (or null) in an unlocked slot. Moving a slotted breed keeps its settle state (E7, E23);
 *  a breed newly placed settles for bc_settle_s. */
/** §8 breed_slotted (errata #17): a real change opens / joins the destination slot's 1,000 ms window (a move = 1 change, cause
 *  move); a no-op (same breed into the same slot, empty over empty) emits nothing. */
export function placeBreed(s: GameState, b: Balance, slot: number, id: string | null): GameState {
  if (!on(s, b) || !Number.isInteger(slot) || slot < 0 || slot >= unlockedSlots(s.farmLevel, b)) return s;
  const x = br(s); if (id !== null && !(isBreedId(id) && x.owned[id])) return s;
  const slots = [...x.slots], settleMs = [...x.settleMs] as BreedsSave['settleMs'], from = id === null ? -1 : slots.indexOf(id);
  if (from === slot) return s;
  const carry = from >= 0 ? settleMs[from] : bc(b, 'settle_s') * 1000; if (from >= 0) { slots[from] = null; settleMs[from] = 0; }
  slots[slot] = id; settleMs[slot] = id === null ? 0 : carry;
  const nx = { ...x, slots, settleMs }, was = x.slots[slot];
  const t = was === id ? s : noteSlotChange(s, slot, from >= 0 ? from : null, isBreedId(was) ? was : null, from >= 0 ? 'move' : 'manual', nx);
  // E10 / PMC Q5: a real change overwrites the raw id at every index written (the target, and the source of a move)
  return dropRawSlots({ ...t, breeds: nx }, x.slots, slots, slot);
}
/** BR-R4 settle gate + §4.3 star value: a slot's trait bp, 0 while settling or empty. floor(base x (1 + stars x star_bonus)). */
export function slotTraitBp(x: BreedsSave, slot: number, b: Balance): number {
  const id = x.slots[slot]; if (!isBreedId(id) || x.settleMs[slot] > 0) return 0;
  return Math.floor(ROSTER[id][2] * (BP_ONE + (x.owned[id]?.stars ?? 0) * bc(b, 'star_bonus_bp')) / BP_ONE);
}
/** BR-R7b estimator (display-only; BR-AC31e): ETA to the next Farm step at default income (the note's basis) and at
 *  assumeWorking income (Farm-first's basis), in float seconds. `inc` = the debug hook's incomes in $/s, each optional. */
export interface HatchEstimate { show: boolean; defaultEtaS: number | null; assumeWorkingEtaS: number | null; }
export function hatchEstimate(s: GameState, b: Balance, inc: { defaultPerS?: number; assumeWorkingPerS?: number } = {}): HatchEstimate {
  const need = Math.max(0, farmCost(s.farmLevel, b) * CENTS_PER_DOLLAR - s.coinsCents) / CENTS_PER_DOLLAR;
  const eta = (r: number) => (need <= 0 ? 0 : r > 0 ? need / r : null);
  const d = eta(inc.defaultPerS ?? incomePerSec(s, b)), a = eta(inc.assumeWorkingPerS ?? incomePerSec(s, b, { assumeWorking: true }));
  const x = s.breeds as BreedsSave | undefined;
  const show = !!x && on(s, b) && s.farmLevel < b.maxLevel && x.freeHatchUsed === 1 && !isFlockComplete(x, b) && d !== null && d <= FARM_SOON_HATCH_MULT * bc(b, 'hatch_cost_s');
  return { show, defaultEtaS: d, assumeWorkingEtaS: a };
}
