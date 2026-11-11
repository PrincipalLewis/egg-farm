// PR #16 offline v2 @0470045 QA probe: dedupe across reload + 2 tabs, title one line, worth balance, 360x420 cap shot.
// ENGINE=.. PORT=.. DIST=dist-qa OUT=<dir> node pr16-v2-qa.mjs <worktree>
import { setup } from './s2-lib.mjs'; import fs from 'node:fs';
const { ROOT, ENGINE, OUT, ok, open, done } = await setup('pr16-v2');
{ const h = fs.readFileSync(ROOT + '/dist-qa/index.html', 'utf8'), j = h.match(/assets\/index-[\w-]+\.js/)[0], s = fs.readFileSync(ROOT + '/dist-qa/' + j, 'utf8'); ok('build-id 0470045 in served bundle', s.includes('0470045'), { j }); }
const S = p => p.evaluate(() => ({ pend: window.eggfarm.state.pendingOfflineEggs, basket: window.eggfarm.state.basket, modal: !!document.querySelector('#wbCollect') }));
// 1 reload dedupe: 1 h away -> popup, Collect, reload -> no 2nd popup, no 2nd credit
{ const { ctx, p, errs } = await open({ awayMs: 3600e3, keepWelcome: true, patch: { pendingOfflineEggs: 0, farmLevel: 10, basket: 0 } });
  const a = await S(p); await p.locator('#wbCollect').click(); await p.waitForTimeout(500); const a2 = await S(p);
  await p.waitForTimeout(2500); await p.reload(); await p.getByText('Tap to start').click().catch(() => {}); await p.waitForFunction(() => window.eggfarm); await p.waitForTimeout(1200); const b = await S(p);
  ok('reload: period credited once, popup once', a.modal && a.pend > 0 && !b.modal && b.pend < a.pend * 0.05, { first: a, afterCollect: a2, afterReload: b });
  // 2 second tab, same storage
  const q = await ctx.newPage(); await q.goto(p.url()); await q.getByText('Tap to start').click({ timeout: 5000 }).catch(() => {}); await q.waitForTimeout(1500);
  const c = await q.evaluate(() => ({ modal: !!document.querySelector('#wbCollect'), pend: window.eggfarm?.state?.pendingOfflineEggs ?? null, other: /another tab/i.test(document.body.innerText) }));
  ok('2nd tab: no 2nd popup / credit for the same period', !c.modal && !(c.pend > a.pend * 0.05), c);
  ok('no page errors (dedupe)', !errs.length, errs); await ctx.close(); }
// 3 title one line + icon rule + worth balance at narrow widths
for (const [w, h] of [[320, 568], [360, 420], [360, 640], [375, 667], [390, 844], [1280, 800]]) {
  const { ctx, p } = await open({ awayMs: 3 * 3600e3, keepWelcome: true, width: w, height: h, patch: { pendingOfflineEggs: 0, farmLevel: 30 } });
  const m = await p.evaluate(() => { const t = document.querySelector('#wbT'); if (!t) return null; const cs = getComputedStyle(t), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
    const ic = document.querySelector('.wb-head img'), wo = document.querySelector('.wb-worth'), ws = wo && getComputedStyle(wo);
    return { lines: Math.round(t.getBoundingClientRect().height / lh), overflow: t.scrollWidth > t.clientWidth + 0.5, ws: cs.whiteSpace, fs: cs.fontSize, icon: ic ? getComputedStyle(ic).display !== 'none' && ic.getBoundingClientRect().width > 0 : null,
      headFits: document.querySelector('.wb-head').scrollWidth <= document.querySelector('.wb-head').clientWidth + 0.5, worthWrap: ws ? (ws.textWrap || ws.textWrapStyle || '') : null }; });
  ok(`${w}x${h} 'Welcome back!' one line, no overflow`, m && m.lines === 1 && !m.overflow && m.headFits, m);
  ok(`${w}x${h} worth line text-wrap balance`, m && /balance/.test(m.worthWrap), { worthWrap: m?.worthWrap });
  if (w === 360 && h === 420) { await p.evaluate(() => { const c = [...document.querySelectorAll('.wb-body *')].find(e => /cap|2h/i.test(e.textContent) && e.children.length === 0); c?.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(300); }
  await p.screenshot({ path: `${OUT}/${ENGINE}-welcome-${w}x${h}.png` }); await ctx.close(); }
await done();
