// CLI for tests/bot-m5.ts pressureRuns(): the same env interface, output files and stderr as Economy's m5px.ts (sha1 c20ad937), so the two can be
// diffed byte for byte (artifacts/bot-m5b-parity). Tooling only. Extra: TOG=<prefix> writes per-seed Asleep<->Unpaid toggles (D6 bar <= 12 / 30 min).
// Usage: CSV=<csv> OUT=<prefix> [PROFS=optimal,seller15,casual CFGS=on,off PERT=0 SEEDS=200 S0=1 TOG=<prefix>] npx vite-node scripts/bot-m5px.ts
// Clock wage (M5.1 src piece) is NOT set here: on a tree without m4.flags.clockWage the results differ from artifacts/m52-o1a (see VERDICT).
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from './sync-economy';
import { validateBalance, type Balance } from '../src/config/balance';
import { pressureRuns, BotUsageError } from '../tests/bot-m5';
const prev = JSON.parse(readFileSync(new URL('../src/config/balance.json', import.meta.url), 'utf8'));
const b = validateBalance(buildBalance(parseEconomyCsv(readFileSync(process.env.CSV ?? '../t3-draft.csv', 'utf8')), prev, readEconomyConfig() as any) as Balance, false);
try { pressureRuns(b, process.env, { reset: f => writeFileSync(f, ''), append: (f, l) => appendFileSync(f, l), log: l => console.error(l), tog: (f, j) => writeFileSync(f, j) }); }
catch (e) { if (e instanceof BotUsageError) { console.error(`bot-m5px: ${e.message}`); process.exit(2); } throw e; }
