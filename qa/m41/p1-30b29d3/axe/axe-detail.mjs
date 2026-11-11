// QA: detail dump of label-content-name-mismatch + color-contrast nodes on the asleep scenes. usage: node axe-detail.mjs <engine> <width> <wt> <bid>
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs'; import http from 'node:http'; import { join, extname } from 'node:path';
const [ENG, WS, WT, BID] = process.argv.slice(2); const W = +WS;
const pw = (await import(`${WT}/node_modules/playwright-core/index.mjs`)).default; const D = `${WT}/dist-qa`;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };
const srv = await new Promise(r => { const s = http.createServer((q, res) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = join(D, p); if (!existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' }); res.end(readFileSync(f)); }).listen(0, '127.0.0.1', () => r(s)); });
const br = ENG === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[ENG].launch();
const ctx = await br.newContext({ viewport: { width: W, height: W >= 1024 ? 800 : 844 } }); const p = await ctx.newPage();
await p.addInitScript(() => { if (!sessionStorage.getItem('qa')) { sessionStorage.setItem('qa', '1'); localStorage.clear(); localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, seenSlots: 10, workersIntroA: true, workersIntroB: true, sfx: false })); } });
await p.goto(`http://127.0.0.1:${srv.address().port}/`); const bid = await p.evaluate(() => document.querySelector('meta[name=build-id]')?.content); if (bid !== BID) throw new Error('bid ' + bid);
await p.getByText('Tap to start').click({ timeout: 60000 }).catch(() => {}); await p.waitForFunction(() => window.eggfarm && window.eggfarmUi);
await p.evaluate(() => { document.querySelectorAll('.tracks-exp').forEach(e => e.remove()); const g = window.eggfarm; g.state = { ...g.state, seenTracksExplainer: true, customers: [], nextCustomerInS: 1e9, farmLevel: 20, graderTier: 1, coinsCents: 0, coop: 0, basket: 0, manageCdS: 0, workers: { market_hand: { energy: 0, cdS: 5 }, coop_hand: { energy: 70, cdS: 5, unpaid: true }, hawker: { energy: 0, cdS: 5 }, grader: { energy: 0, cdS: 5 } } }; window.eggfarmUi.render(); });
await p.waitForTimeout(1200); if (W < 1024) await p.locator('[data-nav=upgrades]').click(); await p.waitForTimeout(300); await p.locator('[data-tab=workers]').click(); await p.waitForTimeout(400);
await p.addScriptTag({ path: '/tmp/axe/node_modules/axe-core/axe.min.js' });
const r = await p.evaluate(async () => { const r = await window.axe.run(document, { rules: { 'label-content-name-mismatch': { enabled: true } } });
  return r.violations.filter(v => ['label-content-name-mismatch', 'color-contrast'].includes(v.id)).map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ t: n.target.join(' '), html: n.html.slice(0, 300), msg: (n.failureSummary || '').slice(0, 300), data: n.any?.[0]?.data ?? null })) })); });
writeFileSync(process.env.OUT ?? '/dev/stdout', JSON.stringify({ engine: ENG, w: W, bid, r }, null, 1)); await br.close(); srv.close();
