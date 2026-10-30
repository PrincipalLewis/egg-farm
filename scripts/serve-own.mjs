// Start `vite preview` for OUTDIR on PORT and make sure the page on that port is OUR build: --strictPort makes vite exit
// if the port is taken, and the served index.html must reference this outDir's own hashed entry chunk. (A stale server
// from another worktree on the same port once made a run test the wrong build.)
// port 0 / undefined (the default for callers without PORT set): probe a free port from the OS, so parallel worktrees don't
// collide on a fixed default; the chosen port is printed to stderr and returned. An explicit port is used as-is.
import { execSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net';
import { spawnRecorded, stopGroup, groupMembers } from './recorded-pid.mjs';
export const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.unref(); s.on('error', rej);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });
const FETCH_MS = 10000; // CCR n4: no fetch may hang a run
/** CCR delta m1: every vite child this process spawned, recorded right after spawn, so a signal during startup (before
 *  serveOwn resolves) still kills it. Only these process groups are ever killed.
 *  D-HOE-20261030-04 M1: each is recorded with its start time, parent and boot id (recorded-pid.mjs), and its group is
 *  signalled only while it is still that unexited child of ours and leads its own group; anything else is refused. */
const children = new Map(); // ChildProcess -> { rec (null if it exited before it was recorded: never signalled), members }
export const liveChildren = () => children.size;
/** UI QA #89 F2: one loud line for a stop that did not verifiably empty the group (null when it did). */
export function stopReport(res, pid) {
  if (res.ok) return null;
  return `serveOwn: SURVIVORS vite group ${pid ?? '?'}: ${res.reason}; surviving pids: ${res.survivors.length ? res.survivors.join(' ') : 'none in the snapshot'} (group probe ${res.probe}); not signalled again - stop them through a stop list`;
}
function stopOne(c) {
  const e = children.get(c); children.delete(c);
  const res = stopGroup(c, e.rec, { members: e.members }), line = stopReport(res, e.rec?.pid ?? c.pid);
  if (line) { console.error(line); if (!process.exitCode) process.exitCode = 3; } // never dropped silently, never exit 0
  return res;
}
export function stopAllChildren() { for (const c of [...children.keys()]) stopOne(c); }
async function serveOnce(outDir, port, cwd) {
  const { child: srv, rec } = spawnRecorded('npx', ['vite', 'preview', '--outDir', outDir, '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', cwd });
  let spawnErr = null; srv.on('error', e => { spawnErr = e; }); // CCR delta n5: e.g. npx missing -> one-line error, not a crash
  const entry = { rec, members: [] }; if (srv.pid) children.set(srv, entry);
  const stop = () => { if (children.has(srv)) stopOne(srv); };
  try { // CCR n4: vite is stopped on ANY failure here, not only on a mismatch
    let html = '';
    for (let i = 0; i < 80 && srv.exitCode === null && !spawnErr; i++) { try { html = await (await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(FETCH_MS) })).text(); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
    await new Promise(r => setTimeout(r, 300));
    if (spawnErr) throw new Error(`serveOwn: cannot start vite preview (${spawnErr.code ?? ''} ${spawnErr.message}).`);
    const own = fs.readdirSync(path.join(cwd, outDir, 'assets')).filter(f => /^index-.*\.js$/.test(f));
    if (srv.exitCode !== null || !own.length || !own.every(f => html.includes(f)))
      throw new Error(`serveOwn: port ${port} is not serving ${outDir} from ${cwd} (vite exit ${srv.exitCode}; expected ${own.join(',')}). Pick another PORT.`);
  } catch (e) { stop(); throw e; }
  entry.members = groupMembers(rec); // F2: vite (npx's child) and anything else in the group, by pid + start time
  return { port, cwd, outDir, url: `http://127.0.0.1:${port}/`, stop };
}
export async function serveOwn(outDir, port = 0, cwd = process.cwd()) {
  if (+port) return serveOnce(outDir, +port, cwd);
  for (let attempt = 1; ; attempt++) { // a probed port can be grabbed before vite binds it: retry with a fresh one
    const p = await freePort();
    try { const s = await serveOnce(outDir, p, cwd); console.error(`serveOwn: ${outDir} on port ${p} (free port; set PORT to pin)`); return s; }
    catch (e) { if (attempt >= 3) throw e; }
  }
}
/** CCR n3: PORT unset or empty = 0 (free port); otherwise an integer 1..65535, else an error (callers exit 2). */
export function parsePort(v = process.env.PORT) {
  if (v === undefined || v === '') return 0;
  if (!/^\d+$/.test(v) || +v < 1 || +v > 65535) throw new Error(`serveOwn: PORT=${JSON.stringify(v)} is not a port number (1..65535); unset it for a free port.`);
  return +v;
}
/** Same rule as scripts/build-id.ts isDirty (PT1-9: Vite's temp config bundle never counts); tests/serve-own.test.ts pins
 *  the two together. Kept in JS because the browser scripts run under plain node. */
