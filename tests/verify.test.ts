// VER-1: tests for `npm run verify` itself (scripts/verify.ts + scripts/verify/*). Node only; the build + browser steps run in
// the verify-smoke CI job and locally (`npm run verify -- --hours 1`), not here.
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { balance } from '../src/config/balance';
import { runM2 } from './bot-m2';
import { runVerify, checkpointSeconds, badNumbers, markFreshM4, VERIFY_V6_BACKUP_ID, UNAVAILABLE } from '../scripts/verify/sim';
import { save, validate, MIGRATION_ID_HEX, type KV } from '../src/save/save';
import { saveRoundTrip } from '../scripts/verify/roundtrip';
import { selectGoal } from '../src/ui/next-goal';
import { goldens, GOLDEN_FLAG_OFF, GOLDEN_M4_ON } from '../scripts/verify/golden';
import { parseArgs, parseFlags, flagsOf, withFlags, sanitize, leaks, UsageError } from '../scripts/verify/cli';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

describe('verify: checkpoints', () => {
  it('1 h, then every N/4 (>= 1 h), ending at N', () => {
    expect(checkpointSeconds(24)).toEqual([3600, 21600, 43200, 64800, 86400]);
    expect(checkpointSeconds(1)).toEqual([3600]);
    expect(checkpointSeconds(2)).toEqual([3600, 5400, 7200]);
    expect(checkpointSeconds(0.5)).toEqual([1800]);
  });
});

describe('verify: the run', () => {
  it('is the AC7 workers bot: same Farm reach, Manage count, hires and Grader tiers as tests/bot-m2.ts runM2 (seller15, managed)', () => {
    const v = runVerify(balance, { hours: 0.5, seed: 3, profile: 'idle' });
    const m = runM2(balance, 3, { model: 'seller15', T: 1800 });
    expect([...v.reach]).toEqual([...m.reach]);
    expect(v.manages).toBe(m.manages);
    expect(Object.keys(v.end.workers).sort()).toEqual([...m.hired].sort());
    expect(v.end.graderTier).toBe(m.tiers);
    expect(v.ticks).toBe(1800 * balance.tickHz);
  }, 60_000);
  it('is deterministic: same seed -> identical checkpoints and trace hash; another seed -> another trace', () => {
    const a = runVerify(balance, { hours: 0.25, seed: 1, profile: 'idle' }), b = runVerify(balance, { hours: 0.25, seed: 1, profile: 'idle' });
    expect(JSON.stringify(a.checkpoints)).toBe(JSON.stringify(b.checkpoints));
    expect(a.traceSha256).toBe(b.traceSha256);
    expect(runVerify(balance, { hours: 0.25, seed: 2, profile: 'idle' }).traceSha256).not.toBe(a.traceSha256);
  }, 60_000);
  it('checkpoint values are finite, non-negative, coins in integer cents', () => {
    const r = runVerify(balance, { hours: 0.25, seed: 1, profile: 'idle' });
    expect(badNumbers(r.checkpoints)).toEqual([]);
    for (const c of r.checkpoints) expect(Number.isInteger(c.coinsCents)).toBe(true);
  }, 60_000);
  it('flag off changes the run (m4.enabled = 0 via --flags)', () => {
    const on = runVerify(balance, { hours: 0.25, seed: 1, profile: 'idle' }), off = runVerify(withFlags(balance, { 'm4.enabled': 0 }), { hours: 0.25, seed: 1, profile: 'idle' });
    expect(off.traceSha256).not.toBe(on.traceSha256);
    expect(off.checkpoints[0].levels.hens).toBe(0);
  }, 60_000);
  it('m5x-casual is refused until tests/bot-m5.ts lands', () => {
    expect(UNAVAILABLE['m5x-casual']).toBe('needs tests/bot-m5.ts (M5.1, on Vadim go)'); // HoE ruling (3)
    expect(() => runVerify(balance, { hours: 1, seed: 1, profile: 'm5x-casual' })).toThrow(/m5x-casual/);
  });
  it('badNumbers flags NaN, Infinity and negatives', () => {
    expect(badNumbers({ a: 1, b: [0, 2] })).toEqual([]);
    expect(badNumbers({ a: NaN, b: [Infinity, -1] })).toEqual(['$.a=NaN', '$.b[0]=Infinity', '$.b[1]=-1 (negative)']);
  });
});

