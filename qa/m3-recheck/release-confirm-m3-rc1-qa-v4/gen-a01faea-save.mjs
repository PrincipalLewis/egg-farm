// Produce real a01faea-written saves: node gen-a01faea-save.mjs <engine> <port>. Serves the a01faea release asset, writes fixtures/a01faea-<case>-<engine>.json (full localStorage dump).
import pw from '/workspace/egg-farm-studio/game/node_modules/playwright-core/index.mjs';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [E, PORT] = process.argv.slice(2); if (+PORT === 4173) process.exit(3); const EV = path.dirname(new URL(import.meta.url).pathname);
const html = fs.readFileSync(`${EV}/assets/egg-farm-m3-rc1-dialog-a01faea.html`); fs.mkdirSync(`${EV}/fixtures`, { recursive: true });
const srv = http.createServer((q, r) => { if (q.url.startsWith('/__blank')) { r.writeHead(200, { 'content-type': 'text/html' }); return r.end('<!doctype html>'); } if (q.url === '/') { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return r.end(html); } r.writeHead(404); r.end(); });
await new Promise(res => srv.listen(+PORT, '127.0.0.1', res)); const U = `http://127.0.0.1:${PORT}/`;
const br = E === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[E].launch();
const fx = JSON.parse(fs.readFileSync('/workspace/egg-farm-studio/qa/m3-fixtures/saves/m2-rc1-v5-40min.json', 'utf8')); fx.savedAt = Date.now() - 3000;
for (const [name, seed] of [['v5mid', { 'eggfarm.save': JSON.stringify(fx), 'eggfarm.ui': JSON.stringify({ onboardingDone: true }) }], ['fresh', null]]) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
  if (seed) { const s = await ctx.newPage(); await s.goto(U + '__blank'); await s.evaluate(o => { for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, seed); await s.close(); }
  const p = await ctx.newPage(); await p.goto(U); await p.getByText('Tap to start').click({ timeout: 15000 }).catch(() => {});
  for (let i = 0; i < 12; i++) { await p.waitForTimeout(1000); await p.locator('#collect').click({ timeout: 1000 }).catch(() => {}); }
  await p.waitForTimeout(3000);
  const dump = await p.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  const s = JSON.parse(dump['eggfarm.save']); const b = (dump['eggfarm.telemetry'] ?? '').match(/"build":"([^"]+)"/)?.[1];
  fs.writeFileSync(`${EV}/fixtures/a01faea-${name}-${E}.json`, JSON.stringify(dump, null, 1));
  console.log(`gen ${E} ${name}: build=${b} v=${s.version} coins=${s.state.coinsCents} farm=${s.state.farmLevel} coll=${s.state.collectionLevel} keys=${Object.keys(dump).join(',')}`);
  await ctx.close(); }
await br.close(); srv.close();
