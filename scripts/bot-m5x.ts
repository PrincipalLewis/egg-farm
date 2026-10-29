// CLI for tests/bot-m5.ts windowGate(): the same env interface, stdout and stderr as Economy's m5x.ts (sha256 196e8ed5...),
// so the two can be diffed byte for byte (artifacts/bot-m5-parity). Tooling only: reads src/, tests/, data/ and the CSV; writes nothing.
// Usage: CSV=data/economy.csv SEEDS=200 S0=1 CFG=AssZ PROFS=optimal,seller15,casual [T=12000 STEP=300 STEP_FROM=30 NOWIN=1] npx vite-node scripts/bot-m5x.ts
import { readFileSync } from 'node:fs'; import { createHash } from 'node:crypto';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from './sync-economy';
import { validateBalance, type Balance } from '../src/config/balance';
import { loadTargets } from '../tests/pacing-guards';
import { windowGate, gateOptsFromEnv, BotUsageError } from '../tests/bot-m5';
const csv = process.env.CSV ?? '../t3-draft.csv', raw = readFileSync(csv);
const prev = JSON.parse(readFileSync(new URL('../src/config/balance.json', import.meta.url), 'utf8'));
const b = validateBalance(buildBalance(parseEconomyCsv(raw.toString('utf8')), prev, readEconomyConfig() as any) as Balance, false);
try { // CCR N-1 on #78: bad CFG/PROFS names (incl. __proto__/constructor/toString) and bad SEEDS/S0/T/STEP exit 2
  const g = gateOptsFromEnv(process.env, loadTargets());
  const out: any = { csv, sha: createHash('sha256').update(raw).digest('hex'), seeds: [g.s0, g.s0 + g.seeds - 1], T: g.T, STEP: g.step };
  Object.assign(out, windowGate(b, { ...g, onResult: (_k, o) => console.error(JSON.stringify(o)) }));
  console.log(JSON.stringify(out));
} catch (e) { if (e instanceof BotUsageError) { console.error(`bot-m5x: ${e.message}`); process.exit(2); } throw e; }