describe('verify: end-state save round-trip (QA-D-1027-GOALPILL)', () => {
  const mem = (): KV => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: k => { m.delete(k); } }; };
  const pick = (s: any) => ({ F: s.farmLevel, H: s.hensLevel, V: s.eggValueLevel, C: s.collectionLevel, tier: s.graderTier, workers: Object.keys(s.workers).sort(), coins: s.coinsCents });
  it('validate(save(marked run.end)) is not tracksMigrated and keeps every level, tier, worker and coin', () => {
    const run = runVerify(balance, { hours: 1, seed: 1, profile: 'idle' });
    const r = validate(save(mem(), markFreshM4(run.end, balance), 1, balance), balance);
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.file.tracksMigrated).toBeFalsy();
    expect(pick(r.file.state)).toEqual(pick(run.end));
    expect(r.file.state.tracksV7).toBe(1); expect(r.file.state.v6BackupId).toBe(VERIFY_V6_BACKUP_ID);
  }, 60_000);
  it('the unmarked end state is what the bug was: the load price-matches V down', () => {
    const run = runVerify(balance, { hours: 1, seed: 1, profile: 'idle' });
    const r = validate(save(mem(), run.end, 1, balance), balance);
    expect(r.ok && r.file.tracksMigrated).toBe(true);
    expect(r.ok && r.file.state.eggValueLevel).toBeLessThan(run.end.eggValueLevel);
  }, 60_000);
  it('the marker is deterministic, the right length, and only added with M4 on', () => {
    expect(VERIFY_V6_BACKUP_ID).toMatch(new RegExp(`^[0-9a-f]{${MIGRATION_ID_HEX}}$`));
    const off = withFlags(balance, { 'm4.enabled': 0 }), s = runVerify(off, { hours: 0.1, seed: 1, profile: 'idle' }).end;
    expect(markFreshM4(s, off)).toBe(s);
  }, 60_000);
  it('24 h seed 1: the loaded end state has nothing left to buy (pill = All upgrades done!)', () => {
    const run = runVerify(balance, { hours: 24, seed: 1, profile: 'idle' });
    const r = validate(save(mem(), markFreshM4(run.end, balance), 1, balance), balance);
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(selectGoal(r.file.state, balance, 1).label).toBe('All upgrades done!');
  }, 120_000);
});

describe('verify: goldens', () => {
  it('the copy in scripts/verify/golden.ts reproduces both pinned GOLDEN1 hashes on this tree', () => {
    const g = goldens(balance);
    expect(g.map(x => [x.name, x.expected, x.actual])).toEqual([['flagOff', GOLDEN_FLAG_OFF, GOLDEN_FLAG_OFF], ['m4On', GOLDEN_M4_ON, GOLDEN_M4_ON]]);
  }, 120_000);
});

describe('verify: arguments and flags', () => {
  it('parses the interface with its defaults', () => {
    expect(parseArgs(['--', '--hours', '24'])).toEqual({ hours: 24, seed: 1, profile: 'idle', flags: {}, out: null, skipBuild: false, noShot: false });
    expect(parseArgs(['--hours', '1', '--seed', '7', '--profile', 'm5x-casual', '--flags', 'm4.enabled=0', '--out', 'x'])).toMatchObject({ hours: 1, seed: 7, profile: 'm5x-casual', flags: { 'm4.enabled': 0 }, out: 'x' });
  });
  it('rejects bad input', () => {
    for (const a of [[], ['--hours'], ['--hours', '0'], ['--hours', 'abc'], ['--hours', '1', '--seed', '-1'], ['--hours', '1', '--profile', 'fast'], ['--hours', '1', '--bogus']])
      expect(() => parseArgs(a), JSON.stringify(a)).toThrow(UsageError);
    expect(() => parseFlags('m4.enabled')).toThrow(UsageError);
    expect(() => withFlags(balance, { 'm4.nope': 1 })).toThrow(/unknown flag/);
  });
  it('flags default to balance.json and overrides do not touch the shipped balance', () => {
    expect(flagsOf(balance)).toEqual({ 'm4.enabled': balance.m4!.enabled });
    const off = withFlags(balance, { 'm4.enabled': 0 });
    expect(off.m4!.enabled).toBe(0); expect(balance.m4!.enabled).toBe(1);
  });
  it('CLI: usage errors and unavailable profiles exit 2 before building anything', () => {
    const run = (a: string[]) => spawnSync(process.execPath, [`${ROOT}node_modules/vite-node/vite-node.mjs`, 'scripts/verify.ts', '--', ...a], { cwd: ROOT, encoding: 'utf8' });
    const r1 = run([]); expect(r1.status).toBe(2); expect(r1.stderr).toMatch(/--hours/);
    const r2 = run(['--hours', '1', '--profile', 'm5x-casual']); expect(r2.status).toBe(2); expect(r2.stderr).toContain('verify: profile m5x-casual needs tests/bot-m5.ts (M5.1, on Vadim go)');
    const r3 = run(['--hours', '1', '--flags', 'nope=1']); expect(r3.status).toBe(2); expect(r3.stderr).toMatch(/unknown flag/);
  }, 60_000);
});

