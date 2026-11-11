#!/usr/bin/env node
/**
 * Byte-level CSV lineage diff for D-HOP-25 amendment.
 * Compares OLD (b48be8a4, expected 125 cols) vs NEW (c7bb783f, expected 123 cols).
 * Expectation: exactly guard_heartbeat_s and guard_stale_s removed; kept columns
 * preserve order; every kept cell byte-identical as raw string; same row count/order;
 * line endings / BOM / trailing newline / quoting checked.
 *
 * Usage: node csv-lineage-diff.mjs <old.csv> <new.csv> [logPath]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const EXPECTED_REMOVED = ['guard_heartbeat_s', 'guard_stale_s'];
const EXPECTED_KEPT = 123;

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

/** Split CSV into rows without parsing quoted fields away — we compare cells after a
 *  minimal RFC4180 split so quoting differences surface as cell string diffs. */
function splitRows(text) {
  // Normalize only for row splitting detection of final newline; keep original bytes
  const hasBOM = text.charCodeAt(0) === 0xfeff;
  const body = hasBOM ? text.slice(1) : text;
  const usesCRLF = body.includes('\r\n');
  const usesCR = !usesCRLF && body.includes('\r');
  const eol = usesCRLF ? '\r\n' : usesCR ? '\r' : '\n';
  const trailingNewline = body.endsWith(eol) || (!usesCRLF && !usesCR && body.endsWith('\n'));
  // Split carefully: if trailing newline, last split piece is empty — drop it
  let parts;
  if (usesCRLF) {
    parts = body.split('\r\n');
  } else if (usesCR) {
    parts = body.split('\r');
  } else {
    parts = body.split('\n');
  }
  if (parts.length && parts[parts.length - 1] === '') parts = parts.slice(0, -1);
  return { hasBOM, usesCRLF, usesCR, eol, trailingNewline, rows: parts };
}

/** Minimal CSV field split that preserves cell content including surrounding quotes. */
function splitFields(line) {
  const fields = [];
  let i = 0;
  while (i <= line.length) {
    if (i === line.length) {
      fields.push('');
      break;
    }
    if (line[i] === '"') {
      // quoted field — consume until closing unescaped quote
      let j = i + 1;
      let out = '"';
      while (j < line.length) {
        if (line[j] === '"') {
          out += '"';
          if (j + 1 < line.length && line[j + 1] === '"') {
            out += '"';
            j += 2;
            continue;
          }
          j += 1;
          break;
        }
        out += line[j];
        j += 1;
      }
      // optional trailing chars until comma (should be none for well-formed)
      while (j < line.length && line[j] !== ',') {
        out += line[j];
        j += 1;
      }
      fields.push(out);
      if (j < line.length && line[j] === ',') {
        i = j + 1;
        if (i === line.length) {
          fields.push('');
          break;
        }
        continue;
      }
      break;
    } else {
      const comma = line.indexOf(',', i);
      if (comma === -1) {
        fields.push(line.slice(i));
        break;
      }
      fields.push(line.slice(i, comma));
      i = comma + 1;
      if (i === line.length) {
        fields.push('');
        break;
      }
    }
  }
  return fields;
}

