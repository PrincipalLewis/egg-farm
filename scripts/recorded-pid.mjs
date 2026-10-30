// D-HOE-20261030-04 (M1 + m7, reviews/ui-qa-run-rc-lane-harness-8bd8fb46-architect.md): signal only a process we started
// ourselves, identified the way ops/tools/lane-kill.sh does it (standing rule 21). At spawn we record the PID, its start
// time (field 22 of /proc/<pid>/stat), its parent (must be this process) and the boot id. Before any signal we re-read
// /proc/<pid>/stat for that ONE pid and refuse if anything differs: gone or zombie, another boot, another start time (a
// reused PID), not our child, or (for a group signal) not the leader of its own process group.
// There is no /proc walk and no name or pattern matching here, by design. Linux only.
import fs from 'node:fs';
const BOOT_ID = '/proc/sys/kernel/random/boot_id';
const PID_MAX = 4194304; // kernel ceiling for pid_max
export const bootId = () => fs.readFileSync(BOOT_ID, 'utf8').trim();
/** /proc/<pid>/stat of exactly this pid, or null when it does not exist. The comm field may hold spaces or ')', so
 *  fields are counted from the LAST ')'. */
export function readStat(pid) {
  let s; try { s = fs.readFileSync(`/proc/${pid}/stat`, 'utf8'); } catch { return null; }
  const f = s.slice(s.lastIndexOf(')') + 2).split(' '); // f[0] = field 3 (state) ... f[19] = field 22 (starttime)
  return { state: f[0], ppid: +f[1], pgrp: +f[2], starttime: f[19] };
}
const pidProblem = pid => !Number.isInteger(pid) || pid <= 1 || pid > PID_MAX ? `invalid pid ${JSON.stringify(pid)}` : pid === process.pid ? 'own pid' : null;
/** Record a process right after we spawned it. Returns null (nothing may ever be signalled) unless `pid` is a live
 *  child of `parent` (default: this process). */
export function recordPid(pid, { parent = process.pid } = {}) {
  if (pidProblem(pid)) return null;
  const st = readStat(pid);
  if (!st || st.state === 'Z' || st.ppid !== parent) return null;
  return Object.freeze({ pid, starttime: st.starttime, bootId: bootId(), parent });
}
/** null when `rec` still names the process we recorded, else the reason to refuse. */
export function recordProblem(rec, { group = true } = {}) {
  if (!rec) return 'no record (not started by us, or it exited before it was recorded)';
  const bad = pidProblem(rec.pid); if (bad) return bad;
  if (rec.bootId !== bootId()) return 'recorded on another boot';
  const st = readStat(rec.pid);
  if (!st) return 'gone';
  if (st.state === 'Z') return 'exited (zombie)';
  if (st.starttime !== rec.starttime) return `start time ${st.starttime} != recorded ${rec.starttime} (reused pid)`;
  if (st.ppid !== rec.parent) return `parent ${st.ppid} != recorded ${rec.parent} (not our child)`;
  if (group && st.pgrp !== rec.pid) return `not a process-group leader (pgrp ${st.pgrp})`;
  return null;
}
/** Signal the recorded process (its whole process group when `group`) after the identity check; never anything else.
 *  Returns { ok, pid, reason }. */
export function killRecorded(rec, signal = 'SIGTERM', { group = true } = {}) {
  const reason = recordProblem(rec, { group });
  if (reason) return { ok: false, pid: rec?.pid ?? null, reason };
  try { process.kill(group ? -rec.pid : rec.pid, signal); } catch (e) { return { ok: false, pid: rec.pid, reason: `kill failed (${e?.code ?? e})` }; }
  return { ok: true, pid: rec.pid, reason: null };
}
/** killRecorded for a ChildProcess we hold: also refused once Node has seen it exit (so a reaped and reused pid is
 *  never touched). */
export function stopChild(child, rec, signal = 'SIGTERM', opts = {}) {
  if (child.exitCode !== null || child.signalCode !== null) return { ok: false, pid: rec?.pid ?? null, reason: 'exited' };
  return killRecorded(rec, signal, opts);
}
