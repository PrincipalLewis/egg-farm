// UI QA #89 F4 (+F5 b later): d2-kill-browser's halt guard. The "browser" here is our own recorded `sleep`
// (spawnRecorded); every test cleans up its own children by their recorded PIDs. Nothing outside our group is touched.
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
// @ts-expect-error plain .mjs helper without types
import { spawnRecorded, recordPid, killRecorded, groupMembers, readStat } from '../scripts/recorded-pid.mjs';
// @ts-expect-error plain .mjs helper without types
import { createRunGuard, leftovers, Halt } from '../scripts/d2-guard.mjs';

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
