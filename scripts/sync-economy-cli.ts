import { readFileSync, writeFileSync } from 'node:fs';
import { CSV_PATH, OUT_PATH, buildBalance, parseEconomyCsv, readEconomyConfig } from './sync-economy';
import { checkColumns, readAllowlist, todayUtc } from './csv-columns';
export function main(argv: string[]) {
  const prevText = readFileSync(OUT_PATH, 'utf8');
  const rows = parseEconomyCsv(readFileSync(CSV_PATH, 'utf8')), cfg = readEconomyConfig(), prev = JSON.parse(prevText);
  // M41-5 (D-HOP-25, G10): unread CSV columns must be allowlisted in product/economy/csv-column-allowlist.md.
  const strict = argv.includes('--strict-allowlist') || process.env.ECONOMY_ALLOWLIST_STRICT === '1';
  const cols = checkColumns(rows, prev, cfg, readAllowlist(), todayUtc(), strict);
  for (const w of cols.warnings) console.warn(`WARNING ${w}`);
  if (cols.errors.length) { for (const e of cols.errors) console.error(`ERROR ${e}`); process.exit(1); }
  console.log(`economy.csv columns: ${Object.keys(rows[0]).length - cols.unread.length} read by sync, ${cols.allowed.length} unread + allowlisted, 0 unknown`);
  const next = JSON.stringify(buildBalance(rows, prev, cfg), null, 2) + '\n';
  if (argv.includes('--check')) {
    if (next !== prevText) { console.error('balance.json is out of date vs data/economy.csv: run npm run sync-economy'); process.exit(1); }
    console.log('balance.json up to date with economy.csv');
  } else { writeFileSync(OUT_PATH, next); console.log(`wrote ${OUT_PATH}`); }
}
main(process.argv);
