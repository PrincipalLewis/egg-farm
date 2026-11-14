// #5b: the Shift sheet stub keeps the agreed hook and exports ONLY openShiftSheet (Features replaces the module).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as sheet from '../src/ui/shift-sheet';

describe('shift-sheet stub', () => {
  it('exports only openShiftSheet(id, opener, entry), a no-op', () => {
    expect(Object.keys(sheet)).toEqual(['openShiftSheet']);
    expect(sheet.openShiftSheet.length).toBe(3);
    expect(sheet.openShiftSheet('market_hand', {} as HTMLElement, 'asleep_banner')).toBeUndefined();
    const src = readFileSync('src/ui/shift-sheet.ts', 'utf8');
    expect(src.match(/^export /gm)).toHaveLength(1);
    expect(src).toMatch(/export function openShiftSheet\(_id: WorkerId, _opener: HTMLElement, _entry: ShiftSheetEntry\): void/);
    expect(src).toMatch(/type ShiftSheetEntry = 'stall_chip' \| 'fatigue_chip' \| 'asleep_banner'/);
  });
});
describe('Art icons ship verbatim (sha1 pins)', () => {
  it.each([['ico_fatigue_zzz', 'd4709f93'], ['ico_fatigue_sweat', 'cbc1665d'], ['icon-pause', '97291783']])('%s.svg = %s', (n, sha) => {
    expect(createHash('sha1').update(readFileSync(`public/assets/${n}.svg`)).digest('hex').slice(0, 8)).toBe(sha);
  });
});
