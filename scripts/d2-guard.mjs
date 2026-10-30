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
  // ---- F5 (HoO ruling on Playwright's own group kill) -----------------------------------------------------------------
  // (a) d2 never asks Playwright to force-kill: no forced-kill API, no close() options, no patched timeouts (source check
  //     in tests/d2-guard.test.ts). (b) If Playwright's own group SIGKILL may have fired anyway (our close() watchdog expired, close()
  //     failed, or the browser exited/disconnected while we did not expect it), the run HALTS with the leftover check and
  //     the stop list. The watchdog only observes; it never shortens or replaces Playwright's own close.
  const unexpected = [];
  /** Watch a launch: a 'close' (browser exit/disconnect) that we did not announce with expectExit is recorded. */
  function watch(launch) { launch.expectedExit = false; launch.ctx.on('close', () => { if (!launch.expectedExit) unexpected.push({ pid: launch.rec?.pid ?? null, at: new Date().toISOString(), launch }); }); return launch; }
  const expectExit = launch => { launch.expectedExit = true; };
  const pwHalt = (reason, launch) => { state.playwrightKillPossible = true; return halt(reason, launch); };
  /** Halts if any watched browser exited or disconnected unexpectedly. */
  async function checkpoint() { if (unexpected.length) { const u = unexpected[0]; return pwHalt(`browser ${u.pid} exited/disconnected unexpectedly at ${u.at} (Playwright may have group-killed it)`, u.launch); } }
  /** ctx.close() under an observing watchdog (default 90 s); a timeout or a failure halts. */
  async function closeCtx(launch, { watchdogMs = 90000 } = {}) {
    expectExit(launch); let timer;
    const r = await Promise.race([launch.ctx.close().then(() => 'closed', e => `failed: ${String(e?.message ?? e).split('\n')[0]}`), new Promise(res => { timer = setTimeout(() => res('timeout'), watchdogMs); })]);
    clearTimeout(timer);
    if (r === 'timeout') return pwHalt(`close() of browser ${launch.rec?.pid} did not finish in ${watchdogMs} ms (Playwright's force-kill may fire)`, launch);
    if (r !== 'closed') return pwHalt(`close() of browser ${launch.rec?.pid} ${r} (Playwright's force-kill may have fired)`, launch);
  }
  /** Reason for a non-Halt error: an unexpected exit/disconnect wins over the raw error text. */
  function haltFor(e, launch) {
    if (unexpected.length) return checkpoint();
    return halt(`error: ${String(e?.message ?? e).split('\n')[0]}`, launch);
  }
  return { state, halt, afterKill, writeEvidence, stopListPath, evidencePath, watch, expectExit, checkpoint, closeCtx, haltFor };
}
/** F5 (c): the installed playwright-core (and @playwright/test, if used) must be exactly the lockfile version, and the
 *  package.json spec must name that same version. null when pinned, else the problem. */
export function playwrightPinProblem(root) {
  const rd = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
  const pkg = rd('package.json'), lock = rd('package-lock.json'), deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const names = ['playwright-core', '@playwright/test'].filter(n => deps[n] || lock.packages?.[`node_modules/${n}`]);
  if (!names.includes('playwright-core')) return 'playwright-core is not in package.json/package-lock.json';
  for (const n of names) {
    const spec = deps[n], lockV = lock.packages?.[`node_modules/${n}`]?.version, rootSpec = { ...lock.packages?.['']?.dependencies, ...lock.packages?.['']?.devDependencies }[n];
    let inst = null; try { inst = rd(`node_modules/${n}/package.json`).version; } catch {}
    if (!spec || !lockV) return `${n}: package.json spec ${spec ?? '(none)'} / lockfile ${lockV ?? '(none)'}`;
    if (spec.replace(/^[\^~=]/, '') !== lockV) return `${n}: package.json spec ${spec} does not name the lockfile version ${lockV}`;
    if (rootSpec !== spec) return `${n}: package-lock.json root spec ${rootSpec} != package.json ${spec}`;
    if (inst !== lockV) return `${n}: installed ${inst ?? '(missing)'} != lockfile ${lockV}`;
  }
  return null;
}
