// QA preload (node --import): attaches console-error + pageerror + per-load build-id capture to EVERY context/page any probe opens.
// Writes one JSON line per event to $CONSOLE_LOG. Expected build-id $QA_BID; a load whose meta build-id differs is logged as bidMismatch.
import { appendFileSync } from 'node:fs';
const WT = process.env.QA_WT ?? '/tmp/qa-p1-30b29d3', LOG = process.env.CONSOLE_LOG, BID = process.env.QA_BID, TAG = process.env.RUN_TAG ?? '';
const pw = (await import(`${WT}/node_modules/playwright-core/index.mjs`)).default;
const w = o => LOG && appendFileSync(LOG, JSON.stringify({ t: new Date().toISOString(), tag: TAG, ...o }) + '\n');
const hookPage = (p, eng) => {
  p.on('console', m => { if (m.type() === 'error') w({ eng, kind: 'console.error', url: p.url(), text: m.text(), loc: m.location() }); });
  p.on('pageerror', e => w({ eng, kind: 'pageerror', url: p.url(), text: String(e?.message ?? e) }));
  p.on('load', async () => { try { const b = await p.evaluate(() => document.querySelector('meta[name=build-id]')?.content ?? null);
    w({ eng, kind: 'load', url: p.url(), bid: b, bidOk: b === BID }); } catch (e) { w({ eng, kind: 'load', url: p.url(), bid: null, err: String(e.message).slice(0, 80) }); } });
};
for (const eng of ['chromium', 'firefox', 'webkit']) {
  const bt = pw[eng], orig = bt.launch.bind(bt);
  bt.launch = async (...a) => { const br = await orig(...a); const nc = br.newContext.bind(br);
    br.newContext = async (...c) => { const ctx = await nc(...c); ctx.on('page', p => hookPage(p, eng)); ctx.pages().forEach(p => hookPage(p, eng)); return ctx; };
    return br; };
}
w({ kind: 'hook-armed', argv: process.argv.slice(1).join(' ') });
