// check-economy-copy is an opt-in, warn-only drift report against product/ (engineering/ci-gates.md).
// These tests never read outside the repo: the opt-in runs point ECONOMY_PRODUCT_DIR at temp dirs.
import { it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, cpSync, appendFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const script = new URL('../scripts/check-economy-copy.mjs', import.meta.url).pathname;
const run = (args: string[], env: Record<string, string> = {}) => {
  const r = spawnSync('node', [script, ...args], { encoding: 'utf8', env: { ...process.env, ECONOMY_PRODUCT_CHECK: '', ...env } });
  return { code: r.status, out: r.stdout + r.stderr };
};
it('default run is a no-op skip (reads nothing outside the repo)', () => {
  const r = run([], { ECONOMY_PRODUCT_DIR: '/nonexistent-should-not-be-read' });
  expect(r.code).toBe(0); expect(r.out).toMatch(/opt-in only/);
});
it('opt-in: match reported, mismatch and missing file only warn (exit 0)', () => {
  const ok = mkdtempSync(join(tmpdir(), 'prod-'));
  writeFileSync(join(ok, 'economy.csv'), readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8').replace(/\n/g, '\r\n'));
  expect(run(['--product'], { ECONOMY_PRODUCT_DIR: ok })).toMatchObject({ code: 0, out: expect.stringMatching(/matches/) });
  const bad = mkdtempSync(join(tmpdir(), 'prod-')); writeFileSync(join(bad, 'economy.csv'), 'level\n0\n');
  expect(run([], { ECONOMY_PRODUCT_CHECK: '1', ECONOMY_PRODUCT_DIR: bad })).toMatchObject({ code: 0, out: expect.stringMatching(/WARNING .*differs/) });
  expect(run(['--product'], { ECONOMY_PRODUCT_DIR: join(bad, 'nope') })).toMatchObject({ code: 0, out: expect.stringMatching(/WARNING .*not found/) });
});
// A temp product/ dir mirroring data/economy.csv plus every vendored file listed in vendor/economy-sim/SOURCE.
const vdir = new URL('../vendor/economy-sim/', import.meta.url);
const sourceRows = readFileSync(new URL('SOURCE', vdir), 'utf8').split('\n').map(l => l.trim())
  .filter(l => l && !l.startsWith('#') && !/^vendored:/.test(l)).map(l => l.split(/\s+/));
const fullProduct = () => {
  const d = mkdtempSync(join(tmpdir(), 'prod-'));
  writeFileSync(join(d, 'economy.csv'), readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'));
  for (const [, vend, src] of sourceRows) {
    const p = join(d, src.slice('product/'.length)); mkdirSync(join(p, '..'), { recursive: true });
    cpSync(new URL(vend, vdir).pathname, p);
  }
  return d;
};
it('--strict: exit 1 on mismatch or missing product file, exit 0 on match', () => {
  expect(sourceRows.length).toBeGreaterThanOrEqual(4);
  const ok = fullProduct();
  expect(run(['--product', '--strict'], { ECONOMY_PRODUCT_DIR: ok })).toMatchObject({ code: 0, out: expect.stringMatching(/vendored file\(s\) match/) });
  const bad = fullProduct(); writeFileSync(join(bad, 'economy.csv'), 'level\n0\n');
  expect(run(['--product', '--strict'], { ECONOMY_PRODUCT_DIR: bad })).toMatchObject({ code: 1, out: expect.stringMatching(/ERROR .*differs/) });
  expect(run(['--product', '--strict'], { ECONOMY_PRODUCT_DIR: join(bad, 'nope') })).toMatchObject({ code: 1, out: expect.stringMatching(/ERROR .*not found/) });
});
it('--strict implies --product: a mistyped release-gate command (no --product) does not pass green', () => {
  const r = run(['--strict'], { ECONOMY_PRODUCT_DIR: '/nonexistent-product-dir' });
  expect(r.code).toBe(1); expect(r.out).not.toMatch(/opt-in only/); expect(r.out).toMatch(/ERROR .*not found/);
  expect(run(['--strict'], { ECONOMY_PRODUCT_DIR: fullProduct() }).code).toBe(0);
});
it('--strict: each vendored sim file in SOURCE must match product/ by sha256 (fail closed on drift or missing)', () => {
  for (const [, , src] of sourceRows) {
    const drift = fullProduct(); appendFileSync(join(drift, src.slice('product/'.length)), '\n# drift\n');
    expect(run(['--strict'], { ECONOMY_PRODUCT_DIR: drift })).toMatchObject({ code: 1, out: expect.stringMatching(/ERROR .*differs from/) });
    const gone = fullProduct(); writeFileSync(join(gone, 'economy.csv'), readFileSync(new URL('../data/economy.csv', import.meta.url)));
    const missing = join(gone, src.slice('product/'.length)); rmSync(missing);
    expect(run(['--strict'], { ECONOMY_PRODUCT_DIR: gone })).toMatchObject({ code: 1, out: expect.stringMatching(/ERROR .*not found/) });
  }
  // non-strict --product stays warn-only and ignores the sim side
  const drift = fullProduct(); appendFileSync(join(drift, sourceRows[0][2].slice('product/'.length)), 'x');
  expect(run(['--product'], { ECONOMY_PRODUCT_DIR: drift }).code).toBe(0);
});
const tamperedVendor = (edit: (source: string, sums: string) => [string, string]) => {
  const d = mkdtempSync(join(tmpdir(), 'vend-')); cpSync(vdir.pathname, d, { recursive: true });
  const [a, b] = edit(readFileSync(join(d, 'SOURCE'), 'utf8'), readFileSync(join(d, 'SHA256SUMS'), 'utf8'));
  writeFileSync(join(d, 'SOURCE'), a); writeFileSync(join(d, 'SHA256SUMS'), b); return d;
};
it('--strict: SOURCE rows containing a colon are still checked (only ^vendored: is a header)', () => {
  const ok = fullProduct();
  expect(run(['--strict'], { ECONOMY_PRODUCT_DIR: ok, ECONOMY_VENDOR_DIR: tamperedVendor((a, b) => [a, b]) }).code).toBe(0);
  // a C:-prefixed row used to be dropped by the header filter and --strict exited 0
  const colon = tamperedVendor((a, b) => [a.replace(/^(eddf945d\S+)/m, 'C:$1'), b]);
  expect(run(['--strict'], { ECONOMY_PRODUCT_DIR: ok, ECONOMY_VENDOR_DIR: colon })).toMatchObject({ code: 1, out: expect.stringMatching(/ERROR/) });
  const colonPath = tamperedVendor((a, b) => [a.replace('  sim/economy_sim.py  ', '  C:sim/economy_sim.py  '), b]);
  expect(run(['--strict'], { ECONOMY_PRODUCT_DIR: ok, ECONOMY_VENDOR_DIR: colonPath })).toMatchObject({ code: 1, out: expect.stringMatching(/ERROR .*not found/) });
});
it('--strict: SOURCE file-row count must equal SHA256SUMS entry count (fail closed)', () => {
  const ok = fullProduct();
  const dropped = tamperedVendor((a, b) => [a.split('\n').filter(l => !l.includes('seller_variance_sim.py')).join('\n'), b]);
  expect(run(['--strict'], { ECONOMY_PRODUCT_DIR: ok, ECONOMY_VENDOR_DIR: dropped })).toMatchObject({ code: 1, out: expect.stringMatching(/ERROR SOURCE has 3 .*SHA256SUMS has 4/) });
  const extraSum = tamperedVendor((a, b) => [a, b + '0'.repeat(64) + '  extra.py\n']);
  expect(run(['--strict'], { ECONOMY_PRODUCT_DIR: ok, ECONOMY_VENDOR_DIR: extraSum })).toMatchObject({ code: 1, out: expect.stringMatching(/SHA256SUMS has 5/) });
});
it('--strict: SHA256SUMS (path, sha) set must equal SOURCE exactly (same count, one hash changed -> exit 1)', () => {
  const ok = fullProduct();
  const oneHash = tamperedVendor((a, b) => [a, b.replace(/^eddf945d/m, '0000000d')]);
  expect(run(['--strict'], { ECONOMY_PRODUCT_DIR: ok, ECONOMY_VENDOR_DIR: oneHash })).toMatchObject({ code: 1, out: expect.stringMatching(/ERROR SOURCE and SHA256SUMS \(path, sha\) sets differ/) });
  const onePath = tamperedVendor((a, b) => [a, b.replace('  sim/economy_sim.py', '  sim/other.py')]);
  expect(run(['--strict'], { ECONOMY_PRODUCT_DIR: ok, ECONOMY_VENDOR_DIR: onePath }).code).toBe(1);
});
it('--strict: SOURCE paths resolving outside the vendor dir are rejected (../)', () => {
  const ok = fullProduct();
  const esc = tamperedVendor((a, b) => [a.replace('  sim/economy_sim.py  ', '  ../economy-sim/sim/economy_sim.py  '), b.replace('  sim/economy_sim.py', '  ../economy-sim/sim/economy_sim.py')]);
  expect(run(['--strict'], { ECONOMY_PRODUCT_DIR: ok, ECONOMY_VENDOR_DIR: esc })).toMatchObject({ code: 1, out: expect.stringMatching(/resolves outside the vendor dir/) });
});
it('ECONOMY_VENDOR_DIR is honoured only under vitest, logged to stderr; ignored with a warning otherwise', () => {
  const ok = fullProduct(); const broken = tamperedVendor((a, b) => [a, b.replace(/^eddf945d/m, '0000000d')]);
  const r = spawnSync('node', [script, '--strict'], { encoding: 'utf8', env: { ...process.env, VITEST: 'true', ECONOMY_PRODUCT_DIR: ok, ECONOMY_VENDOR_DIR: broken } });
  expect(r.status).toBe(1); expect(r.stderr).toContain(`ECONOMY_VENDOR_DIR override ${broken}`);
  const env: Record<string, string | undefined> = { ...process.env, ECONOMY_PRODUCT_DIR: ok, ECONOMY_VENDOR_DIR: broken }; delete env.VITEST;
  const n = spawnSync('node', [script, '--strict'], { encoding: 'utf8', env });
  expect(n.status).toBe(0); expect(n.stdout + n.stderr).toMatch(/WARNING ECONOMY_VENDOR_DIR ignored/);
});
it('--strict: a duplicate-only SOURCE/SHA256SUMS mismatch names the duplicates (no empty set lists)', () => {
  const ok = fullProduct();
  const dup = tamperedVendor((a, b) => { const r = a.split('\n').find(l => l.includes('sim/economy_sim.py'))!; const s = b.split('\n').find(l => l.includes('sim/economy_sim.py'))!; return [a + r + '\n', b + s + '\n']; });
  const r = run(['--strict'], { ECONOMY_PRODUCT_DIR: ok, ECONOMY_VENDOR_DIR: dup });
  expect(r.code).toBe(1); expect(r.out).toMatch(/ERROR duplicate \(path, sha\) row\(s\): SOURCE 5 rows \/ 4 unique, SHA256SUMS 5 rows \/ 4 unique/);
  expect(r.out).not.toMatch(/sets differ/);
});
it('--strict: a product/ file named ..foo is inside product/ (not a false reject); product/../ still rejected', () => {
  const ok = fullProduct(); cpSync(new URL('sim/economy_sim.py', vdir).pathname, join(ok, '..foo_economy_sim.py'));
  const dotdot = tamperedVendor((a, b) => [a.replace('  product/sim/economy_sim.py', '  product/..foo_economy_sim.py'), b]);
  expect(run(['--strict'], { ECONOMY_PRODUCT_DIR: ok, ECONOMY_VENDOR_DIR: dotdot })).toMatchObject({ code: 0, out: expect.not.stringMatching(/outside the product dir/) });
  const esc = tamperedVendor((a, b) => [a.replace('  product/sim/economy_sim.py', '  product/../economy_sim.py'), b]);
  expect(run(['--strict'], { ECONOMY_PRODUCT_DIR: ok, ECONOMY_VENDOR_DIR: esc })).toMatchObject({ code: 1, out: expect.stringMatching(/outside the product dir/) });
});
it('--strict compares raw sha256: a CRLF (or BOM) product/economy.csv fails --strict, only matches/warns without it', () => {
  const crlf = fullProduct(); writeFileSync(join(crlf, 'economy.csv'), readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8').replace(/\n/g, '\r\n'));
  expect(run(['--strict'], { ECONOMY_PRODUCT_DIR: crlf })).toMatchObject({ code: 1, out: expect.stringMatching(/ERROR data\/economy.csv sha256 \w+ differs .*raw bytes/) });
  expect(run(['--product'], { ECONOMY_PRODUCT_DIR: crlf })).toMatchObject({ code: 0, out: expect.stringMatching(/matches .*line endings normalised/) });
  const bom = fullProduct(); writeFileSync(join(bom, 'economy.csv'), '\uFEFF' + readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8'));
  expect(run(['--strict'], { ECONOMY_PRODUCT_DIR: bom }).code).toBe(1);
  expect(run(['--strict'], { ECONOMY_PRODUCT_DIR: fullProduct() })).toMatchObject({ code: 0, out: expect.stringMatching(/byte-for-byte/) });
});
