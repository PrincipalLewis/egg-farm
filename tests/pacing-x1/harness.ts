// pacing-x1-stack harness pieces shared by scripts/pacing-x1-stack.ts and tests/pacing-x1.test.ts: the pinned §13.2a table (sha256-asserted,
// D-HOE-20261030-05), its parser, the in-tree shipped data read (hashed), the in-memory balance build and the x1 stacks. No CLI side effects on import.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from '../../scripts/sync-economy';
import { validateBalance, type Balance } from '../../src/config/balance';
import { M5X_BASE, M5X_STACKS, type Stack } from '../bot-m5';
import { X1_SOURCES, X1_TOGGLES, type X1SourceKey, type X1Toggle } from './source';
import type { PredRow } from './compare';

export const X1_PRED = { fixture: 'tests/fixtures/x1/pred-13.2a-cf653963.csv', sha256: 'cf653963b983e3230be269ea2849a41b9606260ed0930f1ec45b9e8e5d786971' };
export const X1_RUN = { T: 4000, step: 300, stepFrom: 11 } as const; // §13.2a commands: T=4000, STEP 300 (A1), STEP_FROM=11
export const ROOT = new URL('../../', import.meta.url);
export const sha256 = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
export function pinned(rel: string, want: string): Buffer { const b = readFileSync(new URL(rel, ROOT)), got = sha256(b); if (got !== want) throw new Error(`pinned fixture ${rel}: sha256 ${got} != ${want}`); return b; }
export function parsePred(txt: string): PredRow[] { // RFC 4180 CSV (quoted fields with commas), header row first
  const rows: string[][] = []; let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < txt.length; i++) { const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some(x => x !== '')) rows.push(row); row = []; } else cell += c; }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const [h, ...body] = rows; return body.map(r => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ''])) as unknown as PredRow);
}
/** Builds the balance IN MEMORY from the source's tree files, exactly as sync-economy does; returns their sha256 for the record.
 *  `root` = the tree to read (default: this checkout). Nothing is pinned here: X1 measures what the tree ships (HoE 10:57). */
export function x1Balance(key: X1SourceKey, root: URL = ROOT): { b: Balance; csvSha256: string; balanceSha256: string } {
  const src = X1_SOURCES[key], csv = readFileSync(new URL(src.csv, root)), bj = readFileSync(new URL(src.balanceJson, root));
  const b = validateBalance(buildBalance(parseEconomyCsv(csv.toString('utf8')), JSON.parse(bj.toString('utf8')), readEconomyConfig() as any) as Balance, false);
  return { b, csvSha256: sha256(csv), balanceSha256: sha256(bj) };
}
/** The N / H stacks for a data source (AssZ / AssZhold plus the source's overrides), registered under x1 names so windowGate()
 *  can run them unmodified; same for each toggled-off variant. Registration only adds keys; AssZ/AssZhold/none are untouched. */
export function x1Stacks(key: X1SourceKey) {
  const src = X1_SOURCES[key], reg = M5X_STACKS as Record<string, Stack>, N: Stack = { ...M5X_BASE, ...src.stack }, H: Stack = { ...N, hold: true };
  reg['x1:N'] = N; reg['x1:H'] = H; const toggles: Partial<Record<X1Toggle, string | 'n/a'>> = {};
  for (const [k, o] of Object.entries(X1_TOGGLES) as [X1Toggle, Partial<Stack>][]) { if ((src.offFlags as readonly X1Toggle[]).includes(k)) { toggles[k] = 'n/a'; continue; } reg[`x1:N-${k}`] = { ...N, ...o }; toggles[k] = `x1:N-${k}`; }
  return { N, H, toggles };
}
