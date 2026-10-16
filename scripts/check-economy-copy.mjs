// Repo copies must equal Product's source of truth (studio workspace):
//   data/economy.csv == ../product/economy.m4branch.csv  (branch m4/m4a-tracks only: HoP 15:29, Economy's f1-m4cols merge;
//                       main keeps product/economy.csv until the F1 merge, so this branch must not compare against it)
// Compared after normalising line endings / BOM / trailing newline: product/ is saved with CRLF, the repo copy is LF.
// A pair is skipped when the ../product file is absent (clean checkout / CI without the studio workspace).
import { readFileSync, existsSync } from 'node:fs';
const norm = t => t.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/\n+$/, '') + '\n';
let bad = 0;
for (const [name, src] of [['economy.csv', 'economy.m4branch.csv']]) {
  const repo = new URL(`../data/${name}`, import.meta.url), prod = new URL(`../../product/${src}`, import.meta.url);
  if (!existsSync(prod)) { console.log(`check-economy-copy: ../product/${src} not found - skipped`); continue; }
  if (!existsSync(repo)) { console.error(`check-economy-copy: data/${name} missing`); bad = 1; continue; }
  const a = norm(readFileSync(repo, 'utf8')).split('\n'), b = norm(readFileSync(prod, 'utf8')).split('\n');
  const diff = []; for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) diff.push(i + 1);
  if (diff.length) { console.error(`check-economy-copy: data/${name} differs from product/${src} on line(s) ${diff.slice(0, 10).join(', ')}${diff.length > 10 ? ', ...' : ''}. Copy product/${src} to data/${name}, then npm run sync-economy.`); bad = 1; continue; }
  console.log(`check-economy-copy: data/${name} matches product/${src} (${a.length - 1} lines, line endings normalised)`);
}
process.exit(bad);
