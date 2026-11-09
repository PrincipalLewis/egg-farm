// trace10 comparator + verdict (design §4, §10). No exclusion parameter of any kind; input-diff.json is never read here (§9).
// Exit: 0 MATCH_ALL, 1 DIVERGED, 2 usage, 3 INVALID/UNASSESSED. Never prints a PL-AC5(iii) certification: that is HoQA's.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { STREAMS, STREAM_FILE, S_FARM, type StreamId } from './record';
import { canon, sha256 } from './encode';
import { validateManifest, type Manifest } from './manifest';
import { expectedCardSha1 } from './pins';

export const SYNTH_LABEL = 'SYNTHETIC/SELFTEST — not PL-AC5(iii) evidence';
export interface SideData { manifest: unknown; streams: Partial<Record<StreamId, string>>; manifestShaErrors?: string[] }
export interface ParsedStream { body: string[]; bySeed: Map<number, { line: number; text: string; i: number; rec: unknown[] }[]> }
export interface Divergence { seed: number; profile: string; stream: StreamId | 'cut'; line: number | null; seedLine: number; tick: number | null; t: number | null; farmLevel: number | null; before_record: unknown; after_record: unknown; reason?: string }
export interface SeedVerdict { seed: number; verdict: 'MATCH' | 'DIVERGED' | 'UNASSESSED'; C: number | null; trace_sha256_before?: string; trace_sha256_after?: string; first?: Divergence }
export interface Verdict { schema: 'trace10-verdict-v1'; label: string | null; profile: string | null; verdict: 'MATCH_ALL' | 'DIVERGED' | 'INVALID' | 'UNASSESSED'; exit: 0 | 1 | 3; invalid: string[]; seeds: SeedVerdict[]; counts: Record<string, number>; first_divergences: Divergence[] }

/** Parse one JSONL stream with its footer. Throws Error(reason) on anything that makes the stream INVALID. */
export function parseStream(id: StreamId, text: string | undefined, seeds: readonly number[]): ParsedStream {
  if (text === undefined) throw new Error(`${id}: stream missing`);
  if (!text.length) throw new Error(`${id}: stream empty`);
  if (!text.endsWith('\n')) throw new Error(`${id}: not newline-terminated (truncated)`);
  const lines = text.slice(0, -1).split('\n'); const footTxt = lines.pop()!;
  let foot: unknown; try { foot = JSON.parse(footTxt); } catch { throw new Error(`${id}: footer unparsable (truncated)`); }
  if (!Array.isArray(foot) || foot[0] !== 'END') throw new Error(`${id}: footer missing`);
  if (foot[1] !== id) throw new Error(`${id}: footer names stream ${String(foot[1])}`);
  const body = lines.map(l => l + '\n');
  if (!body.length) throw new Error(`${id}: stream has no records`);
  if (foot[2] !== body.length) throw new Error(`${id}: footer count ${String(foot[2])} != ${body.length} records`);
  if (foot[4] !== sha256(body.join(''))) throw new Error(`${id}: footer body sha256 mismatch`);
  const bySeed: ParsedStream['bySeed'] = new Map();
  body.forEach((text, k) => {
    let rec: unknown; try { rec = JSON.parse(text); } catch { throw new Error(`${id}: line ${k + 1} unparsable`); }
    if (!Array.isArray(rec) || typeof rec[1] !== 'number' || typeof rec[2] !== 'number') throw new Error(`${id}: line ${k + 1} not a positional record`);
    const a = bySeed.get(rec[1]) ?? []; a.push({ line: k + 1, text, i: rec[2], rec }); bySeed.set(rec[1], a);
  });
  const fs = Array.isArray(foot[3]) ? (foot[3] as number[]) : [];
  if (canon(fs) !== canon([...bySeed.keys()].sort((a, b) => a - b))) throw new Error(`${id}: footer seeds != seeds present`);
  for (const s of seeds) if (!bySeed.has(s)) throw new Error(`${id}: seed ${s} listed in manifest but absent`);
  return { body, bySeed };
}
/** Per-seed trace hash (§6): sha256 over S1..S4 body lines with tick <= C, in stream order then file order. */
export function traceHash(ps: Record<StreamId, ParsedStream>, seed: number, C: number | null): string {
  let all = ''; for (const id of STREAMS) for (const r of ps[id].bySeed.get(seed) ?? []) if (C === null || r.i <= C) all += r.text;
  return sha256(all);
}
const sameRun = (a: Manifest, b: Manifest): string[] => {
  const e: string[] = [], eq = (x: unknown, y: unknown, k: string) => { if (canon(x) !== canon(y)) e.push(`manifests differ in ${k}`); };
  eq(a.harness?.files, b.harness?.files, 'harness.files'); eq(a.producer?.files, b.producer?.files, 'producer.files');
  eq(a.runtime, b.runtime, 'runtime'); eq(a.run?.seeds, b.run?.seeds, 'run.seeds'); eq(a.run?.profile, b.run?.profile, 'run.profile');
  eq(a.run?.T, b.run?.T, 'run.T'); eq(a.cfg?.name, b.cfg?.name, 'cfg.name'); eq(a.cfg?.stack, b.cfg?.stack, 'cfg.stack'); eq(a.cfg?.runtime_streakCap, b.cfg?.runtime_streakCap, 'cfg.runtime_streakCap');
  return e;
};
const isFullSet = (m: Manifest) => m.run.seeds.length === 200 && m.run.seeds.every((s, k) => s === k + 1);

