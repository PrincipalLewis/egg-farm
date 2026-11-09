/**
 * v5 telemetry field builders that read M5 flags (HoE/tel-st-ac19-20; errata v5 rev. 15 5e12a591 V-2b). Kept out of game.ts so the
 * F3 no-literal scan of flag readers covers only this small module.
 */
import type { Balance } from '../config/balance';
import { flagOn } from '../config/flags';
/** errata rev. 15 V-2b offline_grant.away_bp (breeds rev 3.8.9 §8 L699, "0 if none"): the BR-R13 Away bp applied to the grant.
 *  applyOffline has no Away term at this tip (BR-R13 is not built), so the grant applies none. */
export const AWAY_BP_NONE = 0;
/** offline_grant v5 fields: away_bp with m4.flags.breeds on; absent with the flag off (V-2b flag-gated fields). */
export const offlineGrantV5 = (b: Balance): { away_bp?: number } => (flagOn(b, 'breeds') ? { away_bp: AWAY_BP_NONE } : {});
