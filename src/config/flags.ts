/**
 * v5 release flags: ONE namespace, balance.m4.flags.* (HoE D-C1, engineering/m5.0-sizing.md §12.1; D-HOE-20261029-02).
 * Values are 0/1 numbers (validateBalance rejects non-numbers). Absent = 0. Every flag also needs balance.m4.enabled.
 * Names are the spec names. zeroGainUi / bestBuyV2 are spelled m5.flags.* in the M5.1 specs; they live here as m4.flags.*.
 * F3 adds the block to balance.json (all 0) and makes scripts/sync-economy.ts fitM4() keep it whole.
 */
import type { EconomyParams } from './formulas';
export const M5_FLAGS = [
  'golden', 'streak', 'tapCoins', 'abilities', 'broody', 'salesStopped', 'pause', // M5.0
  'rc2Refill', 'autoRefill', 'clockWage', 'breeds', 'zeroGainUi', 'bestBuyV2', // M5.1
] as const;
export type M5Flag = typeof M5_FLAGS[number];
export type M5Flags = Partial<Record<M5Flag, number>>;
/** True only when balance.m4.enabled AND balance.m4.flags[f] === 1. */
export const flagOn = (p: EconomyParams, f: M5Flag): boolean => !!p.m4?.enabled && p.m4.flags?.[f] === 1;
/** Any M5 flag that reads the event RNG is on (golden or broody: golden spec R10a, HoE Q4 ruling). */
export const evRngFlagOn = (p: EconomyParams) => flagOn(p, 'golden') || flagOn(p, 'broody');
/** Zero-gain confirm strip (spec "m5.zeroGain.confirm", here m4.zeroGain.confirm): only with zeroGainUi on AND confirm === 1. Off in M5.1. */
export const zeroGainConfirmOn = (p: EconomyParams): boolean => flagOn(p, 'zeroGainUi') && p.m4?.zeroGain?.confirm === 1;
