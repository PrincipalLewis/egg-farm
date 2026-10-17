// OPT-IN, WARN-ONLY drift report: does data/economy.csv still equal Product's working copy product/economy.csv?
// Default (CI, npm test, npm run build): does nothing and reads nothing outside the repo. The repo's data/economy.csv
// is the source of truth for builds; Economy changes it via PR (engineering/ci-gates.md).
// Enable with --product or ECONOMY_PRODUCT_CHECK=1. Product dir defaults to ../product (studio workspace), override with
// ECONOMY_PRODUCT_DIR. Exits 0 (warning only) on a mismatch or a missing file, unless --strict is given: then exit 1.
// --strict implies --product (a mistyped release-gate command must not pass green) and additionally compares the sha256
// of every vendored file listed in vendor/economy-sim/SOURCE against its product/ counterpart, failing closed.
// Release gate: npm run check-economy-copy -- --product --strict (engineering/ci-gates.md).
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const strict = process.argv.includes('--strict');
const on = strict || process.argv.includes('--product') || process.env.ECONOMY_PRODUCT_CHECK === '1';
if (!on) { console.log('check-economy-copy: opt-in only (--product or ECONOMY_PRODUCT_CHECK=1) - skipped'); process.exit(0); }
const repo = new URL('../data/economy.csv', import.meta.url);
const prodDir = process.env.ECONOMY_PRODUCT_DIR || fileURLToPath(new URL('../../product', import.meta.url));
const prod = join(prodDir, 'economy.csv');
if (strict) { // vendored sim side: each SOURCE row <sha> <vendored path> product/<path> must match byte-for-byte (sha256)
  // ECONOMY_VENDOR_DIR overrides the vendor dir (tests only).
  const vdir = process.env.ECONOMY_VENDOR_DIR ? new URL(`file://${join(process.env.ECONOMY_VENDOR_DIR, '/')}`) : new URL('../vendor/economy-sim/', import.meta.url);
  const lines = f => existsSync(new URL(f, vdir)) ? readFileSync(new URL(f, vdir), 'utf8').split('\n').map(l => l.trim()) : null;
  const src = lines('SOURCE'), sums = lines('SHA256SUMS');
  if (!src || !sums) { console.warn(`check-economy-copy: ERROR vendor SOURCE or SHA256SUMS not found`); process.exit(1); }
  // Skip only blank lines, # comments and the `vendored:` date header; every other line is a file row and is checked.
  const rows = src.filter(l => l && !l.startsWith('#') && !/^vendored:/.test(l));
  const nsums = sums.filter(l => l && !l.startsWith('#')).length;
  const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');
  let bad = rows.length === 0; if (bad) console.warn('check-economy-copy: ERROR vendor/economy-sim/SOURCE lists no files');
  if (rows.length !== nsums) { console.warn(`check-economy-copy: ERROR SOURCE has ${rows.length} file row(s) but SHA256SUMS has ${nsums}`); bad = true; }
  for (const r of rows) {
    const [pin, vend, src] = r.split(/\s+/);
    if (!pin || !vend || !src || !src.startsWith('product/')) { console.warn(`check-economy-copy: ERROR malformed SOURCE row: ${r}`); bad = true; continue; }
    const v = join(fileURLToPath(vdir), vend), p = join(prodDir, src.slice('product/'.length));
    if (!existsSync(v)) { console.warn(`check-economy-copy: ERROR vendored ${vend} not found`); bad = true; continue; }
    if (!existsSync(p)) { console.warn(`check-economy-copy: ERROR ${p} not found`); bad = true; continue; }
    const hv = sha(v), hp = sha(p);
    if (hv !== pin) { console.warn(`check-economy-copy: ERROR vendored ${vend} sha256 ${hv.slice(0, 8)} != SOURCE pin ${pin.slice(0, 8)}`); bad = true; }
    else if (hp !== hv) { console.warn(`check-economy-copy: ERROR vendor/economy-sim/${vend} (${hv.slice(0, 8)}) differs from ${p} (${hp.slice(0, 8)})`); bad = true; }
  }
  if (bad) process.exit(1);
  console.log(`check-economy-copy: ${rows.length} vendored file(s) match product/ (sha256)`);
}
const norm = t => t.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/\n+$/, '') + '\n';
if (!existsSync(prod)) { console.warn(`check-economy-copy: ${strict ? 'ERROR' : 'WARNING'} ${prod} not found`); process.exit(strict ? 1 : 0); }
const a = norm(readFileSync(repo, 'utf8')).split('\n'), b = norm(readFileSync(prod, 'utf8')).split('\n');
const diff = []; for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) diff.push(i + 1);
if (diff.length) { console.warn(`check-economy-copy: ${strict ? 'ERROR' : 'WARNING'} data/economy.csv differs from ${prod} on line(s) ${diff.slice(0, 10).join(', ')}${diff.length > 10 ? ', ...' : ''} (Economy updates data/economy.csv via PR)`); if (strict) process.exit(1); }
else console.log(`check-economy-copy: data/economy.csv matches ${prod} (${a.length - 1} lines, line endings normalised)`);
process.exit(0);
