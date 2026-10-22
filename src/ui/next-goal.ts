/** M3-AC5 next-goal hint strip (art-ux/m3-next-goal-spec.md v1.0). Pure selection + anti-flicker hold; unit-tested.
 *  All costs/effects read from config; nothing hard-coded. */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { farmCost, collectionCost, eggsPerTap, coopTier } from '../sim/state';
import { hireCostCents, unlockFarm, graderTierCostCents } from '../sim/workers';
import { fmtTimeToAfford } from './format';
import { m4On } from '../config/formulas';
import { trackLock, trackCost, trackLevel } from '../sim/tracks';
import { trackGoalLabel } from './tracks-ui';
import { bestPaybackAmong } from '../econ/best-buy';
import { goalLabelParts, goalLabelSpec, type GoalLabelParts } from './goal-label';
export type GoalKey = 'FARM' | 'HENS' | 'VALUE' | 'COLL' | 'W1' | 'W2' | 'W3' | 'W4';
export type GoalState = 'ready' | 'waiting' | 'noincome' | 'done';
/** Tie-break order (spec §1; M4A-22): FARM > HENS > VALUE > COLL > W1 > W2 > W3 > W4. HENS/VALUE only exist with the M4 flag on. */
export const GOAL_ORDER: GoalKey[] = ['FARM', 'HENS', 'VALUE', 'COLL', 'W1', 'W2', 'W3', 'W4'];
const WK = { W1: 'market_hand', W2: 'coop_hand', W3: 'hawker' } as const;
const WNAME = { market_hand: 'Market Hand', coop_hand: 'Coop Hand', hawker: 'Hawker' } as const;
export interface Candidate { key: GoalKey; costCents: number; }
export interface Goal { key: GoalKey | null; state: GoalState; label: string; status: string; costCents: number; tab: 'farm' | 'collection' | 'workers';
  /** M41-8 F4 (M4 on, HENS / VALUE / COLL): rendered spans + untruncated aria; `label` is then parts.text. */
  parts?: GoalLabelParts; }
export function candidates(s: GameState, b: Balance): Candidate[] {
  const out: Candidate[] = [], F = s.farmLevel;
  if (F < b.maxLevel) out.push({ key: 'FARM', costCents: farmCost(F, b) * 100 });
  // M4A-22/23: a capped or MAX track is never a candidate.
  if (m4On(b)) for (const [key, t] of [['HENS', 'hens'], ['VALUE', 'eggValue']] as const) if (!trackLock(s, t, b)) out.push({ key, costCents: trackCost(trackLevel(s, t), t, b) * 100 });
  if (s.collectionLevel < b.maxLevel) out.push({ key: 'COLL', costCents: collectionCost(s.collectionLevel, b) * 100 });
  for (const k of ['W1', 'W2', 'W3'] as const) { const id = WK[k]; if (!s.workers[id] && F >= unlockFarm(id, b)) out.push({ key: k, costCents: hireCostCents(id, b) }); }
  const tiers = b.workers.grader.tiers, i = s.workers.grader ? s.graderTier : 0; // not hired -> tier 1 = the hire
  if (i < tiers.length && F >= tiers[i].farm) out.push({ key: 'W4', costCents: graderTierCostCents(i, b) });
  return out;
}
const cheapest = (c: Candidate[]) => c.reduce<Candidate | null>((a, x) => !a || x.costCents < a.costCents || (x.costCents === a.costCents && GOAL_ORDER.indexOf(x.key) < GOAL_ORDER.indexOf(a.key)) ? x : a, null);
export function farmLabel(F: number, b: Balance): string {
  const n = F + 1, w = (['market_hand', 'coop_hand', 'hawker'] as const).find(id => b.workers[id].unlock_farm === n);
  const k = b.workers.grader.tiers.findIndex(t => t.farm === n);
  const suffix = w ? `: unlock ${WNAME[w]}` : coopTier(n) !== coopTier(F) ? ': new coop' : k >= 0 ? `: Grader tier ${k + 1}` : '';
  return `Farm L${n}${suffix}`;
}
export function labelFor(key: GoalKey, s: GameState, b: Balance): string {
  switch (key) {
    case 'FARM': return farmLabel(s.farmLevel, b);
    case 'HENS': return trackGoalLabel('hens', s.hensLevel + 1, s.farmLevel, b);
    case 'VALUE': return trackGoalLabel('eggValue', s.eggValueLevel + 1, s.farmLevel, b);
    case 'COLL': { const C = s.collectionLevel; return `Collection L${C + 1}: +${eggsPerTap(C + 1, b) - eggsPerTap(C, b)}/tap`; }
    case 'W4': { const i = s.workers.grader ? s.graderTier : 0, t = b.workers.grader.tiers[i]; return `Grader tier ${i + 1}: ×${t.mult}`; }
    default: return `Hire ${WNAME[WK[key]]}`;
  }
}
/** rate = rolling coin income in cents/s (layout-spec §4.6b), 0 = no income. */
/** `shared` (M4 on): the key of the shared PickHysteresis pick (ui/pick-hysteresis.ts); the hint then shows that row so it
 *  always matches the Farm-tab highlight (M4A-41). Omitted = stateless best-payback / cheapest rule. */
