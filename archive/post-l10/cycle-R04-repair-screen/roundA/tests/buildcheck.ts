// roundA build-only check (no simulation): does the harness's sync-economy accept a CSV? usage (cwd=../../h): CSV=<csv> vite-node ../roundA/tests/buildcheck.ts
import { readFileSync } from 'node:fs';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from '../../h/scripts/sync-economy';
import { validateBalance, type Balance } from '../../h/src/config/balance';
try { const b = validateBalance(buildBalance(parseEconomyCsv(readFileSync(process.env.CSV!, 'utf8')), JSON.parse(readFileSync('./src/config/balance.json', 'utf8')), readEconomyConfig() as any) as Balance, false);
  console.log(JSON.stringify({ ok: true, coll: [17,18,19,20,21,22].map(L => (b as any).collection.costTable ? (b as any).collection.costTable[L] : 'formula'), growth: (b as any).collection.costGrowth, g5: (b as any).workers.grader.tiers[4] }));
} catch (e: any) { console.log(JSON.stringify({ ok: false, err: String(e.message).slice(0, 300) })); }
