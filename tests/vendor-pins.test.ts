// scripts/check-vendor-pins.mjs (runs first in npm run test:slow). Tamper cases run on temp copies via ECONOMY_VENDOR_DIR (VITEST-only).
import { it, expect } from 'vitest';
import { mkdtempSync, cpSync, rmSync, writeFileSync, mkdirSync, appendFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const script = new URL('../scripts/check-vendor-pins.mjs', import.meta.url).pathname;
const vdir = new URL('../vendor/economy-sim/', import.meta.url).pathname;
const run = (dir?: string, vitest = true) => {
  const env: Record<string, string | undefined> = { ...process.env, ECONOMY_VENDOR_DIR: dir ?? '' }; if (!vitest) delete env.VITEST;
  const r = spawnSync('node', [script], { encoding: 'utf8', env }); return { code: r.status, out: r.stdout + r.stderr };
};
const copy = () => { const d = mkdtempSync(join(tmpdir(), 'pins-')); cpSync(vdir, d, { recursive: true }); return d; };
it('real vendor dir passes', () => { expect(run()).toMatchObject({ code: 0, out: expect.stringMatching(/no unlisted files/) }); });
it('missing SHA256SUMS: ERROR line, exit 1, no stack trace', () => {
  const d = copy(); rmSync(join(d, 'SHA256SUMS')); const r = run(d);
  expect(r.code).toBe(1); expect(r.out).toMatch(/check-vendor-pins: ERROR .*SHA256SUMS not found/); expect(r.out).not.toMatch(/\n\s+at /);
});
it('unlisted extra file fails; README/SOURCE/SHA256SUMS/__pycache__ are ignored', () => {
  const ok = copy(); mkdirSync(join(ok, 'sim', '__pycache__'), { recursive: true }); writeFileSync(join(ok, 'sim', '__pycache__', 'x.pyc'), 'x');
  expect(run(ok).code).toBe(0);
  const extra = copy(); writeFileSync(join(extra, 'sim', 'extra.py'), 'print(1)\n');
  expect(run(extra)).toMatchObject({ code: 1, out: expect.stringMatching(/ERROR unlisted file vendor\/economy-sim\/sim\/extra.py/) });
});
it('tampered pinned file fails; override ignored outside vitest', () => {
  const t = copy(); appendFileSync(join(t, 'sim', 'economy_sim.py'), '#x\n');
  expect(run(t)).toMatchObject({ code: 1, out: expect.stringMatching(/sim\/economy_sim.py sha256 .* != pin/) });
  expect(run(t, false)).toMatchObject({ code: 0, out: expect.stringMatching(/WARNING ECONOMY_VENDOR_DIR ignored/) });
});
it('unlisted symlink fails (CCR #26 m1), even to a regular file outside the vendor dir', () => {
  const d = copy(); symlinkSync('/etc/hostname', join(d, 'sim', 'link.py'));
  expect(run(d)).toMatchObject({ code: 1, out: expect.stringMatching(/ERROR unlisted file vendor\/economy-sim\/sim\/link.py/) });
  const dang = copy(); symlinkSync(join(dang, 'nope'), join(dang, 'sim', 'dangling.py'));
  expect(run(dang).code).toBe(1);
});
it('__pycache__: only *.pyc ignored (CCR #26 n1)', () => {
  const d = copy(); mkdirSync(join(d, 'sim', '__pycache__'), { recursive: true }); writeFileSync(join(d, 'sim', '__pycache__', 'evil.py'), 'x');
  expect(run(d)).toMatchObject({ code: 1, out: expect.stringMatching(/unlisted file vendor\/economy-sim\/sim\/__pycache__\/evil.py/) });
  const l = copy(); mkdirSync(join(l, 'sim', '__pycache__'), { recursive: true }); symlinkSync('/etc/hostname', join(l, 'sim', '__pycache__', 'x.pyc'));
  expect(run(l).code).toBe(1);
});