/** `star` (M41-8 F4): the key that carries ★ = goal-label.ts bestBuyMark (the same source as the UX-M4 row chip). */
export function selectGoal(s: GameState, b: Balance, rateCentsPerS: number, shared?: GoalKey | null, star?: GoalKey | null): Goal {
  const c = candidates(s, b);
  if (!c.length) return { key: null, state: 'done', label: 'All upgrades done!', status: '', costCents: 0, tab: 'workers' };
  const coins = Math.round(s.coinsCents); // coins at 2 dp vs integer cost; equal = affordable
  const aff = c.filter(x => coins >= x.costCents), ready = aff.length > 0;
  // M4-A (HoP 15:29): with the flag on, the hint follows the same best-payback rule as the Farm-tab highlight. Off = main.
  const pool = ready ? aff : c, bp = m4On(b) ? bestPaybackAmong(s, b, pool.map(x => x.key)) : null;
  const forced = m4On(b) && shared ? c.find(x => x.key === shared) : undefined;
  const t = forced ?? (bp ? pool.find(x => x.key === bp.key) : null) ?? cheapest(pool)!;
  const state: GoalState = (forced ? coins >= forced.costCents : ready) ? 'ready' : rateCentsPerS > 0 ? 'waiting' : 'noincome';
  const status = state === 'ready' ? 'Ready!' : state === 'noincome' ? '—' : fmtTimeToAfford((t.costCents - coins) / rateCentsPerS);
  // M41-8 F4 (M4 on only; flag-off keeps the AC5 labels byte-identical): ★ / % / truncation for HENS, VALUE, COLL.
  // F4-11: the % is hidden while the strip's own income rate is 0 (fresh save before the first sale).
  const parts = m4On(b) && (t.key === 'HENS' || t.key === 'VALUE' || t.key === 'COLL') ? goalLabelParts(goalLabelSpec(t.key, s, b, !!star && star === t.key, rateCentsPerS > 0)) : undefined;
  return { key: t.key, state, label: parts ? parts.text : labelFor(t.key, s, b), ...(parts ? { parts } : {}), status, costCents: t.costCents, tab: t.key === 'FARM' || t.key === 'HENS' || t.key === 'VALUE' ? 'farm' : t.key === 'COLL' ? 'collection' : 'workers' };
}
/** Anti-flicker (spec §1): without a purchase, a change of target or Ready<->Waiting is applied only after the new
 *  result held for `holdTicks` consecutive 1 Hz ticks. A purchase/hire/level change applies at once. Countdown text and
 *  Waiting<->No income always update (same target, not a Ready toggle). */
export class GoalHold {
  shown: Goal | null = null; private pending: string | null = null; private n = 0;
  constructor(private holdTicks = 2) {}
  private sig = (g: Goal) => `${g.key}|${g.state === 'ready' ? 'R' : g.state === 'done' ? 'D' : 'W'}`;
  tick(next: Goal, immediate = false): Goal {
    if (!this.shown || immediate || this.sig(next) === this.sig(this.shown)) { this.shown = next; this.pending = null; this.n = 0; return next; }
    const s = this.sig(next);
    if (s === this.pending) this.n++; else { this.pending = s; this.n = 1; }
    if (this.n >= this.holdTicks) { this.shown = next; this.pending = null; this.n = 0; }
    return this.shown;
  }
}
const UNIT: Record<string, string> = { s: 'second', min: 'minute', h: 'hour' };
/** "~1 min 5 s" -> "1 minute 5 seconds" (B3: singular for 1). */
export const spokenDuration = (status: string) =>
  status.replace('~', '').replace(/(\d+)\s*(min|s|h)\b/g, (_, n: string, u: string) => `${n} ${UNIT[u]}${n === '1' ? '' : 's'}`).trim();
/** B3 sentence. Since m4a-spec v1.25 F4-14a + the Art 2.5.3 ruling it is the #goal accessible DESCRIPTION
 *  (aria-describedby → #goalDesc) for every target, and the live-region text; the name is the visible text.
 *  `spell` (M4 on; Art final call on #62): non-F4 labels spell `L{n}` out, `Farm L2` → `Next goal: Farm level 2. …`,
 *  like the F4 sentences. Flag-off (spell = false) keeps the AC5 sentence byte-identical. */
export const goalAria = (g: Goal, spell = false) => g.state === 'done' ? 'Next goal: all upgrades done.' :
  `Next goal: ${g.parts ? g.parts.aria : (spell ? g.label.replace(/\bL(\d+)\b/, 'level $1') : g.label).replace(':', ',')}. ${g.state === 'ready' ? 'Ready now.' : g.state === 'noincome' ? 'Sell eggs to earn coins.' : `Ready in about ${spokenDuration(g.status)}.`}`;
