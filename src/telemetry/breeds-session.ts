/**
 * M5.1 breeds session_end fields (spec rev 3.8.9 ea922eb8 §8 L698; errata rev 15 5e12a591), HoE/breeds-telemetry-emitters (drift row 34).
 * Read from the sim state only (the UI never emits). Flag off: {} (every breed field absent, not 0). Flag on: every field below.
 * NOT here: present_active_s / present_lost_count (Saves, saves/breeds-sim-prB-traits) and offline_grant.away_bp (Saves).
 * breed_present_eggs / breed_away_eggs / breed_broody_cents read the BreedsTel trait counters (presentEggs / awayEggs / broodyCents):
 * presentEggs from the BR-R12 tick (timers.ts), awayEggs from the BR-R13 grant (game.ts, awayBonusEggs); broodyCents stays 0 until
 * BR-R14 Broody nest accrual is built (HoE/v5-broody-accrual).
 */
import type { Balance } from '../config/balance';
import { BREED_IDS, SLOT_IDX, isBreedId } from '../config/breeds';
import { breedsFlagOn, breedsLoadout, breedsTel, type BreedsSave } from '../sim/breeds';
import type { GameState } from '../sim/state';
import { m4On } from '../config/formulas';
import { m4OfflineEggs } from '../sim/offline';
import { offlineMult } from '../sim/tracks';

/** §8 breed_away_eggs: the part of the M4 offline grant owed to BR-R13 = grant − the same grant at awayBp 0 (both floored, both
 *  capped by maxEggs2h). `pre` = the state applyOffline ran on, `bp` = the Away bp it applied. 0 flag off / no Away / no grant. */
export function awayBonusEggs(pre: GameState, gapMs: number, b: Balance, eggs: number, bp: number): number {
  if (!breedsFlagOn(b) || !(bp > 0) || !(eggs > 0) || !m4On(b) || !b.m4?.offline) return 0;
  return Math.max(0, eggs - m4OfflineEggs(gapMs / 1000, pre.hensLevel, b, offlineMult(pre, b), 0));
}

export interface SessionEndBreeds {
  breed_hatches: number; breed_spend_cents: number; breed_present_eggs: number; breed_away_eggs: number; breed_broody_cents: number;
  breeds_owned: number; breed_slots_used: number; breed_loadout_end: string; breed_family_s: { P: number; A: number; B: number };
}
const EMPTY: Pick<BreedsSave, 'slots' | 'settleMs' | 'owned'> = { owned: {}, slots: [null, null, null], settleMs: [0, 0, 0] };
/** focus-free sim seconds, 0.1 s (ticks are 100 ms, so this only removes float noise). */
const s01 = (ms: number) => Math.round(ms / 100) / 10;
export function sessionEndBreedsFields(s: GameState, b: Balance): SessionEndBreeds | Record<string, never> {
  if (!breedsFlagOn(b)) return {};
  const x = s.breeds ?? EMPTY, t = breedsTel(s);
  return {
    breed_hatches: t.hatches, breed_spend_cents: t.spendCents,
    breed_present_eggs: Math.floor(t.presentEggs ?? 0), breed_away_eggs: Math.floor(t.awayEggs ?? 0), breed_broody_cents: Math.floor(t.broodyCents ?? 0),
    breeds_owned: BREED_IDS.filter(id => x.owned[id]).length,
    breed_slots_used: SLOT_IDX.filter(i => isBreedId(x.slots[i])).length,
    breed_loadout_end: breedsLoadout(x, true),
    breed_family_s: { P: s01(t.familyMs.P), A: s01(t.familyMs.A), B: s01(t.familyMs.B) },
  };
}
