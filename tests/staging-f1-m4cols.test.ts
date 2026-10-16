import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseEconomyCsv } from '../scripts/sync-economy';
// rc2 Workers staging table (product/economy.f1-m4cols.csv @ sha256 86f0e80e3593..., m4-candidate 335407db; supersedes 70009738d2d1, only change manage_prompt_threshold 0.4 -> 0.5). Live data/economy.csv untouched until merge.
const text = readFileSync(new URL('../data/staging/economy.f1-m4cols.csv', import.meta.url), 'utf8');
const rows = parseEconomyCsv(text);
// MK-33a dependency: 0.20 is the value in 70009738d2d1 (was 0.15 in 053b2ba5ad71). If MK-33a is reverted, change ONLY this constant.
// Data only: MK-33a logic (leave penalty gated by leave_attended_window_s / awake Market Hand) is NOT implemented here.
// Source: yawn_at_pct=50 and manage_prompt_threshold=0.5 approved by HoP Oct 16 23:58 (decisions.md; product/economy.md PT1-P4): yawn, Manage prompt and refill all at 50%.
const EXPECTED_SHA256 = '86f0e80e359398e3fd3061c268794054558029270cc3944ac522ef7ddbea0550';
const W2_ASLEEP_COLLECT_SHARE = 0.20;
const one = (c: string) => { expect(c in rows[0], `missing ${c}`).toBe(true); const v = rows[0][c]; for (const r of rows) expect(r[c], `${c} L${r.level}`).toBe(v); return v; };
describe('staging economy.f1-m4cols.csv (rc2 Workers columns)', () => {
  it('shape: 125 columns, 31 rows, LF only', () => {
    expect(text.includes('\r')).toBe(false);
    expect(text.split('\n')[0].split(',').length).toBe(125);
    expect(rows.length).toBe(31);
  });
  it('rc2 worker scalars are constant and match the spec', () => {
    const want: Record<string, number> = { charge_regen_s: 150, charge_cap: 2, refill_threshold_pct: 50, combo_window_s: 10, combo_boost_s: 45,
      focus_premium: 0.05, rest_recovery_mult: 0.25, start_charges: 2, nudge_rearm_farm: 5, nudge_max_dismissals: 2, yawn_at_pct: 50, manage_prompt_threshold: 0.5,
      nudge_coopfull_share: 0.5, nudge_coopfull_window_s: 300, nudge_coopfull_min_farm: 7, leave_attended_window_s: 30 };
    for (const [c, v] of Object.entries(want)) expect(one(c), c).toBe(v);
  });
  it('w2_asleep_collect_share is read from the file and matches W2_ASLEEP_COLLECT_SHARE (MK-33a)', () => {
    const raw = text.split('\n')[0].split(',').indexOf('w2_asleep_collect_share');
    expect(raw).toBeGreaterThanOrEqual(0);
    expect(one('w2_asleep_collect_share')).toBe(W2_ASLEEP_COLLECT_SHARE);
  });
  it('file sha256 matches the approved revision', () => {
    expect(createHash('sha256').update(readFileSync(new URL('../data/staging/economy.f1-m4cols.csv', import.meta.url))).digest('hex')).toBe(EXPECTED_SHA256);
  });
  it('every cell is a plain decimal; costs are safe integers', () => {
    const lines = text.split('\n').filter((l) => l.length > 0);
    const header = lines[0].split(',');
    for (const l of lines.slice(1)) {
      const cells = l.split(',');
      expect(cells.length).toBe(header.length);
      cells.forEach((c, i) => {
        expect(c, `${header[i]}: ${c}`).toMatch(/^-?\d+(\.\d+)?$/);
        if (header[i].endsWith('_cost')) expect(Number.isSafeInteger(Number(c)), `${header[i]}: ${c}`).toBe(true);
      });
    }
  });
});
