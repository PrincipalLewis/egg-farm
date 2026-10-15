// Release gate: scripts/check-release-build.mjs fails when the bundled build id has "+dirty".
import { it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path'; import { spawnSync } from 'node:child_process';
const run = (id: string) => { const d = mkdtempSync(join(tmpdir(), 'rb-')); mkdirSync(join(d, 'assets')); writeFileSync(join(d, 'assets', 'i.js'), `const B="${id}";`);
  return spawnSync('node', [new URL('../scripts/check-release-build.mjs', import.meta.url).pathname, d]).status; };
it('clean id passes, +dirty fails', () => { expect(run('m3-rc0+2fae4c4')).toBe(0); expect(run('m3-rc0+2fae4c4+dirty')).toBe(1); });
