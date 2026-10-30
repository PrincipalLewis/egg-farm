// D-HOE-20261030-04 (M1 serve-own.mjs, m7 d2-kill-browser.mjs): only the process we recorded at spawn is ever signalled.
// These tests spawn only their own `sleep` children and clean them up by their own recorded PIDs (afterEach). Every
// refusal case replaces process.kill with a spy that never signals, so a broken guard cannot hit a foreign process.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
// @ts-expect-error plain .mjs helper without types
import { recordPid, recordProblem, killRecorded, stopChild, readStat, bootId } from '../scripts/recorded-pid.mjs';

const mine: ChildProcess[] = [];
function sleeper(detached = true): ChildProcess { const c = spawn('sleep', ['30'], { stdio: 'ignore', detached }); mine.push(c); return c; }
const exited = (c: ChildProcess) => c.exitCode !== null || c.signalCode !== null ? Promise.resolve() : new Promise<void>(r => c.once('exit', () => r()));
function noSignal() { return vi.spyOn(process, 'kill').mockImplementation(() => { throw new Error('process.kill must not be called'); }); }
afterEach(async () => {
  vi.restoreAllMocks();
  for (const c of mine.splice(0)) if (c.exitCode === null && c.signalCode === null && c.pid) { process.kill(c.pid, 'SIGKILL'); await exited(c); }
});

describe('M1/m7: the recorded process is stopped', () => {
  it('recordPid records a live child: pid, start time (stat field 22), parent = us, boot id', () => {
    const c = sleeper(); const rec = recordPid(c.pid);
    expect(rec).toEqual({ pid: c.pid, starttime: readStat(c.pid).starttime, bootId: bootId(), parent: process.pid });
    expect(fs.readFileSync(`/proc/${c.pid}/stat`, 'utf8')).toContain(`(sleep)`);
    expect(recordProblem(rec)).toBeNull();
  });
  it('killRecorded SIGTERMs the recorded process group and the child exits by that signal', async () => {
    const c = sleeper(); const rec = recordPid(c.pid); const spy = vi.spyOn(process, 'kill');
    expect(killRecorded(rec)).toEqual({ ok: true, pid: c.pid, reason: null });
    expect(spy).toHaveBeenCalledTimes(1); expect(spy).toHaveBeenCalledWith(-c.pid!, 'SIGTERM');
    await exited(c); expect(c.signalCode).toBe('SIGTERM');
  });
  it('stopChild (serve-own stop path) stops a live recorded child with the given signal (SIGKILL, as d2-kill-browser)', async () => {
    const c = sleeper(); const rec = recordPid(c.pid);
    expect(stopChild(c, rec, 'SIGKILL').ok).toBe(true); await exited(c); expect(c.signalCode).toBe('SIGKILL');
  });
  it('group: false signals just the pid (a non-leader child)', async () => {
    const c = sleeper(false); const rec = recordPid(c.pid); const spy = vi.spyOn(process, 'kill');
    expect(killRecorded(rec, 'SIGTERM', { group: false }).ok).toBe(true); expect(spy).toHaveBeenCalledWith(c.pid, 'SIGTERM');
    await exited(c); expect(c.signalCode).toBe('SIGTERM');
  });
});

describe('M1/m7: a foreign or reused pid is refused and nothing is signalled', () => {
  it('foreign pids are never recorded: init (1), our own parent, ourselves, invalid values', () => {
    for (const pid of [1, process.ppid, process.pid, 0, -1, NaN, 1.5, 4194305, '123' as any]) expect(recordPid(pid)).toBeNull();
  });
  it('a forged record for a foreign process (our own parent) is refused: not our child', () => {
    const spy = noSignal(); const st = readStat(process.ppid);
    const r = killRecorded({ pid: process.ppid, starttime: st.starttime, bootId: bootId(), parent: process.pid }, 'SIGTERM', { group: false });
    expect(r.ok).toBe(false); expect(r.reason).toMatch(/not our child/); expect(spy).not.toHaveBeenCalled();
  });
  it('reused pid: same pid but a different recorded start time is refused', () => {
    const c = sleeper(); const rec = recordPid(c.pid); const spy = noSignal();
    const r = killRecorded({ ...rec, starttime: String(+rec.starttime - 1) });
    expect(r.ok).toBe(false); expect(r.reason).toMatch(/reused pid/); expect(spy).not.toHaveBeenCalled();
    expect(c.exitCode).toBeNull(); expect(c.signalCode).toBeNull();
  });
  it('a record from another boot is refused', () => {
    const c = sleeper(); const rec = recordPid(c.pid); const spy = noSignal();
    const r = killRecorded({ ...rec, bootId: '00000000-0000-0000-0000-000000000000' });
    expect(r).toMatchObject({ ok: false, reason: 'recorded on another boot' }); expect(spy).not.toHaveBeenCalled();
  });
  it('a group signal to a child that does not lead its own group is refused (would hit our own group)', () => {
    const c = sleeper(false); const rec = recordPid(c.pid); const spy = noSignal();
    const r = killRecorded(rec); expect(r.ok).toBe(false); expect(r.reason).toMatch(/not a process-group leader/); expect(spy).not.toHaveBeenCalled();
  });
  it('an exited child is refused by stopChild and by killRecorded (gone or zombie), and no record means no signal', async () => {
    const c = sleeper(); const rec = recordPid(c.pid); process.kill(c.pid!, 'SIGKILL'); await exited(c);
    const spy = noSignal();
    expect(stopChild(c, rec)).toMatchObject({ ok: false, reason: 'exited' });
    expect(killRecorded(rec).reason).toMatch(/^(gone|exited \(zombie\)|start time .* \(reused pid\))$/);
    expect(killRecorded(null).reason).toMatch(/^no record/); expect(stopChild(sleeper(), null).ok).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('m7/M1: no /proc walk or pattern kill left in the two scripts', () => {
  for (const f of ['scripts/d2-kill-browser.mjs', 'scripts/serve-own.mjs', 'scripts/recorded-pid.mjs']) it(f, () => {
    const src = fs.readFileSync(f, 'utf8');
    expect(src).not.toMatch(/readdirSync\(\s*['"]\/proc/); expect(src).not.toMatch(/\/cmdline/); expect(src).not.toMatch(/pkill|killall|pgrep/);
    expect(src.match(/process\.kill\(/g) ?? []).toHaveLength(f.endsWith('recorded-pid.mjs') ? 1 : 0);
  });
});
