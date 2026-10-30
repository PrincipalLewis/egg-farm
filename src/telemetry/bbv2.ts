import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import type { Action } from '../sim/actions';
import { m4On } from '../config/formulas';
import { bestBuyV2On } from '../config/flags';
import { meaningfulKeys, type BuyKey } from '../econ/best-buy';
import { candidates } from '../ui/next-goal';
import { trackLevel } from '../sim/tracks';

/** BBv2 field telemetry (spec v1.0.3 27e753d8 §8; source of record: PMC telemetry errata v5 rev 12 `0cfe168a` rows #19–22,
 *  V-2d; D-HOE-20261030-31/-32/-35). Built only with m4.flags.bestBuyV2 = 1 and m4.enabled (Game/app hold null otherwise,
 *  so nothing here can run, and no field is added, at flag 0: spec §5). Row #23 (SG-8) is the stopgap's and is not built (D-HOE-33). */
export interface Bbv2TelCfg { shown_min_gap_s: number; zero_gain_eta_max_s: number; dead_zone_min_s: number; zero_gain_purchase_cap: number }
export const BBV2_TEL_DEFAULTS: Bbv2TelCfg = { shown_min_gap_s: 5, zero_gain_eta_max_s: 60, dead_zone_min_s: 30, zero_gain_purchase_cap: 50 };
export const bbv2TelOn = (b: Balance) => m4On(b) && bestBuyV2On(b);
export const bbv2TelCfg = (b: Balance): Bbv2TelCfg => {
  const src = (b.telemetry.bbv2 ?? {}) as Partial<Bbv2TelCfg>, out = { ...BBV2_TEL_DEFAULTS };
  for (const k of Object.keys(out) as (keyof Bbv2TelCfg)[]) if (typeof src[k] === 'number') out[k] = src[k] as number;
  return out;
};
/** Float telemetry fields: 1 dp; Infinity/NaN -> null (null = infinite or unreachable; never the "Infinity" string). */
export const f1 = (x: number): number | null => (Number.isFinite(x) ? Math.round(x * 10) / 10 : null);
const WKEY = { market_hand: 'W1', coop_hand: 'W2', hawker: 'W3', grader: 'W4' } as const;
/** The BuyKey a purchase action buys, or null (not a Best-buy row purchase). */
export function buyKeyOf(a: Action): BuyKey | null {
  switch (a.type) {
    case 'buyFarm': return 'FARM';
    case 'buyCollection': return 'COLL';
    case 'buyTrack': return a.track === 'hens' ? 'HENS' : a.track === 'eggValue' ? 'VALUE' : null;
    case 'hire': return (WKEY as Record<string, BuyKey>)[a.worker] ?? null;
    case 'buyGraderTier': return 'W4';
    default: return null;
  }
}
const levelOf = (s: GameState, k: BuyKey) => k === 'HENS' ? trackLevel(s, 'hens') : k === 'VALUE' ? trackLevel(s, 'eggValue') : k === 'COLL' ? s.collectionLevel : k === 'FARM' ? s.farmLevel : 0;
/** Live ETA (s) of the nearest offered meaningful row: 0 if one is affordable, Infinity if none is reachable at this rate. */
export function meaningfulEtaS(s: GameState, b: Balance, rateCentsPerS: number): number {
  const m = meaningfulKeys(s, b); let best = Infinity;
  for (const c of candidates(s, b)) if (m.has(c.key)) {
    const need = c.costCents - s.coinsCents; const eta = need <= 0 ? 0 : rateCentsPerS > 0 ? need / rateCentsPerS : Infinity;
    if (eta < best) best = eta;
  }
  return best;
}
/** V-2d (2): some offered row is affordable AND meaningful (hatches are not candidates). */
export const meaningfulAffordable = (s: GameState, b: Balance) => { const m = meaningfulKeys(s, b); return candidates(s, b).some(c => m.has(c.key) && s.coinsCents >= c.costCents); };

