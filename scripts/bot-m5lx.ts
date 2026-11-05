// CLI for tests/bot-m5.ts refillGate(): the same env interface, stdout, stderr and PERSEED files as Economy's m5lx.ts (sha1 7123fc25), so the two
// can be diffed byte for byte (artifacts/bot-m5b-parity). Tooling only.
// Usage: CSV=<csv> CFG=base|auto|off|both|neglect [AT RES REST WAIVE MANAT COST HOLD NOWIN WIN PROFS SEEDS S0 T STEP REGEN CAP ARES PERSEED] npx vite-node scripts/bot-m5lx.ts
// CLOCK=1 / PAYWAGE=1 are refused: clock wage is the M5.1 src piece (m4.flags.clockWage), and Pay wage (H1) is closed.
import { readFileSync, writeFileSync } from 'node:fs'; import { createHash } from 'node:crypto';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from './sync-economy';
import { validateBalance, type Balance } from '../src/config/balance';
import { loadTargets } from '../tests/pacing-guards';
import { refillGate, BotUsageError } from '../tests/bot-m5';
const E = process.env;
if (E.CLOCK === '1' || E.PAYWAGE === '1') { console.error('bot-m5lx: CLOCK=1 / PAYWAGE=1 need src changes that are not on this tree (M5.1 src piece; H1 is closed)'); process.exit(2); }
const csv = E.CSV ?? '../t3-draft.csv', raw = readFileSync(csv);
const prev = JSON.parse(readFileSync(new URL('../src/config/balance.json', import.meta.url), 'utf8'));
const b = validateBalance(buildBalance(parseEconomyCsv(raw.toString('utf8')), prev, readEconomyConfig() as any) as Balance, false);
try { const out = refillGate(b, E, loadTargets(), { csv, sha: createHash('sha256').update(raw).digest('hex'), log: l => console.error(l), perSeed: (f, j) => writeFileSync(f, j) }); console.log(JSON.stringify(out)); }
catch (e) { if (e instanceof BotUsageError) { console.error(`bot-m5lx: ${e.message}`); process.exit(2); } throw e; }
