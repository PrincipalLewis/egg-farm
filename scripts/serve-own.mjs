// Start `vite preview` for OUTDIR on PORT and make sure the page on that port is OUR build: --strictPort makes vite exit
// if the port is taken, and the served index.html must reference this outDir's own hashed entry chunk. (A stale server
// from another worktree on the same port once made a run test the wrong build.)
// port 0 / undefined (the default for callers without PORT set): probe a free port from the OS, so parallel worktrees don't
// collide on a fixed default; the chosen port is printed to stderr and returned. An explicit port is used as-is.
import { spawn, execSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net';
export const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.unref(); s.on('error', rej);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });
const FETCH_MS = 10000; // CCR n4: no fetch may hang a run
async function serveOnce(outDir, port, cwd) {
  const srv = spawn('npx', ['vite', 'preview', '--outDir', outDir, '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true, cwd });
  const stop = () => { try { process.kill(-srv.pid); } catch {} };
  try { // CCR n4: vite is stopped on ANY failure here, not only on a mismatch
    let html = '';
    for (let i = 0; i < 80 && srv.exitCode === null; i++) { try { html = await (await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(FETCH_MS) })).text(); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
    await new Promise(r => setTimeout(r, 300));
    const own = fs.readdirSync(path.join(cwd, outDir, 'assets')).filter(f => /^index-.*\.js$/.test(f));
    if (srv.exitCode !== null || !own.length || !own.every(f => html.includes(f)))
      throw new Error(`serveOwn: port ${port} is not serving ${outDir} from ${cwd} (vite exit ${srv.exitCode}; expected ${own.join(',')}). Pick another PORT.`);
  } catch (e) { stop(); throw e; }
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
 *  Returns null when OK, else the reason. CCR m1: the hash must be HEAD's AND the dirty state must match: a served '+dirty'
 *  build is refused unless allowDirty (ALLOW_DIRTY=1), and a clean build-id is refused on a dirty tree (it predates the edits). */
export function buildIdProblem(id, head, dirty, allowDirty = false) {
  const m = /\+([0-9a-f]{7,40})(\+dirty)?$/.exec(id ?? '');
  if (!m || !head.startsWith(m[1])) return `is not HEAD ${head.slice(0, 7)} (stale build or foreign server)`;
  if (m[2] && !allowDirty) return `is a +dirty build (uncommitted changes, e.g. a flag-off balance.json); commit and rebuild, or set ALLOW_DIRTY=1`;
  if (!m[2] && dirty) return `is clean but the tree at HEAD ${head.slice(0, 7)} is dirty (the build predates the uncommitted changes); rebuild`;
  return null;
}
/** CCR n-d + m1/n5 (reviews/pr66-f8ba53c.md): fail loudly when the served build is not exactly this checkout (HEAD + dirty
 *  state). Reads <meta name="build-id"> (m3-rc1-pre+<short>[+dirty]) from the served page; git runs in the cwd serveOwn got.
 *  git unavailable (no repo, dubious ownership, ...) = an error, unless ALLOW_DIRTY=1 (then it warns and skips). */
export async function expectHeadBuild(srv, { allowDirty = process.env.ALLOW_DIRTY === '1' } = {}) {
  const cwd = srv.cwd ?? process.cwd();
  const html = await (await fetch(srv.url, { signal: AbortSignal.timeout(FETCH_MS) })).text(), id = /<meta name="build-id" content="([^"]*)"/.exec(html)?.[1] ?? '';
  let head = '', porcelain = '';
  try { const o = { encoding: 'utf8', cwd, stdio: ['ignore', 'pipe', 'pipe'] }; head = execSync('git rev-parse HEAD', o).trim(); porcelain = execSync('git status --porcelain', o); }
  catch (e) { if (allowDirty) { console.error(`serveOwn: git unavailable in ${cwd}; ALLOW_DIRTY=1, served build ${id || '(none)'} not checked`); return id; }
    throw new Error(`serveOwn: git unavailable in ${cwd} (${String(e?.stderr ?? e?.message ?? e).trim().split('\n')[0]}); cannot check served build-id "${id}". Set ALLOW_DIRTY=1 to skip.`); }
  const why = buildIdProblem(id, head, isDirty(porcelain), allowDirty);
  if (why) throw new Error(`serveOwn: served build-id "${id}" at ${srv.url} ${why}. Rebuild (npm run build:qa / build) and re-run.`);
  return id;
}
/** One call for the browser gates: PORT (parsePort) -> serveOwn -> expectHeadBuild. Any failure prints one line and exits 2
 *  (CCR n2/n3: no stack traces). The server is stopped on every exit path afterwards (normal end, process.exit, an uncaught
 *  error, SIGINT/SIGTERM from `timeout`) - CCR n4. */
export async function serveForRun(outDir, tag) {
  let srv = null; const stop = () => srv?.stop();
  process.on('exit', stop);
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stop(); process.exit(sig === 'SIGINT' ? 130 : 143); });
  try {
    srv = await serveOwn(outDir, parsePort());
    const id = await expectHeadBuild(srv);
    console.error(`${tag}: ${outDir} ${id} on port ${srv.port}`);
    return { ...srv, buildId: id };
  } catch (e) { console.error(`${tag}: ${String(e?.message ?? e)}`); stop(); process.exit(2); }
}
