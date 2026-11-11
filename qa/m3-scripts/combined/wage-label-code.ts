// vite-node wage-label-code.ts <clone>: s2-8-wage-aa66bdb.ts boundaries on one clone (rc1-ui alone: rates.ts from the same clone if present, else label-only).
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const R = process.argv[2]; const alt = process.env.S2MONEY_WT ?? '/tmp/qa-x/clean/20f6bd0';
const B = fs.existsSync(R + '/src/ui/rates.ts') ? R : fs.existsSync(alt + '/src/ui/rates.ts') ? alt : '';
if (!B) { console.log('N/A (no src/ui/rates.ts in this SHA and no s2-money clone at S2MONEY_WT)'); process.exit(0); }
if (B !== R) console.log(`NOTE row parity uses ui.rates() from ${B} (rates.ts not in this SHA)`);
let out = ""; try { out = execFileSync(R + '/node_modules/.bin/vite-node', ['/workspace/egg-farm-studio/qa/m3-scripts/s2-8-wage-aa66bdb.ts', R, B || R], { encoding: 'utf8', cwd: R, stdio: ['ignore', 'pipe', 'pipe'] }).toString(); } catch (e: any) { out = String(e.stdout ?? "") + "\nFAIL wage script exit " + e.status; }
process.stdout.write(out); process.exit(/^FAIL/m.test(out) ? 1 : 0);
