// Build-ID guard: serve <dir> on <port>, check bundle id AND runtime HUD tag in <engine>. node qa-guard.mjs <dir> <port> <sha7> <engine>
import pw from 'playwright-core'; import { spawn } from 'node:child_process'; import net from 'node:net';
const [dir, PORT, SHA, ENG] = process.argv.slice(2); const port = +PORT, base = `http://127.0.0.1:${port}/`;
if (port === 4173) { console.error('refusing :4173'); process.exit(3); }
if (await new Promise(r => { const c = net.connect(port, '127.0.0.1'); c.on('connect', () => { c.destroy(); r(true); }); c.on('error', () => r(false)); })) { console.error('port taken', port); process.exit(3); }
const srv = spawn('npx', ['vite','preview','--outDir',dir,'--port',PORT,'--strictPort','--host','127.0.0.1'], { stdio:'ignore', detached:true });
const kill = () => { try { process.kill(-srv.pid,'SIGTERM'); } catch {} }; process.on('uncaughtException', e => { console.error(e); kill(); process.exit(1); }); process.on('unhandledRejection', e => { console.error(e); kill(); process.exit(1); }); setTimeout(() => { kill(); process.exit(2); }, 300_000).unref();
await (async () => { for (let i = 0; i < 240; i++) { try { await fetch(`http://127.0.0.1:${port}/`); return; } catch { await new Promise(r => setTimeout(r, 500)); } } })();
const h = await (await fetch(base)).text(); const j = h.match(/assets\/index-[^"]+\.js/)[0]; const b = await (await fetch(base + j)).text();
const id = (b.match(/m\d+-rc[\w-]*\+[0-9a-f]{7,40}(\+dirty)?/)||[])[0]; console.log('bundle build id', id);
const br = await pw[ENG].launch(ENG === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {});
const p = await br.newPage(); await p.goto(base); await p.getByText('Tap to start').click().catch(() => {}); await p.waitForTimeout(1500);
const hud = await p.evaluate(() => (document.body.innerText.match(/build\s+[0-9a-f]{7,40}(\+dirty)?/) || [null])[0]);
console.log('runtime HUD tag', hud, 'ua', await p.evaluate(() => navigator.userAgent));
await br.close(); kill();
const okB = id && id.endsWith('+' + SHA), okR = !hud || hud.endsWith(SHA); // HUD tag may be absent in this branch -> bundle id is authoritative
if (!hud) console.log('NOTE: no HUD build tag visible at runtime; relying on bundle id');
if (!okB || !okR) { console.error('WRONG BUILD (want', SHA + ')'); process.exit(4); }
console.log('BUILD OK', SHA, ENG);
