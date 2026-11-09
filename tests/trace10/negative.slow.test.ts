// EC-2 self-test (b) at harness level (design §13): a8c4 with ONE rows 0-10 cell the bot reads before F10 changed. Selection
// rule: first candidate of a fixed list that builds+validates and changes exactly one balance leaf (asserted). Comparator must
// report DIVERGED (exit 1) with a first divergence equal to an independent naive line diff, at a tick <= C.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { produceProfile, balanceFromCsv, ROOT } from './producer';
import { compareSides, parseStream } from './compare';
import { STREAMS } from './record';
import { canon } from './encode';
import { PINS } from './pins';

const CARD = { path: join(ROOT, 'tests/trace10/negative.slow.test.ts'), sha1: '' };
const leaves = (x: any, p = '', o: Record<string, string> = {}) => { if (x && typeof x === 'object') { for (const k of Object.keys(x)) leaves(x[k], p ? p + '.' + k : k, o); } else o[p] = canon(x); return o; };
const CANDIDATES: [string, number][] = [['farm_cost', 5], ['customer_interval_s', 1], ['demand_max', 1], ['farm_cost', 4]];
function pickCell(csv: string) {
  const L0 = leaves(balanceFromCsv(csv)), ls = csv.split('\n'), h = ls[0].split(',');
  for (const [col, row] of CANDIDATES) {
    const c = h.indexOf(col), cells = ls[row + 1].split(','), v = Number(cells[c]); cells[c] = String(v + 1); const m = [...ls]; m[row + 1] = cells.join(',');
    try { const L1 = leaves(balanceFromCsv(m.join('\n'))); const d = [...new Set([...Object.keys(L0), ...Object.keys(L1)])].filter(k => L0[k] !== L1[k]); if (d.length === 1) return { col, row, csv: m.join('\n'), leaf: d[0] }; } catch { /* next candidate */ }
  }
  throw new Error('no negative-control cell found');
}
describe('EC-2 self-test (b): negative control, harness level', () => {
  it('one pre-F10 cell change -> DIVERGED; first divergence = naive diff; tick <= C', async () => {
    const { createHash } = await import('node:crypto'); CARD.sha1 = createHash('sha1').update(readFileSync(CARD.path)).digest('hex');
    const csv = readFileSync(join(ROOT, 'data/economy.csv'), 'utf8'), cell = pickCell(csv);
    expect([cell.col, cell.row, cell.leaf]).toEqual(['farm_cost', 5, 'farm.costTable.5']);
    const git = { commit: 'f20b91839fdf09ba0ed45a890281ccbf7bf2909d', dirty: false }, seeds = [1, 2];
    const mk = (side: 'before' | 'after', text: string) => produceProfile({ side, csvPath: side === 'before' ? 'data/economy.csv' : 'fixture:farm_cost@5+1', csvText: text, seeds, profile: 'optimal', cardPath: CARD.path, cardSha1: CARD.sha1, gitOverride: git, selftestId: 'EC-2b' });
    const b = mk('before', csv), a = mk('after', cell.csv); expect(b.invalid).toEqual([]); expect(a.invalid).toEqual([]);
    const v = compareSides(b.data!, a.data!, { cardSha1: CARD.sha1 });
    expect(v.verdict).toBe('DIVERGED'); expect(v.exit).toBe(1);
    for (const s of v.seeds) {
      expect(s.verdict).toBe('DIVERGED'); const d = s.first!; expect(d.tick!).toBeLessThanOrEqual(s.C!);
      // independent naive diff over the raw files (per stream, rows of this seed with tick <= C; earliest tick, then stream order)
      let best: { id: string; tick: number; k: number } | null = null;
      for (const id of STREAMS) {
        const rows = (t: string) => parseStream(id, t, seeds).bySeed.get(s.seed)!.filter(r => r.i <= s.C!).map(r => r.text);
        const B = rows(b.data!.streams[id]!), A = rows(a.data!.streams[id]!);
        for (let k = 0; k < Math.max(A.length, B.length); k++) if (A[k] !== B[k]) { const tick = Math.min(B[k] ? JSON.parse(B[k])[2] : Infinity, A[k] ? JSON.parse(A[k])[2] : Infinity); if (!best || tick < best.tick) best = { id, tick, k: k + 1 }; break; }
      }
      expect([d.stream, d.tick, d.seedLine]).toEqual([best!.id, best!.tick, best!.k]);
      expect(d.farmLevel).not.toBeNull(); expect(d.farmLevel!).toBeLessThanOrEqual(10); expect(d.t).toBe(d.tick! / 10);
    }
    expect(PINS.card_sha1).not.toBe(CARD.sha1); // the override was needed: fixture card is not the card of record
  }, 600_000);
});
