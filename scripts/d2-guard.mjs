// UI QA #89 F4 (+F5 b): halt-and-report guard for scripts/d2-kill-browser.mjs. After the recorded browser group is
// SIGKILLed (or that signal is refused), the group is re-checked for leftovers from the launch-time snapshot plus a signal-0
// probe of OUR recorded group (recorded-pid.mjs). Leftovers or a refusal HALT the run: nothing is signalled again, the
// recorded and surviving PIDs go to STOP-LIST-for-HoO.txt, the evidence JSON says halted, and d2 exits non-zero.
import fs from 'node:fs'; import path from 'node:path';
import { survivors, readStat, bootId } from './recorded-pid.mjs';
export class Halt extends Error { constructor(reason) { super(`HALT: ${reason}`); this.reason = reason; } }
const sleep = ms => new Promise(r => setTimeout(r, ms));
/** Survivors of a recorded group, polled until the leader is reaped and the snapshot members are gone (or waitMs). */
export async function leftovers(rec, members = [], { waitMs = 3000 } = {}) {
  let s = survivors(rec, members);
  for (let t = 0; t < waitMs && (s.live.length || s.probe === 'leader-unreaped' || s.probe === 'members'); t += 100) { await sleep(100); s = survivors(rec, members); }
  return { ...s, clean: s.live.length === 0 && s.probe === 'empty' };
}
export function createRunGuard({ engine, evidenceDir, log = console.log, leftoverWaitMs = 3000 }) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  const stopListPath = path.join(evidenceDir, 'STOP-LIST-for-HoO.txt'), evidencePath = path.join(evidenceDir, 'd2-evidence.json');
  const state = { engine, halted: false, reasons: [], stopList: [], rows: [] };
  const writeEvidence = () => fs.writeFileSync(evidencePath, JSON.stringify(state, null, 1) + '\n');
  writeEvidence();
  const entry = (pid, role, starttime) => { const st = readStat(pid); return { pid, role, recordedStart: starttime ?? null, nowStart: st?.starttime ?? null, alive: !!st && st.state !== 'Z' && (starttime == null || st.starttime === starttime) }; };
  /** Halt: leftover check (report-only), stop list + evidence, then throw Halt. Never signals anything. */
  async function halt(reason, launch) {
    state.halted = true; state.reasons.push(reason);
    const rec = launch?.rec ?? null, members = launch?.members ?? [];
    const s = rec ? await leftovers(rec, members, { waitMs: leftoverWaitMs }) : { live: [], probe: 'no record', clean: false };
    const lines = [];
    if (rec) lines.push(entry(rec.pid, 'recorded browser leader', rec.starttime));
    else if (launch?.pid) lines.push(entry(launch.pid, 'unrecorded browser pid (from launch.sh, identity NOT verified)'));
    for (const pid of s.live) if (!rec || pid !== rec.pid) lines.push(entry(pid, 'group member', members.find(m => m.pid === pid)?.starttime));
    state.stopList.push(...lines.map(l => ({ ...l, reason })));
    fs.appendFileSync(stopListPath, `# ${new Date().toISOString()} d2-kill [${engine}] HALT: ${reason}; boot ${bootId()}; group probe ${s.probe}${s.probe === 'members' && !s.live.length ? ' (members not in the snapshot: pids unknown)' : ''}\n`
      + lines.map(l => `${l.pid} ${l.recordedStart ?? '-'} ${l.alive ? 'ALIVE' : 'gone'} ${l.role}\n`).join(''));
    writeEvidence();
    log(`HALT [${engine}] ${reason}; stop list ${stopListPath} (${lines.filter(l => l.alive).length} alive); evidence ${evidencePath}`);
    throw new Halt(reason);
  }
  /** F4: after the SIGKILL of the recorded group: the group must be verifiably empty, else halt. */
  async function afterKill(k, launch) {
    if (!k.ok) return halt(`SIGKILL refused for browser group ${k.pid}: ${k.reason}`, launch);
    const s = await leftovers(launch.rec, launch.members, { waitMs: leftoverWaitMs });
    if (!s.clean) return halt(`group leftovers after SIGKILL of ${launch.rec.pid}: pids ${s.live.join(' ') || '(none in the snapshot)'}, probe ${s.probe}`, launch);
    return s;
  }
  return { state, halt, afterKill, writeEvidence, stopListPath, evidencePath };
}
