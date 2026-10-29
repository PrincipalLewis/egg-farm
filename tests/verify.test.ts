// VER-1: tests for `npm run verify` itself (scripts/verify.ts + scripts/verify/*). Node only; the build + browser steps run in
// the verify-smoke CI job and locally (`npm run verify -- --hours 1`), not here.
import { describe, it, expect, afterEach } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, symlinkSync, chmodSync, rmSync, readdirSync, watch } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { balance } from '../src/config/balance';
import { runM2 } from './bot-m2';
import { runVerify, checkpointSeconds, badNumbers, markFreshM4, VERIFY_V6_BACKUP_ID, PROFILE_BOT } from '../scripts/verify/sim';
import { run as runM5, PROFS as M5_PROFS, M5X_STACKS } from './bot-m5';
import { save, validate, MIGRATION_ID_HEX, type KV } from '../src/save/save';
import { saveRoundTrip } from '../scripts/verify/roundtrip';
import { initialState } from '../src/sim/state';
import { selectGoal } from '../src/ui/next-goal';
import { goldens, GOLDEN_FLAG_OFF, GOLDEN_M4_ON } from '../scripts/verify/golden';
import { parseArgs, parseFlags, outArg, flagsOf, withFlags, sanitize, leaks, UsageError, M5X_MAX_SEED } from '../scripts/verify/cli';
import { gitBuildId } from '../scripts/build-id';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
/** CCR N-3 on #75: every temp dir a VER-1d/1e test makes is tracked here and removed after each test, pass or fail (the tsc
 *  break's repo copy included). rmSync never follows the copy's node_modules symlink: it unlinks the link only. */
