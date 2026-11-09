// EC-2 self-tests (a) identity and (b) negative control, synthetic level (design §13). Harness-level (a)/(b) on the a8c4 CSV
// ride with the producer (identity.slow.test.ts / negative.slow.test.ts).
import { describe, it, expect } from 'vitest';
import { synthSide, refooter } from './synth';
import { compareSides, parseStream, SYNTH_LABEL, type SideData } from './compare';
import { STREAMS, type StreamId } from './record';

const pair = (o: Parameters<typeof synthSide>[0] = {}) => [synthSide({ ...o, side: 'before' }), synthSide({ ...o, side: 'after' })] as const;
/** Independent naive diff: for one seed, every (stream, line) pair with tick <= C; earliest unequal by tick then stream order. */
function naive(b: SideData, a: SideData, seed: number, C: number) {
  let best: { stream: StreamId; tick: number; k: number } | null = null;
  for (const id of STREAMS) {
    const rows = (d: SideData) => d.streams[id]!.split('\n').filter(l => l.startsWith('[') && !l.startsWith('["END"')).map(l => JSON.parse(l)).filter(r => r[1] === seed && r[2] <= C);
    const B = rows(b), A = rows(a);
    for (let k = 0; k < Math.max(B.length, A.length); k++) if (JSON.stringify(B[k]) !== JSON.stringify(A[k])) {
      const tick = Math.min(B[k]?.[2] ?? Infinity, A[k]?.[2] ?? Infinity); if (!best || tick < best.tick) best = { stream: id, tick, k: k + 1 }; break; }
  }
  return best;
}

describe('EC-2 self-test (a): identity', () => {
  it('same input twice -> MATCH_ALL, exit 0, identical trace hashes, synthetic label', () => {
    const [b, a] = pair(), v = compareSides(b, a);
    expect(v.invalid).toEqual([]); expect(v.verdict).toBe('MATCH_ALL'); expect(v.exit).toBe(0); expect(v.label).toBe(SYNTH_LABEL);
    for (const s of v.seeds) { expect(s.verdict).toBe('MATCH'); expect(s.trace_sha256_after).toBe(s.trace_sha256_before); }
    expect((b.manifest as any).per_seed.map((x: any) => x.trace_sha256)).toEqual((a.manifest as any).per_seed.map((x: any) => x.trace_sha256));
  });
  it('the cut is inclusive of the whole reach(10) tick, then nothing (cut record last for the seed)', () => {
    const [b] = pair(); const s2 = parseStream('s2', b.streams.s2, [1, 2, 3]).bySeed.get(1)!; const last = s2[s2.length - 1].rec;
    const C = (b.manifest as any).per_seed[0].i10; expect(last.slice(4)).toEqual(['cut', C, C / 10]);
    const s3 = parseStream('s3', b.streams.s3, [1, 2, 3]).bySeed.get(1)!; expect(s3[s3.length - 1].rec.slice(2, 5)).toEqual([C, expect.any(Number), 'end']);
    expect(Math.max(...s3.map(r => r.i))).toBe(C);
  });
});

describe('EC-2 self-test (b): negative control finds the FIRST divergence', () => {
  it('one injected pre-F10 change -> DIVERGED exit 1; first divergence (tick, stream, F) equals a naive diff and is <= C', () => {
    const b = synthSide({ side: 'before' }), a = synthSide({ side: 'after', inject: { seed: 2, tick: 17, delta: 1 } });
    const v = compareSides(b, a);
    expect(v.verdict).toBe('DIVERGED'); expect(v.exit).toBe(1);
    expect(v.seeds.filter(s => s.verdict === 'DIVERGED').map(s => s.seed)).toEqual([2]);
    const d = v.first_divergences[0], C = v.seeds[1].C!, nv = naive(b, a, 2, C)!;
    expect(d.tick).toBe(17); expect(d.tick).toBe(nv.tick); expect(d.stream).toBe(nv.stream); expect(d.seedLine).toBe(nv.k);
    expect(d.tick!).toBeLessThanOrEqual(C); expect(d.t).toBe(1.7); expect(d.farmLevel).toBe(2); // F from the latest before-side S3 <= tick
    expect(d.before_record).not.toEqual(d.after_record);
  });
  it('unit variant: mutate record k of one stream (footer kept valid) -> reported index === k', () => {
    for (const [id, k] of [['s1', 5], ['s3', 40], ['s4', 12], ['s2', 3]] as [StreamId, number][]) {
      const [b, a0] = pair({ seeds: [1] });
      const a: SideData = { ...a0, streams: { ...a0.streams, [id]: refooter(a0.streams[id]!, body => body.map((l, j) => { if (j !== k - 1) return l; const r = JSON.parse(l); r[r.length - 1] = 'MUT'; return JSON.stringify(r) + '\n'; })) } };
      const v = compareSides(b, a); expect(v.verdict).toBe('DIVERGED');
      const d = v.first_divergences[0]; expect(d.stream).toBe(id); expect(d.seedLine).toBe(k); expect(d.line).toBe(k);
    }
  });
  it('after reaching F10 earlier than before (truncated at its own cut) is a divergence, never MATCH', () => {
    const b = synthSide({ side: 'before', seeds: [1] }), a = synthSide({ side: 'after', seeds: [1] });
    const s1 = refooter(a.streams.s1!, body => body.slice(0, body.length - 3)); // drop the last 3 ticks of after's S1
    const v = compareSides(b, { ...a, streams: { ...a.streams, s1 } });
    expect(v.verdict).toBe('DIVERGED'); expect(v.first_divergences[0].reason).toBe('after_missing_records');
  });
  it('before without reach(10) -> UNASSESSED, exit 3', () => {
    const [b, a] = pair({ n: 30 }); const v = compareSides(b, a);
    expect(v.verdict).toBe('UNASSESSED'); expect(v.exit).toBe(3); expect(v.seeds.every(s => s.verdict === 'UNASSESSED')).toBe(true);
  });
});