export const IGNORED_DIRTY = /(^|\/)vite\.config\.[cm]?[jt]s\.timestamp-[^/]*$/;
export const isDirty = porcelain => porcelain.split('\n').map(l => l.slice(3).trim().replace(/^"|"$/g, '')).filter(f => f && !IGNORED_DIRTY.test(f)).length > 0;
/** Pure verdict for expectHeadBuild. `id` = served build-id, `head` = full HEAD sha, `dirty` = the tree is dirty.
 *  Returns null when OK, else the reason. The hash must be HEAD's AND the dirty state must match the tree:
 *  - '+dirty' build, clean tree: always refused (CCR delta n1: a dirty build is never current on a clean tree, e.g. a stale
 *    flag-off bundle left after reverting balance.json);
 *  - '+dirty' build, dirty tree: refused unless allowDirty (ALLOW_DIRTY=1, a deliberate flag-off run);
 *  - clean build-id, dirty tree: refused (the build predates the uncommitted or untracked changes). */
const CLEAN_HINT = 'commit, stash or remove the uncommitted AND untracked files (see git status), then rebuild';
export function buildIdProblem(id, head, dirty, allowDirty = false) {
  const m = /\+([0-9a-f]{7,40})(\+dirty)?$/.exec(id ?? '');
  if (!m || !head.startsWith(m[1])) return `is not HEAD ${head.slice(0, 7)} (stale build or foreign server)`;
  if (m[2] && !dirty) return `is a +dirty build but the tree at HEAD ${head.slice(0, 7)} is clean (a stale dirty build, e.g. flag-off left after a revert); rebuild`;
  if (m[2] && !allowDirty) return `is a +dirty build (uncommitted or untracked changes, e.g. a flag-off balance.json); ${CLEAN_HINT}, or for a deliberate dirty run set ALLOW_DIRTY=1`;
  if (!m[2] && dirty) return `is clean but the tree at HEAD ${head.slice(0, 7)} is dirty (the build predates the uncommitted or untracked changes); ${CLEAN_HINT}; for a deliberate dirty run rebuild and set ALLOW_DIRTY=1`;
  return null;
}
/** CCR n-d + m1/n5 (reviews/pr66-f8ba53c.md, pr66-delta-a8ff301.md): fail loudly when the served build is not exactly this
 *  checkout (HEAD + dirty state, see buildIdProblem). Reads <meta name="build-id"> (m3-rc1-pre+<short>[+dirty]) from the
 *  served page; git runs in the cwd serveOwn got. Opt-outs (env): ALLOW_DIRTY=1 admits a +dirty build on a dirty tree (a
 *  deliberate flag-off run; warns with m4.enabled); ALLOW_NO_GIT=1 skips the check when git is unavailable (warns). */
export async function expectHeadBuild(srv, { allowDirty = process.env.ALLOW_DIRTY === '1', allowNoGit = process.env.ALLOW_NO_GIT === '1' } = {}) {
  const cwd = srv.cwd ?? process.cwd();
  const html = await (await fetch(srv.url, { signal: AbortSignal.timeout(FETCH_MS) })).text(), id = /<meta name="build-id" content="([^"]*)"/.exec(html)?.[1] ?? '';
  let head = '', porcelain = '';
  try { const o = { encoding: 'utf8', cwd, stdio: ['ignore', 'pipe', 'pipe'] }; head = execSync('git rev-parse HEAD', o).trim(); porcelain = execSync('git status --porcelain', o); }
  catch (e) { // CCR delta n1: its own opt-out; ALLOW_DIRTY no longer skips this
    if (allowNoGit) { console.error(`serveOwn: WARNING git unavailable in ${cwd}; ALLOW_NO_GIT=1, served build ${id || '(none)'} NOT checked`); return id; }
    throw new Error(`serveOwn: git unavailable in ${cwd} (${String(e?.stderr ?? e?.message ?? e).trim().split('\n')[0]}); cannot check served build-id "${id}". Set ALLOW_NO_GIT=1 to skip the check.`); }
  const why = buildIdProblem(id, head, isDirty(porcelain), allowDirty);
  if (why) throw new Error(`serveOwn: served build-id "${id}" at ${srv.url} ${why}.`);
  if (/\+dirty$/.test(id)) { let m4 = '?'; try { m4 = String(JSON.parse(fs.readFileSync(path.join(cwd, 'src/config/balance.json'), 'utf8')).m4?.enabled ?? '?'); } catch {}
    console.error(`serveOwn: WARNING ALLOW_DIRTY=1: testing a +dirty build (working-tree balance.json m4.enabled=${m4}); not a release build`); }
  return id;
}
/** One call for the browser gates: PORT (parsePort) -> serveOwn -> expectHeadBuild. Any failure prints one line and exits 2
 *  (CCR n2/n3: no stack traces). The server is stopped on every exit path afterwards (normal end, process.exit, an uncaught
 *  error, SIGINT/SIGTERM from `timeout`) - CCR n4. */
export async function serveForRun(outDir, tag) {
  let srv = null; const stop = () => { srv?.stop(); stopAllChildren(); }; // CCR delta m1: also vite children not yet returned
  process.on('exit', stop);
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stop(); process.exit(sig === 'SIGINT' ? 130 : 143); });
  try {
    srv = await serveOwn(outDir, parsePort());
    const id = await expectHeadBuild(srv);
    console.error(`${tag}: ${outDir} ${id} on port ${srv.port}`);
    return { ...srv, buildId: id };
  } catch (e) { console.error(`${tag}: ${String(e?.message ?? e)}`); stop(); process.exit(2); }
}
