import { describe, it, expect } from 'vitest';
import { inputDiff } from './inputdiff';
const csv = (rows: string[][]) => rows.map(r => r.join(',')).join('\n') + '\n';
const H = ['level', 'farm_cost', 'combo_window_s', 'tc_streak_cap'];
const base = [H, ...Array.from({ length: 12 }, (_, L) => [String(L), String(10 + L), '5', '0.28'])];
describe('trace10 input-diff (§9)', () => {
  it('identical inputs -> empty diff, PASS', () => { const d = inputDiff(csv(base), csv(base), { a: 1 }, { a: 1 }, 'x'); expect(d.csv.cells).toEqual([]); expect(d.input_check).toBe('PASS'); });
  it('approved cap + rename + post-L10 row -> PASS; any other rows 0-10 cell -> FAIL', () => {
    const after = base.map((r, k) => k === 0 ? ['level', 'farm_cost', 'tc_combo_window_s', 'tc_streak_cap'] : k <= 11 ? [r[0], r[1], r[2], '0.27'] : r);
    after[12] = ['11', '999', '5', '0.27'];
    const d = inputDiff(csv(base), csv(after), { m4: { tc: { streak_cap: 0.28 } } }, { m4: { tc: { streak_cap: 0.27 } } }, 'x');
    expect(d.input_check).toBe('PASS'); expect(d.csv.header_renames).toEqual([{ old: 'combo_window_s', new: 'tc_combo_window_s', class: 'APPROVED_RENAME' }]);
    expect(d.balance.leaves).toEqual([{ path: 'm4.tc.streak_cap', before: 0.28, after: 0.27, class: 'APPROVED_CAP' }]);
    const bad = after.map((r, k) => k === 6 ? [r[0], '77', r[2], r[3]] : r);
    expect(inputDiff(csv(base), csv(bad), {}, {}, 'x').input_check).toBe('FAIL');
  });
});
