// Verifies every vendor/economy-sim/SHA256SUMS pin (sha256 of the vendored file). Reads only the repo.
// Runs first in `npm run test:slow`, so the slow suites never execute a tampered vendored sim (the default
// suite checks the same pins in tests/economy.test.ts beforeAll).
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const vdir = new URL('../vendor/economy-sim/', import.meta.url);
const rows = readFileSync(new URL('SHA256SUMS', vdir), 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
let bad = rows.length === 0;
for (const r of rows) {
  const m = r.match(/^([0-9a-f]{64})\s+\*?(\S+)$/);
  if (!m || m[2].split('/').includes('..')) { console.error(`check-vendor-pins: ERROR malformed row: ${r}`); bad = true; continue; }
  const f = new URL(m[2], vdir);
  if (!existsSync(f)) { console.error(`check-vendor-pins: ERROR ${m[2]} not found`); bad = true; continue; }
  const h = createHash('sha256').update(readFileSync(f)).digest('hex');
  if (h !== m[1]) { console.error(`check-vendor-pins: ERROR ${m[2]} sha256 ${h.slice(0, 8)} != pin ${m[1].slice(0, 8)}`); bad = true; }
}
if (bad) process.exit(1);
console.log(`check-vendor-pins: ${rows.length} vendored file(s) match SHA256SUMS`);
