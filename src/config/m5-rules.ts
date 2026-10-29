/**
 * v5 F3: validateBalance rules for the M5 tunables and flags (engineering/m5.0-sizing.md §1 F3, §12.2, §14 pt 5; golden spec §5,
 * streak spec §5, broody spec §5, pause spec §6). Each rule runs only when its keys exist in m4.tc, so a CSV that doesn't carry
 * a column yet (Economy's single M5 CSV PR) still loads; the feature PR that reads a key adds it to M5_REQUIRED_TC.
 * Bounds here are the specs' validation rules, not tunable values.
 */
import { M5_FLAGS } from './flags';
type TC = Record<string, number>;
const fail = (m: string): never => { throw new Error(`balance.m4.${m}`); };
const has = (tc: TC, ...k: string[]) => k.every(x => typeof tc[x] === 'number');
/** tc keys that must exist while their flag is on (feature PRs append; empty until a reader lands). */
export const M5_REQUIRED_TC: Partial<Record<(typeof M5_FLAGS)[number], readonly string[]>> = {};
export function validateM5(m4: any, workers: any): void {
  if (!m4) return;
  const flags = m4.flags ?? {};
  if (typeof flags !== 'object' || Array.isArray(flags)) fail('flags must be an object');
  for (const [k, v] of Object.entries(flags)) {
    if (!(M5_FLAGS as readonly string[]).includes(k)) fail(`flags.${k} is not a known flag (${M5_FLAGS.join(', ')})`);
    if (v !== 0 && v !== 1) fail(`flags.${k} must be 0 or 1`);
  }
  // m4.zeroGain (zero-gain UI spec 1098f14e "m5.zeroGain.confirm"; m4 namespace per manifest row 28): object, known keys, 0/1
  const zg = m4.zeroGain ?? {};
  if (typeof zg !== 'object' || Array.isArray(zg)) fail('zeroGain must be an object');
  for (const [k, v] of Object.entries(zg)) {
    if (k !== 'confirm') fail(`zeroGain.${k} is not a known key (confirm)`);
    if (v !== 0 && v !== 1) fail(`zeroGain.${k} must be 0 or 1`);
  }
  const tc: TC = m4.tc ?? {};
  for (const [f, keys] of Object.entries(M5_REQUIRED_TC)) if (flags[f] === 1) for (const k of keys!) if (!has(tc, k)) fail(`tc.${k} is required while flags.${f} is on`);
  // #1 golden egg (spec §5 validateBalance line)
  if (has(tc, 'egg_w_cash', 'egg_w_frenzy', 'egg_w_eggs') && Math.abs(tc.egg_w_cash + tc.egg_w_frenzy + tc.egg_w_eggs - 1) > 1e-9) fail('tc egg reward weights must sum to 1');
  if (has(tc, 'egg_gap_min_s', 'egg_gap_max_s') && !(tc.egg_gap_min_s > 0 && tc.egg_gap_min_s <= tc.egg_gap_max_s)) fail('tc.egg_gap_min_s must be > 0 and <= egg_gap_max_s');
  if (has(tc, 'warn_at_s', 'urgent_at_s', 'egg_despawn_s') && !(tc.warn_at_s < tc.urgent_at_s && tc.urgent_at_s < tc.egg_despawn_s)) fail('tc: warn_at_s < urgent_at_s < egg_despawn_s');
  for (const k of ['egg_despawn_s', 'frenzy_s', 'first_spawn_s']) if (has(tc, k) && !(tc[k] > 0)) fail(`tc.${k} must be > 0`);
  if (has(tc, 'frenzy_price_mult') && !(tc.frenzy_price_mult >= 1)) fail('tc.frenzy_price_mult must be >= 1');
  // #2 streak / #3 tap coins (streak spec §5: 0 < cap <= 1, tier_count >= 1, window >= 1)
  if (has(tc, 'streak_cap') && !(tc.streak_cap > 0 && tc.streak_cap <= 1)) fail('tc.streak_cap must be in (0, 1]');
  if (has(tc, 'streak_tier_count') && !(Number.isInteger(tc.streak_tier_count) && tc.streak_tier_count >= 1)) fail('tc.streak_tier_count must be an integer >= 1');
  if (has(tc, 'tap_bonus_income_window_s') && !(tc.tap_bonus_income_window_s >= 1)) fail('tc.tap_bonus_income_window_s must be >= 1');
  if (has(tc, 'tap_income_share') && !(tc.tap_income_share <= 1)) fail('tc.tap_income_share must be <= 1');
  // #5 Broody (cap > 0; shares in (0, 1])
  if (has(tc, 'broody_cap_s') && !(tc.broody_cap_s > 0)) fail('tc.broody_cap_s must be > 0');
  for (const k of ['broody_income_share', 'broody_ready_share']) if (has(tc, k) && !(tc[k] > 0 && tc[k] <= 1)) fail(`tc.${k} must be in (0, 1]`);
  // #5b Sales-stopped (sizing §14 pt 5): hold 0 = kill switch; else > max(MH, CH tired_every_s) + 1; clear_share < min_share
  if (has(tc, 'stall_hold_s') && tc.stall_hold_s > 0) {
    const lim = Math.max(workers?.market_hand?.tired_every_s ?? 0, workers?.coop_hand?.tired_every_s ?? 0) + 1;
    if (tc.stall_hold_s <= lim) fail(`tc.stall_hold_s must be 0 (off) or > ${lim}`);
  }
  if (has(tc, 'fatigue_cue_clear_share', 'fatigue_cue_min_share') && !(tc.fatigue_cue_clear_share < tc.fatigue_cue_min_share)) fail('tc.fatigue_cue_clear_share must be < fatigue_cue_min_share');
  // #4 abilities / Pause
  if (has(tc, 'ability_s', 'ability_cd_s') && !(tc.ability_s > 0 && tc.ability_s <= tc.ability_cd_s)) fail('tc.ability_s must be > 0 and <= ability_cd_s');
  if (has(tc, 'rest_recovery_mult') && !(tc.rest_recovery_mult <= 0.35)) fail('tc.rest_recovery_mult must be <= 0.35 (pause spec §6, decisions.md:9)');
}
