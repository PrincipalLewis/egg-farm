// node probe-431.mjs <asset> <port>: list same-origin requests that are not '/' (first 160 chars), with initiator.
import pw from '/workspace/egg-farm-studio/game/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs';
const [A, PORT] = process.argv.slice(2); const html = fs.readFileSync(A); const seen = [];
const srv = http.createServer({ maxHeaderSize: 16 * 1024 * 1024 }, (q, r) => { if (q.url === '/') { r.writeHead(200, { 'content-type': 'text/html' }); return r.end(html); } seen.push(q.url.slice(0, 160) + ` (len ${q.url.length})`); r.writeHead(404); r.end(); });
await new Promise(r => srv.listen(+PORT, '127.0.0.1', r));
const br = await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const p = await br.newPage();
const errs = []; p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 160)));
await p.goto(`http://127.0.0.1:${PORT}/`); await p.getByText('Tap to start').click({ timeout: 15000 }).catch(() => {}); await p.waitForTimeout(4000);
await p.locator('#collect').click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(1500);
console.log(A.split('/').pop(), 'requests:', JSON.stringify([...new Set(seen)], null, 1), 'errors:', errs.length, JSON.stringify([...new Set(errs)]));
await br.close(); srv.close();
