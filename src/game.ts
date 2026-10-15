import type { Balance } from './config/balance';
import { GameState, initialState, coopCapacity } from './sim/state';
import { advance } from './sim/tick';
import { apply, Action, isUpgrade } from './sim/actions';
import { applyOffline } from './sim/offline';
import type { SimEvent } from './sim/events';
import { save, load, KV } from './save/save';
import { Telemetry } from './telemetry/telemetry';
export type GameEvent = SimEvent | { type: 'coop_full'; phase: 'start' | 'end' } | { type: 'offline_grant'; eggs: number; awayS: number };
/** Glue between sim, storage and telemetry; UI only talks to this. */
export class Game {
  state: GameState; accMs = 0; lastFrameAt: number; offline = { eggs: 0, awayS: 0 };
  /** Set during "Reset save" so pagehide doesn't write the old state back. */
  resetting = false;
  /** True when no save existed at load (drives onboarding). */
  isNewGame = false;
  telemetry: Telemetry; private coopFullSince: number | null = null;
  private listeners: ((e: GameEvent) => void)[] = [];
  /** Subscribe to sim/game events (UI feedback, sfx). Returns unsubscribe. */
  on(fn: (e: GameEvent) => void) { this.listeners.push(fn); return () => { this.listeners = this.listeners.filter(f => f !== fn); }; }
  private notify(e: GameEvent) { for (const f of this.listeners) f(e); }
  constructor(private b: Balance, private kv: KV, private now = () => Date.now(), seed?: number) {
    this.telemetry = new Telemetry(kv, b.telemetry, now);
    this.telemetry.track('session_start');
    const f = load(kv, b);
    this.isNewGame = !f;
    this.state = f ? f.state : initialState(b, seed ?? ((now() & 0xffffffff) >>> 0));
    if (f) {
      // A pending grant left by the previous load (tab closed with the modal open) counts as granted: settle it first,
      // so each load produces at most one new grant.
      if (this.state.pendingOfflineEggs > 0) this.state = apply(this.state, { type: 'collectOffline' }, b);
      this.grantOffline(now() - f.savedAt); // one absence = last save -> this load, if >= 60 s
    }
    this.lastFrameAt = now();
    this.save(); // persist pending offline eggs + new timestamp so the grant never repeats for one absence
  }
  private grantOffline(gapMs: number) {
    const r = applyOffline(this.state, gapMs, this.b); this.state = r.state;
    if (r.eggs > 0) { this.offline = { eggs: r.eggs, awayS: r.awayS }; this.telemetry.track('offline_grant', { secondsAway: r.awayS, eggs: r.eggs }); }
    return r.eggs;
  }
  private emit(evs: SimEvent[]) {
    for (const e of evs) {
      this.notify(e);
      if (e.type === 'collect') this.telemetry.tap(e.eggs);
      else if (e.type === 'wage') this.telemetry.sum(`wage_${e.worker}_cents`, e.cents);
      else if (e.type === 'worker_collect') this.telemetry.sum('coop_hand_eggs', e.eggs);
      else if (e.type === 'sell' && e.by === 'market_hand') { this.telemetry.sum('market_hand_eggs', e.k); this.telemetry.sum('market_hand_cents', e.value); }
      else { const { type, ...rest } = e; this.telemetry.track(type, rest); }
    }
  }
  private checkCoopFull() {
    const full = this.state.coop >= coopCapacity(this.state.farmLevel, this.b);
    if (full && this.coopFullSince === null) { this.coopFullSince = this.now(); this.telemetry.track('coop_full', { phase: 'start' }); this.notify({ type: 'coop_full', phase: 'start' }); }
    else if (!full && this.coopFullSince !== null) { this.telemetry.track('coop_full', { phase: 'end', durationMs: this.now() - this.coopFullSince }); this.coopFullSince = null; this.notify({ type: 'coop_full', phase: 'end' }); }
  }
  save() { if (this.resetting) return; save(this.kv, this.state, this.now()); this.telemetry.flush(); }
  endSession() {
    if (this.resetting) return; this.telemetry.track('session_end'); this.save(); this.telemetry.flush(true); }
  dispatch(a: Action) {
    const ev: SimEvent[] = []; this.state = apply(this.state, a, this.b, ev); this.emit(ev); this.checkCoopFull();
    if (isUpgrade(a) || a.type === 'collectOffline' || a.type === 'dismissOffline' || a.type === 'markCelebrated') this.save();
  }
  /**
   * Wall-clock driven (robust to rAF/timer throttling). Hidden/background tabs use the same rule on the next frame:
   *  - gap < offlineMinSeconds (60 s): simulate the whole gap online (coop cap applies, customers arrive/leave).
   *  - gap >= 60 s (hidden/throttled tab): simulate the FIRST 60 s online (coop cap applies, customers arrive/leave),
   *    then freeze for the rest. No in-session offline grant.
   *  - negative gap: nothing.
   *  Closed/unloaded game: last save -> next load >= 60 s goes through the offline grant (AC11), in the constructor.
   * See engineering/sim-rules.md.
   */
  /** Debug/QA: simulate `ms` of online play immediately (same tick path as frame()). */
  debugAdvance(ms: number) {
    const ev: SimEvent[] = []; const r = advance(this.state, ms, this.accMs, this.b, ev);
    this.state = r.state; this.accMs = r.accMs; this.emit(ev); this.checkCoopFull();
  }
  /** Debug/QA: write the save as if it was made `ms` ago, and stop further saves (caller reloads). */
  debugBackdateSave(ms: number) { this.save(); save(this.kv, this.state, this.now() - ms); this.resetting = true; }
  frame() {
    const t = this.now(), gap = t - this.lastFrameAt; this.lastFrameAt = t;
    const maxMs = this.b.offline.offlineMinSeconds * 1000;
    if (gap > 0) {
      const ev: SimEvent[] = []; const r = advance(this.state, Math.min(gap, maxMs), gap >= maxMs ? 0 : this.accMs, this.b, ev);
      this.state = r.state; this.accMs = gap >= maxMs ? 0 : r.accMs; this.emit(ev);
    }
    this.checkCoopFull(); this.telemetry.poll();
  }
}
