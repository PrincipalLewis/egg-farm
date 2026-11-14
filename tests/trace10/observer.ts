// trace10 observer (design §5, §7): the hook set handed to run(); builds S1-S4 records through a TraceWriter. Owns no sim
// state: every GameState it sees is the harness's structuredClone; runner/V values are primitives; V is only read
// (cursor) and given a `trace` logger, which SellerVariance calls after each draw (no draw of its own).
// Never calls step/apply. Tick index i: from onTick; for onEvents (t only) i = round(t*10), valid because tickHz === 10 is asserted (G-4).
import type { Balance } from '../../src/config/balance';
import { initialState, farmCost, collectionCost, type GameState } from '../../src/sim/state';
import type { SimEvent } from '../../src/sim/events';
import { hireCostCents, graderTierCostCents, type WorkerId } from '../../src/sim/workers';
import { trackCost } from '../../src/sim/tracks';
import { candidates } from '../../src/ui/next-goal';
import type { RunOpts } from '../bot-m5';
import type { SellerVariance } from '../seller-variance';
import { TraceWriter, TraceInvalid } from './writer';
import { simEventFields, WIDS } from './record';
import { engineDraws, varianceCursor, RngCursorError, type PyCursor } from './rngcursor';
import type { AffSample } from './gaps';

export type Hooks = Required<Pick<RunOpts, 'onEvents' | 'onObserve' | 'onTick' | 'onRunnerDraw' | 'onVariance'>>;
const PICK_TRACK: Record<string, string> = { f: 'farm', c: 'collection', hens: 'hens', eggValue: 'egg_value', W1: 'market_hand', W2: 'coop_hand', W3: 'hawker', W4: 'grader' };
const W_ID: Record<string, WorkerId> = { W1: 'market_hand', W2: 'coop_hand', W3: 'hawker' };
const ACTION_OF: Record<string, string> = { f: 'buyFarm', c: 'buyCollection', hens: 'buyTrack', eggValue: 'buyTrack', W1: 'hire', W2: 'hire', W3: 'hire', W4: 'buyGraderTier' };
/** Level paid (row) BEFORE the buy, and the engine's own cost expression for it (actions.ts L42, L50, hire, grader). */
export function rowAndCost(pick: string, s: GameState, b: Balance): [number, number] {
  switch (pick) {
    case 'f': return [s.farmLevel, farmCost(s.farmLevel, b) * 100];
    case 'c': return [s.collectionLevel, collectionCost(s.collectionLevel, b) * 100];
    case 'hens': return [s.hensLevel, trackCost(s.hensLevel, 'hens', b) * 100];
    case 'eggValue': return [s.eggValueLevel, trackCost(s.eggValueLevel, 'eggValue', b) * 100];
    case 'W4': return s.workers.grader ? [s.graderTier, graderTierCostCents(s.graderTier, b)] : [0, hireCostCents('grader', b)];
    default: { const id = W_ID[pick]; if (!id) throw new TraceInvalid(`unknown pick ${pick}`); return [0, hireCostCents(id, b)]; }
  }
}
export interface SeedResult { invalid: string[]; buys: [number, string, number][]; runnerDraws: number; varianceCalls: number; engineCursor: number; engineDrawsCum: number; vEnd: PyCursor | null; samples: AffSample[]; i10: number | null; t10: number | null }

