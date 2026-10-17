/** Seller15 per-seed variance model for the AC7 bots (product/sim/seller-variance-proposal.md, sha256 17877b41; HoQA F-1).
 *  Port of `VAR_DEFAULT` / `_V` in product/sim/seller_variance_sim.py. Own seeded stream (CPython MT19937 via PyRandom),
 *  separate from the game's state RNG, so the demand stream is untouched. `undefined` variance = old deterministic bot. */
import { PyRandom } from './py-random';
export interface SellerVarianceParams {
  check_mean_s: number; check_sigma: number; check_min_s: number; check_max_s: number;
  tap_skill_sigma: number; tap_skill_lo: number; tap_skill_hi: number; tap_jitter: number;
  p_delay: number; p_cheap_first: number; poisson: boolean;
}
/** The one exported params object (proposal table; Python VAR_DEFAULT). */
export const VAR_DEFAULT: Readonly<SellerVarianceParams> = Object.freeze({
  check_mean_s: 15.0, check_sigma: 0.35, check_min_s: 5.0, check_max_s: 60.0,
  tap_skill_sigma: 0.15, tap_skill_lo: 0.6, tap_skill_hi: 1.4, tap_jitter: 0.25,
  p_delay: 0.10, p_cheap_first: 0.10, poisson: true,
});
export const varianceSeed = (seed: number) => 1_000_003 * (seed + 1) + 17;
export class SellerVariance {
  readonly r: PyRandom; readonly skill: number;
  /** optional action trace (parity tests): every stream call, in order */
  trace?: (kind: 'check' | 'tap' | 'delay' | 'cheap', value: number) => void;
  constructor(readonly v: SellerVarianceParams, seed: number) {
    this.r = new PyRandom(varianceSeed(seed));
    this.skill = Math.min(v.tap_skill_hi, Math.max(v.tap_skill_lo, this.r.lognormvariate(0, v.tap_skill_sigma)));
  }
  /** next check-in gap (s): base/15 x check_mean_s x lognormal(0, check_sigma), clamped to [check_min_s, check_max_s] */
  checkInterval(base: number): number { const m = base / 15 * this.v.check_mean_s; return this.log('check', Math.min(this.v.check_max_s, Math.max(this.v.check_min_s, m * this.r.lognormvariate(0, this.v.check_sigma)))); }
  tapInterval(): number { return this.log('tap', (1 / this.skill) * this.r.uniform(1 - this.v.tap_jitter, 1 + this.v.tap_jitter)); }
  delay(): boolean { return this.log('delay', this.r.random() < this.v.p_delay ? 1 : 0) === 1; }
  cheapFirst(): boolean { return this.log('cheap', this.r.random() < this.v.p_cheap_first ? 1 : 0) === 1; }
  private log(k: 'check' | 'tap' | 'delay' | 'cheap', v: number): number { this.trace?.(k, v); return v; }
}

/** test hook: when set, every SellerVariance built by runBot/runM2 reports its stream calls here */
export const TRACE: { fn?: SellerVariance['trace'] } = {};