/** Compare one profile: before vs after. Pure function of the two sides' bytes. */
export function compareSides(before: SideData, after: SideData, opt: { cardSha1?: string | null } = {}): Verdict {
  const CARD = expectedCardSha1(opt.cardSha1);
  const invalid: string[] = [];
  for (const [side, d] of [['before', before], ['after', after]] as const) {
    for (const x of validateManifest(d.manifest)) invalid.push(`${side}: ${x}`);
    for (const x of d.manifestShaErrors ?? []) invalid.push(`${side}: ${x}`);
  }
  const mb = before.manifest as Manifest, ma = after.manifest as Manifest;
  const out = (v: Verdict['verdict'], seeds: SeedVerdict[] = [], first: Divergence[] = []): Verdict => {
    const counts = { MATCH: 0, DIVERGED: 0, UNASSESSED: 0 } as Record<string, number>; for (const s of seeds) counts[s.verdict]++;
    const synth = !mb?.run || !ma?.run || mb.run.synthetic || ma.run.synthetic || !isFullSet(mb) || !isFullSet(ma);
    return { schema: 'trace10-verdict-v1', label: synth ? SYNTH_LABEL : null, profile: mb?.run?.profile ?? null, verdict: v, exit: v === 'MATCH_ALL' ? 0 : v === 'DIVERGED' ? 1 : 3, invalid, seeds, counts, first_divergences: first };
  };
  if (invalid.length) return out('INVALID');
  if (mb.side !== 'before') invalid.push('before: side != before'); if (ma.side !== 'after') invalid.push('after: side != after');
  invalid.push(...sameRun(mb, ma));
  for (const [side, m] of [['before', mb], ['after', ma]] as const) {
    if (m.inputs.card_sha1 !== CARD) invalid.push(`${side}: card is not the version of record (sha1 ${m.inputs.card_sha1 ?? 'absent'} != expected ${CARD})`);
    if (m.cfg.src_flags_on.length) invalid.push(`${side}: src flags on`);
  }
  const P: Partial<Record<'before' | 'after', Record<StreamId, ParsedStream>>> = {};
  for (const [side, d, m] of [['before', before, mb], ['after', after, ma]] as const) {
    const r = {} as Record<StreamId, ParsedStream>;
    for (const id of STREAMS) { try { r[id] = parseStream(id, d.streams[id], m.run.seeds); } catch (x) { invalid.push(`${side}: ${(x as Error).message}`); } }
    P[side] = r;
  }
  if (invalid.length) return out('INVALID');
  const pb = P.before!, pa = P.after!, prof = mb.run.profile;
  const perB = new Map(mb.per_seed.map(x => [x.seed, x])), perA = new Map(ma.per_seed.map(x => [x.seed, x]));
  const seeds: SeedVerdict[] = [], first: Divergence[] = [];
  for (const seed of mb.run.seeds) {
    const b0 = perB.get(seed), a0 = perA.get(seed);
    if (!b0 || !a0) { invalid.push(`seed ${seed} missing from per_seed`); continue; }
    if (b0.i10 === null) { seeds.push({ seed, verdict: 'UNASSESSED', C: null }); continue; }
    const C = b0.i10;
    const d = firstDivergence(pb, pa, seed, C, prof, a0.i10);
    const sv: SeedVerdict = { seed, verdict: d ? 'DIVERGED' : 'MATCH', C, trace_sha256_before: traceHash(pb, seed, C), trace_sha256_after: traceHash(pa, seed, C) };
    if (d) { sv.first = d; first.push(d); }
    seeds.push(sv);
  }
  if (invalid.length) return out('INVALID', seeds, first);
  const v = seeds.some(s => s.verdict === 'DIVERGED') ? 'DIVERGED' : seeds.some(s => s.verdict === 'UNASSESSED') ? 'UNASSESSED' : 'MATCH_ALL';
  return out(v, seeds, first);
}
/** First divergence for one seed up to C (inclusive, same C both sides). Earliest tick across S1..S4; ties -> stream order. */
export function firstDivergence(pb: Record<StreamId, ParsedStream>, pa: Record<StreamId, ParsedStream>, seed: number, C: number, profile: string, afterI10: number | null): Divergence | null {
  let best: Divergence | null = null;
  const tAt = (i: number) => { const r = (pb.s1.bySeed.get(seed) ?? []).find(x => x.i === i); return r ? (r.rec[3] as number) : null; };
  const fAt = (i: number) => { let f: number | null = null; for (const r of pb.s3.bySeed.get(seed) ?? []) { if (r.i > i) break; f = r.rec[S_FARM] as number; } return f; };
  for (const id of STREAMS) {
    const B = (pb[id].bySeed.get(seed) ?? []).filter(r => r.i <= C), A = (pa[id].bySeed.get(seed) ?? []).filter(r => r.i <= C);
    for (let k = 0; k < Math.max(B.length, A.length); k++) {
      const b = B[k], a = A[k]; if (b && a && b.text === a.text) continue;
      const tick = b && a ? Math.min(b.i, a.i) : (b ?? a)!.i;
      const reason = !a ? (afterI10 !== null && afterI10 < C ? 'after_truncated_at_own_cut' : 'after_missing_records') : !b ? 'after_extra_records' : undefined;
      const d: Divergence = { seed, profile, stream: id, line: b?.line ?? null, seedLine: k + 1, tick, t: tAt(tick), farmLevel: fAt(tick), before_record: b?.rec ?? null, after_record: a?.rec ?? null, ...(reason ? { reason } : {}) };
      if (!best || tick < (best.tick ?? Infinity)) best = d;
      break;
    }
  }
  return best;
}

