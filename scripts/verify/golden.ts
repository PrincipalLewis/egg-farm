// VER-1: the two sim-trace goldens (GOLDEN1), recomputed by `npm run verify` and reported as pass/fail.
// The procedure is the one in engineering/golden/flagoff-golden.a01faea.test.ts (flag off, forced m4.enabled = 0) and
// engineering/golden/m4on-golden.90a9c84.test.ts (shipped, M4 on); the pins are theirs. tests/verify.test.ts checks this
// copy still matches both suites' pins, so a drift in either file fails the unit tests, not just verify.
import { createHash } from 'node:crypto';
import type { Balance } from '../../src/config/balance';
import { step } from '../../src/sim/tick';
import { initialState } from '../../src/sim/state';
import { apply } from '../../src/sim/actions';
import { applyOffline } from '../../src/sim/offline';
import { runBot } from '../../tests/bot';

export const GOLDEN_FLAG_OFF = 'f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544'; // flagoff-golden.a01faea
export const GOLDEN_M4_ON = 'a54c9cf9d6a4c967ef8fc9d2cb741ba2deab042b8cad5097b38d5c192339fda5'; // m4on-golden.90a9c84
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

/** GOLDEN1 sim trace hash. `m4` = the M4-on variant (track buys, full state in the trace). */
export function simTraceHash(b: Balance, m4: boolean): string {
  const out: unknown[] = [];
  for (const model of ['seller15', 'cheapest'] as const) for (let seed = 1; seed <= 6; seed++) {
    const r = runBot(b, seed, model, 1800); out.push([model, seed, r.firstUpgradeS, Array.from({ length: 31 }, (_, i) => [r.farmAt(i * 60), r.upgradesAt(i * 60)])]);
  }
  let s: any = { ...initialState(b, 7), coinsCents: 5_000_000 }; const ev: any[] = [];
  for (let i = 0; i < 6000; i++) {
    s = step(s, 0.1, b, ev);
    if (i % 3 === 0) s = apply(s, { type: 'collect' }, b, ev);
    if (i % 50 === 0) s = apply(s, { type: 'sellAll' }, b, ev);
    if (i % 97 === 0) s = apply(s, { type: 'buyFarm' }, b, ev);
    if (i % 131 === 0) s = apply(s, { type: 'buyCollection' }, b, ev);
    if (i % 400 === 0) for (const w of ['market_hand', 'coop_hand', 'hawker', 'grader'] as const) s = apply(s, { type: 'hire', worker: w }, b, ev);
    if (i % 700 === 0) s = apply(s, { type: 'buyGraderTier' }, b, ev);
    if (m4 && i % 113 === 0) s = apply(s, { type: 'buyTrack', track: 'hens' }, b, ev);
    if (m4 && i % 151 === 0) s = apply(s, { type: 'buyTrack', track: 'eggValue' }, b, ev);
  }
  const off = applyOffline(s, 5_400_000, b);
  if (m4) out.push(s, ev, off.eggs);
  else { const { hensLevel, eggValueLevel, celebratedMilestones, ...core } = s; void hensLevel; void eggValueLevel; void celebratedMilestones; out.push(core, ev, off.eggs); }
  return sha(JSON.stringify(out));
}

export interface GoldenResult { name: string; source: string; expected: string; actual: string; pass: boolean }
/** Both goldens on the SHIPPED balance (independent of --flags): flag off forces m4.enabled = 0, M4 on needs the shipped flag on. */
export function goldens(shipped: Balance): GoldenResult[] {
  const off = simTraceHash({ ...shipped, m4: { ...shipped.m4!, enabled: 0 } }, false);
  const res: GoldenResult[] = [{ name: 'flagOff', source: 'engineering/golden/flagoff-golden.a01faea.test.ts', expected: GOLDEN_FLAG_OFF, actual: off, pass: off === GOLDEN_FLAG_OFF }];
  if (shipped.m4?.enabled) { const on = simTraceHash(shipped, true); res.push({ name: 'm4On', source: 'engineering/golden/m4on-golden.90a9c84.test.ts', expected: GOLDEN_M4_ON, actual: on, pass: on === GOLDEN_M4_ON }); }
  else res.push({ name: 'm4On', source: 'engineering/golden/m4on-golden.90a9c84.test.ts', expected: GOLDEN_M4_ON, actual: 'skipped: shipped m4.enabled = 0', pass: false });
  return res;
}
