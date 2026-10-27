// VER-1 (D-CEO-20261027-02): `npm run verify -- --hours N [--seed S] [--profile idle|m5x-casual] [--flags k=v,...] [--out dir]`
// 1 build:html from HEAD (build id + asset sha256), 2 N hours of seeded play on the real fixed-step sim, 3 verify.json,
// 4 the built html with the end state in headless Chromium -> verify.png (390x844, build label), 5 non-zero exit on failure.
// Exit codes: 0 PASS, 1 a check failed (see verify.json checks[]), 2 usage / unavailable profile, 3 build failed,
// 4 the end-state save does not load back as the end state under the shipped balance, or --flags differ from the build
// (saveRoundTrip; no browser step, no PNG). 4 takes precedence over 1.
// Studio tooling only: reads src/, writes only <out>/verify.json + verify.png (default verify-out/<buildId>/, git-ignored).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { balance as shipped } from '../src/config/balance';
import { save, type KV } from '../src/save/save';
import { BUILD_PREFIX, gitBuildId } from './build-id';
import { runVerify, badNumbers, markFreshM4, UNAVAILABLE } from './verify/sim';
import { goldens } from './verify/golden';
import { saveRoundTrip, ROUNDTRIP_FIELDS } from './verify/roundtrip';
import { parseArgs, flagsOf, withFlags, sanitize, leaks, UsageError, USAGE } from './verify/cli';

export const SCHEMA_VERSION = 3; // 2 (VER-1a): + saveRoundTrip, + checks[] save-roundtrip; 3 (VER-1b): + saveRoundTrip.balance/flagsDifferFromBuild, + screenshot.skippedReason
/** savedAt of the end-state save: a fixed epoch + the simulated time (no wall clock anywhere in the output). */
export const VERIFY_EPOCH_MS = Date.UTC(2026, 0, 1);
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const HTML_DEFAULT = 'dist-html/egg-farm.html';
/** VERIFY_HTML (tests only, with --skip-build): read another html instead of dist-html/egg-farm.html. Reported as an override. */
const HTML = process.env.VERIFY_HTML || HTML_DEFAULT, HTML_LABEL = process.env.VERIFY_HTML ? 'VERIFY_HTML override (test)' : HTML_DEFAULT;
const git = (a: string[]) => { const r = spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : ''; };
const t0 = performance.now(), log = (s: string) => process.stderr.write(`verify: ${s}\n`);
type Check = { id: string; pass: boolean; detail: string };