/** One seed's observer. `hooks` go to run(); call `finish(n)` after run() returns. */
export class SeedObserver {
  readonly hooks: Hooks; private s: GameState; private prevCursor: number; private engineCum = 0;
  private runner = 0; private vCalls = 0; private V: SellerVariance | null = null; private curI = 0; private stepSeen = 0;
  private pending: [number, readonly SimEvent[]][] = []; readonly invalid: string[] = []; readonly buys: [number, string, number][] = [];
  private i10: number | null = null; private t10: number | null = null; private lastAff: { i: number; t: number; s: GameState } | null = null;
  readonly samples: AffSample[] = [];
  constructor(private w: TraceWriter, private seed: number, private b: Balance) {
    if (b.tickHz !== 10) throw new TraceInvalid(`tickHz ${b.tickHz} != 10: t does not identify i (G-4)`);
    this.s = initialState(b, seed); this.prevCursor = this.s.rng;
    w.beginSeed(seed);
    w.event(0, ['pause_policy', 'off_cfg_none']);
    this.hooks = {
      onVariance: V => this.onVariance(V),
      onRunnerDraw: (n, u) => { this.runner = n; this.w.rng(this.curI, 'runner', n, u); },
      onEvents: (t, evs) => this.onEvents(t, evs),
      onTick: (ph, i, t, s) => this.onTick(ph, i, t, s),
      onObserve: (kind, a, t, s) => this.onObserve(kind, a, t, s),
    };
  }
  private bad(m: string) { this.invalid.push(`seed ${this.seed}: ${m}`); }
  private onVariance(V: SellerVariance) {
    if (this.V) { this.bad('onVariance called twice'); return; }
    this.V = V; const c = varianceCursor(V);
    this.w.rng(0, 'init', ['engine', this.s.rng], ['ev', this.s.evRngState ?? null], ['br', (this.s as any).brRngState ?? null], ['runner', 0], ['variance', V.skill, c.mti, c.mtSha], ['breeds-hatch', 'engine']);
    V.trace = (kind, value) => { const k = ++this.vCalls, c2 = varianceCursor(V); this.w.rng(this.curI, 'variance', k, kind, value, c2.mti, c2.mtSha); };
  }
  private stateAt(i: number, at: string, s: GameState) {
    let d = 0; try { d = engineDraws(this.prevCursor, s.rng); } catch (e) { if (e instanceof RngCursorError) this.bad(e.message); else throw e; }
    this.engineCum += d; this.prevCursor = s.rng; this.s = s;
    this.w.state(i, at, s); if (d > 0) this.w.rng(i, 'engine', s.rng, d);
  }
  private writeEvents(i: number, evs: readonly SimEvent[]) { for (const e of evs) this.w.event(i, simEventFields(e)); }
  private onEvents(t: number, evs: readonly SimEvent[]) {
    const i = Math.round(t * 10), copy = structuredClone(evs) as SimEvent[];
    if (i > this.stepSeen) this.pending.push([i, copy]); else this.writeEvents(i, copy);
  }
  private onTick(ph: 'step' | 'end', i: number, t: number, s: GameState) {
    if (ph === 'step') {
      if (i !== this.stepSeen + 1) this.bad(`tick ${i} after ${this.stepSeen}`);
      this.curI = i; this.stepSeen = i; this.w.tick(i, t);
      this.stateAt(i, 'step', s);
      for (const [pi, evs] of this.pending) { if (pi !== i) this.bad(`step events for tick ${pi} at ${i}`); this.writeEvents(i, evs); } this.pending = [];
      this.lastAff = { i, t, s };
      return;
    }
    if (i !== this.curI) this.bad(`end ${i} != current ${i}`);
    this.sample();
    this.stateAt(i, 'end', s);
    this.w.rng(i, 'tick', s.rng, this.engineCum, this.runner, this.vCalls, s.evRngState ?? null, (s as any).brRngState ?? null);
    if (this.i10 !== null && i === this.i10 && this.w.recording) this.w.cut(i, this.i10, this.t10);
  }
  /** EC-1 affordability sample at integer seconds: the state of harness L191 = last of {step, after:collect} in the tick. */
  private sample() {
    const a = this.lastAff; if (!a || Math.abs(a.t - Math.round(a.t)) >= 1e-6) return;
    const s = a.s, inR = s.farmLevel >= 10 && s.farmLevel < this.b.maxLevel;
    this.samples.push({ t: a.t, F: s.farmLevel, aff: !inR || candidates(s, this.b).some(c => s.coinsCents >= c.costCents) });
    this.lastAff = null;
  }
  private onObserve(kind: 'action' | 'buyCheck', a: string, t: number, s: GameState) {
    const i = this.curI; if (Math.round(t * 10) !== i) this.bad(`observe t ${t} outside tick ${i}`);
    const prev = this.s;
    if (kind === 'buyCheck') { this.w.event(i, ['buyCheck']); this.stateAt(i, 'after:buyCheck', s); return; }
    if (a === 'collect') { this.w.event(i, ['collect_action']); this.stateAt(i, 'after:collect', s); this.lastAff = { i, t, s }; return; }
    if (a === 'sellAll') { this.w.event(i, ['sellAll']); this.stateAt(i, 'after:sellAll', s); return; }
    if (a === 'manage' || a === 'manageAll') {
      const targets = WIDS.filter(id => s.workers[id] && prev.workers[id] && s.workers[id]!.energy !== prev.workers[id]!.energy);
      this.w.event(i, [a, targets, targets.map(id => prev.workers[id]!.energy)]); this.stateAt(i, 'after:' + a, s); return;
    }
    if (a.startsWith('buy:')) {
      const pick = a.slice(4); const [row, cost] = rowAndCost(pick, prev, this.b);
      if (s.coinsCents !== prev.coinsCents - cost) this.bad(`buy ${pick} at tick ${i}: coinsAfter ${s.coinsCents} != ${prev.coinsCents} - ${cost}`);
      const newLevel = pick === 'f' ? s.farmLevel : pick === 'c' ? s.collectionLevel : pick === 'hens' ? s.hensLevel : pick === 'eggValue' ? s.eggValueLevel : pick === 'W4' ? s.graderTier : 1;
      this.w.event(i, ['buy', pick, ACTION_OF[pick], PICK_TRACK[pick], row, cost, prev.coinsCents, s.coinsCents, newLevel]);
      for (const id of WIDS) if (s.workers[id] && !prev.workers[id]) this.w.event(i, ['hire', id, cost]);
      if (s.graderTier !== prev.graderTier) this.w.event(i, ['grader_tier', s.graderTier, cost]);
      this.buys.push([i, pick, row]);
      this.stateAt(i, 'after:' + a, s);
      if (pick === 'f' && s.farmLevel === 10 && this.i10 === null) { this.i10 = i; this.t10 = t; }
      return;
    }
    this.w.event(i, ['other_action', a]); this.stateAt(i, 'after:' + a, s); // recorded, never dropped
  }
  /** After run(): close the trace (cut null if no F10 by T) and summarise. */
  finish(n: number): SeedResult {
    if (this.stepSeen !== n) this.bad(`saw ${this.stepSeen} ticks, expected ${n} (onTick hook missing? G-1/G-2)`);
    if (!this.V) this.bad('onVariance never called (hook missing? G-2)');
    if (this.pending.length) this.bad('undelivered step events');
    if (this.w.recording) this.w.cut(n, null, null);
    this.w.endSeed();
    return { invalid: this.invalid, buys: this.buys, runnerDraws: this.runner, varianceCalls: this.vCalls, engineCursor: this.prevCursor, engineDrawsCum: this.engineCum, vEnd: this.V ? varianceCursor(this.V) : null, samples: this.samples, i10: this.i10, t10: this.t10 };
  }
}
