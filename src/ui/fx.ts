/**
 * Tap-combine + flying-egg budget (Collection feel tunables: tap_combine_window_ms, max_flying_eggs).
 * Pure logic; the DOM layer asks it what to spawn. Unit-tested.
 */
export interface TapFxConfig { tap_combine_window_ms: number; max_flying_eggs: number; flightMs: number }
export interface TapDecision { combine: boolean; floaterTotal: number; flyers: number }
export class TapFx {
  private lastTapAt = -Infinity; private total = 0; private flying: number[] = [];
  constructor(private cfg: TapFxConfig, private now: () => number) {}
  liveFlyers() { const t = this.now(); this.flying = this.flying.filter(end => end > t); return this.flying.length; }
  /** k = eggs collected by this tap (0 = empty coop: no flyers, no floater merge). */
  tap(k: number): TapDecision {
    const t = this.now();
    if (k <= 0) return { combine: false, floaterTotal: 0, flyers: 0 };
    const combine = t - this.lastTapAt <= this.cfg.tap_combine_window_ms;
    this.total = combine ? this.total + k : k; this.lastTapAt = t;
    const flyers = Math.max(0, Math.min(k, this.cfg.max_flying_eggs - this.liveFlyers()));
    for (let i = 0; i < flyers; i++) this.flying.push(t + this.cfg.flightMs + i * 40);
    return { combine, floaterTotal: this.total, flyers };
  }
}
/** "Queue full!" lost-customer cue: at most once per minGapMs (feel.queue_full_cue_min_gap_ms). */
export class Throttle {
  private last = -Infinity;
  constructor(private minGapMs: number, private now: () => number) {}
  ready() { const t = this.now(); if (t - this.last < this.minGapMs) return false; this.last = t; return true; }
}
/** Particles never start or end outside the safe area: clamp to the viewport minus the safe-area insets and an 8px margin. */
export function clampToSafe(p: { x: number; y: number }, w: number, h: number, inset = { t: 0, r: 0, b: 0, l: 0 }, m = 8) {
  const cl = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
  return { x: cl(p.x, inset.l + m, w - inset.r - m), y: cl(p.y, inset.t + m, h - inset.b - m) };
}
