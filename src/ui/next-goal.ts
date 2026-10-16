/** M3-AC5 next-goal hint — rc1 clarity: target = bestBuy; 5 s / 10% hysteresis (replaces GoalHold). */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { coopTier } from '../sim/state';
import { fmtAffordableIn } from './format';
import { bestBuy, bestBuyNeedsRefill, optionGain, options as buyOptions, type BuyKey, BUY_ORDER } from '../econ/best-buy';
import { incomePerSec, secondsToAffordSteady } from '../econ/income';

export type GoalKey = BuyKey;
export type GoalState = 'ready' | 'waiting' | 'noincome' | 'done' | 'refill';
export const GOAL_ORDER: GoalKey[] = BUY_ORDER;

export interface Candidate { key: GoalKey; costCents: number; }
export interface Goal {
  key: GoalKey | null;
  state: GoalState;
  label: string;
  status: string;
  costCents: number;
  tab: 'farm' | 'collection' | 'workers';
  payback: number;
  pct: number;
}

export function candidates(s: GameState, b: Balance): Candidate[] {
  return buyOptions(s, b).map(o => ({ key: o.key, costCents: Math.round(o.cost * 100) }));
}

const WNAME = { market_hand: 'Market Hand', coop_hand: 'Coop Hand', hawker: 'Hawker' } as const;
const WK = { W1: 'market_hand', W2: 'coop_hand', W3: 'hawker' } as const;

export function farmLabel(F: number, b: Balance): string {
  const n = F + 1;
  const w = (['market_hand', 'coop_hand', 'hawker'] as const).find(id => b.workers[id].unlock_farm === n);
  const k = b.workers.grader.tiers.findIndex(t => t.farm === n);
  const suffix = w ? `: unlock ${WNAME[w]}` : coopTier(n) !== coopTier(F) ? ': new coop' : k >= 0 ? `: Grader tier ${k + 1}` : '';
  return `Farm L${n}${suffix}`;
}

function trackName(key: GoalKey): string {
  switch (key) {
    case 'FARM': return 'Farm';
    case 'COLL': return 'Collection';
    case 'W4': return 'Grader';
    default: return WNAME[WK[key]];
  }
}

function levelFor(key: GoalKey, s: GameState): number {
  switch (key) {
    case 'FARM': return s.farmLevel + 1;
    case 'COLL': return s.collectionLevel + 1;
    case 'W4': return (s.workers.grader ? s.graderTier : 0) + 1;
    default: return 1;
  }
}

export function labelFor(key: GoalKey, s: GameState, _b: Balance, pct: number): string {
  if (key === 'FARM' || key === 'COLL') return `★ ${trackName(key)} L${levelFor(key, s)} · +${pct}% income`;
  if (key === 'W4') return `★ Grader tier ${levelFor(key, s)} · +${pct}% income`;
  return `★ Hire ${trackName(key)} · +${pct}% income`;
}

function tabFor(key: GoalKey): Goal['tab'] {
  return key === 'FARM' ? 'farm' : key === 'COLL' ? 'collection' : 'workers';
}

function goalFrom(key: GoalKey, s: GameState, b: Balance, payback: number): Goal {
  const coins = Math.round(s.coinsCents);
  const opt = buyOptions(s, b).find(o => o.key === key);
  if (!opt) return { key: null, state: 'done', label: 'All upgrades done!', status: '', costCents: 0, tab: 'workers', payback: Infinity, pct: 0 };
  const costCents = Math.round(opt.cost * 100);
  const base = incomePerSec(s, b, { assumeWorking: true });
  const gain = optionGain(s, b, key)?.gain ?? 0;
  const pct = base > 0 && gain > 0 ? Math.round(100 * gain / base) : 0;

  if (bestBuyNeedsRefill(s, b, key)) {
    return { key, state: 'refill', label: `★ ${trackName(key)} · Refill`, status: 'Refill', costCents, tab: 'workers', payback, pct };
  }
  const ready = coins >= costCents;
  const inc = incomePerSec(s, b);
  const secs = ready ? 0 : secondsToAffordSteady(s, b, costCents - coins);
  const state: GoalState = ready ? 'ready' : (secs === null || inc <= 0) ? 'noincome' : 'waiting';
  const status = state === 'ready' ? 'Ready!' : state === 'noincome' ? '—' : fmtAffordableIn(secs);
  return { key, state, label: labelFor(key, s, b, pct), status, costCents, tab: tabFor(key), payback, pct };
}

