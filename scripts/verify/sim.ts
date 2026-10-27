// VER-1 (D-CEO-20261027-02): the seeded, headless N-hour run behind `npm run verify`. Pure: no wall clock, no I/O, no Math.random.
// It drives the REAL fixed-step sim through src/sim/tick.ts advance() (the build's own accumulator, 1000 / tickHz ms per tick)
// and src/sim/actions.ts apply(), in the build's order: advance the elapsed time first, then apply the player's input.
// Profile 'idle' = the AC7 workers bot (tests/bot-m2.ts runM2, model seller15, managed, no variance), re-driven here so the
// state can be sampled at checkpoints; tests/verify.test.ts pins it to runM2 (same reach, manages, hires, tiers).
// It reads src/ and tests/ only; it changes neither.
import { createHash } from 'node:crypto';
import type { Balance } from '../../src/config/balance';
import { initialState, type GameState } from '../../src/sim/state';
import { advance } from '../../src/sim/tick';
import { apply } from '../../src/sim/actions';
import type { SimEvent } from '../../src/sim/events';
import { WORKERS, mood, showManageAll, hireCostCents, unlockFarm, graderTierCostCents, type WorkerId } from '../../src/sim/workers';
import { m4On } from '../../src/config/formulas';
import { pickBuy, pickAction, M1_KEYS } from '../../tests/bot-m4';

export const PROFILES = ['idle', 'm5x-casual'] as const;
export type Profile = typeof PROFILES[number];
/** Profiles that need code which is not on main yet. `m5x-casual` = tests/bot-m5.ts (Q-ZG-H3 port, Features 95daf662). */
export const UNAVAILABLE: Partial<Record<Profile, string>> = { 'm5x-casual': 'needs tests/bot-m5.ts (the Q-ZG-H3 casual-profile port), which is not on main yet' };
const SELL_EVERY_S = 15; // runM2 default check-in interval
const USE: readonly WorkerId[] = ['market_hand', 'coop_hand', 'hawker', 'grader'];
const WKEY = { W1: 'market_hand', W2: 'coop_hand', W3: 'hawker', W4: 'grader' } as const;

/** 1 h, then every N/4 h (only those >= 1 h), always ending at N. N < 1 h: just N. Seconds, integer. */
export function checkpointSeconds(hours: number): number[] {
  const end = Math.round(hours * 3600), set = new Set<number>([Math.min(3600, end)]);
  for (let k = 1; k <= 4; k++) { const t = Math.round((k * hours * 3600) / 4); if (t >= 3600) set.add(t); }
  set.add(end);
  return [...set].sort((a, c) => a - c);
}

export interface Checkpoint {
  hours: number; tick: number;
  eggs: { coop: number; basket: number; collected: number; sold: number };
  coinsCents: number;
  levels: { farm: number; hens: number; eggValue: number; collection: number; graderTier: number };
  workers: Partial<Record<WorkerId, { state: string; energyPct: number }>>;
}
export interface RunResult { checkpoints: Checkpoint[]; end: GameState; ticks: number; events: number; traceSha256: string; manages: number; reach: Map<number, number> }

const r3 = (x: number) => Math.round(x * 1000) / 1000;
function sample(s: GameState, b: Balance, tSec: number, ticks: number, collected: number, sold: number): Checkpoint {
  const workers: Checkpoint['workers'] = {};
  for (const id of WORKERS) { const w = s.workers[id]; if (w) workers[id] = { state: mood(w, b) ?? 'none', energyPct: r3(w.energy) }; }
  return {
    hours: r3(tSec / 3600), tick: ticks,
    eggs: { coop: r3(s.coop), basket: r3(s.basket), collected: r3(collected), sold },
    coinsCents: s.coinsCents,
    levels: { farm: s.farmLevel, hens: s.hensLevel, eggValue: s.eggValueLevel, collection: s.collectionLevel, graderTier: s.graderTier },
    workers,
  };
}

/** The seeded run. Every event of every tick and action is folded into one sha256 (the trace hash), so any change in
 *  what the sim does over the N hours moves it. */
