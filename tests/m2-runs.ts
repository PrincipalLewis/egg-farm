import { balance as b } from '../src/config/balance';
import { runM2, SLOW, M2Opts, M2Result } from './bot-m2';
import { median } from './bot';
/** 20 seeds, medians (Economy validated on 100; the medians match economy_sim.py run_m2 to <= 0.1 min). */
export const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
export const runs = (o: M2Opts) => SEEDS.map(s => runM2(b, s, o));
export const med = (rs: M2Result[], f: (r: M2Result) => number | null | undefined) => median(rs.map(r => f(r) ?? Infinity));
export const min = (rs: M2Result[], L: number) => med(rs, r => r.reach.get(L)) / 60;
export { SLOW };