/** `_rate` ignored — steady-state incomePerSec is the only source (UC13). */
export function selectGoal(s: GameState, b: Balance, _rate?: number): Goal {
  // If a hired worker is asleep/unpaid and live income ≤ 0, point at Refill (Engineering decision).
  const live = incomePerSec(s, b);
  if (live <= 0) {
    for (const [key, id] of [['W1', 'market_hand'], ['W2', 'coop_hand'], ['W3', 'hawker'], ['W4', 'grader']] as const) {
      const w = s.workers[id];
      if (w && bestBuyNeedsRefill(s, b, key)) {
        return { key, state: 'refill', label: `★ ${id === 'grader' ? 'Grader' : trackName(key)} · Refill`, status: 'Refill', costCents: 0, tab: 'workers', payback: 0, pct: 0 };
      }
    }
  }
  const pick = bestBuy(s, b);
  if (!pick) return { key: null, state: 'done', label: 'All upgrades done!', status: '', costCents: 0, tab: 'workers', payback: Infinity, pct: 0 };
  const pb = Number.isFinite(pick.payback) ? pick.payback : (pick.bundlePayback ?? Infinity);
  return goalFrom(pick.key, s, b, pb);
}

/** 5 s re-pick with 10% hysteresis (HoP D3 / UC6). Purchase → immediate. */
export class GoalHysteresis {
  shown: Goal | null = null;
  private lastEval = -Infinity;
  constructor(private periodMs = 5000) {}
  tick(s: GameState, b: Balance, nowMs: number, immediate = false): Goal {
    const due = immediate || !this.shown || nowMs - this.lastEval >= this.periodMs;
    if (!due && this.shown?.key) {
      if (!buyOptions(s, b).some(o => o.key === this.shown!.key)) {
        this.lastEval = nowMs;
        this.shown = selectGoal(s, b);
        return this.shown;
      }
      this.shown = goalFrom(this.shown.key, s, b, this.shown.payback);
      return this.shown;
    }
    this.lastEval = nowMs;
    const next = selectGoal(s, b);
    if (!this.shown || immediate || !this.shown.key || !next.key) { this.shown = next; return next; }
    if (this.shown.key === next.key) { this.shown = next; return next; }
    const curPb = this.shown.payback, newPb = next.payback;
    if (Number.isFinite(newPb) && Number.isFinite(curPb) && newPb <= 0.9 * curPb) { this.shown = next; return next; }
    if (!Number.isFinite(curPb) && Number.isFinite(newPb)) { this.shown = next; return next; }
    this.shown = goalFrom(this.shown.key, s, b, this.shown.payback);
    return this.shown;
  }
}

/** Legacy name: tests that constructed GoalHold(2) still compile; hysteresis API differs. */
export class GoalHold {
  shown: Goal | null = null;
  private pending: string | null = null;
  private n = 0;
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
export const spokenDuration = (status: string) =>
  status.replace('~', '').replace(/(\d+)\s*(min|s|h)\b/g, (_, n: string, u: string) => `${n} ${UNIT[u]}${n === '1' ? '' : 's'}`).trim();

export const goalAria = (g: Goal) => g.state === 'done' ? 'Next goal: all upgrades done.' :
  g.state === 'refill' ? `Next goal: refill ${g.key ?? 'worker'}.` :
  `Next goal: ${g.label.replace(':', ',')}. ${g.state === 'ready' ? 'Ready now.' : g.state === 'noincome' ? 'Sell eggs to earn coins.' : g.status.startsWith('Affordable') ? `${g.status}.` : `Affordable in about ${spokenDuration(g.status)}.`}`;