describe('verify: public-repo hygiene', () => {
  it('sanitize makes paths repo-relative and hides the home dir', () => {
    expect(sanitize(`${ROOT.replace(/\/$/, '')}/dist-html/egg-farm.html`, ROOT.replace(/\/$/, ''))).toBe('./dist-html/egg-farm.html');
    expect(sanitize('/home/alice/x and /Users/alice/y and C:\\\\Users\\\\alice\\\\z', '/repo', { home: '/nowhere', user: 'alice', host: 'h0st' }))
      .toBe('/home/<user>/x and /Users/<user>/y and C:\\\\Users\\\\<user>\\\\z');
    expect(sanitize('http://h0st:8080/ and me@h0st', '/repo', { home: '/nowhere', user: 'alice', host: 'h0st' })).toBe('http://<host>:8080/ and me@<host>');
  });
  it('CCR m2: a host or user named like a JSON value (e.g. "working") leaves verify.json byte-identical', () => {
    const json = JSON.stringify({ workers: { market_hand: { state: 'working' } }, profile: 'idle', result: 'PASS', sha: 'abc' }, null, 2);
    for (const w of ['working', 'idle', 'PASS', 'sha', 'state'])
      expect(sanitize(json, '/repo', { home: `/home/${w}`, user: w, host: w }), w).toBe(json);
  });
  it('leaks finds tokens, absolute paths (incl. /tmp /var /opt, Windows drives) and e-mail addresses', () => {
    expect(leaks('{"a":"m4.1+d1fb206","sha":"d1fb206b8f59a1a1f19623526fdbf3003d12efce","p":"dist-html/egg-farm.html","t":"src/sim/tick.ts","u":"https://github.com/x"}')).toEqual([]);
    expect(leaks('ghp_' + 'a'.repeat(36))).toHaveLength(1);
    for (const x of ['/home/someone/x', '/tmp/verify-abc/save.json', '/var/folders/x', '/opt/hostedtoolcache/node', 'C:\\Users\\bob\\x', '"C:\\\\Users\\\\bob"', 'D:/a/egg-farm', 'a@b.io'])
      expect(leaks(x), x).toHaveLength(1);
  });
});

describe('verify: save round-trip guard (VER-1a, CCR R1)', () => {
  const mem = (): KV => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: k => { m.delete(k); } }; };
  it('saveRoundTrip passes for the marked end state and fails (tracksMigrated, V mismatch) for the unmarked one', () => {
    const run = runVerify(balance, { hours: 1, seed: 1, profile: 'idle' });
    const good = saveRoundTrip(save(mem(), { ...markFreshM4(run.end, balance), seenTracksExplainer: true }, 1, balance), run.end, balance);
    expect(good).toMatchObject({ pass: true, ok: true, migrated: false, tracksMigrated: false, mismatches: [] });
    const bad = saveRoundTrip(save(mem(), { ...run.end, seenTracksExplainer: true }, 1, balance), run.end, balance);
    expect(bad.pass).toBe(false); expect(bad.tracksMigrated).toBe(true); expect(bad.migrated).toBe(true);
    expect(bad.mismatches.map(m => m.field)).toContain('eggValueLevel');
  }, 60_000);
  it('saveRoundTrip flags a coin, worker or tier difference and an unreadable save', () => {
    const run = runVerify(balance, { hours: 0.25, seed: 1, profile: 'idle' }), m = markFreshM4(run.end, balance);
    const r = saveRoundTrip(save(mem(), { ...m, coinsCents: m.coinsCents + 1, graderTier: 0, workers: {} }, 1, balance), run.end, balance);
    expect(r.pass).toBe(false); expect(r.migrated).toBe(false);
    expect(r.mismatches.map(x => x.field).sort()).toEqual(['coinsCents', 'graderTier', 'workers'].filter(f => JSON.stringify((run.end as any)[f]) !== JSON.stringify(f === 'coinsCents' ? m.coinsCents + 1 : f === 'graderTier' ? 0 : {})).sort());
    expect(saveRoundTrip('{', run.end, balance)).toMatchObject({ pass: false, ok: false, reason: 'parse' });
  }, 60_000);
  it('CLI: with the marker skipped (VERIFY_TEST_SKIP_MARKER=1) verify exits 4, records saveRoundTrip FAIL, and leaves no PNG', () => {
    const vn = `${ROOT}node_modules/vite-node/vite-node.mjs`;
    const dir = mkdtempSync(join(tmpdir(), 'v-')), html = join(dir, 'fake.html'), out = join(dir, 'out');
    writeFileSync(html, '<!doctype html><meta name="build-id" content="m4.1+0000000"><div id="app" data-build-id="m4.1+0000000"></div>');
    mkdirSync(out); writeFileSync(join(out, 'verify.png'), 'stale');
    const r = spawnSync(process.execPath, [vn, 'scripts/verify.ts', '--', '--hours', '0.1', '--skip-build', '--out', out], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, VERIFY_HTML: html, VERIFY_TEST_SKIP_MARKER: '1', CHROME: join(dir, 'must-not-launch') } });
    expect(r.status).toBe(4);
    const j = JSON.parse(readFileSync(join(out, 'verify.json'), 'utf8'));
    expect(j.schemaVersion).toBe(2);
    expect(j.saveRoundTrip).toMatchObject({ pass: false, migrated: true, tracksMigrated: true, markerSkippedForTest: true });
    expect(j.checks.find((c: any) => c.id === 'save-roundtrip').pass).toBe(false);
    expect(j.checks.find((c: any) => c.id === 'build-label').detail).toMatch(/skipped: save-roundtrip failed/);
    expect(j.screenshot.file).toBeNull(); expect(j.result).toBe('FAIL');
    expect(existsSync(join(out, 'verify.png'))).toBe(false);
  }, 60_000);
  it('CLI: with the marker applied the same run passes the round-trip (exit 1 here only for the fake html / no shot)', () => {
    const vn = `${ROOT}node_modules/vite-node/vite-node.mjs`;
    const dir = mkdtempSync(join(tmpdir(), 'v-')), html = join(dir, 'fake.html'), out = join(dir, 'out');
    writeFileSync(html, '<!doctype html><meta name="build-id" content="m4.1+0000000">');
    const r = spawnSync(process.execPath, [vn, 'scripts/verify.ts', '--', '--hours', '0.1', '--skip-build', '--no-shot', '--out', out], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, VERIFY_HTML: html } });
    expect(r.status).toBe(1);
    const j = JSON.parse(readFileSync(join(out, 'verify.json'), 'utf8'));
    expect(j.saveRoundTrip).toMatchObject({ pass: true, migrated: false, mismatches: [] });
    expect(j.saveRoundTrip.markerSkippedForTest).toBeUndefined();
  }, 60_000);
});

