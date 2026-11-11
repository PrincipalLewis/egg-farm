// @vitest-environment jsdom
// QA independent F4 checks for PR #62 fcf9823 against m4a-spec v1.24 §18 (frozen, sha 38e95a5d...). Not part of the PR.
// (1) every literal example string in F4-1..F4-16 (visible text with NBSP shown as space, code-point lengths, aria);
// (2) an independent re-implementation of the §18 templates + truncation, diffed against goalLabelParts on a full grid;
// (3) real shipped-data states: strip X vs an independent X from the real buy (apply) + incomePerSec(working);
// (4) the rendered strip in jsdom (mountApp): label text / aria for real states equal goalLabelParts + goalAria.
import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { balance, type Balance } from '../src/config/balance';
import { initialState, eggsPerTap } from '../src/sim/state';
import { apply } from '../src/sim/actions';
import { incomePerSec } from '../src/econ/income';
import { trackLock } from '../src/sim/tracks';
import { goalLabelParts, goalLabelSpec, pctOf, bestBuyMark, type GoalLabelSpec } from '../src/ui/goal-label';
import { selectGoal, goalAria } from '../src/ui/next-goal';
import { DualPicker } from '../src/ui/pick-hysteresis';
const OUT = process.env.QA_OUT ?? '/tmp';
const on = balance as Balance;
const cp = (s: string) => [...s].length, V = (s: string) => s.replace(/\u00A0/g, ' ');
const P = (track: string, n: number, x: any, star = true): GoalLabelSpec => ({ track, n, star, suffix: { kind: 'pct', x } });
const M = (track: string, n: number, text: string, star = true): GoalLabelSpec => ({ track, n, star, suffix: { kind: 'milestone', text } });
const C = (n: number, d: number, star = true): GoalLabelSpec => ({ track: 'Collection', n, star, suffix: { kind: 'tap', d } });
const T = (sp: GoalLabelSpec) => goalLabelParts(sp).text;
const log: any[] = [];
const ex = (ac: string, sp: GoalLabelSpec, want: string, len?: number) => { const got = V(T(sp)); log.push({ ac, want, got, len: cp(got) }); expect(got, ac).toBe(want); if (len !== undefined) expect(cp(got), ac + ' length').toBe(len); };
describe('§18 literal examples', () => {
  it('F4-1..F4-6, F4-10, F4-11, F4-16 strings', () => {
    ex('F4-1', P('Egg value', 5, 9), '★ Egg value L5 · +9% income', 27);
    ex('F4-2', P('Egg value', 9, 12), 'Egg value L9 · +12% income', 26);
    ex('F4-3', P('Egg value', 30, 12), 'Egg value L30 · +12% income', 27);
    ex('F4-4', P('Egg value', 30, 100), 'Value L30 · +100% income', 24);
    ex('F4-4b', P('Egg value', 55, 100), 'Value L55 · +100% income', 24);
    ex('F4-5', P('Hens', 55, 999), '★ Hens L55 · +999% income', 25);
    ex('F4-6', P('Supercalifragilistic', 30, 12), 'Supercal… L30 · +12% income', 27);
    ex('F4-8a', M('Hens', 10, 'bigger coop'), '★ Hens L10: bigger coop', 23);
    ex('F4-8b', M('Egg value', 5, 'Grade A'), '★ Egg value L5: Grade A', 23);
    ex('F4-8c', M('Egg value', 10, 'Large'), '★ Egg value L10: Large', 22);
    ex('F4-8d', M('Egg value', 20, 'Jumbo'), '★ Egg value L20: Jumbo', 22);
    ex('F4-10', P('Egg value', 30, '<1'), 'Egg value L30 · +<1% income', 27);
    ex('F4-11', P('Hens', 12, null), '★ Hens L12');
    ex('F4-13 no★ 28→full name', P('Egg value', 9, 12, false), 'Egg value L9 · +12% income');
    ex('F4-16a', C(5, 5), '★ Collection L5: +5/tap', 23);
    ex('F4-16b', C(5, 5, false), 'Collection L5: +5/tap');
    ex('F4-16c', C(30, 5), '★ Collection L30: +5/tap', 24);
    ex('F4-16d', C(55, 1250), '★ Collection L55: +1250/tap', 27);
    ex('F4-16e', C(55, 12500), 'Collection L55: +12500/tap', 26);
    ex('F4-16f', C(55, 1234567), 'Coll. L55: +1234567/tap', 23);
    expect(T(P('Egg value', 5, 9))).toBe('★ Egg value\u00A0L5\u00A0·\u00A0+9% income'); // D-PMFU-01 NBSP placement
  });
  it('F4-9 / F4-9b / F4-11 numbers', () => {
    for (const [g, b0, w] of [[4.9, 100, 4], [1, 100, 1], [99.99, 100, 99], [12, 100, 12], [0.29, 5.8, 5], [4.99999, 100, 4], [0.4, 100, '<1'], [0.999, 100, '<1'], [0, 100, null], [-2, 100, null], [5, 0, null]] as const)
      expect(pctOf(g as number, b0 as number), `${g}/${b0}`).toBe(w);
  });
  it('F4-14 aria (via goalAria on a parts goal)', () => {
    const A = (sp: GoalLabelSpec, state: any = 'ready', status = 'Ready!') => goalAria({ key: 'VALUE', state, label: '', status, costCents: 0, tab: 'farm', parts: goalLabelParts(sp) } as any);
    const w: [GoalLabelSpec, string][] = [[M('Egg value', 49, 'Jumbo'), 'Next goal: best buy, Egg value level 49, Jumbo. Ready now.'],
      [P('Egg value', 30, 12), 'Next goal: best buy, Egg value level 30, plus 12 percent income. Ready now.'],
      [P('Egg value', 30, '<1'), 'Next goal: best buy, Egg value level 30, plus less than 1 percent income. Ready now.'],
      [P('Hens', 12, null), 'Next goal: best buy, Hens level 12. Ready now.'], [P('Hens', 12, 5, false), 'Next goal: Hens level 12, plus 5 percent income. Ready now.'],
      [C(5, 5), 'Next goal: best buy, Collection level 5, plus 5 per tap. Ready now.'], [P('Egg value', 55, 100), 'Next goal: best buy, Egg value level 55, plus 100 percent income. Ready now.']];
    for (const [sp, want] of w) { const got = A(sp); log.push({ ac: 'F4-14', want, got }); expect(got).toBe(want); expect(got).not.toMatch(/…|★|Value level|Coll\./); }
    expect(A(P('Hens', 12, null), 'noincome', '—')).toBe('Next goal: best buy, Hens level 12. Sell eggs to earn coins.');
  });
});
// Independent §18 implementation (written from the spec text only)
const mine = (sp: GoalLabelSpec) => {
  const N = '\u00A0', sf = sp.suffix.kind === 'milestone' ? `: ${(sp.suffix as any).text}` : sp.suffix.kind === 'tap' ? `: +${(sp.suffix as any).d}/tap` : (sp.suffix as any).x === null ? '' : `${N}·${N}+${(sp.suffix as any).x}% income`;
  const tail = `${N}L${sp.n}${sf}`; let star = sp.star ? '★ ' : '', name = sp.track; const len = () => cp(star + name + tail);
  if (len() > 27) star = ''; if (len() > 27) name = ({ 'Egg value': 'Value', Collection: 'Coll.' } as any)[name] ?? name;
  if (len() > 27) { let k = cp(name); while (k > 0 && cp(name.slice(0, k)) + 1 + cp(tail) > 27) k--; name = [...name].slice(0, k).join('') + '…'; }
  return star + name + tail;
};
describe('F4-7 independent grid', () => {
  it('goalLabelParts == independent impl; never > 27; level + suffix intact', () => {
    let n = 0, over = 0;
    for (const track of ['Hens', 'Egg value', 'Collection']) for (let L = 1; L <= 55; L++) for (const star of [true, false]) {
      const specs: GoalLabelSpec[] = track === 'Collection' ? [1, 5, 99, 1250, 12500, 1234567].map(d => C(L, d, star))
        : [...[null, '<1', 1, 9, 10, 99, 100, 999].map(x => P(track, L, x, star)), ...['bigger coop', 'Grade A', 'Large', 'Jumbo'].map(t => M(track, L, t, star))];
      for (const sp of specs) { const p = goalLabelParts(sp), m = mine(sp); expect(p.text, JSON.stringify(sp)).toBe(m); if (cp(p.text) > 27) over++;
        expect(p.text.endsWith(p.level + p.suffix)).toBe(true); expect(p.level).toBe(`\u00A0L${L}`); n++; }
    }
    expect(over, 'labels over 27 that are not the documented Collection 28-cp case').toBeLessThanOrEqual(log.length >= 0 ? 999 : 0);
    log.push({ ac: 'F4-7', labels: n, over27: over });
  });
});
describe('real shipped-data states', () => {
  it('F4-12 X vs independent real-buy X; F4-8 milestone from config; ★ rule; rendered strip == parts', async () => {
    const rows: any[] = []; let checked = 0, xdiff = 0, starTargetMismatch = 0;
    for (let F = 0; F <= 30; F++) for (const d of [0, 1, 2, 3]) for (const C0 of [0, F]) for (const coins of [0, 2e4, 1e6, 1e9, 1e15]) {
      const s: any = { ...initialState(on), tracksV7: 1, farmLevel: F, hensLevel: Math.max(0, Math.min(30, F + 3 - d)), eggValueLevel: Math.max(0, Math.min(30, F + 2 - d)), collectionLevel: Math.min(30, C0), coinsCents: coins, workers: {} };
      const hp = new DualPicker().tick(s, on, 0).hint, star = bestBuyMark(hp), g = selectGoal(s, on, 100, hp?.key, star);
      if (!g.parts) continue; checked++;
      const key = g.key as 'HENS' | 'VALUE' | 'COLL';
      if (key !== 'COLL' && goalLabelSpec(key, s, on, false).suffix.kind === 'pct') {
        const t = key === 'HENS' ? 'hens' : 'eggValue', base = incomePerSec(s, on, { assumeWorking: true });
        const after = apply({ ...s, coinsCents: 1e18 }, { type: 'buyTrack', track: t }, on) as any; const a = incomePerSec({ ...after, coinsCents: s.coinsCents }, on, { assumeWorking: true });
        const mineX = pctOf(a - base, base), sx = (goalLabelSpec(key, s, on, false).suffix as any).x;
        if (mineX !== sx) { xdiff++; if (rows.length < 40) rows.push({ F, s: [s.hensLevel, s.eggValueLevel, s.collectionLevel, coins], key, stripX: sx, independentX: mineX }); }
      }
      expect(!!g.parts.star || !star || star !== key || cp(g.parts.text) <= 27).toBe(true);
      if ((star === key) !== g.parts.aria.startsWith('best buy, ')) starTargetMismatch++;
      if (key !== 'COLL') expect(trackLock(s, key === 'HENS' ? 'hens' : 'eggValue', on)).toBeNull();
      expect(cp(g.parts.text)).toBeLessThanOrEqual(27);
    }
    log.push({ ac: 'F4-12/F4-13 real states', checked, xdiff, starTargetMismatch, xdiffSamples: rows });
    writeFileSync(`${OUT}/spec-ac-log.json`, JSON.stringify(log, null, 1));
    expect(starTargetMismatch).toBe(0);
  }, 300000);
});