const madeTmp: string[] = [];
const trackedTmp = (prefix: string) => { const d = mkdtempSync(join(tmpdir(), prefix)); madeTmp.push(d); return d; };
afterEach(() => {
  for (const d of madeTmp.splice(0)) {
    try { chmodSync(d, 0o755); } catch { /* already gone */ }
    rmSync(d, { recursive: true, force: true });
  }
});

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
  it('[VER-1h N-5] CCR N-5 on #78: m5x-casual 0.25 h seed 1 trace and checkpoint egg counters are pinned (24 h pin 07139bdd: tests/bot-m5-trace.slow.test.ts)', () => {
    const v = runVerify(balance, { hours: 0.25, seed: 1, profile: 'm5x-casual' });
    expect(v.traceSha256).toBe('751ebe169ce66082e53fd52d5a05cbca677c3b3d9a27a3f037c2c201fc379689');
    expect(v.events).toBe(1801);
    expect(v.checkpoints.map(c => c.eggs)).toEqual([{ coop: 17.14, basket: 1061, collected: 6944, sold: 5883 }]);
  }, 60_000);
  it('[VER-1h N-2][VER-1h N-3] CCR N-2/N-3 on #78: m5x-casual seed above the PyRandom bound and a repeated --profile are usage errors', () => {
    expect(() => parseArgs(['--hours', '1', '--profile', 'm5x-casual', '--seed', '9007172233'])).toThrow(UsageError);
    expect(parseArgs(['--hours', '1', '--profile', 'm5x-casual', '--seed', '9007172232']).seed).toBe(9007172232);
    expect(parseArgs(['--hours', '1', '--seed', '9007199254740991']).seed).toBe(9007199254740991); // idle: unchanged
    expect(M5X_MAX_SEED).toBe(9007172232);
    expect(() => parseArgs(['--hours', '1', '--profile', 'm5x-casual', '--profile', 'idle'])).toThrow(/more than once/);
    expect(() => parseArgs(['--hours', '1', '--profile', 'idle', '--profile', 'idle'])).toThrow(/more than once/);
  });
  it('m5x-casual is available and is tests/bot-m5.ts run() (casual, AssZ): same end state and Farm reach', () => {
    const v = runVerify(balance, { hours: 0.5, seed: 3, profile: 'm5x-casual' }), r = runM5(balance, 3, M5_PROFS.casual, M5X_STACKS.AssZ, 1800);
    expect(JSON.stringify(v.end)).toBe(JSON.stringify(r.final));
    expect([...v.reach]).toEqual([...r.reach]);
    expect(v.ticks).toBe(1800 * balance.tickHz); expect(v.manages).toBeNull();
    expect(v.bot).toBe(PROFILE_BOT['m5x-casual'].bot); expect(v.bot).toMatch(/bot-m5/);
    expect(v.checkpoints.map(c => c.hours)).toEqual([0.5]); expect(v.checkpoints[0].coinsCents).toBe(r.final.coinsCents);
  }, 60_000);
  it('m5x-casual is deterministic, differs from idle, and its checkpoints are finite, non-negative, integer cents', () => {
    const a = runVerify(balance, { hours: 0.25, seed: 1, profile: 'm5x-casual' }), b = runVerify(balance, { hours: 0.25, seed: 1, profile: 'm5x-casual' });
    expect(a.traceSha256).toBe(b.traceSha256); expect(JSON.stringify(a.checkpoints)).toBe(JSON.stringify(b.checkpoints));
    expect(runVerify(balance, { hours: 0.25, seed: 2, profile: 'm5x-casual' }).traceSha256).not.toBe(a.traceSha256);
    expect(runVerify(balance, { hours: 0.25, seed: 1, profile: 'idle' }).traceSha256).not.toBe(a.traceSha256);
    expect(badNumbers(a.checkpoints)).toEqual([]); expect(a.events).toBeGreaterThan(0);
    for (const c of a.checkpoints) expect(Number.isInteger(c.coinsCents)).toBe(true);
  }, 60_000);
  it('idle keeps its verify.json bot / tickPath strings (no change to the idle report)', () => {
    expect(PROFILE_BOT.idle).toEqual({ bot: 'AC7 workers bot: tests/bot-m2.ts runM2 seller15, managed, no variance; tap 1/s, check-in every 15 s', tickPath: 'src/sim/tick.ts advance() per 1000 ms, then input (build order)' });
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
  it('[VER-1h N-4] CLI: usage errors exit 2 before building anything (no UNAVAILABLE path)', () => {
    const run = (a: string[]) => spawnSync(process.execPath, [`${ROOT}node_modules/vite-node/vite-node.mjs`, 'scripts/verify.ts', '--', ...a], { cwd: ROOT, encoding: 'utf8' });
    const r1 = run([]); expect(r1.status).toBe(2); expect(r1.stderr).toMatch(/--hours/);
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
  it('m5x-casual: the marked end state round-trips under the shipped balance (not migrated, no mismatches)', () => {
    const run = runVerify(balance, { hours: 1, seed: 1, profile: 'm5x-casual' });
    expect(saveRoundTrip(save(mem(), { ...markFreshM4(run.end, balance), seenTracksExplainer: true }, 1, balance), run.end, balance))
      .toMatchObject({ pass: true, ok: true, migrated: false, mismatches: [] });
  }, 60_000);
  it('CLI: --profile m5x-casual runs (no exit 2) and records its profile and bot in verify.json', () => {
    const vn = `${ROOT}node_modules/vite-node/vite-node.mjs`, dir = trackedTmp('v5m5-'), html = join(dir, 'fake.html'), out = join(dir, 'out');
    writeFileSync(html, '<!doctype html><meta name="build-id" content="m4.1+0000000"><div id="app" data-build-id="m4.1+0000000"></div>');
    const r = spawnSync(process.execPath, [vn, 'scripts/verify.ts', '--', '--hours', '0.1', '--profile', 'm5x-casual', '--skip-build', '--no-shot', '--out', out], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, VERIFY_HTML: html } });
    expect(r.status).not.toBe(2); expect(r.stderr).not.toMatch(/needs tests\/bot-m5/);
    const j = JSON.parse(readFileSync(join(out, 'verify.json'), 'utf8'));
    expect(j.profile).toBe('m5x-casual'); expect(j.complete).toBe(true);
    expect(j.sim.bot).toBe(PROFILE_BOT['m5x-casual'].bot); expect(j.sim.tickPath).toBe(PROFILE_BOT['m5x-casual'].tickPath);
    expect(j.checks.find((c: any) => c.id === 'save-roundtrip').pass).toBe(true);
  }, 120_000);
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

describe('verify: VER-1d (CCR m1/N-c on #74)', () => {
  // Every out dir here is a temp dir: --out, or VERIFY_OUT_ROOT standing in for <repo>/verify-out. Nothing is written into the worktree.
  const vn = `${ROOT}node_modules/vite-node/vite-node.mjs`;
  const FAKE_ID = 'm4.1+0000000', FAKE = `<!doctype html><meta name="build-id" content="${FAKE_ID}">`;
  const tmp = () => trackedTmp('v1d-');
  /** A previous run's PASS verify.json + verify.png in `dir`, plus a decoy that must survive. */
  const seedStale = (dir: string) => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'verify.json'), JSON.stringify({ schemaVersion: 4, complete: true, result: 'PASS', screenshot: { file: 'verify.png' } }));
    writeFileSync(join(dir, 'verify.png'), 'stale');
    writeFileSync(join(dir, 'decoy.json'), 'keep');
  };
  const cli = (args: string[], env: Record<string, string> = {}, cwd = ROOT) =>
    spawnSync(process.execPath, [vn, 'scripts/verify.ts', '--', ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
  const expectFail = (dir: string, exit: number, stage: string) => {
    expect(existsSync(join(dir, 'verify.png')), `${dir}/verify.png`).toBe(false);
    expect(readFileSync(join(dir, 'decoy.json'), 'utf8')).toBe('keep');
    const j = JSON.parse(readFileSync(join(dir, 'verify.json'), 'utf8'));
    expect(j).toMatchObject({ schemaVersion: 4, complete: false, result: 'FAIL', exit, stage, screenshot: { file: null } });
    return j;
  };

  it('m1 (M31): a real tsc break in a temp copy of the repo exits 3 (stage build), not 1, and leaves no stale PASS', () => {
    const copy = tmp(), out = join(tmp(), 'out');
    const files = spawnSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: ROOT, encoding: 'utf8' }).stdout.split('\0').filter(Boolean);
    for (const f of files) if (existsSync(join(ROOT, f))) { mkdirSync(dirname(join(copy, f)), { recursive: true }); copyFileSync(join(ROOT, f), join(copy, f)); }
    symlinkSync(join(ROOT, 'node_modules'), join(copy, 'node_modules'), 'dir');
    writeFileSync(join(copy, 'src/main.ts'), readFileSync(join(copy, 'src/main.ts'), 'utf8') + "\nexport const verifyTscBreak: number = 'not a number'; // VER-1d test: a real type error\n");
    seedStale(out);
    const r = cli(['--hours', '1', '--no-shot', '--out', out], {}, copy);
    expect(r.stderr).toMatch(/TS2322/); // tsc itself failed on the break, not some other step
    expect(r.status).toBe(3);
    expect(expectFail(out, 3, 'build').reason).toMatch(/^FAIL build \(.+\) exited [1-9]/);
  }, 180_000);

  it('m1 (M28/M29): without --out, a usage error clears the existing default dir verify-out/<HEAD id>/ and writes the FAIL report there', () => {
    const root = tmp(), d = join(root, gitBuildId(ROOT));
    seedStale(d);
    const r = cli(['--hours', '0'], { VERIFY_OUT_ROOT: root });
    expect(r.status).toBe(2);
    expect(expectFail(d, 2, 'usage').reason).toMatch(/^usage: /);
    // ...and does not create the default dir when it is absent
    const root2 = tmp();
    expect(cli(['--hours', '0'], { VERIFY_OUT_ROOT: root2 }).status).toBe(2);
    expect(existsSync(join(root2, gitBuildId(ROOT)))).toBe(false);
  }, 60_000);

  it('m1 (M17/M18/M19): a run SIGKILLed mid-sim (no handler runs) leaves neither verify.json nor verify.png', async () => {
    const dir = tmp(), out = join(dir, 'out'), html = join(dir, 'fake.html');
    writeFileSync(html, FAKE); seedStale(out);
    const p = spawn(process.execPath, [vn, 'scripts/verify.ts', '--', '--hours', '24', '--skip-build', '--no-shot', '--out', out], { cwd: ROOT, env: { ...process.env, VERIFY_HTML: html }, stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    const res = await new Promise<{ code: number | null; signal: string | null }>(done => {
      p.stderr.on('data', c => { err += c; if (/verify: run 24 h/.test(err) && !p.killed) p.kill('SIGKILL'); });
      p.on('exit', (code, signal) => done({ code, signal }));
    });
    expect(err).toMatch(/verify: run 24 h/);
    expect(res.signal).toBe('SIGKILL'); // killed mid-run, before any report
    expect(existsSync(join(out, 'verify.json'))).toBe(false);
    expect(existsSync(join(out, 'verify.png'))).toBe(false);
    expect(readFileSync(join(out, 'decoy.json'), 'utf8')).toBe('keep');
  }, 120_000);

  it("m1 (M33): --skip-build with an older html clears that html's default dir; a crash then writes the FAIL report there", () => {
    const root = tmp(), html = join(tmp(), 'old.html'), d = join(root, FAKE_ID);
    writeFileSync(html, FAKE); seedStale(d);
    expect(gitBuildId(ROOT)).not.toBe(FAKE_ID);
    const r = cli(['--hours', '0.1', '--skip-build', '--no-shot'], { VERIFY_OUT_ROOT: root, VERIFY_HTML: html, VERIFY_TEST_THROW: '1' });
    expect(r.status).toBe(1);
    expect(expectFail(d, 1, 'run').reason).toMatch(/^uncaught error: VERIFY_TEST_THROW/);
    expect(existsSync(join(root, gitBuildId(ROOT)))).toBe(false); // the HEAD id dir did not exist, so nothing is created there
  }, 60_000);

  it('m1 (M27): a crash after the browser step wrote verify.png removes that PNG with the FAIL report', () => {
    const dir = tmp(), out = join(dir, 'out'), html = join(dir, 'fake.html');
    writeFileSync(html, FAKE); seedStale(out);
    const r = cli(['--hours', '0.1', '--skip-build', '--no-shot', '--out', out], { VERIFY_HTML: html, VERIFY_TEST_THROW: 'after-shot' });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/forced crash after the browser step/);
    expect(expectFail(out, 1, 'run').reason).toMatch(/^uncaught error: VERIFY_TEST_THROW: forced crash after the browser step/);
  }, 60_000);

  it('N-c: <out>/verify.json being a directory: the original error (rm EISDIR) is what fails the run; the writer failure is only logged', () => {
    const out = join(tmp(), 'out');
    mkdirSync(join(out, 'verify.json'), { recursive: true }); writeFileSync(join(out, 'verify.json', 'inner'), 'keep');
    writeFileSync(join(out, 'verify.png'), 'stale');
    const r = cli(['--hours', '0', '--out', out]);
    expect(r.status).toBe(1); // the clear step itself throws (before argument parsing): an uncaught error, exit 1
    expect(r.stderr).toMatch(/verify: could not write the FAIL report \(.*\): EISDIR.*; exit 1 and the original error are kept/);
    expect(r.stderr).toMatch(/ERR_FS_EISDIR|rm returned EISDIR/); // the original error's stack, not the writer's
    expect(readFileSync(join(out, 'verify.json', 'inner'), 'utf8')).toBe('keep'); // never rm -r
  }, 60_000);

  it.skipIf(process.getuid?.() === 0)('N-c: an unwritable out dir keeps the original exit code (usage 2, not 1) and logs the writer failure', () => {
    const out = join(tmp(), 'ro');
    mkdirSync(out); chmodSync(out, 0o555); // restored below; the parent temp dir is removed by afterEach
    try {
      const r = cli(['--hours', '0', '--out', out]);
      expect(r.stderr).toMatch(/usage: --hours/);
      expect(r.stderr).toMatch(/verify: could not write the FAIL report \(.*\): EACCES.*; exit 2 and the original error are kept/);
      expect(r.status).toBe(2);
      expect(existsSync(join(out, 'verify.json'))).toBe(false);
    } finally { chmodSync(out, 0o755); }
  }, 60_000);
});

