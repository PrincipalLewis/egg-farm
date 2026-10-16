// Start `vite preview` for OUTDIR on PORT and make sure the page on that port is OUR build: --strictPort makes vite exit
// if the port is taken, and the served index.html must reference this outDir's own hashed entry chunk. (A stale server
// from another worktree on the same port once made a run test the wrong build.)
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
export async function serveOwn(outDir, port, cwd = process.cwd()) {
  const srv = spawn('npx', ['vite', 'preview', '--outDir', outDir, '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true, cwd });
  let html = '';
  for (let i = 0; i < 80 && srv.exitCode === null; i++) { try { html = await (await fetch(`http://127.0.0.1:${port}/`)).text(); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
  await new Promise(r => setTimeout(r, 300));
  const own = fs.readdirSync(path.join(cwd, outDir, 'assets')).filter(f => /^index-.*\.js$/.test(f));
  if (srv.exitCode !== null || !own.length || !own.every(f => html.includes(f))) {
    try { process.kill(-srv.pid); } catch {}
    throw new Error(`serveOwn: port ${port} is not serving ${outDir} from ${cwd} (vite exit ${srv.exitCode}; expected ${own.join(',')}). Pick another PORT.`);
  }
  return { url: `http://127.0.0.1:${port}/`, stop: () => { try { process.kill(-srv.pid); } catch {} } };
}
