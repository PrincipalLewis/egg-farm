/** Offline popup v2 ("Welcome back"), product/collection/offline-popup-v2-spec.md v0.3 §2. Pure copy model; unit-tested. */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { eggsPerSec } from '../sim/state';
import { saleValueCents } from '../sim/payout';
import { fmtDuration, fmtEggsFull, fmtMoneyFull, moneyWords } from './format';
export interface WelcomeModel {
  title: string; lineA: string; capped: boolean; hero: string; sub: string; worth: string; worthCents: number;
  rate: string; capLine: string | null; aria: string; button: string;
}
/** eggs = pending grant; awayS = REAL elapsed seconds (never clamped to the cap). */
export function welcomeModel(eggs: number, awayS: number, s: GameState, b: Balance): WelcomeModel {
  const capS = b.offline.offlineCapSeconds, capped = awayS >= capS, cap = fmtDuration(capS), capW = fmtDuration(capS, true);
  const n = fmtEggsFull(eggs), unit = eggs === 1 ? 'egg' : 'eggs';
  // C-AC30: N x the current per-egg sale price incl. Collection + Grader (the one payout function); no frenzy/streak/ad.
  const worthCents = saleValueCents(s, eggs, b), worth = fmtMoneyFull(worthCents);
  const perMin = eggsPerSec(s.farmLevel, b) * b.offline.offlineRateMultiplier * 60;
  const pct = Math.round(b.offline.offlineRateMultiplier * 100);
  const rateN = perMin >= 10 ? Math.round(perMin).toLocaleString('en-US') : (+perMin.toFixed(1)).toLocaleString('en-US');
  const lineA = `Away ${fmtDuration(awayS)}${capped ? ` · capped at ${cap}` : ''}`;
  const capLine = capped ? `Offline limit is ${cap}. Check in sooner to earn more.` : null;
  const aria = `Welcome back. Away ${fmtDuration(awayS, true)}${capped ? `, capped at ${capW}` : ''}. Plus ${n} ${unit} added to your basket. `
    + `Worth up to ${moneyWords(worthCents)} when sold.${capped ? ` Offline limit is ${capW}.` : ''}`;
  return { title: 'Welcome back!', lineA, capped, hero: `+${n} ${unit}`, sub: 'added to your basket', worth: `Worth up to ${worth} when sold`, worthCents,
    rate: `${rateN}/min offline · ${pct}% of your farm's rate`, capLine, aria, button: `Collect ${n} ${unit}` };
}
