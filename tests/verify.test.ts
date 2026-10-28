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
import { initialState } from '../src/sim/state';
import { selectGoal } from '../src/ui/next-goal';
import { goldens, GOLDEN_FLAG_OFF, GOLDEN_M4_ON } from '../scripts/verify/golden';
import { parseArgs, parseFlags, outArg, flagsOf, withFlags, sanitize, leaks, UsageError } from '../scripts/verify/cli';

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
    expect(j.schemaVersion).toBe(4);
    expect(j.saveRoundTrip).toMatchObject({ pass: false, migrated: true, tracksMigrated: true, markerSkippedForTest: true });
    expect(j.checks.find((c: any) => c.id === 'save-roundtrip').pass).toBe(false);
    expect(j.checks.find((c: any) => c.id === 'build-label').detail).toMatch(/skipped: save-roundtrip failed/);
    // CCR N1 on #72: the fake html's build id fails too (an exit-1 check), and 4 still wins.
    expect(j.checks.find((c: any) => c.id === 'build-id').pass).toBe(false);
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

describe('verify: VER-1b (CCR F1/N2 on #72)', () => {
  const mem = (): KV => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: k => { m.delete(k); } }; };
  const vn = `${ROOT}node_modules/vite-node/vite-node.mjs`;
  it('N2: a save that migrates on load but leaves all 7 compared fields equal still fails the round-trip', () => {
    const s = initialState(balance, 1); // unmarked fresh farm: the tracks migration runs, F/H/V/C stay 0
    const r = saveRoundTrip(save(mem(), s, 1, balance), s, balance);
    expect(r.mismatches).toEqual([]);
    expect(r.migrated).toBe(true); expect(r.tracksMigrated).toBe(true);
    expect(r.pass).toBe(false);
  });
  it('F1: --flags m4.enabled=0 no longer gives a false PASS: exit 4, flagsDifferFromBuild, no screenshot, no PNG', () => {
    const dir = mkdtempSync(join(tmpdir(), 'v-')), html = join(dir, 'fake.html'), out = join(dir, 'out');
    writeFileSync(html, '<!doctype html><meta name="build-id" content="m4.1+0000000">');
    mkdirSync(out); writeFileSync(join(out, 'verify.png'), 'stale');
    const r = spawnSync(process.execPath, [vn, 'scripts/verify.ts', '--', '--hours', '0.1', '--skip-build', '--flags', 'm4.enabled=0', '--out', out], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, VERIFY_HTML: html, CHROME: join(dir, 'must-not-launch') } });
    expect(r.status).toBe(4);
    const j = JSON.parse(readFileSync(join(out, 'verify.json'), 'utf8'));
    expect(j.result).toBe('FAIL'); expect(j.flagsOverridden).toBe(true);
    expect(j.saveRoundTrip).toMatchObject({ pass: false, flagsDifferFromBuild: true, balance: expect.stringMatching(/^shipped/) });
    expect(j.saveRoundTrip.tracksMigrated).toBe(true); // validated under the shipped (M4-on) balance, as the browser would load it
    expect(j.checks.find((c: any) => c.id === 'save-roundtrip').detail).toMatch(/m4\.enabled=0 vs 1/);
    expect(j.screenshot).toMatchObject({ file: null, skippedReason: 'flags differ from build' });
    expect(existsSync(join(out, 'verify.png'))).toBe(false);
  }, 60_000);
  it('F1: --flags equal to the shipped flags (m4.enabled=1) is not an override and passes the round-trip', () => {
    const dir = mkdtempSync(join(tmpdir(), 'v-')), html = join(dir, 'fake.html'), out = join(dir, 'out');
    writeFileSync(html, '<!doctype html><meta name="build-id" content="m4.1+0000000">');
    const r = spawnSync(process.execPath, [vn, 'scripts/verify.ts', '--', '--hours', '0.1', '--skip-build', '--no-shot', '--flags', 'm4.enabled=1', '--out', out], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, VERIFY_HTML: html } });
    expect(r.status).toBe(1); // fake html / no shot only
    const j = JSON.parse(readFileSync(join(out, 'verify.json'), 'utf8'));
    expect(j.saveRoundTrip).toMatchObject({ pass: true, flagsDifferFromBuild: false, migrated: false });
  }, 60_000);
});