describe('verify: exit codes and the browser step (CCR n1/n3)', () => {
  const vn = `${ROOT}node_modules/vite-node/vite-node.mjs`;
  const run = (a: string[], env: Record<string, string> = {}) => spawnSync(process.execPath, [vn, 'scripts/verify.ts', '--', ...a], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env } });
  it('exit 3 when the html to verify is missing', () => {
    const r = run(['--hours', '0.01', '--skip-build', '--no-shot', '--out', mkdtempSync(join(tmpdir(), 'v-'))], { VERIFY_HTML: join(tmpdir(), 'verify-no-such.html') });
    expect(r.status).toBe(3); expect(r.stderr).toMatch(/VERIFY_HTML override \(test\) missing/);
  }, 60_000);
  it('exit 1 on a failed check (wrong build id, no screenshot); verify.json says FAIL and names no PNG', () => {
    const dir = mkdtempSync(join(tmpdir(), 'v-')), html = join(dir, 'fake.html'), out = join(dir, 'out');
    writeFileSync(html, '<!doctype html><meta name="build-id" content="m4.1+0000000"><div id="app" data-build-id="m4.1+0000000"></div>');
    mkdirSync(out); writeFileSync(join(out, 'verify.png'), 'stale');
    const r = run(['--hours', '0.01', '--skip-build', '--no-shot', '--out', out], { VERIFY_HTML: html });
    expect(r.status).toBe(1);
    const j = JSON.parse(readFileSync(join(out, 'verify.json'), 'utf8'));
    expect(j.result).toBe('FAIL');
    expect(j.checks.find((c: any) => c.id === 'build-id').pass).toBe(false);
    expect(j.checks.find((c: any) => c.id === 'build-label').pass).toBe(false);
    expect(j.screenshot.file).toBeNull();
    expect(existsSync(join(out, 'verify.png'))).toBe(false); // the stale PNG is gone
  }, 60_000);
  it('n1: a Chromium launch failure gives ok:false with the launch error and leaves no (stale) PNG', () => {
    const dir = mkdtempSync(join(tmpdir(), 'v-')), png = join(dir, 'verify.png'), sv = join(dir, 'save.json');
    writeFileSync(png, 'stale'); writeFileSync(sv, JSON.stringify({ version: 6, savedAt: 1, state: {} }));
    const r = spawnSync(process.execPath, [join(ROOT, 'scripts/verify/shot.mjs'), join(dir, 'x.html'), sv, png], { encoding: 'utf8', env: { ...process.env, CHROME: join(dir, 'no-chrome') } });
    expect(r.status).toBe(0);
    const o = JSON.parse(r.stdout.trim().split('\n').pop()!);
    expect(o.ok).toBe(false); expect(o.error).toMatch(/launch/);
    expect(existsSync(png)).toBe(false);
  }, 60_000);
});
