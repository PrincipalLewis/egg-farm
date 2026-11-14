// trace10 stream writer for one (side, profile): per-seed shared seq counter over S2+S3+S4 (§5), cut rule (§4: records of
// ticks 1..i10 inclusive incl. the 'end' record, then the cut record; nothing after), footers, per-seed trace hash (§6),
// rolling chain every 1000 lines (localisation aid only). Used by the producer and by the synthetic self-tests alike.
import type { GameState } from '../../src/sim/state';
import { STREAMS, STREAM_FILE, line, tickRec, eventRec, stateRec, rngRec, footerRec, type StreamId, type Rec } from './record';
import { sha256 } from './encode';
import type { StreamInfo } from './manifest';

export class TraceInvalid extends Error {}
export interface SeedSummary { seed: number; i10: number | null; t10: number | null; trace_sha256: string; records: number }
export class TraceWriter {
  private lines: Record<StreamId, string[]> = { s1: [], s2: [], s3: [], s4: [] };
  private seedLines: Record<StreamId, string[]> = { s1: [], s2: [], s3: [], s4: [] };
  private chain: Record<StreamId, string[]> = { s1: [], s2: [], s3: [], s4: [] };
  private chainH: Record<StreamId, string> = { s1: '', s2: '', s3: '', s4: '' };
  private seed: number | null = null; private seq = 0; private closed = false;
  readonly seeds: number[] = []; readonly summaries: SeedSummary[] = []; readonly nonFinite: string[] = [];
  private nf = (v: number) => { this.nonFinite.push(`seed ${this.seed}: non-finite ${v}`); };
  beginSeed(seed: number) { if (this.seed !== null) throw new Error('beginSeed: previous seed not ended'); this.seed = seed; this.seq = 0; this.closed = false; this.seeds.push(seed); for (const s of STREAMS) this.seedLines[s] = []; }
  /** True once the cut record was written: the producer keeps simulating but records nothing more (§4.6). */
  get recording() { return this.seed !== null && !this.closed; }
  private put(s: StreamId, r: Rec) { if (!this.recording) return; const l = line(r, this.nf); this.lines[s].push(l); this.seedLines[s].push(l);
    this.chainH[s] = sha256(this.chainH[s] + l); if (this.lines[s].length % 1000 === 0) this.chain[s].push(this.chainH[s]); }
  private next() { return ++this.seq; }
  tick(i: number, t: number) { this.put('s1', tickRec(this.seed!, i, t)); }
  event(i: number, f: readonly unknown[]) { if (this.recording) this.put('s2', eventRec(this.seed!, i, this.next(), f)); }
  state(i: number, at: string, s: GameState) { if (this.recording) this.put('s3', stateRec(this.seed!, i, this.next(), at, s, this.nf)); }
  rng(i: number, source: string, ...f: unknown[]) { if (this.recording) this.put('s4', rngRec(this.seed!, i, this.next(), source, ...f)); }
  /** Write the cut record (S2 kind 'cut') and stop recording this seed. i10 null = no F10 by T (recorded to i = n). */
  cut(i: number, i10: number | null, t10: number | null) { this.event(i, ['cut', i10, t10]); this.closed = true; this.cutAt = { i10, t10 }; }
  private cutAt: { i10: number | null; t10: number | null } | null = null;
  endSeed(): SeedSummary {
    if (this.seed === null) throw new Error('endSeed without beginSeed');
    if (!this.cutAt) throw new TraceInvalid(`seed ${this.seed}: no cut record`);
    let all = '', n = 0; for (const s of STREAMS) { all += this.seedLines[s].join(''); n += this.seedLines[s].length; }
    const sum: SeedSummary = { seed: this.seed, ...this.cutAt, trace_sha256: sha256(all), records: n };
    this.summaries.push(sum); this.seed = null; this.cutAt = null; return sum;
  }
  /** Stream file texts (body + footer) and their manifest entries. */
  finish(): { texts: Record<StreamId, string>; info: Record<StreamId, StreamInfo>; chains: Record<StreamId, string[]> } {
    if (this.seed !== null) throw new Error('finish: seed not ended');
    const texts = {} as Record<StreamId, string>, info = {} as Record<StreamId, StreamInfo>;
    for (const s of STREAMS) { const body = this.lines[s]; texts[s] = body.join('') + line(footerRec(s, body, this.seeds));
      info[s] = { file: STREAM_FILE[s], sha256: sha256(texts[s]), records: body.length, seeds: [...this.seeds].sort((a, b) => a - b) }; }
    return { texts, info, chains: this.chain };
  }
}