export type Sink = (type: string, data: Record<string, unknown>) => void;
export interface ShownPick { key: BuyKey; affordable: boolean; payback: number; costCents: number }
/** UI-side context at a purchase: picker clock, the ★ key rendered right now, when ★ last switched to it, live income. */
export interface BuyCtx { t: number; mark: BuyKey | null; markSinceT: number; rateCentsPerS: number }

export class Bbv2Tel {
  private shownSig: string | null = null; private shownAt = -Infinity;
  private zgCount = 0; dropped = 0;
  private dz: { sec: number; farm: number } | null = null; private lastSec: number | null = null;
  constructor(private sink: Sink, private b: Balance, readonly cfg: Bbv2TelCfg = bbv2TelCfg(b)) {}
  /** #19: on every hint key or affordability change, at most one per shown_min_gap_s (picker clock, ms). No pick -> no event.
   *  A change inside the gap is emitted once the gap has passed if the hint still differs from the last emitted one. */
  shown(t: number, s: GameState, pick: ShownPick | null, rateCentsPerS: number) {
    if (!pick) return;
    const sig = `${pick.key}|${pick.affordable}`; if (sig === this.shownSig || t - this.shownAt < this.cfg.shown_min_gap_s * 1000) return;
    this.shownSig = sig; this.shownAt = t;
    const need = pick.costCents - s.coinsCents;
    this.sink('best_buy_shown', { key: pick.key, meaningful: meaningfulKeys(s, this.b).has(pick.key), affordable: pick.affordable,
      payback_s: f1(pick.payback), farm: s.farmLevel, eta_s: pick.affordable ? 0 : f1(need <= 0 ? 0 : rateCentsPerS > 0 ? need / rateCentsPerS : Infinity) });
  }
  /** #20/#21: a successful purchase of `key`, with the state BEFORE it. */
  purchase(before: GameState, key: BuyKey, ctx: BuyCtx) {
    if (ctx.mark !== null && key === ctx.mark) this.sink('best_buy_followed', { key, ms_since_shown: Math.max(0, Math.round(ctx.t - ctx.markSinceT)) });
    if (meaningfulKeys(before, this.b).has(key)) return; // exempt or positive gain: never zero-gain
    const eta = meaningfulEtaS(before, this.b, ctx.rateCentsPerS);
    if (!(eta <= this.cfg.zero_gain_eta_max_s)) return;
    if (this.zgCount >= this.cfg.zero_gain_purchase_cap) { this.dropped++; return; }
    this.zgCount++;
    this.sink('zero_gain_purchase', { key, farm: before.farmLevel, level: levelOf(before, key), meaningful_eta_s: f1(eta) as number });
  }
  /** #22 V-2d: call with the integer sim second just reached (after collect, before any buy). Scope 10 <= farm < maxLevel. */
  sample(sec: number, s: GameState) {
    if (this.lastSec !== null && sec <= this.lastSec) return; this.lastSec = sec;
    const F = s.farmLevel, inScope = F >= 10 && F < this.b.maxLevel;
    if (inScope && !meaningfulAffordable(s, this.b)) { if (!this.dz) this.dz = { sec, farm: F }; return; }
    this.endStretch(sec, false);
  }
  private endStretch(sec: number, open: boolean) {
    const d = this.dz; this.dz = null; if (!d) return; const len = sec - d.sec;
    if (len >= this.cfg.dead_zone_min_s) this.sink('dead_zone', { farm: d.farm, s: f1(len), reason: 'none_affordable', ...(open ? { open: true } : {}) });
  }
  /** Unload / background flush: an open stretch >= dead_zone_min_s is emitted with open:true; sampling then starts fresh. */
  flushOpen(sec: number) { this.endStretch(sec, true); this.lastSec = null; }
  /** session_end field (rev 11 M-2). */
  sessionEndFields(): Record<string, unknown> { return { zero_gain_purchase_dropped: this.dropped }; }
}
