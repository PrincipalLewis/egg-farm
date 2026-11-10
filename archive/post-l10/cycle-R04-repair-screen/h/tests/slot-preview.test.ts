// art-ux/m3-customer-queue-spec.md §6 / QA 20: Farm row next-level preview.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { queueMax, demandRange } from '../src/sim/state';
import { slotPreview } from '../src/ui/orders';
const row = (F: number) => slotPreview(queueMax(F, b), queueMax(F + 1, b), demandRange(F, b) as [number, number], demandRange(F + 1, b) as [number, number], 'i.svg');
const text = (h: string | null) => h && h.replace(/<[^>]+>/g, '|').split('|').filter(Boolean).join('');
describe('slotPreview (§6)', () => {
  it('lead line exactly at F4, F9, F14, F19 (next = 5/10/15/20), with n -> n+1', () => {
    for (const [F, n] of [[4, 6], [9, 7], [14, 8], [19, 9]]) {
      const h = row(F)!; expect(h).toContain(`+1 customer slot<span class="m"> (${n} → ${n + 1})</span>`);
      expect(h).toContain(`aria-label="Next level: plus 1 customer slot, ${n} to ${n + 1}"`); expect(h).toContain('<img src="i.svg" alt="">');
    }
  });
  it('absent at F3, F20+ and every non-boundary level', () => {
    for (let F = 0; F < 30; F++) if (![4, 9, 14, 19].includes(F)) expect(row(F)).toBeNull();
  });
  it('order-range line from config, K formatter, omitted when unchanged', () => {
    const [a, c] = [demandRange(4, b), demandRange(5, b)];
    expect(text(row(4))).toContain(`Orders ${a[0]}–${a[1]} → ${c[0]}–${c[1]} eggs`);
    expect(slotPreview(6, 7, [1200, 2400], [1300, 2600], 'i')).toContain('Orders 1.2K–2.4K → 1.3K–2.6K eggs');
    expect(slotPreview(6, 7, [10, 20], [10, 20], 'i')).not.toContain('Orders');
  });
});
