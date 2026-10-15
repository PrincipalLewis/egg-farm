import type { Balance } from './config/balance';
import { GameState, initialState } from './sim/state';
import { advance } from './sim/tick';
import { apply, Action, isUpgrade } from './sim/actions';
import { applyOffline } from './sim/offline';
import { save, load, KV } from './save/save';
/** Glue between sim and platform; UI only talks to this. */
export class Game {
  state: GameState; accMs = 0; lastFrameAt: number; offline = { eggs: 0, awayS: 0 };
  constructor(private b: Balance, private kv: KV, private now = () => Date.now()) {
    const f = load(kv, b);
    this.state = f ? f.state : initialState(b, (now() & 0xffffffff) >>> 0);
    if (f) { const r = applyOffline(this.state, now() - f.savedAt, b); this.state = r.state; this.offline = { eggs: r.eggs, awayS: r.awayS }; }
    this.lastFrameAt = now();
    this.save(); // persist pending offline eggs + new timestamp so the modal never repeats for one absence
  }
  save() { save(this.kv, this.state, this.now()); }
  dispatch(a: Action) { this.state = apply(this.state, a, this.b); if (isUpgrade(a) || a.type === 'collectOffline') this.save(); }
  /** Wall-clock driven (robust to rAF/timer throttling). Gap < offlineMinSeconds: catch up at full online rate
   *  via normal ticks (coop cap applies). Gap >= offlineMinSeconds (or negative): offline/Basket path. */
  frame() {
    const t = this.now(), gap = t - this.lastFrameAt; this.lastFrameAt = t;
    if (gap < 0 || gap >= this.b.offline.offlineMinSeconds * 1000) {
      const r = applyOffline(this.state, gap, this.b); this.state = r.state; this.accMs = 0;
      if (r.eggs > 0) { this.offline = { eggs: r.eggs, awayS: r.awayS }; this.save(); }
      return;
    }
    const r = advance(this.state, gap, this.accMs, this.b); this.state = r.state; this.accMs = r.accMs;
  }
}