function main() {
  const oldPath = resolve(process.argv[2] || 'qa/scratch/csv-lineage/economy-b48be8a4.csv');
  const newPath = resolve(process.argv[3] || 'qa/scratch/csv-lineage/economy-c7bb783f.csv');
  const logPath = resolve(
    process.argv[4] || 'qa/m3-recheck/csv-lineage-c7bb783f/diff.log',
  );

  const oldBuf = readFileSync(oldPath);
  const newBuf = readFileSync(newPath);
  const oldText = oldBuf.toString('utf8');
  const newText = newBuf.toString('utf8');

  const lines = [];
  const push = (s = '') => lines.push(s);

  push('CSV lineage byte-diff (D-HOP-25 amendment)');
  push(`generated: ${new Date().toISOString()}`);
  push(`old: ${oldPath}`);
  push(`     sha256 ${sha256(oldBuf)}`);
  push(`new: ${newPath}`);
  push(`     sha256 ${sha256(newBuf)}`);
  push('');

  const oldMeta = splitRows(oldText);
  const newMeta = splitRows(newText);

  push('=== file shape ===');
  push(`old: BOM=${oldMeta.hasBOM} CRLF=${oldMeta.usesCRLF} CR=${oldMeta.usesCR} trailingNewline=${oldMeta.trailingNewline} rows=${oldMeta.rows.length}`);
  push(`new: BOM=${newMeta.hasBOM} CRLF=${newMeta.usesCRLF} CR=${newMeta.usesCR} trailingNewline=${newMeta.trailingNewline} rows=${newMeta.rows.length}`);

  const shapeDiffs = [];
  if (oldMeta.hasBOM !== newMeta.hasBOM) shapeDiffs.push(`BOM old=${oldMeta.hasBOM} new=${newMeta.hasBOM}`);
  if (oldMeta.usesCRLF !== newMeta.usesCRLF || oldMeta.usesCR !== newMeta.usesCR) {
    shapeDiffs.push(`line-endings old(CRLF=${oldMeta.usesCRLF},CR=${oldMeta.usesCR}) new(CRLF=${newMeta.usesCRLF},CR=${newMeta.usesCR})`);
  }
  if (oldMeta.trailingNewline !== newMeta.trailingNewline) {
    shapeDiffs.push(`trailingNewline old=${oldMeta.trailingNewline} new=${newMeta.trailingNewline}`);
  }
  if (oldMeta.rows.length !== newMeta.rows.length) {
    shapeDiffs.push(`rowCount old=${oldMeta.rows.length} new=${newMeta.rows.length}`);
  }

  if (!oldMeta.rows.length || !newMeta.rows.length) {
    push('FATAL: empty file');
    finish(false, shapeDiffs, lines, logPath);
    return;
  }

  const oldHeader = splitFields(oldMeta.rows[0]);
  const newHeader = splitFields(newMeta.rows[0]);
  push('');
  push('=== headers ===');
  push(`old columns (${oldHeader.length}): ${oldHeader.join(',')}`);
  push(`new columns (${newHeader.length}): ${newHeader.join(',')}`);

  const oldSet = new Set(oldHeader);
  const newSet = new Set(newHeader);
  const removed = oldHeader.filter((c) => !newSet.has(c));
  const added = newHeader.filter((c) => !oldSet.has(c));
  // Kept columns in old order
  const keptFromOld = oldHeader.filter((c) => newSet.has(c));
  // New header order should equal keptFromOld if order preserved and nothing renamed
  const orderOk =
    keptFromOld.length === newHeader.length &&
    keptFromOld.every((c, i) => c === newHeader[i]);

  push(`removed (${removed.length}): ${removed.join(',') || '(none)'}`);
  push(`added (${added.length}): ${added.join(',') || '(none)'}`);
  push(`kept: ${keptFromOld.length}`);
  push(`kept-order-preserved: ${orderOk}`);

  const headerDiffs = [];
  const unexpectedRemoved = removed.filter((c) => !EXPECTED_REMOVED.includes(c));
  const missingExpected = EXPECTED_REMOVED.filter((c) => !removed.includes(c));
  if (removed.length !== EXPECTED_REMOVED.length || unexpectedRemoved.length || missingExpected.length) {
    headerDiffs.push(
      `removed set mismatch: got [${removed}] expected exactly [${EXPECTED_REMOVED}]`,
    );
  }
  if (added.length) headerDiffs.push(`unexpected added columns: [${added}]`);
  if (!orderOk) headerDiffs.push('kept column order not preserved (or rename detected)');
  if (keptFromOld.length !== EXPECTED_KEPT) {
    headerDiffs.push(`kept count ${keptFromOld.length} != expected ${EXPECTED_KEPT}`);
  }

  // Build index maps
  const oldIdx = Object.fromEntries(oldHeader.map((c, i) => [c, i]));
  const newIdx = Object.fromEntries(newHeader.map((c, i) => [c, i]));

  push('');
  push('=== cell-by-cell (kept columns, raw string) ===');
  const cellDiffs = [];
  const examples = [];
  const dataRowCount = Math.min(oldMeta.rows.length, newMeta.rows.length) - 1;
  for (let r = 1; r < Math.min(oldMeta.rows.length, newMeta.rows.length); r++) {
    const oldFields = splitFields(oldMeta.rows[r]);
    const newFields = splitFields(newMeta.rows[r]);
    // row key = first column (level) if present
    const rowKey = oldFields[0] ?? `row${r}`;
    if ((newFields[0] ?? '') !== (oldFields[0] ?? '')) {
      cellDiffs.push({ r, rowKey, col: newHeader[0] ?? 'col0', old: oldFields[0], neu: newFields[0], kind: 'row-key' });
    }
    for (const col of keptFromOld) {
      const o = oldFields[oldIdx[col]] ?? '';
      const n = newFields[newIdx[col]] ?? '';
      if (o !== n) {
        cellDiffs.push({ r, rowKey, col, old: o, neu: n, kind: 'cell' });
        if (examples.length < 20) {
          examples.push(`  row ${r} (key=${rowKey}) col=${col}: old=${JSON.stringify(o)} new=${JSON.stringify(n)}`);
        }
      }
    }
    // Also flag if field counts on a row differ from header (malformed)
    if (oldFields.length !== oldHeader.length) {
      cellDiffs.push({ r, rowKey, col: '*', old: String(oldFields.length), neu: String(oldHeader.length), kind: 'old-field-count' });
    }
    if (newFields.length !== newHeader.length) {
      cellDiffs.push({ r, rowKey, col: '*', old: String(newFields.length), neu: String(newHeader.length), kind: 'new-field-count' });
    }
  }
  // Extra / missing rows beyond min
  if (oldMeta.rows.length !== newMeta.rows.length) {
    push(`ROW COUNT MISMATCH: old=${oldMeta.rows.length} new=${newMeta.rows.length}`);
  }

  push(`data rows compared: ${dataRowCount}`);
  push(`cell differences (kept cols): ${cellDiffs.filter((d) => d.kind === 'cell' || d.kind === 'row-key').length}`);
  if (examples.length) {
    push('examples (up to 20):');
    for (const e of examples) push(e);
  } else {
    push('no cell differences on kept columns');
  }

  // Quoting / raw header line check: reconstruct expected new header from old by dropping the 2 cols
  push('');
  push('=== quoting / raw-line spot check ===');
  const oldHeaderFields = splitFields(oldMeta.rows[0]);
  const reconstructed = oldHeaderFields.filter((c) => !EXPECTED_REMOVED.includes(c)).join(',');
  const headerLineExact =
    reconstructed === newMeta.rows[0] ||
    // if new header was rebuilt identically as comma-join of kept names
    keptFromOld.join(',') === newMeta.rows[0];
  push(`new header line equals kept-names join: ${keptFromOld.join(',') === newMeta.rows[0]}`);
  push(`reconstructed-from-old-minus-2 equals new header line: ${reconstructed === newMeta.rows[0]}`);
  if (reconstructed !== newMeta.rows[0]) {
    // show first divergence in raw header bytes
    let i = 0;
    while (i < reconstructed.length && i < newMeta.rows[0].length && reconstructed[i] === newMeta.rows[0][i]) i++;
    push(`header raw diverge at index ${i}: old-side=${JSON.stringify(reconstructed.slice(Math.max(0, i - 10), i + 20))} new-side=${JSON.stringify(newMeta.rows[0].slice(Math.max(0, i - 10), i + 20))}`);
  }

  // Per-row: rebuild old row minus removed columns and compare raw line to new
  let rawLineMismatches = 0;
  const rawExamples = [];
  for (let r = 1; r < Math.min(oldMeta.rows.length, newMeta.rows.length); r++) {
    const oldFields = splitFields(oldMeta.rows[r]);
    const rebuilt = oldHeader
      .map((c, i) => ({ c, v: oldFields[i] ?? '' }))
      .filter(({ c }) => !EXPECTED_REMOVED.includes(c))
      .map(({ v }) => v)
      .join(',');
    if (rebuilt !== newMeta.rows[r]) {
      rawLineMismatches++;
      if (rawExamples.length < 10) {
        rawExamples.push(`  row ${r}: rebuilt!=new (len ${rebuilt.length} vs ${newMeta.rows[r].length})`);
        // find first char diverge
        let i = 0;
        const a = rebuilt;
        const b = newMeta.rows[r];
        while (i < a.length && i < b.length && a[i] === b[i]) i++;
        rawExamples.push(`    diverge@${i} rebuilt=${JSON.stringify(a.slice(Math.max(0, i - 15), i + 25))} new=${JSON.stringify(b.slice(Math.max(0, i - 15), i + 25))}`);
      }
    }
  }
  push(`raw-line mismatches after dropping ${EXPECTED_REMOVED.join(',')}: ${rawLineMismatches}`);
  for (const e of rawExamples) push(e);

  push('');
  push('=== verdict ===');
  const ok =
    shapeDiffs.length === 0 &&
    headerDiffs.length === 0 &&
    cellDiffs.filter((d) => d.kind === 'cell' || d.kind === 'row-key').length === 0 &&
    rawLineMismatches === 0 &&
    removed.length === 2 &&
    removed.every((c) => EXPECTED_REMOVED.includes(c)) &&
    added.length === 0 &&
    orderOk &&
    keptFromOld.length === EXPECTED_KEPT;

  if (ok) {
    push(
      `VERIFIED: only [${EXPECTED_REMOVED.join(',')}] removed; kept=${keptFromOld.length}; dataRows=${dataRowCount}; all kept cells byte-identical; line endings/BOM/trailing newline match; order preserved.`,
    );
  } else {
    push('DIFF: differences beyond the expected 2-column drop:');
    for (const s of shapeDiffs) push(`  SHAPE: ${s}`);
    for (const s of headerDiffs) push(`  HEADER: ${s}`);
    push(`  CELL diffs: ${cellDiffs.filter((d) => d.kind === 'cell' || d.kind === 'row-key').length}`);
    push(`  RAW-LINE diffs: ${rawLineMismatches}`);
  }

  finish(ok, [...shapeDiffs, ...headerDiffs], lines, logPath, {
    kept: keptFromOld.length,
    rows: dataRowCount,
    removed,
    added,
    cellDiffCount: cellDiffs.filter((d) => d.kind === 'cell' || d.kind === 'row-key').length,
    rawLineMismatches,
  });
}

function finish(ok, _extra, lines, logPath, summary = {}) {
  mkdirSync(dirname(logPath), { recursive: true });
  const body = lines.join('\n') + '\n';
  writeFileSync(logPath, body);
  process.stdout.write(body);
  process.stdout.write(`\nLOG: ${logPath}\n`);
  process.stdout.write(`SUMMARY: ${JSON.stringify({ ok, ...summary })}\n`);
  process.exit(ok ? 0 : 1);
}

main();
