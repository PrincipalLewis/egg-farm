// pacing-x1-stack verdict: the §13.2a prediction table (Econ's pred-13.2a.csv, pinned) against one measured shard per profile.
// Rules (economy.md §13.2a AC-X1, sizing §15b): each value within ×0.8–1.2 of its prediction and every absolute gate holds;
// a blocks-merge=Y row that misses FAILS the check, an N row only WARNS. G5-P pause rows are excluded until Features delivers
// the driver (X1 note, D-HOE-20261029-05). Rows this harness cannot measure yet are listed as NOT-WIRED, never as PASS.
// Pure: no I/O, no sim. Row handlers are keyed by the table's source_line (economy.c0d9492b.md L879-913).
import type { X1Toggle } from './source';

export interface PredRow { flag: string; profile: string; metric: string; predicted: string; tolerance: string; blocks_merge: string; absolute_gate: string; ci_check: string; result: string; source_line: string; note: string }
/** windowGate() output for one cfg|profile (tests/bot-m5.ts). */
export interface Gate { G4_noAff_F10_to_max: [number, number, number]; windows: number; stepL30: [number | null, number | null]; reachedMax: number;
  win?: { P95_allWindows: number; P95_ofSeedMax: number; worstSeed: number; median: number }; byBand?: Record<string, [number, number, number | null]>; premium?: Record<string, [number, number]> }
export interface Shard { profile: string; source: string; seeds: [number, number]; T: number; csvSha256: string; balanceSha256: string;
  gate: { none: Gate; N: Gate; H: Gate }; l10P95Min: number; l30MedianMin: number; toggles: Partial<Record<X1Toggle, Gate | 'n/a'>> }
export type Status = 'PASS' | 'FAIL' | 'WARN' | 'INFO' | 'NOT-WIRED' | 'EXCLUDED' | 'PENDING-REPRED' | 'N/A';
export interface Out { line: number; profile: string; flag: string; metric: string; blocks: boolean; predicted: string; measured: string; status: Status; why: string }

/** Every number in a predicted cell, in order; parenthesised asides like "(−0.58)" dropped; U+2212 minus read as '-'. */
export const nums = (cell: string): number[] => (cell.replace(/\([^)]*\)/g, '').replace(/\u2212/g, '-').match(/[-+]?\d+(?:\.\d+)?/g) ?? []).map(Number);
export const inBand = (v: number, p: number) => v >= 0.8 * p - 1e-9 && v <= 1.2 * p + 1e-9;

/** Rows measured nowhere in this job yet: line -> reason. A Y row here is reported NOT-WIRED (pending), it does not pass. */
export const NOT_WIRED: Record<number, string> = {
  898: 'G4 meaningful-rows counting (G4M, D-HOP-36) is not in tests/bot-m5.ts',
  899: 'G4 meaningful-rows counting (G4M, D-HOP-36) is not in tests/bot-m5.ts',
  902: 'peak per-sale multiplier is a formula row; no measured counterpart in windowGate()',
};
/** Explicit NOT APPLICABLE rows (neither PASS nor FAIL), mirroring HoQA's v5-saves-gate N/A registry (QA-D-1030-SS15-NA).
 *  Only row 903 may be N/A: any other key throws at load (and the unit test pins the key set). */
export const NOT_APPLICABLE: Record<number, string> = {
  903: 'NOT APPLICABLE: QA-D-1030-SS15-NA / D-CEO-20261030-04: #5b not in RC (manifest row 23); salesStopped ships flag-off with no code, so there is no chip on/off trace to compare',
};
for (const k of Object.keys(NOT_APPLICABLE)) if (k !== '903') throw new Error(`pacing-x1-stack: only row 903 may be N/A (got ${k})`);
/** Row 904 (AC7 with every M5.0 flag off) result, written by scripts/pacing-x1-run.sh as ac7.json in the results folder. */
export interface Ac7 { status: 'PASS' | 'FAIL'; why: string; source: string; script: string; scriptSha256: string; commit?: string; csv: string; csvSha256: string; csvNamed: boolean; exitCode: number | null; result?: string }
const AC7_NOT_RUN = 'AC7 runs only inside the recorded RC run (scripts/pacing-x1-run.sh writes ac7.json; verdict --require-ac7)';
/** HoP-SIGNED re-prediction of the G4 dead-zone rows on the V5-HOP-1 CSV a8c4e268 (D-HOP-2026-10-30-08, 11:02;
 *  product/economy/reprediction-l894-896-a8c4e268.md sha1 1c7a39bdc9936ac25f4eff8060fdb59df102f01c, §5 Option A). It replaces
 *  the pinned table's predicted cells and gate clauses for L894-896: bands ±20% of these values; L894/895 absolute =
 *  worst ≤ 1.2 × same-seed no-mechanics worst (CFG=none, same seeds, same CSV); the 180 s cap at P95 on every row (ruling 2).
 *  L896 holds N / H. Values per profile, in the row's order. */
