// pacing-x1-stack harness pieces shared by scripts/pacing-x1-stack.ts and tests/pacing-x1.test.ts: the pinned §13.2a table (sha256-asserted,
// D-HOE-20261030-05), its parser, the in-tree shipped data read (hashed), the in-memory balance build and the x1 stacks. No CLI side effects on import.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from '../../scripts/sync-economy';
import { validateBalance, type Balance } from '../../src/config/balance';
import { M5X_BASE, M5X_STACKS, SRC_M5_FLAGS, type Stack } from '../bot-m5';
import { M5_FLAGS, flagOn } from '../../src/config/flags';
import { X1_SOURCES, X1_TOGGLES, type X1SourceKey, type X1Toggle } from './source';
import type { PredRow } from './compare';

export const X1_PRED = { fixture: 'tests/fixtures/x1/pred-13.2a-7bbb5925.csv', sha256: '7bbb59251377a8b5fc7fa7d2473b9ad3075bfe064896a89626425d2c45b2d2b5' };
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
export function x1Balance(key: X1SourceKey, root: URL = ROOT): { b: Balance; csvSha256: string; balanceSha256: string; balance: BalanceRecord } {
  const src = X1_SOURCES[key], csv = readFileSync(new URL(src.csv, root)), bj = readFileSync(new URL(src.balanceJson, root));
  const b = validateBalance(buildBalance(parseEconomyCsv(csv.toString('utf8')), JSON.parse(bj.toString('utf8')), readEconomyConfig() as any) as Balance, false);
  return { b, csvSha256: sha256(csv), balanceSha256: sha256(bj), balance: balanceRecord(src.balanceJson, bj, b) };
}
/** QA-D-1030-SHIPFLAGS (HoE): what the run read from the tree's src/config/balance.json: its sha256, m4.enabled, every
 *  m4.flags.* value (absent = 0), which flags are ON (src flagOn: m4.enabled and flag === 1), and which of those are the M5
 *  mechanics the bot models itself (SRC_M5_FLAGS; bot-m5 O-3 assertNoDoubleModel throws if any is on with the bot model). */
export interface BalanceRecord { path: string; sha256: string; m4Enabled: number; flags: Record<string, number>; flagsOn: string[]; srcM5On: string[] }
export function balanceRecord(path: string, raw: Buffer, b: Balance): BalanceRecord {
  const m4 = (b as any).m4 ?? {}, flags = Object.fromEntries(M5_FLAGS.map(k => [k, Number(m4.flags?.[k] ?? 0)]));
  const flagsOn = M5_FLAGS.filter(k => flagOn(b as any, k));
  return { path, sha256: sha256(raw), m4Enabled: Number(m4.enabled ?? 0), flags, flagsOn, srcM5On: flagsOn.filter(k => (SRC_M5_FLAGS as readonly string[]).includes(k)) };
}
/** One-line text of a BalanceRecord for summary.md / balance.txt. */
export const balanceLine = (r: BalanceRecord) => `${r.path} sha256 ${r.sha256}; m4.enabled=${r.m4Enabled}; m4.flags ${Object.entries(r.flags).map(([k, v]) => `${k}=${v}`).join(' ')}; `
  + `flags ON: ${r.flagsOn.length ? r.flagsOn.join(', ') : 'none'}; bot-modelled src M5 flags (${SRC_M5_FLAGS.join('/')}) ON: ${r.srcM5On.length ? `${r.srcM5On.join(', ')} (bot-m5 O-3 guard throws: the bot model cannot run)` : 'none (bot model runs; O-3 guard would throw if any were on)'}`;
/** The N / H stacks for a data source (AssZ / AssZhold plus the source's overrides), registered under x1 names so windowGate()
 *  can run them unmodified; same for each toggled-off variant. Registration only adds keys; AssZ/AssZhold/none are untouched. */
export function x1Stacks(key: X1SourceKey) {
  const src = X1_SOURCES[key], reg = M5X_STACKS as Record<string, Stack>, N: Stack = { ...M5X_BASE, ...src.stack }, H: Stack = { ...N, hold: true };
  reg['x1:N'] = N; reg['x1:H'] = H; const toggles: Partial<Record<X1Toggle, string | 'n/a'>> = {};
  for (const [k, o] of Object.entries(X1_TOGGLES) as [X1Toggle, Partial<Stack>][]) { if ((src.offFlags as readonly X1Toggle[]).includes(k)) { toggles[k] = 'n/a'; continue; } reg[`x1:N-${k}`] = { ...N, ...o }; toggles[k] = `x1:N-${k}`; }
  return { N, H, toggles };
}
