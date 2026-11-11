// Compare m41-7-save-noreg.qa.test.ts outputs: node m41-7-save-noreg-compare.mjs <candidate.json> <dd223f5.json> > report.txt
import { readFileSync } from 'node:fs';
const [A, B] = process.argv.slice(2).map(f => JSON.parse(readFileSync(f, 'utf8')));
const key = r => `${r.id} [${r.mode}]`; const mb = new Map(B.map(r => [key(r), r])); const J = JSON.stringify;
const cls = { identical: [], validDiff: [], recoveryDelta: [], errors: [] }; const lines = [];
const norm = p => p && { ...p, basket: undefined, pending: undefined, eggs: (p.basket ?? 0) + (p.pending ?? 0) };
const lossless = r => r.reload ? J(norm(r.pick)) === J(norm(r.reload.pick)) && (r.reload.offline ?? 0) === 0 : null; // pending grant settles into basket on reload (by design)
const strip = o => o && Object.fromEntries(Object.entries(o).filter(([k]) => !/corrupt/.test(k)));
for (const a of A) { if (a.id === '#constants') { lines.push(`constants candidate ${J(a)} | dd223f5 ${J(mb.get(key(a)))}`); continue; }
  const b = mb.get(key(a)); if (!b) { cls.errors.push(`${key(a)} missing in dd223f5`); continue; }
  if (a.error || b.error) { cls.errors.push(`${key(a)} error cand=${a.error} base=${b.error}`); continue; }
  const valid = !a.recovery && !b.recovery && a.newerSave === null && b.newerSave === null;
  const fields = ['stateSha', 'pick', 'offline', 'isNewGame', 'readOnly', 'newerSave', 'lsAfterLoad', 'mirrorWritesAtLoad', 'mirrorLastSha', 'savedMainSha', 'reload', 'mig', 'stateShaAfterMig', 'pickAfterMig', 'v6BackupStored', 'storageFailed', 'quotaHits', 'via'];
  const diff = fields.filter(f => J(a[f]) !== J(b[f]));
  if (valid) { const d2 = diff.filter(f => !(f === 'via' && a.via === null)); // candidate has no boot reconcile (by design)
    (d2.length ? cls.validDiff : cls.identical).push(d2.length ? `${key(a)} DIFF ${d2.map(f => `${f}: cand=${J(a[f])} base=${J(b[f])}`).join(' ; ')}` : key(a)); continue; }
  cls.recoveryDelta.push({ k: key(a), samePick: J(a.pick) === J(b.pick), sameState: a.stateSha === b.stateSha,
    cand: { outcome: a.outcome, rec: a.recovery && { case: a.recovery.case, reason: a.recovery.reason, source: a.recovery.source, store: a.recovery.store, tried: a.recovery.tried?.map(t => `${t.source}:${t.result}`).join(',') }, pick: a.pick, newer: a.newerSave, ro: a.readOnly, corrupt: a.corruptLsShas?.length, idbCorrupt: a.idbCorrupt?.length, dlg: a.dialog && { n: a.dialog.notice, o: a.dialog.outcome, exp: a.dialog.hasExport, expEqMain: a.dialog.exportSha ? a.dialog.exportSha === a.inMainSha : null, aria: a.dialog.aria }, lossless: lossless(a), mainKeptInCorrupt: a.inMainSha ? a.corruptLsShas?.includes(a.inMainSha) : null },
    base: { outcome: b.outcome, rec: b.recovery && { case: b.recovery.case, reason: b.recovery.reason }, pick: b.pick, newer: b.newerSave, ro: b.readOnly, corrupt: b.corruptLsShas?.length, dlg: b.dialog && { o: b.dialog.outcome, exp: b.dialog.hasExport, expEqMain: b.dialog.exportSha ? b.dialog.exportSha === b.inMainSha : null }, lossless: lossless(b) } });
}
const rows = A.filter(r => r.id !== '#constants');
lines.push(`rows ${rows.length}: valid-identical ${cls.identical.length}, valid-DIFF ${cls.validDiff.length}, recovery/newer rows ${cls.recoveryDelta.length}, errors ${cls.errors.length}`);
lines.push(`dd223f5 rows with lossless=false: ${B.filter(r => r.id !== '#constants' && lossless(r) === false).map(key).join(' | ') || 'none'}`);
lines.push(`candidate rows with reloadLossless=false: ${rows.filter(r => lossless(r) === false).map(key).join(' | ') || 'none'}`);
lines.push('\n## valid-DIFF'); lines.push(...cls.validDiff); lines.push('\n## errors'); lines.push(...cls.errors);
lines.push('\n## recovery/newer rows (candidate vs dd223f5)'); for (const r of cls.recoveryDelta) lines.push(`${r.k} samePick=${r.samePick} sameState=${r.sameState}\n  cand ${J(r.cand)}\n  base ${J(r.base)}`);
lines.push('\n## valid-identical'); lines.push(...cls.identical);
console.log(lines.join('\n'));
