/**
 * M41-5 (D-HOP-25, gates.md G10): every data/economy.csv column must be read by the sync (scripts/sync-economy.ts ->
 * src/config/balance.json) or be listed in product/economy/csv-column-allowlist.md. Reads are detected by tracking, not grep:
 * buildBalance runs on rows wrapped in a recording Proxy, and a column counts as read when its value is fetched (`get`).
 * Presence checks (`in`) and key listing (Object.keys) do not count. The allowlist is parsed from the markdown at runtime.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildBalance, type EconomyConfig } from './sync-economy';
export const ALLOWLIST_PATH = fileURLToPath(new URL('../product/economy/csv-column-allowlist.md', import.meta.url));
type Row = Record<string, number>;
export interface AllowEntry { name: string; prefix: boolean; owner: string; expires: string; feature: string; line: number }

/** Parse the first markdown table whose header has `column`, `owner` and `expires` cells. Malformed rows throw. */
export function parseAllowlist(md: string): AllowEntry[] {
  const lines = md.split(/\r?\n/), cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  const hi = lines.findIndex(l => l.trim().startsWith('|') && (h => h.includes('column') && h.includes('owner') && h.includes('expires'))(cells(l).map(c => c.toLowerCase())));
  if (hi < 0) throw new Error('csv-column-allowlist: no table with column | owner | expires header');
  const head = cells(lines[hi]).map(c => c.toLowerCase()), ci = head.indexOf('column'), oi = head.indexOf('owner'), ei = head.indexOf('expires'), fi = head.indexOf('feature');
  const out: AllowEntry[] = [];
  for (let i = hi + 1; i < lines.length && lines[i].trim().startsWith('|'); i++) {
    const c = cells(lines[i]); if (c.every(x => /^:?-+:?$/.test(x))) continue; // separator row
    const owner = c[oi] ?? '', expires = c[ei] ?? '', feature = fi >= 0 ? c[fi] ?? '' : '';
    if (!owner) throw new Error(`csv-column-allowlist line ${i + 1}: owner is required`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expires) || Number.isNaN(Date.parse(expires))) throw new Error(`csv-column-allowlist line ${i + 1}: expires must be YYYY-MM-DD, got "${expires}"`);
    for (const raw of (c[ci] ?? '').split(',').map(s => s.trim().replace(/`/g, '')).filter(Boolean)) {
      if (!/^[a-z0-9_]+\*?$/.test(raw)) throw new Error(`csv-column-allowlist line ${i + 1}: bad column name "${raw}"`);
      out.push({ name: raw.replace(/\*$/, ''), prefix: raw.endsWith('*'), owner, expires, feature, line: i + 1 });
    }
  }
  if (!out.length) throw new Error('csv-column-allowlist: table has no entries');
  return out;
}
export const allowMatch = (e: AllowEntry, col: string) => e.prefix ? col.startsWith(e.name) : col === e.name;

/** Columns whose value buildBalance actually fetches, for these rows/config. */
export function trackReads(rows: Row[], prev: unknown, cfg: EconomyConfig = {}): Set<string> {
  const read = new Set<string>(), cols = new Set(Object.keys(rows[0] ?? {}));
  const wrap = (r: Row) => new Proxy(r, { get(t, k, rcv) { if (typeof k === 'string' && cols.has(k)) read.add(k); return Reflect.get(t, k, rcv); } });
  buildBalance(rows.map(wrap), structuredClone(prev), cfg);
  return read;
}
export interface ColumnReport { unread: string[]; allowed: { col: string; entry: AllowEntry }[]; violations: string[]; expired: AllowEntry[]; unusedEntries: AllowEntry[]; noMatchEntries: AllowEntry[]; errors: string[]; warnings: string[] }
/** today: YYYY-MM-DD. An entry is expired when today > expires. strict: expired entries that still cover a column are errors.
 *  strict is ONLY for the Oct 22 triage script (npm run economy:allowlist-triage); build/CI/release paths never pass it, so
 *  expiry can only warn there and a build never depends on the date. Entries matching no CSV column at all warn (never fail). */
export function checkColumns(rows: Row[], prev: unknown, cfg: EconomyConfig, allow: AllowEntry[], today: string, strict = false): ColumnReport {
  const header = Object.keys(rows[0] ?? {}), read = trackReads(rows, prev, cfg);
  const unread = header.filter(c => !read.has(c)), allowed: ColumnReport['allowed'] = [], violations: string[] = [];
  for (const col of unread) { const entry = allow.find(e => allowMatch(e, col)); if (entry) allowed.push({ col, entry }); else violations.push(col); }
  const expired = allow.filter(e => today > e.expires && allowed.some(a => a.entry === e));
  const unusedEntries = allow.filter(e => !allowed.some(a => a.entry === e));
  const noMatchEntries = allow.filter(e => !header.some(c => allowMatch(e, c)));
  const errors = violations.map(c => `economy.csv column ${c} is not read by scripts/sync-economy.ts and is not in product/economy/csv-column-allowlist.md (wire it, drop it, or allowlist it with owner + expiry)`);
  const warnings: string[] = [];
  for (const e of expired) (strict ? errors : warnings).push(`csv-column-allowlist entry ${e.name}${e.prefix ? '*' : ''} (owner ${e.owner}) expired ${e.expires}: slot it into a milestone or drop the column`);
  for (const e of noMatchEntries) warnings.push(`csv-column-allowlist entry ${e.name}${e.prefix ? '*' : ''} (owner ${e.owner}, line ${e.line}) matches no economy.csv column: remove it or add the column`);
  return { unread, allowed, violations, expired, unusedEntries, noMatchEntries, errors, warnings };
}
export const todayUtc = () => new Date().toISOString().slice(0, 10);
export const readAllowlist = (path = ALLOWLIST_PATH) => parseAllowlist(readFileSync(path, 'utf8'));
/** Strict expiry only via the explicit --strict-allowlist flag (economy:allowlist-triage). There is deliberately no
 *  environment switch: a stray env var on a CI runner must never make a build depend on the date. */
export const STRICT_FLAG = '--strict-allowlist';
export const isStrict = (argv: readonly string[]) => argv.includes(STRICT_FLAG);
