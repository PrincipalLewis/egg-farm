// node make-rc0-live.mjs <worktree>  -> writes <worktree>/scripts/rc0-live.mjs: rc0-browser.mjs with the local vite-preview server removed
// and URL0 taken from env BASE_URL (the published build). Also asserts meta[name=build-id] == EXPECT_BUILD_ID on the first page load.
import { readFileSync, writeFileSync } from 'node:fs';
const W = process.argv[2]; let s = readFileSync(`${W}/scripts/rc0-browser.mjs`, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) { console.error('pattern not found: ' + a.slice(0, 80)); process.exit(3); } s = s.replace(a, b); };
rep("const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });", "const srv = { pid: 0 }; void spawn;");
rep("const killSrv = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch { } };", "const killSrv = () => { };");
rep("const URL0 = `http://127.0.0.1:${port}/`;",
 "const URL0 = (u => u.endsWith('/') ? u : u + '/')(process.env.BASE_URL ?? (() => { console.error('rc0-live: BASE_URL required'); process.exit(2); })());\n" +
 "{ const L = process.env.EXPECT_BUILD_ID; if (!L) { console.error('rc0-live: EXPECT_BUILD_ID required'); process.exit(2); } const c = await browser.newContext(); const p = await c.newPage(); await p.goto(URL0, { waitUntil: 'domcontentloaded' }); const b = await p.evaluate(() => document.querySelector('meta[name=build-id]')?.content); await c.close(); console.log(`rc0-live build-id ${b} expect ${L} base ${URL0}`); if (b !== L) { console.error('ABORT build-id mismatch'); await browser.close(); process.exit(4); } }");
writeFileSync(`${W}/scripts/rc0-live.mjs`, s); console.log('wrote', `${W}/scripts/rc0-live.mjs`);
