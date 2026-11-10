/**
 * S2-4b: one driver for sim + UI. rAF when the browser gives frames; a timer fallback runs the SAME tick whenever
 * rAF has not fired for `maxGapMs` (throttled/occluded window, DevTools device mode), so the header, the open
 * Upgrades sheet (money, ETA, buttons) and the goal chip never freeze while the sim keeps moving.
 * A throwing tick is logged and the loop keeps going (it used to stop the rAF chain for good).
 */
export interface PumpEnv { raf(cb: () => void): unknown; setInterval(cb: () => void, ms: number): unknown; now(): number; onError?(e: unknown): void }
export class RenderPump {
  private last = -Infinity; ticks = 0;
  constructor(private tick: () => void, private env: PumpEnv, public maxGapMs = 250) {}
  run() { this.last = this.env.now(); this.ticks++; try { this.tick(); } catch (e) { (this.env.onError ?? console.error)(e); } }
  start() {
    const loop = () => { this.run(); this.env.raf(loop); };
    this.env.raf(loop);
    this.env.setInterval(() => { if (this.env.now() - this.last >= this.maxGapMs) this.run(); }, this.maxGapMs / 2);
    return this;
  }
}
