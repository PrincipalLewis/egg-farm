import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { runBot } from './bot';
import { runM2 } from './bot-m2';
import { VAR_DEFAULT } from './seller-variance';
import { loadTargets, stepRatioGuard } from './pacing-guards';
it('m', () => {
  const ser = (m: Map<number, number>) => Object.fromEntries(m);
  const s2 = Array.from({ length: 100 }, (_, i) => i + 201), s1 = Array.from({ length: 200 }, (_, i) => i + 1);
  const nw = s2.map(s => ser(runBot(b, s, 'seller15', 3600, 15, VAR_DEFAULT).reach)), w = s2.map(s => ser(runM2(b, s, { model: 'seller15', T: 7200, variance: VAR_DEFAULT }).reach));
  const wFixed = s2.map(s => ser(runM2(b, s, { model: 'seller15', T: 7200 }).reach));
  let step: any; try { step = stepRatioGuard(s1.map(s => runM2(b, s, { model: 'seller15', T: 4 * 3600, variance: VAR_DEFAULT }).reach), loadTargets()); } catch (e) { step = String(e); }
  writeFileSync('/tmp/t3b.json', JSON.stringify({ nw, w, wFixed, step, maxLevel: b.maxLevel }));
}, 3_000_000);
