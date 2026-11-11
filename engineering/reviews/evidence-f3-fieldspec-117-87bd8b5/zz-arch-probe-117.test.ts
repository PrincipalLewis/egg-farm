// Architect probe (NOT committed): differential validateEvent, base 71375901 schema (kind obj) vs #117 87bd8b5 (EventSpec.records).
import { it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import * as H from '../src/telemetry/schema';
import * as B from '../src/telemetry/schema.base-arch';
let rs = 0x1234567; const u = () => { rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0; return rs / 2 ** 32; };
const pick = <T,>(a: readonly T[]) => a[Math.floor(u() * a.length)];
const fromPattern = (p: RegExp): string => { // sample candidates and keep matches; fallback junk
  const cands = ['abc123', 'zero_gain_purchase', 'upgrade', 'session_end', 'tap', 'HENS', 'FARM', 'P', 'A', 'B', 'P,A', 'a', 'x', 'market_hand', 'grader', '', 'Bad Key', 'zz', '0abc', 'abcdef'];
  const m = cands.filter(c => p.test(c)); return m.length ? pick(m) : 'q';
};
function gen(f: any, depth = 0): unknown {
  const r = u();
  if (f.optional && r < 0.15) return undefined;
  if (f.nullable && r < 0.3) return null;
  switch (f.kind) {
    case 'enum': case 'bucket': return pick(f.values);
    case 'bool': return u() < 0.5;
    case 'int': case 'count': { const lo = f.min ?? 0, hi = f.max ?? lo + 100; return lo + Math.floor(u() * (hi - lo + 1)); }
    case 'float': { const lo = f.min ?? 0, hi = f.max ?? lo + 50; const v = lo + u() * (hi - lo); return f.step ? Math.round(v / f.step) * f.step : v; }
    case 'str': return fromPattern(f.pattern);
    case 'arr': return Array.from({ length: Math.floor(u() * (f.maxLen + 1)) }, () => gen(f.of, depth + 1));
    case 'obj': { const o: any = {}; for (const [k, g] of Object.entries(f.fields)) { const v = gen(g, depth + 1); if (v !== undefined) o[k] = v; }
      if (f.dynamicFields) for (let i = 0; i < 3; i++) o[pick(H.EVENT_TYPES)] = gen(f.dynamicFields[0].spec); return o; }
  }
  return undefined;
}
const JUNK = [undefined, null, -1, 1.5, 'str', true, [], {}, { x: 1 }, [1], 1e12, NaN];
function mutate(e: any): any { const o = JSON.parse(JSON.stringify(e)); const ks = Object.keys(o).filter(k => k !== 'type'); const r = u();
  if (r < 0.25 && ks.length) { const k = pick(ks); const j = pick(JUNK); if (j === undefined) delete o[k]; else o[k] = j; }
  else if (r < 0.45) o[pick(['extra_field', 'Bad Key', 'capped'])] = pick(JUNK.filter(x => x !== undefined));
  else if (r < 0.75) { const nk = ks.filter(k => o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])); if (nk.length) { const k = pick(nk); const cks = Object.keys(o[k]);
    const rr = u(); if (rr < 0.4 && cks.length) { const c = pick(cks); const j = pick(JUNK); if (j === undefined) delete o[k][c]; else o[k][c] = j; } else if (rr < 0.7) o[k][pick(['zz_unknown', 'Bad Key', 'tap', 'not_an_event'])] = pick([1, -1, 'x', null, 2.5]); else o[k] = pick(JUNK.filter(x => x !== undefined)); } }
  else { for (const k of ['ts', 'sid', 'fgMs']) if (u() < 0.3) o[k] = pick(JUNK.filter(x => x !== undefined)); }
  return o; }
it('differential: identical error sets base vs head', () => {
  const out: any = { n: 0, valid: 0, invalid: 0, setDiff: 0, orderOnlyDiff: 0, byType: {}, sampleDiff: [] as any[] };
  for (let i = 0; i < 60000; i++) {
    const t = i % 3 === 0 ? 'session_summary' : i % 3 === 1 ? 'session_end' : pick(B.EVENT_TYPES);
    const spec: any = (B.EVENT_SCHEMA as any)[t]; const e: any = { type: t, ts: Math.floor(u() * 1e6), sid: 'abc123', fgMs: Math.floor(u() * 1e5) };
    for (const [k, f] of Object.entries(spec.fields)) { const v = gen(f); if (v !== undefined) e[k] = v; }
    const ev = u() < 0.5 ? e : mutate(e);
    const eb = B.validateEvent(ev), eh = H.validateEvent(ev); out.n++; if (eb.length === 0) out.valid++; else out.invalid++;
    const sb = [...eb].sort().join('\n'), sh = [...eh].sort().join('\n');
    if (sb !== sh) { out.setDiff++; if (out.sampleDiff.length < 5) out.sampleDiff.push({ ev, eb, eh }); } else if (eb.join('\n') !== eh.join('\n')) out.orderOnlyDiff++;
    out.byType[t] = (out.byType[t] ?? 0) + 1;
  }
  out.byType = { session_summary: out.byType.session_summary, session_end: out.byType.session_end, otherTypesCovered: Object.keys(out.byType).length };
  // structure checks on head
  const kinds = new Set<string>(); const walk = (f: any) => { kinds.add(f.kind); if (f.kind === 'arr') walk(f.of); };
  for (const t of H.EVENT_TYPES) { const s: any = (H.EVENT_SCHEMA as any)[t]; for (const f of Object.values(s.fields)) walk(f); for (const r of Object.values(s.records ?? {}) as any[]) { for (const f of Object.values(r.fields)) walk(f); for (const d of r.dynamicFields ?? []) walk(d.spec); } for (const d of s.dynamicFields ?? []) walk(d.spec); }
  out.headKinds = [...kinds].sort();
  out.recordOwners = H.EVENT_TYPES.filter(t => (H.EVENT_SCHEMA as any)[t].records).map(t => [t, Object.keys((H.EVENT_SCHEMA as any)[t].records)]);
  out.recordFieldOverlap = out.recordOwners.flatMap(([t, ks]: any) => ks.filter((k: string) => k in (H.EVENT_SCHEMA as any)[t].fields || ['ts', 'sid', 'fgMs', 'type'].includes(k)));
  out.versions = [B.TELEMETRY_SCHEMA_VERSION, H.TELEMETRY_SCHEMA_VERSION];
  out.typesSame = JSON.stringify(B.EVENT_TYPES) === JSON.stringify(H.EVENT_TYPES);
  out.pinnedSame = H.EVENT_TYPES.every(t => { const a: any = (B.EVENT_SCHEMA as any)[t].pinned, b: any = (H.EVENT_SCHEMA as any)[t].pinned; return typeof a === typeof b && (typeof a !== 'boolean' || a === b); });
  writeFileSync(process.env.ARCH_OUT + '/probe-differential.json', JSON.stringify(out, null, 1));
  expect(out.setDiff).toBe(0); expect(out.headKinds).not.toContain('obj');
});