export const SIGNED_REPRED = { doc: 'product/economy/reprediction-l894-896-a8c4e268.md', sha1: '1c7a39bdc9936ac25f4eff8060fdb59df102f01c', decision: 'D-HOP-2026-10-30-08',
  rows: { 894: { optimal: [68, 114, 143], seller15: [47, 77, 132], casual: [36, 64, 92] }, 895: { optimal: [70, 107, 191], seller15: [47, 86, 120], casual: [40, 81, 140] },
    896: { optimal: [114, 107], seller15: [77, 86], casual: [64, 81] } } as Record<number, Record<string, number[]>> };
/** Rows still waiting for a signed re-prediction: measured, shown against the current table, reported PENDING-REPRED (never
 *  PASS/FAIL) except the 180 s cap. Empty since D-HOP-2026-10-30-08 signed L894-896. */
export const PENDING_REPRED: Record<number, string> = {};
export const isPauseRow = (r: PredRow) => /^G5-P\b/.test(r.metric) || (+r.source_line >= 906 && +r.source_line <= 913);
/** Lines this verdict knows; the unit test asserts every non-pause row of the pinned table is one of them. */
export const HANDLED = new Set([903, 904, 879, 880, 881, 882, 883, 884, 885, 886, 887, 888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 900, 901, 905]);

const f = (x: number | null | undefined, d = 3) => (x == null || !Number.isFinite(x) ? 'n/a' : (+x.toFixed(d)).toString());
const pol = (flag: string): 'N' | 'H' => (flag.trim() === 'H' ? 'H' : 'N');