describe('verify: VER-1e (CCR N-1/N-4/O-1/O-2 on #75)', () => {
  // Temp dirs only (trackedTmp, removed after each test). Nothing is written into the worktree.
  const vn = `${ROOT}node_modules/vite-node/vite-node.mjs`;
  const FAKE_ID = 'm4.1+0000000', fake = (id = FAKE_ID) => `<!doctype html><meta name="build-id" content="${id}">`;
  const tmp = () => trackedTmp('v1e-');
  const cli = (args: string[], env: Record<string, string> = {}) =>
    spawnSync(process.execPath, [vn, 'scripts/verify.ts', '--', ...args], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env } });
  const writerLine = (stderr: string) => stderr.split('\n').find(l => l.startsWith('verify: could not write the')) ?? '';
  const nonRoot = process.getuid?.() !== 0; // a 0555 dir is writable for root

  it.skipIf(!nonRoot)('N-1 (NC4): the writer-failure line is sanitised: an out dir under the home dir prints as ~', () => {
    const home = tmp(), out = join(home, 'ro');
    mkdirSync(out); chmodSync(out, 0o555);
    try {
      const r = cli(['--hours', '0', '--out', out], { HOME: home });
      expect(r.status).toBe(2);
      const l = writerLine(r.stderr);
      expect(l).toBe("verify: could not write the FAIL report (~/ro): EACCES: permission denied, open '~/ro/verify.json'; exit 2 and the original error are kept");
      expect(r.stderr).not.toContain(home);
    } finally { chmodSync(out, 0o755); }
  }, 60_000);

  it.skipIf(!nonRoot)('N-1: an out dir outside the repo and home prints <redacted>, never an absolute path', () => {
    const out = join(tmp(), 'ro');
    mkdirSync(out); chmodSync(out, 0o555);
    try {
      const r = cli(['--hours', '0', '--out', out]);
      expect(r.status).toBe(2);
      const l = writerLine(r.stderr);
      expect(l).toBe("verify: could not write the FAIL report (<redacted>): EACCES: permission denied, open '<redacted>'; exit 2 and the original error are kept");
      expect(r.stderr).not.toContain(out);
    } finally { chmodSync(out, 0o755); }
  }, 60_000);

  it.skipIf(!nonRoot)('N-4 (NC5): when the first of two claimed dirs cannot take the FAIL report, the second still gets it and loses its PNG', () => {
    const root = tmp(), html = join(tmp(), 'old.html'), head = join(root, gitBuildId(ROOT)), d = join(root, FAKE_ID);
    writeFileSync(html, fake());
    expect(gitBuildId(ROOT)).not.toBe(FAKE_ID);
    mkdirSync(head); chmodSync(head, 0o555); // exists, so it is claimed first (writeFail true), but is read-only
    try {
      const r = cli(['--hours', '0.1', '--skip-build', '--no-shot'], { VERIFY_OUT_ROOT: root, VERIFY_HTML: html, VERIFY_TEST_THROW: 'after-shot' });
      expect(r.status).toBe(1);
      expect(writerLine(r.stderr)).toMatch(/^verify: could not write the FAIL report \(<redacted>\): EACCES.*; exit 1 and the original error are kept$/);
      expect(existsSync(join(d, 'verify.png'))).toBe(false); // the stand-in PNG of the second dir is removed...
      expect(JSON.parse(readFileSync(join(d, 'verify.json'), 'utf8'))).toMatchObject({ complete: false, result: 'FAIL', exit: 1, stage: 'run' }); // ...and it gets the report
      expect(readdirSync(head)).toEqual([]);
    } finally { chmodSync(head, 0o755); }
  }, 60_000);

  it('N-4 (H2): the after-shot hook really writes its stand-in verify.png before the crash (seen by a watcher), and the writer removes it', async () => {
    const dir = tmp(), out = join(dir, 'out'), html = join(dir, 'fake.html');
    writeFileSync(html, fake()); mkdirSync(out); // no stale PNG: any verify.png event comes from the hook
    const seen: string[] = [], w = watch(out, (_ev, f) => { if (f) seen.push(String(f)); });
    try {
      const p = spawn(process.execPath, [vn, 'scripts/verify.ts', '--', '--hours', '0.1', '--skip-build', '--no-shot', '--out', out], { cwd: ROOT, env: { ...process.env, VERIFY_HTML: html, VERIFY_TEST_THROW: 'after-shot' }, stdio: ['ignore', 'ignore', 'pipe'] });
      let err = ''; p.stderr.on('data', c => { err += c; });
      const code = await new Promise<number | null>(done => p.on('exit', c => done(c)));
      await new Promise(r => setTimeout(r, 300)); // let inotify deliver
      expect(code).toBe(1);
      expect(err).toMatch(/forced crash after the browser step/);
    } finally { w.close(); }
    expect(seen).toContain('verify.png');
    expect(existsSync(join(out, 'verify.png'))).toBe(false);
    expect(JSON.parse(readFileSync(join(out, 'verify.json'), 'utf8'))).toMatchObject({ complete: false, result: 'FAIL', exit: 1, stage: 'run' });
  }, 60_000);

  it('O-1: a hostile html build id (../../victim) cannot move the default out dir outside the out root', () => {
    const base = tmp(), root = join(base, 'a', 'b', 'root'), html = join(base, 'evil.html');
    mkdirSync(root, { recursive: true }); writeFileSync(html, fake('../../victim'));
    const r = cli(['--hours', '0.01', '--skip-build', '--no-shot'], { VERIFY_OUT_ROOT: root, VERIFY_HTML: html });
    expect(r.status).toBe(1); // the build-id check fails (and no shot)
    expect(r.stderr).toMatch(/html build id is not a plain id; default out dir is invalid-build-id\//);
    expect(existsSync(join(base, 'a', 'victim'))).toBe(false);
    expect(readdirSync(join(base, 'a'))).toEqual(['b']);
    expect(readdirSync(join(base, 'a', 'b'))).toEqual(['root']);
    expect(readdirSync(root)).toEqual(['invalid-build-id']);
    const j = JSON.parse(readFileSync(join(root, 'invalid-build-id', 'verify.json'), 'utf8'));
    expect(j).toMatchObject({ complete: true, result: 'FAIL', buildId: '../../victim' });
    expect(j.checks.find((c: any) => c.id === 'build-id').pass).toBe(false);
  }, 60_000);

  it.skipIf(!nonRoot)('O-2: a read-only out dir on a run that fails the save round-trip keeps exit 4 (not an uncaught 1) and logs one line', () => {
    const dir = tmp(), out = join(dir, 'ro'), html = join(dir, 'fake.html');
    writeFileSync(html, fake()); mkdirSync(out); chmodSync(out, 0o555);
    try {
      const r = cli(['--hours', '0.1', '--skip-build', '--flags', 'm4.enabled=0', '--out', out], { VERIFY_HTML: html, CHROME: join(dir, 'must-not-launch') });
      expect(r.status).toBe(4);
      expect(writerLine(r.stderr)).toBe("verify: could not write the report (<redacted>): EACCES: permission denied, open '<redacted>'; exit 4 (save round-trip) is kept");
      expect(r.stderr).not.toMatch(/\n\s+at /); // no uncaught stack
      expect(r.stderr.split('\n').filter(l => l.startsWith('verify: could not write'))).toHaveLength(1); // no early FAIL writer after it
      expect(readdirSync(out)).toEqual([]);
    } finally { chmodSync(out, 0o755); }
  }, 60_000);
});
