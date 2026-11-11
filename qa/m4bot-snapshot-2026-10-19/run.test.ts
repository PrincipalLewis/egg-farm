import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { balance } from '../src/config/balance';
import { run } from './bots';
import { VAR_DEFAULT } from './seller-variance';
const M4 = process.env.M4 === '1', OUT = process.env.OUT!;
const ov = process.env.COSTS ? JSON.parse(process.env.COSTS) : null;
const m4 = { ...balance.m4!, enabled: M4 ? 1 : 0 };
if (ov) { m4.hens = { ...m4.hens, costs: m4.hens.costs.map((c, i) => ov.h[i] ?? c) }; m4.eggValue = { ...m4.eggValue, costs: m4.eggValue.costs.map((c, i) => ov.v[i] ?? c) };
  if (ov.g1) m4.milestones = { ...m4.milestones, grades: m4.milestones.grades.map((g, i) => i === 0 ? { ...g, mult: ov.g1 } : g) }; }
const b = { ...balance, m4 };
const seeds = Array.from({ length: Number(process.env.NSEEDS ?? 100) }, (_, i) => i + 1 + Number(process.env.SEEDOFF ?? 0));
it('run', () => {
  const ser = (r: ReturnType<typeof run>) => ({ reach: Object.fromEntries(r.reach), at30: r.at30, buys: r.buys, bt: r.bt });
  const out = { m4: M4, nw: seeds.map(s => ser(run(b, s, false, 3600, VAR_DEFAULT))), w: seeds.map(s => ser(run(b, s, true, 7200, VAR_DEFAULT))), wFixed: seeds.map(s => ser(run(b, s, true, 7200))) };
  writeFileSync(OUT, JSON.stringify(out));
}, 3_000_000);
