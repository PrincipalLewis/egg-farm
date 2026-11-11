// QA variant of serve-own for the provided single-file html (no dist/assets): verify the served page carries the expected build id instead.
import { spawn } from 'node:child_process';
export async function serveOwn(outDir, port, cwd = process.cwd()) {
  const srv = spawn('npx', ['vite', 'preview', '--outDir', outDir, '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true, cwd });
  let html = ''; for (let i = 0; i < 80 && srv.exitCode === null; i++) { try { html = await (await fetch(`http://127.0.0.1:${port}/`)).text(); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
  if (srv.exitCode !== null || !html.includes('m3-rc1-pre+c108440')) { try { process.kill(-srv.pid); } catch {} throw new Error('qa-serve-single: not serving c108440 html'); }
  console.log('served build m3-rc1-pre+c108440 (single-file html)');
  return { url: `http://127.0.0.1:${port}/`, stop: () => { try { process.kill(-srv.pid); } catch {} } };
}
