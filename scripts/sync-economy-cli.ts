import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { CSV_PATH, M4_CSV_PATH, OUT_PATH, buildBalance, graftM4, parseEconomyCsv } from './sync-economy';
export function main(argv: string[]) {
  const prevText = readFileSync(OUT_PATH, 'utf8');
  const next = JSON.stringify(buildBalance(graftM4(parseEconomyCsv(readFileSync(CSV_PATH, 'utf8')), existsSync(M4_CSV_PATH) ? parseEconomyCsv(readFileSync(M4_CSV_PATH, 'utf8')) : null), JSON.parse(prevText)), null, 2) + '\n';
  if (argv.includes('--check')) {
    if (next !== prevText) { console.error('balance.json is out of date vs product/economy.csv: run npm run sync-economy'); process.exit(1); }
    console.log('balance.json up to date with economy.csv');
  } else { writeFileSync(OUT_PATH, next); console.log(`wrote ${OUT_PATH}`); }
}
main(process.argv);
