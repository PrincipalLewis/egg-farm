// UI QA #89 F4 (+F5 b later): d2-kill-browser's halt guard. The "browser" here is our own recorded `sleep`
// (spawnRecorded); every test cleans up its own children by their recorded PIDs. Nothing outside our group is touched.
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
// @ts-expect-error plain .mjs helper without types
import { spawnRecorded, recordPid, killRecorded, groupMembers, readStat } from '../scripts/recorded-pid.mjs';
// @ts-expect-error plain .mjs helper without types
import { createRunGuard, leftovers, Halt, playwrightPinProblem } from '../scripts/d2-guard.mjs';
import { EventEmitter } from 'node:events';

const mine: any[] = [], dirs: string[] = [];
const exited = (c: any) => c.exitCode !== null || c.signalCode !== null ? Promise.resolve() : new Promise<void>(r => c.once('exit', () => r()));
afterEach(async () => {
  for (const c of mine.splice(0)) if (c.exitCode === null && c.signalCode === null) { expect(killRecorded(recordPid(c.pid), 'SIGKILL', { group: true }).ok).toBe(true); await exited(c); }
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true }); // our own mkdtemp dirs, by exact path
});
const evDir = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'd2guard-test-')); dirs.push(d); return d; };
const browserLike = async (cmd = 'sleep 30 & wait') => {
  const { child, rec } = spawnRecorded('sh', ['-c', cmd], { stdio: 'ignore' }); mine.push(child);
  await new Promise(r => setTimeout(r, 100)); return { child, rec, members: groupMembers(rec) };
};
const quiet = { log: () => {} };

describe('F4: d2 checks the group after its kill and halts on leftovers or a refusal', () => {
  it('clean kill: group SIGKILLed, leftovers clean, no halt, no stop list', async () => {
    const L = await browserLike(); const g = createRunGuard({ engine: 't', evidenceDir: evDir(), ...quiet });
    const k = killRecorded(L.rec, 'SIGKILL', { group: true }); expect(k.ok).toBe(true);
    const s = await g.afterKill(k, L); expect(s).toMatchObject({ live: [], probe: 'empty', clean: true });
    expect(fs.existsSync(g.stopListPath)).toBe(false); expect(JSON.parse(fs.readFileSync(g.evidencePath, 'utf8')).halted).toBe(false);
  });
  it('leftover member after the kill (a member that left the group) -> HALT, its PID ALIVE in STOP-LIST-for-HoO.txt, evidence halted', async () => {
    // stand-in for a member the group SIGKILL did not reach: only the leader is killed (group:false). The member is a
    // `sleep 2` that expires on its own (it is no longer our child, so it is never signalled here).
    const L = await browserLike('sleep 2 & wait'); const g = createRunGuard({ engine: 't', evidenceDir: evDir(), leftoverWaitMs: 300, ...quiet });
    const member = L.members[0]; expect(member).toBeTruthy();
    const k = killRecorded(L.rec, 'SIGKILL', { group: false }); expect(k.ok).toBe(true);
    await expect(g.afterKill(k, L)).rejects.toBeInstanceOf(Halt);
    const list = fs.readFileSync(g.stopListPath, 'utf8');
    expect(list).toMatch(/HALT: group leftovers after SIGKILL/); expect(list).toContain(`${member.pid} ${member.starttime} ALIVE group member`);
    expect(list).toMatch(new RegExp(`^${L.rec.pid} ${L.rec.starttime} gone recorded browser leader$`, 'm'));
    const ev = JSON.parse(fs.readFileSync(g.evidencePath, 'utf8')); expect(ev.halted).toBe(true); expect(ev.stopList.map((x: any) => x.pid)).toContain(member.pid);
    expect(await leftovers(L.rec, L.members, { waitMs: 0 })).toMatchObject({ live: [member.pid], probe: 'members' });
    expect(await leftovers(L.rec, L.members, { waitMs: 5000 })).toMatchObject({ live: [], probe: 'empty', clean: true }); // expired
  });
  it('refused kill (reused pid record) -> HALT with the recorded PID on the stop list, nothing signalled', async () => {
    const L = await browserLike(); const g = createRunGuard({ engine: 't', evidenceDir: evDir(), leftoverWaitMs: 200, ...quiet });
    const bad = { ...L.rec, starttime: String(+L.rec.starttime - 1) };
    const k = killRecorded(bad, 'SIGKILL', { group: true }); expect(k.ok).toBe(false);
    await expect(g.afterKill(k, L)).rejects.toThrow(/HALT: SIGKILL refused for browser group \d+: start time/);
    expect(fs.readFileSync(g.stopListPath, 'utf8')).toContain(`${L.rec.pid} ${L.rec.starttime} ALIVE recorded browser leader`);
    expect(readStat(L.child.pid)).toBeTruthy(); expect(L.child.exitCode).toBeNull();
  });
});

