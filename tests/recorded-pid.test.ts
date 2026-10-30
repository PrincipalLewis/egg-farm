// D-HOE-20261030-04 (M1 serve-own.mjs, m7 d2-kill-browser.mjs): only the process we recorded at spawn is ever signalled.
// These tests spawn only their own `sleep` children and clean them up by their own recorded PIDs (afterEach). Every
// refusal case replaces process.kill with a spy that never signals, so a broken guard cannot hit a foreign process.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
// @ts-expect-error plain .mjs helper without types
import { recordPid, recordProblem, killRecorded, stopChild, readStat, bootId, spawnRecorded, groupMembers, groupProbe, survivors, stopGroup } from '../scripts/recorded-pid.mjs';
// @ts-expect-error plain .mjs helper without types
import { stopReport } from '../scripts/serve-own.mjs';

const mine: ChildProcess[] = [];
function sleeper(detached = true): ChildProcess { const c = detached ? spawnRecorded('sleep', ['30'], { stdio: 'ignore' }).child : spawn('sleep', ['30'], { stdio: 'ignore' }); mine.push(c); return c; }
const exited = (c: ChildProcess) => c.exitCode !== null || c.signalCode !== null ? Promise.resolve() : new Promise<void>(r => c.once('exit', () => r()));
function noSignal() { return vi.spyOn(process, 'kill').mockImplementation(() => { throw new Error('process.kill must not be called'); }); }
afterEach(async () => {
  vi.restoreAllMocks();
  for (const c of mine.splice(0)) if (c.exitCode === null && c.signalCode === null && c.pid) { expect(killRecorded(recordPid(c.pid), 'SIGKILL', { group: false }).ok).toBe(true); await exited(c); } // N2: own children, guarded API
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
  it("F1: a forged record naming a foreign process's REAL parent is refused (sleep spawned by a child shell)", async () => {
    // our detached sh is the parent of a `sleep 3`; that sleep is NOT our child. A record that names its real parent passes
    // every check except "ours", which is now always process.pid.
    const { child: sh } = spawnRecorded('sh', ['-c', 'sleep 3 & echo $!; wait'], { stdio: ['ignore', 'pipe', 'ignore'] }); mine.push(sh);
    const g = +(await new Promise<string>(r => sh.stdout!.once("data", (d: Buffer) => r(String(d))))).trim();
    const st = readStat(g); expect(st.ppid).toBe(sh.pid);
    expect(recordPid(g)).toBeNull();
    expect((recordPid as any)(g, { parent: sh.pid })).toBeNull(); // the old parent option is gone and ignored
    const spy = noSignal();
    for (const group of [false, true]) {
      const r = killRecorded({ pid: g, starttime: st.starttime, bootId: bootId(), parent: sh.pid }, 'SIGTERM', { group });
      expect(r.ok).toBe(false); expect(r.reason).toMatch(/not this process .* \(not our record\)/);
    }
    // even with parent: process.pid written into the forged record, the live ppid check refuses it
    const r2 = killRecorded({ pid: g, starttime: st.starttime, bootId: bootId(), parent: process.pid }, 'SIGTERM', { group: false });
    expect(r2.reason).toMatch(/parent \d+ != this process \d+ \(not our child\)/);
    expect(spy).not.toHaveBeenCalled(); spy.mockRestore();
    const shRec = recordPid(sh.pid); expect(killRecorded(shRec, 'SIGTERM').ok).toBe(true); await exited(sh); // group TERM: sh + its sleep
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
  it('F6: invalid, own and malformed records are refused by killRecorded and stopChild themselves, with no signal', () => {
    const c = sleeper(); const rec = recordPid(c.pid); const spy = noSignal();
    const cases: [any, RegExp][] = [
      ...[0, 1, -1, NaN, 1.5, 4194305, '123', undefined].map(pid => [{ ...rec, pid }, /^invalid pid/] as [any, RegExp]),
      [{ ...rec, pid: process.pid }, /^own pid$/],
      [5, /^invalid pid/], ['x', /^invalid pid/], [[c.pid], /^invalid pid/], [{ pid: c.pid }, /^malformed record \(starttime\)/],
      [{ ...rec, starttime: undefined }, /^malformed record \(starttime\)/], [{ ...rec, starttime: +rec.starttime }, /^malformed record \(starttime\)/],
      [{ ...rec, bootId: undefined }, /^malformed record \(bootId\)/], [{ ...rec, bootId: '' }, /^malformed record \(bootId\)/],
      [{ ...rec, parent: undefined }, /not our record/], [{ ...rec, parent: process.ppid }, /not our record/],
    ];
    for (const [r, why] of cases) for (const group of [true, false]) {
      expect(killRecorded(r, 'SIGKILL', { group }).reason, JSON.stringify(r)).toMatch(why);
      expect(stopChild(c, r, 'SIGKILL', { group }).reason).toMatch(why);
    }
    expect(spy).not.toHaveBeenCalled(); expect(c.exitCode).toBeNull(); expect(c.signalCode).toBeNull();
  });
  it('an exited child is refused by stopChild and by killRecorded (gone or zombie), and no record means no signal', async () => {
    const c = sleeper(); const rec = recordPid(c.pid); expect(killRecorded(rec, 'SIGKILL').ok).toBe(true); await exited(c);
    const spy = noSignal();
    expect(stopChild(c, rec)).toMatchObject({ ok: false, reason: 'exited' });
    expect(killRecorded(rec).reason).toMatch(/^(gone|exited \(zombie\)|start time .* \(reused pid\))$/);
    expect(killRecorded(null).reason).toMatch(/^no record/); expect(stopChild(sleeper(), null).ok).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});

// The source check (no /proc walk, no pattern or raw kill) lives in tests/rule21-source.test.ts (UI QA #89 F3).

// UI QA #89 F2: a TERM-ignoring grandchild survives the group TERM; it must be found (by the spawn-time snapshot, no
// /proc scan), reported with its PID and a non-ok result, and never signalled again. It is a `sleep 2` that expires on
// its own; each test waits for that by its own PID + start time.
const gone = async (m: { pid: number; starttime: string }) => { for (let i = 0; i < 100; i++) { const st = readStat(m.pid); if (!st || st.starttime !== m.starttime) return true; await new Promise(r => setTimeout(r, 50)); } return false; };
async function termIgnoringGroup() {
  const { child, rec } = spawnRecorded('sh', ['-c', '(trap "" TERM; exec sleep 2) & echo $!; wait'], { stdio: ['ignore', 'pipe', 'ignore'] }); mine.push(child);
  const g = +(await new Promise<string>(r => child.stdout!.once("data", (d: Buffer) => r(String(d))))).trim();
  await new Promise(r => setTimeout(r, 100)); // let the subshell exec sleep (TERM stays ignored across exec)
  const members = groupMembers(rec); return { child, rec, g, members, gm: members.find((m: any) => m.pid === g) };
}
describe('F2: group survivors are found and reported, never dropped', () => {
  it('spawnRecorded: a detached, recorded group leader; groupMembers snapshots its descendants with start times', async () => {
    const { child, rec, g, members } = await termIgnoringGroup();
    expect(rec).toMatchObject({ pid: child.pid, parent: process.pid }); expect(readStat(child.pid).pgrp).toBe(child.pid);
    expect(members).toEqual([{ pid: g, starttime: readStat(g).starttime, pgrp: child.pid }]);
    expect(groupProbe(rec)).toBe('members');
    expect(stopGroup(child, rec, { graceMs: 200 }).survivors).toEqual([g]); await exited(child); expect(await gone({ pid: g, starttime: members[0].starttime })).toBe(true);
  });
  it('stopGroup: TERM reaches the group, the TERM-ignoring grandchild survives -> ok false, its PID reported, no second signal', async () => {
    const { child, rec, g, gm } = await termIgnoringGroup(); const spy = vi.spyOn(process, 'kill');
    const res = stopGroup(child, rec, { graceMs: 300 });
    expect(res).toMatchObject({ ok: false, signalled: true, reason: 'group members remain', survivors: [g] });
    expect(spy.mock.calls.filter(c => c[1] !== 0)).toEqual([[-child.pid!, 'SIGTERM']]); // one real signal, the recorded group
    await exited(child); expect(child.signalCode).toBe('SIGTERM');
    expect(survivors(rec, [gm])).toEqual({ live: [g], probe: 'members' }); // leader reaped: the group probe confirms it
    expect(stopReport(res, child.pid)).toMatch(new RegExp(`^serveOwn: SURVIVORS vite group ${child.pid}: group members remain; surviving pids: ${g} `));
    expect(await gone(gm)).toBe(true); expect(survivors(rec, [gm])).toEqual({ live: [], probe: 'empty' });
  });
  it('leader already exited before stop while a member lives -> ok false with that PID, nothing signalled (signal-0 probe only)', async () => {
    const { child, rec, g, members, gm } = await termIgnoringGroup();
    expect(killRecorded(rec, 'SIGTERM', { group: false }).ok).toBe(true); await exited(child); // only the leader dies
    const spy = vi.spyOn(process, 'kill');
    const res = stopGroup(child, rec, { members, graceMs: 200 });
    expect(res).toMatchObject({ ok: false, signalled: false, reason: 'group members remain', survivors: [g], probe: 'members' });
    expect(spy.mock.calls.every(c => c[0] === -child.pid! && c[1] === 0)).toBe(true); expect(spy).toHaveBeenCalled();
    expect(stopReport(res, child.pid)).toMatch(/SURVIVORS .*surviving pids: \d+ \(group probe members\)/);
    expect(await gone(gm)).toBe(true);
  });
  it('clean stop: the whole group exits on TERM -> ok true, no survivors, stopReport null; afterwards the probe is empty', async () => {
    const { child, rec } = spawnRecorded('sh', ['-c', 'sleep 30 & wait'], { stdio: 'ignore' }); mine.push(child);
    await new Promise(r => setTimeout(r, 100)); const members = groupMembers(rec); expect(members).toHaveLength(1);
    const res = stopGroup(child, rec); expect(res).toMatchObject({ ok: true, signalled: true, survivors: [] }); expect(stopReport(res, child.pid)).toBeNull();
    await exited(child); expect(survivors(rec, members)).toEqual({ live: [], probe: 'empty' });
  });
  it('groupProbe and groupMembers refuse records that are not ours (no signal, not even 0)', () => {
    const c = sleeper(); const rec = recordPid(c.pid); const spy = noSignal();
    for (const r of [null, undefined, 7, { ...rec, pid: 1 }, { ...rec, parent: process.ppid }, { ...rec, bootId: 'x' }, { ...rec, starttime: 'x' }]) {
      expect(groupProbe(r)).toBe('refused'); expect(groupMembers(r)).toEqual([]);
    }
    expect(spy).not.toHaveBeenCalled();
  });
  it('an identity refusal (reused pid) is not a silent stop: ok false, refused, nothing signalled', () => {
    const c = sleeper(); const rec = recordPid(c.pid); const spy = noSignal();
    const res = stopGroup(c, { ...rec, starttime: String(+rec.starttime - 1) });
    expect(res.ok).toBe(false); expect(res.reason).toMatch(/^refused: .*reused pid/); expect(spy).not.toHaveBeenCalled();
    expect(stopReport(res, c.pid)).toMatch(/^serveOwn: SURVIVORS/);
  });
});
