/**
 * v5 telemetry field builders that read M5 flags (HoE/tel-st-ac19-20; errata v5 rev. 16 sha1 f82bf4d6 V-2b).
 * Kept out of game.ts so the F3 no-literal scan of flag readers covers only this small module.
 * Row 32 (HoE/breeds-sim-prB-traits): offline_grant.away_bp — real Away bp (BR-R13), not the #123 AWAY_BP_NONE stub.
 */
import type { Balance } from '../config/balance';
import { flagOn } from '../config/flags';

/** offline_grant.away_bp (breeds §8 / errata V-2b): required breeds-on (0 if none); absent flag-off; emit even when eggs=0 (PMC). */
export const offlineGrantV5 = (b: Balance, away_bp = 0): { away_bp?: number } =>
  (flagOn(b, 'breeds') ? { away_bp } : {});
