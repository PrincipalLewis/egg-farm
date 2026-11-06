/** D-HOP-2026-10-19-02 (replaces -01): see pickM4All. History: -01 (c163fb9) used highlightPick over Farm-tab rows only and kept Collection on the 50 % rule.
 *  Flag off: returns exactly the old Farm/Collection choice (goldens and Python parity untouched).
 *  Flag on, seller15: pickM4All (game's payback pick over every purchasable, wait rule). Flag on, cheapest: D-HOP-03, cheapest
 *  affordable of Collection/Farm/Hens/Egg value. Economy's scratch/m4-ac7-bot/tree/m4bot/m4buy.ts (read-only) was the
 *  reference for the call path (highlightPick shape); it keeps Collection on the 50 % rule and hires workers first, i.e. -01.
 *  Pure function of state + balance: deterministic. */
import type { Balance } from '../src/config/balance';
import { collectionCost, farmCost, type GameState } from '../src/sim/state';
import { m4On } from '../src/config/formulas';
import { candidates } from '../src/ui/next-goal';
import { bestPaybackAmong, type BuyKey } from '../src/econ/best-buy';
import type { Action } from '../src/sim/actions';
import { trackLock, trackCost } from '../src/sim/tracks';
export type Pick = 'c' | 'f' | 'hens' | 'eggValue' | 'W1' | 'W2' | 'W3' | 'W4' | null;
const WID = { W1: 'market_hand', W2: 'coop_hand', W3: 'hawker' } as const;
export const pickAction = (k: Exclude<Pick, null>): Action => k === 'f' ? { type: 'buyFarm' } : k === 'c' ? { type: 'buyCollection' }
  : k === 'W4' ? { type: 'buyGraderTier' } : k === 'hens' || k === 'eggValue' ? { type: 'buyTrack', track: k } : { type: 'hire', worker: WID[k] };
const FROM_KEY: Record<BuyKey, Exclude<Pick, null>> = { FARM: 'f', COLL: 'c', HENS: 'hens', VALUE: 'eggValue', W1: 'W1', W2: 'W2', W3: 'W3', W4: 'W4' };
/** D-HOP-2026-10-19-02, seller15 with M4 on: the game's own pick across ALL purchasables the bot can buy (`keys`; runBot: Farm,
 *  Hens, Egg value, Collection; runM2 adds the workers it uses), no bot ROI rule. Same call shape as src/ui/tracks-ui.ts:53
 *  highlightPick: bestPaybackAmong (src/econ/best-buy.ts:151) over the affordable offered keys, else over every offered key.
 *  Wait rule: if that pick is not affordable, buy nothing this check-in. */
export function pickM4All(s: GameState, b: Balance, keys: readonly BuyKey[]): Pick {
  const offered = candidates(s, b).filter(c => keys.includes(c.key as BuyKey));
  const aff = offered.filter(c => s.coinsCents >= c.costCents).map(c => c.key as BuyKey);
  const p = bestPaybackAmong(s, b, aff.length ? aff : offered.map(c => c.key as BuyKey));
  return p && aff.includes(p.key) ? FROM_KEY[p.key] : null; // wait rule
}
export const M1_KEYS: readonly BuyKey[] = ['FARM', 'HENS', 'VALUE', 'COLL'];
export function pickBuy(s: GameState, b: Balance, model: 'seller15' | 'cheapest', cheapFirst: boolean, keys: readonly BuyKey[] = M1_KEYS): Pick {
  const cc = s.collectionLevel < b.maxLevel ? collectionCost(s.collectionLevel, b) * 100 : Infinity;
  const fc = s.farmLevel < b.maxLevel ? farmCost(s.farmLevel, b) * 100 : Infinity;
  const cOk = s.coinsCents >= cc, fOk = s.coinsCents >= fc;
  if (!m4On(b)) {
    if (model === 'seller15' && cheapFirst && cOk) return 'c';
    if (model === 'seller15') return fOk ? 'f' : cOk && cc <= 0.5 * fc ? 'c' : null;
    return cOk && fOk ? (cc <= fc ? 'c' : 'f') : cOk ? 'c' : fOk ? 'f' : null;
  }
  // M4 on, seller15: no variance cheap-first Collection either (it would buy outside the pick; D-HOP-02 wait rule).
  if (model === 'seller15') return pickM4All(s, b, keys);
  // D-HOP-2026-10-19-03 cheapest bot: unchanged (cheapest affordable of C/F/H/V).
  const opts: [Exclude<Pick, null>, number][] = [['c', cc], ['f', fc]];
  for (const t of ['hens', 'eggValue'] as const) if (!trackLock(s, t, b)) opts.push([t, Math.round(trackCost(t === 'hens' ? s.hensLevel : s.eggValueLevel, t, b) * 100)]);
  const aff = opts.filter(([, c]) => s.coinsCents >= c).sort((x, y) => x[1] - y[1]);
  return aff.length ? aff[0][0] : null;
}
/** QA seam Q4 (observe-only, test tooling): `action` = after every action the bot applies (collect, sellAll, buy:<pick>), `buyCheck` = at
 *  every buy check, before pickBuy. The callback gets a deep clone (structuredClone) of the state, so it can neither alias nor mutate the run.
 *  Same signature as tests/bot-m5.ts RunOpts.onObserve. */
export type Observe = (kind: 'action' | 'buyCheck', action: string, t: number, s: GameState) => void;
export const observe = (hook: Observe | undefined, kind: 'action' | 'buyCheck', action: string, t: number, s: GameState) => { if (hook) hook(kind, action, t, structuredClone(s)); };
