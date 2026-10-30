// D-HOE-20261030-04 (M1 + m7, reviews/ui-qa-run-rc-lane-harness-8bd8fb46-architect.md): signal only a process we started
// ourselves, identified the way ops/tools/lane-kill.sh does it (standing rule 21). At spawn we record the PID, its start
// time (field 22 of /proc/<pid>/stat), its parent (must be this process) and the boot id. Before any signal we re-read
// /proc/<pid>/stat for that ONE pid and refuse if anything differs: gone or zombie, another boot, another start time (a
// reused PID), not our child, or (for a group signal) not the leader of its own process group.
// There is no /proc walk and no name or pattern matching here, by design. Linux only.
import fs from 'node:fs'; import { spawn } from 'node:child_process';
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
 *  child of THIS process. There is deliberately no parent option (UI QA #89 F1): "ours" always means process.pid. */
export function recordPid(pid) {
  if (pidProblem(pid)) return null;
  const st = readStat(pid);
  if (!st || st.state === 'Z' || st.ppid !== process.pid) return null;
  return Object.freeze({ pid, starttime: st.starttime, bootId: bootId(), parent: process.pid });
}
/** Shape check of a record (UI QA #89 F6): a non-object or a missing or ill-typed field is refused outright. */
function malformed(rec) {
  if (typeof rec !== 'object' || Array.isArray(rec)) return `malformed record (${Array.isArray(rec) ? 'array' : typeof rec})`;
  if (typeof rec.starttime !== 'string' || !/^\d+$/.test(rec.starttime)) return 'malformed record (starttime)';
  if (typeof rec.bootId !== 'string' || !rec.bootId) return 'malformed record (bootId)';
  return null;
}
/** null when `rec` still names the process we recorded, else the reason to refuse. */
export function recordProblem(rec, { group = true } = {}) {
  if (rec === null || rec === undefined) return 'no record (not started by us, or it exited before it was recorded)';
  const bad = pidProblem(rec?.pid) ?? malformed(rec); if (bad) return bad;
  if (rec.parent !== process.pid) return `recorded parent ${rec.parent} is not this process ${process.pid} (not our record)`;
  if (rec.bootId !== bootId()) return 'recorded on another boot';
  const st = readStat(rec.pid);
  if (!st) return 'gone';
  if (st.state === 'Z') return 'exited (zombie)';
  if (st.starttime !== rec.starttime) return `start time ${st.starttime} != recorded ${rec.starttime} (reused pid)`;
  if (st.ppid !== process.pid) return `parent ${st.ppid} != this process ${process.pid} (not our child)`;
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

// ---- process groups (UI QA #89 F2) ---------------------------------------------------------------------------------
/** Spawn `cmd` detached (a new process group led by the child) and record it at once. The only detached spawn the
 *  repo scripts may use; `rec` is null if it could not be recorded (then nothing is ever signalled). */
export function spawnRecorded(cmd, args = [], opts = {}) {
  const child = spawn(cmd, args, { ...opts, detached: true }); // rule-21 guarded site: detached spawn, recorded below
  return { child, rec: child.pid ? recordPid(child.pid) : null };
}
/** Direct children of ONE pid, from its own /proc/<pid>/task/<tid>/children files (no /proc scan). */
function childrenOf(pid) {
  let tids = []; try { tids = fs.readdirSync(`/proc/${pid}/task`); } catch { return []; } // rule-21 guarded site: one recorded pid
  const out = [];
  for (const t of tids) { try { out.push(...fs.readFileSync(`/proc/${pid}/task/${t}/children`, 'utf8').trim().split(/\s+/).filter(Boolean).map(Number)); } catch {} } // rule-21 guarded site
  return out;
}
/** Snapshot of the recorded leader's live descendants, each with its own start time (taken while the leader is still
 *  ours; [] otherwise). Survivors are later identified against this list, never by name or pattern. */
export function groupMembers(rec) {
  if (recordProblem(rec, { group: true })) return [];
  const out = [], seen = new Set([rec.pid]), todo = [rec.pid];
  while (todo.length && out.length < 512) for (const k of childrenOf(todo.shift())) {
    if (seen.has(k)) continue; seen.add(k);
    const st = readStat(k); if (st && st.state !== 'Z') { out.push(Object.freeze({ pid: k, starttime: st.starttime, pgrp: st.pgrp })); todo.push(k); }
  }
  return out;
}
/** Does the recorded process group still have members? Signal 0 only (nothing is delivered), and only for our own,
 *  same-boot record. 'empty' | 'members' | 'foreign' (EPERM: someone else's group) | 'refused' | 'error'. */
export function groupProbe(rec) {
  if (rec === null || rec === undefined || pidProblem(rec?.pid) || malformed(rec) || rec.parent !== process.pid || rec.bootId !== bootId()) return 'refused';
  try { process.kill(-rec.pid, 0); return 'members'; } // rule-21 guarded site: signal 0 probe
  catch (e) { return e?.code === 'ESRCH' ? 'empty' : e?.code === 'EPERM' ? 'foreign' : 'error'; }
}
/** Who of the recorded leader + snapshot is still alive (same start time), plus a group probe once the leader is
 *  reaped. While the leader is an unreaped zombie it still counts as a group member, so then the snapshot is the
 *  evidence (probe 'leader-unreaped'). If the leader's pid now has another start time it was reused, which the kernel
 *  only allows once no process group with that id exists any more: our group is empty, and -pid is never probed then.
 *  `probe: false` = snapshot only, no signal at all (used after an identity refusal). */
export function survivors(rec, members = [], { probe = true } = {}) {
  const alive = m => { const st = readStat(m.pid); return !!st && st.state !== 'Z' && st.starttime === m.starttime; };
  const live = members.filter(alive).map(m => m.pid);
  const lst = rec ? readStat(rec.pid) : null, leaderHere = !!lst && lst.starttime === rec.starttime;
  if (leaderHere && lst.state !== 'Z') live.unshift(rec.pid);
  return { live, probe: !probe ? 'not probed' : leaderHere ? 'leader-unreaped' : lst ? 'empty' : groupProbe(rec) };
}
const nap = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); // sync: also usable in 'exit' handlers
/** Stop a recorded group and verify it is empty. Synchronous. Signals only the recorded group (once, after the identity
 *  check); survivors are REPORTED, never signalled again and never dropped: { ok, signalled, reason, survivors, probe }.
 *  ok is true only when the group is verifiably gone. */
export function stopGroup(child, rec, { signal = 'SIGTERM', graceMs = 3000, members = [] } = {}) {
  const exitedBefore = child.exitCode !== null || child.signalCode !== null;
  const snap = [...members, ...(exitedBefore ? [] : groupMembers(rec))].filter((m, i, a) => a.findIndex(x => x.pid === m.pid && x.starttime === m.starttime) === i);
  const r = exitedBefore ? { ok: false, reason: 'leader exited before stop' } : stopChild(child, rec, signal);
  if (!exitedBefore && !r.ok) { const s = survivors(rec, snap, { probe: false }); return { ok: false, signalled: false, reason: `refused: ${r.reason}`, survivors: s.live, probe: s.probe }; }
  let s = survivors(rec, snap);
  for (let t = 0; t < graceMs && s.live.length; t += 50) { nap(50); s = survivors(rec, snap); }
  const clean = s.live.length === 0 && (s.probe === 'empty' || s.probe === 'leader-unreaped');
  return { ok: clean, signalled: r.ok, reason: clean ? (r.ok ? null : r.reason) : 'group members remain', survivors: s.live, probe: s.probe };
}
