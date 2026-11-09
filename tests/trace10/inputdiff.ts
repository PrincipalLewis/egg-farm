// trace10 balance/header input-diff manifest (design §9). Separate from the verdict and written AFTER it; the comparator
// never reads it and has no exclusion parameter, so an approved input diff can never mask a stream divergence.
import { canon, sha256 } from './encode';

export const APPROVED_BASIS = 'D-HOP-2026-11-05-15; D-HOP-2026-10-30-34(2); EC-2 Exclusions';
/** EC-2 approved input-only diffs: tc_streak_cap 0.28 -> 0.27 on rows 0-10; the tc_combo_* header rename (old -> 'tc_' + old). */
export const isApprovedRename = (o: string, n: string) => n === 'tc_' + o && n.startsWith('tc_combo_');
const parse = (t: string) => { const ls = t.replace(/\r\n/g, '\n').split('\n').filter(l => l.length); return { h: ls[0].split(','), rows: ls.slice(1).map(l => l.split(',')) }; };
function leaves(x: unknown, p = '', out: Record<string, unknown> = {}) {
  if (x && typeof x === 'object') { for (const k of Object.keys(x as object).sort()) leaves((x as any)[k], p ? `${p}.${k}` : k, out); if (!Object.keys(x as object).length) out[p] = canon(x); }
  else out[p] = x; return out;
}
export function inputDiff(beforeCsv: string, afterCsv: string, beforeBal: unknown, afterBal: unknown, verdictSha256: string) {
  const A = parse(beforeCsv), B = parse(afterCsv), renames: { old: string; new: string; class: string }[] = [], cells: unknown[] = [];
  const goneA = A.h.filter(c => !B.h.includes(c)), newB = B.h.filter(c => !A.h.includes(c)), map: Record<string, string> = {};
  for (const o of goneA) { const n = newB.find(x => isApprovedRename(o, x)); if (n) { map[o] = n; renames.push({ old: o, new: n, class: 'APPROVED_RENAME' }); } else renames.push({ old: o, new: '', class: 'UNAPPROVED' }); }
  for (const n of newB) if (!Object.values(map).includes(n)) renames.push({ old: '', new: n, class: 'UNAPPROVED' });
  let unapproved = renames.filter(r => r.class === 'UNAPPROVED').length;
  const nRows = Math.max(A.rows.length, B.rows.length);
  for (let r = 0; r < nRows; r++) for (const col of A.h) {
    const bc = map[col] ?? col, ia = A.h.indexOf(col), ib = B.h.indexOf(bc); if (ib < 0) continue;
    const va = A.rows[r]?.[ia], vb = B.rows[r]?.[ib]; if (va === vb) continue;
    const level = Number(A.rows[r]?.[0] ?? B.rows[r]?.[0]);
    const cls = level > 10 ? 'POST_L10_ROW' : col === 'tc_streak_cap' && Number(va) === 0.28 && Number(vb) === 0.27 ? 'APPROVED_CAP' : 'UNAPPROVED';
    if (cls === 'UNAPPROVED') unapproved++; cells.push({ row: level, col, before: va ?? null, after: vb ?? null, class: cls });
  }
  const la = leaves(beforeBal), lb = leaves(afterBal), bl: unknown[] = [];
  for (const k of [...new Set([...Object.keys(la), ...Object.keys(lb)])].sort()) if (canon(la[k]) !== canon(lb[k]))
    bl.push({ path: k, before: la[k] ?? null, after: lb[k] ?? null, class: k === 'm4.tc.streak_cap' ? 'APPROVED_CAP' : 'INFO' });
  return { schema: 'trace10-input-diff-v1', verdict_sha256: verdictSha256, csv: { before_sha256: sha256(beforeCsv), after_sha256: sha256(afterCsv), header_renames: renames, cells },
    balance: { leaves: bl }, approved_basis: APPROVED_BASIS, unapproved_rows_0_10: unapproved, input_check: unapproved ? 'FAIL' : 'PASS' };
}