// ---- disk I/O (thin) ----
/** Read OUT/<side>/<prof>/ : manifest.json + 4 streams; verify OUT/<side>/MANIFEST.sha256 entries for this profile. */
export function readSide(sideDir: string, prof: string): SideData {
  const dir = join(sideDir, prof), streams: SideData['streams'] = {}, errs: string[] = [];
  let manifest: unknown = null;
  try { manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')); } catch { errs.push(`${prof}/manifest.json missing or unparsable`); }
  for (const id of STREAMS) { const f = join(dir, STREAM_FILE[id]); if (existsSync(f)) streams[id] = readFileSync(f, 'utf8'); }
  const ms = join(sideDir, 'MANIFEST.sha256');
  if (!existsSync(ms)) errs.push('MANIFEST.sha256 missing'); else {
    const listed = new Map<string, string>();
    for (const l of readFileSync(ms, 'utf8').split('\n')) { const m = /^([0-9a-f]{64}) [ *](.+)$/.exec(l); if (m) listed.set(m[2], m[1]); }
    for (const f of walk(sideDir)) { const rel = relative(sideDir, f); if (rel === 'MANIFEST.sha256') continue;
      const h = listed.get(rel); if (!h) errs.push(`MANIFEST.sha256 does not list ${rel}`); else if (h !== sha256(readFileSync(f))) errs.push(`MANIFEST.sha256 mismatch for ${rel}`); listed.delete(rel); }
    for (const rel of listed.keys()) errs.push(`MANIFEST.sha256 lists missing file ${rel}`);
  }
  return { manifest, streams, manifestShaErrors: errs };
}
export function walk(d: string): string[] { const o: string[] = []; for (const n of readdirSync(d).sort()) { const p = join(d, n); if (statSync(p).isDirectory()) o.push(...walk(p)); else o.push(p); } return o; }
