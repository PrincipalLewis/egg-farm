// Start `vite preview` for OUTDIR on PORT and make sure the page on that port is OUR build: --strictPort makes vite exit
// if the port is taken, and the served index.html must reference this outDir's own hashed entry chunk. (A stale server
// from another worktree on the same port once made a run test the wrong build.)
// port 0 / undefined (the default for callers without PORT set): probe a free port from the OS, so parallel worktrees don't
// collide on a fixed default; the chosen port is printed to stderr and returned. An explicit port is used as-is.
// Each readiness fetch is bounded by AbortSignal.timeout, so a port held by a non-HTTP listener (accepts, never answers)
// fails instead of hanging (QA #27 Low 2). Only a port conflict (vite reports EADDRINUSE; err.code 'EADDRINUSE') is
// retried with a fresh probed port; any other failure (missing outDir, foreign build, vite crash) throws at once (CCR #27 n2).
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net';
import { createRequire } from 'node:module';
const VITE = path.join(path.dirname(createRequire(import.meta.url).resolve('vite/package.json')), 'bin', 'vite.js'); // the repo's own vite (no npx lookup from cwd)
export const FETCH_TIMEOUT_MS = 2000;
export const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.unref(); s.on('error', rej);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function serveOnce(outDir, port, cwd) {
  const own = fs.readdirSync(path.join(cwd, outDir, 'assets')).filter(f => /^index-.*\.js$/.test(f)); // throws ENOENT before spawning
  const srv = spawn(process.execPath, [VITE, 'preview', '--outDir', outDir, '--port', '' + port, '--strictPort', '--host', '127.0.0.1'],
    { stdio: ['ignore', 'ignore', 'pipe'], detached: true, cwd });
  let stderr = ''; srv.stderr.setEncoding('utf8'); srv.stderr.on('data', d => { stderr += d; });
  const kill = () => { try { process.kill(-srv.pid); } catch {} srv.stderr.destroy(); };
  let html = '';
  for (let i = 0; i < 80 && srv.exitCode === null; i++) {
    try { html = await (await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })).text(); break; }
    catch { await sleep(250); }
  }
  await sleep(300);
  if (srv.exitCode !== null || !own.length || !own.every(f => html.includes(f))) {
    kill();
    const inUse = /EADDRINUSE|already in use/i.test(stderr);
    const e = new Error(`serveOwn: port ${port} is not serving ${outDir} from ${cwd} (vite exit ${srv.exitCode}${inUse ? ', port in use' : ''}; expected ${own.join(',')}). Pick another PORT.`);
    if (inUse) e.code = 'EADDRINUSE';
    throw e;
  }
  return { port, url: `http://127.0.0.1:${port}/`, stop: kill };
}
/** opts (tests): attempts (default 3), probe (free-port probe), onAttempt(port). */
export async function serveOwn(outDir, port = 0, cwd = process.cwd(), opts = {}) {
  const { attempts = 3, probe = freePort, onAttempt = () => {} } = opts;
  if (+port) { onAttempt(+port); return serveOnce(outDir, +port, cwd); }
  for (let attempt = 1; ; attempt++) { // a probed port can be grabbed before vite binds it: retry with a fresh one
    const p = await probe(); onAttempt(p);
    try { const s = await serveOnce(outDir, p, cwd); console.error(`serveOwn: ${outDir} on port ${p} (free port; set PORT to pin)`); return s; }
    catch (e) { if (e.code !== 'EADDRINUSE' || attempt >= attempts) throw e; }
  }
}
