import { readFileSync, writeFileSync } from 'node:fs';
import { CSV_PATH, OUT_PATH, buildBalance, parseEconomyCsv, readEconomyConfig } from './sync-economy';
export function main(argv: string[]) {
  const prevText = readFileSync(OUT_PATH, 'utf8');
  const next = JSON.stringify(buildBalance(parseEconomyCsv(readFileSync(CSV_PATH, 'utf8')), JSON.parse(prevText), readEconomyConfig()), null, 2) + '\n';
  if (argv.includes('--check')) {
    if (next !== prevText) { console.error('balance.json is out of date vs data/economy.csv: run npm run sync-economy'); process.exit(1); }
    console.log('balance.json up to date with economy.csv');
  } else { writeFileSync(OUT_PATH, next); console.log(`wrote ${OUT_PATH}`); }
}
main(process.argv);
