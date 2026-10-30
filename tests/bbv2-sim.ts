// BBv2 sim-AC drivers (spec v1.0.3 27e753d8 §7; Card #12 4a154bb4 BBV2-AC8/9/14). Shared by the unit subset (bbv2-sim.test.ts)
// and the seeds 1–200 run (bbv2-sim.slow.test.ts). Pure functions of (balance, seeds): deterministic.
import type { Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { DualPicker } from '../src/ui/pick-hysteresis';
import { bbv2Mark, meaningfulKeys } from '../src/econ/best-buy';
import { buyKeyOf } from '../src/telemetry/bbv2';
import { runBot, BUY_TRACE, STATE_TRACE } from './bot';
import { runM2 } from './bot-m2';
import { SellerVariance, VAR_DEFAULT } from './seller-variance';
import { bal } from './bbv2-fixtures';

/** BBV2-AC14 run configs (HoQA 14:38, spec v1.0.3 BB-AC14). */
export const AC14_CONFIGS = {
  'DECISIVE bestBuyV2=1 zeroGainUi=0': bal(1, { zeroGainUi: 0 }),
  'CONFIRMATORY ship bestBuyV2=1 zeroGainUi=1': bal(1, { zeroGainUi: 1 }),
} as const;
export const seeds = (a: number, z: number) => Array.from({ length: z - a + 1 }, (_, i) => a + i);

/** BBV2-AC8: fresh save, VAR_DEFAULT taps; sells at the 15 s check-in grid (`cadence: 'fixed'`, gating, as ac7-first-purchase's
 *  deterministic bot) or at VAR_DEFAULT check intervals (`'variance'`, report-only: it measures the bot's random first check-in).
 *  Per seed: time of the first non-null ★ (sim s, picker ticked every 0.1 s) and whether the first non-null hint was meaningful. */
export function ac8(b: Balance, seed: number, cadence: 'fixed' | 'variance', T = 120) {
  const V = new SellerVariance(VAR_DEFAULT, seed); let s = initialState(b, seed); const dt = 1 / b.tickHz;
  let tapT = 1, sellT = cadence === 'fixed' ? 15 : V.checkInterval(15); const P = new DualPicker(); let firstHintMeaningful: boolean | null = null;
  for (let i = 1; i <= T * b.tickHz; i++) {
    const t = Math.round(i * dt * 10) / 10; s = step(s, dt, b);
    if (t >= tapT) { tapT += V.tapInterval(); s = apply(s, { type: 'collect' }, b); }
    if (t >= sellT) { sellT = cadence === 'fixed' ? sellT + 15 : t + V.checkInterval(15); s = apply(s, { type: 'sellAll' }, b); }
    const h = P.tick(s, b, t * 1000).hint;
    if (h && firstHintMeaningful === null) firstHintMeaningful = meaningfulKeys(s, b).has(h.key);
    const m = bbv2Mark(h, s, b); if (m) return { t, key: m, meaningful: meaningfulKeys(s, b).has(m), firstHintMeaningful };
  }
  return { t: Infinity, key: null, meaningful: false, firstHintMeaningful };
}

/** The two seller15 bots of BB-AC9 / Card N3: runBot band (VAR_DEFAULT, 3600 s) and runM2 with workers (VAR_DEFAULT, 7200 s). */
const BOTS = { runBot: (b: Balance, sd: number) => runBot(b, sd, 'seller15', 3600, 15, VAR_DEFAULT), runM2: (b: Balance, sd: number) => runM2(b, sd, { model: 'seller15', T: 7200, variance: VAR_DEFAULT }) };

/** BBV2-AC9: zero-gain purchases (purchase-time verdict: key not meaningful in the state before the buy) below Farm L30. */
export function ac9(b: Balance, ss: number[]) {
  const out = { zeroGainBelow30: 0, buys: 0, perSeed: [] as { seed: number; bot: string; zg: number }[] };
  try {
    for (const sd of ss) for (const [bot, run] of Object.entries(BOTS)) {
      let zg = 0; BUY_TRACE.fn = (p, a) => { out.buys++; const k = buyKeyOf(a); if (k && p.farmLevel < 30 && !meaningfulKeys(p, b).has(k)) zg++; };
      run(b, sd); out.zeroGainBelow30 += zg; if (zg) out.perSeed.push({ seed: sd, bot, zg });
    }
  } finally { BUY_TRACE.fn = null; }
  return out;
}

/** BBV2-AC14: trace the hint (DualPicker, as app.ts renderGoal) every integer sim second of both bots. Violation = the hint is a
 *  zero-gain row while a meaningful row is offered. Also counts `suppressed` (hint !== null && mark === null, PMFU BB12) split by
 *  hint affordability, and the subset with an affordable hint below L30 (must be 0: suppression only in the post-L30 net). */
export function ac14(b: Balance, ss: number[]) {
  const out = { states: 0, violations: 0, suppressed: 0, suppressedAffordable: 0, suppressedAffordableBelow30: 0, suppressedEvents: 0, examples: [] as string[] };
  try {
    for (const sd of ss) for (const [bot, run] of Object.entries(BOTS)) {
      const P = new DualPicker();
      STATE_TRACE.fn = (t, s) => {
        out.states++; const h = P.tick(s, b, t * 1000).hint; if (!h) return;
        const m = meaningfulKeys(s, b);
        if (m.size > 0 && !m.has(h.key)) { out.violations++; if (out.examples.length < 5) out.examples.push(`${bot} seed ${sd} t ${t} F${s.farmLevel} hint ${h.key}`); }
        if (bbv2Mark(h, s, b) === null) { out.suppressed++; if (h.affordable) { out.suppressedAffordable++; if (s.farmLevel < 30) out.suppressedAffordableBelow30++; } }
      };
      run(b, sd);
    }
  } finally { STATE_TRACE.fn = null; }
  return out; // suppressedEvents: no best_buy_suppressed_zero_gain emitter exists in v5 (D-HOE-33), always 0
}
