// Start `vite preview` for OUTDIR on PORT and make sure the page on that port is OUR build: --strictPort makes vite exit
// if the port is taken, and the served index.html must reference this outDir's own hashed entry chunk. (A stale server
// from another worktree on the same port once made a run test the wrong build.)
// port 0 / undefined (the default for callers without PORT set): probe a free port from the OS, so parallel worktrees don't
// collide on a fixed default; the chosen port is printed to stderr and returned. An explicit port is used as-is.
import { spawn, execSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import net from 'node:net';
export const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.unref(); s.on('error', rej);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });
async function serveOnce(outDir, port, cwd) {
  const srv = spawn('npx', ['vite', 'preview', '--outDir', outDir, '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true, cwd });
  let html = '';
  for (let i = 0; i < 80 && srv.exitCode === null; i++) { try { html = await (await fetch(`http://127.0.0.1:${port}/`)).text(); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
  await new Promise(r => setTimeout(r, 300));
  const own = fs.readdirSync(path.join(cwd, outDir, 'assets')).filter(f => /^index-.*\.js$/.test(f));
  if (srv.exitCode !== null || !own.length || !own.every(f => html.includes(f))) {
    try { process.kill(-srv.pid); } catch {}
    throw new Error(`serveOwn: port ${port} is not serving ${outDir} from ${cwd} (vite exit ${srv.exitCode}; expected ${own.join(',')}). Pick another PORT.`);
  }
  return { port, url: `http://127.0.0.1:${port}/`, stop: () => { try { process.kill(-srv.pid); } catch {} } };
}
export async function serveOwn(outDir, port = 0, cwd = process.cwd()) {
  if (+port) return serveOnce(outDir, +port, cwd);
  for (let attempt = 1; ; attempt++) { // a probed port can be grabbed before vite binds it: retry with a fresh one
    const p = await freePort();
    try { const s = await serveOnce(outDir, p, cwd); console.error(`serveOwn: ${outDir} on port ${p} (free port; set PORT to pin)`); return s; }
    catch (e) { if (attempt >= 3) throw e; }
  }
}
/** CCR n-d (reviews/pr62-delta-09cee47.md): fail loudly when the served build is not this checkout's HEAD (a stale dist-qa /
 *  dist from an older commit, or a foreign server). Reads <meta name="build-id"> (m3-rc1-pre+<short>[+dirty]) from the served
 *  page and compares its hash with `git rev-parse HEAD` in cwd. No git (e.g. an exported tree): warns and skips. */
export async function expectHeadBuild(srv, cwd = process.cwd()) {
  const html = await (await fetch(srv.url)).text(), id = /<meta name="build-id" content="([^"]*)"/.exec(html)?.[1] ?? '';
  let head = ''; try { head = execSync('git rev-parse HEAD', { encoding: 'utf8', cwd, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {}
  if (!head) { console.error(`serveOwn: no git HEAD in ${cwd}; served build ${id || '(none)'} not checked`); return id; }
  const hash = /\+([0-9a-f]{7,40})(\+dirty)?$/.exec(id)?.[1];
  if (!hash || !head.startsWith(hash)) { srv.stop();
    throw new Error(`serveOwn: served build-id "${id}" at ${srv.url} is not HEAD ${head.slice(0, 7)} (stale build or foreign server). Rebuild (npm run build:qa / build) and re-run.`); }
  return id;
}
