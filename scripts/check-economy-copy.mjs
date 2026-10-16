// Repo copy data/economy.csv must equal Product's source of truth ../product/economy.csv (studio workspace).
// Compared after normalising line endings / BOM / trailing newline: product/ is saved with CRLF, the repo copy is LF.
// Skipped (exit 0) when ../product/economy.csv is absent (clean checkout / CI without the studio workspace).
import { readFileSync, existsSync } from 'node:fs';
const repo = new URL('../data/economy.csv', import.meta.url), prod = new URL('../../product/economy.csv', import.meta.url);
const norm = t => t.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/\n+$/, '') + '\n';
if (!existsSync(prod)) { console.log('check-economy-copy: ../product/economy.csv not found - skipped'); process.exit(0); }
const a = norm(readFileSync(repo, 'utf8')).split('\n'), b = norm(readFileSync(prod, 'utf8')).split('\n');
const diff = []; for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) diff.push(i + 1);
if (diff.length) { console.error(`check-economy-copy: data/economy.csv differs from product/economy.csv on line(s) ${diff.slice(0, 10).join(', ')}${diff.length > 10 ? ', ...' : ''}. Copy product/economy.csv to data/economy.csv, then npm run sync-economy.`); process.exit(1); }
console.log(`check-economy-copy: data/economy.csv matches product/economy.csv (${a.length - 1} lines, line endings normalised)`);