export function evaluate(rows: PredRow[], shards: Record<string, Shard>, ac7?: Ac7 | null, requireAc7 = false): Out[] {
  const out: Out[] = [];
  for (const r of rows) {
    const line = +r.source_line, Y = r.blocks_merge.trim().startsWith('Y'), sp0 = SIGNED_REPRED.rows[line]?.[r.profile],
      base = { line, profile: r.profile, flag: r.flag, metric: r.metric.slice(0, 90), blocks: Y, predicted: sp0 ? `${sp0.join(' / ')} (signed re-pred ${SIGNED_REPRED.decision}; table had ${r.predicted})` : r.predicted };
    const push = (status: Status, measured: string, why: string) => out.push({ ...base, status, measured, why });
    if (isPauseRow(r)) { push('EXCLUDED', '', 'G5-P pause rows stay out until Features delivers the driver (X1 note, D-HOE-20261029-05)'); continue; }
    if (NOT_WIRED[line]) { push('NOT-WIRED', '', NOT_WIRED[line]); continue; }
    if (NOT_APPLICABLE[line]) { push('N/A', '', NOT_APPLICABLE[line]); continue; }
    if (line === 904) { // AC7 with every M5.0 flag off (QA's ac7-active-idle-gate.py on the tree's shipped CSV via --csv)
      if (!ac7) { if (requireAc7) push('FAIL', '', 'ac7.json missing: AC7 did not run'); else push('NOT-WIRED', '', AC7_NOT_RUN); continue; }
      const src = `${ac7.source}${ac7.commit ? ` @${ac7.commit}` : ''} ${ac7.script} sha256 ${ac7.scriptSha256}; csv ${ac7.csv} sha256 ${ac7.csvSha256}`;
      const ok = ac7.status === 'PASS' && ac7.csvNamed && ac7.exitCode === 0;
      push(ok ? 'PASS' : 'FAIL', `${ac7.result ?? ''} | ${src}`, ok ? '' : ac7.why || 'AC7 failed'); continue; }
    const sh = shards[r.profile]; if (!sh) { push(Y ? 'FAIL' : 'WARN', '', `no shard for profile ${r.profile}`); continue; }
    const sp = SIGNED_REPRED.rows[line]?.[r.profile], p = sp ?? nums(r.predicted), fails: string[] = [], caps: string[] = []; // caps: the 180 s dead-zone cap, which applies to every row even while re-predicted (D-HOP-07 amendment)
    const band = (v: number | null | undefined, pr: number | undefined, tag = '') => { if (pr == null) return; if (v == null || !Number.isFinite(v)) fails.push(`${tag}no value`); else if (!inBand(v, pr)) fails.push(`${tag}${f(v)} outside ×0.8–1.2 of ${pr} [${f(0.8 * pr)}, ${f(1.2 * pr)}]`); };
    const abs = (ok: boolean, msg: string) => { if (!ok) fails.push(msg); };
    let measured = '';
    const g = sh.gate[pol(r.flag)], w = g.win;
    switch (line) {
      case 879: case 880: { const v = w?.P95_allWindows ?? NaN; measured = f(v); band(v, p[0]); abs(v <= 2.0, `${f(v)} > 2.00`); break; }
      case 881: case 882: { const v = w?.P95_ofSeedMax ?? NaN; measured = f(v); band(v, p[0]); abs(v <= 2.0, `${f(v)} > 2.00`); break; }
      case 883: case 884: { const v = w?.worstSeed ?? NaN; measured = f(v); band(v, p[0]); abs(v <= 2.25, `${f(v)} > 2.25`); break; }
      case 885: { const n = sh.gate.N.win?.median, h = sh.gate.H.win?.median; measured = `${f(n)} / ${f(h)}`; band(n, p[0], 'N '); band(h, p[1], 'H '); break; }
      case 886: case 887: { const ks = ['F10-17', 'F18-23', 'F24-29'], v = ks.map(k => g.byBand?.[k]?.[1] ?? NaN); measured = v.map(x => f(x, 2)).join(' / '); ks.forEach((k, i) => band(v[i], p[i], `${k} `)); break; }
      case 888: case 889: { const ks = ['F10-19', 'F20-29', 'F30+'], v = ks.map(k => g.premium?.[k]?.[0] ?? NaN); measured = v.map(x => `+${f(x, 1)}%`).join(' / '); ks.forEach((k, i) => band(v[i], p[i], `${k} `)); break; }
      case 890: case 891: case 892: case 893: { const i = line <= 891 ? 0 : 1, v = g.stepL30[i], b0 = sh.gate.none.stepL30[i], d = v != null && b0 != null ? v - b0 : NaN;
        measured = `${f(v)} (${d >= 0 ? '+' : ''}${f(d, 2)} vs no-mechanics ${f(b0)})`; band(v, p[0]); abs(d <= 0.10 + 1e-9, `delta ${f(d)} > +0.10 vs no-mechanics`); break; }
      case 894: case 895: { const v = g.G4_noAff_F10_to_max, b0 = sh.gate.none.G4_noAff_F10_to_max; measured = `${v.join(' / ')} (baseline ${b0.join('/')})`; ['P50 ', 'P95 ', 'worst '].forEach((t, i) => band(v[i], p[i], t));
        if (sp) { abs(v[2] <= 1.2 * b0[2] + 1e-9, `worst ${v[2]} > 1.2 × same-seed no-mechanics worst ${b0[2]} (${f(1.2 * b0[2], 1)})`); if (!(v[1] <= 180)) caps.push(`P95 ${v[1]} > 180 s cap`); }
        else abs(v[2] <= b0[2], `worst ${v[2]} > baseline worst ${b0[2]}`); break; }
      case 896: { const n = sh.gate.N.G4_noAff_F10_to_max[1], h = sh.gate.H.G4_noAff_F10_to_max[1]; measured = `${n} / ${h} (N / H)`; band(n, p[0], 'N '); if (sp) band(h, p[1], 'H '); if (!(n <= 180 && h <= 180)) caps.push(`P95 ${Math.max(n, h)} > 180 s cap`); break; }
      case 897: { const n = sh.gate.N.G4_noAff_F10_to_max[2], h = sh.gate.H.G4_noAff_F10_to_max[2]; measured = `${n} / ${h}`; abs(n <= 180 && h <= 180, `worst ${Math.max(n, h)} > 180 s (pre-existing L0–30 dead zone, known risk)`); break; }
      case 900: { const v = sh.l10P95Min; measured = f(v, 2); band(v, p[0]); if (r.profile === 'seller15') abs(v <= 12.1, `${f(v, 2)} > 12.1 min`); break; }
      case 901: { const v = sh.l30MedianMin; measured = f(v, 1); band(v, p[0]); break; }
      case 905: { const parts: string[] = [];
        for (const [k, t] of Object.entries(sh.toggles)) { if (t === 'n/a' || !t) { parts.push(`${k} n/a (off in this data mode)`); continue; }
          const tw = t.win, sw = sh.gate.N.win; if (!tw || !sw) { fails.push(`${k}: no window result`); continue; }
          parts.push(`${k} off: P95 ${f(tw.P95_allWindows)} (Δon ${f(sw.P95_allWindows - tw.P95_allWindows, 3)}), seedMax P95 ${f(tw.P95_ofSeedMax)}, worst ${f(tw.worstSeed)}`);
          abs(tw.P95_allWindows <= 2.0 && tw.P95_ofSeedMax <= 2.0 && tw.worstSeed <= 2.25, `${k} toggled off: G1 past its gate`); }
        if (!Object.keys(sh.toggles).length) fails.push('no flag toggles measured');
        measured = parts.join('; '); break; }
      default: push(Y ? 'FAIL' : 'WARN', '', `no handler for source_line ${line}`); continue;
    }
    if (caps.length) { push('FAIL', measured, [...caps, ...fails].join('; ')); continue; }
    if (PENDING_REPRED[line]) { push('PENDING-REPRED', measured, `${PENDING_REPRED[line]}; vs the current table it would ${fails.length ? `${Y ? 'FAIL' : 'WARN'}: ${fails.join('; ')}` : (Y ? 'PASS' : 'INFO')}`); continue; }
    if (fails.length) push(Y ? 'FAIL' : 'WARN', measured, fails.join('; ')); else push(Y ? 'PASS' : 'INFO', measured, '');
  }
  return out;
}

export const verdictOf = (o: Out[]) => (o.some(x => x.status === 'FAIL') ? 'FAIL' : 'PASS');
