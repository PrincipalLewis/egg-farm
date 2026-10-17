// Verifies every vendor/economy-sim/SHA256SUMS pin (sha256 of the vendored file) and that no unlisted file sits in
// vendor/economy-sim (top-level README.md, SOURCE, SHA256SUMS and __pycache__/*.pyc are ignored; any other non-directory entry, symlinks included, must be listed). Reads only the repo.
// Runs first in `npm run test:slow`, so the slow suites never execute a tampered vendored sim (the default
// suite checks the same pins in tests/economy.test.ts beforeAll).
// ECONOMY_VENDOR_DIR overrides the vendor dir, honoured only under vitest (process.env.VITEST); otherwise ignored with a warning.
import { readFileSync, existsSync, readdirSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
let vroot = fileURLToPath(new URL('../vendor/economy-sim/', import.meta.url));
if (process.env.ECONOMY_VENDOR_DIR) {
  if (process.env.VITEST) { vroot = resolve(process.env.ECONOMY_VENDOR_DIR); console.error(`check-vendor-pins: using ECONOMY_VENDOR_DIR override ${vroot}`); }
  else console.warn('check-vendor-pins: WARNING ECONOMY_VENDOR_DIR ignored (test-only, honoured only under vitest)');
}
const fail = m => { console.error(`check-vendor-pins: ERROR ${m}`); return true; };
const sums = join(vroot, 'SHA256SUMS');
if (!existsSync(sums)) { fail(`${sums} not found`); process.exit(1); }
const rows = readFileSync(sums, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
let bad = rows.length === 0 && fail('SHA256SUMS lists no files');
const listed = new Set();
const isLink = f => { try { return lstatSync(f).isSymbolicLink(); } catch { return false; } };
for (const r of rows) {
  const m = r.match(/^([0-9a-f]{64})\s+\*?(\S+)$/);
  if (!m || m[2].split('/').includes('..')) { bad = fail(`malformed row: ${r}`); continue; }
  listed.add(m[2]);
  const f = join(vroot, m[2]);
  if (isLink(f)) { bad = fail(`${m[2]} is a symlink (vendored files must be regular files)`); continue; }
  if (!existsSync(f)) { bad = fail(`${m[2]} not found`); continue; }
  const h = createHash('sha256').update(readFileSync(f)).digest('hex');
  if (h !== m[1]) bad = fail(`${m[2]} sha256 ${h.slice(0, 8)} != pin ${m[1].slice(0, 8)}`);
}
const IGNORE = new Set(['README.md', 'SOURCE', 'SHA256SUMS']);
for (const e of readdirSync(vroot, { recursive: true, withFileTypes: true })) {
  if (e.isDirectory()) continue; // any non-directory (file, symlink, fifo, socket...) must be listed (CCR #26 m1)
  const rel = relative(vroot, join(e.parentPath ?? e.path, e.name)).split(sep).join('/');
  if (IGNORE.has(rel)) continue;
  if (rel.split('/').includes('__pycache__') && e.isFile() && rel.endsWith('.pyc')) continue; // only *.pyc (CCR #26 n1)
  if (!listed.has(rel)) bad = fail(`unlisted file vendor/economy-sim/${rel} (add it to SHA256SUMS and SOURCE, or remove it)`);
}
if (bad) process.exit(1);
console.log(`check-vendor-pins: ${rows.length} vendored file(s) match SHA256SUMS, no unlisted files`);
