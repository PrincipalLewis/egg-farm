// OPT-IN, WARN-ONLY drift report: does data/economy.csv still equal Product's working copy product/economy.csv?
// Default (CI, npm test, npm run build): does nothing and reads nothing outside the repo. The repo's data/economy.csv
// is the source of truth for builds; Economy changes it via PR (engineering/ci-gates.md).
// Enable with --product or ECONOMY_PRODUCT_CHECK=1. Product dir defaults to ../product (studio workspace), override with
// ECONOMY_PRODUCT_DIR. Exits 0 (warning only) on a mismatch or a missing file, unless --strict is given: then exit 1.
// Release gate: npm run check-economy-copy -- --product --strict (engineering/ci-gates.md).
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const on = process.argv.includes('--product') || process.env.ECONOMY_PRODUCT_CHECK === '1';
if (!on) { console.log('check-economy-copy: opt-in only (--product or ECONOMY_PRODUCT_CHECK=1) - skipped'); process.exit(0); }
const strict = process.argv.includes('--strict');
const repo = new URL('../data/economy.csv', import.meta.url);
const prod = join(process.env.ECONOMY_PRODUCT_DIR || fileURLToPath(new URL('../../product', import.meta.url)), 'economy.csv');
const norm = t => t.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/\n+$/, '') + '\n';
if (!existsSync(prod)) { console.warn(`check-economy-copy: ${strict ? 'ERROR' : 'WARNING'} ${prod} not found`); process.exit(strict ? 1 : 0); }
const a = norm(readFileSync(repo, 'utf8')).split('\n'), b = norm(readFileSync(prod, 'utf8')).split('\n');
const diff = []; for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) diff.push(i + 1);
if (diff.length) { console.warn(`check-economy-copy: ${strict ? 'ERROR' : 'WARNING'} data/economy.csv differs from ${prod} on line(s) ${diff.slice(0, 10).join(', ')}${diff.length > 10 ? ', ...' : ''} (Economy updates data/economy.csv via PR)`); if (strict) process.exit(1); }
else console.log(`check-economy-copy: data/economy.csv matches ${prod} (${a.length - 1} lines, line endings normalised)`);
process.exit(0);