// F5 (HoO ruling): Playwright's own group kill is accepted only if d2 never triggers it on purpose (a), halts when it
// may have fired (b), and Playwright stays pinned (c).
const fakeCtx = (close: () => Promise<void>) => Object.assign(new EventEmitter(), { close });
describe('F5 (a): d2 never asks Playwright to force-kill', () => {
  const PW_FORCE: [string, RegExp][] = [
    ['browser.process()', /\.process\s*\(/], ['launchServer', /\blaunchServer\b/], ['signal-handler options', /\bhandleSIG(INT|TERM|HUP)\b/],
    ['close() with options (timeout/reason)', /\.close\s*\(\s*[^)\s]/], ['Playwright internals', /\bgracefullyClose\b|\bkillProcess\b|\bkillAndWait\b|processLauncher|coreBundle|playwright-core\/lib/],
    ['timeout env/patch', /PLAYWRIGHT_\w*TIMEOUT|PW_\w*TIMEOUT|\bsetDefault(Navigation)?Timeout\s*\(\s*\d{1,3}\s*\)/],
    ['patching Playwright objects', /\b(pw|T|chromium|firefox|webkit|ctx|browser)\s*\.\s*(close|kill|_\w+)\s*=[^=]/],
    ['private Playwright fields', /\.\s*_(browser|connection|channel|process|initializer)\b/],
  ];
  const NEG = ["browser.process().kill('SIGKILL')", "ctx.browser().process()", "await ctx.close({ reason: 'x' })", "await browser.close({timeout:1})",
    "pw.chromium.launchServer({})", "T.launchPersistentContext(d, { handleSIGTERM: false })", "process.env.PW_TEST_TIMEOUT = '1'",
    "ctx.close = async () => {}", "ctx._browser._connection.close()", "import x from 'playwright-core/lib/server/utils/processLauncher.js'", "page.setDefaultTimeout(1)"];
  it('negative fixtures: every forced-kill or timeout-tampering form is caught', () => { for (const l of NEG) expect(PW_FORCE.some(([, re]) => re.test(l)), l).toBe(true); });
  for (const f of ['scripts/d2-kill-browser.mjs', 'scripts/d2-guard.mjs']) it(`${f}: no forced-kill API, no close() options, no patched timeouts`, () => {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    expect(lines.flatMap((l, i) => PW_FORCE.filter(([, re]) => re.test(l)).map(([id]) => `${f}:${i + 1} [${id}] ${l.trim()}`))).toEqual([]);
  });
  it("d2's only SIGKILL is the guarded killRecorded of the recorded group", () => {
    const l = fs.readFileSync('scripts/d2-kill-browser.mjs', 'utf8').split('\n').filter(x => /['"`]SIGKILL['"`]/.test(x));
    expect(l).toHaveLength(1); expect(l[0]).toMatch(/killRecorded\(L\.rec, 'SIGKILL', \{ group: true \}\)/);
  });
});
describe('F5 (b): a close() timeout or an unexpected exit/disconnect halts with the leftover check and the stop list', () => {
  it('close() never finishes -> HALT after the observing watchdog; leader ALIVE on STOP-LIST-for-HoO.txt; evidence halted + playwrightKillPossible', async () => {
    const B = await browserLike(); const g = createRunGuard({ engine: 't', evidenceDir: evDir(), leftoverWaitMs: 200, ...quiet });
    const L = g.watch({ ...B, ctx: fakeCtx(() => new Promise<void>(() => {})) });
    await expect(g.closeCtx(L, { watchdogMs: 200 })).rejects.toThrow(/HALT: close\(\) of browser \d+ did not finish in 200 ms/);
    expect(fs.readFileSync(g.stopListPath, 'utf8')).toContain(`${B.rec.pid} ${B.rec.starttime} ALIVE recorded browser leader`);
    expect(fs.readFileSync(g.stopListPath, 'utf8')).toContain(`${B.members[0].pid} ${B.members[0].starttime} ALIVE group member`);
    expect(JSON.parse(fs.readFileSync(g.evidencePath, 'utf8'))).toMatchObject({ halted: true, playwrightKillPossible: true });
  });
  it('close() rejects -> HALT', async () => {
    const B = await browserLike(); const g = createRunGuard({ engine: 't', evidenceDir: evDir(), leftoverWaitMs: 100, ...quiet });
    const L = g.watch({ ...B, ctx: fakeCtx(() => Promise.reject(new Error('Target closed'))) });
    await expect(g.closeCtx(L)).rejects.toThrow(/HALT: close\(\) of browser \d+ failed: Target closed/);
  });
  it('unexpected disconnect (close event we did not announce) -> checkpoint HALTs; surviving PIDs listed; an error after it is attributed to it', async () => {
    const B = await browserLike(); const g = createRunGuard({ engine: 't', evidenceDir: evDir(), leftoverWaitMs: 100, ...quiet });
    const L = g.watch({ ...B, ctx: fakeCtx(async () => {}) });
    await g.checkpoint(); // nothing yet
    L.ctx.emit('close');
    await expect(g.haltFor(new Error('page.goto: Target page, context or browser has been closed'), L)).rejects.toThrow(/HALT: browser \d+ exited\/disconnected unexpectedly/);
    const list = fs.readFileSync(g.stopListPath, 'utf8'); expect(list).toContain(`${B.rec.pid} ${B.rec.starttime} ALIVE`);
    expect(JSON.parse(fs.readFileSync(g.evidencePath, 'utf8')).playwrightKillPossible).toBe(true);
  });
  it('an announced exit (our own SIGKILL / closeCtx) is not a halt', async () => {
    const B = await browserLike(); const g = createRunGuard({ engine: 't', evidenceDir: evDir(), ...quiet });
    const L = g.watch({ ...B, ctx: fakeCtx(async () => {}) });
    g.expectExit(L); L.ctx.emit('close'); await g.checkpoint(); await g.closeCtx(L);
    expect(fs.existsSync(g.stopListPath)).toBe(false); expect(JSON.parse(fs.readFileSync(g.evidencePath, 'utf8')).halted).toBe(false);
  });
});
describe('F5 (c): Playwright stays pinned', () => {
  it('installed playwright-core == package-lock.json version == the version package.json names (and @playwright/test, if present)', () => {
    expect(playwrightPinProblem(process.cwd())).toBeNull();
    const lockV = JSON.parse(fs.readFileSync('package-lock.json', 'utf8')).packages['node_modules/playwright-core'].version;
    expect(JSON.parse(fs.readFileSync('node_modules/playwright-core/package.json', 'utf8')).version).toBe(lockV);
  });
  const fake = (installed: string, spec = '^1.64.1', lockV = '1.64.1', extra: Record<string, any> = {}) => {
    const d = evDir(); fs.mkdirSync(path.join(d, 'node_modules/playwright-core'), { recursive: true });
    fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ devDependencies: { 'playwright-core': spec, ...extra.deps } }));
    fs.writeFileSync(path.join(d, 'package-lock.json'), JSON.stringify({ packages: { '': { devDependencies: { 'playwright-core': spec, ...extra.deps } }, 'node_modules/playwright-core': { version: lockV }, ...extra.lock } }));
    fs.writeFileSync(path.join(d, 'node_modules/playwright-core/package.json'), JSON.stringify({ version: installed })); return d;
  };
  it('fails on an installed version that differs from the lockfile', () => expect(playwrightPinProblem(fake('1.65.0'))).toMatch(/installed 1\.65\.0 != lockfile 1\.64\.1/));
  it('fails when the lockfile moved but package.json still names the old version', () => expect(playwrightPinProblem(fake('1.65.0', '^1.64.1', '1.65.0'))).toMatch(/spec \^1\.64\.1 does not name the lockfile version 1\.65\.0/));
  it('fails when @playwright/test is used but not installed at its lockfile version', () =>
    expect(playwrightPinProblem(fake('1.64.1', '^1.64.1', '1.64.1', { deps: { '@playwright/test': '1.64.1' }, lock: { 'node_modules/@playwright/test': { version: '1.64.1' } } }))).toMatch(/@playwright\/test: installed \(missing\)/));
  it('passes for a consistent fake tree', () => expect(playwrightPinProblem(fake('1.64.1'))).toBeNull());
});