export function runVerify(b: Balance, o: { hours: number; seed: number; profile: Profile }): RunResult {
  if (UNAVAILABLE[o.profile]) throw new Error(`profile ${o.profile} ${UNAVAILABLE[o.profile]}`);
  const cps = checkpointSeconds(o.hours), endS = cps[cps.length - 1], tickMs = 1000 / b.tickHz;
  const h = createHash('sha256'), ev: SimEvent[] = [];
  let s: GameState = initialState(b, o.seed), acc = 0, ticks = 0, events = 0, collected = 0, sold = 0, manages = 0, ci = 0;
  const reach = new Map<number, number>([[0, 0]]), out: Checkpoint[] = [];
  const drain = (t: number) => {
    for (const e of ev) {
      if (e.type === 'collect' || e.type === 'worker_collect') collected += e.eggs;
      else if (e.type === 'sell') sold += e.k;
      h.update(`${t}|${JSON.stringify(e)}\n`);
    }
    events += ev.length; ev.length = 0;
  };
  for (let t = 1; t <= endS; t++) {
    const r = advance(s, 1000, acc, b, ev); s = r.state; acc = r.accMs; ticks += r.ticks; drain(t); // build order: time, then input
    s = apply(s, { type: 'collect' }, b, ev); drain(t); // the bot taps once a second
    if (t % SELL_EVERY_S === 0) {
      s = apply(s, { type: 'sellAll' }, b, ev); drain(t);
      if (s.manageCdS <= 1e-9) { // runM2 'managed': Manage at <= manage_prompt_threshold; Manage all when enough are that low
        const low = (Object.entries(s.workers) as [WorkerId, { energy: number }][]).filter(([, w]) => w.energy <= b.workers.energy.manage_prompt_threshold * 100).sort((a, c) => a[1].energy - c[1].energy);
        if (low.length) { s = apply(s, showManageAll(s.workers, b) && low.length >= b.workers.energy.manage_all_min_workers ? { type: 'manageAll' } : { type: 'manage', worker: low[0][0] }, b, ev); manages++; drain(t); }
      }
      for (let guard = 0; guard < 200; guard++) { // runM2 buy loop, seller15, no variance
        let bought = false; const allPick = m4On(b);
        for (const w of ['market_hand', 'coop_hand', 'hawker'] as const) if (!allPick)
          if (!s.workers[w] && s.farmLevel >= unlockFarm(w, b) && s.coinsCents >= hireCostCents(w, b)) { s = apply(s, { type: 'hire', worker: w }, b, ev); bought = true; }
        const tiers = b.workers.grader.tiers;
        if (!allPick && s.graderTier < tiers.length && s.farmLevel >= tiers[s.graderTier].farm && s.coinsCents >= graderTierCostCents(s.graderTier, b)) { s = apply(s, { type: 'buyGraderTier' }, b, ev); bought = true; }
        let kind = pickBuy(s, b, 'seller15', false, [...M1_KEYS, ...(['W1', 'W2', 'W3', 'W4'] as const).filter(k => USE.includes(WKEY[k]))]);
        if (kind) { const next = apply(s, pickAction(kind), b, ev); if (next === s) kind = null; else { s = next; if (kind === 'f') reach.set(s.farmLevel, t); } }
        drain(t);
        if (!kind && !bought) break;
      }
    }
    if (t === cps[ci]) { out.push(sample(s, b, t, ticks, collected, sold)); ci++; }
  }
  h.update(`end|${JSON.stringify(s)}\n`);
  return { checkpoints: out, end: s, ticks, events, traceSha256: h.digest('hex'), manages, reach };
}

/** NaN / Infinity anywhere in the end state or a checkpoint, or a negative count / level / balance / energy. Returns the paths. */
export function badNumbers(x: unknown, path = '$', out: string[] = [], neg = true): string[] {
  if (typeof x === 'number') { if (!Number.isFinite(x)) out.push(`${path}=${x}`); else if (neg && x < 0) out.push(`${path}=${x} (negative)`); }
  else if (Array.isArray(x)) x.forEach((v, i) => badNumbers(v, `${path}[${i}]`, out, neg));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) badNumbers(v, `${path}.${k}`, out, neg);
  return out;
}