describe('verify: VER-1c (CCR S1/N-a/N-b on #73)', () => {
  const vn = `${ROOT}node_modules/vite-node/vite-node.mjs`;
  const FAKE = '<!doctype html><meta name="build-id" content="m4.1+0000000">';
  /** An out dir holding a previous run's PASS verify.json and verify.png. */
  const staleOut = () => {
    const dir = mkdtempSync(join(tmpdir(), 'v-')), out = join(dir, 'out'), html = join(dir, 'fake.html');
    mkdirSync(out); writeFileSync(html, FAKE);
    writeFileSync(join(out, 'verify.json'), JSON.stringify({ schemaVersion: 3, result: 'PASS', screenshot: { file: 'verify.png' } }));
    writeFileSync(join(out, 'verify.png'), 'stale');
    return { dir, out, html };
  };
  const cli = (args: string[], env: Record<string, string> = {}) =>
    spawnSync(process.execPath, [vn, 'scripts/verify.ts', '--', ...args], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env } });
  const expectNoStale = (out: string, exit: number, stage: string) => {
    expect(existsSync(join(out, 'verify.png'))).toBe(false);
    const j = JSON.parse(readFileSync(join(out, 'verify.json'), 'utf8'));
    expect(j).toMatchObject({ schemaVersion: 4, complete: false, result: 'FAIL', exit, stage, screenshot: { file: null } });
    return j;
  };
  it('outArg reads --out leniently (last wins, a missing value or an option is not a value)', () => {
    expect(outArg(['--hours', '0', '--out', 'a', '--bogus'])).toBe('a');
    expect(outArg(['--out', 'a', '--out', 'b'])).toBe('b');
    expect(outArg(['--out', '--hours', '1'])).toBeNull();
    expect(outArg(['--out'])).toBeNull();
    expect(outArg(['--hours', '1'])).toBeNull();
  });
  it('S1: a usage error (exit 2) leaves no stale PASS verify.json and no verify.png in --out', () => {
    for (const args of [['--hours', '0'], ['--hours', '1', '--bogus'], ['--hours', '1', '--flags', 'm4.nope=1']]) {
      const { out } = staleOut();
      const r = cli([...args, '--out', out]);
      expect(r.status, args.join(' ')).toBe(2);
      expect(expectNoStale(out, 2, 'usage').reason).toMatch(/^usage: /);
    }
  }, 60_000);
  it('S1: a build failure (exit 3) leaves no stale PASS verify.json and no verify.png in --out', () => {
    const { dir, out } = staleOut();
    const r = cli(['--hours', '1', '--skip-build', '--out', out], { VERIFY_HTML: join(dir, 'missing.html') });
    expect(r.status).toBe(3);
    expect(expectNoStale(out, 3, 'build').reason).toMatch(/missing/);
  }, 60_000);
  it('S1: an uncaught throw (exit 1) leaves no stale PASS verify.json and no verify.png in --out', () => {
    const { out, html } = staleOut();
    const r = cli(['--hours', '1', '--skip-build', '--out', out], { VERIFY_HTML: html, VERIFY_TEST_THROW: '1' });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/VERIFY_TEST_THROW/);
    expect(expectNoStale(out, 1, 'run').reason).toMatch(/^uncaught error: VERIFY_TEST_THROW/);
  }, 60_000);
  it('N-a: --flags m4.enabled=2 (round-trips under the shipped balance, but differs from the build) exits 4, no PNG', () => {
    const { out, html } = staleOut();
    const r = cli(['--hours', '0.1', '--skip-build', '--flags', 'm4.enabled=2', '--out', out], { VERIFY_HTML: html, CHROME: join(out, 'must-not-launch') });
    expect(r.status).toBe(4);
    const j = JSON.parse(readFileSync(join(out, 'verify.json'), 'utf8'));
    expect(j).toMatchObject({ complete: true, result: 'FAIL', saveRoundTrip: { pass: false, flagsDifferFromBuild: true, migrated: false, mismatches: [] }, screenshot: { file: null, skippedReason: 'flags differ from build' } });
    expect(j.checks.find((c: any) => c.id === 'save-roundtrip').detail).toMatch(/m4\.enabled=2 vs 1.*round-trip under the shipped balance passes/);
    expect(existsSync(join(out, 'verify.png'))).toBe(false);
  }, 60_000);
  it('N-b: a repeated --flags or a duplicate key within --flags is a usage error', () => {
    expect(() => parseArgs(['--hours', '1', '--flags', 'm4.enabled=0', '--flags', 'm4.enabled=1'])).toThrow(/--flags given more than once/);
    expect(() => parseFlags('m4.enabled=0,m4.enabled=1')).toThrow(/flag m4\.enabled given more than once/);
    expect(() => parseFlags('m4.enabled=1, m4.enabled=1')).toThrow(UsageError); // even when equal: still a typo
    expect(parseFlags('m4.enabled=1')).toEqual({ 'm4.enabled': 1 });
  });
  it('N-b: the CLI exits 2 with a clear message for both, and writes no PASS', () => {
    for (const [args, msg] of [[['--flags', 'm4.enabled=0', '--flags', 'm4.enabled=1'], /--flags given more than once/], [['--flags', 'm4.enabled=0,m4.enabled=1'], /flag m4\.enabled given more than once in --flags/]] as const) {
      const { out } = staleOut();
      const r = cli(['--hours', '1', ...args, '--out', out]);
      expect(r.status).toBe(2);
      expect(r.stderr).toMatch(msg);
      expectNoStale(out, 2, 'usage');
    }
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
