// M41-5 (D-HOP-25, gates.md G10): unread economy.csv columns fail sync-economy --check unless allowlisted
// in product/economy/csv-column-allowlist.md (parsed at runtime). Reads are tracked through a Proxy, not grepped.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseEconomyCsv, readEconomyConfig } from '../scripts/sync-economy';
import { parseAllowlist, readAllowlist, checkColumns, trackReads, allowMatch } from '../scripts/csv-columns';
const csvText = readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8');
const prev = JSON.parse(readFileSync(new URL('../src/config/balance.json', import.meta.url), 'utf8'));
const cfg = readEconomyConfig(), allow = readAllowlist(), TODAY = '2026-10-19';
/** data/economy.csv with extra constant columns appended (name -> value on every row). */
const withCols = (extra: Record<string, number>) => {
  const [h, ...rs] = csvText.trim().split('\n'), k = Object.keys(extra);
  return parseEconomyCsv([[h, ...k].join(','), ...rs.map(r => [r, ...k.map(c => String(extra[c]))].join(','))].join('\n') + '\n');
};
const md = (rows: string) => `# t\n| column | feature | owner | expires |\n|---|---|---|---|\n${rows}\n`;
describe('csv-column allowlist (product/economy/csv-column-allowlist.md)', () => {
  it('main data/economy.csv (guard_* dropped) passes: 16 unread columns, all allowlisted, none unknown', () => {
    const r = checkColumns(parseEconomyCsv(csvText), prev, cfg, allow, TODAY);
    expect(r.errors).toEqual([]); expect(r.violations).toEqual([]); expect(r.unread).toHaveLength(16);
    expect(r.unread).toContain('market_hand_min_wait_s'); expect(r.unread).not.toContain('tc_focus_premium'); // tc_* reach balance.json
  });
  it('an unknown new column fails', () => {
    const r = checkColumns(withCols({ zz_new_knob: 1 }), prev, cfg, allow, TODAY);
    expect(r.violations).toEqual(['zz_new_knob']); expect(r.errors.join('\n')).toMatch(/zz_new_knob is not read/);
  });
  it('the dropped guard_* columns would fail again if re-added', () => {
    expect(checkColumns(withCols({ guard_heartbeat_s: 2, guard_stale_s: 6 }), prev, cfg, allow, TODAY).violations).toEqual(['guard_heartbeat_s', 'guard_stale_s']);
  });
  it('an allowlisted new column passes', () => {
    const a = [...allow, ...parseAllowlist(md('| zz_new_knob | test | QA | 2026-10-22 |'))];
    expect(checkColumns(withCols({ zz_new_knob: 1 }), prev, cfg, a, TODAY).errors).toEqual([]);
  });
  it('prefix entries match by prefix only', () => {
    const a = [...allow, ...parseAllowlist(md('| zz_pre_* | test | QA | 2026-10-22 |'))];
    const r = checkColumns(withCols({ zz_pre_a: 1, zz_pre_b: 2, zz_other: 3 }), prev, cfg, a, TODAY);
    expect(r.violations).toEqual(['zz_other']); expect(r.allowed.filter(x => x.entry.name === 'zz_pre_').map(x => x.col)).toEqual(['zz_pre_a', 'zz_pre_b']);
    const tc = allow.find(e => e.name === 'tc_')!; expect(tc.prefix).toBe(true); expect(allowMatch(tc, 'tc_anything')).toBe(true); expect(allowMatch(tc, 'xtc_a')).toBe(false);
  });
  it('expired entries warn by default and fail under strict', () => {
    const r = checkColumns(parseEconomyCsv(csvText), prev, cfg, allow, '2026-10-23');
    expect(r.errors).toEqual([]); expect(r.warnings.length).toBeGreaterThan(0); expect(r.warnings[0]).toMatch(/expired 2026-10-22/);
    expect(checkColumns(parseEconomyCsv(csvText), prev, cfg, allow, '2026-10-22').warnings).toEqual([]); // valid through the triage day
    expect(checkColumns(parseEconomyCsv(csvText), prev, cfg, allow, '2026-10-23', true).errors.join('\n')).toMatch(/expired/);
  });
  it('the allowlist is parsed from the markdown file: owner and expiry required, malformed rows fail', () => {
    expect(allow.length).toBeGreaterThanOrEqual(17); expect(allow.every(e => e.owner && /^\d{4}-\d{2}-\d{2}$/.test(e.expires))).toBe(true);
    expect(() => parseAllowlist(md('| a_col | f |  | 2026-10-22 |'))).toThrow(/owner/);
    expect(() => parseAllowlist(md('| a_col | f | QA | Oct 22 |'))).toThrow(/expires/);
    expect(() => parseAllowlist(md('| a col | f | QA | 2026-10-22 |'))).toThrow(/bad column/);
    expect(() => parseAllowlist('# no table\n')).toThrow(/no table/);
  });
  it('read tracking counts value reads only (presence checks and key listing do not)', () => {
    const read = trackReads(withCols({ zz_new_knob: 1 }), prev, cfg);
    expect(read.has('farm_cost')).toBe(true); expect(read.has('tc_focus_premium')).toBe(true); expect(read.has('zz_new_knob')).toBe(false);
  });
});
