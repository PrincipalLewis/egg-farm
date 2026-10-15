import type { Balance } from './config/balance';
import { GameState, initialState, coopCapacity } from './sim/state';
import { advance } from './sim/tick';
import { apply, Action, isUpgrade } from './sim/actions';
import { applyOffline } from './sim/offline';
import type { SimEvent } from './sim/events';
import { save, load, KV } from './save/save';
import { Telemetry } from './telemetry/telemetry';
/** Glue between sim, storage and telemetry; UI only talks to this. */
export class Game {
  state: GameState; accMs = 0; lastFrameAt: number; offline = { eggs: 0, awayS: 0 };
  telemetry: Telemetry; private coopFullSince: number | null = null;
  constructor(private b: Balance, private kv: KV, private now = () => Date.now(), seed?: number) {
    this.telemetry = new Telemetry(kv, b.telemetry, now);
    this.telemetry.track('session_start');
    const f = load(kv, b);
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
      if (e.type === 'collect') this.telemetry.tap(e.eggs);
      else { const { type, ...rest } = e; this.telemetry.track(type, rest); }
    }
  }
  private checkCoopFull() {
    const full = this.state.coop >= coopCapacity(this.state.farmLevel, this.b);
    if (full && this.coopFullSince === null) { this.coopFullSince = this.now(); this.telemetry.track('coop_full', { phase: 'start' }); }
    else if (!full && this.coopFullSince !== null) { this.telemetry.track('coop_full', { phase: 'end', durationMs: this.now() - this.coopFullSince }); this.coopFullSince = null; }
  }
  save() { save(this.kv, this.state, this.now()); this.telemetry.flush(); }
  endSession() { this.telemetry.track('session_end'); this.save(); this.telemetry.flush(true); }
  dispatch(a: Action) {
    const ev: SimEvent[] = []; this.state = apply(this.state, a, this.b, ev); this.emit(ev); this.checkCoopFull();
    if (isUpgrade(a) || a.type === 'collectOffline' || a.type === 'dismissOffline') this.save();
  }
  /**
   * Wall-clock driven (robust to rAF/timer throttling). Hidden/background tabs use the same rule on the next frame:
   *  - gap < offlineMinSeconds (60 s): simulate the whole gap online (coop cap applies, customers arrive/leave).
   *  - gap >= 60 s or negative: simulate NONE online; the sim is frozen (coop, customer patience and arrival timers
   *    resume where they were). No offline grant in-session: an absence is only last save -> next load (Product
   *    2026-10-15), so hidden time earns offline eggs only if the tab is then closed/reloaded (counted from last save).
   * See engineering/sim-rules.md.
   */
  frame() {
    const t = this.now(), gap = t - this.lastFrameAt; this.lastFrameAt = t;
    if (gap < 0 || gap >= this.b.offline.offlineMinSeconds * 1000) {
      this.accMs = 0;
    } else {
      const ev: SimEvent[] = []; const r = advance(this.state, gap, this.accMs, this.b, ev);
      this.state = r.state; this.accMs = r.accMs; this.emit(ev);
    }
    this.checkCoopFull(); this.telemetry.poll();
  }
}
