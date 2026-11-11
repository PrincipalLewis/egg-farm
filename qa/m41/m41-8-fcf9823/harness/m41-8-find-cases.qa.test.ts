// QA: pick real shipped-data states (PR #62 fcf9823) for the browser probe, with the expected strip text / aria / chip key
// computed by the game's own pure functions (fresh DualPicker hint -> bestBuyMark -> selectGoal), so the browser can assert them.
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { selectGoal, goalAria } from '../src/ui/next-goal';
import { bestBuyMark } from '../src/ui/goal-label';
import { DualPicker } from '../src/ui/pick-hysteresis';
const b = balance as Balance, cp = (s: string) => [...s].length;
it('find', () => {
  const found: Record<string, any> = {};
  const want: [string, (g: any, star: any, s: any) => boolean][] = [
    ['hens-pct-star', (g, st) => g.key === 'HENS' && /% income$/.test(g.label) && g.label.startsWith('★')],
    ['value-pct-star-27', (g) => g.key === 'VALUE' && /% income$/.test(g.label) && g.label.startsWith('★') && cp(g.label) === 27],
    ['value-truncated-nostar', (g, st) => g.key === 'VALUE' && st === 'VALUE' && !g.label.startsWith('★') && /% income$/.test(g.label)],
    ['value-milestone', (g) => g.key === 'VALUE' && /: (Grade A|Large|Jumbo)$/.test(g.label) && g.label.startsWith('★')],
    ['value-jumbo', (g) => g.key === 'VALUE' && /: Jumbo$/.test(g.label)],
    ['hens-milestone', (g) => g.key === 'HENS' && /: bigger coop$/.test(g.label) && g.label.startsWith('★')],
    ['collection-star', (g) => g.key === 'COLL' && g.label.startsWith('★')],
    ['farm-best', (g, st) => g.key === 'FARM' && st === 'FARM'],
    ['value-lt1', (g) => g.key === 'VALUE' && /<1% income$/.test(g.label)],
    
    ['broke', (g, st, s) => s.coinsCents === 0 && !!g.parts && !st],
    ['broke-hens-short', (g, st, s) => s.coinsCents === 0 && g.key === 'HENS' && !st && cp(g.label) <= 25],
    ['broke-collection', (g, st, s) => s.coinsCents === 0 && g.key === 'COLL' && !st],
  ];
  for (let F = 0; F <= 30; F++) for (let dh = 0; dh <= 4; dh++) for (let dv = 0; dv <= 4; dv++) for (const C of [0, 1, 4, 10, F]) for (const coins of [0, 1e13]) {
    const s: any = { ...initialState(b), tracksV7: 1, farmLevel: F, hensLevel: Math.max(0, Math.min(30, F + 3 - dh)), eggValueLevel: Math.max(0, Math.min(30, F + 3 - dv)), collectionLevel: Math.min(30, C), coinsCents: coins, workers: {} };
    const hp = new DualPicker().tick(s, b, 0).hint, star = bestBuyMark(hp), g = selectGoal(s, b, 100, hp?.key, star);
    for (const [name, f] of want) if (!found[name] && f(g, star, s)) found[name] = { state: { farmLevel: s.farmLevel, hensLevel: s.hensLevel, eggValueLevel: s.eggValueLevel, collectionLevel: s.collectionLevel, coinsCents: s.coinsCents },
      key: g.key, label: g.label.replace(/\u00A0/g, ' '), labelRaw: g.label, len: cp(g.label), ariaHead: goalAria({ ...g, state: 'ready' }).replace(/ Ready now\.$/, ''), chip: star && ['FARM', 'HENS', 'VALUE', 'COLL'].includes(star) ? star : null, hint: hp, tab: g.tab };
  }
  writeFileSync(process.env.QA_OUT!, JSON.stringify(found, null, 1));
  console.log(Object.keys(found).join(','), want.filter(([n]) => !found[n]).map(([n]) => 'MISSING ' + n).join(','));
});