function main(): number {
  let o; try { o = parseArgs(process.argv.slice(2)); } catch (e) { if (e instanceof UsageError) { console.error(`verify: ${e.message}\n${USAGE}`); return 2; } throw e; }
  if (UNAVAILABLE[o.profile]) { console.error(`verify: profile ${o.profile} ${UNAVAILABLE[o.profile]}`); return 2; }
  let b; try { b = withFlags(shipped, o.flags); } catch (e) { if (e instanceof UsageError) { console.error(`verify: ${e.message}`); return 2; } throw e; }
  // 1. build
  // Clean tree: the real `npm run build:html`. Dirty tree: the same steps minus its last one, check-release-build, which refuses
  // a +dirty id by design (release gate); the id is then recorded as +dirty and verify.json says how it was built (DoD 1).
  const dirtyTree = gitBuildId(ROOT).endsWith('+dirty');
  const buildHow = o.skipBuild ? 'skipped (--skip-build: existing dist-html reused)' : dirtyTree ? 'dirty tree: build:html without its check-release-build step' : 'npm run build:html';
  if (!o.skipBuild) {
    const steps = dirtyTree
      ? [['npx', 'vite-node', 'scripts/sync-economy-cli.ts', '--', '--check'], ['npx', 'tsc', '--noEmit'], ['node', 'scripts/build-html.mjs', 'dist-html']]
      : [['npm', 'run', '-s', 'build:html']];
    for (const [cmd, ...args] of steps) {
      log([cmd, ...args].join(' '));
      const r = spawnSync(cmd, args, { cwd: ROOT, stdio: ['ignore', 2, 2] });
      if (r.status !== 0) { console.error(`verify: FAIL build (${[cmd, ...args].join(' ')}) exited ${r.status}`); return 3; }
    }
  }
  if (!existsSync(resolve(ROOT, HTML))) { console.error(`verify: FAIL ${HTML_LABEL} missing`); return 3; }
  const htmlBytes = readFileSync(resolve(ROOT, HTML)), html = htmlBytes.toString('utf8');
  const buildId = /<meta name="build-id" content="([^"]*)">/.exec(html)?.[1] ?? '';
  const sha = git(['rev-parse', 'HEAD']), expectId = gitBuildId(ROOT);
  const outDir = o.out ? (isAbsolute(o.out) ? o.out : resolve(process.cwd(), o.out)) : join(ROOT, 'verify-out', buildId || 'unknown');
  mkdirSync(outDir, { recursive: true });
  const checks: Check[] = [];
  const check = (id: string, pass: boolean, detail: string) => { checks.push({ id, pass, detail }); if (!pass) log(`FAIL ${id}: ${detail}`); };
  check('build-id', buildId === expectId && buildId.startsWith(`${BUILD_PREFIX}+`), `html ${buildId || '(none)'}, HEAD ${expectId}`);
  // 2. run
  log(`run ${o.hours} h, seed ${o.seed}, profile ${o.profile}, flags ${JSON.stringify({ ...flagsOf(shipped), ...o.flags })}`);
  const run = runVerify(b, { hours: o.hours, seed: o.seed, profile: o.profile });
  const bad = [...badNumbers(run.checkpoints, '$.checkpoints'), ...badNumbers(run.end, '$.end', [], false).filter(x => !x.includes('negative'))];
  check('finite-non-negative', bad.length === 0, bad.length ? bad.slice(0, 10).join('; ') : 'every checkpoint value finite and >= 0; end state finite');
  const gs = goldens(shipped);
  const overridden = Object.keys(o.flags).some(k => o.flags[k] !== flagsOf(shipped)[k]);
  for (const g of gs) {
    // flag-off golden: always enforced. M4-on golden: enforced unless --flags changes the shipped flags (then reported only).
    const enforced = g.name === 'flagOff' || !overridden;
    check(`golden-${g.name}`, g.pass || !enforced, `${g.pass ? 'match' : 'MISMATCH'} ${g.actual.slice(0, 8)} vs ${g.expected.slice(0, 8)} (${g.source})${enforced ? '' : ', not enforced: flags overridden'}`);
  }
  // 4. browser
  const kv = new Map<string, string>(), mem: KV = { getItem: k => kv.get(k) ?? null, setItem: (k, v) => { kv.set(k, v); }, removeItem: k => { kv.delete(k); } };
  const savedAt = VERIFY_EPOCH_MS + Math.round(o.hours * 3600) * 1000;
  // VERIFY_TEST_SKIP_MARKER=1 (tests only): save the end state unmarked, i.e. the QA-D-1027-GOALPILL defect, so the
  // round-trip guard below is proven to catch it.
  const skipMarker = process.env.VERIFY_TEST_SKIP_MARKER === '1';
  const endToSave = skipMarker ? run.end : markFreshM4(run.end, b);
  const raw = save(mem, { ...endToSave, seenTracksExplainer: true }, savedAt, b); // marked like a fresh M4 farm (QA-D-1027-GOALPILL)
  // CCR R1: the exact bytes the browser gets must validate back to run.end, unmigrated; else exit 4 before any browser step.
  // CCR F1 on #72: validate with the SHIPPED balance, the one the built html runs, never the --flags one. When --flags changes
  // a shipped flag, the build cannot reproduce this farm, so the round-trip fails outright (exit 4, no screenshot).
  const rt0 = saveRoundTrip(raw, run.end, shipped), flagsDifferFromBuild = overridden;
  const rt = { ...rt0, pass: rt0.pass && !flagsDifferFromBuild };
  check('save-roundtrip', rt.pass, rt.pass ? 'validate(raw, shipped balance) = run.end (not migrated; F/H/V/C, Grader tier, workers, coins equal)'
    : flagsDifferFromBuild ? `--flags differ from the build's shipped flags (${Object.keys(o.flags).filter(k => o.flags[k] !== flagsOf(shipped)[k]).map(k => `${k}=${o.flags[k]} vs ${flagsOf(shipped)[k]}`).join(', ')}): the built html cannot show this run's farm; round-trip under the shipped balance ${rt0.pass ? 'passes' : `fails (${rt0.migrated ? 'migrated' : 'not migrated'}; mismatches: ${rt0.mismatches.map(m => m.field).join(', ') || 'none'})`}`
    : !rt.ok ? `validate failed: ${rt.reason}` : `${rt.migrated ? `migrated on load (tracksMigrated ${rt.tracksMigrated}, version ${rt.version})` : 'not migrated'}; mismatches: ${rt.mismatches.map(m => m.field).join(', ') || 'none'}`);
  let shot: any = { ok: false, skipped: o.noShot };
  const png = join(outDir, 'verify.png');
  rmSync(png, { force: true }); // CCR n1: a failed or skipped shot must never leave an earlier run's PNG next to this verify.json
  if (!o.noShot && rt.pass) {
    const tmp = mkdtempSync(join(tmpdir(), 'verify-')), sp = join(tmp, 'save.json'); writeFileSync(sp, raw);
    for (let attempt = 1; attempt <= 2; attempt++) { // one retry: a cold first Chromium start can time out (seen once locally)
      const r = spawnSync(process.execPath, [join(ROOT, 'scripts/verify/shot.mjs'), resolve(ROOT, HTML), sp, png], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });
      try { shot = JSON.parse(r.stdout.trim().split('\n').pop() || 'null'); } catch { shot = null; }
      if (!shot || typeof shot !== 'object') shot = { ok: false, error: `shot.mjs exit ${r.status ?? r.signal}: ${(r.stderr || '').trim().split('\n')[0].slice(0, 200) || 'no output'}` };
      if (shot.ok) break;
      log(`browser step attempt ${attempt} failed: ${shot.error}`);
    }
    rmSync(tmp, { recursive: true, force: true });
    if (!shot.ok) rmSync(png, { force: true });
  }
  const labelWant = `Egg Farm ${buildId}`;
  check('build-label', !!shot.ok && shot.label === labelWant && shot.dataBuildId === buildId, shot.ok ? `label ${JSON.stringify(shot.label)}, #app data-build-id ${shot.dataBuildId}` : `no screenshot: ${shot.error ?? (o.noShot ? '--no-shot' : flagsDifferFromBuild ? 'skipped: --flags differ from the build' : !rt.pass ? 'skipped: save-roundtrip failed' : 'unknown')}`);
  // 3. verify.json (deterministic: no timestamps, durations or absolute paths)
  const report = {
    schemaVersion: SCHEMA_VERSION, tool: 'scripts/verify.ts',
    buildId, sha, dirty: buildId.endsWith('+dirty'),
    asset: { path: HTML_LABEL, sha256: createHash('sha256').update(htmlBytes).digest('hex'), bytes: htmlBytes.length, build: buildHow },
    seed: o.seed, hours: o.hours, profile: o.profile,
    flags: { ...flagsOf(shipped), ...o.flags }, flagsOverridden: overridden,
    sim: { tickHz: b.tickHz, ticks: run.ticks, tickPath: 'src/sim/tick.ts advance() per 1000 ms, then input (build order)', bot: 'AC7 workers bot: tests/bot-m2.ts runM2 seller15, managed, no variance; tap 1/s, check-in every 15 s' },
    checkpoints: run.checkpoints,
    saveRoundTrip: { pass: rt.pass, balance: 'shipped (src/config/balance.json, what the built html runs)', flagsDifferFromBuild, validator: rt.validator, ok: rt.ok, reason: rt.reason, migrated: rt.migrated, tracksMigrated: rt.tracksMigrated, version: rt.version, fields: [...ROUNDTRIP_FIELDS], mismatches: rt.mismatches, markerSkippedForTest: skipMarker || undefined },
    trace: { name: 'AC7 trace hash (every sim event of the run + end state)', sha256: run.traceSha256, events: run.events },
    goldens: gs.map(g => ({ name: g.name, source: g.source, expected: g.expected, actual: g.actual, pass: g.pass })),
    screenshot: { skippedReason: o.noShot ? '--no-shot' : flagsDifferFromBuild ? 'flags differ from build' : !rt.pass ? 'save-roundtrip failed' : null, file: shot.ok && existsSync(png) ? 'verify.png' : null, viewport: '390x844', browser: 'chromium (headless)', label: shot.label ?? null, dataBuildId: shot.dataBuildId ?? null, metaBuildId: shot.metaBuildId ?? null, pageErrors: (shot.pageErrors ?? []).length },
    checks, result: checks.every(c => c.pass) ? 'PASS' : 'FAIL',
  };
  // Public repo (DoD 9): sanitise paths / user / host, then refuse to ship anything that still looks private.
  const lk = leaks(sanitize(JSON.stringify(report), ROOT));
  report.checks.push({ id: 'no-private-data', pass: lk.length === 0, detail: lk.length ? `${lk.length} suspicious strings redacted` : 'no tokens, e-mail addresses or absolute paths' });
  report.result = report.checks.every(c => c.pass) ? 'PASS' : 'FAIL';
  let text = sanitize(JSON.stringify(report, null, 2) + '\n', ROOT);
  for (const x of lk) text = text.split(x).join('<redacted>');
  writeFileSync(join(outDir, 'verify.json'), text);
  const rel = relative(process.cwd(), outDir) || '.';
  log(`${report.result} ${buildId} seed ${o.seed} ${o.hours} h: trace ${run.traceSha256.slice(0, 12)}, goldens ${gs.map(g => `${g.name} ${g.pass ? 'ok' : 'MISMATCH'}`).join(', ')}, label ${shot.ok ? 'ok' : 'missing'} -> ${rel}/verify.json${shot.ok ? ', verify.png' : ''} (${((performance.now() - t0) / 1000).toFixed(1)} s)`);
  if (!rt.pass) return 4; // CCR R1: its own code, so CI and QA can tell a wrong-farm screenshot from other check failures; takes precedence over 1 (CCR N1 on #72)
  return report.result === 'PASS' ? 0 : 1;
}
process.exitCode = main();
